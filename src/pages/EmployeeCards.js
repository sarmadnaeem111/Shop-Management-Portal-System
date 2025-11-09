import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert, Form } from 'react-bootstrap';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import MainNavbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const EmployeeCards = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        const employeesRef = collection(db, 'employees');
        const employeesQuery = query(
          employeesRef,
          where('shopId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(employeesQuery);
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setEmployees(list);
      } catch (e) {
        setError('Failed to load employees');
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [currentUser]);

  const filteredEmployees = employees.filter(e =>
    (e.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const downloadCardPng = (employee) => {
    const svg = document.getElementById(`card-qr-${employee.id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      // Make the canvas larger to include text area; approximate ratio
      const padding = 40;
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + 140; // space for name/position
      // background white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // draw QR centered
      const x = (canvas.width - img.width) / 2;
      ctx.drawImage(img, x, 20);
      // text
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(employee.name || 'Employee', canvas.width / 2, img.height + 60);
      ctx.font = '14px Arial';
      ctx.fillText(employee.position || '', canvas.width / 2, img.height + 85);
      // export
      const pngFile = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${employee.name || 'employee'}_QR_Card.png`;
      link.href = pngFile;
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <MainNavbar />
      <Container className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <PageHeader title="Employee QR Cards" icon="bi-qr-code" color="primary" />
          <div>
            <Button variant="secondary" className="me-2" onClick={() => navigate('/employees')}>Back</Button>
            <Button variant="primary" onClick={handlePrint}>Print</Button>
          </div>
        </div>

        <Form className="mb-3">
          <Form.Control
            type="text"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Form>

        {error && (<Alert variant="danger">{error}</Alert>)}
        {loading ? (
          <div className="text-center p-4">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <Row className="g-3">
            {filteredEmployees.map(emp => (
              <Col key={emp.id} xs={12} sm={6} md={4} lg={3} xl={3}>
                <Card className="h-100 card-print">
                  <Card.Body className="d-flex flex-column align-items-center">
                    <div style={{ background: '#fff', padding: 12 }}>
                      {emp.qrCodeId ? (
                        <QRCode id={`card-qr-${emp.id}`} value={emp.qrCodeId} size={180} />
                      ) : (
                        <div style={{ width: 180, height: 180 }} className="d-flex align-items-center justify-content-center bg-light text-muted">
                          No QR
                        </div>
                      )}
                    </div>
                    <div className="text-center mt-3 w-100">
                      <div className="fw-bold" style={{ fontSize: 18 }}>{emp.name}</div>
                      <div className="text-muted" style={{ fontSize: 14 }}>{emp.position || ''}</div>
                    </div>
                    <div className="mt-3 w-100 d-print-none">
                      {emp.qrCodeId && (
                        <Button variant="outline-primary" size="sm" className="w-100" onClick={() => downloadCardPng(emp)}>
                          Download Card PNG
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
            {filteredEmployees.length === 0 && (
              <Col>
                <div className="text-center text-muted">No employees found</div>
              </Col>
            )}
          </Row>
        )}
      </Container>

      <style>{`
        @media print {
          .navbar, .d-print-none { display: none !important; }
          .card-print { break-inside: avoid; page-break-inside: avoid; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
};

export default EmployeeCards;


