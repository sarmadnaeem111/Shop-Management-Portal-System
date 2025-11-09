import React from 'react';
import { Container, Card, Button, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const GuestDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { t } = useLanguage();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>Guest Dashboard</h2>
            <Button variant="outline-danger" onClick={handleLogout}>
              Logout
            </Button>
          </div>
          <p className="text-muted">
            Welcome, {currentUser?.email}. You have limited access as a guest user.
          </p>
        </Col>
      </Row>

      <Row>
        <Col md={6} lg={4}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>New Receipt</Card.Title>
              <Card.Text>
                Create new receipts for customers. This is your primary function as a guest user.
              </Card.Text>
              <Button 
                variant="primary" 
                size="lg" 
                onClick={() => navigate('/guest-new-receipt')}
                className="w-100"
              >
                Create New Receipt
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <div className="text-center text-muted">
            <p>Guest accounts have limited access to the system.</p>
            <p>For full access, please contact your administrator.</p>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default GuestDashboard;