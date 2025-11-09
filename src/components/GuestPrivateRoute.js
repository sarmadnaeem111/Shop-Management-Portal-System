import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const GuestPrivateRoute = ({ children }) => {
  const { currentUser, loading, isGuest } = useAuth();

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

  // Only allow access if user is a guest
  if (!isGuest) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default GuestPrivateRoute;