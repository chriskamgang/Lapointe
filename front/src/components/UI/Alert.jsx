import React from 'react';
import { 
  CheckCircleFill, 
  ExclamationTriangleFill, 
  XCircleFill, 
  InfoCircleFill,
  X
} from 'react-bootstrap-icons';

const Alert = ({
  children,
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  className = '',
  ...props
}) => {
  const baseClasses = 'alert';
  
  const variantClasses = {
    success: 'alert-success',
    warning: 'alert-warning',
    error: 'alert-error',
    info: 'alert-info'
  };

  const icons = {
    success: <CheckCircleFill className="alert-icon" />,
    warning: <ExclamationTriangleFill className="alert-icon" />,
    error: <XCircleFill className="alert-icon" />,
    info: <InfoCircleFill className="alert-icon" />
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {icons[variant]}
      <div className="alert-content">
        {title && <div className="alert-title">{title}</div>}
        <div className="alert-message">{children}</div>
      </div>
      {dismissible && (
        <button
          className="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity"
          onClick={onDismiss}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default Alert;