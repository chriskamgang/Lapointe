import React from 'react';

const Badge = ({
  children,
  variant = 'primary',
  size = 'default',
  className = '',
  ...props
}) => {
  const baseClasses = 'badge';
  
  const variantClasses = {
    primary: 'badge-primary',
    secondary: 'badge-gray',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    gray: 'badge-gray'
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    default: '',
    lg: 'text-sm px-3 py-1'
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
};

export default Badge;