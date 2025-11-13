import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Table, InputGroup, Badge, Alert } from 'react-bootstrap';
import BarcodeReader from 'react-barcode-reader';
import Select from 'react-select';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import { calculateTotal, generateTransactionId, saveReceipt, formatCurrency } from '../utils/receiptUtils';
import { getShopStock, updateStockQuantity } from '../utils/stockUtils';
import { Translate, useTranslatedData } from '../utils';
import MainNavbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import '../styles/select.css';

const NewReceipt = () => {
  const { currentUser, shopData, activeShopId } = useAuth();
  const [items, setItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productCode, setProductCode] = useState('');
  const [customer, setCustomer] = useState('Walk-in Customer');
  const [autoPrint, setAutoPrint] = useState(true);
  const [saleReturn, setSaleReturn] = useState(false);
  const [isWholesale, setIsWholesale] = useState(false);
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [enterAmount, setEnterAmount] = useState('0');
  const [transactionId] = useState(generateTransactionId());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [stockItems, setStockItems] = useState([]);
  const [stockLoaded, setStockLoaded] = useState(false);
  const [savedReceiptId, setSavedReceiptId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeesLoaded, setEmployeesLoaded] = useState(false);
  const navigate = useNavigate();
  const pdfRef = useRef();

  // Fetch stock items
  useEffect(() => {
    if (currentUser && activeShopId) {
      getShopStock(activeShopId)
        .then(items => {
          setStockItems(items);
          setStockLoaded(true);
        })
        .catch(error => {
          console.error('Error loading inventory items:', error);
        });
    }
  }, [currentUser, activeShopId]);

  // Fetch employees
  useEffect(() => {
    if (currentUser) {
      const fetchEmployees = async () => {
        try {
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
          setEmployeesLoaded(true);
        } catch (error) {
          console.error('Error loading employees:', error);
          setEmployeesLoaded(true);
        }
      };
      fetchEmployees();
    }
  }, [currentUser]);

  // Handle Enter key to save and print receipt
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Check if Enter key is pressed
      if (e.key === 'Enter' && !loading && items.length > 0) {
        // Check if the user is not typing in an input field
        const activeElement = document.activeElement;
        const isInputField = activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'SELECT' ||
          activeElement.tagName === 'TEXTAREA'
        );
        
        // If not in an input field, save and print the receipt
        if (!isInputField) {
          e.preventDefault();
          handleSubmit(e);
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [loading, items]);

  // Cleanup: Remove any print iframes when component unmounts
  useEffect(() => {
    return () => {
      const existingIframe = document.getElementById('print-iframe');
      if (existingIframe && existingIframe.parentNode) {
        existingIframe.parentNode.removeChild(existingIframe);
      }
    };
  }, []);

  // Handle barcode scan from scanner hardware
  const handleScan = (data) => {
    if (!data) return;
    
    const matchingItem = stockItems.find(item => 
      item.sku && item.sku.toLowerCase() === data.toLowerCase());
    
    if (matchingItem) {
      setSelectedProduct(matchingItem.name);
      setProductCode(matchingItem.sku || '');
      
      // Add to items if not already exists
      const existingIndex = items.findIndex(item => 
        item.name.toLowerCase() === matchingItem.name.toLowerCase());
      
      if (existingIndex >= 0) {
        const newItems = [...items];
        newItems[existingIndex].quantity = (parseInt(newItems[existingIndex].quantity) + 1).toString();
        setItems(newItems);
      } else {
        setItems([...items, {
          code: matchingItem.sku || '',
          name: matchingItem.name,
          inStock: matchingItem.quantity || 0,
          salePrice: matchingItem.price.toString(),
          tax: '0',
          quantity: '1',
          total: matchingItem.price.toString(),
          costPrice: matchingItem.costPrice ? matchingItem.costPrice.toString() : '0',
          quantityUnit: matchingItem.quantityUnit || 'units',
          category: matchingItem.category || 'Uncategorized'
        }]);
      }
      
      // Clear the fields
      setSelectedProduct('');
      setProductCode('');
    }
  };

  // Handle code input field change (for barcode scanner input)
  const handleCodeInput = (e) => {
    const code = e.target.value;
    setProductCode(code);
    
    // Look for matching product by SKU/code
      const matchingItem = stockItems.find(item => 
      item.sku && item.sku.toLowerCase() === code.toLowerCase());
    
    if (matchingItem && code.length > 0) {
      // Add product to items list
      const existingIndex = items.findIndex(item => 
        item.name.toLowerCase() === matchingItem.name.toLowerCase());
      
      if (existingIndex >= 0) {
        // If item already exists, increment quantity
        const newItems = [...items];
        newItems[existingIndex].quantity = (parseInt(newItems[existingIndex].quantity) + 1).toString();
        setItems(newItems);
      } else {
        // Add as new item
        setItems([...items, {
          code: matchingItem.sku || '',
          name: matchingItem.name,
          inStock: matchingItem.quantity || 0,
          salePrice: matchingItem.price.toString(),
          tax: '0',
          quantity: '1',
          total: matchingItem.price.toString(),
          costPrice: matchingItem.costPrice ? matchingItem.costPrice.toString() : '0',
          quantityUnit: matchingItem.quantityUnit || 'units',
          category: matchingItem.category || 'Uncategorized'
        }]);
      }
      
      // Clear the fields after adding
      setSelectedProduct('');
      setProductCode('');
    }
  };

  // Handle product selection
  const handleProductSelect = (option) => {
    if (option) {
      const productName = option.value;
      setSelectedProduct(productName);
      const matchingItem = stockItems.find(item => item.name === productName);
      
      if (matchingItem) {
        const itemCode = matchingItem.sku || '';
        setProductCode(itemCode);
        
        // Automatically add the product to the items list
        const existingIndex = items.findIndex(item => 
          item.name.toLowerCase() === productName.toLowerCase());
        
        if (existingIndex >= 0) {
          // If item already exists, increment quantity
          const newItems = [...items];
          newItems[existingIndex].quantity = (parseInt(newItems[existingIndex].quantity) + 1).toString();
          setItems(newItems);
        } else {
          // Add as new item
          setItems([...items, { 
            code: itemCode,
            name: productName,
            inStock: matchingItem.quantity || 0,
            salePrice: matchingItem.price.toString(),
            tax: '0',
            quantity: '1',
            total: matchingItem.price.toString(),
            costPrice: matchingItem.costPrice ? matchingItem.costPrice.toString() : '0',
            quantityUnit: matchingItem.quantityUnit || 'units',
            category: matchingItem.category || 'Uncategorized'
          }]);
        }
        
        // Clear the selection to allow for next item
        setSelectedProduct('');
        setProductCode('');
      }
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalQuantities = items.reduce((sum, item) => 
      sum + parseFloat(item.quantity || 0), 0);
    const totalAmount = items.reduce((sum, item) => 
      sum + (parseFloat(item.salePrice || 0) * parseFloat(item.quantity || 1)), 0);
    const discountAmount = parseFloat(discount || 0);
    const taxAmount = parseFloat(tax || 0);
    const payable = totalAmount - discountAmount + taxAmount;
    const receivedAmount = parseFloat(enterAmount || 0);
    const balance = receivedAmount - payable;
    
    return {
      totalQuantities: totalQuantities.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      payable: payable.toFixed(2),
      receivedAmount: receivedAmount.toFixed(2),
      balance: balance.toFixed(2),
      return: balance < 0 ? Math.abs(balance).toFixed(2) : '0.00'
    };
  };

  const totals = calculateTotals();

  // Handle item changes
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Recalculate total for this item
    if (field === 'quantity' || field === 'salePrice') {
      const quantity = parseFloat(newItems[index].quantity || 1);
      const price = parseFloat(newItems[index].salePrice || 0);
      newItems[index].total = (quantity * price).toFixed(2);
    }
    
    setItems(newItems);
  };

  // Add item to list
  const addItemToList = () => {
    if (!selectedProduct) {
      setError('Please select a product');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    const matchingItem = stockItems.find(item => item.name === selectedProduct);
    if (!matchingItem) {
      setError('Product not found in stock');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    // Check if already in list
    const existingIndex = items.findIndex(item => 
      item.name.toLowerCase() === selectedProduct.toLowerCase());
    
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity = (parseInt(newItems[existingIndex].quantity) + 1).toString();
      setItems(newItems);
      } else {
      setItems([...items, {
        code: productCode || matchingItem.sku || '',
        name: selectedProduct,
        inStock: matchingItem.quantity || 0,
        salePrice: matchingItem.price.toString(),
        tax: '0',
        quantity: '1',
        total: matchingItem.price.toString(),
        costPrice: matchingItem.costPrice ? matchingItem.costPrice.toString() : '0',
        quantityUnit: matchingItem.quantityUnit || 'units',
        category: matchingItem.category || 'Uncategorized'
      }]);
    }
    
    setSelectedProduct('');
    setProductCode('');
  };

  // Remove item from the items list
  const removeItemFromList = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (items.length === 0) {
      setError('Please add at least one item');
      setLoading(false);
      return;
    }
    
    try {
      const receiptItems = items.map(item => ({
        name: item.name,
        price: parseFloat(item.salePrice),
        quantity: parseFloat(item.quantity),
        costPrice: parseFloat(item.costPrice || 0),
        quantityUnit: item.quantityUnit || 'units',
        category: item.category || 'Uncategorized'
      }));
      
    const receiptData = {
      shopId: activeShopId,
      shopDetails: {
        name: shopData.shopName,
        address: shopData.address,
        phone: shopData.phoneNumbers && shopData.phoneNumbers.length > 0 
               ? shopData.phoneNumbers.join(', ') 
               : shopData.phoneNumber || '',
        logoUrl: shopData.logoUrl || '',
        receiptDescription: shopData.receiptDescription || ''
      },
      transactionId,
        cashierName: 'Cashier',
        managerName: 'Manager',
        items: receiptItems,
        totalAmount: calculateTotal(receiptItems, discount),
        discount: parseFloat(discount) || 0,
        paymentMethod: 'Cash',
        cashGiven: parseFloat(enterAmount) || 0,
        change: parseFloat(enterAmount) - parseFloat(totals.payable) || 0,
        employeeName: selectedEmployee ? selectedEmployee.name : null,
        employeeId: selectedEmployee ? selectedEmployee.id : null
      };
      
      const receiptId = await saveReceipt(receiptData);
      
      // Update stock
      await updateStockQuantity(activeShopId, receiptItems.map(item => ({
          name: item.name,
        quantity: item.quantity,
        quantityUnit: item.quantityUnit
        })));
      
      setSuccess('Receipt saved successfully');
      setSavedReceiptId(receiptId);
      
      // Auto print if enabled
      if (autoPrint) {
        setTimeout(() => {
          printReceipt();
        }, 500);
      }
        
      // Reset form after delay
        setTimeout(() => {
          resetForm();
      }, 5000);
      
    } catch (error) {
      setError('Error saving receipt: ' + error.message);
    } finally {
        setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setItems([]);
    setSelectedProduct('');
    setProductCode('');
    setCustomer('Walk-in Customer');
    setDiscount('0');
    setTax('0');
    setEnterAmount('0');
    setSelectedEmployee(null);
    setError('');
    setSuccess('');
    setSavedReceiptId(null);
  };

  // Get product options for select
  const productOptions = stockLoaded ? 
    stockItems.map(item => ({ value: item.name, label: item.name })) : [];

  // Get employee options for select
  const employeeOptions = employeesLoaded ? 
    employees.map(emp => ({ value: emp.id, label: emp.name })) : [];

  // Print the receipt
  const printReceipt = () => {
    // Remove any existing print iframe
    const existingIframe = document.getElementById('print-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }
    
    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${shopData?.shopName || 'Shop'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @media print { body { margin: 0; padding: 0; } }
            body {
              width: 80mm;
              font-family: 'Courier New', monospace;
              color: #000;
              margin: 0 auto;
              background: #fff;
              padding: 6mm 4mm;
              font-weight: 700;
            }
            .center { text-align: center; }
            .header-logo { max-height: 36px; margin: 6px auto 8px; display: block; }
            .shop-name { font-size: 20px; font-weight: 700; margin: 4px 0; }
            .shop-address, .shop-phone { font-size: 12px; margin: 2px 0; }
            .sep { border-top: 1px dotted #000; margin: 6px 0; }
            .meta {
              display: grid;
              grid-template-columns: 1fr 1fr;
              font-size: 12px;
              margin: 6px 0;
            }
            .meta div { padding: 2px 0; }
            .meta-right { text-align: right; }
            table.receipt { width: 100%; border-collapse: collapse; margin: 4px 0; }
            table.receipt thead th { font-size: 12px; font-weight: 700; padding: 8px 4px; border-top: 1px dotted #000; border-bottom: 1px dotted #000; border-right: 1px dotted #000; }
            table.receipt thead th:first-child { border-left: 1px dotted #000; }
            table.receipt tbody td { font-size: 12px; padding: 8px 4px; border-bottom: 1px dotted #000; border-right: 1px dotted #000; vertical-align: top; }
            table.receipt tbody tr td:first-child { border-left: 1px dotted #000; }
            .c { text-align: center; }
            .r { text-align: right; }
            .wrap { white-space: pre-wrap; word-break: break-word; }
            .totals { margin-top: 8px; border-top: 1px dotted #000; border-bottom: 1px dotted #000; padding: 6px 0; font-size: 12px; }
            .line { display: flex; justify-content: space-between; margin: 3px 0; }
            .net { text-align: right; font-weight: 700; font-size: 18px; margin-top: 6px; }
            .thanks { text-align: center; margin-top: 12px; font-size: 12px; }
            .dev {
              text-align: center;
              margin-top: 40px;
              padding: 6px 0;
              font-size: 10px;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
            }
            /* Percentage widths for better layout on thermal printers */
            col.sr { width: 12%; }
            col.item { width: 46%; }
            col.qty { width: 10%; }
            col.rate { width: 16%; }
            col.amnt { width: 16%; }
          </style>
        </head>
        <body>
          <div class="center">
            ${shopData?.logoUrl ? `<img class=\"header-logo\" src=\"${shopData.logoUrl}\" alt=\"logo\" onerror=\"this.style.display='none'\" />` : ''}
            <div class="shop-name">${shopData?.shopName || 'Shop Name'}</div>
            ${shopData?.address ? `<div class=\"shop-address\">${shopData.address}</div>` : ''}
            <div class="shop-phone">Phone # ${shopData?.phoneNumbers?.[0] || shopData?.phoneNumber || ''}</div>
          </div>

          <div class="sep"></div>
          <div class="meta">
            <div>Invoice: ${transactionId}</div>
            <div class="meta-right">${currentDate} ${currentTime}</div>
          </div>
          <div class="sep"></div>

          <table class="receipt">
            <colgroup>
              <col class="sr" />
              <col class="item" />
              <col class="qty" />
              <col class="rate" />
              <col class="amnt" />
            </colgroup>
            <thead>
              <tr>
                <th class="c">Sr</th>
                <th class="c">Item / Product</th>
                <th class="c">Qty</th>
                <th class="r">Rate</th>
                <th class="r">Amnt</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => {
                const qty = parseFloat(item.quantity || 1);
                const rate = Math.round(parseFloat(item.salePrice || 0));
                const amount = Math.round(qty * rate);
                const name = (item.name || '').replace(/\\n/g, '\n');
                return `
                  <tr>
                    <td class=\"c\">${idx + 1}</td>
                    <td class=\"wrap\">${name}</td>
                    <td class=\"c\">${qty}</td>
                    <td class=\"r\">${rate}</td>
                    <td class=\"r\">${amount}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="line"><span>Total</span><span>${parseFloat(totals.totalQuantities).toFixed(2)}</span></div>
            ${parseFloat(discount) > 0 ? `<div class=\"line\"><span>Discount</span><span>${Math.round(parseFloat(discount))}</span></div>` : ''}
            <div class="line"><span>Net Total</span><span>${Math.round(parseFloat(totals.payable))}</span></div>
          </div>

          <div class="net">${Math.round(parseFloat(totals.payable))}</div>
          <div class="thanks">Thank you For Shoping !</div>
          <div class="dev">software developed by SARMAD 03425050007</div>
        </body>
      </html>
    `;
    
    // Write content to iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(receiptHTML);
    iframeDoc.close();
    
    // Print and remove iframe after printing
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      
      // Remove iframe after printing completes
      setTimeout(() => {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1000);
    }, 250);
  };

  return (
    <>
      <MainNavbar />
      <Container fluid className="pos-content">
        <PageHeader
          title="New Receipt"
          icon="bi-receipt"
          subtitle={`Create a new sale invoice. Transaction ID: ${transactionId}`}
        >
          <div className="hero-metrics__item">
            <span className="hero-metrics__label">Items</span>
            <span className="hero-metrics__value">{items.length}</span>
          </div>
          <div className="hero-metrics__item">
            <span className="hero-metrics__label">Total</span>
            <span className="hero-metrics__value">{formatCurrency(totals.totalAmount)}</span>
          </div>
          <div className="hero-metrics__item">
            <span className="hero-metrics__label">Payable</span>
            <span className="hero-metrics__value">{formatCurrency(totals.payable)}</span>
          </div>
          <div className="hero-metrics__item">
            <span className="hero-metrics__label">Balance</span>
            <span className="hero-metrics__value">{formatCurrency(totals.balance)}</span>
          </div>
        </PageHeader>

        {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
        {success && <Alert variant="success" className="mb-3">{success}</Alert>}

        <Row className="g-4">
          {/* Left Column - Product Selection & Cart */}
          <Col lg={8}>
            {/* Product Selection Card */}
            <Card className="mb-4 pos-card">
              <Card.Body>
                <h5 className="mb-4 d-flex align-items-center gap-2">
                  <i className="bi bi-cart-plus text-primary"></i>
                  Add Products
                </h5>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Product</Form.Label>
                      <Select
                        value={productOptions.find(opt => opt.value === selectedProduct)}
                        onChange={handleProductSelect}
                        options={productOptions}
                        placeholder="Search or select product..."
                        className="basic-single"
                        classNamePrefix="select"
                        menuPortalTarget={document.body}
                        styles={{
                          menuPortal: (base) => ({ ...base, zIndex: 9999 })
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && selectedProduct) {
                            e.preventDefault();
                            addItemToList();
                          }
                        }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Barcode / SKU</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Scan or enter barcode"
                        value={productCode}
                        onChange={handleCodeInput}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && productCode) {
                            e.preventDefault();
                            addItemToList();
                          }
                        }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Customer Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        placeholder="Walk-in Customer"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Employee (Optional)</Form.Label>
                      <Select
                        value={selectedEmployee ? employeeOptions.find(opt => opt.value === selectedEmployee.id) : null}
                        onChange={(option) => setSelectedEmployee(option ? employees.find(emp => emp.id === option.value) : null)}
                        options={employeeOptions}
                        placeholder="Select employee..."
                        isClearable
                        className="basic-single"
                        classNamePrefix="select"
                        menuPortalTarget={document.body}
                        styles={{
                          menuPortal: (base) => ({ ...base, zIndex: 9999 })
                        }}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex gap-2 mt-3 flex-wrap">
                  <Form.Check
                    type="checkbox"
                    id="autoPrint"
                    label="Auto Print"
                    checked={autoPrint}
                    onChange={(e) => setAutoPrint(e.target.checked)}
                  />
                  <Form.Check
                    type="checkbox"
                    id="saleReturn"
                    label="Sale Return"
                    checked={saleReturn}
                    onChange={(e) => setSaleReturn(e.target.checked)}
                  />
                  <Form.Check
                    type="checkbox"
                    id="wholesale"
                    label="Wholesale"
                    checked={isWholesale}
                    onChange={(e) => setIsWholesale(e.target.checked)}
                  />
                </div>
              </Card.Body>
            </Card>

            {/* Cart Items Card */}
            <Card className="pos-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-cart-check text-primary"></i>
                    Cart Items
                  </h5>
                  <Badge bg="primary" className="fs-6">{items.length} items</Badge>
                </div>
                {items.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="bi bi-cart-x text-muted" style={{ fontSize: '3rem' }}></i>
                    <p className="text-muted mt-3">No items in cart. Add products to get started.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="mb-0">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Product</th>
                          <th>Stock</th>
                          <th>Price</th>
                          <th>Qty</th>
                          <th>Total</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>
                              <div>
                                <strong>{item.name}</strong>
                                {item.code && <small className="text-muted d-block">{item.code}</small>}
                              </div>
                            </td>
                            <td>
                              <Badge bg={item.inStock > 0 ? 'success' : 'danger'}>
                                {item.inStock}
                              </Badge>
                            </td>
                            <td>
                              <Form.Control
                                type="number"
                                size="sm"
                                style={{ width: '100px' }}
                                value={item.salePrice}
                                onChange={(e) => handleItemChange(index, 'salePrice', e.target.value)}
                              />
                            </td>
                            <td>
                              <Form.Control
                                type="number"
                                size="sm"
                                style={{ width: '80px' }}
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                min="1"
                              />
                            </td>
                            <td>
                              <strong>{formatCurrency(item.total)}</strong>
                            </td>
                            <td>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => removeItemFromList(index)}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column - Payment Summary */}
          <Col lg={4}>
            <Card className="pos-card sticky-top" style={{ top: '100px' }}>
              <Card.Body>
                <h5 className="mb-4 d-flex align-items-center gap-2">
                  <i className="bi bi-cash-stack text-success"></i>
                  Payment Summary
                </h5>

                <div className="mb-4">
                  <Form.Group className="mb-3">
                    <Form.Label>Discount (RS)</Form.Label>
                    <Form.Control
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Tax (RS)</Form.Label>
                    <Form.Control
                      type="number"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </Form.Group>
                </div>

                <div className="border-top pt-3 mb-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Subtotal:</span>
                    <strong>{formatCurrency(totals.totalAmount)}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Discount:</span>
                    <span className="text-danger">-{formatCurrency(discount)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Tax:</span>
                    <span>+{formatCurrency(tax)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3 pt-2 border-top">
                    <span className="fw-bold">Total Payable:</span>
                    <strong className="text-primary fs-5">{formatCurrency(totals.payable)}</strong>
                  </div>
                </div>

                <Form.Group className="mb-3">
                  <Form.Label>Amount Received</Form.Label>
                  <Form.Control
                    type="number"
                    value={enterAmount}
                    onChange={(e) => setEnterAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="fs-5"
                  />
                </Form.Group>

                <div className="border-top pt-3 mb-4">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Received:</span>
                    <strong>{formatCurrency(totals.receivedAmount)}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="fw-bold">Change:</span>
                    <strong className={`fs-5 ${parseFloat(totals.balance) >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatCurrency(totals.balance)}
                    </strong>
                  </div>
                </div>

                <div className="d-grid gap-2">
                  <Button
                    variant="success"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={loading || items.length === 0}
                    className="mb-2"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Pay & Save
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Reset
                  </Button>
                  <Button
                    variant="outline-primary"
                    onClick={() => navigate('/receipts')}
                  >
                    <i className="bi bi-list-ul me-2"></i>
                    View Receipts
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Barcode Reader */}
      <BarcodeReader
        onError={(err) => console.error('Scan error:', err)}
        onScan={handleScan}
      />
    </>
  );
};

export default NewReceipt;
