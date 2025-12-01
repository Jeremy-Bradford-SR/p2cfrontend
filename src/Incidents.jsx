import React from 'react';
import DataGrid from './DataGrid';
import SplitView from './SplitView';

const Incidents = ({
  mapRef,
  mapPoints,
  centerLat,
  centerLng,
  distanceKm,
  setCenterLat,
  setCenterLng,
  setDistanceKm,
  results,
  fitMarkers,
  centerDubuque,
  loading,
  cadResults,
  arrestResults,
  crimeResults,
  zoomToRow,
  reoffendersResults,
  mapHeight,
  setMapHeight
}) => {

  return (
    <SplitView
      mapPoints={mapPoints}
      mapHeight={mapHeight}
      setMapHeight={setMapHeight}
      mapRef={mapRef}
      onFitMarkers={fitMarkers}
      onCenterDubuque={centerDubuque}
    >
      <h3>Results (total: {results.length})</h3>
      {loading && <div style={{ padding: 8, background: '#fffbe6', border: '1px solid #ffecb5' }}>Loading data...</div>}
      {!loading && results.length === 0 && (
        <div style={{ padding: 8, background: '#fff1f0', border: '1px solid #ffd1d1' }}>
          No results to display — check API connectivity or adjust filters.
        </div>
      )}

      <div className="results-grid three-columns" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="results-panel" style={{ flex: 1 }}>
          <h4>CAD (showing {cadResults.length})</h4>
          <DataGrid
            data={cadResults}
            onRowClick={zoomToRow}
            columns={[
              { key: 'starttime', name: 'Start Time' },
              { key: 'nature', name: 'Nature' },
              { key: 'address', name: 'Address' },
            ]}
          />
        </div>
        <div className="results-panel" style={{ flex: 1 }}>
          <h4>DailyBulletinArrests (showing {arrestResults.length})</h4>
          <DataGrid
            data={arrestResults}
            onRowClick={zoomToRow}
            columns={[
              { key: 'charge', name: 'Charge' },
              { key: 'location', name: 'Location' },
              { key: 'event_time', name: 'event_time' },
            ]}
          />
        </div>
        <div className="results-panel" style={{ flex: 1 }}>
          <h4>Crime (showing {crimeResults.length})</h4>
          <DataGrid
            data={crimeResults}
            onRowClick={zoomToRow}
            columns={[
              { key: 'charge', name: 'Charge' },
              { key: 'location', name: 'Location' },
              { key: 'event_time', name: 'event_time' },
            ]}
          />
        </div>
      </div>
    </SplitView>
  );
};

export default Incidents;
