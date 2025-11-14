import React, { useState } from 'react';
import { Navbar, Nav, Container, Button, Offcanvas } from 'react-bootstrap';
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

  const defaultGoogleIconStyle = {
    background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
    color: '#ffffff'
  };

  const googleIconPalette = {
    dashboard: {
      background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
      color: '#ffffff'
    },
    point_of_sale: {
      background: 'linear-gradient(135deg, #EA4335 0%, #FBBC05 100%)',
      color: '#ffffff'
    },
    receipt_long: {
      background: 'linear-gradient(135deg, #34A853 0%, #0F9D58 100%)',
      color: '#ffffff'
    },
    query_stats: {
      background: 'linear-gradient(135deg, #A142F4 0%, #4285F4 100%)',
      color: '#ffffff'
    },
    inventory_2: {
      background: 'linear-gradient(135deg, #F2994A 0%, #F2C94C 100%)',
      color: '#0b1f4e'
    },
    groups: {
      background: 'linear-gradient(135deg, #34A853 0%, #B8E986 100%)',
      color: '#0b1f4e'
    },
    group_add: {
      background: 'linear-gradient(135deg, #1B74E4 0%, #54C6FF 100%)',
      color: '#ffffff'
    },
    payments: {
      background: 'linear-gradient(135deg, #FBBC05 0%, #FEEA84 100%)',
      color: '#0b1f4e'
    },
    add_card: {
      background: 'linear-gradient(135deg, #EA4335 0%, #FF8A65 100%)',
      color: '#ffffff'
    },
    category: {
      background: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)',
      color: '#ffffff'
    },
    event_available: {
      background: 'linear-gradient(135deg, #34A853 0%, #0F9D58 100%)',
      color: '#ffffff'
    },
    how_to_reg: {
      background: 'linear-gradient(135deg, #0F9D58 0%, #4285F4 100%)',
      color: '#ffffff'
    },
    assignment: {
      background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
      color: '#ffffff'
    },
    settings: {
      background: 'linear-gradient(135deg, #5C6BC0 0%, #1A237E 100%)',
      color: '#ffffff'
    },
    admin_panel_settings: {
      background: 'linear-gradient(135deg, #F44336 0%, #E91E63 100%)',
      color: '#ffffff'
    }
  };

  const renderNavItem = (path, iconKey, label, closeSidebar = false) => {
    const iconStyle = googleIconPalette[iconKey] || defaultGoogleIconStyle;
    return (
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
      <span className="sidebar-icon" style={iconStyle}>
        <span className="material-icons-outlined google-icon">{iconKey}</span>
      </span>
      <span className="sidebar-text">{label}</span>
    </Nav.Link>
    );
  };

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
                {renderNavItem('/dashboard', 'dashboard', <Translate textKey="dashboard" />, true)}
                {hasPermission('canCreateReceipts') && (
                  renderNavItem('/new-receipt', 'point_of_sale', <Translate textKey="newReceipt" />, true)
                )}
                {hasPermission('canViewReceipts') && (
                  renderNavItem('/receipts', 'receipt_long', <Translate textKey="receipts" />, true)
                )}
                {hasPermission('canViewAnalytics') && (
                  renderNavItem('/sales-analytics', 'query_stats', <Translate textKey="salesAnalytics" fallback="Sales Analytics" />, true)
                )}
                {hasPermission('canViewStock') && (
                  renderNavItem('/stock', 'inventory_2', <Translate textKey="inventory" />, true)
                )}
                {hasPermission('canViewEmployees') && (
                  <>
                    {renderNavItem('/employees', 'groups', <Translate textKey="viewEmployees" />, true)}
                    {!isStaff && (
                      renderNavItem('/add-employee', 'group_add', <Translate textKey="addEmployee" />, true)
                    )}
                  </>
                )}
                {hasPermission('canManageExpenses') && (
                  <>
                    {renderNavItem('/expenses', 'payments', <Translate textKey="viewExpenses" fallback="View Expenses" />, true)}
                    {!isStaff && (
                      <>
                        {renderNavItem('/add-expense', 'add_card', <Translate textKey="addExpense" fallback="Add Expense" />, true)}
                        {renderNavItem('/expense-categories', 'category', <Translate textKey="expenseCategories" fallback="Expense Categories" />, true)}
                      </>
                    )}
                  </>
                )}
                {hasPermission('canMarkAttendance') && (
                  <>
                    {renderNavItem('/attendance', 'event_available', <Translate textKey="viewAttendance" />, true)}
                    {renderNavItem('/mark-attendance', 'how_to_reg', <Translate textKey="markAttendance" />, true)}
                    {!isStaff && (
                      renderNavItem('/attendance-report', 'assignment', <Translate textKey="attendanceReport" />, true)
                    )}
                  </>
                )}
                {!isStaff && !isGuest && (
                  renderNavItem('/settings', 'settings', <Translate textKey="settings" />, true)
                )}
                {!isStaff && !isGuest && (
                  renderNavItem('/staff-management', 'admin_panel_settings', 'Staff Management', true)
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
              {renderNavItem('/dashboard', 'dashboard', <Translate textKey="dashboard" />)}
              {hasPermission('canCreateReceipts') && (
                renderNavItem('/new-receipt', 'point_of_sale', <Translate textKey="newReceipt" />)
              )}
              {hasPermission('canViewReceipts') && (
                renderNavItem('/receipts', 'receipt_long', <Translate textKey="receipts" />)
              )}
              {hasPermission('canViewAnalytics') && (
                renderNavItem('/sales-analytics', 'query_stats', <Translate textKey="salesAnalytics" fallback="Sales Analytics" />)
              )}
              {hasPermission('canViewStock') && (
                renderNavItem('/stock', 'inventory_2', <Translate textKey="inventory" />)
              )}
              {hasPermission('canViewEmployees') && (
                <>
                  {renderNavItem('/employees', 'groups', <Translate textKey="viewEmployees" />)}
                  {!isStaff && (
                    renderNavItem('/add-employee', 'group_add', <Translate textKey="addEmployee" />)
                  )}
                </>
              )}
              {hasPermission('canManageExpenses') && (
                <>
                  {renderNavItem('/expenses', 'payments', <Translate textKey="viewExpenses" fallback="View Expenses" />)}
                  {!isStaff && (
                    <>
                      {renderNavItem('/add-expense', 'add_card', <Translate textKey="addExpense" fallback="Add Expense" />)}
                      {renderNavItem('/expense-categories', 'category', <Translate textKey="expenseCategories" fallback="Expense Categories" />)}
                    </>
                  )}
                </>
              )}
              {hasPermission('canMarkAttendance') && (
                <>
                  {renderNavItem('/attendance', 'event_available', <Translate textKey="viewAttendance" />)}
                  {renderNavItem('/mark-attendance', 'how_to_reg', <Translate textKey="markAttendance" />)}
                  {!isStaff && (
                    renderNavItem('/attendance-report', 'assignment', <Translate textKey="attendanceReport" />)
                  )}
                </>
              )}
              {!isStaff && !isGuest && (
                renderNavItem('/settings', 'settings', <Translate textKey="settings" />)
              )}
              {!isStaff && !isGuest && (
                renderNavItem('/staff-management', 'admin_panel_settings', 'Staff Management')
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
