import React, { useRef, useState, useMemo } from 'react';
import SplitView from './SplitView';
import DataGrid from './DataGrid';
import FilterControls, { filterData } from './FilterControls';

const MapWithData = ({ data, columns, loading, mapHeight, setMapHeight, onRowClick }) => {
  const mapRef = useRef(null);
  const [filters, setFilters] = useState({ searchText: '', startDate: '', endDate: '' });

  const filteredData = useMemo(() => {
    return filterData(data, filters);
  }, [data, filters]);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <FilterControls onFilterChange={setFilters} data={filteredData} />
      <SplitView
        mapPoints={filteredData}
        mapHeight={mapHeight}
        setMapHeight={setMapHeight}
        mapRef={mapRef}
      >
        {loading ? <div>Loading...</div> : <DataGrid data={filteredData} columns={columns} onRowClick={(r) => { zoomToRow(r); if (onRowClick) onRowClick(r); }} />}
      </SplitView>
    </div>
  );
};

export default MapWithData;