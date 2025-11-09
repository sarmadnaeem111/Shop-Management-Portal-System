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

  const handlePrintCard = (employee) => {
    const cardElement = document.getElementById(`employee-card-${employee.id}`);
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
            .employee-id-card {
              margin: 0 auto !important;
              box-shadow: none !important;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
              .employee-id-card {
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
          document.body.removeChild(iframe);
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
      <Container className="mt-4 employee-cards-container">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 page-header-section">
          <PageHeader title="Employee QR Cards" icon="bi-qr-code" color="primary" />
          <div className="d-flex gap-2 mt-2 mt-md-0 header-buttons">
            <Button variant="secondary" className="back-btn" onClick={() => navigate('/employees')}>Back</Button>
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
          <Row className="employee-cards-row">
            {filteredEmployees.map(emp => (
              <Col key={emp.id} xs={12} sm={12} md={6} lg={4} xl={3}>
                <div className="employee-card-wrapper">
                  <div id={`employee-card-${emp.id}`} className="employee-id-card card-print">
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
                          ID: {emp.employeeId || emp.id.substring(0, 8).toUpperCase()}
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="card-body-content">
                      <div className="card-main-row">
                        {/* Employee Photo Section */}
                        <div className="employee-photo-section">
                          <div className="employee-photo-frame">
                            {emp.imageUrl && emp.imageUrl.trim() !== '' ? (
                              <img 
                                src={emp.imageUrl} 
                                alt={emp.name || 'Employee'} 
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
                              style={{ display: (emp.imageUrl && emp.imageUrl.trim() !== '') ? 'none' : 'flex' }}
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
                          <div className="employee-name">{emp.name || 'Employee Name'}</div>
                          <div className="employee-position">
                            <i className="bi bi-briefcase-fill me-1"></i>
                            {emp.position || 'Employee'}
                          </div>
                          {emp.department && (
                            <div className="employee-department">
                              <i className="bi bi-diagram-3-fill me-1"></i>
                              {emp.department}
                            </div>
                          )}
                          {emp.contact && (
                            <div className="employee-contact">
                              <i className="bi bi-telephone-fill me-1"></i>
                              {emp.contact}
                            </div>
                          )}
                        </div>

                        {/* QR Code Section */}
                        <div className="qr-code-section">
                          <div className="qr-code-container">
                      {emp.qrCodeId ? (
                              <div className="qr-code-wrapper">
                                <div className="qr-code-background">
                                  <QRCode 
                                    id={`card-qr-${emp.id}`} 
                                    value={emp.qrCodeId} 
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
                          {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Active'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 w-100 d-print-none text-center">
                      {emp.qrCodeId && (
                      <div className="d-flex gap-2">
                        <Button 
                          variant="primary" 
                          size="sm" 
                          className="flex-fill download-card-btn" 
                          onClick={() => downloadCardPng(emp)}
                        >
                          <i className="bi bi-download me-2"></i>
                          Download
                        </Button>
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          className="flex-fill print-card-btn" 
                          onClick={() => handlePrintCard(emp)}
                        >
                          <i className="bi bi-printer me-2"></i>
                          Print
                        </Button>
                      </div>
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
        .employee-cards-container {
          padding-left: 15px;
          padding-right: 15px;
        }

        .page-header-section {
          gap: 15px;
        }

        .header-buttons {
          flex-wrap: wrap;
        }

        .employee-cards-row {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 30px !important;
          margin: 0 !important;
          padding: 20px 0 !important;
          justify-content: center;
        }
        
        .employee-cards-row > * {
          flex: 0 0 auto !important;
          margin: 0 !important;
          padding: 0 !important;
          max-width: none !important;
        }
        
        .employee-cards-row .col,
        .employee-cards-row [class*="col-"] {
          margin: 0 !important;
          padding: 0 !important;
          max-width: none !important;
        }
        
        .employee-card-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          margin: 0 !important;
          padding: 0;
        }

        .employee-id-card {
          width: 100%;
          max-width: 360px;
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
          margin: 0 auto !important;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .employee-id-card:hover {
          transform: translateY(-4px);
          box-shadow: 
            0 15px 50px rgba(102, 126, 234, 0.2),
            0 6px 16px rgba(0, 0, 0, 0.12),
            0 0 0 1px rgba(102, 126, 234, 0.15);
        }

        /* Decorative Top Pattern */
        .card-top-pattern {
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
        .lanyard-hole {
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

        .lanyard-hole-inner {
          width: 8px;
          height: 8px;
          background: #667eea;
          border-radius: 50%;
        }

        /* Card Header */
        .card-header-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          padding: 14px 18px;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .card-header-gradient::before {
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

        .card-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .card-company-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .card-company-icon {
          font-size: 16px;
          opacity: 0.9;
        }

        .card-company-name {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .card-employee-id {
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
        .card-body-content {
          flex: 1;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: #ffffff;
        }

        .card-main-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          flex: 1;
          min-height: 0;
        }

        /* Employee Photo Section */
        .employee-photo-section {
          flex-shrink: 0;
        }

        .employee-photo-frame {
          position: relative;
          width: 75px;
          height: 75px;
        }

        .employee-photo-img {
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

        .photo-placeholder {
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

        .photo-badge {
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
        .employee-info-section {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding-top: 4px;
        }

        .employee-name {
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

        .employee-position {
          font-size: 12px;
          font-weight: 600;
          color: #667eea;
          margin-bottom: 3px;
          text-transform: capitalize;
          line-height: 1.3;
          display: flex;
          align-items: center;
        }

        .employee-department {
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

        .employee-contact {
          font-size: 10px;
          color: #888;
          font-weight: 500;
          line-height: 1.3;
          display: flex;
          align-items: center;
          margin-top: 2px;
        }

        /* QR Code Section */
        .qr-code-section {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          width: 80px;
        }

        .qr-code-container {
          position: relative;
        }

        .qr-code-wrapper {
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

        .qr-code-background {
          width: 70px;
          height: 70px;
          background: #ffffff;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3px;
        }

        .qr-code-wrapper svg {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
        }

        .qr-code-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }

        .qr-code-corner {
          position: absolute;
          width: 12px;
          height: 12px;
          border: 2px solid #667eea;
        }

        .qr-corner-tl {
          top: 2px;
          left: 2px;
          border-right: none;
          border-bottom: none;
          border-top-left-radius: 4px;
        }

        .qr-corner-tr {
          top: 2px;
          right: 2px;
          border-left: none;
          border-bottom: none;
          border-top-right-radius: 4px;
        }

        .qr-corner-bl {
          bottom: 2px;
          left: 2px;
          border-right: none;
          border-top: none;
          border-bottom-left-radius: 4px;
        }

        .qr-corner-br {
          bottom: 2px;
          right: 2px;
          border-left: none;
          border-top: none;
          border-bottom-right-radius: 4px;
        }

        .qr-code-placeholder {
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

        .qr-code-placeholder i {
          font-size: 24px;
          opacity: 0.5;
        }

        .qr-label {
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
        .card-footer {
          padding: 10px 18px;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-top: 1px solid rgba(102, 126, 234, 0.1);
          border-bottom-left-radius: 16px;
          border-bottom-right-radius: 16px;
        }

        .card-footer-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;
        }

        .card-validity-badge {
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

        .card-date {
          font-size: 9px;
          color: #666;
          font-weight: 500;
          display: flex;
          align-items: center;
        }

        /* Download Button */
        .download-card-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          border: none;
          font-weight: 600;
          box-shadow: 
            0 4px 12px rgba(102, 126, 234, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .download-card-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .download-card-btn:hover::before {
          left: 100%;
        }

        .download-card-btn:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 6px 16px rgba(102, 126, 234, 0.4),
            0 3px 6px rgba(0, 0, 0, 0.15);
        }

        .download-card-btn:active {
          transform: translateY(0);
        }

        /* Print Card Button */
        .print-card-btn {
          border: 2px solid #667eea;
          color: #667eea;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .print-card-btn:hover {
          background: #667eea;
          color: white;
          border-color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .print-card-btn:active {
          transform: translateY(0);
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

        /* Responsive Styles */
        
        /* Large Desktop (xl and above) */
        @media (min-width: 1200px) {
          .employee-cards-row {
            gap: 40px !important;
            justify-content: flex-start;
          }
          
          .employee-id-card {
            max-width: 360px;
          }
        }

        /* Desktop (lg) */
        @media (min-width: 992px) and (max-width: 1199.98px) {
          .employee-cards-row {
            gap: 35px !important;
            justify-content: flex-start;
          }
          
          .employee-id-card {
            max-width: 340px;
          }
        }

        /* Tablet (md) */
        @media (min-width: 768px) and (max-width: 991.98px) {
          .employee-cards-row {
            gap: 30px !important;
            justify-content: center;
          }
          
          .employee-id-card {
            max-width: 320px;
            height: 220px;
          }

          .card-header-gradient {
            padding: 12px 16px;
          }

          .card-body-content {
            padding: 14px 16px;
          }

          .employee-photo-frame {
            width: 70px;
            height: 70px;
          }

          .employee-photo-img,
          .photo-placeholder {
            width: 70px;
            height: 70px;
          }

          .employee-name {
            font-size: 16px;
          }

          .qr-code-section {
            width: 75px;
          }

          .qr-code-wrapper {
            width: 75px;
            height: 75px;
          }

          .qr-code-background {
            width: 65px;
            height: 65px;
          }
        }

        /* Mobile Landscape and Small Tablets (sm) */
        @media (min-width: 576px) and (max-width: 767.98px) {
          .employee-cards-row {
            gap: 25px !important;
            justify-content: center;
          }
          
          .employee-id-card {
            max-width: 100%;
            width: 100%;
            height: 220px;
          }

          .card-header-gradient {
            padding: 12px 14px;
          }

          .card-body-content {
            padding: 12px 14px;
          }

          .card-main-row {
            gap: 10px;
          }

          .employee-photo-frame {
            width: 65px;
            height: 65px;
          }

          .employee-photo-img,
          .photo-placeholder {
            width: 65px;
            height: 65px;
          }

          .employee-name {
            font-size: 15px;
          }

          .employee-position {
            font-size: 11px;
          }

          .qr-code-section {
            width: 70px;
          }

          .qr-code-wrapper {
            width: 70px;
            height: 70px;
          }

          .qr-code-background {
            width: 60px;
            height: 60px;
          }
        }

        /* Mobile Portrait (xs) */
        @media (max-width: 575.98px) {
          .employee-cards-container {
            padding-left: 10px;
            padding-right: 10px;
          }

          .page-header-section {
            margin-bottom: 15px !important;
          }

          .header-buttons {
            width: 100%;
          }

          .header-buttons .btn {
            flex: 1;
            min-width: 0;
          }

          .search-bar {
            margin-bottom: 15px !important;
          }

          .employee-cards-row {
            gap: 20px !important;
            padding: 15px 0 !important;
            justify-content: center;
          }
          
          .employee-id-card {
            max-width: 100%;
            width: 100%;
            height: auto;
            min-height: 200px;
          }

          .card-header-gradient {
            padding: 10px 12px;
          }

          .card-company-name {
            font-size: 11px;
          }

          .card-employee-id {
            font-size: 9px;
            padding: 4px 8px;
          }

          .card-body-content {
            padding: 12px;
          }

          .card-main-row {
            gap: 8px;
            flex-wrap: nowrap;
            align-items: flex-start;
          }

          .employee-photo-section {
            flex-shrink: 0;
            display: flex;
            justify-content: flex-start;
            margin-bottom: 0;
          }

          .employee-photo-frame {
            width: 55px;
            height: 55px;
          }

          .employee-photo-img,
          .photo-placeholder {
            width: 55px;
            height: 55px;
          }

          .employee-info-section {
            flex: 1;
            min-width: 0;
            text-align: left;
            padding-left: 0;
          }

          .employee-name {
            font-size: 14px;
            margin-bottom: 4px;
            font-weight: 700;
            line-height: 1.2;
          }

          .employee-position {
            font-size: 10px;
            margin-bottom: 3px;
            justify-content: flex-start;
            color: #666;
          }

          .employee-department {
            font-size: 9px;
            margin-bottom: 2px;
            justify-content: flex-start;
            color: #666;
          }

          .employee-contact {
            font-size: 9px;
            justify-content: flex-start;
            color: #888;
            margin-top: 2px;
          }

          .qr-code-section {
            flex-shrink: 0;
            width: auto;
            margin-top: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .qr-code-wrapper {
            width: 60px;
            height: 60px;
            margin: 0;
          }

          .qr-code-background {
            width: 50px;
            height: 50px;
          }

          .qr-label {
            font-size: 8px;
            margin-top: 4px;
            text-align: center;
          }

          .card-footer {
            padding: 8px 12px;
          }

          .card-validity-badge {
            font-size: 9px;
            padding: 3px 6px;
          }

          .card-date {
            font-size: 8px;
          }

          .download-card-btn,
          .print-card-btn {
            font-size: 12px;
            padding: 6px 12px;
          }

          .download-card-btn i,
          .print-card-btn i {
            font-size: 14px;
          }
        }

        /* Extra Small Mobile */
        @media (max-width: 375px) {
          .employee-id-card {
            min-height: 180px;
          }

          .card-header-gradient {
            padding: 8px 10px;
          }

          .card-body-content {
            padding: 10px;
          }

          .card-main-row {
            gap: 6px;
          }

          .employee-photo-frame {
            width: 50px;
            height: 50px;
          }

          .employee-photo-img,
          .photo-placeholder {
            width: 50px;
            height: 50px;
          }

          .employee-name {
            font-size: 13px;
            margin-bottom: 3px;
          }

          .employee-position {
            font-size: 9px;
            margin-bottom: 2px;
          }

          .employee-contact {
            font-size: 8px;
          }

          .qr-code-wrapper {
            width: 55px;
            height: 55px;
          }

          .qr-code-background {
            width: 47px;
            height: 47px;
          }

          .qr-label {
            font-size: 7px;
          }
        }
      `}</style>
    </>
  );
};

export default EmployeeCards;


