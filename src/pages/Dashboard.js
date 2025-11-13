import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Stack, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import MainNavbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import { Translate } from '../utils';
import { formatCurrency } from '../utils/receiptUtils';
import { getDailySalesAndProfit } from '../utils/salesUtils';

const Dashboard = () => {
  const { currentUser, shopData, isStaff, staffData } = useAuth();
  const [receiptCount, setReceiptCount] = useState(0);
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState({ present: 0, absent: 0, total: 0 });
  const [todaySales, setTodaySales] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const navigate = useNavigate();

  // Use data directly for now
  const translatedShopData = shopData;
  const translatedReceipts = recentReceipts;
  const translatedAttendance = todayAttendance;
  const staffPermissionCount = staffData?.permissions
    ? Object.values(staffData.permissions).filter(Boolean).length
    : 0;

  // Fetch daily sales and profit data
  useEffect(() => {
    if (!currentUser) return;

    setSalesLoading(true);
    
    // Adding error handling and more informative console messages
    getDailySalesAndProfit(currentUser.uid)
      .then(data => {
        setTodaySales(data);
      })
      .catch(error => {
        // Log error but don't show to user to avoid cluttering the UI
        console.error("Error fetching daily sales data:", error.message || error);
      })
      .finally(() => {
        setSalesLoading(false);
      });
  }, [currentUser]);

  useEffect(() => {
    // Convert to non-async function
    const fetchDashboardData = () => {
      if (!currentUser) return;

      try {
        // Create a simple query without ordering
        const receiptRef = collection(db, 'receipts');
        const receiptQuery = query(
          receiptRef,
          where("shopId", "==", currentUser.uid)
        );
        
        getDocs(receiptQuery)
          .then(receiptSnapshot => {
            // Set the count
            setReceiptCount(receiptSnapshot.size);
            
            // Get all receipts and sort them client-side
            const receipts = receiptSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Sort receipts by timestamp
            receipts.sort((a, b) => {
              return new Date(b.timestamp) - new Date(a.timestamp);
            });
            
            // Get just the first 5
            setRecentReceipts(receipts.slice(0, 5));
          })
          .catch(error => {
            console.error("Error fetching dashboard data:", error);
          });

        // Fetch employee count
        const employeesRef = collection(db, 'employees');
        const employeesQuery = query(
          employeesRef,
          where("shopId", "==", currentUser.uid)
        );
        
        getDocs(employeesQuery)
          .then(employeeSnapshot => {
            setEmployeeCount(employeeSnapshot.size);
            
            // Fetch today's attendance
            const today = new Date().toISOString().split('T')[0];
            const attendanceRef = collection(db, 'attendance');
            const attendanceQuery = query(
              attendanceRef,
              where("shopId", "==", currentUser.uid),
              where("date", "==", today)
            );
            
            return getDocs(attendanceQuery);
          })
          .then(attendanceSnapshot => {
            const attendanceRecords = attendanceSnapshot.docs.map(doc => ({
              ...doc.data()
            }));
            
            const presentCount = attendanceRecords.filter(record => 
              record.status === 'present' || record.status === 'half-day'
            ).length;
            
            const absentCount = attendanceRecords.filter(record => 
              record.status === 'absent' || record.status === 'leave'
            ).length;
            
            setTodayAttendance({
              present: presentCount,
              absent: absentCount,
              total: attendanceRecords.length
            });
          })
          .catch(error => {
            console.error("Error fetching employee data:", error);
          })
          .finally(() => {
            setLoading(false);
          });
      } catch (error) {
        console.error("Error setting up queries:", error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  // Show staff-specific dashboard if user is staff
  if (isStaff && staffData) {
    return (
      <>
        <MainNavbar />
        <Container className="pos-content">
          <PageHeader
            title="Staff Dashboard"
            icon="bi-person-badge"
            subtitle={`Welcome back ${staffData.name || currentUser?.email || ''}. Here's a snapshot of your access.`}
          >
            <div className="hero-metrics__item">
              <span className="hero-metrics__label">Shop</span>
              <span className="hero-metrics__value">{shopData?.shopName || '—'}</span>
            </div>
            <div className="hero-metrics__item">
              <span className="hero-metrics__label">Permissions</span>
              <span className="hero-metrics__value">{staffPermissionCount}</span>
            </div>
            <div className="hero-metrics__item">
              <span className="hero-metrics__label">Role</span>
              <span className="hero-metrics__value">{staffData.role || 'Team Member'}</span>
            </div>
            <div className="hero-metrics__item">
              <span className="hero-metrics__label">Attendance</span>
              <span className="hero-metrics__value">
                {translatedAttendance.present}/{translatedAttendance.total}
              </span>
            </div>
          </PageHeader>
          <div className="page-header-actions">
            {staffData.permissions?.canCreateReceipts && (
              <Button variant="primary" onClick={() => navigate('/new-receipt')}>
                <i className="bi bi-plus-lg me-1"></i>
                <Translate textKey="newReceipt" />
              </Button>
            )}
            {staffData.permissions?.canViewReceipts && (
              <Button variant="outline-primary" onClick={() => navigate('/receipts')}>
                <Translate textKey="receipts" />
              </Button>
            )}
          </div>
          
          {shopData && (
            <Card className="pos-card dashboard-section slide-in-up">
              <Card.Body>
                <div className="pos-card__header">
                  <div>
                    <h5 className="mb-1 d-flex align-items-center gap-2">
                      <i className="bi bi-shop text-primary"></i>
                      {shopData.shopName}
                    </h5>
                    <p className="text-muted mb-0">Store overview for your reference.</p>
                  </div>
                  <span className="pos-badge">Shop Info</span>
                </div>
                <Row className="g-4">
                  <Col md={4}>
                    <div className="d-flex flex-column">
                      <span className="text-uppercase text-muted fw-semibold small">Address</span>
                      <span className="fw-semibold text-primary mt-1">{shopData.address || 'Not provided'}</span>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="d-flex flex-column">
                      <span className="text-uppercase text-muted fw-semibold small">Phone</span>
                      <span className="fw-semibold text-primary mt-1">
                        {Array.isArray(shopData.phoneNumbers) && shopData.phoneNumbers.length > 0
                          ? shopData.phoneNumbers.join(', ')
                          : shopData.phoneNumber || '-'}
                      </span>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="d-flex flex-column">
                      <span className="text-uppercase text-muted fw-semibold small">Reporting To</span>
                      <span className="fw-semibold text-primary mt-1">{shopData.ownerName || shopData.shopName}</span>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
          
          <Row className="g-4">
            <Col xs={12} md={6} lg={4}>
              <Card className="h-100 dashboard-card slide-in-up">
                <Card.Header className="d-flex align-items-center">
                  <i className="bi bi-receipt me-2"></i>
                  <span>New Receipt</span>
                </Card.Header>
                <Card.Body className="d-flex flex-column">
                  <div className="text-center mb-4">
                    <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '80px', height: '80px'}}>
                      <i className="bi bi-receipt text-primary fs-1"></i>
                    </div>
                    <h6 className="text-muted mb-3">
                      Create new receipts for customers
                    </h6>
                  </div>
                  <div className="mt-auto">
                    <Button 
                      variant="primary" 
                      onClick={() => navigate('/new-receipt')}
                      className="w-100"
                    >
                      <i className="bi bi-plus me-1"></i>
                      Create Receipt
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            {staffData.permissions?.canViewReceipts && (
              <Col xs={12} md={6} lg={4}>
                <Card className="h-100 dashboard-card slide-in-up">
                  <Card.Header className="d-flex align-items-center">
                    <i className="bi bi-list-ul me-2"></i>
                    <span>View Receipts</span>
                  </Card.Header>
                  <Card.Body className="d-flex flex-column">
                    <div className="text-center mb-4">
                      <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '80px', height: '80px'}}>
                        <i className="bi bi-list-ul text-success fs-1"></i>
                      </div>
                      <h6 className="text-muted mb-3">
                        View and manage existing receipts
                      </h6>
                    </div>
                    <div className="mt-auto">
                      <Button 
                        variant="success" 
                        onClick={() => navigate('/receipts')}
                        className="w-100"
                      >
                        <i className="bi bi-eye me-1"></i>
                        View Receipts
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )}
            
            {staffData.permissions?.canMarkAttendance && (
              <Col xs={12} md={6} lg={4}>
                <Card className="h-100 dashboard-card slide-in-up">
                  <Card.Header className="d-flex align-items-center">
                    <i className="bi bi-calendar-check me-2"></i>
                    <span>Mark Attendance</span>
                  </Card.Header>
                  <Card.Body className="d-flex flex-column">
                    <div className="text-center mb-4">
                      <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '80px', height: '80px'}}>
                        <i className="bi bi-calendar-check text-warning fs-1"></i>
                      </div>
                      <h6 className="text-muted mb-3">
                        Mark employee attendance
                      </h6>
                    </div>
                    <div className="mt-auto">
                      <Button 
                        variant="warning" 
                        onClick={() => navigate('/mark-attendance')}
                        className="w-100"
                      >
                        <i className="bi bi-check-circle me-1"></i>
                        Mark Attendance
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        </Container>
      </>
    );
  }

  return (
    <>
      <MainNavbar />
      <Container className="pos-content">
        <PageHeader
          title="Store Dashboard"
          icon="bi-speedometer2"
          subtitle={`Real-time monitoring and control for ${translatedShopData?.shopName || 'your store'}.`}
        >
          <div className="hero-metrics__item">
            <span className="hero-metrics__label">Today's Sales</span>
            <span className="hero-metrics__value">
              {salesLoading ? '—' : todaySales ? formatCurrency(todaySales.sales) : formatCurrency(0)}
            </span>
          </div>
          <div className="hero-metrics__item">
            <span className="hero-metrics__label">Receipts</span>
            <span className="hero-metrics__value">{receiptCount}</span>
          </div>
          <div className="hero-metrics__item">
            <span className="hero-metrics__label">Team</span>
            <span className="hero-metrics__value">{employeeCount}</span>
          </div>
          <div className="hero-metrics__item">
            <span className="hero-metrics__label">Attendance</span>
            <span className="hero-metrics__value">
              {translatedAttendance.present}/{translatedAttendance.total}
            </span>
          </div>
        </PageHeader>

        <div className="dashboard-stats-grid">
          <div className="dashboard-stat-card">
            <div className="stat-chip">
              <i className="bi bi-cash-stack"></i>
              Today
            </div>
            <div className="dashboard-stat-card__label">Total Revenue</div>
            <div className="dashboard-stat-card__value">
              {salesLoading ? 'Loading…' : todaySales ? formatCurrency(todaySales.sales) : formatCurrency(0)}
            </div>
            <div className="dashboard-stat-card__trend">
              <i className="bi bi-arrow-up-right"></i> Daily snapshot
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="stat-chip">
              <i className="bi bi-receipt"></i>
              Receipts
            </div>
            <div className="dashboard-stat-card__label">Total Receipts</div>
            <div className="dashboard-stat-card__value">{receiptCount}</div>
            <div className="dashboard-stat-card__trend">
              <i className="bi bi-clock-history"></i> Last 24 hours
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="stat-chip">
              <i className="bi bi-people"></i>
              Workforce
            </div>
            <div className="dashboard-stat-card__label">Active Employees</div>
            <div className="dashboard-stat-card__value">{employeeCount}</div>
            <div className="dashboard-stat-card__trend">
              <i className="bi bi-person-check"></i> {translatedAttendance.present} present
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="stat-chip">
              <i className="bi bi-graph-up"></i>
              Profit
            </div>
            <div className="dashboard-stat-card__label">Today's Profit</div>
            <div className="dashboard-stat-card__value">
              {salesLoading ? 'Loading…' : todaySales ? formatCurrency(todaySales.profit) : formatCurrency(0)}
            </div>
            <div className="dashboard-stat-card__trend">
              {todaySales && todaySales.sales > 0 ? (
                <>
                  <i className="bi bi-activity"></i>{' '}
                  {((todaySales.profit / todaySales.sales) * 100).toFixed(1)}% margin
                </>
              ) : (
                <span className="dashboard-stat-card__trend danger">
                  <i className="bi bi-exclamation-circle"></i> Awaiting sales
                </span>
              )}
            </div>
          </div>
        </div>

        {shopData && (
          <Card className="pos-card dashboard-section slide-in-up">
            <Card.Body>
              <div className="pos-card__header">
                <div>
                  <h5 className="mb-1 d-flex align-items-center gap-2">
                    <i className="bi bi-shop text-primary"></i>
                    {translatedShopData.shopName}
                  </h5>
                  <p className="text-muted mb-0">Centralized overview for your store profile.</p>
                </div>
                <span className="pos-badge">Store Overview</span>
              </div>
              <Row className="g-4">
                <Col md={4}>
                  <div className="d-flex flex-column">
                    <span className="text-uppercase text-muted fw-semibold small">Address</span>
                    <span className="fw-semibold text-primary mt-1">{translatedShopData.address || 'Not set'}</span>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="d-flex flex-column">
                    <span className="text-uppercase text-muted fw-semibold small">Phone</span>
                    <span className="fw-semibold text-primary mt-1">{translatedShopData.phoneNumber || '-'}</span>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="d-flex flex-column">
                    <span className="text-uppercase text-muted fw-semibold small">Owner</span>
                    <span className="fw-semibold text-primary mt-1">{currentUser?.email}</span>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        <Card className="pos-card dashboard-section slide-in-up">
          <Card.Body>
            <div className="pos-card__header">
              <div>
                <h5 className="mb-1 d-flex align-items-center gap-2">
                  <i className="bi bi-graph-up-arrow text-primary"></i>
                  Today's Performance
                </h5>
                <p className="text-muted mb-0">Sales, profit and activity for the current day.</p>
              </div>
              <Button variant="primary" size="sm" onClick={() => navigate('/sales-analytics')}>
                View Analytics
              </Button>
            </div>
            {salesLoading ? (
              <div className="text-center py-4">
                <Spinner animation="border" />
                <p className="text-muted mt-3 mb-0">Loading sales data...</p>
              </div>
            ) : todaySales ? (
              <Row className="g-3">
                <Col xs={12} md={3}>
                  <div className="dashboard-stat-card">
                    <div className="dashboard-stat-card__label">Sales</div>
                    <div className="dashboard-stat-card__value">{formatCurrency(todaySales.sales)}</div>
                    <div className="dashboard-stat-card__trend">
                      <i className="bi bi-receipt"></i> {todaySales.transactionCount} transactions
                    </div>
                  </div>
                </Col>
                <Col xs={12} md={3}>
                  <div className="dashboard-stat-card">
                    <div className="dashboard-stat-card__label">Profit</div>
                    <div className="dashboard-stat-card__value">{formatCurrency(todaySales.profit)}</div>
                    <div className="dashboard-stat-card__trend">
                      <i className="bi bi-graph-up"></i>{' '}
                      {todaySales.sales > 0
                        ? `${((todaySales.profit / todaySales.sales) * 100).toFixed(1)}% margin`
                        : 'No sales yet'}
                    </div>
                  </div>
                </Col>
                <Col xs={12} md={3}>
                  <div className="dashboard-stat-card">
                    <div className="dashboard-stat-card__label">Average Ticket</div>
                    <div className="dashboard-stat-card__value">
                      {todaySales.transactionCount > 0
                        ? formatCurrency(todaySales.sales / todaySales.transactionCount)
                        : formatCurrency(0)}
                    </div>
                    <div className="dashboard-stat-card__trend">
                      <i className="bi bi-basket3"></i> Per receipt
                    </div>
                  </div>
                </Col>
                <Col xs={12} md={3}>
                  <div className="dashboard-stat-card">
                    <div className="dashboard-stat-card__label">Attendance</div>
                    <div className="dashboard-stat-card__value">
                      {translatedAttendance.present}/{translatedAttendance.total}
                    </div>
                    <div className="dashboard-stat-card__trend">
                      <i className="bi bi-people"></i> On duty today
                    </div>
                  </div>
                </Col>
              </Row>
            ) : (
              <div className="text-center py-4">
                <i className="bi bi-graph-down text-muted fs-1"></i>
                <p className="text-muted mt-3 mb-0">No sales recorded for today yet.</p>
              </div>
            )}
          </Card.Body>
        </Card>

        <Row className="g-4">
          <Col xs={12} md={6} lg={4}>
            <Card className="h-100 dashboard-card slide-in-up">
              <Card.Header className="d-flex align-items-center">
                <i className="bi bi-receipt me-2"></i>
                <span>Receipts</span>
              </Card.Header>
              <Card.Body className="d-flex flex-column">
                <div className="text-center mb-4">
                  <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '80px', height: '80px'}}>
                    <i className="bi bi-receipt text-primary fs-1"></i>
                  </div>
                  <h2 className="text-primary fw-bold mb-2">{receiptCount}</h2>
                  <p className="text-muted mb-0">
                    Total receipts generated
                  </p>
                </div>
                <div className="mt-auto">
                  <Stack direction="horizontal" gap={2} className="d-flex flex-wrap">
                    <Button 
                      variant="primary" 
                      onClick={() => navigate('/receipts')}
                      className="flex-grow-1"
                    >
                      <i className="bi bi-eye me-1"></i>
                      View
                    </Button>
                    <Button 
                      variant="success" 
                      onClick={() => navigate('/new-receipt')}
                      className="flex-grow-1"
                    >
                      <i className="bi bi-plus me-1"></i>
                      Add
                    </Button>
                  </Stack>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col xs={12} md={6} lg={4}>
            <Card className="h-100 dashboard-card slide-in-up">
              <Card.Header className="d-flex align-items-center">
                <i className="bi bi-people me-2"></i>
                <span>Employees</span>
              </Card.Header>
              <Card.Body className="d-flex flex-column">
                <div className="text-center mb-4">
                  <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '80px', height: '80px'}}>
                    <i className="bi bi-people text-success fs-1"></i>
                  </div>
                  <h2 className="text-success fw-bold mb-2">{employeeCount}</h2>
                  <p className="text-muted mb-0">
                    Total employees
                  </p>
                  
                  {todayAttendance.total > 0 && (
                    <div className="mt-3 p-3 bg-light rounded-3">
                      <h6 className="text-primary mb-2"><i className="bi bi-calendar-check me-1"></i>Today's Attendance</h6>
                      <div className="row text-center">
                        <div className="col-6">
                          <div className="text-success fw-bold fs-5">{translatedAttendance.present}</div>
                          <small className="text-muted">Present</small>
                        </div>
                        <div className="col-6">
                          <div className="text-danger fw-bold fs-5">{translatedAttendance.absent}</div>
                          <small className="text-muted">Absent</small>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-auto">
                  <Stack direction="horizontal" gap={2} className="d-flex flex-wrap">
                    <Button 
                      variant="primary" 
                      onClick={() => navigate('/employees')}
                      className="flex-grow-1"
                    >
                      <i className="bi bi-eye me-1"></i>
                      View Employees
                    </Button>
                    <Button 
                      variant="success" 
                      onClick={() => navigate('/mark-attendance')}
                      className="flex-grow-1"
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      Mark Attendance
                    </Button>
                  </Stack>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          {/* New Salary Management Card */}
          <Col xs={12} md={6} lg={4}>
            <Card className="h-100 dashboard-card slide-in-up">
              <Card.Header className="d-flex align-items-center">
                <i className="bi bi-cash-coin me-2"></i>
                <span>Salary Management</span>
              </Card.Header>
              <Card.Body className="d-flex flex-column">
                <div className="text-center mb-4">
                  <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '80px', height: '80px'}}>
                    <i className="bi bi-cash-coin text-warning fs-1"></i>
                  </div>
                  <h6 className="text-muted mb-3">
                    Manage employee salary payments and generate detailed reports.
                  </h6>
                </div>
                <div className="mt-auto">
                  <Stack direction="horizontal" gap={2} className="d-flex flex-wrap">
                    <Button 
                      variant="primary" 
                      onClick={() => navigate('/salary-management')}
                      className="flex-grow-1"
                    >
                      <i className="bi bi-gear me-1"></i>
                      Manage Salaries
                    </Button>
                    <Button 
                      variant="success" 
                      onClick={() => navigate('/add-salary-payment')}
                      className="flex-grow-1"
                    >
                      <i className="bi bi-plus me-1"></i>
                      Add Payment
                    </Button>
                  </Stack>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          {/* Expense Management Card */}
          <Col xs={12} md={6} lg={4}>
            <Card className="h-100 dashboard-card slide-in-up">
              <Card.Header className="d-flex align-items-center">
                <i className="bi bi-graph-down me-2"></i>
                <span>Expense Management</span>
              </Card.Header>
              <Card.Body className="d-flex flex-column">
                <div className="text-center mb-4">
                  <div className="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '80px', height: '80px'}}>
                    <i className="bi bi-graph-down text-info fs-1"></i>
                  </div>
                  <h6 className="text-muted mb-3">
                    Track and manage business expenses, categorize spending, and monitor trends.
                  </h6>
                </div>
                <div className="mt-auto">
                  <Stack direction="horizontal" gap={2} className="d-flex flex-wrap">
                    <Button 
                      variant="primary" 
                      onClick={() => navigate('/expenses')}
                      className="flex-grow-1"
                    >
                      <i className="bi bi-eye me-1"></i>
                      View Expenses
                    </Button>
                    <Button 
                      variant="success" 
                      onClick={() => navigate('/add-expense')}
                      className="flex-grow-1"
                    >
                      <i className="bi bi-plus me-1"></i>
                      Add Expense
                    </Button>
                  </Stack>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col xs={12} md={6} lg={4}>
            <Card className="h-100 dashboard-card slide-in-up">
              <Card.Header className="d-flex align-items-center">
                <i className="bi bi-graph-up me-2"></i>
                <span>Sales & Profit</span>
              </Card.Header>
              <Card.Body className="d-flex flex-column">
                <div className="text-center mb-4">
                  <div className="bg-danger bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '80px', height: '80px'}}>
                    <i className="bi bi-graph-up text-danger fs-1"></i>
                  </div>
                  <h6 className="text-muted mb-3">
                    View detailed sales and profit analytics on daily, monthly and yearly basis.
                  </h6>
                </div>
                <div className="mt-auto">
                  <Button 
                    variant="primary" 
                    onClick={() => navigate('/sales-analytics')}
                    className="w-100"
                  >
                    <i className="bi bi-bar-chart me-1"></i>
                    View Analytics
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col xs={12} lg={4}>
            <Card className="h-100 dashboard-card slide-in-up">
              <Card.Header className="d-flex align-items-center">
                <i className="bi bi-clock-history me-2"></i>
                <span>Recent Receipts</span>
              </Card.Header>
              <Card.Body>
                {recentReceipts.length > 0 ? (
                  <div className="table-responsive small-table">
                    <table className="table table-sm table-hover">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Receipt ID</th>
                          <th>Total</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {translatedReceipts.map(receipt => (
                          <tr key={receipt.id}>
                            <td>{new Date(receipt.timestamp).toLocaleDateString()}</td>
                            <td className="text-truncate" style={{maxWidth: "80px"}}>{receipt.id.substring(0, 8)}</td>
                            <td>RS{receipt.totalAmount}</td>
                            <td>
                              <Button 
                                size="sm" 
                                variant="outline-primary"
                                onClick={() => navigate(`/receipt/${receipt.id}`)}
                              >
                                <Translate textKey="view" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center mt-4">
                    {loading ? "Loading..." : "No receipts yet. Start creating receipts!"}
                  </p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <style jsx="true">{`
        @media (max-width: 576px) {
          .table-responsive.small-table {
            font-size: 0.875rem;
          }
          .table-responsive.small-table td, 
          .table-responsive.small-table th {
            padding: 0.3rem;
          }
        }
        .summary-box { height: 180px; display: flex; flex-direction: column; justify-content: center; }
      `}</style>
    </>
  );
};

export default Dashboard;
