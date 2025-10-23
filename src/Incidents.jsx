import React, { useState, useRef } from 'react';
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
  fitMarkers,
  centerDubuque,
  loading,
  cadResults,
  arrestResults,
  crimeResults,
  zoomToRow,
  reoffendersResults,
}) => {
  const [mapHeight, setMapHeight] = useState(360)
  const dragging = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(360)

  function onMouseDown(e){
    dragging.current = true
    startY.current = e.clientY
    startHeight.current = mapHeight
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function onMouseMove(e){
    if(!dragging.current) return
    const dy = e.clientY - startY.current
    const newH = Math.max(120, startHeight.current + dy)
    setMapHeight(newH)
  }

  function onMouseUp(){
    dragging.current = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
  
  return (
    <div>
      <section className="map-section" style={{height: mapHeight}}>
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

      <div className="map-controls" style={{ padding: '8px', display: 'flex', gap: '8px', justifyContent: 'center', background: '#f0f0f0' }}>
        <button onClick={fitMarkers}>Fit All Markers</button>
        <button onClick={centerDubuque}>Center on Dubuque</button>
      </div>

      <div className="splitter" onMouseDown={onMouseDown} style={{height:8, cursor:'row-resize', background:'#eee'}} />

      <section className="results-section">
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
      
    </div>
  );
};

export default Incidents;
