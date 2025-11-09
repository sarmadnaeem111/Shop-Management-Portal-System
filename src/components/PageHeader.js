import React from 'react';

const colorToBootstrap = (color) => {
  switch (color) {
    case 'primary':
    case 'success':
    case 'warning':
    case 'danger':
    case 'info':
      return color;
    default:
      return 'primary';
  }
};

const PageHeader = ({ title, icon = 'bi-speedometer2', subtitle = '', color = 'primary' }) => {
  const variant = colorToBootstrap(color);
  return (
    <div className="d-flex align-items-center mb-4">
      <div className="me-3">
        <div className={`bg-${variant} rounded-circle d-flex align-items-center justify-content-center`} style={{width: '60px', height: '60px'}}>
          <i className={`bi ${icon} text-white fs-3`}></i>
        </div>
      </div>
      <div>
        <h2 className={`mb-1 fw-bold text-${variant}`}>{title}</h2>
        {subtitle && <p className="text-muted mb-0">{subtitle}</p>}
      </div>
    </div>
  );
};

export default PageHeader;


