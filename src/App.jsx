import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { Tabs, Tab } from './Tabs'
import Incidents from './Incidents'
import Offenders from './Offenders'
import Proximity from './Proximity'
import DataScience from './DataScience'
import Login from './Login'
import api, { getIncidents, getSexOffenders, getCorrections, getDispatch, getTraffic } from './client'
import DataGrid from './DataGrid' // 1. IMPORT DATAGRID
import MapWithData from './MapWithData' // 1. IMPORT MapWithData

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
  const [mapHeight, setMapHeight] = useState(360) // Lifted state
  const mapRef = useRef(null)
  // Fetch limit for Crime tab, display limit for Recent tab
  const [crimeLimit, setCrimeLimit] = useState(100)
  const [recentCrimeLimit, setRecentCrimeLimit] = useState(5)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch all data in parallel
      const [incidentsRes, trafficRes, reoffRes, sexOffRes, corrRes, dispRes] = await Promise.all([
        getIncidents({ cadLimit, arrestLimit, crimeLimit, dateFrom, dateTo, filters }),
        api.getTraffic(),
        api.getReoffenders(),
        api.getSexOffenders(),
        api.getCorrections(),
        api.getDispatch()
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

      setLoading(false); // UI is now interactive

      // 2. Background Geocoding
      // We will process 'combinedForMap' in batches and update state incrementally
      const geocodeBatch = async () => {
        const batchSize = 5; // Small batch for responsiveness
        let currentPoints = [...combinedForMap];
        let hasChanges = false;

        for (let i = 0; i < currentPoints.length; i++) {
          const row = currentPoints[i];
          // Skip if already has lat/lon or no address
          if ((row.lat && row.lon) || (!row.location && !row.address)) continue;

          const address = row.location || row.address;
          try {
            let q = address
              .replace(/^at\s+/i, '') // Remove leading "at "
              .replace(/-BLK/gi, ' ')
              .replace(/\//g, ' and ')
              .replace(/,(\s*,)+/g, ',') // Remove double commas
              .trim();

            if (!/dubuque/i.test(q)) q += ', Dubuque, IA';

            const res = await axios.get('/api/geocode', {
              params: { q },
              headers: { 'Authorization': `Bearer ${localStorage.getItem('p2c-token')}` }
            });

            if (res.data && res.data.lat) {
              currentPoints[i] = { ...row, lat: Number(res.data.lat), lon: Number(res.data.lon) };
              hasChanges = true;
            }
          } catch (e) {
            // console.error(`Geocoding failed for "${address}"`);
          }

          // Update state every batchSize items or at the end
          if ((i + 1) % batchSize === 0 || i === currentPoints.length - 1) {
            if (hasChanges) {
              updateDerivedStates([...currentPoints]); // Create new array ref
              hasChanges = false;
              // Small delay to yield to main thread
              await new Promise(r => setTimeout(r, 50));
            }
          }
        }
      };

      // Start background process
      geocodeBatch();

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

  return (
    <div className="app-container">
      <header className="header">
        <h1>Incidents Map — Dubuque, IA</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => {
            localStorage.removeItem('p2c-token');
            window.location.reload();
          }}>
            Logout
          </button>
        </div>
      </header>
      <div className="content-container">
        <div className="main-content">
          {/* 3. UPDATE TABS */}
          <Tabs>
            <Tab label="Recent">
              <Incidents
                mapRef={mapRef}
                mapPoints={mapPoints}
                centerLat={centerLat}
                centerLng={centerLng}
                distanceKm={distanceKm}
                setCenterLat={setCenterLat}
                setCenterLng={setCenterLng}
                setDistanceKm={setDistanceKm}
                results={results}
                fitMarkers={fitMarkers}
                centerDubuque={centerDubuque}
                loading={loading}
                cadResults={cadResults.slice(0, recentCadLimit)}
                arrestResults={arrestResults.slice(0, recentArrestLimit)}
                crimeResults={crimeResults.slice(0, recentCrimeLimit)}
                zoomToRow={zoomToRow}
                reoffendersResults={reoffendersResults}
                mapHeight={mapHeight}
                setMapHeight={setMapHeight}
              />
            </Tab>
            <Tab label="Incidents">
              <MapWithData data={cadResults} columns={incidentColumns} loading={loading} mapHeight={mapHeight} setMapHeight={setMapHeight} />
            </Tab>
            <Tab label="Dispatch">
              <DataGrid data={dispatchResults} columns={dispatchColumns} />
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
            <Tab label="Corrections">
              <DataGrid data={correctionsResults} columns={correctionsColumns} />
            </Tab>
            <Tab label="Offenders">
              <DataGrid data={reoffendersResults} columns={reoffenderColumns} />
            </Tab>
            <Tab label="Sex Offenders">
              <MapWithData data={sexOffenderResults} columns={sexOffenderColumns} loading={loading} mapHeight={mapHeight} setMapHeight={setMapHeight} />
            </Tab>
            <Tab label="Data Science">
              <DataScience
                cadResults={cadResults}
                arrestResults={arrestResults}
                crimeResults={crimeResults}
                trafficResults={trafficResults}
              />
            </Tab>
            <Tab label="Proximity">
              <Proximity />
            </Tab>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('p2c-token'));

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <AppContent />;
}