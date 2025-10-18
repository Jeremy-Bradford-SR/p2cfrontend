const express = require('express')
const axios = require('axios')
const NodeCache = require('node-cache')
const bodyParser = require('body-parser')
const cors = require('cors')

const app = express()
app.use(cors())
// accept JSON objects and primitives (we allow a JSON string body containing the SQL)
app.use(bodyParser.json({ strict: false }))

// simple request logger
app.use((req,res,next)=>{
  console.log(new Date().toISOString(), req.method, req.originalUrl)
  next()
})

// health
app.get('/health', (req,res)=> res.json({ok:true}))

const API_BASE = 'http://192.168.0.43:8083/api/data'
const cache = new NodeCache({stdTTL: 60*60*24, checkperiod:120}) // 1 day TTL for geocoding

// UTM to lat/lon conversion for Zone 18N (approximate)
function utmToLatLon(easting, northing, zone=18, northernHemisphere=true){
  // ported from common formulas — adequate for small-scale conversion
  const a = 6378137.0
  const e = 0.0818191908
  const k0 = 0.9996
  const x = easting - 500000.0
  const y = northernHemisphere ? northing : northing - 10000000.0
  const m = y / k0
  const mu = m / (a * (1 - Math.pow(e,2)/4 - 3*Math.pow(e,4)/64 - 5*Math.pow(e,6)/256))
  const e1 = (1 - Math.sqrt(1 - e*e)) / (1 + Math.sqrt(1 - e*e))
  const j1 = (3*e1/2 - 27*Math.pow(e1,3)/32)
  const j2 = (21*Math.pow(e1,2)/16 - 55*Math.pow(e1,4)/32)
  const j3 = (151*Math.pow(e1,3)/96)
  const j4 = (1097*Math.pow(e1,4)/512)
  const fp = mu + j1*Math.sin(2*mu) + j2*Math.sin(4*mu) + j3*Math.sin(6*mu) + j4*Math.sin(8*mu)
  const eSq = e*e / (1 - e*e)
  const c1 = eSq * Math.pow(Math.cos(fp),2)
  const t1 = Math.pow(Math.tan(fp),2)
  const r1 = a * (1 - e*e) / Math.pow(1 - Math.pow(e*Math.sin(fp),2), 1.5)
  const n1 = a / Math.sqrt(1 - Math.pow(e*Math.sin(fp),2))
  const d = x / (n1 * k0)
  const q1 = n1*Math.tan(fp)/r1
  const q2 = (Math.pow(d,2)/2)
  const q3 = (5 + 3*t1 + 10*c1 - 4*Math.pow(c1,2) - 9*eSq) * Math.pow(d,4)/24
  const q4 = (61 + 90*t1 + 298*c1 + 45*Math.pow(t1,2) - 252*eSq - 3*Math.pow(c1,2)) * Math.pow(d,6)/720
  const lat = fp - q1*(q2 - q3 + q4)
  const q5 = d
  const q6 = (1 + 2*t1 + c1) * Math.pow(d,3)/6
  const q7 = (5 - 2*c1 + 28*t1 - 3*Math.pow(c1,2) + 8*eSq + 24*Math.pow(t1,2)) * Math.pow(d,5)/120
  const lon = (d - q6 + q7)/Math.cos(fp)
  const lonOrigin = (zone - 1)*6 - 180 + 3
  return {lat: lat * 180/Math.PI, lon: lonOrigin + lon * 180/Math.PI}
}

function sanitizeIdentifier(id){
  if(!id) return ''
  if(/[^a-zA-Z0-9_\.]/.test(id)) throw new Error('Invalid identifier')
  return id
}

app.get('/tables', async (req,res)=>{
  try{
    console.log('fetching tables from', `${API_BASE}/tables`)
    const r = await axios.get(`${API_BASE}/tables`)
    console.log('tables status', r.status)
    res.json(r.data)
  }catch(e){
    res.status(502).json({error: e.message})
  }
})

app.get('/schema', async (req,res)=>{
  try{
    const table = req.query.table
    sanitizeIdentifier(table)
    console.log('fetching schema for', table)
    const r = await axios.get(`${API_BASE}/schema?table=${encodeURIComponent(table)}`)
    res.json(r.data)
  }catch(e){
    res.status(502).json({error: e.message})
  }
})

// Proxy for /query but enforce SELECT only
app.post('/query', async (req,res)=>{
  try{
    // normalize incoming body: accept either a JSON string primitive or an object with { sql: '...' }
    let sql = null
    if(typeof req.body === 'string') sql = req.body
    else if(req.body && typeof req.body.sql === 'string') sql = req.body.sql
    else return res.status(400).json({error:'SQL must be provided as a JSON string or {sql:"..."}'})

    const s = sql.trim().toUpperCase()
    if(!s.startsWith('SELECT')){
      return res.status(400).json({error:'Only SELECT queries allowed'})
    }
    // forward the SQL string to upstream as a JSON string
    console.log('forwarding query to API. SQL:', sql)
    const r = await axios.post(`${API_BASE}/query`, JSON.stringify(sql), {headers:{'Content-Type':'application/json'}})
    console.log('upstream query status', r.status)
    res.status(r.status).json(r.data)
  }catch(e){
    if(e.response) return res.status(e.response.status).json({error:e.response.data || e.response.statusText})
    res.status(502).json({error: e.message})
  }
})

