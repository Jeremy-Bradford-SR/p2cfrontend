import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Tabs, Tab } from './Tabs'
import Incidents from './Incidents'
import Arrests from './Arrests'
import Offenders from './Offenders'
import api, { getIncidents } from './client'
import DataGrid from './DataGrid' // 1. IMPORT DATAGRID

export default function App(){
  const [tables, setTables] = useState([])
  // we query both tables by default; table selector removed
  const [selectedTable, setSelectedTable] = useState('')
  const [schema, setSchema] = useState(null)
  const [data, setData] = useState([])
  const [mapPoints, setMapPoints] = useState([])
  // Fetch limits for dedicated tabs
  const [cadLimit, setCadLimit] = useState(50)
  const [arrestLimit, setArrestLimit] = useState(50)
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
  const [crimeLimit, setCrimeLimit] = useState(50)
  const [recentCrimeLimit, setRecentCrimeLimit] = useState(5)

  const fetchData = useCallback(async () => {
    (async () => {
      setLoading(true)
      try{
        let whereParts = []
        if(dateFrom) whereParts.push(`starttime >= '${dateFrom}'`)
        if(dateTo) whereParts.push(`starttime <= '${dateTo}'`)
        if(filters) whereParts.push(`(${filters})`)
        const combinedFilters = whereParts.join(' AND ')

        // Create a specific filter for the crime query
        let crimeFilterParts = [...whereParts]
        crimeFilterParts.push("[key] = 'LW'")
        const crimeFilters = crimeFilterParts.join(' AND ')

        // query CAD and Arrests and Crime (Crime is derived from DailyBulletinArrests selecting key)
        const arrColumns = ['charge','name','crime','location','event_time']
        const crimeColumns = ['charge','name','crime','location','time']
        const [cadRes, arrRes, crimeRes, reoffRes] = await Promise.all([
          api.queryTable({table: 'cadHandler', limit: cadLimit, filters: combinedFilters, columns: ['starttime', 'nature', 'address', 'agency', 'service']}),
          api.queryTable({table: 'DailyBulletinArrests', columns: arrColumns, limit: arrestLimit, filters: combinedFilters, orderBy: 'event_time DESC' }),
          api.queryTable({table: 'DailyBulletinArrests', columns: crimeColumns, limit: crimeLimit, filters: crimeFilters, orderBy: 'event_time DESC' }),
          api.getReoffenders()
        ])

  let cadRows = cadRes && cadRes.success && cadRes.response && cadRes.response.data && cadRes.response.data.data ? cadRes.response.data.data : []
  let arrRows = arrRes && arrRes.success && arrRes.response && arrRes.response.data && arrRes.response.data.data ? arrRes.response.data.data : []
  // annotate source so downstream slicing/filters detect them correctly
  cadRows = cadRows.map(r => ({ ...r, _source: 'cadHandler' }))
  arrRows = arrRows.map(r => ({ ...r, _source: 'DailyBulletinArrests' }))
  const crimeRaw = crimeRes && crimeRes.success && crimeRes.response && crimeRes.response.data && crimeRes.response.data.data ? crimeRes.response.data.data : []
  // normalize casing and keys
  arrRows = arrRows.map(r => ({ ...r, event_time: r.event_time || r.event_time || r.event || r.eventTime || r.Event_Time || r['event_time'] }))
  const crimeRows = crimeRaw.map(r => ({
    ...r,
    _source: 'Crime',
    nature: r.nature || 'LW',
    location: r.location || r.address || r.key || r.Key || '',
    time: r.time || r.event_time || r.Event_Time || r.event || r['time'] || ''
  }))

        const combined = [...cadRows, ...arrRows, ...crimeRows]
        setData(combined)
        setResults(combined)
        setCadResults(cadRows)
        setArrestResults(arrRows)
        setCrimeResults(crimeRows)
  // set reoffenders
  const reoffRows = reoffRes && reoffRes.success && reoffRes.response && reoffRes.response.data && reoffRes.response.data.data ? reoffRes.response.data.data : []
  setReoffendersResults(reoffRows)
      }catch(err){
        console.error('Error fetching per-table data on startup', err)
      }
      setLoading(false)
    })();
  }, [cadLimit, arrestLimit, crimeLimit, dateFrom, dateTo, filters, distanceKm, centerLat, centerLng]);

  useEffect(()=>{
    fetchData();
  },[fetchData])

  // When filters change, fetch geocoded points for the map.
  useEffect(() => {
    // The /incidents endpoint fetches and geocodes data from all sources.
    // We'll use this as the single source of truth for map points.
    const fetchMapData = async () => {
      const limit = recentCadLimit + recentArrestLimit + recentCrimeLimit;
      const geoRes = await getIncidents({ limit, dateFrom, dateTo, filters });
      const geoRows = geoRes?.response?.data?.data ?? [];
      setMapPoints(geoRows);
    };
    fetchMapData();
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
    { key: 'charge', name: 'Charge' },
    { key: 'name', name: 'Name' },
    { key: 'crime', name: 'Crime' },
    { key: 'location', name: 'Location' },
    { key: 'time', name: 'Time' }
  ]

  const arrestColumns = [
    { key: 'charge', name: 'Charge' },
    { key: 'name', name: 'Name' },
    { key: 'crime', name: 'Crime' },
    { key: 'location', name: 'Location' },
    { key: 'event_time', name: 'Event Time' }
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
        <div style={{display:'flex', alignItems:'center', gap:12}} />
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
              {loading ? <div>Loading...</div> : <DataGrid data={cadResults} columns={incidentColumns} />}
            </Tab>
            <Tab label="Crime">
              {loading ? <div>Loading...</div> : <DataGrid data={crimeResults} columns={crimeColumns} />}
            </Tab>
            <Tab label="Arrests">
              {loading ? <div>Loading...</div> : <DataGrid data={arrestResults} columns={arrestColumns} />}
            </Tab>
            <Tab label="Reoffenders">
              {loading ? <div>Loading...</div> : <DataGrid data={reoffendersResults} columns={[
                { key: 'ArrestRecordName', name: 'Arrest Name' },
                { key: 'ArrestCharge', name: 'Arrest Charge' },
                { key: 'OriginalOffenses', name: 'Original Offenses' },
                { key: 'OffenderNumbers', name: 'Offender #s' },
                { key: 'event_time', name: 'Event Time' }
              ]}
              />
              }
            </Tab>
          </Tabs>
        </div>
      </div>
    </div>
  )
}