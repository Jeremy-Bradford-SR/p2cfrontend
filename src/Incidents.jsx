import React from 'react';
import MapView from './MapView';
import DataGrid from './DataGrid';
import Charts from './Charts';

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
  loading,
  cadResults,
  arrestResults,
  crimeResults,
  zoomToRow,
  chartsVisible,
}) => {
  return (
    <div>
      <section className="map-section">
        <div className="map-container">
          <MapView
            ref={mapRef}
            points={mapPoints}
            center={centerLat && centerLng ? [Number(centerLat), Number(centerLng)] : null}
            distanceKm={distanceKm ? Number(distanceKm) : null}
            zoomTo={pos => {
              if (mapRef.current && mapRef.current.flyTo) mapRef.current.flyTo(pos, 14);
            }}
          />
        </div>
      </section>

      <section className="results-section">
        <h3>Results (total: {results.length})</h3>
        {loading && <div style={{ padding: 8, background: '#fffbe6', border: '1px solid #ffecb5' }}>Loading data...</div>}
        {!loading && results.length === 0 && (
          <div style={{ padding: 8, background: '#fff1f0', border: '1px solid #ffd1d1' }}>
            No results to display — check API connectivity or adjust filters.
          </div>
        )}

        <div className="results-grid three-columns" style={{ display: 'flex', gap: 16 }}>
          <div className="results-panel" style={{ flex: 1 }}>
            <h4>CAD (showing {cadResults.length})</h4>
            <DataGrid data={cadResults} onRowClick={zoomToRow} />
          </div>
          <div className="results-panel" style={{ flex: 1 }}>
            <h4>DailyBulletinArrests (showing {arrestResults.length})</h4>
            <DataGrid
              data={arrestResults}
              onRowClick={zoomToRow}
              columns={[
                { key: 'charge', name: 'Charge' },
                { key: 'name', name: 'Name' },
                { key: 'crime', name: 'Crime' },
                { key: 'location', name: 'Location' },
                { key: 'event_time', name: 'Event Time' },
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
                { key: 'name', name: 'Name' },
                { key: 'crime', name: 'Crime' },
                { key: 'location', name: 'Location' },
                { key: 'time', name: 'Time' },
              ]}
            />
          </div>
        </div>
      </section>
      {chartsVisible && (
        <section className="charts-section">
          <Charts data={results} />
        </section>
      )}
    </div>
  );
};

export default Incidents;
