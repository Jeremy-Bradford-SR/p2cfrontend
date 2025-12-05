import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { Tabs, Tab } from './Tabs'
import CrimeTimeReplay from './CrimeTimeReplay'


import Offenders from './Offenders'
import Proximity from './Proximity'
import DataScience from './DataScience'
import api, { getIncidents, getSexOffenders, getCorrections, getDispatch, getTraffic, getJailInmates, getJailImage } from './client'
import DataGrid from './DataGrid' // 1. IMPORT DATAGRID
import MapWithData from './MapWithData' // 1. IMPORT MapWithData
import FilterableDataGrid from './FilterableDataGrid'

// Simple Modal Component for Jail Inmates
const JailModal = ({ inmate, onClose }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchImage() {
      if (!inmate?.book_id) return;
      try {
        const res = await getJailImage(inmate.book_id);
        if (mounted && res?.response?.data?.data?.[0]?.photo_data) {
          // Assuming photo_data is base64 string or we need to handle it.
          // If it's raw bytes from SQL, the API usually returns it as a base64 string in JSON.
          // Let's assume base64.
          setImageUrl(`data:image/jpeg;base64,${res.response.data.data[0].photo_data}`);
        }
      } catch (e) {
        console.error("Failed to fetch jail image", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchImage();
    return () => { mounted = false; };
  }, [inmate]);

  if (!inmate) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white', padding: '24px', borderRadius: '8px', maxWidth: '500px', width: '90%',
        maxHeight: '90vh', overflowY: 'auto', position: 'relative'
      }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>

        <h2 style={{ marginTop: 0 }}>{inmate.lastname}, {inmate.firstname}</h2>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0', minHeight: '200px', alignItems: 'center', background: '#f0f0f0' }}>
          {loading ? <span>Loading photo...</span> : (
            imageUrl ?
              <img src={imageUrl} alt={`${inmate.lastname}`} style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} /> :
              <span>No Photo Available</span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
          <div><strong>Age:</strong> {inmate.age}</div>
          <div><strong>Sex:</strong> {inmate.sex}</div>
          <div><strong>Race:</strong> {inmate.race}</div>
          <div><strong>Booked:</strong> {new Date(inmate.arrest_date).toLocaleDateString()}</div>
          <div><strong>Bond:</strong> {inmate.total_bond_amount}</div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <strong>Charges:</strong>
          <p style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', marginTop: '5px' }}>
            {inmate.charges || 'No charges listed'}
          </p>
        </div>
      </div>
    </div>
  );
};
// Simple Modal Component for Sex Offenders
const SexOffenderModal = ({ offender, onClose }) => {
  const imageUrl = offender.photo_data
    ? `data:image/jpeg;base64,${offender.photo_data}`
    : offender.photo_url;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white', padding: '24px', borderRadius: '8px', maxWidth: '500px', width: '90%',
        maxHeight: '90vh', overflowY: 'auto', position: 'relative'
      }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>

        <h2 style={{ marginTop: 0 }}>{offender.last_name}, {offender.first_name} {offender.middle_name}</h2>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0', minHeight: '200px', alignItems: 'center', background: '#f0f0f0' }}>
          {imageUrl ?
            <img src={imageUrl} alt={`${offender.last_name}`} style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} /> :
            <span>No Photo Available</span>
          }
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
          <div><strong>Tier:</strong> {offender.tier}</div>
          <div><strong>Address:</strong> {offender.address_line_1}</div>
          <div><strong>City:</strong> {offender.city}</div>
          <div><strong>Registrant ID:</strong> {offender.registrant_id}</div>
        </div>
      </div>
    </div>
  );
};

