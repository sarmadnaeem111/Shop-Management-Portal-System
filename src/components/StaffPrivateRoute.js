import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const StaffPrivateRoute = ({ children, permission }) => {
  const { currentUser, loading, isStaff, staffData, isGuest } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Redirect guest users to their limited dashboard
  if (isGuest) {
    return <Navigate to="/guest-dashboard" />;
  }

  // If no permission required or user is not staff (shop owner), allow full access
  if (!permission || !isStaff) {
    return children;
  }

  // For staff members, check if they have the required permission
  if (staffData && staffData.permissions && staffData.permissions[permission]) {
    return children;
  }

  // Staff doesn't have permission - redirect to dashboard
  return <Navigate to="/dashboard" />;
};

export default StaffPrivateRoute;

