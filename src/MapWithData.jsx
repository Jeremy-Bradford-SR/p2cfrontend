import React, { useRef } from 'react';
import MapView from './MapView';
import DataGrid from './DataGrid';

const MapWithData = ({ data, columns, loading }) => {
  const mapRef = useRef(null);

  function zoomToRow(r) {
    let lat = r.lat || r.Lat || null;
    let lon = r.lon || r.Lon || null;
    let geox = r.geox || r.Geox || r['geox'];
    let geoy = r.geoy || r.Geoy || r['geoy'];
    if (!lat && geox && geoy) {
      lat = Number(geoy);
      lon = Number(geox);
    }
    if (lat && lon) {
      if (mapRef.current && mapRef.current.setView) mapRef.current.setView([Number(lat), Number(lon)], 14);
    }
  }

  return (
    <div>
      <div style={{ height: '360px' }}>
        <MapView ref={mapRef} points={data} />
      </div>
      {loading ? <div>Loading...</div> : <DataGrid data={data} columns={columns} onRowClick={zoomToRow} />}
    </div>
  );
};

export default MapWithData;