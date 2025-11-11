import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Stack, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import MainNavbar from '../components/Navbar';
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
        <Container className="pb-4">
          <div className="d-flex align-items-center mb-4">
            <div className="me-3">
              <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" style={{width: '60px', height: '60px'}}>
                <i className="bi bi-person-badge text-white fs-3"></i>
              </div>
            </div>
            <div>
              <h2 className="mb-1 fw-bold text-primary">Staff Dashboard</h2>
              <p className="text-muted mb-0">Welcome, {staffData.name || currentUser?.email}! Here's your workspace.</p>
            </div>
          </div>
          
          {shopData && (
            <Card className="mb-4 dashboard-card slide-in-up">
              <Card.Header className="d-flex align-items-center">
                <i className="bi bi-shop me-2"></i>
                <span>{shopData.shopName}</span>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-geo-alt text-primary me-2"></i>
                      <strong>Address:</strong>
                    </div>
                    <p className="ms-4 text-muted">{shopData.address}</p>
                  </Col>
                  <Col md={6}>
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-telephone text-primary me-2"></i>
                      <strong>Phone:</strong>
                    </div>
                    <p className="ms-4 text-muted">{shopData.phoneNumber}</p>
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
      <Container className="pb-4">
        <div className="d-flex align-items-center mb-4">
          <div className="me-3">
            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" style={{width: '60px', height: '60px'}}>
              <i className="bi bi-speedometer2 text-white fs-3"></i>
            </div>
          </div>
          <div>
            <h2 className="mb-1 fw-bold text-primary">Dashboard</h2>
            <p className="text-muted mb-0">Welcome back! Here's what's happening today.</p>
          </div>
        </div>
        
        {shopData && (
          <Card className="mb-4 dashboard-card slide-in-up">
            <Card.Header className="d-flex align-items-center">
              <i className="bi bi-shop me-2"></i>
              <span>{translatedShopData.shopName}</span>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-geo-alt text-primary me-2"></i>
                    <strong>Address:</strong>
                  </div>
                  <p className="ms-4 text-muted">{translatedShopData.address}</p>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-telephone text-primary me-2"></i>
                    <strong>Phone:</strong>
                  </div>
                  <p className="ms-4 text-muted">{translatedShopData.phoneNumber}</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}
        
        {/* Today's sales and profit summary */}
        <Card className="mb-4 dashboard-card slide-in-up">
          <Card.Header className="d-flex align-items-center">
            <i className="bi bi-graph-up me-2"></i>
            <span>Today's Summary</span>
          </Card.Header>
          <Card.Body>
            <Row className="g-4">
              {salesLoading ? (
                <Col xs={12} className="text-center py-4">
                  <div className="d-flex flex-column align-items-center">
                    <Spinner animation="border" size="lg" className="mb-3" />
                    <p className="text-muted">Loading sales data...</p>
                  </div>
                </Col>
              ) : todaySales ? (
                <>
                  <Col xs={6} md={3}>
                    <div className="text-center p-3 rounded-3 summary-box" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white'}}>
                      <i className="bi bi-currency-dollar fs-1 mb-2 d-block"></i>
                      <h6 className="mb-1 opacity-75">Sales</h6>
                      <h3 className="mb-0 fw-bold">{formatCurrency(todaySales.sales)}</h3>
                    </div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="text-center p-3 rounded-3 summary-box" style={{background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white'}}>
                      <i className="bi bi-trending-up fs-1 mb-2 d-block"></i>
                      <h6 className="mb-1 opacity-75">Profit</h6>
                      <h3 className="mb-0 fw-bold">{formatCurrency(todaySales.profit)}</h3>
                    </div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="text-center p-3 rounded-3 summary-box" style={{background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white'}}>
                      <i className="bi bi-receipt fs-1 mb-2 d-block"></i>
                      <h6 className="mb-1 opacity-75">Transactions</h6>
                      <h3 className="mb-0 fw-bold">{todaySales.transactionCount}</h3>
                    </div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="text-center p-3 rounded-3 summary-box" style={{background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white'}}>
                      <i className="bi bi-percent fs-1 mb-2 d-block"></i>
                      <h6 className="mb-1 opacity-75">Profit Margin</h6>
                      <h3 className="mb-0 fw-bold">
                        {todaySales.sales > 0 
                          ? `${((todaySales.profit / todaySales.sales) * 100).toFixed(2)}%` 
                          : '0%'}
                      </h3>
                      <small className="opacity-75">
                        {formatCurrency(todaySales.profit)} / {formatCurrency(todaySales.sales)}
                      </small>
                    </div>
                  </Col>
                </>
              ) : (
                <Col xs={12} className="text-center py-4">
                  <div className="d-flex flex-column align-items-center">
                    <i className="bi bi-graph-down text-muted fs-1 mb-3"></i>
                    <p className="text-muted">No sales data available for today.</p>
                  </div>
                </Col>
              )}
            </Row>
            <div className="text-center mt-2">
              <Button 
                variant="primary" 
                onClick={() => navigate('/sales-analytics')}
                size="sm"
              >
                View Detailed Analytics
              </Button>
            </div>
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
