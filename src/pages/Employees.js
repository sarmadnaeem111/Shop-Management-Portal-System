import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Card, Row, Col, Alert, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import MainNavbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import './Employees.css'; // Import the custom CSS
import { Translate, useTranslatedAttribute } from '../utils';
import QRCode from 'react-qr-code';

const Employees = () => {
  const { currentUser, shopData } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const navigate = useNavigate();
  
  // Get translations for attributes
  const getTranslatedAttr = useTranslatedAttribute();

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
        const employeesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setEmployees(employeesList);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching employees:', err);
        setError('Failed to load employees. Please try again.');
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [currentUser]);

  const handleDelete = async (employeeId) => {
    if (window.confirm(getTranslatedAttr('confirmDeleteEmployee'))) {
      try {
        await deleteDoc(doc(db, 'employees', employeeId));
        setEmployees(employees.filter(emp => emp.id !== employeeId));
      } catch (err) {
        console.error('Error deleting employee:', err);
        setError(getTranslatedAttr('failedToDeleteEmployee'));
      }
    }
  };

  const handleViewQR = (employee) => {
    setSelectedEmployee(employee);
    setShowQRModal(true);
  };

  const downloadCardPng = async (employee) => {
    const cardElement = document.getElementById(`employee-card-modal-${employee.id}`);
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

  const handlePrintCard = (employee) => {
    const cardElement = document.getElementById(`employee-card-modal-${employee.id}`);
    if (!cardElement) return;

    // Get the card HTML
    const cardHTML = cardElement.outerHTML;

    // Get all styles from the current document
    const styles = Array.from(document.querySelectorAll('style'))
      .map(style => style.innerHTML)
      .join('\n');

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);

    // Write content to iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Card - ${employee.name}</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4;
              margin: 0.5cm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: white;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            ${styles}
            .employee-id-card-modal {
              margin: 0 auto !important;
              box-shadow: none !important;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
              .employee-id-card-modal {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${cardHTML}
        </body>
      </html>
    `);
    iframeDoc.close();

    // Wait for content to load, then print
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // Remove iframe after printing
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }, 250);
    };

    // Fallback if onload doesn't fire
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    }, 500);
  };

  return (
    <>
      <MainNavbar />
      <Container>
        <Row className="mb-4">
          <Col>
            <PageHeader title="Employees" icon="bi-people" color="primary" />
          </Col>
          <Col className="text-end">
            <Button 
              variant="outline-primary"
              className="me-2"
              onClick={() => navigate('/employee-cards')}
            >
              QR Cards
            </Button>
            <Button 
              variant="success" 
              onClick={() => navigate('/add-employee')}
            >
              <Translate textKey="addNewEmployee" />
            </Button>
          </Col>
        </Row>

        {error && <Alert variant="danger">{error}</Alert>}

        <Card>
          <Card.Body>
            {loading ? (
              <p className="text-center"><Translate textKey="loadingEmployees" /></p>
            ) : employees.length > 0 ? (
              <div className="table-responsive employee-table-container">
                <Table striped hover responsive="sm" className="employees-table">
                  <thead>
                    <tr>
                      <th><Translate textKey="name" /></th>
                      <th><Translate textKey="position" /></th>
                      <th><Translate textKey="contact" /></th>
                      <th><Translate textKey="email" /></th>
                      <th><Translate textKey="joiningDate" /></th>
                      <th>QR Code</th>
                      <th><Translate textKey="actions" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(employee => (
                      <tr key={employee.id}>
                        <td data-label={getTranslatedAttr("name")} className="text-nowrap">{employee.name}</td>
                        <td data-label={getTranslatedAttr("position")}>{employee.position}</td>
                        <td data-label={getTranslatedAttr("contact")}>{employee.contact}</td>
                        <td data-label={getTranslatedAttr("email")} className="email-cell">{employee.email}</td>
                        <td data-label={getTranslatedAttr("joiningDate")}>{new Date(employee.joiningDate).toLocaleDateString()}</td>
                        <td data-label="QR Code">
                          {employee.qrCodeId ? (
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => handleViewQR(employee)}
                            >
                              View QR
                            </Button>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td data-label={getTranslatedAttr("actions")}>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => navigate(`/edit-employee/${employee.id}`)}
                          >
                            <Translate textKey="edit" />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(employee.id)}
                          >
                            <Translate textKey="delete" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <p className="text-center"><Translate textKey="noEmployeesFound" /></p>
            )}
          </Card.Body>
        </Card>

        {/* QR Code Modal with Beautiful Card Design */}
        <Modal show={showQRModal} onHide={() => setShowQRModal(false)} centered size="lg">
          <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)', color: 'white', border: 'none' }}>
            <Modal.Title style={{ color: 'white' }}>
              {selectedEmployee && `${selectedEmployee.name}'s QR Card`}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center" style={{ padding: '30px', backgroundColor: '#f8f9fa' }}>
            {selectedEmployee && selectedEmployee.qrCodeId && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div id={`employee-card-modal-${selectedEmployee.id}`} className="employee-id-card-modal">
                  {/* Lanyard Hole */}
                  <div className="lanyard-hole">
                    <div className="lanyard-hole-inner"></div>
                  </div>
                  
                  {/* Decorative Top Pattern */}
                  <div className="card-top-pattern"></div>
                  
                  {/* Card Header with Enhanced Gradient */}
                  <div className="card-header-gradient">
                    <div className="card-header-content">
                      <div className="card-company-info">
                        <div className="card-company-icon">
                          <i className="bi bi-building"></i>
                        </div>
                        <div className="card-company-name">
                          {shopData?.shopName || 'Company Name'}
                        </div>
                      </div>
                      <div className="card-employee-id">
                        <i className="bi bi-person-badge me-1"></i>
                        ID: {selectedEmployee.employeeId || selectedEmployee.id.substring(0, 8).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="card-body-content">
                    <div className="card-main-row">
                      {/* Employee Photo Section */}
                      <div className="employee-photo-section">
                        <div className="employee-photo-frame">
                          {selectedEmployee.imageUrl && selectedEmployee.imageUrl.trim() !== '' ? (
                            <img 
                              src={selectedEmployee.imageUrl} 
                              alt={selectedEmployee.name || 'Employee'} 
                              className="employee-photo-img"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div 
                            className="photo-placeholder"
                            style={{ display: (selectedEmployee.imageUrl && selectedEmployee.imageUrl.trim() !== '') ? 'none' : 'flex' }}
                          >
                            <i className="bi bi-person-fill"></i>
                          </div>
                          <div className="photo-badge">
                            <i className="bi bi-check-circle-fill"></i>
                          </div>
                        </div>
                      </div>

                      {/* Employee Info Section */}
                      <div className="employee-info-section">
                        <div className="employee-name">{selectedEmployee.name || 'Employee Name'}</div>
                        <div className="employee-position">
                          <i className="bi bi-briefcase-fill me-1"></i>
                          {selectedEmployee.position || 'Employee'}
                        </div>
                        {selectedEmployee.department && (
                          <div className="employee-department">
                            <i className="bi bi-diagram-3-fill me-1"></i>
                            {selectedEmployee.department}
                          </div>
                        )}
                        {selectedEmployee.contact && (
                          <div className="employee-contact">
                            <i className="bi bi-telephone-fill me-1"></i>
                            {selectedEmployee.contact}
                          </div>
                        )}
                      </div>

                      {/* QR Code Section */}
                      <div className="qr-code-section">
                        <div className="qr-code-container">
                          {selectedEmployee.qrCodeId ? (
                            <div className="qr-code-wrapper">
                              <div className="qr-code-background">
                                <QRCode 
                                  id={`card-qr-modal-${selectedEmployee.id}`} 
                                  value={selectedEmployee.qrCodeId} 
                                  size={70}
                                  level="H"
                                />
                              </div>
                              <div className="qr-code-overlay">
                                <div className="qr-code-corner qr-corner-tl"></div>
                                <div className="qr-code-corner qr-corner-tr"></div>
                                <div className="qr-code-corner qr-corner-bl"></div>
                                <div className="qr-code-corner qr-corner-br"></div>
                              </div>
                            </div>
                          ) : (
                            <div className="qr-code-placeholder">
                              <i className="bi bi-qr-code-scan"></i>
                              <span>No QR</span>
                            </div>
                          )}
                        </div>
                        <div className="qr-label">
                          <i className="bi bi-phone me-1"></i>
                          Scan for Details
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="card-footer">
                    <div className="card-footer-content">
                      <div className="card-validity-badge">
                        <i className="bi bi-shield-check-fill me-1"></i>
                        <span>Valid Employee</span>
                      </div>
                      <div className="card-date">
                        <i className="bi bi-calendar3 me-1"></i>
                        {selectedEmployee.joiningDate ? new Date(selectedEmployee.joiningDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Active'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowQRModal(false)}>
              Close
            </Button>
            {selectedEmployee && selectedEmployee.qrCodeId && (
              <>
                <Button 
                  variant="outline-primary" 
                  onClick={() => handlePrintCard(selectedEmployee)}
                >
                  <i className="bi bi-printer me-2"></i>
                  Print
                </Button>
                <Button variant="primary" onClick={() => downloadCardPng(selectedEmployee)}>
                  <i className="bi bi-download me-2"></i>
                  Download Card
                </Button>
              </>
            )}
          </Modal.Footer>
        </Modal>
      </Container>

      <style>{`
        /* Employee ID Card Modal Styles */
        .employee-id-card-modal {
          width: 360px;
          height: 240px;
          background: linear-gradient(145deg, #ffffff 0%, #fafbfc 50%, #f5f7fa 100%);
          border-radius: 16px;
          box-shadow: 
            0 10px 40px rgba(102, 126, 234, 0.15),
            0 4px 12px rgba(0, 0, 0, 0.08),
            0 0 0 1px rgba(102, 126, 234, 0.1);
          position: relative;
          overflow: hidden;
          border: none;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
        }

        /* Decorative Top Pattern */
        .employee-id-card-modal .card-top-pattern {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, 
            #667eea 0%, 
            #764ba2 25%, 
            #f093fb 50%, 
            #764ba2 75%, 
            #667eea 100%);
          opacity: 0.8;
        }

        /* Lanyard Hole */
        .employee-id-card-modal .lanyard-hole {
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%);
          border: 3px solid #667eea;
          border-radius: 50%;
          z-index: 10;
          box-shadow: 
            0 3px 8px rgba(0, 0, 0, 0.25),
            inset 0 1px 2px rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .employee-id-card-modal .lanyard-hole-inner {
          width: 8px;
          height: 8px;
          background: #667eea;
          border-radius: 50%;
        }

        /* Card Header */
        .employee-id-card-modal .card-header-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          padding: 14px 18px;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .employee-id-card-modal .card-header-gradient::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
          animation: shimmer 3s infinite;
        }

        @keyframes shimmer {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-20px, -20px) rotate(180deg); }
        }

        .employee-id-card-modal .card-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .employee-id-card-modal .card-company-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .employee-id-card-modal .card-company-icon {
          font-size: 16px;
          opacity: 0.9;
        }

        .employee-id-card-modal .card-company-name {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .employee-id-card-modal .card-employee-id {
          font-size: 10px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(10px);
          padding: 5px 10px;
          border-radius: 12px;
          letter-spacing: 0.5px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          display: flex;
          align-items: center;
        }

        /* Card Body */
        .employee-id-card-modal .card-body-content {
          flex: 1;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: #ffffff;
        }

        .employee-id-card-modal .card-main-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          flex: 1;
          min-height: 0;
        }

        /* Employee Photo Section */
        .employee-id-card-modal .employee-photo-section {
          flex-shrink: 0;
        }

        .employee-id-card-modal .employee-photo-frame {
          position: relative;
          width: 75px;
          height: 75px;
        }

        .employee-id-card-modal .employee-photo-img {
          width: 75px;
          height: 75px;
          border-radius: 12px;
          border: 3px solid #ffffff;
          box-shadow: 
            0 4px 12px rgba(102, 126, 234, 0.2),
            0 2px 4px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
          object-fit: cover;
          display: block;
          background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
        }

        .employee-id-card-modal .photo-placeholder {
          width: 75px;
          height: 75px;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 32px;
          border: 3px solid #ffffff;
          box-shadow: 
            0 4px 12px rgba(102, 126, 234, 0.2),
            0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .employee-id-card-modal .photo-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          border-radius: 50%;
          border: 3px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          box-shadow: 0 2px 6px rgba(40, 167, 69, 0.4);
        }

        /* Employee Info Section */
        .employee-id-card-modal .employee-info-section {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding-top: 4px;
        }

        .employee-id-card-modal .employee-name {
          font-size: 17px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 4px;
          line-height: 1.3;
          text-transform: capitalize;
          word-wrap: break-word;
          overflow-wrap: break-word;
          letter-spacing: -0.2px;
        }

        .employee-id-card-modal .employee-position {
          font-size: 12px;
          font-weight: 600;
          color: #667eea;
          margin-bottom: 3px;
          text-transform: capitalize;
          line-height: 1.3;
          display: flex;
          align-items: center;
        }

        .employee-id-card-modal .employee-department {
          font-size: 10px;
          color: #666;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          line-height: 1.3;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
        }

        .employee-id-card-modal .employee-contact {
          font-size: 10px;
          color: #888;
          font-weight: 500;
          line-height: 1.3;
          display: flex;
          align-items: center;
          margin-top: 2px;
        }

        /* QR Code Section */
        .employee-id-card-modal .qr-code-section {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          width: 80px;
        }

        .employee-id-card-modal .qr-code-container {
          position: relative;
        }

        .employee-id-card-modal .qr-code-wrapper {
          width: 80px;
          height: 80px;
          padding: 5px;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border: 2px solid #e8eaf6;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 
            0 4px 8px rgba(102, 126, 234, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          overflow: hidden;
          box-sizing: border-box;
          position: relative;
        }

        .employee-id-card-modal .qr-code-background {
          width: 70px;
          height: 70px;
          background: #ffffff;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3px;
        }

        .employee-id-card-modal .qr-code-wrapper svg {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
        }

        .employee-id-card-modal .qr-code-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }

        .employee-id-card-modal .qr-code-corner {
          position: absolute;
          width: 12px;
          height: 12px;
          border: 2px solid #667eea;
        }

        .employee-id-card-modal .qr-corner-tl {
          top: 2px;
          left: 2px;
          border-right: none;
          border-bottom: none;
          border-top-left-radius: 4px;
        }

        .employee-id-card-modal .qr-corner-tr {
          top: 2px;
          right: 2px;
          border-left: none;
          border-bottom: none;
          border-top-right-radius: 4px;
        }

        .employee-id-card-modal .qr-corner-bl {
          bottom: 2px;
          left: 2px;
          border-right: none;
          border-top: none;
          border-bottom-left-radius: 4px;
        }

        .employee-id-card-modal .qr-corner-br {
          bottom: 2px;
          right: 2px;
          border-left: none;
          border-top: none;
          border-bottom-right-radius: 4px;
        }

        .employee-id-card-modal .qr-code-placeholder {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
          border: 2px dashed #ccc;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #999;
          font-size: 9px;
          gap: 4px;
        }

        .employee-id-card-modal .qr-code-placeholder i {
          font-size: 24px;
          opacity: 0.5;
        }

        .employee-id-card-modal .qr-label {
          font-size: 9px;
          color: #667eea;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: center;
          line-height: 1.3;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Card Footer */
        .employee-id-card-modal .card-footer {
          padding: 10px 18px;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-top: 1px solid rgba(102, 126, 234, 0.1);
          border-bottom-left-radius: 16px;
          border-bottom-right-radius: 16px;
        }

        .employee-id-card-modal .card-footer-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .employee-id-card-modal .card-validity-badge {
          font-size: 10px;
          color: #28a745;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          background: rgba(40, 167, 69, 0.1);
          padding: 4px 8px;
          border-radius: 8px;
        }

        .employee-id-card-modal .card-date {
          font-size: 9px;
          color: #666;
          font-weight: 500;
          display: flex;
          align-items: center;
        }
      `}</style>
    </>
  );
};

export default Employees; 
