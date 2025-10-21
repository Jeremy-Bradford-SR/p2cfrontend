import React, { useState, useEffect } from 'react';
import DataGrid from './DataGrid';
import api from './client';

const Offenders = () => {
  const [offenders, setOffenders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await api.queryTable({ table: 'Offender_Summary' });
      if (res.success) {
        setOffenders(res.response.data.data);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      {loading && <div>Loading offenders...</div>}
      <DataGrid
        data={offenders}
        columns={[
          { key: 'Name', name: 'Name' },
          { key: 'Gender', name: 'Gender' },
          { key: 'Age', name: 'Age' },
        ]}
      />
    </div>
  );
};

export default Offenders;
