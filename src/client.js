import axios from 'axios'

// Create an axios instance
const api = axios.create();

// Add a request interceptor to include the token in all requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('p2c-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Use same-origin API path; nginx will reverse-proxy /api to the proxy service in docker-compose
const PROXY = '/api'

function sanitizeIdentifier(id) {
  if (!id) return ''
  if (/[^a-zA-Z0-9_\.]/.test(id)) throw new Error('Invalid identifier')
  return id
}

// Quote identifier parts for SQL Server-style identifiers, e.g. key -> [key], schema.table -> [schema].[table]
function quoteIdentifier(id) {
  if (!id) return ''
  // allow dot separated parts
  return id.split('.').map(part => {
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
async function listTables() {
  try {
    const url = `/tables`
    const r = await api.get(`${PROXY}/tables`)
    return { success: true, request: { method: 'GET', url: `${PROXY}/tables` }, response: { status: r.status, data: r.data } }
  } catch (e) {
    return { success: false, request: { method: 'GET', url: `${PROXY}/tables` }, response: { error: e.message } }
  }
}

async function getSchema(table) {
  try {
    sanitizeIdentifier(table)
    const url = `${PROXY}/schema?table=${encodeURIComponent(table)}`
    const r = await api.get(url)
    return { success: true, request: { method: 'GET', url }, response: { status: r.status, data: r.data } }
  } catch (e) {
    return { success: false, request: { method: 'GET', url: `${PROXY}/schema?table=${table}` }, response: { error: e.message } }
  }
}

function buildSelectFromSchema(table, schema, columns, limit, filters) {
  // schema expected as array of {name,type,skippable?}
  const t = quoteIdentifier(table)
  let cols = '*'
  if (columns && columns.length > 0) {
    cols = columns.map(c => quoteIdentifier(c)).filter(Boolean).join(', ')
  } else if (schema && Array.isArray(schema)) {
    const good = schema.filter(c => !c.skippable).map(c => quoteIdentifier(c.name)).filter(Boolean)
    if (good.length > 0) cols = good.join(', ')
  }
  const lim = Math.min(limit || 100, 1000)
  const where = filters ? ` WHERE ${filters}` : ''
  const sql = `SELECT TOP ${lim} ${cols} FROM ${t}${where}`
  return sql
}

async function queryTable({ table, columns, limit = 100, filters = '', orderBy = '' }) {
  try {
    const params = new URLSearchParams({
      table,
      limit,
      filters,
      orderBy
    });
    if (columns && columns.length > 0) {
      params.set('columns', columns.join(','));
    }

    const url = `${PROXY}/query?${params.toString()}`;
    const r = await api.get(url);
    return { success: true, request: { method: 'GET', url }, response: { status: r.status, data: r.data } }
  } catch (e) {
    const errorUrl = `${PROXY}/query?table=${table}&limit=${limit}&filters=${filters}&orderBy=${orderBy}`;
    return { success: false, request: { method: 'GET', url: errorUrl }, response: { error: e.message } }
  }
}

async function getIncidents(opts = {}) {
  const params = new URLSearchParams()
  if (opts.cadLimit) params.set('cadLimit', opts.cadLimit);
  if (opts.arrestLimit) params.set('arrestLimit', opts.arrestLimit);
  if (opts.crimeLimit) params.set('crimeLimit', opts.crimeLimit);
  if (opts.distanceKm) params.set('distanceKm', opts.distanceKm)
  if (opts.centerLat) params.set('centerLat', opts.centerLat)
  if (opts.centerLng) params.set('centerLng', opts.centerLng)
  if (opts.dateFrom) params.set('dateFrom', opts.dateFrom)
  if (opts.dateTo) params.set('dateTo', opts.dateTo)
  if (opts.filters) params.set('filters', opts.filters)
  try {
    const r = await api.get(`${PROXY}/incidents?${params.toString()}`)
    return { success: true, request: { method: 'GET', url: `${PROXY}/incidents?${params.toString()}` }, response: { status: r.status, data: r.data } }
  } catch (e) {
    return { success: false, request: { method: 'GET', url: `${PROXY}/incidents` }, response: { error: e.message } }
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
    const r = await api.get(url);
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
    A.event_time,
    A.location
FROM
    dbo.DailyBulletinArrests AS A
INNER JOIN
    dbo.Offender_Summary AS S ON S.Name = CONCAT_WS(' ', A.firstname, A.middlename, A.lastname)
GROUP BY 
    A.name,
    A.charge,
    A.event_time,
    A.location,
    S.Name -- S.Name must be in GROUP BY because it's used in the subqueries
ORDER BY 
    A.event_time DESC;
      `;
  return rawQuery(sql);
}

async function getSexOffenders() {
  // Select top 100 for now to avoid overwhelming the map
  const sql = `
    SELECT TOP 100
      registrant_id,
      first_name,
      middle_name,
      last_name,
      address_line_1,
      city,
      lat,
      lon,
      photo_url,
      photo_data,
      tier
    FROM dbo.sexoffender_registrants
    WHERE lat IS NOT NULL AND lon IS NOT NULL
  `;
  return rawQuery(sql);
}

async function getCorrections() {
  const sql = `
    SELECT TOP 100
      S.OffenderNumber,
      S.Name,
      S.Gender,
      S.Age,
      S.DateScraped,
      D.Location,
      D.Offense
    FROM dbo.Offender_Summary AS S
    LEFT JOIN dbo.Offender_Detail AS D ON S.OffenderNumber = D.OffenderNumber
    ORDER BY S.DateScraped DESC
  `;
  return rawQuery(sql);
}

async function getDispatch() {
  const sql = `
    SELECT TOP 100
      IncidentNumber,
      AgencyCode,
      NatureCode,
      TimeReceived,
      LocationAddress,
      LocationLat,
      LocationLong
    FROM dbo.DispatchCalls
    ORDER BY TimeReceived DESC
  `;
  return rawQuery(sql);
}

async function getTraffic() {
  const sql = "SELECT TOP 100 [key], event_time, charge, name, location, id as event_number FROM dbo.DailyBulletinArrests WHERE [key] != 'AR' AND [key] != 'LW' ORDER BY event_time DESC";
  return rawQuery(sql);
}

// also export individually
export { getIncidents, getReoffenders, getSexOffenders, getCorrections, getDispatch, getTraffic, proximitySearch }

// Run a raw SQL query string via the proxy /query endpoint. Caller must supply a full SELECT.
async function rawQuery(sql) {
  try {
    if (!sql || typeof sql !== 'string') throw new Error('sql must be a string');
    // Basic safety: only allow SELECT queries
    if (!/^[\s]*select/i.test(sql)) throw new Error('Only SELECT queries are allowed');
    const params = new URLSearchParams({ sql });
    const url = `${PROXY}/rawQuery?${params.toString()}`;
    const r = await api.get(url);
    return { success: true, request: { method: 'GET', url }, response: { status: r.status, data: r.data } };
  } catch (e) {
    return { success: false, request: { method: 'GET', url: `${PROXY}/rawQuery?sql=${encodeURIComponent(sql)}` }, response: { error: e.message } };
  }
}

export { rawQuery };

export default { listTables, getSchema, queryTable, getIncidents, getReoffenders, getSexOffenders, getCorrections, getDispatch, getTraffic, proximitySearch, rawQuery };
