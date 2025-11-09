import React, { useState } from 'react';
import { Navbar, Nav, Container, Button, NavDropdown, Offcanvas } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';
import Translate from './Translate';
import '../styles/sidebar.css';

const MainNavbar = () => {
  const { currentUser, logout, shopData, staffData, isStaff, isGuest } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(false);
  const location = useLocation();

  const handleLogout = () => {
    logout()
      .then(() => {
        navigate('/login');
      })
      .catch(error => {
        console.error('Failed to log out', error);
      });
  };

  // Helper function to check if staff has permission
  const hasPermission = (permission) => {
    if (!isStaff || !staffData) return true; // Shop owners have all permissions
    return staffData.permissions && staffData.permissions[permission];
  };
  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile Top Bar with Menu Button */}
      <Navbar bg="primary" variant="dark" className="mb-3 d-lg-none">
        <Container fluid>
        <Navbar.Brand as={Link} to="/dashboard">
          {shopData ? shopData.shopName : 'Shop Billing System'}
        </Navbar.Brand>
          <Button variant="outline-light" onClick={() => setShowSidebar(true)}>
            <i className="bi bi-list"></i> <Translate textKey="menu" fallback="Menu" />
          </Button>
        </Container>
      </Navbar>

      {/* Mobile Offcanvas Sidebar */}
      <Offcanvas show={showSidebar} onHide={() => setShowSidebar(false)} placement="start" className="app-mobile-sidebar">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            {shopData ? shopData.shopName : 'Shop Billing System'}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column sidebar-nav">
            {currentUser ? (
              <>
                <Nav.Link as={Link} to="/dashboard" className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => setShowSidebar(false)}><i className="bi bi-speedometer2 me-2"></i><Translate textKey="dashboard" /></Nav.Link>
                {hasPermission('canCreateReceipts') && (
                  <Nav.Link as={Link} to="/new-receipt" className={`sidebar-link ${isActive('/new-receipt') ? 'active' : ''}`} onClick={() => setShowSidebar(false)}><i className="bi bi-receipt me-2"></i><Translate textKey="newReceipt" /></Nav.Link>
                )}
                {hasPermission('canViewReceipts') && (
                  <Nav.Link as={Link} to="/receipts" className={`sidebar-link ${isActive('/receipts') ? 'active' : ''}`} onClick={() => setShowSidebar(false)}><i className="bi bi-journal-text me-2"></i><Translate textKey="receipts" /></Nav.Link>
                )}
                {hasPermission('canViewAnalytics') && (
                  <Nav.Link as={Link} to="/sales-analytics" className={`sidebar-link ${isActive('/sales-analytics') ? 'active' : ''}`} onClick={() => setShowSidebar(false)}><i className="bi bi-bar-chart me-2"></i><Translate textKey="salesAnalytics" fallback="Sales Analytics" /></Nav.Link>
                )}
                {hasPermission('canViewStock') && (
                  <Nav.Link as={Link} to="/stock" className={`sidebar-link ${isActive('/stock') ? 'active' : ''}`} onClick={() => setShowSidebar(false)}><i className="bi bi-box-seam me-2"></i><Translate textKey="inventory" /></Nav.Link>
                )}
                {hasPermission('canViewEmployees') && (
                  <>
                    <Nav.Link as={Link} to="/employees" className={`sidebar-link ${isActive('/employees') ? 'active' : ''}`} onClick={() => setShowSidebar(false)}><i className="bi bi-people me-2"></i><Translate textKey="viewEmployees" /></Nav.Link>
                    {!isStaff && (
                      <Nav.Link as={Link} to="/add-employee" className={`sidebar-link ${isActive('/add-employee') ? 'active' : ''}`} onClick={() => setShowSidebar(false)}><i className="bi bi-person-plus me-2"></i><Translate textKey="addEmployee" /></Nav.Link>
                    )}
                  </>
                )}
                {hasPermission('canManageExpenses') && (
                  <>
                    <Nav.Link as={Link} to="/expenses" className={`sidebar-link ${isActive('/expenses') ? 'active' : ''}`} onClick={() => setShowSidebar(false)}><i className="bi bi-cash-coin me-2"></i><Translate textKey="viewExpenses" fallback="View Expenses" /></Nav.Link>
                    {!isStaff && (
                      <>
                        <Nav.Link as={Link} to="/add-expense" className={`sidebar-link ${isActive('/add-expense') ? 'active' : ''}`} onClick={() => setShowSidebar(false)}><i className="bi bi-plus-circle me-2"></i><Translate textKey="addExpense" fallback="Add Expense" /></Nav.Link>
                        <Nav.Link as={Link} to="/expense-categories" className={`sidebar-link ${isActive('/expense-categories') ? 'active' : ''}`} onClick={() => setShowSidebar(false)}><i className="bi bi-tags me-2"></i><Translate textKey="expenseCategories" fallback="Expense Categories" /></Nav.Link>
                      </>
                    )}
                  </>
                )}
                {hasPermission('canMarkAttendance') && (
                  <>
                    <Nav.Link as={Link} to="/attendance" className={`sidebar-link ${isActive('/attendance') ? 'active' : ''}`} onClick={() => setShowSidebar(false)}><i className="bi bi-calendar-check me-2"></i><Translate textKey="viewAttendance" /></Nav.Link>
                    <Nav.Link as={Link} to="/mark-attendance" className={`sidebar-link ${isActive('/mark-attendance') ? 'active' : ''}`} onClick={() => setShowSidebar(false)}><i className="bi bi-check2-square me-2"></i><Translate textKey="markAttendance" /></Nav.Link>
                    {!isStaff && (
                      <Nav.Link as={Link} to="/attendance-report" className={`sidebar-link ${isActive('/attendance-report') ? 'active' : ''}`} onClick={() => setShowSidebar(false)}><i className="bi bi-clipboard-data me-2"></i><Translate textKey="attendanceReport" /></Nav.Link>
                    )}
                  </>
                )}
                {!isStaff && !isGuest && (
                  <Nav.Link as={Link} to="/settings" className={`sidebar-link ${isActive('/settings') ? 'active' : ''}`} onClick={() => setShowSidebar(false)}><i className="bi bi-gear me-2"></i><Translate textKey="settings" /></Nav.Link>
                )}
                {!isStaff && !isGuest && (
                  <Nav.Link as={Link} to="/staff-management" className={`sidebar-link ${isActive('/staff-management') ? 'active' : ''}`} onClick={() => setShowSidebar(false)}><i className="bi bi-people-gear me-2"></i>Staff Management</Nav.Link>
                )}
                <div className="d-flex mt-3">
                  <LanguageToggle />
                  <Button 
                    variant="outline-danger" 
                    className="ms-2"
                    onClick={() => { handleLogout(); setShowSidebar(false); }}
                  >
                    <Translate textKey="logout" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" onClick={() => setShowSidebar(false)}><Translate textKey="login" /></Nav.Link>
                <Nav.Link as={Link} to="/register" onClick={() => setShowSidebar(false)}><Translate textKey="register" /></Nav.Link>
                <LanguageToggle />
              </>
            )}
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Desktop fixed sidebar */}
      <div className="app-sidebar d-none d-lg-block">
        <div className="px-3 mb-3 fw-bold sidebar-brand">
          <Link to="/dashboard" className="text-decoration-none">
            {shopData ? shopData.shopName : 'Shop Billing System'}
          </Link>
        </div>
        <Nav className="flex-column px-3 sidebar-nav">
          {currentUser && (
            <>
              <Nav.Link as={Link} to="/dashboard" className={`rounded py-2 sidebar-link ${isActive('/dashboard') ? 'active' : ''}`}>
                <i className="bi bi-speedometer2 me-2"></i> <Translate textKey="dashboard" />
              </Nav.Link>
              {hasPermission('canCreateReceipts') && (
                <Nav.Link as={Link} to="/new-receipt" className={`rounded py-2 sidebar-link ${isActive('/new-receipt') ? 'active' : ''}`}>
                  <i className="bi bi-receipt me-2"></i> <Translate textKey="newReceipt" />
                </Nav.Link>
              )}
              {hasPermission('canViewReceipts') && (
                <Nav.Link as={Link} to="/receipts" className={`rounded py-2 sidebar-link ${isActive('/receipts') ? 'active' : ''}`}>
                  <i className="bi bi-journal-text me-2"></i> <Translate textKey="receipts" />
                </Nav.Link>
              )}
              {hasPermission('canViewAnalytics') && (
                <Nav.Link as={Link} to="/sales-analytics" className={`rounded py-2 sidebar-link ${isActive('/sales-analytics') ? 'active' : ''}`}>
                  <i className="bi bi-bar-chart me-2"></i> <Translate textKey="salesAnalytics" fallback="Sales Analytics" />
                </Nav.Link>
              )}
              {hasPermission('canViewStock') && (
                <Nav.Link as={Link} to="/stock" className={`rounded py-2 sidebar-link ${isActive('/stock') ? 'active' : ''}`}>
                  <i className="bi bi-box-seam me-2"></i> <Translate textKey="inventory" />
                </Nav.Link>
              )}
              {hasPermission('canViewEmployees') && (
                <>
                  <Nav.Link as={Link} to="/employees" className={`rounded py-2 sidebar-link ${isActive('/employees') ? 'active' : ''}`}>
                    <i className="bi bi-people me-2"></i> <Translate textKey="viewEmployees" />
                  </Nav.Link>
                  {!isStaff && (
                    <Nav.Link as={Link} to="/add-employee" className={`rounded py-2 sidebar-link ${isActive('/add-employee') ? 'active' : ''}`}>
                      <i className="bi bi-person-plus me-2"></i> <Translate textKey="addEmployee" />
                    </Nav.Link>
                  )}
                </>
              )}
              {hasPermission('canManageExpenses') && (
                <>
                  <Nav.Link as={Link} to="/expenses" className={`rounded py-2 sidebar-link ${isActive('/expenses') ? 'active' : ''}`}>
                    <i className="bi bi-cash-coin me-2"></i> <Translate textKey="viewExpenses" fallback="View Expenses" />
                  </Nav.Link>
                  {!isStaff && (
                    <>
                      <Nav.Link as={Link} to="/add-expense" className={`rounded py-2 sidebar-link ${isActive('/add-expense') ? 'active' : ''}`}>
                        <i className="bi bi-plus-circle me-2"></i> <Translate textKey="addExpense" fallback="Add Expense" />
                      </Nav.Link>
                      <Nav.Link as={Link} to="/expense-categories" className={`rounded py-2 sidebar-link ${isActive('/expense-categories') ? 'active' : ''}`}>
                        <i className="bi bi-tags me-2"></i> <Translate textKey="expenseCategories" fallback="Expense Categories" />
                      </Nav.Link>
                    </>
                  )}
                </>
              )}
              {hasPermission('canMarkAttendance') && (
                <>
                  <Nav.Link as={Link} to="/attendance" className={`rounded py-2 sidebar-link ${isActive('/attendance') ? 'active' : ''}`}>
                    <i className="bi bi-calendar-check me-2"></i> <Translate textKey="viewAttendance" />
                  </Nav.Link>
                  <Nav.Link as={Link} to="/mark-attendance" className={`rounded py-2 sidebar-link ${isActive('/mark-attendance') ? 'active' : ''}`}>
                    <i className="bi bi-check2-square me-2"></i> <Translate textKey="markAttendance" />
                  </Nav.Link>
                  {!isStaff && (
                    <Nav.Link as={Link} to="/attendance-report" className={`rounded py-2 sidebar-link ${isActive('/attendance-report') ? 'active' : ''}`}>
                      <i className="bi bi-clipboard-data me-2"></i> <Translate textKey="attendanceReport" />
                    </Nav.Link>
                  )}
                </>
              )}
              {!isStaff && !isGuest && (
                <Nav.Link as={Link} to="/settings" className={`rounded py-2 sidebar-link ${isActive('/settings') ? 'active' : ''}`}>
                  <i className="bi bi-gear me-2"></i> <Translate textKey="settings" />
                </Nav.Link>
              )}
              {!isStaff && !isGuest && (
                <Nav.Link as={Link} to="/staff-management" className={`rounded py-2 sidebar-link ${isActive('/staff-management') ? 'active' : ''}`}>
                  <i className="bi bi-people-gear me-2"></i> Staff Management
                </Nav.Link>
              )}
            </>
          )}
        </Nav>
        <div className="px-3 mt-3 sidebar-footer">
            {currentUser ? (
              <>
                <LanguageToggle />
              <Button variant="outline-danger" className="ms-2" onClick={handleLogout}>
                <Translate textKey="logout" />
              </Button>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login"><Translate textKey="login" /></Nav.Link>
                <Nav.Link as={Link} to="/register"><Translate textKey="register" /></Nav.Link>
                <LanguageToggle />
              </>
            )}
        </div>
      </div>

      {/* Spacer so page content doesn't slide under the fixed sidebar on desktop */}
      <div className="d-none d-lg-block" style={{ width: '250px' }} />
    </>
  );
};

export default MainNavbar;