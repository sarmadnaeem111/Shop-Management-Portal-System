import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BarcodeReader from 'react-barcode-reader';
import Select from 'react-select';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import { calculateTotal, generateTransactionId, saveReceipt } from '../utils/receiptUtils';
import { getShopStock, updateStockQuantity } from '../utils/stockUtils';
import { Translate, useTranslatedData } from '../utils';
import MainNavbar from '../components/Navbar';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import '../styles/pos-desktop.css';
import '../styles/select.css';

const NewReceipt = () => {
  const { currentUser, shopData } = useAuth();
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
    if (currentUser) {
      getShopStock(currentUser.uid)
        .then(items => {
          setStockItems(items);
          setStockLoaded(true);
        })
        .catch(error => {
          console.error('Error loading inventory items:', error);
        });
    }
  }, [currentUser]);

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
  }, [loading, items, handleSubmit]);

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

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
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
      
      const totals = calculateTotals();
      
    const receiptData = {
      shopId: currentUser.uid,
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
      await updateStockQuantity(currentUser.uid, receiptItems.map(item => ({
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
  }, [items, currentUser, shopData, transactionId, discount, enterAmount, selectedEmployee, autoPrint]);

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
  };

  // Get product options for select
  const productOptions = stockLoaded ? 
    stockItems.map(item => ({ value: item.name, label: item.name })) : [];

  // Get employee options for select
  const employeeOptions = employeesLoaded ? 
    employees.map(emp => ({ value: emp.id, label: emp.name })) : [];

  // Print the receipt
  const printReceipt = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${shopData?.shopName || 'Shop'}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 20px;
              max-width: 600px;
              margin: 0 auto;
              background: white;
              color: #000;
            }
            
            .receipt-header {
              text-align: center;
              margin-bottom: 20px;
            }
            
            .shop-name {
              font-size: 28px;
              font-weight: bold;
              margin: 10px 0;
              color: #000;
            }
            
            .shop-address {
              font-size: 14px;
              margin: 5px 0;
              color: #666;
            }
            
            .shop-phone {
              font-size: 14px;
              color: #666;
            }
            
            .receipt-info {
              display: flex;
              justify-content: space-between;
              margin: 20px 0;
              padding: 10px 0;
              border-top: 1px solid #ddd;
              border-bottom: 1px solid #ddd;
            }
            
            .info-left, .info-right {
              font-size: 12px;
            }
            
            .info-label {
              font-weight: bold;
              margin-right: 5px;
            }
            
            .table-header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 10px;
              display: grid;
              grid-template-columns: 2fr 1fr 1fr 1fr;
              gap: 10px;
              font-weight: bold;
              font-size: 12px;
              margin: 15px 0 0 0;
              border-radius: 4px 4px 0 0;
            }
            
            .table-row {
              display: grid;
              grid-template-columns: 2fr 1fr 1fr 1fr;
              padding: 10px;
              border-bottom: 1px solid #eee;
              font-size: 12px;
            }
            
            .item-name {
              text-align: left;
            }
            
            .item-price, .item-qty, .item-total {
              text-align: right;
            }
            
            .summary {
              margin-top: 20px;
              padding-top: 10px;
              border-top: 2px solid #000;
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              font-size: 14px;
            }
            
            .summary-label {
              font-weight: bold;
            }
            
            .summary-value {
              font-weight: bold;
            }
            
            .thank-you {
              text-align: center;
              margin-top: 30px;
              font-size: 14px;
              color: #666;
            }
            
            @page {
              size: A4;
              margin: 20mm;
            }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <div class="shop-name">${shopData?.shopName || 'Shop Name'}</div>
            <div class="shop-address">${shopData?.address || 'Shop Address'}</div>
            <div class="shop-phone">Tel: ${shopData?.phoneNumbers?.[0] || shopData?.phoneNumber || 'Phone Number'}</div>
          </div>
          
          <div class="receipt-info">
            <div class="info-left">
              <div><span class="info-label">Receipt #:</span> ${transactionId}</div>
              <div><span class="info-label">Date:</span> ${currentDate}</div>
              <div><span class="info-label">Time:</span> ${currentTime}</div>
            </div>
            <div class="info-right">
              <div><span class="info-label">Cashier:</span> Cashier</div>
              <div><span class="info-label">Manager:</span> Manager</div>
              <div><span class="info-label">Payment:</span> Cash</div>
            </div>
          </div>
          
          <div class="table-header">
            <div>ITEM</div>
            <div style="text-align: center;">PRICE</div>
            <div style="text-align: center;">QTY</div>
            <div style="text-align: right;">TOTAL</div>
          </div>
          
          ${items.map(item => `
            <div class="table-row">
              <div class="item-name">${item.name}</div>
              <div class="item-price">Rs ${parseFloat(item.salePrice || 0).toFixed(2)}</div>
              <div class="item-qty">${item.quantity}${item.quantityUnit === 'kg' ? ' KG' : ''}</div>
              <div class="item-total">Rs ${item.total || (parseFloat(item.salePrice || 0) * parseFloat(item.quantity || 1)).toFixed(2)}</div>
            </div>
          `).join('')}
          
          <div class="summary">
            <div class="summary-row">
              <span class="summary-label">Subtotal:</span>
              <span class="summary-value">Rs ${totals.totalAmount}</span>
            </div>
            ${parseFloat(discount) > 0 ? `
              <div class="summary-row">
                <span class="summary-label">Discount:</span>
                <span class="summary-value">Rs ${parseFloat(discount).toFixed(2)}</span>
              </div>
            ` : ''}
            ${parseFloat(tax) > 0 ? `
              <div class="summary-row">
                <span class="summary-label">Tax:</span>
                <span class="summary-value">Rs ${parseFloat(tax).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="summary-row">
              <span class="summary-label">Total:</span>
              <span class="summary-value">Rs ${totals.payable}</span>
            </div>
            ${parseFloat(enterAmount) > 0 ? `
              <div class="summary-row">
                <span class="summary-label">Cash Given:</span>
                <span class="summary-value">Rs ${parseFloat(enterAmount).toFixed(2)}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Change:</span>
                <span class="summary-value">Rs ${totals.balance}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="thank-you">
            <p><strong>Thank you for your business!</strong></p>
            ${shopData?.receiptDescription ? `<p>${shopData.receiptDescription}</p>` : ''}
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <>
      <MainNavbar />
      <div className="pos-desktop-container">
      {/* Left Sidebar */}
      <div className="pos-sidebar">
        <div className="pos-sidebar-icon" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left"></i>
        </div>
        <div className="pos-sidebar-icon" onClick={() => navigate('/dashboard')}>
          <i className="bi bi-house"></i>
        </div>
        <div className="pos-sidebar-text">KEY-POS</div>
      </div>
      
      {/* Main Content */}
      <div className="pos-main-content">
        {/* Top Header */}
        <div className="pos-top-header">
          <div className="pos-header-left">
            <span>localhost</span>
            <span className="pos-header-title">Sale Invoice: KEY-POS</span>
            </div>
          <div className="pos-header-center">
            {shopData?.shopName?.toUpperCase() || 'SHOP NAME'}
          </div>
          <div className="pos-header-right">
            <i className="bi bi-person"></i>
          </div>
        </div>
        
        {/* Invoice Content */}
        <div className="pos-invoice-wrapper">
          <h1 className="pos-invoice-title">Sale Invoice</h1>
          
          {/* Top Controls */}
          <div className="pos-top-controls-row">
            <div>
              <label className="pos-input-label">Product (alt+p)</label>
              <Select
                value={productOptions.find(opt => opt.value === selectedProduct)}
                onChange={handleProductSelect}
                options={productOptions}
                placeholder="Select Product"
                className="basic-single"
                classNamePrefix="select"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && selectedProduct) {
                    e.preventDefault();
                    addItemToList();
                  }
                }}
              />
            </div>
            
            <div>
              <label className="pos-input-label">Code (alt+c)</label>
              <input
                            type="text"
                className="pos-input-field"
                placeholder="Product Code"
                value={productCode}
                onChange={handleCodeInput}
              />
            </div>
            
            <div>
              <label className="pos-input-label">Customer</label>
              <input
                            type="text"
                className="pos-input-field"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              />
            </div>
            
            <div>
              <label className="pos-input-label">Employee (Optional)</label>
              <Select
                value={selectedEmployee ? employeeOptions.find(opt => opt.value === selectedEmployee.id) : null}
                onChange={(option) => setSelectedEmployee(option ? employees.find(emp => emp.id === option.value) : null)}
                options={employeeOptions}
                placeholder="Select Employee"
                isClearable
                className="basic-single"
                classNamePrefix="select"
              />
            </div>
          </div>
          
          {/* Checkboxes */}
          <div className="pos-checkboxes-row">
            <div className="pos-checkbox-group">
              <input
                type="checkbox"
                id="autoPrint"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
              />
              <label htmlFor="autoPrint">Auto Print</label>
            </div>
            
            <div className="pos-checkbox-group">
              <input
                type="checkbox"
                id="saleReturn"
                checked={saleReturn}
                onChange={(e) => setSaleReturn(e.target.checked)}
              />
              <label htmlFor="saleReturn">If Sale Return</label>
            </div>
            
            <div className="pos-checkbox-group">
              <input
                type="checkbox"
                id="wholesale"
                checked={isWholesale}
                onChange={(e) => setIsWholesale(e.target.checked)}
              />
              <label htmlFor="wholesale">If Wholesale</label>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="pos-action-buttons">
            <button 
              type="button" 
              className="pos-btn-action"
              onClick={() => navigate('/receipts')}
            >
              Hold Invoices
            </button>
            <button 
              type="button" 
              className="pos-btn-action"
              onClick={() => navigate('/receipts')}
            >
              Recent Invoices
            </button>
            <button 
              type="button" 
              className="pos-btn-action"
              onClick={() => setSaleReturn(!saleReturn)}
            >
              Sale Return
            </button>
          </div>
          
          {/* Item Table */}
          <div>
            <div className="pos-table-header">
              <div className="pos-table-header-cell">Sr #</div>
              <div className="pos-table-header-cell">Code</div>
              <div className="pos-table-header-cell">Name</div>
              <div className="pos-table-header-cell">In Stock</div>
              <div className="pos-table-header-cell">Sale Price</div>
              <div className="pos-table-header-cell">Tax %</div>
              <div className="pos-table-header-cell">Quantity</div>
              <div className="pos-table-header-cell">Total!</div>
            </div>
            
            <div className="pos-table-body">
              {items.length === 0 ? (
                <div className="pos-empty-state">
                  <div className="pos-empty-state-icon">
                    <i className="bi bi-receipt"></i>
                  </div>
                  <p>No items added yet</p>
                </div>
              ) : (
                items.map((item, index) => (
                  <div key={index} className="pos-table-row">
                    <div className="pos-table-cell-text">{index + 1}</div>
                    <div className="pos-table-cell-text">{item.code}</div>
                    <div className="pos-table-cell-text">{item.name}</div>
                    <div className="pos-table-cell-text">{item.inStock}</div>
                    <input
                      type="number"
                      className="pos-table-cell-input"
                      value={item.salePrice}
                      onChange={(e) => handleItemChange(index, 'salePrice', e.target.value)}
                    />
                    <input
                      type="number"
                      className="pos-table-cell-input"
                      value={item.tax}
                      onChange={(e) => handleItemChange(index, 'tax', e.target.value)}
                    />
                    <input
                      type="number"
                      className="pos-table-cell-input"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    />
                    <div className="pos-table-cell-text" style={{fontWeight: 'bold'}}>
                      {item.total}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Bottom Summary */}
          <div className="pos-bottom-section">
            <div className="pos-bottom-wrapper">
              <div className="pos-summary-group">
                <div className="pos-summary-item">
                  <span className="pos-summary-label">Total Quantities</span>
                  <span className="pos-summary-value">{totals.totalQuantities}</span>
                </div>
                
                <div className="pos-summary-item">
                  <span className="pos-summary-label">Discount (alt+d) % / Rs</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      className="pos-summary-input"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0"
                    />
                    <input
                      type="number"
                      className="pos-summary-input"
                      defaultValue="0"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="pos-summary-item">
                  <span className="pos-summary-label">Tax</span>
                  <input
                        type="number"
                    className="pos-summary-input"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="pos-summary-group">
                <div className="pos-summary-item">
                  <span className="pos-summary-label">Total Amount</span>
                  <div className="pos-amount-box">{totals.totalAmount}</div>
                      </div>
                
                <div className="pos-summary-item">
                  <span className="pos-summary-label">Payable</span>
                  <div className="pos-amount-box">{totals.payable}</div>
                        </div>
                
                <div className="pos-summary-item">
                  <span className="pos-summary-label">Enter Amount (alt+e)</span>
                  <input
                    type="number"
                    className="pos-summary-input"
                    value={enterAmount}
                    onChange={(e) => setEnterAmount(e.target.value)}
                    placeholder="0"
                  />
                      </div>
                      
                <div className="pos-summary-item">
                  <span className="pos-summary-label">Received Amount</span>
                  <div className="pos-amount-box">{totals.receivedAmount}</div>
                      </div>
                
                <div className="pos-summary-item">
                  <span className="pos-summary-label">Balance</span>
                  <div className="pos-amount-box">{totals.balance}</div>
                  </div>
                  
                <div className="pos-summary-item">
                  <span className="pos-summary-label">Return</span>
                  <div className="pos-amount-box">{totals.return}</div>
                </div>
              </div>
                    </div>
            
            <div className="pos-customer-type">{customer}</div>
            
            {error && <div style={{ color: 'red', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}
            {success && <div style={{ color: 'green', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{success}</div>}
            
            <div className="pos-bottom-actions">
              <button
                type="button"
                className="pos-btn-large pos-btn-hold"
                onClick={() => navigate('/receipts')}
              >
                Hold
              </button>
              
              <button
                type="button"
                className="pos-btn-large pos-btn-save"
                onClick={handleSubmit}
                disabled={loading || items.length === 0}
              >
                Pay & Save
              </button>
              
              <button
                type="button"
                className="pos-btn-large pos-btn-reset"
                          onClick={resetForm}
                        >
                Reset
              </button>
            </div>
                  </div>
                      </div>
                  </div>
                  
      {/* Barcode Reader */}
      <BarcodeReader
        onError={(err) => console.error('Scan error:', err)}
        onScan={handleScan}
      />
                </div>
    </>
  );
};

export default NewReceipt;
