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

async function getReoffenders(opts = {}) {
  const limit = opts.limit || 50;
  let where = '';
  if (opts.dateFrom) where += ` AND A.event_time >= '${opts.dateFrom.replace(/'/g, "''")}'`;
  if (opts.dateTo) where += ` AND A.event_time <= '${opts.dateTo.replace(/'/g, "''")}'`;

  const sql = `
SELECT
    TOP ${limit}
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
WHERE 1=1 ${where}
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

async function getSexOffenders(opts = {}) {
  const limit = opts.limit || 500;
  const sql = `
    SELECT 
      registrant_id,
      first_name,
      middle_name,
      last_name,
      address_line_1,
      city,
      state,
      postal_code,
      county,
      lat,
      lon,
      photo_url,
      photo_data,
      tier,
      gender,
      race,
      victim_minors,
      victim_adults,
      victim_unknown,
      registrant_cluster,
      last_changed
    FROM dbo.sexoffender_registrants
  `;
  return rawQuery(sql);
}

async function getCorrections(opts = {}) {
  const limit = opts.limit || 500;
  const sql = `
    SELECT 
      S.OffenderNumber,
      S.Name,
      S.Gender,
      S.Age,
      S.DateScraped,
      D.Location,
      D.Offense,
      D.CommitmentDate,
      D.TDD_SDD,
      C.SupervisionStatus,
      C.OffenseClass,
      C.CountyOfCommitment,
      C.EndDate
    FROM dbo.Offender_Summary AS S
    LEFT JOIN dbo.Offender_Detail AS D ON S.OffenderNumber = D.OffenderNumber
    LEFT JOIN dbo.Offender_Charges AS C ON S.OffenderNumber = C.OffenderNumber
    ORDER BY S.DateScraped DESC
  `;
  return rawQuery(sql);
}

async function getDispatch(opts = {}) {
  const limit = opts.limit || 100;
  let where = '';
  if (opts.dateFrom) where += ` WHERE TimeReceived >= '${opts.dateFrom.replace(/'/g, "''")}'`;
  if (opts.dateTo) where += ` ${where ? 'AND' : 'WHERE'} TimeReceived <= '${opts.dateTo.replace(/'/g, "''")}'`;

  const sql = `
    SELECT TOP ${limit}
      IncidentNumber,
      AgencyCode,
      NatureCode,
      TimeReceived,
      LocationAddress,
      LocationLat,
      LocationLong
    FROM dbo.DispatchCalls
    ${where}
    ORDER BY TimeReceived DESC
  `;
  return rawQuery(sql);
}

async function getTraffic(opts = {}) {
  const limit = opts.limit || 100;
  let where = "([key] != 'AR' AND [key] != 'LW')";
  if (opts.dateFrom) where += ` AND event_time >= '${opts.dateFrom.replace(/'/g, "''")}'`;
  if (opts.dateTo) where += ` AND event_time <= '${opts.dateTo.replace(/'/g, "''")}'`;

  const sql = `SELECT TOP ${limit} [key], event_time, charge, name, location, id as event_number FROM dbo.DailyBulletinArrests WHERE ${where} ORDER BY event_time DESC`;
  return rawQuery(sql);
}

async function getJailInmates() {
  const sql = `
    SELECT 
      i.book_id, 
      i.firstname, 
      i.lastname, 
      i.arrest_date, 
      i.released_date,
      i.age, 
      i.race, 
      i.sex, 
      i.total_bond_amount,
      STUFF((SELECT ', ' + charge_description FROM jail_charges WHERE book_id = i.book_id ORDER BY charge_description FOR XML PATH('')), 1, 2, '') as charges
    FROM jail_inmates i 
    ORDER BY i.arrest_date DESC
  `;
  return rawQuery(sql);
}

async function getJailImage(bookId) {
  const sql = `SELECT photo_data FROM jail_inmates WHERE book_id = '${bookId.replace(/'/g, "''")}'`;
  return rawQuery(sql);
}

