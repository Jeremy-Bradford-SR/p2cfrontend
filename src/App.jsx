import React, { useEffect, useState } from 'react'
import MapView from './MapView'
import DataGrid from './DataGrid'
import Charts from './Charts'
import api, { getIncidents } from './client'

export default function App(){
  const [tables, setTables] = useState([])
  // we query both tables by default; table selector removed
  const [selectedTable, setSelectedTable] = useState('')
  const [schema, setSchema] = useState(null)
  const [data, setData] = useState([])
  const [mapPoints, setMapPoints] = useState([])
  const [limit, setLimit] = useState(100)
  const [cadLimit, setCadLimit] = useState(20)
  const [arrestLimit, setArrestLimit] = useState(20)
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
  const [columnFilters, setColumnFilters] = useState({})
  const mapRef = React.useRef(null)
  const [chartsVisible, setChartsVisible] = useState(false)
  const [crimeLimit, setCrimeLimit] = useState(20)

  useEffect(()=>{
    // on mount: load per-table data from server using server-side queries
    (async () => {
      setLoading(true)
      try{
        let whereParts = []
        if(columnFilters.nature) whereParts.push(`nature = '${String(columnFilters.nature).replace(/'/g,"''")}'`)
        if(columnFilters.charge) whereParts.push(`charge = '${String(columnFilters.charge).replace(/'/g,"''")}'`)
        if(columnFilters.location) whereParts.push(`location = '${String(columnFilters.location).replace(/'/g,"''")}'`)
        if(dateFrom) whereParts.push(`starttime >= '${dateFrom}'`)
        if(dateTo) whereParts.push(`starttime <= '${dateTo}'`)
        if(filters) whereParts.push(`(${filters})`)
        const combinedFilters = whereParts.join(' AND ')

        // query CAD and Arrests and Crime (Crime is derived from DailyBulletinArrests selecting key)
        const arrColumns = ['charge','name','crime','location','event_time']
        const crimeColumns = ['charge','name','crime','location','time']
        const [cadRes, arrRes, crimeRes] = await Promise.all([
          api.queryTable({table: 'cadHandler', limit: cadLimit, filters: combinedFilters}),
          api.queryTable({table: 'DailyBulletinArrests', columns: arrColumns, limit: arrestLimit, filters: combinedFilters}),
          api.queryTable({table: 'DailyBulletinArrests', columns: crimeColumns, limit: crimeLimit, filters: combinedFilters})
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
        // also fetch geocoded/converted points for the map (proxy /incidents does UTM->lat/lon and geocoding)
        try{
          const fetchLimit = Math.max(limit || 0, cadLimit || 0, arrestLimit || 0, crimeLimit || 0)
          const geoRes = await getIncidents({limit: fetchLimit, distanceKm, centerLat, centerLng, dateFrom, dateTo})
          const geoRows = geoRes && geoRes.response && geoRes.response.data && geoRes.response.data.data ? geoRes.response.data.data : []
          setMapPoints(geoRows)
        }catch(e){
          console.warn('failed to fetch geocoded incidents for map', e)
          setMapPoints([])
        }
        setCadResults(cadRows)
        setArrestResults(arrRows)
        setCrimeResults(crimeRows)
      }catch(err){
        console.error('Error fetching per-table data on startup', err)
      }
      setLoading(false)
    })()
  },[])

  // when limits change, re-slice existing data into panels
  useEffect(()=>{
    if(!results) return
    const cadAll = results.filter(x=> (String(x._source||x.source||'').toLowerCase().includes('cadh')) || x._source==='cadHandler')
    const arrestsAll = results.filter(x=> (String(x._source||x.source||'').toLowerCase().includes('daily')) || x._source==='DailyBulletinArrests')
    const crimesAll = results.filter(x=> x._source === 'Crime')
    setCadResults(cadAll.slice(0, cadLimit))
    setArrestResults(arrestsAll.slice(0, arrestLimit))
    setCrimeResults(crimesAll.slice(0, crimeLimit))
  },[cadLimit, arrestLimit, crimeLimit, results])

  async function loadSchema(table){
    setLoading(true)
    const res = await api.getSchema(table)
    if(res.success){
      setSchema(res.response.data)
    }
    setLoading(false)
  }

  async function runQuery(){
    setLoading(true)
    // build combined filters respecting user's fragment and date/distance fields
    let whereParts = []
    // quick column-filters (excel-like)
    if(columnFilters.nature) whereParts.push(`nature = '${String(columnFilters.nature).replace(/'/g,"''")}'`)
    if(columnFilters.charge) whereParts.push(`charge = '${String(columnFilters.charge).replace(/'/g,"''")}'`)
    if(columnFilters.location) whereParts.push(`location = '${String(columnFilters.location).replace(/'/g,"''")}'`)
    if(dateFrom) whereParts.push(`starttime >= '${dateFrom}'`)
    if(dateTo) whereParts.push(`starttime <= '${dateTo}'`)
    if(filters) whereParts.push(`(${filters})`)

    const combined = whereParts.join(' AND ')

    // perform server-side per-table queries
    try{
      const [cadRes, arrRes, crimeRes] = await Promise.all([
        api.queryTable({table: 'cadHandler', limit: cadLimit, filters: combined}),
        api.queryTable({table: 'DailyBulletinArrests', limit: arrestLimit, filters: combined}),
        api.queryTable({table: 'DailyBulletinArrests', columns: ['key'], limit: crimeLimit, filters: combined})
      ])

      const cadRows = cadRes && cadRes.success && cadRes.response && cadRes.response.data && cadRes.response.data.data ? cadRes.response.data.data : []
      const arrRows = arrRes && arrRes.success && arrRes.response && arrRes.response.data && arrRes.response.data.data ? arrRes.response.data.data : []
      const crimeRaw = crimeRes && crimeRes.success && crimeRes.response && crimeRes.response.data && crimeRes.response.data.data ? crimeRes.response.data.data : []
      const crimeRows = crimeRaw.map(r => ({ ...r, _source: 'Crime', nature: 'LW', location: r.key || r.Key || JSON.stringify(r) }))

      const combinedRows = [...cadRows, ...arrRows, ...crimeRows]
      setData(combinedRows)
      setResults(combinedRows)
      setCadResults(cadRows)
      setArrestResults(arrRows)
      setCrimeResults(crimeRows)
      // refresh map points from proxy /incidents (which will geocode/convert)
      try{
        const fetchLimit = Math.max(limit || 0, cadLimit || 0, arrestLimit || 0, crimeLimit || 0)
        const geoRes = await getIncidents({limit: fetchLimit, distanceKm, centerLat, centerLng, dateFrom, dateTo})
        const geoRows = geoRes && geoRes.response && geoRes.response.data && geoRes.response.data.data ? geoRes.response.data.data : []
        setMapPoints(geoRows)
      }catch(err){
        console.warn('failed to refresh geocoded incidents for map', err)
        setMapPoints([])
      }
    }catch(e){
      console.error('runQuery per-table failed', e)
    }
    setLoading(false)
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

  return (
    <div className="app-container">
      <header className="header">
        <h1>Incidents Map — Dubuque, IA</h1>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <label style={{color:'white'}}>Limit</label>
          <input style={{width:80}} type="number" value={limit} min={1} max={1000} onChange={e => setLimit(Number(e.target.value))} />
          <label style={{color:'white'}}>CAD</label>
          <input style={{width:80}} type="number" value={cadLimit} min={1} max={1000} onChange={e => setCadLimit(Number(e.target.value))} />
          <label style={{color:'white'}}>Arrests</label>
          <input style={{width:80}} type="number" value={arrestLimit} min={1} max={1000} onChange={e => setArrestLimit(Number(e.target.value))} />
          <label style={{color:'white'}}>Crime</label>
          <input style={{width:80}} type="number" value={crimeLimit} min={1} max={1000} onChange={e => setCrimeLimit(Number(e.target.value))} />
          <button onClick={runQuery} disabled={loading} style={{marginLeft:6}}>Search</button>
          <button onClick={() => setChartsVisible(!chartsVisible)}>
            {chartsVisible ? 'Hide' : 'Show'} Charts
          </button>
        </div>
      </header>
      <div className="content-container">
        <div className="main-content">
          <section className="map-section">
            <div className="map-container">
              <MapView ref={mapRef} points={mapPoints} center={(centerLat && centerLng) ? [Number(centerLat), Number(centerLng)] : null} distanceKm={distanceKm ? Number(distanceKm) : null} zoomTo={pos => { if (mapRef.current && mapRef.current.flyTo) mapRef.current.flyTo(pos, 14) }} onAreaSelect={({ lat, lng, radius }) => {
                setCenterLat(lat);
                setCenterLng(lng);
                setDistanceKm(radius / 1000);
              }} />
            </div>
          </section>

          <section className="results-section">
            <h3>Results (total: {results.length})</h3>
            {loading && <div style={{ padding: 8, background: '#fffbe6', border: '1px solid #ffecb5' }}>Loading data...</div>}
            {!loading && results.length === 0 && <div style={{ padding: 8, background: '#fff1f0', border: '1px solid #ffd1d1' }}>No results to display — check API connectivity or adjust filters.</div>}

            <div className="results-grid three-columns" style={{display:'flex', gap:16}}>
              <div className="results-panel" style={{flex:1}}>
                <h4>CAD (showing {cadResults.length})</h4>
                <DataGrid data={cadResults} onRowClick={zoomToRow} />
              </div>
              <div className="results-panel" style={{flex:1}}>
                <h4>DailyBulletinArrests (showing {arrestResults.length})</h4>
                <DataGrid data={arrestResults} onRowClick={zoomToRow} columns={[{key:'charge',name:'Charge'},{key:'name',name:'Name'},{key:'crime',name:'Crime'},{key:'location',name:'Location'},{key:'event_time',name:'Event Time'}]} />
              </div>
              <div className="results-panel" style={{flex:1}}>
                <h4>Crime (showing {crimeResults.length})</h4>
                <DataGrid data={crimeResults} onRowClick={zoomToRow} columns={[{key:'charge',name:'Charge'},{key:'name',name:'Name'},{key:'crime',name:'Crime'},{key:'location',name:'Location'},{key:'time',name:'Time'}]} />
              </div>
            </div>
          </section>
          {chartsVisible && (
            <section className="charts-section">
              <Charts data={results} />
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
