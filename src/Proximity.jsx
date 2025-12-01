import React, { useState, useEffect } from 'react';
import api from './client';
import MapWithData from './MapWithData';

const Proximity = () => {
  const [address, setAddress] = useState('');
  const [days, setDays] = useState(7);
  const [distance, setDistance] = useState(1000);
  const [nature, setNature] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      if (data.length === 0) {
        setError('No results found for that address and time frame.');
      }
    } else {
      console.error('Proximity search failed', res.response);
      setError(res.response?.data?.error || res.response?.error || 'An unknown error occurred.');
    }
    setLoading(false);
  };

  const columns = [
    { key: 'starttime', name: 'Start Time' },
    { key: 'nature', name: 'Nature' },
    { key: 'address', name: 'Address' },
    { key: 'distance_ft', name: 'Distance (ft)' },
    { key: 'agency', name: 'Agency' },
  ];

  return (
    <div>
      <div style={{ padding: '1.5rem', paddingBottom: '0.5rem' }}>
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
      </div>
      <MapWithData data={results} columns={columns} loading={loading} />
    </div>
  );
};

export default Proximity;