import React from 'react';
import DataGrid from './DataGrid';

const Arrests = ({ data, loading }) => {
  return (
    <div>
      {loading && <div>Loading arrests...</div>}
      <DataGrid
        data={data}
        columns={[
          { key: 'charge', name: 'Charge' },
          { key: 'name', name: 'Name' },
          { key: 'crime', name: 'Crime' },
          { key: 'location', name: 'Location' },
          { key: 'event_time', name: 'Event Time' },
        ]}
      />
    </div>
  );
};

export default Arrests;
