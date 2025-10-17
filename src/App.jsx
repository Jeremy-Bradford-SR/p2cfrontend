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
  const [limit, setLimit] = useState(10)
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
  const [columnFilters, setColumnFilters] = useState({})
  const mapRef = React.useRef(null)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [chartsVisible, setChartsVisible] = useState(false)

  useEffect(()=>{
    // on mount: load combined incidents only. Assume tables exist on the server.
    (async () => {
      setLoading(true)
      try{
        const r = await getIncidents({limit})
        if(r && r.success){
          const list = r.response.data && r.response.data.data ? r.response.data.data : []
          setData(list)
          setResults(list)
          // split results into cadHandler and DailyBulletinArrests
          const cad = list.filter(x=> (String(x._source||x.source||'').toLowerCase().includes('cadh')) || x._source==='cadHandler')
          const arrests = list.filter(x=> (String(x._source||x.source||'').toLowerCase().includes('daily')) || x._source==='DailyBulletinArrests')
          setCadResults(cad)
          setArrestResults(arrests)
        }else{
          console.error('getIncidents failed', r)
        }
      }catch(err){
        console.error('Error fetching incidents on startup', err)
      }
      setLoading(false)
    })()
  },[])

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

    // query combined incidents endpoint (proxy will apply filters server-side if supported)
    const res = await api.getIncidents({limit, distanceKm, centerLat, centerLng, dateFrom, dateTo})
    if(res.success){
      const list = res.response.data && res.response.data.data ? res.response.data.data : []
      // apply client-side quick filters to the returned list (in case proxy doesn't support them)
      let filtered = list
      if(columnFilters.nature) filtered = filtered.filter(x=>String(x.nature||'').toLowerCase() === String(columnFilters.nature).toLowerCase())
      if(columnFilters.charge) filtered = filtered.filter(x=>String(x.charge||'').toLowerCase() === String(columnFilters.charge).toLowerCase())
      if(columnFilters.location) filtered = filtered.filter(x=>String(x.location||'').toLowerCase() === String(columnFilters.location).toLowerCase())
      if(dateFrom) filtered = filtered.filter(x=> { try{ return new Date(x.starttime) >= new Date(dateFrom) }catch(e){return true}})
      if(dateTo) filtered = filtered.filter(x=> { try{ return new Date(x.starttime) <= new Date(dateTo) }catch(e){return true}})

      setData(filtered)
      setResults(filtered)
      const cad = filtered.filter(x=> (String(x._source||x.source||'').toLowerCase().includes('cadh')) || x._source==='cadHandler')
      const arrests = filtered.filter(x=> (String(x._source||x.source||'').toLowerCase().includes('daily')) || x._source==='DailyBulletinArrests')
      setCadResults(cad)
      setArrestResults(arrests)
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

  return (
    <div className="app-container">
      <header className="header">
        <h1>Incidents Map — Dubuque, IA</h1>
        <div>
          <button onClick={() => setSidebarVisible(!sidebarVisible)}>
            {sidebarVisible ? 'Hide' : 'Show'} Controls
          </button>
          <button onClick={() => setChartsVisible(!chartsVisible)}>
            {chartsVisible ? 'Hide' : 'Show'} Charts
          </button>
        </div>
      </header>
      <div className="content-container">
        {sidebarVisible && (
          <div className="sidebar">
            <div className="controls">
              {/* table selector removed — both tables are queried by default */}

              <label>Limit</label>
              <input type="number" value={limit} min={1} max={1000} onChange={e => setLimit(Number(e.target.value))} />

              <label>Filters (quick, built from returned data)</label>
              <div>
                <small>Choose values to filter. These lists are built from the most-recent results.</small>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <select value={columnFilters.nature || ''} onChange={e => setColumnFilters({ ...columnFilters, nature: e.target.value })}>
                    <option value="">Nature (all)</option>
                    {[...new Set(data.map(d => d.nature).filter(Boolean))].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select value={columnFilters.charge || ''} onChange={e => setColumnFilters({ ...columnFilters, charge: e.target.value })}>
                    <option value="">Charge (all)</option>
                    {[...new Set(data.map(d => d.charge).filter(Boolean))].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select value={columnFilters.location || ''} onChange={e => setColumnFilters({ ...columnFilters, location: e.target.value })}>
                    <option value="">Location (all)</option>
                    {[...new Set(data.map(d => d.location).filter(Boolean))].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div style={{ marginTop: 8 }}>
                  <label>Free-form SQL fragment (advanced)</label>
                  <input value={filters} onChange={e => setFilters(e.target.value)} placeholder="e.g. starttime >= '2025-01-01'" />
                </div>
              </div>

              <div className="date-row">
                <div>
                  <label>Date from</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <label>Date to</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>

              <h4>Distance filter (optional)</h4>
              <div className="coord-row">
                <div>
                  <label>Center lat</label>
                  <input value={centerLat} onChange={e => setCenterLat(e.target.value)} placeholder="42.5" />
                </div>
                <div>
                  <label>Center lng</label>
                  <input value={centerLng} onChange={e => setCenterLng(e.target.value)} placeholder="-90.7" />
                </div>
                <div>
                  <label>Distance (km)</label>
                  <input value={distanceKm} onChange={e => setDistanceKm(e.target.value)} placeholder="5" />
                </div>
              </div>

              <div className="actions">
                <button onClick={runQuery} disabled={loading}>Run Query</button>
              </div>
            </div>
          </div>
        )}
        <div className="main-content">
          <section className="map-section">
            <div className="map-container">
              <MapView ref={mapRef} points={data} center={(centerLat && centerLng) ? [Number(centerLat), Number(centerLng)] : null} distanceKm={distanceKm ? Number(distanceKm) : null} zoomTo={pos => { if (mapRef.current && mapRef.current.flyTo) mapRef.current.flyTo(pos, 14) }} onAreaSelect={({ lat, lng, radius }) => {
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

            <div className="results-grid">
              <DataGrid data={results} onRowClick={zoomToRow} />
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