// Search jail records by name (for matching violators to jail inmates)
async function getJailByName(firstName, lastName) {
  if (!firstName && !lastName) return { success: false, response: { error: 'Name is required' } };

  const conditions = [];
  if (firstName) conditions.push(`firstname LIKE '%${firstName.replace(/'/g, "''").trim()}%'`);
  if (lastName) conditions.push(`lastname LIKE '%${lastName.replace(/'/g, "''").trim()}%'`);

  const sql = `
    SELECT 
      i.book_id, 
      i.firstname, 
      i.lastname, 
      i.arrest_date, 
      i.released_date,
      i.age, 
      i.race, 
      i.sex, 
      i.total_bond_amount,
      STUFF((SELECT ', ' + charge_description FROM jail_charges WHERE book_id = i.book_id ORDER BY charge_description FOR XML PATH('')), 1, 2, '') as charges
    FROM jail_inmates i 
    WHERE ${conditions.join(' AND ')}
    ORDER BY i.arrest_date DESC
  `;
  return rawQuery(sql);
}

// Search arrests by name from DailyBulletinArrests
async function getArrestsByName(firstName, lastName) {
  if (!firstName && !lastName) return { success: false, response: { error: 'Name is required' } };

  const conditions = [];
  if (firstName) conditions.push(`firstname LIKE '%${firstName.replace(/'/g, "''").trim()}%'`);
  if (lastName) conditions.push(`lastname LIKE '%${lastName.replace(/'/g, "''").trim()}%'`);

  const sql = `
    SELECT TOP 20
      id, event_time, charge, name, firstname, lastname, location, [key]
    FROM dbo.DailyBulletinArrests
    WHERE ${conditions.join(' AND ')} AND [key] = 'AR'
    ORDER BY event_time DESC
  `;
  return rawQuery(sql);
}

// Search traffic records by name (TrafficCitations and TrafficAccidents)
async function getTrafficByName(firstName, lastName) {
  if (!firstName && !lastName) return { success: false, response: { error: 'Name required' } };

  const conditions = [];
  if (firstName) conditions.push(`firstname LIKE '%${firstName.replace(/'/g, "''").trim()}%'`);
  if (lastName) conditions.push(`lastname LIKE '%${lastName.replace(/'/g, "''").trim()}%'`);

  const sql = `
    SELECT TOP 20
      id, event_time, charge, name, firstname, lastname, location, [key]
    FROM dbo.DailyBulletinArrests
    WHERE ${conditions.join(' AND ')} AND ([key] = 'TC' OR [key] = 'TA')
    ORDER BY event_time DESC
  `;
  return rawQuery(sql);
}

// Search crime reports by name
async function getCrimeByName(firstName, lastName) {
  if (!firstName && !lastName) return { success: false, response: { error: 'Name required' } };

  const conditions = [];
  if (firstName) conditions.push(`firstname LIKE '%${firstName.replace(/'/g, "''").trim()}%'`);
  if (lastName) conditions.push(`lastname LIKE '%${lastName.replace(/'/g, "''").trim()}%'`);

  const sql = `
    SELECT TOP 20
      id, event_time, charge, name, firstname, lastname, location, [key]
    FROM dbo.DailyBulletinArrests
    WHERE ${conditions.join(' AND ')} AND [key] = 'LW'
    ORDER BY event_time DESC
  `;
  return rawQuery(sql);
}

// Comprehensive 360 search - searches ALL records by name (no limit)
async function search360(searchName) {
  if (!searchName || searchName.trim().length < 2) {
    return { success: false, response: { error: 'Search term must be at least 2 characters' } };
  }

  try {
    const params = new URLSearchParams({ q: searchName });
    const url = `${PROXY}/search360?${params.toString()}`;
    const r = await api.get(url);
    // The proxy returns { data: [...] }, and 'response.data' needs to be the axios response object structure expected by caller
    // The caller expects { response: { data: { data: [...] } } } roughly if following previous pattern?
    // Looking at other functions: return { success: true, response: { status: r.status, data: r.data } }
    // r.data from proxy is { data: [...] }
    return { success: true, request: { method: 'GET', url }, response: { status: r.status, data: r.data } };
  } catch (e) {
    return { success: false, request: { method: 'GET', url: `${PROXY}/search360` }, response: { error: e.message } };
  }
}

