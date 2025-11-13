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

  const userDisplayName = staffData?.name || shopData?.ownerName || currentUser?.displayName || currentUser?.email || 'User';
  let userRoleLabel = 'Super Admin';
  if (isGuest) {
    userRoleLabel = 'Guest User';
  } else if (isStaff) {
    userRoleLabel = staffData?.role || 'Staff Member';
  }

  const renderNavItem = (path, icon, label, closeSidebar = false) => (
    <Nav.Link
      as={Link}
      to={path}
      className={`sidebar-link ${isActive(path) ? 'active' : ''}`}
      onClick={() => {
        if (closeSidebar) {
          setShowSidebar(false);
        }
      }}
    >
      <span className="sidebar-icon">
        <i className={`bi ${icon}`}></i>
      </span>
      <span className="sidebar-text">{label}</span>
    </Nav.Link>
  );

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
          {currentUser && (
            <div className="sidebar-user-card mb-4">
              <div className="sidebar-user-icon">
                <i className="bi bi-person-fill"></i>
              </div>
              <div>
                <div className="sidebar-user-name">{userDisplayName}</div>
                <div className="sidebar-user-role">{userRoleLabel}</div>
              </div>
            </div>
          )}
          <Nav className="flex-column sidebar-nav">
            {currentUser ? (
              <>
                {renderNavItem('/dashboard', 'bi-speedometer2', <Translate textKey="dashboard" />, true)}
                {hasPermission('canCreateReceipts') && (
                  renderNavItem('/new-receipt', 'bi-receipt', <Translate textKey="newReceipt" />, true)
                )}
                {hasPermission('canViewReceipts') && (
                  renderNavItem('/receipts', 'bi-journal-text', <Translate textKey="receipts" />, true)
                )}
                {hasPermission('canViewAnalytics') && (
                  renderNavItem('/sales-analytics', 'bi-bar-chart', <Translate textKey="salesAnalytics" fallback="Sales Analytics" />, true)
                )}
                {hasPermission('canViewStock') && (
                  renderNavItem('/stock', 'bi-box-seam', <Translate textKey="inventory" />, true)
                )}
                {hasPermission('canViewEmployees') && (
                  <>
                    {renderNavItem('/employees', 'bi-people', <Translate textKey="viewEmployees" />, true)}
                    {!isStaff && (
                      renderNavItem('/add-employee', 'bi-person-plus', <Translate textKey="addEmployee" />, true)
                    )}
                  </>
                )}
                {hasPermission('canManageExpenses') && (
                  <>
                    {renderNavItem('/expenses', 'bi-cash-coin', <Translate textKey="viewExpenses" fallback="View Expenses" />, true)}
                    {!isStaff && (
                      <>
                        {renderNavItem('/add-expense', 'bi-plus-circle', <Translate textKey="addExpense" fallback="Add Expense" />, true)}
                        {renderNavItem('/expense-categories', 'bi-tags', <Translate textKey="expenseCategories" fallback="Expense Categories" />, true)}
                      </>
                    )}
                  </>
                )}
                {hasPermission('canMarkAttendance') && (
                  <>
                    {renderNavItem('/attendance', 'bi-calendar-check', <Translate textKey="viewAttendance" />, true)}
                    {renderNavItem('/mark-attendance', 'bi-check2-square', <Translate textKey="markAttendance" />, true)}
                    {!isStaff && (
                      renderNavItem('/attendance-report', 'bi-clipboard-data', <Translate textKey="attendanceReport" />, true)
                    )}
                  </>
                )}
                {!isStaff && !isGuest && (
                  renderNavItem('/settings', 'bi-gear', <Translate textKey="settings" />, true)
                )}
                {!isStaff && !isGuest && (
                  renderNavItem('/staff-management', 'bi-people-gear', 'Staff Management', true)
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
        <div className="sidebar-top">
          <Link to="/dashboard" className="sidebar-logo text-decoration-none">
            {shopData ? shopData.shopName : 'Shop Billing System'}
          </Link>
          {currentUser && (
            <div className="sidebar-user-meta">
              <div className="sidebar-user-name">{userDisplayName}</div>
              <div className="sidebar-user-role">{userRoleLabel}</div>
            </div>
          )}
        </div>
        <Nav className="flex-column sidebar-nav">
          {currentUser && (
            <>
              {renderNavItem('/dashboard', 'bi-speedometer2', <Translate textKey="dashboard" />)}
              {hasPermission('canCreateReceipts') && (
                renderNavItem('/new-receipt', 'bi-receipt', <Translate textKey="newReceipt" />)
              )}
              {hasPermission('canViewReceipts') && (
                renderNavItem('/receipts', 'bi-journal-text', <Translate textKey="receipts" />)
              )}
              {hasPermission('canViewAnalytics') && (
                renderNavItem('/sales-analytics', 'bi-bar-chart', <Translate textKey="salesAnalytics" fallback="Sales Analytics" />)
              )}
              {hasPermission('canViewStock') && (
                renderNavItem('/stock', 'bi-box-seam', <Translate textKey="inventory" />)
              )}
              {hasPermission('canViewEmployees') && (
                <>
                  {renderNavItem('/employees', 'bi-people', <Translate textKey="viewEmployees" />)}
                  {!isStaff && (
                    renderNavItem('/add-employee', 'bi-person-plus', <Translate textKey="addEmployee" />)
                  )}
                </>
              )}
              {hasPermission('canManageExpenses') && (
                <>
                  {renderNavItem('/expenses', 'bi-cash-coin', <Translate textKey="viewExpenses" fallback="View Expenses" />)}
                  {!isStaff && (
                    <>
                      {renderNavItem('/add-expense', 'bi-plus-circle', <Translate textKey="addExpense" fallback="Add Expense" />)}
                      {renderNavItem('/expense-categories', 'bi-tags', <Translate textKey="expenseCategories" fallback="Expense Categories" />)}
                    </>
                  )}
                </>
              )}
              {hasPermission('canMarkAttendance') && (
                <>
                  {renderNavItem('/attendance', 'bi-calendar-check', <Translate textKey="viewAttendance" />)}
                  {renderNavItem('/mark-attendance', 'bi-check2-square', <Translate textKey="markAttendance" />)}
                  {!isStaff && (
                    renderNavItem('/attendance-report', 'bi-clipboard-data', <Translate textKey="attendanceReport" />)
                  )}
                </>
              )}
              {!isStaff && !isGuest && (
                renderNavItem('/settings', 'bi-gear', <Translate textKey="settings" />)
              )}
              {!isStaff && !isGuest && (
                renderNavItem('/staff-management', 'bi-people-gear', 'Staff Management')
              )}
            </>
          )}
        </Nav>
        <div className="sidebar-footer">
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
      <div className="d-none d-lg-block" style={{ width: '280px' }} />
    </>
  );
};

export default MainNavbar;
