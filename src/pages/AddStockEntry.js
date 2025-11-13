import React, { useEffect, useMemo, useState } from 'react';
import { Container, Card, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import Select from 'react-select';
import { useLocation, useNavigate } from 'react-router-dom';
import MainNavbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { getShopStock, addStockToItem } from '../utils/stockUtils';

const AddStockEntry = () => {
  const { currentUser, shopData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stock, setStock] = useState([]);
  const [rows, setRows] = useState([{ item: null, quantity: '', costPrice: '' }]);
  const [supplier, setSupplier] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    getShopStock(currentUser.uid).then(setStock);
  }, [currentUser]);

  const options = useMemo(
    () => stock.map(s => ({ value: s.id, label: s.name })),
    [stock]
  );

  // Preselect when navigated from inventory row
  useEffect(() => {
    const pre = location?.state?.preselectId;
    if (pre && rows?.length === 1) {
      const opt = options.find(o => o.value === pre);
      if (opt) {
        setRows([{ item: opt, quantity: '', costPrice: '' }]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state, options.length]);

  const setRowValue = (idx, key, value) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const addRow = () => setRows(prev => [...prev, { item: null, quantity: '', costPrice: '' }]);
  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const validRows = rows.filter(r => r.item && parseFloat(r.quantity) > 0);
    if (validRows.length === 0) { setError('Add at least one item and quantity'); return; }
    setLoading(true);
    try {
      // Process all rows
      for (const r of validRows) {
        await addStockToItem(currentUser.uid, r.item.value, parseFloat(r.quantity), {
          costPrice: r.costPrice,
          supplier,
          note
        });
      }
      setSuccess('Stock added successfully');
      printInvoice(validRows);
      // reset
      setRows([{ item: null, quantity: '', costPrice: '' }]);
      setSupplier('');
      setNote('');
    } catch (err) {
      setError(err.message || 'Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  const printInvoice = (validRows) => {
    try {
      const win = window.open('', '_blank');
      const now = new Date();
      const bodyRows = (validRows || []).map(r => {
        const item = r.item ? stock.find(s => s.id === r.item.value) : null;
        return `
          <tr>
            <td>${item?.name || '-'}</td>
            <td style="text-align:right">${parseFloat(r.quantity).toFixed(2)}</td>
            <td>${item?.quantityUnit || 'units'}</td>
            <td style="text-align:right">${r.costPrice ? Number(r.costPrice).toFixed(2) : '-'}</td>
          </tr>
        `;
      }).join('');
      const html = `
        <html>
          <head>
            <title>Stock In - ${shopData?.shopName || 'Shop'}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
              h2 { margin: 0 0 10px 0; }
              .meta { font-size: 12px; color: #555; margin-bottom: 20px; }
              .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              .table th, .table td { border: 1px solid #ccc; padding: 8px; font-size: 13px; }
              .table th { background: #f3f4f6; text-align: left; }
              .tot { margin-top: 15px; font-weight: bold; }
              @media print { @page { size: A4; margin: 16mm; } }
            </style>
          </head>
          <body>
            <h2>${shopData?.shopName || 'Shop'} - Stock In</h2>
            <div class="meta">
              Date: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}<br/>
              Supplier: ${supplier || '-'}<br/>
              Note: ${note || '-'}
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty Added</th>
                  <th>Unit</th>
                  <th>Cost Price</th>
                </tr>
              </thead>
              <tbody>
                ${bodyRows}
              </tbody>
            </table>
            <div class="tot">Received by: ____________</div>
          </body>
        </html>
      `;
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 200);
    } catch (e) {
      console.error('print error', e);
    }
  };

  return (
    <>
      <MainNavbar />
      <Container className="mt-3">
        <PageHeader 
          title="Add Stock" 
          icon="bi-box-arrow-in-down" 
          subtitle="Record incoming deliveries and update product quantities."
        />
        <div className="page-header-actions">
          <Button variant="outline-secondary" onClick={() => navigate('/stock')}>
            Back to Inventory
          </Button>
        </div>
        <Card>
          <Card.Body>
            {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
            {success && <Alert variant="success" className="mb-3">{success}</Alert>}
            <Form onSubmit={handleSubmit}>
              {rows.map((r, idx) => (
                <Row className="g-3 align-items-end" key={idx}>
                  <Col md={6}>
                    <Form.Label>Item</Form.Label>
                    <Select
                      value={r.item}
                      onChange={(opt) => setRowValue(idx, 'item', opt)}
                      options={options}
                      placeholder="Select existing item"
                      classNamePrefix="select"
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Quantity to add</Form.Label>
                    <Form.Control
                      type="number"
                      value={r.quantity}
                      onChange={(e) => setRowValue(idx, 'quantity', e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label>Cost price</Form.Label>
                    <Form.Control
                      type="number"
                      value={r.costPrice}
                      onChange={(e) => setRowValue(idx, 'costPrice', e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </Col>
                  <Col md={1}>
                    <Button variant="outline-danger" onClick={() => removeRow(idx)} disabled={rows.length === 1}>Remove</Button>
                  </Col>
                </Row>
              ))}
              <div className="mt-2">
                <Button variant="outline-primary" onClick={addRow}>+ Add another item</Button>
              </div>
              <Row className="g-3 mt-3">
                <Col md={4}>
                  <Form.Label>Supplier (optional)</Form.Label>
                  <Form.Control
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Supplier name"
                  />
                </Col>
                <Col md={8}>
                  <Form.Label>Note (optional)</Form.Label>
                  <Form.Control
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Reference, batch no, reason, etc."
                  />
                </Col>
              </Row>
              <div className="mt-4 d-flex gap-2">
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Stock & Print'}
                </Button>
                <Button variant="outline-secondary" onClick={() => navigate('/stock')}>
                  Cancel
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
};

export default AddStockEntry;

