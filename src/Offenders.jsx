import React, { useState, useEffect } from 'react';
import DataGrid from './DataGrid';
import api from './client';

const Offenders = () => {
  const [offenders, setOffenders] = new useState([]);
  const [loading, setLoading] = new useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await api.getReoffenders();
      if (res.success) {
        setOffenders(res.response.data.data || []);
      } else {
        console.error('Offenders rawQuery failed', res.response)
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h3>Reoffenders</h3>
      {loading && <div>Loading offenders...</div>}
      
      <DataGrid
        data={offenders}
        columns={[
          { key: 'ArrestRecordName', name: 'Arrest Name' },
          { key: 'ArrestCharge', name: 'Arrest Charge' },
          { key: 'OriginalOffenses', name: 'Original Offenses' },
          { key: 'OffenderNumbers', name: 'Offender #s' },
          { key: 'event_time', name: 'Event Time' }
        ]}
      />
    </div>
  );
};

export default Offenders;