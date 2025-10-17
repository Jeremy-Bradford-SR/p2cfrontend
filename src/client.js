import axios from 'axios'

// Use same-origin API path; nginx will reverse-proxy /api to the proxy service in docker-compose
const PROXY = '/api'

function sanitizeIdentifier(id){
  if(!id) return ''
  if(/[^a-zA-Z0-9_\.]/.test(id)) throw new Error('Invalid identifier')
  return id
}

async function listTables(){
  try{
    const url = `/tables`
    const r = await axios.get(`${PROXY}/tables`)
    return {success:true, request:{method:'GET', url:`${PROXY}/tables`}, response:{status:r.status, data:r.data}}
  }catch(e){
    return {success:false, request:{method:'GET', url:`${PROXY}/tables`}, response:{error:e.message}}
  }
}

async function getSchema(table){
  try{
    sanitizeIdentifier(table)
    const url = `${PROXY}/schema?table=${encodeURIComponent(table)}`
    const r = await axios.get(url)
    return {success:true, request:{method:'GET', url}, response:{status:r.status, data:r.data}}
  }catch(e){
    return {success:false, request:{method:'GET', url:`${PROXY}/schema?table=${table}`}, response:{error:e.message}}
  }
}

function buildSelectFromSchema(table, schema, columns, limit, filters){
  // schema expected as array of {name,type,skippable?}
  const t = sanitizeIdentifier(table)
  let cols = '*'
  if(columns && columns.length>0){
    cols = columns.map(c=>sanitizeIdentifier(c)).join(', ')
  }else if(schema && Array.isArray(schema)){
    const good = schema.filter(c=>!c.skippable).map(c=>c.name)
    if(good.length>0) cols = good.join(', ')
  }
  const lim = Math.min(limit || 100, 1000)
  const where = filters ? ` WHERE ${filters}` : ''
  const sql = `SELECT TOP ${lim} ${cols} FROM ${t}${where}`
  return sql
}

async function queryTable({table, columns, limit=100, filters=''}){
  try{
    sanitizeIdentifier(table)
    // fetch schema first
  const schemaRes = await axios.get(`${PROXY}/schema?table=${encodeURIComponent(table)}`)
    if(schemaRes.status>=400) return {success:false, request:{method:'GET', url:`${BASE}/schema?table=${table}`}, response:{status:schemaRes.status, text:schemaRes.data}}
    const schema = schemaRes.data
  // build columns excluding skippable
    let colsToUse = columns
    if(!colsToUse || colsToUse.length===0){
      colsToUse = schema.filter(c=>!c.skippable).map(c=>c.name)
    }else{
      // filter out skippable requested columns
      colsToUse = colsToUse.filter(c=>!(schema.find(s=>s.name===c) || {}).skippable)
    }
    let sql
    const t = sanitizeIdentifier(table)
    if(colsToUse.length===0){
      sql = `SELECT TOP ${Math.min(limit,1000)} * FROM ${t}`
    }else{
      sql = `SELECT TOP ${Math.min(limit,1000)} ${colsToUse.join(', ')} FROM ${t}`
    }
    if(filters) sql += ` WHERE ${filters}`

    const url = `${PROXY}/query`
    const body = JSON.stringify(sql)
    const r = await axios.post(url, body, {headers:{'Content-Type':'application/json'}})
    return {success:true, request:{method:'POST', url, payload:sql}, response:{status:r.status, data:r.data}}
  }catch(e){
    return {success:false, request:{method:'POST', url:`${BASE}/query`, payload:columns||null}, response:{error:e.message}}
  }
}

async function getIncidents(opts={}){
  const params = new URLSearchParams()
  if(opts.limit) params.set('limit', opts.limit)
  if(opts.distanceKm) params.set('distanceKm', opts.distanceKm)
  if(opts.centerLat) params.set('centerLat', opts.centerLat)
  if(opts.centerLng) params.set('centerLng', opts.centerLng)
  if(opts.dateFrom) params.set('dateFrom', opts.dateFrom)
  if(opts.dateTo) params.set('dateTo', opts.dateTo)
  try{
    const r = await axios.get(`${PROXY}/incidents?${params.toString()}`)
    return {success:true, request:{method:'GET', url:`${PROXY}/incidents?${params.toString()}`}, response:{status:r.status, data:r.data}}
  }catch(e){
    return {success:false, request:{method:'GET', url:`${PROXY}/incidents`}, response:{error:e.message}}
  }
}

export default {listTables, getSchema, queryTable}
// add getIncidents to the exported API
export { getIncidents }