// Geocode endpoint using Nominatim with cache
app.get('/geocode', async (req,res)=>{
  const q = req.query.q
  if(!q) return res.status(400).json({error:'q query required'})
  const key = `geo:${q}`
  const cached = cache.get(key)
  if(cached) return res.json(cached)
  try{
    const r = await axios.get('https://nominatim.openstreetmap.org/search', {params:{q, format:'json', limit:1, addressdetails:0}, headers:{'User-Agent':'p2c-frontend'}})
    const out = r.data && r.data[0] ? {lat: r.data[0].lat, lon: r.data[0].lon} : null
    cache.set(key, out)
    res.json(out)
  }catch(e){
    res.status(502).json({error:e.message})
  }
})

// Combined endpoint: fetch both tables, join geocoded coords for DailyBulletinArrests then return combined data
app.get('/incidents', async (req,res)=>{
  try{
    // params: limit, distanceKm, centerLat, centerLng, dateFrom, dateTo
    const {limit=100, distanceKm, centerLat, centerLng, dateFrom, dateTo} = req.query
  // fetch recent cadHandler and DailyBulletinArrests rows (use provided limit)
  const lim = Number(limit) || 100
  console.log(`fetching cadHandler from API (TOP ${lim} recent)`)
  const cadR = await axios.post(`${API_BASE}/query`, JSON.stringify(`SELECT TOP ${lim} * FROM cadHandler ORDER BY starttime DESC`), {headers:{'Content-Type':'application/json'}})
  let cadRows = cadR.data && cadR.data.data ? cadR.data.data : []
  console.log(`fetching DailyBulletinArrests from API (TOP ${lim} recent)`)
  const dbR = await axios.post(`${API_BASE}/query`, JSON.stringify(`SELECT TOP ${lim} * FROM DailyBulletinArrests ORDER BY event_time DESC`), {headers:{'Content-Type':'application/json'}})
  const dbRows = dbR.data && dbR.data.data ? dbR.data.data : []

    // geocode dbRows locations (cached)
  const geocoded = await Promise.all(dbRows.map(async row=>{
      if(row.geox && row.geoy) return {...row, geox:row.geox, geoy:row.geoy}
      if(!row.location) return row
      const key = `geo:${row.location}`
      let g = cache.get(key)
      if(!g){
        try{
          const r = await axios.get('https://nominatim.openstreetmap.org/search', {params:{q: row.location, format:'json', limit:1}, headers:{'User-Agent':'p2c-frontend'}})
          g = r.data && r.data[0] ? {lat: Number(r.data[0].lat), lon: Number(r.data[0].lon)} : null
          cache.set(key,g)
          console.log('geocoded', row.location, '=>', g)
        }catch(e){
          g = null
        }
      }
      return {...row, geox: g ? g.lon : null, geoy: g ? g.lat : null, lat: g ? g.lat : null, lon: g ? g.lon : null}
    }))

    let combined = []
    // convert cadHandler geox/geoy (UTM) to lat/lon if present
    cadRows = cadRows.map(r=>{
      const geox = r.geox || r.Geox || null
      const geoy = r.geoy || r.Geoy || null
      if(geox && geoy){
        try{
          const c = utmToLatLon(Number(geox), Number(geoy), 18, true)
          return {...r, lat: c.lat, lon: c.lon}
        }catch(e){
          return r
        }
      }
      return r
    })

    combined = combined.concat(cadRows.map(r=>({...r, _source:'cadHandler'})))
    combined = combined.concat(geocoded.map(r=>({...r, _source:'DailyBulletinArrests'})))

    // optional server-side distance filtering (if provided)
    if(distanceKm && centerLat && centerLng){
      const dKm = Number(distanceKm)
      const lat0 = Number(centerLat)
      const lon0 = Number(centerLng)
      function haversine(lat1,lon1,lat2,lon2){
        const R = 6371
        const toRad = v=> v * Math.PI / 180
        const dLat = toRad(lat2-lat1)
        const dLon = toRad(lon2-lon1)
        const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        return R * c
      }
      combined = combined.filter(r=> r.geox && r.geoy && haversine(lat0, lon0, Number(r.geoy), Number(r.geox)) <= dKm)
    }

    res.json({data:combined})
  }catch(e){
    res.status(502).json({error:e.message})
  }
})

const port = process.env.PORT || 9000
app.listen(port, ()=> console.log('Proxy listening on', port))
