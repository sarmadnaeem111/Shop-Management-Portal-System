import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { currentUser, loading, isGuest, isStaff } = useAuth();

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

  // Staff can access the dashboard
  if (isStaff) {
    return children;
  }
  
  return children;
};

export default PrivateRoute;