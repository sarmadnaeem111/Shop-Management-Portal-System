import React from 'react';

const PageHeader = ({ title, icon = 'bi-speedometer2', subtitle = '', children }) => {
  return (
    <div className="page-hero-card">
      <div className="page-hero-card__content">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        {children && <div className="hero-metrics mt-3">{children}</div>}
      </div>
      <div className="page-hero-card__icon">
        <i className={`bi ${icon}`} />
      </div>
    </div>
  );
};

export default PageHeader;
