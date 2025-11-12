import React, { useState, useEffect, useCallback } from 'react';
import { Container, Table, Button, Card, Form, InputGroup, Row, Col, Badge, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MainNavbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import { getShopStock, deleteStockItem } from '../utils/stockUtils';
import './ViewStock.css'; // Import the custom CSS
import { Translate, useTranslatedAttribute } from '../utils';
import JsBarcode from 'jsbarcode';

const ViewStock = () => {
  const { currentUser, activeShopId } = useAuth();
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [itemToPrintBarcode, setItemToPrintBarcode] = useState(null);
  const [printBarcodeData, setPrintBarcodeData] = useState(null);
  const navigate = useNavigate();
  
  // Get translations for attributes
  const getTranslatedAttr = useTranslatedAttribute();

  const fetchStock = useCallback(() => {
    if (!currentUser || !activeShopId) return;
    
    setLoading(true);
    
    // Create a simple function to fetch stock items
    getShopStock(activeShopId)
      .then(stockData => {
        console.log('Stock data fetched:', stockData);
        setStockItems(stockData);
      })
      .catch(error => {
        console.error('Error fetching stock items:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentUser, activeShopId]);

  useEffect(() => {
    // Redirect to login if user is not authenticated
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    fetchStock();
  }, [fetchStock, currentUser, navigate]);

  // Get unique categories for filter dropdown
  const categories = [...new Set(stockItems.map(item => item.category))].filter(Boolean);

  // Handle search and filtering
  const filteredItems = stockItems
    .filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // Handle client-side sorting
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'price') {
        comparison = parseFloat(a.price) - parseFloat(b.price);
      } else if (sortField === 'quantity') {
        comparison = parseFloat(a.quantity) - parseFloat(b.quantity);
      } else if (sortField === 'updatedAt') {
        comparison = new Date(a.updatedAt) - new Date(b.updatedAt);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Handle sorting
  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Open delete confirmation modal
  const confirmDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  // Delete stock item
  const handleDelete = () => {
    if (!itemToDelete) return;
    
    deleteStockItem(itemToDelete.id)
      .then(() => {
        fetchStock(); // Refresh the list
        setShowDeleteModal(false);
        setItemToDelete(null);
      })
      .catch(error => {
        console.error('Error deleting stock item:', error);
      });
  };

  // Open barcode print modal
  const printBarcode = (item) => {
    setItemToPrintBarcode(item);
    setShowBarcodeModal(true);
  };

  // Generate barcode image using jsbarcode
  const generateBarcodeImage = (barcodeValue) => {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, barcodeValue, {
        format: "CODE128",
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 16,
        margin: 10
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generating barcode:', error);
      return null;
    }
  };

  // Print barcode - use reliable popup method for cross-browser consistency
  const handlePrintBarcode = () => {
    // Defer to the popup approach which renders in a new document
    setShowBarcodeModal(false);
    setTimeout(() => {
      handlePrintBarcodePopup();
    }, 50);
  };

  // Popup method - generates barcode in new window
  const handlePrintBarcodePopup = () => {
    if (!itemToPrintBarcode) return;
    
    try {
      const printWindow = window.open('', '_blank', 'width=500,height=400,scrollbars=yes,resizable=yes');
      
      if (!printWindow) {
        alert('Please allow popups for this site to print barcodes.');
        return;
      }
      
      const barcodeNumber = itemToPrintBarcode.barcode || itemToPrintBarcode.sku || itemToPrintBarcode.id;
      const barcodeImage = generateBarcodeImage(barcodeNumber);
      
      if (!barcodeImage) {
        alert('Error generating barcode. Please try again.');
        printWindow.close();
        return;
      }
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Barcode - ${itemToPrintBarcode.name}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px; 
                margin: 0;
                background: white;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
              }
              .barcode-container {
                border: none;
                padding: 20px;
                margin: 20px auto;
                max-width: 400px;
                background: white;
                box-shadow: none;
              }
              .barcode { 
                width: 100%;
                max-width: 350px;
                height: auto;
                margin: 15px 0;
                display: block;
              }
              .print-info {
                font-size: 10px;
                color: #888;
                margin-top: 15px;
              }
              @media print { 
                body { 
                  padding: 10px; 
                  min-height: auto;
                }
                .print-info {
                  display: none;
                }
                .barcode-container {
                  box-shadow: none;
                  border: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="barcode-container">
              <img src="${barcodeImage}" alt="Barcode" class="barcode" />
            </div>
            <div class="print-info">Press Ctrl+P to print this barcode</div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for image to load before printing
      setTimeout(() => {
        try {
          printWindow.print();
          setTimeout(() => {
            if (!printWindow.closed) {
              printWindow.close();
            }
          }, 1000);
        } catch (printError) {
          console.error('Error printing:', printError);
        }
      }, 500);
      
    } catch (error) {
      console.error('Error opening print window:', error);
      alert('Error generating print window. Please try again.');
    } finally {
      setShowBarcodeModal(false);
      setItemToPrintBarcode(null);
    }
  };

  // Determine badge color based on quantity
  const getQuantityBadgeVariant = (quantity) => {
    if (quantity <= 0) return 'danger';
    if (quantity <= 10) return 'warning';
    return 'success';
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * { visibility: hidden !important; }
            #printable-wrapper, #printable-wrapper * {
              visibility: visible;
            }
            #printable-wrapper {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            #printable-barcode {
              position: static;
              width: auto;
              margin: 0 auto;
            }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `
      }} />
      
      <MainNavbar />
      <Container>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <PageHeader title="Stock Inventory" icon="bi-box-seam" color="primary" />
          <Button 
            variant="success" 
            onClick={() => navigate('/add-stock')}
          >
            <Translate textKey="addNewItem" />
          </Button>
        </div>
        
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={6} lg={4}>
                <Form.Group className="mb-3">
                  <Form.Label><Translate textKey="searchItems" /></Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder={getTranslatedAttr("searchItemsPlaceholder")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => setSearchTerm('')}
                      >
                        <Translate textKey="clear" />
                      </Button>
                    )}
                  </InputGroup>
                </Form.Group>
              </Col>
              
              <Col md={6} lg={4}>
                <Form.Group className="mb-3">
                  <Form.Label><Translate textKey="filterByCategory" /></Form.Label>
                  <Form.Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value=""><Translate textKey="allCategories" /></option>
                    {categories.map((category, index) => (
                      <option key={index} value={category}>
                        {category}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        {loading ? (
          <p className="text-center"><Translate textKey="loadingStockItems" /></p>
        ) : (
          <Card>
            <Card.Body>
              {filteredItems.length > 0 ? (
                <div className="table-responsive stock-table-container">
                  <Table hover responsive="sm" className="stock-table">
                    <thead>
                      <tr>
                        <th 
                          className="cursor-pointer" 
                          onClick={() => handleSort('name')}
                        >
                          <Translate textKey="itemName" />
                          {sortField === 'name' && (
                            <span>{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                          )}
                        </th>
                        <th className="description-column"><Translate textKey="description" /></th>
                        <th><Translate textKey="category" /></th>
                        <th 
                          className="cursor-pointer"
                          onClick={() => handleSort('price')}
                        >
                          <Translate textKey="price" /> (RS)
                          {sortField === 'price' && (
                            <span>{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                          )}
                        </th>
                        <th 
                          className="cursor-pointer"
                          onClick={() => handleSort('quantity')}
                        >
                          <Translate textKey="quantity" />
                          {sortField === 'quantity' && (
                            <span>{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                          )}
                        </th>
                        <th 
                          className="cursor-pointer"
                          onClick={() => handleSort('updatedAt')}
                        >
                          <Translate textKey="lastUpdated" />
                          {sortField === 'updatedAt' && (
                            <span>{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                          )}
                        </th>
                        <th><Translate textKey="actions" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map(item => (
                        <tr key={item.id}>
                          <td data-label={getTranslatedAttr("itemName")} className="text-nowrap">{item.name}</td>
                          <td data-label={getTranslatedAttr("description")} className="description-column">
                            <div className="description-cell-content">
                              {item.description || '-'}
                            </div>
                          </td>
                          <td data-label={getTranslatedAttr("category")}>{item.category || '-'}</td>
                          <td data-label={getTranslatedAttr("price")}>RS{parseFloat(item.price).toFixed(2)}</td>
                          <td data-label={getTranslatedAttr("quantity")}>
                            <Badge bg={getQuantityBadgeVariant(item.quantity)}>
                              {item.quantity} {item.quantityUnit === 'kg' ? 'KG' : 'Units'}
                            </Badge>
                          </td>
                          <td data-label={getTranslatedAttr("lastUpdated")}>{new Date(item.updatedAt).toLocaleDateString()}</td>
                          <td data-label={getTranslatedAttr("actions")}>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => navigate(`/edit-stock/${item.id}`)}
                              className="me-1 mb-1"
                            >
                              <Translate textKey="edit" />
                            </Button>
                            <Button 
                              variant="outline-secondary" 
                              size="sm"
                              onClick={() => printBarcode(item)}
                              className="me-1 mb-1"
                            >
                              Print Barcode
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => confirmDelete(item)}
                              className="mb-1"
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
                <p className="text-center">
                  {stockItems.length > 0 
                    ? <Translate textKey="noItemsMatch" />
                    : <Translate textKey="noItemsFound" />}
                </p>
              )}
            </Card.Body>
          </Card>
        )}
        
        {/* Delete Confirmation Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title><Translate textKey="confirmDelete" /></Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p><Translate textKey="deleteItemConfirmation" /></p>
            {itemToDelete && <p><strong>{itemToDelete.name}</strong></p>}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              <Translate textKey="cancel" />
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Translate textKey="delete" />
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Barcode Print Modal */}
        <Modal show={showBarcodeModal} onHide={() => setShowBarcodeModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Print Barcode</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Ready to print barcode for:</p>
            {itemToPrintBarcode && (
              <div>
                <p><strong>{itemToPrintBarcode.name}</strong></p>
                <p>Price: RS{parseFloat(itemToPrintBarcode.price).toFixed(2)}</p>
                <p>Barcode: {itemToPrintBarcode.barcode || itemToPrintBarcode.sku || itemToPrintBarcode.id}</p>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowBarcodeModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handlePrintBarcode}>
                    Print Barcode
                  </Button>
                  <Button variant="outline-primary" onClick={handlePrintBarcodePopup}>
                    Print (Popup)
                  </Button>
          </Modal.Footer>
        </Modal>
      </Container>
      
      {/* Hidden printable barcode area (screen-hidden, print-visible) */}
      {printBarcodeData && (
        <div id="printable-wrapper" style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
          <div id="printable-barcode">
            <div style={{
              fontFamily: 'Courier New, monospace',
              textAlign: 'center',
              padding: '20px',
              margin: '0',
              background: 'white',
              width: '300px',
              border: 'none',
              padding: '15px'
            }}>
              <div style={{
                fontSize: '14px',
                lineHeight: '1.2',
                margin: '15px 0',
                letterSpacing: '2px',
                fontWeight: 'bold'
              }}>
                {printBarcodeData.barcode}
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                marginTop: '12px',
                letterSpacing: '3px'
              }}>
                {printBarcodeData.barcodeNumber}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ViewStock;
