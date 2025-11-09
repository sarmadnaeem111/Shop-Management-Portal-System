import React, { useState } from 'react';
import { Navbar, Nav, Container, Button, Offcanvas } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';
import Translate from './Translate';
import '../styles/sidebar.css';

const AdminNavbar = () => {
  const { adminUser, adminLogout } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(false);
  
  const handleClose = () => setShowSidebar(false);
  const handleShow = () => setShowSidebar(true);

  const handleLogout = () => {
    adminLogout()
      .then(() => {
        navigate('/admin/login');
      })
      .catch(error => {
        console.error('Failed to log out', error);
      });
  };
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container fluid>
          <Navbar.Brand as={Link} to="/admin/dashboard">
            Golden Oil Admin
          </Navbar.Brand>
          
          <Button 
            variant="outline-light" 
            className="d-lg-none"
            onClick={handleShow}
          >
            <i className="bi bi-list"></i> <Translate textKey="menu" fallback="Menu" />
          </Button>
          
          <div className="d-none d-lg-flex align-items-center">
            <LanguageToggle />
            {adminUser && (
              <Button variant="outline-light" onClick={handleLogout} className="ms-2">
                <Translate textKey="logout" />
              </Button>
            )}
          </div>
        </Container>
      </Navbar>
      
      {/* Sidebar for mobile view */}
      <Offcanvas show={showSidebar} onHide={handleClose} className="app-mobile-sidebar" placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title><Translate textKey="adminPanel" fallback="Admin Panel" /></Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column sidebar-nav">
            <Nav.Link 
              as={Link} 
              to="/admin/dashboard" 
              className={`sidebar-link ${isActive('/admin/dashboard') ? 'active' : ''}`}
              onClick={handleClose}
            >
              <i className="bi bi-speedometer2 me-2"></i><Translate textKey="dashboard" />
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/admin/pending-users" 
              className={`sidebar-link ${isActive('/admin/pending-users') ? 'active' : ''}`}
              onClick={handleClose}
            >
              <i className="bi bi-person-plus me-2"></i><Translate textKey="pendingApprovals" fallback="Pending Approvals" />
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/admin/users" 
              className={`sidebar-link ${isActive('/admin/users') ? 'active' : ''}`}
              onClick={handleClose}
            >
              <i className="bi bi-people me-2"></i><Translate textKey="manageUsers" fallback="Manage Users" />
            </Nav.Link>
            <div className="d-flex mt-3">
              <LanguageToggle />
              <Button 
                variant="outline-danger" 
                onClick={() => {
                  handleLogout();
                  handleClose();
                }}
                className="ms-2"
              >
                <Translate textKey="logout" />
              </Button>
            </div>
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
      
      {/* Sidebar for desktop */}
      <div className="app-sidebar d-none d-lg-block" style={{ top: '70px' }}>
        <div className="px-3 mb-3 fw-bold sidebar-brand">
          <Link to="/admin/dashboard" className="text-decoration-none">
            Golden Oil Admin
          </Link>
        </div>
        <Nav className="flex-column px-3 sidebar-nav">
          <Nav.Link 
            as={Link} 
            to="/admin/dashboard" 
            className={`rounded py-2 sidebar-link ${isActive('/admin/dashboard') ? 'active' : ''}`}
          >
            <i className="bi bi-speedometer2 me-2"></i> <Translate textKey="dashboard" />
          </Nav.Link>
          <Nav.Link 
            as={Link} 
            to="/admin/pending-users" 
            className={`rounded py-2 sidebar-link ${isActive('/admin/pending-users') ? 'active' : ''}`}
          >
            <i className="bi bi-person-plus me-2"></i> <Translate textKey="pendingApprovals" fallback="Pending Approvals" />
          </Nav.Link>
          <Nav.Link 
            as={Link} 
            to="/admin/users" 
            className={`rounded py-2 sidebar-link ${isActive('/admin/users') ? 'active' : ''}`}
          >
            <i className="bi bi-people me-2"></i> <Translate textKey="manageUsers" fallback="Manage Users" />
          </Nav.Link>
        </Nav>
        <div className="px-3 mt-3 sidebar-footer">
          <LanguageToggle />
          <Button variant="outline-danger" className="ms-2" onClick={handleLogout}>
            <Translate textKey="logout" />
          </Button>
        </div>
      </div>
    </>
  );
};

export default AdminNavbar; 
