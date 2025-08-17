import React from 'react';
import { Spinner } from 'react-bootstrap';

const LoadingSpinner = ({
  size = 'default',
  variant = 'primary',
  overlay = false,
  text = null,
  className = ''
}) => {
  const spinnerSize = size === 'sm' ? 'sm' : undefined;

  const spinner = (
    <div className={`d-flex flex-column align-items-center ${className}`}>
      <Spinner animation="border" size={spinnerSize} variant={variant} />
      {text && (
        <div className="mt-2 text-muted small">{text}</div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-light bg-opacity-75" style={{ zIndex: 9999 }}>
        {spinner}
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-center align-items-center py-4">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;