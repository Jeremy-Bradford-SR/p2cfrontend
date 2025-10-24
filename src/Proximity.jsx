import React, { useState, useEffect, useRef } from 'react';
import api, { rawQuery, proximitySearch } from './client';
import DataGrid from './DataGrid';
import MapView from './MapView';

const Proximity = () => {
  const [address, setAddress] = useState('');
  const [days, setDays] = useState(7);
  const [distance, setDistance] = useState(1000);
  const [nature, setNature] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mapRef = useRef(null);
  const [mapPoints, setMapPoints] = useState([]);

  // On component mount, fetch a default set of results using the provided query.
  useEffect(() => {
    const fetchDefaultResults = async () => {
      setLoading(true);
      setError('');
      const defaultSql = `
        SELECT TOP 50 id, starttime, closetime, agency, service, nature, address, geox, geoy,
               SQRT(POWER(CAST(geox AS FLOAT) - 5683042.00, 2) + POWER(CAST(geoy AS FLOAT) - 3662363.00, 2)) AS distance_ft
        FROM cadHandler
        WHERE SQRT(POWER(CAST(geox AS FLOAT) - 5683042.00, 2) + POWER(CAST(geoy AS FLOAT) - 3662363.00, 2)) <= 1000
          AND starttime >= '2025-09-28 00:00:00'
        ORDER BY starttime DESC, distance_ft ASC;
      `;
      const res = await rawQuery(defaultSql);
      if (res.success) {
        const data = res.response.data.data || [];
        setResults(data);
        setMapPoints(res.response.data.data || []);
      } else {
        setError('Failed to load default proximity results.');
      }
      setLoading(false);
    };
    fetchDefaultResults();
  }, []);

  const handleSearch = async () => {
    if (!address) {
      setError('Please enter an address.');
      return;
    }
    setLoading(true);
    setError('');
    setResults([]);

    const res = await api.proximitySearch({ address, days, nature, distance });

    if (res.success) {
      const data = res.response.data.data || [];
      setResults(data);
      setMapPoints(data);
      if (data.length === 0) {
        setError('No results found for that address and time frame.');
      }
    } else {
      console.error('Proximity search failed', res.response);
      setError(res.response?.data?.error || res.response?.error || 'An unknown error occurred.');
    }
    setLoading(false);
  };

  function zoomToRow(r) {
    if (mapRef.current && r.lat && r.lon) mapRef.current.setView([Number(r.lat), Number(r.lon)], 16);
  }

  const columns = [
    { key: 'starttime', name: 'Start Time' },
    { key: 'nature', name: 'Nature' },
    { key: 'address', name: 'Address' },
    { key: 'distance_ft', name: 'Distance (ft)' },
    { key: 'agency', name: 'Agency' },
  ];

  return (
    <div>
      <div style={{ height: '360px' }}>
        <MapView ref={mapRef} points={mapPoints} zoomTo={zoomToRow} />
      </div>
      <div style={{ padding: '1.5rem' }}>
        <h3>Proximity Search</h3>
        <p>Find incidents near an address.</p>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address"
            style={{ flex: '2 1 200px', padding: '0.75rem' }}
          />
          <input
            type="text"
            value={nature}
            onChange={(e) => setNature(e.target.value)}
            placeholder="Nature (optional)"
            style={{ flex: '1 1 150px', padding: '0.75rem' }}
          />
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            placeholder="Distance (ft)"
            style={{ flex: '1 1 100px', padding: '0.75rem' }}
          />
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ flex: '1 1 150px', padding: '0.75rem' }}
          >
            <option value={1}>Last 24 hours</option>
            <option value={3}>Last 3 days</option>
            <option value={5}>Last 5 days</option>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={21}>Last 21 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button onClick={handleSearch} disabled={loading} style={{ padding: '0.75rem 1.5rem' }}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
        {loading && <div>Loading results...</div>}
        {!loading && results.length > 0 && <DataGrid data={results} columns={columns} onRowClick={zoomToRow} />}
      </div>
    </div>
  );
};

export default Proximity;