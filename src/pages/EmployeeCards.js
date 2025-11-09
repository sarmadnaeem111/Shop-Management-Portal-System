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
  const { currentUser, shopData } = useAuth();
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

  const downloadCardPng = async (employee) => {
    const cardElement = document.getElementById(`employee-card-${employee.id}`);
    if (!cardElement) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardElement, {
        backgroundColor: '#ffffff',
        scale: 3, // High resolution for printing
        logging: false,
        useCORS: true,
        width: cardElement.offsetWidth,
        height: cardElement.offsetHeight
      });

      const pngFile = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `${employee.name || 'employee'}_ID_Card.png`;
      link.href = pngFile;
      link.click();
    } catch (error) {
      console.error('Error generating card image:', error);
      alert('Failed to download card. Please try again.');
    }
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
            <Button variant="secondary" className="me-2 back-btn" onClick={() => navigate('/employees')}>Back</Button>
            <Button variant="primary" className="print-btn" onClick={handlePrint}>Print</Button>
          </div>
        </div>

        <Form className="mb-3 search-bar">
          <Form.Control
            type="text"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </Form>

        {error && (<Alert variant="danger">{error}</Alert>)}
        {loading ? (
          <div className="text-center p-4">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <Row className="g-4">
            {filteredEmployees.map(emp => (
              <Col key={emp.id} xs={12} sm={6} md={4} lg={3} xl={3}>
                <div className="employee-card-wrapper">
                  <div id={`employee-card-${emp.id}`} className="employee-id-card card-print">
                    {/* Lanyard Hole */}
                    <div className="lanyard-hole"></div>
                    
                    {/* Card Header with Gradient */}
                    <div className="card-header-gradient">
                      <div className="card-company-name">
                        {shopData?.shopName || 'Company Name'}
                      </div>
                      <div className="card-employee-id">ID: {emp.employeeId || emp.id.substring(0, 8).toUpperCase()}</div>
                    </div>

                    {/* Card Body */}
                    <div className="card-body-content">
                      <div className="card-main-row">
                        {/* Employee Photo Placeholder */}
                        <div className="employee-photo">
                          <div className="photo-placeholder">
                            <i className="bi bi-person-fill"></i>
                          </div>
                        </div>

                        {/* Employee Info */}
                        <div className="employee-info">
                          <div className="employee-name">{emp.name || 'Employee Name'}</div>
                          <div className="employee-position">{emp.position || 'Employee'}</div>
                          {emp.department && (
                            <div className="employee-department">{emp.department}</div>
                          )}
                        </div>

                        {/* QR Code Section */}
                        <div className="qr-code-section">
                          {emp.qrCodeId ? (
                            <div className="qr-code-wrapper">
                              <QRCode 
                                id={`card-qr-${emp.id}`} 
                                value={emp.qrCodeId} 
                                size={65}
                                level="H"
                              />
                            </div>
                          ) : (
                            <div className="qr-code-placeholder">
                              <i className="bi bi-qr-code-scan"></i>
                              <span>No QR</span>
                            </div>
                          )}
                          <div className="qr-label">Scan for Details</div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="card-footer">
                      <div className="card-validity">Valid Employee</div>
                    </div>
                  </div>

                  {/* Download Button */}
                  <div className="mt-3 w-100 d-print-none text-center">
                    {emp.qrCodeId && (
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="w-100 download-card-btn" 
                        onClick={() => downloadCardPng(emp)}
                      >
                        <i className="bi bi-download me-2"></i>
                        Download Card
                      </Button>
                    )}
                  </div>
                </div>
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
        .employee-card-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .employee-id-card {
          width: 340px;
          height: 220px;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
          border: 2px solid #e0e0e0;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
        }

        /* Lanyard Hole */
        .lanyard-hole {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 20px;
          background: #ffffff;
          border: 3px solid #667eea;
          border-radius: 50%;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        /* Card Header */
        .card-header-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 12px 16px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }

        .card-company-name {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .card-employee-id {
          font-size: 11px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 8px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }

        /* Card Body */
        .card-body-content {
          flex: 1;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .card-main-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          flex: 1;
          min-height: 0;
        }

        /* Employee Photo */
        .employee-photo {
          flex-shrink: 0;
          width: 65px;
        }

        .photo-placeholder {
          width: 65px;
          height: 65px;
          border-radius: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 28px;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }

        /* Employee Info */
        .employee-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding-top: 2px;
        }

        .employee-name {
          font-size: 16px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 3px;
          line-height: 1.3;
          text-transform: capitalize;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .employee-position {
          font-size: 12px;
          font-weight: 600;
          color: #667eea;
          margin-bottom: 2px;
          text-transform: capitalize;
          line-height: 1.2;
        }

        .employee-department {
          font-size: 10px;
          color: #666;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          line-height: 1.2;
        }

        /* QR Code Section */
        .qr-code-section {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          width: 75px;
        }

        .qr-code-wrapper {
          width: 75px;
          height: 75px;
          padding: 4px;
          background: #ffffff;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          box-sizing: border-box;
        }

        .qr-code-wrapper svg {
          width: 67px !important;
          height: 67px !important;
          max-width: 100% !important;
          max-height: 100% !important;
        }

        .qr-code-placeholder {
          width: 75px;
          height: 75px;
          background: #f5f5f5;
          border: 2px dashed #ccc;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #999;
          font-size: 9px;
          gap: 3px;
        }

        .qr-code-placeholder i {
          font-size: 20px;
        }

        .qr-label {
          font-size: 8px;
          color: #666;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          text-align: center;
          line-height: 1.2;
        }

        /* Card Footer */
        .card-footer {
          padding: 8px 16px;
          background: #f8f9fa;
          border-top: 1px solid #e0e0e0;
          text-align: center;
        }

        .card-validity {
          font-size: 10px;
          color: #28a745;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Download Button */
        .download-card-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .download-card-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        /* Print Styles */
        @media print {
          .navbar, .d-print-none, .page-header, .search-bar, .back-btn, .print-btn {
            display: none !important;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white;
            margin: 0;
            padding: 20px;
          }

          .employee-card-wrapper {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 20px;
          }

          .employee-id-card {
            margin: 0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          @page {
            size: A4;
            margin: 1cm;
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .employee-id-card {
            width: 100%;
            max-width: 340px;
          }
        }
      `}</style>
    </>
  );
};

export default EmployeeCards;


