import React from 'react';
import { Link } from 'react-router-dom';

const Button = ({
  children,
  variant = 'primary',
  size = 'default',
  disabled = false,
  loading = false,
  icon = null,
  iconPosition = 'left',
  fullWidth = false,
  href = null,
  to = null,
  onClick,
  className = '',
  ...props
}) => {
  const baseClasses = 'btn';
  
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    warning: 'btn-warning',
    error: 'btn-error',
    ghost: 'btn-ghost'
  };

  const sizeClasses = {
    sm: 'btn-sm',
    default: '',
    lg: 'btn-lg'
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'btn-full' : '',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
    className
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {loading && (
        <div className="loading-spinner" style={{ width: '16px', height: '16px' }} />
      )}
      {icon && iconPosition === 'left' && !loading && (
        <span className="btn-icon">{icon}</span>
      )}
      <span>{children}</span>
      {icon && iconPosition === 'right' && !loading && (
        <span className="btn-icon">{icon}</span>
      )}
    </>
  );

  const buttonProps = {
    className: classes,
    disabled: disabled || loading,
    onClick: !disabled && !loading ? onClick : undefined,
    ...props
  };

  if (to) {
    return (
      <Link to={to} {...buttonProps}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} {...buttonProps}>
        {content}
      </a>
    );
  }

  return (
    <button {...buttonProps}>
      {content}
    </button>
  );
};

export default Button;