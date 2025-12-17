
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { searchP2C } from './client';
import SplitView from './SplitView';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom red icon for user location
const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});


// Reuse typeStyles from View360 or define new ones
const typeStyles = {
    'AR': { bg: '#fef2f2', border: '#dc2626', badge: '#dc2626', text: '#991b1b', label: '🚔 Arrest' },
    'LW': { bg: '#f5f3ff', border: '#7c3aed', badge: '#7c3aed', text: '#5b21b6', label: '📋 Crime' },
    'TC': { bg: '#fffbeb', border: '#f59e0b', badge: '#f59e0b', text: '#b45309', label: '🚗 Citation' },
    'TA': { bg: '#fff7ed', border: '#ea580c', badge: '#ea580c', text: '#c2410c', label: '💥 Accident' },
    'CAD': { bg: '#eff6ff', border: '#3b82f6', badge: '#3b82f6', text: '#1e3a8a', label: '📞 Incident' }
};

// Component to handle map centering
const MapController = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, zoom || 15);
        }
    }, [center, zoom, map]);
    return null;
}

const Tab720 = ({ onRowClick, mapHeight = 400, setMapHeight }) => {
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    // Locate state
    const [userLocation, setUserLocation] = useState(null); // {lat, lon}
    const [searchRadius, setSearchRadius] = useState(''); // empty = no filter
    const [locating, setLocating] = useState(false);

    const mapRef = useRef(null);

    // Initial load (optional: load latest?)
    // User asked for "search to be natural language", implying they type something.
    // But usually landing on a page shows *something*. Let's show latest incidents/arrests if empty?
    // Let's modify handleSearch to allow empty string for "latest".

    const performSearch = async (query, pageNum, loc = userLocation, rad = searchRadius) => {
        setLoading(true);
        try {
            // Pass location if radius is selected
            const extraParams = (loc && rad) ? { lat: loc.lat, lon: loc.lon, radius: rad } : {};

            const res = await searchP2C(query, pageNum, 20, extraParams);
            if (res.success && res.response.data) {
                const newData = res.response.data.data || [];
                const meta = res.response.data.meta || {};

                if (pageNum === 1) {
                    setResults(newData);
                } else {
                    setResults(prev => [...prev, ...newData]);
                }
                setHasMore(meta.hasMore);
            }
        } catch (e) {
            console.error('720 Search failed', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial load of "latest" data
        performSearch('', 1);
    }, []);

    const handleSearchKeys = (e) => {
        if (e.key === 'Enter') {
            setPage(1);
            performSearch(searchText, 1, userLocation, searchRadius);
        }
    };

    const handleSearchClick = () => {
        setPage(1);
        performSearch(searchText, 1, userLocation, searchRadius);
    };

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        performSearch(searchText, nextPage, userLocation, searchRadius);
    };

    const handleLocate = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by this browser.');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const loc = { lat: latitude, lon: longitude };
                setUserLocation(loc);
                setLocating(false);
                // Default radius if not set
                if (!searchRadius) setSearchRadius('1000'); // 1000 ft default

                // Trigger search with new location immediately?
                // Let's execute search immediately with 1000ft default if it wasn't set
                setPage(1);
                performSearch(searchText, 1, loc, searchRadius || '1000');

                // Map will center due to MapController
            },
            (err) => {
                console.error(err);
                setLocating(false);
                alert('Unable to retrieve location.');
            }
        );
    };

    const handleRadiusChange = (e) => {
        const val = e.target.value;
        setSearchRadius(val);
        if (userLocation && val) {
            // Refresh search with new radius
            setPage(1);
            performSearch(searchText, 1, userLocation, val);
        } else if (!val) {
            // Radius cleared, refresh without geo
            setPage(1);
            performSearch(searchText, 1, userLocation, '');
        }
    };

    const mapPoints = useMemo(() => results.filter(r => r.lat && r.lon).map(r => ({
        ...r,
        color: (typeStyles[r.type] || typeStyles['CAD']).badge
    })), [results]);

    const zoomToRow = (r) => {
        if (r.lat && r.lon && mapRef.current?.setView) {
            mapRef.current.setView([Number(r.lat), Number(r.lon)], 16);
        }
    };

    const formatTime = (t) => t ? new Date(t).toLocaleString() : 'N/A';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Inter', sans-serif" }}>
            {/* Search Header */}
            <div style={{ padding: '16px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Search 720 (Name, Address, Incident Type)..."
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        onKeyPress={handleSearchKeys}
                        style={{
                            width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    />
                </div>

                {/* Radius Select */}
                <select
                    value={searchRadius}
                    onChange={handleRadiusChange}
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}
                >
                    <option value="">No Distance Filter</option>
                    <option value="500">Within 500 ft</option>
                    <option value="1000">Within 1000 ft</option>
                    <option value="2500">Within 2500 ft</option>
                    <option value="5280">Within 1 Mile</option>
                </select>

                <button
                    onClick={handleSearchClick}
                    disabled={loading}
                    style={{
                        padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600',
                        cursor: loading ? 'wait' : 'pointer', transition: 'background 0.2s'
                    }}
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>

                <button
                    onClick={handleLocate}
                    disabled={locating}
                    title="Locate Me"
                    style={{
                        padding: '12px', background: '#e11d48', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600',
                        cursor: locating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                >
                    <span>📍</span> {locating ? 'Locating...' : 'Locate'}
                </button>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px', gap: '16px', background: '#f8fafc' }}>

                {/* Map */}
                <div style={{ height: mapHeight, minHeight: '200px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <SplitView
                        mapPoints={mapPoints}
                        mapHeight={mapHeight}
                        setMapHeight={setMapHeight}
                        mapRef={mapRef}
                        mapChildren={
                            <>
                                {userLocation && <Marker position={[userLocation.lat, userLocation.lon]} icon={redIcon}><Popup>You are here</Popup></Marker>}
                                {userLocation && <MapController center={[userLocation.lat, userLocation.lon]} zoom={16} />}
                            </>
                        }
                    >
                        <div />
                    </SplitView>
                </div>

                {/* Results List */}
                <div className="results-scroll" style={{ flex: 1, overflowY: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Type</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Date/Time</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Nature / Charge</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Name / Details</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.length === 0 && !loading && (
                                <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No results found.</td></tr>
                            )}
                            {results.map((r, i) => {
                                const style = typeStyles[r.type] || typeStyles['CAD'];
                                return (
                                    <tr key={r.id + '_' + i}
                                        onClick={() => { zoomToRow(r); if (onRowClick) onRowClick(r); }}
                                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.1s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                    >
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                background: style.bg, color: style.text, border: `1px solid ${style.border} `,
                                                padding: '4px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '12px', display: 'inline-block', minWidth: '90px', textAlign: 'center'
                                            }}>
                                                {style.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#334155' }}>{formatTime(r.event_time)}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: '500', color: '#0f172a' }}>{r.title || 'N/A'}</td>
                                        {/* For CAD, subTitle is empty, for Arrest/DB it is Name */}
                                        <td style={{ padding: '12px 16px', color: '#334155' }}>{r.subTitle || '-'}</td>
                                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{r.location || 'N/A'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Load More */}
                    {hasMore && (
                        <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
                            <button
                                onClick={loadMore}
                                disabled={loading}
                                style={{
                                    background: 'white', border: '1px solid #cbd5e1', padding: '8px 20px', borderRadius: '6px',
                                    color: '#475569', fontWeight: '500', cursor: 'pointer'
                                }}
                            >
                                {loading ? 'Loading...' : 'Load More Results'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Tab720;