async function getDatabaseStats() {
  // Queries for DB size and oldest records in main tables
  const sizeSql = "SELECT SUM(size) * 8 / 1024 AS SizeMB FROM sys.master_files WHERE database_id = DB_ID()";
  const oldestCadSql = "SELECT MIN(starttime) as val FROM cadHandler";
  const oldestArrestSql = "SELECT MIN(event_time) as val FROM DailyBulletinArrests";

  try {
    const [sizeRes, cadRes, arrestRes] = await Promise.all([
      rawQuery(sizeSql),
      rawQuery(oldestCadSql),
      rawQuery(oldestArrestSql)
    ]);

    return {
      sizeMB: sizeRes.response?.data?.data?.[0]?.SizeMB || 0,
      oldestCad: cadRes.response?.data?.data?.[0]?.val,
      oldestArrest: arrestRes.response?.data?.data?.[0]?.val
    };
  } catch (e) {
    console.error("Failed to get DB stats", e);
    return { success: false, request: { method: 'GET', url: `${PROXY}/rawQuery` }, response: { error: e.message } };
  }
}

// Fetch complete offender record by OffenderNumber
async function getOffenderDetail(offenderNumber) {
  if (!offenderNumber) return { success: false, response: { error: 'OffenderNumber is required' } };

  const sanitized = String(offenderNumber).replace(/'/g, "''");

  // Get summary info
  const summarySql = `
    SELECT 
      OffenderNumber, Name, Gender, Age, DateScraped
    FROM dbo.Offender_Summary
    WHERE OffenderNumber = '${sanitized}'
  `;

  // Get detail info
  const detailSql = `
    SELECT 
      OffenderNumber, Location, Offense, TDD_SDD, CommitmentDate, RecallDate,
      InterviewDate, MandatoryMinimum, DecisionType, Decision, DecisionDate, EffectiveDate
    FROM dbo.Offender_Detail
    WHERE OffenderNumber = '${sanitized}'
  `;

  // Get all charges
  const chargesSql = `
    SELECT 
      ChargeID, OffenderNumber, SupervisionStatus, OffenseClass, CountyOfCommitment, EndDate
    FROM dbo.Offender_Charges
    WHERE OffenderNumber = '${sanitized}'
    ORDER BY EndDate DESC
  `;

  try {
    const [summaryRes, detailRes, chargesRes] = await Promise.all([
      rawQuery(summarySql),
      rawQuery(detailSql),
      rawQuery(chargesSql)
    ]);

    return {
      success: true,
      response: {
        summary: summaryRes.response?.data?.data?.[0] || null,
        detail: detailRes.response?.data?.data?.[0] || null,
        charges: chargesRes.response?.data?.data || []
      }
    };
  } catch (e) {
    return { success: false, response: { error: e.message } };
  }
}

// also export individually
export { getIncidents, getReoffenders, getSexOffenders, getCorrections, getDispatch, getTraffic, proximitySearch, getJailInmates, getJailImage, getDatabaseStats, getOffenderDetail, getJailByName, getArrestsByName, getTrafficByName, getCrimeByName, search360 }

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

export default { listTables, getSchema, queryTable, getIncidents, getReoffenders, getSexOffenders, getCorrections, getDispatch, getTraffic, proximitySearch, rawQuery, getJailInmates, getJailImage, getDatabaseStats, getOffenderDetail, getJailByName, getArrestsByName, getTrafficByName, getCrimeByName, search360 };
