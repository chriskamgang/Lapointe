import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  help,
  type = 'text',
  size = 'default',
  fullWidth = true,
  icon = null,
  iconPosition = 'left',
  className = '',
  containerClassName = '',
  labelClassName = '',
  children,
  ...props
}, ref) => {
  const baseClasses = 'form-control';
  const errorClasses = error ? 'error' : '';
  
  const sizeClasses = {
    sm: 'text-sm py-2 px-3',
    default: '',
    lg: 'text-lg py-4 px-4'
  };

  const inputClasses = [
    baseClasses,
    errorClasses,
    sizeClasses[size],
    icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : '',
    fullWidth ? 'w-full' : '',
    className,
    icon && iconPosition === 'left' ? 'pl-10' : '',
    icon && iconPosition === 'right' ? 'pr-10' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={`form-group ${containerClassName}`}>
      {label && (
        <label className={`form-label ${labelClassName}`}>
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className={`absolute inset-y-0 ${iconPosition === 'left' ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center pointer-events-none`}>
            <span className="text-gray-400">{icon}</span>
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          className={inputClasses}
          {...props}
        />
        
        {children}
      </div>

      {error && (
        <div className="form-error">
          <span>⚠️</span>
          {error}
        </div>
      )}

      {help && !error && (
        <div className="form-help">
          {help}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;