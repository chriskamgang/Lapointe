import React from 'react';

const Table = ({
  children,
  className = '',
  striped = false,
  hover = true,
  responsive = true,
  ...props
}) => {
  const tableClasses = [
    'table',
    striped ? 'table-striped' : '',
    hover ? 'table-hover' : '',
    className
  ].filter(Boolean).join(' ');

  const tableElement = (
    <table className={tableClasses} {...props}>
      {children}
    </table>
  );

  if (responsive) {
    return (
      <div className="table-container">
        {tableElement}
      </div>
    );
  }

  return tableElement;
};

const TableHead = ({ children, className = '', ...props }) => {
  return (
    <thead className={className} {...props}>
      {children}
    </thead>
  );
};

const TableBody = ({ children, className = '', ...props }) => {
  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  );
};

const TableRow = ({ children, className = '', ...props }) => {
  return (
    <tr className={className} {...props}>
      {children}
    </tr>
  );
};

const TableHeader = ({ children, className = '', ...props }) => {
  return (
    <th className={className} {...props}>
      {children}
    </th>
  );
};

const TableCell = ({ children, className = '', ...props }) => {
  return (
    <td className={className} {...props}>
      {children}
    </td>
  );
};

Table.Head = TableHead;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Header = TableHeader;
Table.Cell = TableCell;

export default Table;