function AppContent() {
  const [tables, setTables] = useState([])
  // we query both tables by default; table selector removed
  const [selectedTable, setSelectedTable] = useState('')
  const [schema, setSchema] = useState(null)
  const [data, setData] = useState([])
  const [mapPoints, setMapPoints] = useState([])
  const [cadLimit, setCadLimit] = useState(100)
  const [arrestLimit, setArrestLimit] = useState(100)
  // Display limits for "Recent" tab
  const [recentCadLimit, setRecentCadLimit] = useState(5)
  const [recentArrestLimit, setRecentArrestLimit] = useState(5)
  const [filters, setFilters] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [distanceKm, setDistanceKm] = useState('')
  const [centerLat, setCenterLat] = useState('')
  const [centerLng, setCenterLng] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [cadResults, setCadResults] = useState([])
  const [arrestResults, setArrestResults] = useState([])
  const [crimeResults, setCrimeResults] = useState([])
  const [reoffendersResults, setReoffendersResults] = useState([])
  const [sexOffenderResults, setSexOffenderResults] = useState([])
  const [correctionsResults, setCorrectionsResults] = useState([])
  const [dispatchResults, setDispatchResults] = useState([])
  const [trafficResults, setTrafficResults] = useState([])
  const [jailResults, setJailResults] = useState([]) // New State
  const [databaseStats, setDatabaseStats] = useState({}) // New State
  const [selectedInmate, setSelectedInmate] = useState(null) // New State
  const [selectedSexOffender, setSelectedSexOffender] = useState(null) // New State
  const [mapHeight, setMapHeight] = useState(360) // Lifted state
  const mapRef = useRef(null)
  // Fetch limit for Crime tab, display limit for Recent tab
  const [crimeLimit, setCrimeLimit] = useState(100)
  const [recentCrimeLimit, setRecentCrimeLimit] = useState(5)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch all data in parallel
      const [incidentsRes, trafficRes, reoffRes, sexOffRes, corrRes, dispRes, jailRes, dbStatsRes] = await Promise.all([
        getIncidents({ cadLimit, arrestLimit, crimeLimit, dateFrom, dateTo, filters }),
        api.getTraffic({ limit: cadLimit, dateFrom, dateTo }),
        api.getReoffenders({ limit: cadLimit, dateFrom, dateTo }),
        api.getSexOffenders({ limit: cadLimit }),
        api.getCorrections({ limit: cadLimit }),
        api.getDispatch({ limit: cadLimit, dateFrom, dateTo }),
        api.getJailInmates(), // Fetch Jail Data
        api.getDatabaseStats() // Fetch DB Stats
      ]);

      let allIncidents = incidentsRes?.response?.data?.data || [];
      let trafficRows = trafficRes?.response?.data?.data || [];

      // Process Traffic Rows
      trafficRows = trafficRows.map(r => {
        let source = 'Traffic';
        if (r.key === 'TC') source = 'TrafficCitation';
        if (r.key === 'TA') source = 'TrafficAccident';
        return { ...r, _source: source, nature: r.charge };
      });

      // Combine for geocoding
      const combinedForMap = [...allIncidents, ...trafficRows];

      // Set initial state (grids will populate immediately with ungeocoded data)
      // We need to set the derived states initially so the grids aren't empty while geocoding happens
      const updateDerivedStates = (points) => {
        const cadRows = points.filter(r => r._source === 'cadHandler');
        const arrRows = points.filter(r => r._source === 'DailyBulletinArrests');
        const crimeRows = points
          .filter(r => r._source === 'Crime')
          .sort((a, b) => new Date(b.event_time) - new Date(a.event_time));
        const trafRows = points
          .filter(r => r._source === 'Traffic' || r._source === 'TrafficCitation' || r._source === 'TrafficAccident')
          .sort((a, b) => new Date(b.event_time) - new Date(a.event_time));

        setCadResults(cadRows);
        setArrestResults(arrRows);
        setCrimeResults(crimeRows);
        setTrafficResults(trafRows);
        setResults(points);
        setMapPoints(points.filter(p => p.lat && p.lon)); // Only map points with coords
      };

      updateDerivedStates(combinedForMap);

      // Set other non-mapped tabs
      setReoffendersResults(reoffRes?.response?.data?.data || []);

      let sexOffRows = sexOffRes?.response?.data?.data || [];
      sexOffRows = sexOffRows.map(r => ({
        ...r,
        _source: 'SexOffender',
        nature: `Sex Offender (${r.tier})`,
        location: r.address_line_1
      }));
      setSexOffenderResults(sexOffRows);

      setCorrectionsResults(corrRes?.response?.data?.data || []);
      setDispatchResults(dispRes?.response?.data?.data || []);
      setJailResults(jailRes?.response?.data?.data || []); // Set Jail Results
      setDatabaseStats(dbStatsRes || {}); // Set DB Stats

      setLoading(false); // UI is now interactive

      // 2. Background Geocoding REMOVED
      // The frontend now relies on the backend (and backfill script) to provide lat/lon coordinates.
      // No client-side geocoding is performed.


    } catch (err) {
      console.error('Error fetching data', err);
      setLoading(false);
    }
  }, [cadLimit, arrestLimit, crimeLimit, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [cadLimit, arrestLimit, crimeLimit, dateFrom, dateTo])

  // When filters change, fetch geocoded points for the map.
  useEffect(() => {
    // This effect is no longer needed, as fetchData now handles map points.
    // Kept here to show its removal. It can be deleted.
  }, [dateFrom, dateTo, filters, recentCadLimit, recentArrestLimit, recentCrimeLimit]);

  async function runQuery() {
    await fetchData();
  }

  // helper to zoom to a row's coordinates
  function zoomToRow(r) {
    let lat = r.lat || r.Lat || null
    let lon = r.lon || r.Lon || null
    let geox = r.geox || r.Geox || r['geox']
    let geoy = r.geoy || r.Geoy || r['geoy']
    if (!lat && geox && geoy) { lat = Number(geoy); lon = Number(geox) }
    if (lat && lon) { if (mapRef.current && mapRef.current.setView) mapRef.current.setView([Number(lat), Number(lon)], 14) }
  }

  function fitMarkers() {
    try {
      const coords = data.map(r => {
        let lat = r.lat || r.Lat || null
        let lon = r.lon || r.Lon || null
        let geox = r.geox || r.Geox || r['geox']
        let geoy = r.geoy || r.Geoy || r['geoy']
        if (!lat && geox && geoy) { lat = Number(geoy); lon = Number(geox) }
        if (lat && lon) return [Number(lat), Number(lon)]
        return null
      }).filter(Boolean)
      if (coords.length === 0) return
      if (mapRef.current && mapRef.current.fitBounds) mapRef.current.fitBounds(coords, { padding: [50, 50] })
    } catch (e) { console.warn('fitMarkers failed', e) }
  }

  function centerDubuque() {
    if (mapRef.current && mapRef.current.setView) mapRef.current.setView([42.5006, -90.6646], 12)
  }

  // 2. DEFINE COLUMNS FOR THE NEW GRIDS
  const crimeColumns = [
    { key: 'event_time', name: 'event_time' },
    { key: 'charge', name: 'Charge' },
    { key: 'name', name: 'Name' },
    { key: 'location', name: 'Location' },
    { key: 'agency', name: 'Agency' },
    { key: 'event_number', name: 'Event #' }
  ]

  const arrestColumns = [
    { key: 'event_time', name: 'event_time' },
    { key: 'charge', name: 'Charge' },
    { key: 'name', name: 'Name' },
    { key: 'location', name: 'Location' },
    { key: 'agency', name: 'Agency' },
    { key: 'event_number', name: 'Event #' }
  ];

  const reoffenderColumns = [
    { key: 'event_time', name: 'Arrest Time' },
    { key: 'ArrestRecordName', name: 'Arrest Name' },
    { key: 'ArrestCharge', name: 'Arrest Charge' },
    { key: 'OriginalOffenses', name: 'Original Offenses' },
  ];

  const sexOffenderColumns = [
    { key: 'first_name', name: 'First Name' },
    { key: 'middle_name', name: 'Middle Name' },
    { key: 'last_name', name: 'Last Name' },
    { key: 'address_line_1', name: 'Address' },
    { key: 'city', name: 'City' },
    { key: 'tier', name: 'Tier' }
  ];

  const incidentColumns = [
    { key: 'starttime', name: 'Start Time' },
    { key: 'nature', name: 'Nature' },
    { key: 'address', name: 'Address' },
    { key: 'agency', name: 'Agency' },
    { key: 'service', name: 'Service' }
  ]

  const correctionsColumns = [
    { key: 'DateScraped', name: 'Date Scraped' },
    { key: 'Name', name: 'Name' },
    { key: 'Age', name: 'Age' },
    { key: 'Gender', name: 'Gender' },
    { key: 'Offense', name: 'Offense' },
    { key: 'Location', name: 'Location' }
  ]

  const dispatchColumns = [
    { key: 'TimeReceived', name: 'Time Received' },
    { key: 'NatureCode', name: 'Nature' },
    { key: 'LocationAddress', name: 'Address' },
    { key: 'AgencyCode', name: 'Agency' },
    { key: 'IncidentNumber', name: 'Incident #' }
  ]

  const trafficColumns = [
    { key: 'event_time', name: 'Event Time' },
    { key: 'charge', name: 'Charge' },
    { key: 'location', name: 'Location' },
    { key: 'name', name: 'Name' },
    { key: 'key', name: 'Type' }
  ]

  const jailColumns = [
    { key: 'arrest_date', name: 'Booked Date' },
    { key: 'lastname', name: 'Last Name' },
    { key: 'firstname', name: 'First Name' },
    { key: 'charges', name: 'Charges' },
    { key: 'total_bond_amount', name: 'Bond' }
  ]

  return (
    <div className="app-container">
      <header className="header">
        <h1>CrimeTime</h1>
      </header>
      <div className="content-container">
        <div className="main-content">
          {/* 3. UPDATE TABS */}
          <Tabs>
            <Tab label="Home">
              <CrimeTimeReplay
                cadResults={cadResults}
                arrestResults={arrestResults}
                crimeResults={crimeResults}
                sexOffenderResults={sexOffenderResults}
                trafficResults={trafficResults}
              />
            </Tab>
            <Tab label="Incidents">
              <MapWithData data={cadResults} columns={incidentColumns} loading={loading} mapHeight={mapHeight} setMapHeight={setMapHeight} />
            </Tab>
            <Tab label="Dispatch">
              <FilterableDataGrid data={dispatchResults} columns={dispatchColumns} loading={loading} />
            </Tab>
            <Tab label="Crime">
              <MapWithData data={crimeResults} columns={crimeColumns} loading={loading} mapHeight={mapHeight} setMapHeight={setMapHeight} />
            </Tab>
            <Tab label="Arrests">
              <MapWithData data={arrestResults} columns={arrestColumns} loading={loading} mapHeight={mapHeight} setMapHeight={setMapHeight} />
            </Tab>
            <Tab label="Traffic">
              <MapWithData data={trafficResults} columns={trafficColumns} loading={loading} mapHeight={mapHeight} setMapHeight={setMapHeight} />
            </Tab>
            <Tab label="Probation/Parole">
              <FilterableDataGrid data={correctionsResults} columns={correctionsColumns} loading={loading} />
            </Tab>
            <Tab label="Violators">
              <FilterableDataGrid data={reoffendersResults} columns={reoffenderColumns} loading={loading} />
            </Tab>
            <Tab label="Sex Offenders">
              <MapWithData data={sexOffenderResults} columns={sexOffenderColumns} loading={loading} mapHeight={mapHeight} setMapHeight={setMapHeight} onRowClick={setSelectedSexOffender} />
            </Tab>
            <Tab label="Jail">
              <div style={{ padding: '10px', background: '#e0f2fe', marginBottom: '10px', borderRadius: '4px', fontSize: '14px' }}>
                ℹ️ Click on any row to view inmate photo and details.
              </div>
              <FilterableDataGrid data={jailResults} columns={jailColumns} onRowClick={setSelectedInmate} loading={loading} />
            </Tab>
            <Tab label="Data Science">
              <DataScience
                cadResults={cadResults}
                arrestResults={arrestResults}
                crimeResults={crimeResults}
                trafficResults={trafficResults}
                sexOffenderResults={sexOffenderResults}
                correctionsResults={correctionsResults}
                jailResults={jailResults}
                databaseStats={databaseStats}
                onIntervalChange={async (interval) => {
                  setLoading(true);
                  const now = new Date();
                  let from = new Date();

                  switch (interval) {
                    case '1wk': from.setDate(now.getDate() - 7); break;
                    case '2wk': from.setDate(now.getDate() - 14); break;
                    case '3wk': from.setDate(now.getDate() - 21); break;
                    case '1mnth': from.setMonth(now.getMonth() - 1); break;
                    case '3mnth': from.setMonth(now.getMonth() - 3); break;
                    case '6mnth': from.setMonth(now.getMonth() - 6); break;
                    case '9mnth': from.setMonth(now.getMonth() - 9); break;
                    case '1yr': from.setFullYear(now.getFullYear() - 1); break;
                    default: from.setDate(now.getDate() - 7); // default 1wk
                  }

                  const fromStr = from.toISOString().slice(0, 19).replace('T', ' ');
                  const toStr = now.toISOString().slice(0, 19).replace('T', ' ');

                  setDateFrom(fromStr);
                  setDateTo(toStr);

                  // Set high limits to get "full dataset" for the range
                  setCadLimit(10000);
                  setArrestLimit(10000);
                  setCrimeLimit(10000);

                  // fetchData will be triggered by the useEffect on [dateFrom, dateTo, limits]
                  // However, setting state is async. 
                  // The existing useEffect: useEffect(() => { fetchData(); }, [cadLimit, ...])
                  // will catch these changes.
                }}
                loading={loading}
              />
            </Tab>
            <Tab label="Proximity">
              <Proximity />
            </Tab>
          </Tabs>
        </div>
      </div>
      {selectedInmate && <JailModal inmate={selectedInmate} onClose={() => setSelectedInmate(null)} />}
      {selectedSexOffender && <SexOffenderModal offender={selectedSexOffender} onClose={() => setSelectedSexOffender(null)} />}
    </div>
  )
}

export default function App() {
  return <AppContent />;
}