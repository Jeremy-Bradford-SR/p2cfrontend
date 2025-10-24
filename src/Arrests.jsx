import React, { useState, useEffect } from 'react';
import DataGrid from './DataGrid';
import api from './client';

const Arrests = () => {
  const [arrests, setArrests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await api.queryTable({ table: 'DailyBulletinArrests' });
      if (res.success) {
        setArrests(res.response.data.data);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      {loading && <div>Loading arrests...</div>}
      <DataGrid
        data={arrests}
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
