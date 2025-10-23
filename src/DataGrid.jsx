import React from 'react';

const DataGrid = ({ data, onRowClick, columns: customColumns }) => {
  if (!data || data.length === 0) {
    return <p>No data to display</p>;
  }

  // default columns if none provided
  const defaultColumns = [
    { key: 'type', name: 'Type' },
    { key: 'time', name: 'Time' },
    { key: 'location', name: 'Location' },
    { key: 'summary', name: 'Summary' },
  ];

  const columns = customColumns && Array.isArray(customColumns) && customColumns.length>0 ? customColumns : defaultColumns;

  const getCellValue = (row, key) => {
    if(!row) return ''
    const k = key || ''
    // common aliases for time
    if(k === 'time' || k === 'event_time' || k === 'starttime'){
      return row.time || row.event_time || row.starttime || row.event || ''
    }
    // prefer direct property
    if(Object.prototype.hasOwnProperty.call(row, k)) return row[k]
    // common fallbacks
    if(k === 'location') return row.location || row.address || ''
    if(k === 'summary') return row.nature || row.charge || row.description || row.crime || ''
    if(k === 'type'){
      if(row._source === 'Crime') return 'Crime'
      const isCad = (String(row._source || row.source || '').toLowerCase().includes('cadh')) || row._source === 'cadHandler'
      return isCad ? 'CAD' : 'Arrest'
    }
    // generic fallback to JSON string of value
    return row[k] !== undefined ? row[k] : ''
  }

  return (
    <div className="results-scroll">
      <table className="results-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            return (
              <tr key={i} onClick={() => onRowClick && onRowClick(row)}>
                {columns.map((col) => (
                  <td key={col.key}>{String(getCellValue(row, col.key) ?? '')}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DataGrid;