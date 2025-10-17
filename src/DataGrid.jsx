import React from 'react';

const DataGrid = ({ data, onRowClick }) => {
  if (!data || data.length === 0) {
    return <p>No data to display</p>;
  }

  const columns = [
    { key: 'type', name: 'Type' },
    { key: 'time', name: 'Time' },
    { key: 'location', name: 'Location' },
    { key: 'summary', name: 'Summary' },
  ];

  const getRowData = (row) => {
    const isCad = (String(row._source || row.source || '').toLowerCase().includes('cadh')) || row._source === 'cadHandler';
    return {
      type: isCad ? 'CAD' : 'Arrest',
      time: row.starttime || row.event_time || '',
      location: row.address || row.location || '',
      summary: row.nature || row.charge || row.description || '',
    };
  };

  return (
    <table className="results-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.name}</th>
          ))}
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => {
          const rowData = getRowData(row);
          return (
            <tr key={i} onClick={() => onRowClick(row)}>
              {columns.map((col) => (
                <td key={col.key}>{rowData[col.key]}</td>
              ))}
              <td>
                <button>Zoom</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default DataGrid;