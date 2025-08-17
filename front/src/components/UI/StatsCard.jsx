import React from 'react';
import { ArrowUp, ArrowDown } from 'react-bootstrap-icons';

const StatsCard = ({
  title,
  value,
  icon,
  change,
  changeType,
  changeLabel,
  color = 'primary',
  className = ''
}) => {
  const colorClasses = {
    primary: 'border-l-primary-violet',
    success: 'border-l-success',
    warning: 'border-l-warning',
    error: 'border-l-error',
    info: 'border-l-info'
  };

  const iconColorClasses = {
    primary: 'bg-primary-violet-100 text-primary-violet',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
    error: 'bg-red-100 text-red-600',
    info: 'bg-blue-100 text-blue-600'
  };

  return (
    <div className={`stat-card ${colorClasses[color]} ${className}`}>
      <div className="stat-header">
        <div className="stat-title">{title}</div>
        {icon && (
          <div className={`stat-icon ${iconColorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="stat-value">{value}</div>
      
      {change !== undefined && (
        <div className={`stat-change ${changeType === 'increase' ? 'positive' : 'negative'}`}>
          {changeType === 'increase' ? (
            <ArrowUp size={12} />
          ) : (
            <ArrowDown size={12} />
          )}
          <span>{change}%</span>
          {changeLabel && <span className="ml-1">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
};

export default StatsCard;