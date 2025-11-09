import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import MainNavbar from '../components/Navbar';
import { Translate, useTranslatedAttribute } from '../utils';
import PageHeader from '../components/PageHeader';
import { v4 as uuidv4 } from 'uuid';
import cloudinaryConfig from '../utils/cloudinaryConfig';

const AddEmployee = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Get translations for attributes
  const getTranslatedAttr = useTranslatedAttribute();
  
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    contact: '',
    email: '',
    address: '',
    joiningDate: '',
    salary: '',
    imageUrl: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle image upload to Cloudinary
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.match('image.*')) {
      setError('Please select an image file');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file should be less than 5MB');
      return;
    }
    
    setIsUploading(true);
    setError('');
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    try {
      // Create form data for upload
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('upload_preset', cloudinaryConfig.upload_preset);
      
      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloud_name}/image/upload`,
        {
          method: 'POST',
          body: uploadFormData
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const data = await response.json();
      setFormData({
        ...formData,
        imageUrl: data.secure_url
      });
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.position || !formData.contact) {
      setError(getTranslatedAttr('requiredFieldsError'));
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Generate unique QR code ID for the employee
      const qrCodeId = uuidv4();
      
      // Add the employee to Firestore
      await addDoc(collection(db, 'employees'), {
        ...formData,
        salary: parseFloat(formData.salary) || 0,
        joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
        shopId: currentUser.uid,
        qrCodeId: qrCodeId,
        createdAt: new Date().toISOString()
      });
      
      navigate('/employees');
    } catch (err) {
      console.error('Error adding employee:', err);
      setError(getTranslatedAttr('failedToAddEmployee'));
      setLoading(false);
    }
  };
  
  return (
    <>
      <MainNavbar />
      <Container>
        <PageHeader title="Add New Employee" icon="bi-person-plus" color="primary" />
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Card>
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label><Translate textKey="nameRequired" /></Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label><Translate textKey="positionRequired" /></Form.Label>
                <Form.Control
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label><Translate textKey="contactRequired" /></Form.Label>
                <Form.Control
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label><Translate textKey="email" /></Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label><Translate textKey="address" /></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label><Translate textKey="joiningDate" /></Form.Label>
                <Form.Control
                  type="date"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleChange}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label><Translate textKey="monthlySalary" /></Form.Label>
                <Form.Control
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label><Translate textKey="employeeImage" fallback="Employee Image" /></Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                {isUploading && (
                  <Form.Text className="text-muted">
                    <Translate textKey="uploading" fallback="Uploading..." />
                  </Form.Text>
                )}
                {imagePreview && (
                  <div className="mt-3">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      style={{ 
                        maxWidth: '200px', 
                        maxHeight: '200px', 
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0',
                        objectFit: 'cover'
                      }} 
                    />
                  </div>
                )}
                {formData.imageUrl && !imagePreview && (
                  <div className="mt-3">
                    <img 
                      src={formData.imageUrl} 
                      alt="Employee" 
                      style={{ 
                        maxWidth: '200px', 
                        maxHeight: '200px', 
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0',
                        objectFit: 'cover'
                      }} 
                    />
                  </div>
                )}
              </Form.Group>
              
              <div className="d-flex justify-content-between">
                <Button variant="secondary" onClick={() => navigate('/employees')}>
                  <Translate textKey="cancel" />
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? <Translate textKey="adding" /> : <Translate textKey="addEmployee" />}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
};

export default AddEmployee; 
