import React, { useState } from 'react';
import { Card, Form, Button, Alert, Container, Row, Col } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FcGoogle } from 'react-icons/fc';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [lastLoginAttempt, setLastLoginAttempt] = useState(0);
  const [loginAttemptCount, setLoginAttemptCount] = useState(0);
  const { login, loginWithGoogle, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Exponential backoff for rate limiting
  const getBackoffDelay = (attemptCount) => {
    const baseDelay = 2000; // 2 seconds base
    const maxDelay = 30000; // 30 seconds max
    const delay = Math.min(baseDelay * Math.pow(2, attemptCount - 1), maxDelay);
    return delay;
  };

  // Enhanced rate limiting with attempt counting
  const canAttemptLogin = () => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastLoginAttempt;
    const requiredDelay = getBackoffDelay(loginAttemptCount);
    
    return timeSinceLastAttempt >= requiredDelay;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check rate limiting
    if (!canAttemptLogin()) {
      const timeSinceLastAttempt = Date.now() - lastLoginAttempt;
      const requiredDelay = getBackoffDelay(loginAttemptCount);
      const remainingTime = Math.ceil((requiredDelay - timeSinceLastAttempt) / 1000);
      setError(`Please wait ${remainingTime} seconds before trying to login again.`);
      return;
    }
    
    setError('');
    setLoading(true);
    setLastLoginAttempt(Date.now());
    setLoginAttemptCount(prev => prev + 1);
    
    try {
      // First check if the email exists and if the account is locked
      const emailLower = email.toLowerCase();
      const shopsCollection = collection(db, 'shops');
      const q = query(shopsCollection, where('userEmail', '==', emailLower), limit(1));
      const usersSnapshot = await getDocs(q);
      
      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        
        // Check if account is locked
        if (userData.lockedUntil && userData.lockDuration) {
          const lockTime = userData.lockedUntil.toDate();
          const lockDuration = userData.lockDuration;
          const lockExpiryTime = new Date(lockTime.getTime() + (lockDuration * 60000));
          
          if (lockExpiryTime > new Date()) {
            const timeLeft = Math.ceil((lockExpiryTime - new Date()) / 60000); // minutes
            setError(`Account is temporarily locked. Please try again in ${timeLeft} minute(s).`);
            setLoading(false);
            return;
          }
        }
      }
      
      // Try guest login first with proper error handling
      try {
        console.log('Attempting guest login for:', email);
        await loginAsGuest(email, password);
        console.log('Guest login successful, redirecting to guest dashboard');
        
        // Reset attempt counter on successful login
        setLoginAttemptCount(0);
        navigate('/guest-dashboard');
        return;
      } catch (guestError) {
        console.log('Guest login failed:', guestError.code, guestError.message);
        
        // If guest login fails, check if it's a rate limit error
        if (guestError.code === 'auth/too-many-requests') {
          throw guestError; // Re-throw rate limit errors immediately
        }
        
        // If guest login fails for other reasons, continue with regular login
        console.log('Not a guest account, trying regular login after delay...');
        
        // Add a longer delay to prevent rapid-fire requests
        await delay(2000);
      }
      
      // Proceed with regular login
      const userCredential = await login(email, password);
      
      // Reset attempt counter on successful login
      setLoginAttemptCount(0);
      
      // Check if this is a staff account
      const staffRef = doc(db, 'staff', userCredential.user.uid);
      const staffDoc = await getDoc(staffRef);
      
      if (staffDoc.exists()) {
        // Staff account - navigate to dashboard
        navigate('/dashboard');
        return;
      }
      
      // Check if regular shop account
      const userRef = doc(db, 'shops', userCredential.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Reset failed login attempts
        await updateDoc(userRef, {
          failedLoginAttempts: 0,
          lastLoginAt: serverTimestamp()
        });
        
        // Check if account is pending approval or frozen
        if (userData.status === 'pending') {
          setError('Your account is pending approval. Please check back later.');
          throw new Error('Account pending approval');
        } else if (userData.status === 'frozen') {
          setError('Your account has been frozen. Please contact an administrator for assistance.');
          throw new Error('Account frozen');
        } else if (userData.status === 'rejected') {
          setError('Your registration was rejected. Please contact an administrator for assistance.');
          throw new Error('Account rejected');
        }
        
        // If status is approved or not specified, continue to dashboard
        navigate('/dashboard');
      } else {
        throw new Error('User data not found');
      }
    } catch (error) {
      // Handle rate limit errors first with detailed logging
      if (error.code === 'auth/too-many-requests') {
        console.error('Firebase rate limit exceeded:', error);
        const retryAfter = error.customData?.retryAfter || 60; // Default to 60 seconds
        setError(`Too many login attempts. Please wait ${retryAfter} seconds before trying again.`);
        return;
      }
      
      // Log other authentication errors for debugging
      console.error('Authentication error details:', {
        code: error.code,
        message: error.message,
        email: email // Don't log password for security
      });
      
      // Handle failed login attempts
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        try {
          // Find user by email to update failed attempts
          const emailLower = email.toLowerCase();
          const shopsCollection = collection(db, 'shops');
          const q = query(shopsCollection, where('userEmail', '==', emailLower), limit(1));
          const usersSnapshot = await getDocs(q);
          
          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();
            const failedAttempts = (userData.failedLoginAttempts || 0) + 1;
            
            // Update failed attempts
            const userRef = doc(db, 'shops', userDoc.id);
            
            // Lock account after 5 failed attempts for 15 minutes
            if (failedAttempts >= 5) {
              const lockUntil = new Date();
              lockUntil.setMinutes(lockUntil.getMinutes() + 15);
              
              await updateDoc(userRef, {
                failedLoginAttempts: failedAttempts,
                lockedUntil: serverTimestamp(), // Current server timestamp
                lockDuration: 15, // 15 minutes lockout duration
                lastFailedLoginAt: serverTimestamp()
              });
              
              setError('Too many failed login attempts. Your account has been locked for 15 minutes.');
            } else {
              await updateDoc(userRef, {
                failedLoginAttempts: failedAttempts,
                lastFailedLoginAt: serverTimestamp()
              });
              
              setError(`Invalid email or password. ${5 - failedAttempts} attempts remaining before account is locked.`);
            }
          } else {
            setError('Invalid email or password.');
          }
        } catch (updateError) {
          console.error('Error updating failed login attempts:', updateError);
          setError('Invalid email or password.');
        }
      } else {
        // Don't modify error message if it was set by status checks
        if (!error.message.includes('pending') && 
            !error.message.includes('frozen') &&
            !error.message.includes('rejected')) {
          setError('Failed to sign in: ' + error.message);
        }
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to sign in with Google');
    }
    
    setGoogleLoading(false);
  };

  return (
    <Container className="py-5 h-100">
      <Row className="justify-content-center align-items-center h-100">
        <Col sm={12} md={8} lg={6} xl={5}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <h2 className="mb-3">Shop Billing System</h2>
                <p className="text-muted">Please sign in to continue</p>
              </div>
              
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <div className="d-grid">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    size="lg"
                    disabled={loading}
                    className="mb-3"
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </div>
              </Form>
              
              <div className="d-grid mt-3">
                <Button 
                  variant="light" 
                  size="lg"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="d-flex align-items-center justify-content-center"
                  style={{ border: '1px solid #ccc' }}
                >
                  <FcGoogle size={24} className="me-2" />
                  {googleLoading ? 'Signing In...' : 'Sign in with Google'}
                </Button>
              </div>
              
              <div className="text-center mt-4">
                <div className="mb-3">
                  <Link to="/register">Create a new account</Link>
                </div>
                <div>
                  <Link to="/admin/login">Administrator Login</Link>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
