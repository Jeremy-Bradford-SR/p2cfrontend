import axios from 'axios'

// Use same-origin API path; nginx will reverse-proxy /api to the proxy service in docker-compose
const PROXY = '/api'

function sanitizeIdentifier(id){
  if(!id) return ''
  if(/[^a-zA-Z0-9_\.]/.test(id)) throw new Error('Invalid identifier')
  return id
}

// Quote identifier parts for SQL Server-style identifiers, e.g. key -> [key], schema.table -> [schema].[table]
function quoteIdentifier(id){
  if(!id) return ''
  // allow dot separated parts
  return id.split('.').map(part=>{
    sanitizeIdentifier(part)
    return `[${part}]`
  }).join('.')
}

function sanitizeOrderBy(orderBy) {
  if (!orderBy) return '';
  // Allow column names (including dots), spaces, commas, and ASC/DESC keywords
  if (/[^a-zA-Z0-9_\.\s,DESCASC]/i.test(orderBy)) throw new Error('Invalid orderBy clause');
  return orderBy;
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
  const t = quoteIdentifier(table)
  let cols = '*'
  if(columns && columns.length>0){
    cols = columns.map(c=>quoteIdentifier(c)).filter(Boolean).join(', ')
  }else if(schema && Array.isArray(schema)){
    const good = schema.filter(c=>!c.skippable).map(c=>quoteIdentifier(c.name)).filter(Boolean)
    if(good.length>0) cols = good.join(', ')
  }
  const lim = Math.min(limit || 100, 1000)
  const where = filters ? ` WHERE ${filters}` : ''
  const sql = `SELECT TOP ${lim} ${cols} FROM ${t}${where}`
  return sql
}

async function queryTable({table, columns, limit=100, filters='', orderBy=''}){
  try{
    sanitizeIdentifier(table)
    // fetch schema first
  const schemaRes = await axios.get(`${PROXY}/schema?table=${encodeURIComponent(table)}`)
    if(schemaRes.status>=400) return {success:false, request:{method:'GET', url:`${PROXY}/schema?table=${table}`}, response:{status:schemaRes.status, text:schemaRes.data}}
    const schema = schemaRes.data
  // build columns excluding skippable
    let colsToUse = columns
    if(!colsToUse || colsToUse.length===0){
      colsToUse = schema.filter(c=>!c.skippable).map(c=>c.name)
    }else{
      // filter out skippable requested columns
      colsToUse = colsToUse.filter(c=>!(schema.find(s=>s.name===c) || {}).skippable)
    }
  // quote column identifiers to handle reserved words (e.g. key) and remove any empty entries
  colsToUse = colsToUse.map(c => quoteIdentifier(c)).filter(Boolean)
    let sql
      const t = quoteIdentifier(table)
    if(!colsToUse || colsToUse.length===0){
      sql = `SELECT TOP ${Math.min(limit,1000)} * FROM ${t}`
    }else{
      const colsList = colsToUse.join(', ')
      // final guard: if colsList is empty, fall back to *
      if(!colsList.trim()){
        sql = `SELECT TOP ${Math.min(limit,1000)} * FROM ${t}`
      }else{
        sql = `SELECT TOP ${Math.min(limit,1000)} ${colsList} FROM ${t}`
      }
    }
    if(filters) sql += ` WHERE ${filters}`
    if(orderBy) {
      const safeOrderBy = sanitizeOrderBy(orderBy);
      sql += ` ORDER BY ${safeOrderBy}`
    }

  const url = `${PROXY}/query`
  const body = { sql }
  const r = await axios.post(url, body, {headers:{'Content-Type':'application/json'}})
    return {success:true, request:{method:'POST', url, payload:sql}, response:{status:r.status, data:r.data}}
  }catch(e){
    return {success:false, request:{method:'POST', url:`${PROXY}/query`, payload:columns||null}, response:{error:e.message}}
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
  if(opts.filters) params.set('filters', opts.filters)
  try{
    const r = await axios.get(`${PROXY}/incidents?${params.toString()}`)
    return {success:true, request:{method:'GET', url:`${PROXY}/incidents?${params.toString()}`}, response:{status:r.status, data:r.data}}
  }catch(e){
    return {success:false, request:{method:'GET', url:`${PROXY}/incidents`}, response:{error:e.message}}
  }
}

async function proximitySearch({ address, days, nature, distance }) {
  try {
    const params = new URLSearchParams();
    if (address) params.set('address', address);
    if (days) params.set('days', days);
    if (nature) params.set('nature', nature);
    if (distance) params.set('distance', distance);
    const url = `${PROXY}/proximity?${params.toString()}`;
    const r = await axios.get(url);
    return { success: true, request: { method: 'GET', url }, response: { status: r.status, data: r.data } };
  } catch (e) {
    return { success: false, request: { method: 'GET', url: `${PROXY}/proximity` }, response: { error: e.message, data: e.response?.data } };
  }
}

async function getReoffenders() {
  const sql = `
SELECT
    TOP 50
    A.name AS ArrestRecordName,
    A.charge AS ArrestCharge,
    
    -- Correlated Subquery for Original Offenses:
    -- Finds all unique offenses associated with the offender's name
    (SELECT 
        STRING_AGG(T3.Offense, ', ') WITHIN GROUP (ORDER BY T3.Offense)
     FROM 
        dbo.Offender_Summary AS T1
     JOIN 
        (SELECT DISTINCT OffenderNumber, Offense FROM dbo.Offender_Detail WHERE Offense IS NOT NULL) AS T3 
        ON T1.OffenderNumber = T3.OffenderNumber
     WHERE 
        T1.Name = S.Name -- Links to the 'S.Name' from the outer query
    ) AS OriginalOffenses,

    -- Correlated Subquery for Offender Numbers:
    -- Finds all unique offender numbers associated with the offender's name
    (SELECT 
        STRING_AGG(T2.OffenderNumber, ', ') WITHIN GROUP (ORDER BY T2.OffenderNumber)
     FROM 
        (SELECT DISTINCT Name, OffenderNumber FROM dbo.Offender_Summary) AS T2
     WHERE 
        T2.Name = S.Name -- Links to the 'S.Name' from the outer query
    ) AS OffenderNumbers,
    
    A.name AS ArrestRecordName,
    A.event_time
FROM
    dbo.DailyBulletinArrests AS A
INNER JOIN
    dbo.Offender_Summary AS S ON S.Name = CONCAT_WS(' ', A.firstname, A.middlename, A.lastname)
GROUP BY 
    A.name,
    A.charge,
    A.event_time,
    S.Name -- S.Name must be in GROUP BY because it's used in the subqueries
ORDER BY 
    A.event_time DESC;
      `;
  return rawQuery(sql);
}

export default {listTables, getSchema, queryTable, getIncidents, rawQuery, getReoffenders, proximitySearch}

// also export individually
export { getIncidents, getReoffenders, proximitySearch }

// Run a raw SQL query string via the proxy /query endpoint. Caller must supply a full SELECT.
async function rawQuery(sql){
  try{
    if(!sql || typeof sql !== 'string') throw new Error('sql must be a string')
    // Basic safety: only allow SELECT queries
    if(!/^[\s]*select/i.test(sql)) throw new Error('Only SELECT queries are allowed')
    const url = `${PROXY}/query`
    const r = await axios.post(url, { sql }, { headers: {'Content-Type':'application/json'} })
    return { success: true, request: { method: 'POST', url, payload: sql }, response: { status: r.status, data: r.data } }
  }catch(e){
    return { success: false, request: { method: 'POST', url: `${PROXY}/query`, payload: sql }, response: { error: e.message } }
  }
}

export { rawQuery }
