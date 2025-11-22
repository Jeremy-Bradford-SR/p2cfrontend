import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { Tabs, Tab } from './Tabs'
import Incidents from './Incidents'
import Offenders from './Offenders'
import Proximity from './Proximity'
import Login from './Login'
import api, { getIncidents } from './client'
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
  const mapRef = useRef(null)
  // Fetch limit for Crime tab, display limit for Recent tab
  const [crimeLimit, setCrimeLimit] = useState(100)
  const [recentCrimeLimit, setRecentCrimeLimit] = useState(5)

  const fetchData = useCallback(async () => {
    (async () => {
      setLoading(true)
      try{
        // Use the /incidents endpoint as the single source of truth.
        const incidentsRes = await getIncidents({ cadLimit, arrestLimit, crimeLimit, dateFrom, dateTo, filters });
        const allIncidents = incidentsRes?.response?.data?.data || [];

        // --- DEBUGGING STEP 1: Log the raw data from the server ---
        console.log('STEP 1: Raw data received from proxy:', allIncidents);

        const processAndSetData = async (rows) => {
          const batchSize = 10;
          const geocodedPoints = [];

          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const promises = batch.map(async (row) => {
              const address = row.location || row.address;
              // If there's no address, we can't geocode it, but we must keep the record
              // for the data grid display. Return the original row.
              if (!address) {
                return row;
              }
              try {
                const res = await axios.get('http://192.168.0.212:8080/search', {
                  params: { q: address.replace(/-BLK/gi, ' ').replace(/\//g, ' and ').trim(), format: 'json', limit: 1, addressdetails: 0 },
                  headers: { 'User-Agent': 'p2c-frontend' }
                });
                if (res.data && res.data[0]) {
                  const { lat, lon } = res.data[0];
                  return { ...row, lat: Number(lat), lon: Number(lon) };
                }
              } catch (e) {
                console.error(`Geocoding failed for "${address}":`, e.message);
              }
              // If geocoding fails, still return the original row to keep it in the list.
              return row;
            });
            const batchResults = await Promise.all(promises);
            geocodedPoints.push(...batchResults.filter(Boolean));
          }

          // Now that we have all geocoded points, update all state variables
          setMapPoints(geocodedPoints);

          // Filter the geocoded data for each tab
          const cadRows = geocodedPoints.filter(r => r._source === 'cadHandler');
          const arrRows = geocodedPoints.filter(r => r._source === 'DailyBulletinArrests');
          const crimeRows = geocodedPoints
            .filter(r => r._source === 'Crime')
            .sort((a, b) => new Date(b.event_time) - new Date(a.event_time));

          setData(geocodedPoints);
          setResults(geocodedPoints);
          setCadResults(cadRows);
          setArrestResults(arrRows);
          setCrimeResults(crimeRows);

          // --- DEBUGGING STEP 2: Log the final filtered data ---
          console.log('STEP 2: Final filtered data', { cadRows, arrRows, crimeRows });

          // Set loading to false only after all data is processed and set
          setLoading(false);
        };

        // Fetch reoffenders separately as it's a custom query
        const reoffRes = await api.getReoffenders();
        const reoffRows = reoffRes?.response?.data?.data || [];
        setReoffendersResults(reoffRows);

        // Kick off geocoding and data processing.
        await processAndSetData(allIncidents);
      } catch(err) {
        console.error('Error fetching data on startup', err);
        setLoading(false); // Also ensure loading is false on error
      }
    })();
  }, [cadLimit, arrestLimit, crimeLimit, dateFrom, dateTo]);

  useEffect(()=>{
    fetchData();
  },[cadLimit, arrestLimit, crimeLimit, dateFrom, dateTo])

  // When filters change, fetch geocoded points for the map.
  useEffect(() => {
    // This effect is no longer needed, as fetchData now handles map points.
    // Kept here to show its removal. It can be deleted.
  }, [dateFrom, dateTo, filters, recentCadLimit, recentArrestLimit, recentCrimeLimit]);

  async function runQuery(){
    await fetchData();
  }

  // helper to zoom to a row's coordinates
  function zoomToRow(r){
    let lat = r.lat || r.Lat || null
    let lon = r.lon || r.Lon || null
    let geox = r.geox || r.Geox || r['geox']
    let geoy = r.geoy || r.Geoy || r['geoy']
    if(!lat && geox && geoy){ lat = Number(geoy); lon = Number(geox) }
    if(lat && lon){ if(mapRef.current && mapRef.current.setView) mapRef.current.setView([Number(lat), Number(lon)], 14) }
  }

  function fitMarkers(){
    try{
      const coords = data.map(r=>{
        let lat = r.lat || r.Lat || null
        let lon = r.lon || r.Lon || null
        let geox = r.geox || r.Geox || r['geox']
        let geoy = r.geoy || r.Geoy || r['geoy']
        if(!lat && geox && geoy){ lat = Number(geoy); lon = Number(geox) }
        if(lat && lon) return [Number(lat), Number(lon)]
        return null
      }).filter(Boolean)
      if(coords.length===0) return
      if(mapRef.current && mapRef.current.fitBounds) mapRef.current.fitBounds(coords, {padding: [50,50]})
    }catch(e){console.warn('fitMarkers failed', e)}
  }

  function centerDubuque(){
    if(mapRef.current && mapRef.current.setView) mapRef.current.setView([42.5006, -90.6646], 12)
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

  const incidentColumns = [
    { key: 'starttime', name: 'Start Time' },
    { key: 'nature', name: 'Nature' },
    { key: 'address', name: 'Address' },
    { key: 'agency', name: 'Agency' },
    { key: 'service', name: 'Service' }
  ]

  return (
    <div className="app-container">
      <header className="header">
        <h1>Incidents Map — Dubuque, IA</h1>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
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
              />
            </Tab>
            <Tab label="Incidents">
              <MapWithData data={cadResults} columns={incidentColumns} loading={loading} />
            </Tab>
            <Tab label="Crime">
              <MapWithData data={crimeResults} columns={crimeColumns} loading={loading} />
            </Tab>
            <Tab label="Arrests">
              <MapWithData data={arrestResults} columns={arrestColumns} loading={loading} />
            </Tab>
            <Tab label="Reoffenders">
              {loading ? <div>Loading...</div> : <DataGrid data={reoffendersResults} columns={reoffenderColumns} />}
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