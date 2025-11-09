import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import MainNavbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import { v4 as uuidv4 } from 'uuid';
import cloudinaryConfig from '../utils/cloudinaryConfig';

const EditEmployee = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  
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
  const [fetchLoading, setFetchLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setFetchLoading(true);
        const employeeDoc = await getDoc(doc(db, 'employees', id));
        
        if (employeeDoc.exists()) {
          const employeeData = employeeDoc.data();
          
          // Verify that this employee belongs to the current shop
          if (employeeData.shopId !== currentUser.uid) {
            setError('You do not have permission to edit this employee');
            setFetchLoading(false);
            return;
          }
          
          setFormData({
            name: employeeData.name || '',
            position: employeeData.position || '',
            contact: employeeData.contact || '',
            email: employeeData.email || '',
            address: employeeData.address || '',
            joiningDate: employeeData.joiningDate || '',
            salary: employeeData.salary ? employeeData.salary.toString() : '',
            imageUrl: employeeData.imageUrl || ''
          });
        } else {
          setError('Employee not found');
        }
        
        setFetchLoading(false);
      } catch (err) {
        console.error('Error fetching employee:', err);
        setError('Failed to load employee data. Please try again.');
        setFetchLoading(false);
      }
    };
    
    if (id && currentUser) {
      fetchEmployee();
    }
  }, [id, currentUser]);
  
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
      console.log('Image uploaded successfully:', data.secure_url);
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
      setError('Name, position, and contact number are required');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Get existing employee data to preserve QR code ID
      const employeeDoc = await getDoc(doc(db, 'employees', id));
      const existingData = employeeDoc.data();
      
      // Update the employee in Firestore, preserving QR code ID and imageUrl
      const updateData = {
        name: formData.name,
        position: formData.position,
        contact: formData.contact,
        email: formData.email || '',
        address: formData.address || '',
        joiningDate: formData.joiningDate || '',
        salary: parseFloat(formData.salary) || 0,
        qrCodeId: existingData.qrCodeId || uuidv4(), // Preserve existing QR code ID or generate new one
        updatedAt: new Date().toISOString()
      };
      
      // Only update imageUrl if it exists (preserve existing or use new one)
      if (formData.imageUrl && formData.imageUrl.trim() !== '') {
        updateData.imageUrl = formData.imageUrl;
      } else if (existingData.imageUrl) {
        // Preserve existing imageUrl if no new one is uploaded
        updateData.imageUrl = existingData.imageUrl;
      }
      
      console.log('Updating employee with data:', updateData);
      await updateDoc(doc(db, 'employees', id), updateData);
      console.log('Employee updated successfully');
      
      navigate('/employees');
    } catch (err) {
      console.error('Error updating employee:', err);
      setError('Failed to update employee. Please try again.');
      setLoading(false);
    }
  };
  
  if (fetchLoading) {
    return (
      <>
        <MainNavbar />
        <Container>
          <p className="text-center">Loading employee data...</p>
        </Container>
      </>
    );
  }
  
  return (
    <>
      <MainNavbar />
      <Container>
        <PageHeader title="Edit Employee" icon="bi-pencil-square" color="primary" />
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Card>
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Name*</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Position*</Form.Label>
                <Form.Control
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Contact Number*</Form.Label>
                <Form.Control
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Joining Date</Form.Label>
                <Form.Control
                  type="date"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleChange}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Monthly Salary</Form.Label>
                <Form.Control
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Employee Image</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                {isUploading && (
                  <Form.Text className="text-muted">
                    Uploading...
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
                    <p className="text-muted small mb-2">Current Image:</p>
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
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Employee'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
};

export default EditEmployee; 
