import React, { useState, useEffect, useRef } from 'react';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import MainNavbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import { Translate, useTranslatedAttribute } from '../utils';

const QRScanner = () => {
  const { currentUser, activeShopId } = useAuth();
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const isRunningRef = useRef(false);
  
  // Get translations for attributes
  const getTranslatedAttr = useTranslatedAttribute();
  
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'danger'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      // Cleanup: stop scanner when component unmounts
      safeStopScanner();
    };
  }, []);

  const safeStopScanner = async () => {
    try {
      if (html5QrCodeRef.current && isRunningRef.current) {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        isRunningRef.current = false;
      }
    } catch (err) {
      // Swallow errors like "Cannot stop, scanner is not running or paused."
    } finally {
      html5QrCodeRef.current = html5QrCodeRef.current || null;
      setScanning(false);
    }
  };

  const startScanning = async () => {
    try {
      setScanning(true);
      setMessage('');
      setMessageType('');

      const html5QrCode = new Html5Qrcode('reader');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        {
          facingMode: 'environment' // Use back camera if available
        },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText, decodedResult) => {
          // QR code scanned successfully
          await handleQRCodeScanned(decodedText);
          await safeStopScanner();
        },
        (errorMessage) => {
          // Ignore scanning errors (they're expected during scanning)
        }
      );
      isRunningRef.current = true;
    } catch (err) {
      console.error('Error starting scanner:', err);
      setMessage('Failed to start camera. Please check permissions and try again.');
      setMessageType('danger');
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    await safeStopScanner();
  };

  const handleQRCodeScanned = async (qrCodeId) => {
    try {
      setLoading(true);
      setMessage('');
      setMessageType('');

      // Find employee by QR code ID
      const employeesRef = collection(db, 'employees');
      const employeesQuery = query(
        employeesRef,
        where('shopId', '==', activeShopId),
        where('qrCodeId', '==', qrCodeId)
      );

      const snapshot = await getDocs(employeesQuery);

      if (snapshot.empty) {
        setMessage('Invalid QR code. This QR code does not belong to any employee.');
        setMessageType('danger');
        setLoading(false);
        return;
      }

      const employeeDoc = snapshot.docs[0];
      const employee = {
        id: employeeDoc.id,
        ...employeeDoc.data()
      };

      // Get current date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

      // Check if attendance already exists for today
      const attendanceRef = collection(db, 'attendance');
      const attendanceQuery = query(
        attendanceRef,
        where('shopId', '==', currentUser.uid),
        where('employeeId', '==', employee.id),
        where('date', '==', today)
      );

      const attendanceSnapshot = await getDocs(attendanceQuery);

      if (!attendanceSnapshot.empty) {
        // Update existing attendance record
        const attendanceDoc = attendanceSnapshot.docs[0];
        const existingData = attendanceDoc.data();

        // If already marked present, don't update
        if (existingData.status === 'present' && existingData.checkIn) {
          setMessage(`${employee.name}'s attendance is already marked for today.`);
          setMessageType('danger');
          setLoading(false);
          return;
        }

        // Update to present with check-in time
        await updateDoc(doc(db, 'attendance', attendanceDoc.id), {
          status: 'present',
          checkIn: existingData.checkIn || currentTime,
          updatedAt: new Date().toISOString()
        });

        setMessage(`${employee.name}'s attendance marked as present successfully!`);
        setMessageType('success');
      } else {
        // Create new attendance record
        await addDoc(collection(db, 'attendance'), {
          employeeId: employee.id,
          shopId: currentUser.uid,
          date: today,
          status: 'present',
          checkIn: currentTime,
          checkOut: '',
          notes: 'Marked via QR code scan',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        setMessage(`${employee.name}'s attendance marked as present successfully!`);
        setMessageType('success');
      }

      setLoading(false);

      // Auto-restart scanning after 2 seconds
      setTimeout(() => {
        setMessage('');
        setMessageType('');
        if (!isRunningRef.current) {
          startScanning();
        }
      }, 2000);

    } catch (err) {
      console.error('Error processing QR code:', err);
      setMessage('Failed to mark attendance. Please try again.');
      setMessageType('danger');
      setLoading(false);
    }
  };

  return (
    <>
      <MainNavbar />
      <Container className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <PageHeader title="QR Code Scanner" icon="bi-qr-code-scan" color="primary" />
          <Button variant="secondary" onClick={() => navigate('/attendance')}>
            Back to Attendance
          </Button>
        </div>

        {message && (
          <Alert variant={messageType} className="mb-4">
            {message}
          </Alert>
        )}

        <Card>
          <Card.Body>
            <div className="text-center mb-4">
              <p className="lead">
                {scanning 
                  ? 'Position the QR code within the camera view' 
                  : 'Click the button below to start scanning QR codes'}
              </p>
            </div>

            <div id="reader" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}></div>

            {loading && (
              <div className="text-center mt-3">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2">Processing...</p>
              </div>
            )}

            <div className="text-center mt-4">
              {!scanning ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={startScanning}
                  disabled={loading}
                >
                  Start Scanning
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="lg"
                  onClick={stopScanning}
                >
                  Stop Scanning
                </Button>
              )}
            </div>

            <div className="mt-4">
              <Card className="bg-light">
                <Card.Body>
                  <h5>Instructions:</h5>
                  <ul className="mb-0">
                    <li>Click "Start Scanning" to activate the camera</li>
                    <li>Allow camera permissions when prompted</li>
                    <li>Hold the employee's QR code in front of the camera</li>
                    <li>Attendance will be automatically marked when the QR code is scanned</li>
                    <li>Each employee can only mark attendance once per day</li>
                  </ul>
                </Card.Body>
              </Card>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
};

export default QRScanner;


