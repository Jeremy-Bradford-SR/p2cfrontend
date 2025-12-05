import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// --- Constants & Styles ---
const COLORS = {
    CAD: '#2563eb',       // Blue
    Arrest: '#dc2626',    // Red
    Crime: '#f97316',     // Orange
    SexOffender: '#be123c', // Rose
    Traffic: '#10b981'    // Emerald
};

const MAP_CENTER = [42.5006, -90.6648]; // Dubuque, IA

const GLASS_PANEL = {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
    padding: '16px',
    color: '#1e293b'
};

const CONTROL_BTN = {
    background: '#0f172a',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s'
};

// --- Helper Components ---

const MapController = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center);
    }, [center, map]);
    return null;
};

const FeedItem = ({ item }) => (
    <div style={{
        padding: '12px',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        animation: 'slideIn 0.3s ease-out',
        display: 'flex',
        gap: '12px',
        alignItems: 'start'
    }}>
        <div style={{
            minWidth: '8px',
            height: '8px',
            borderRadius: '50%',
            background: COLORS[item.type],
            marginTop: '6px'
        }} />
        <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>
                {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.type}
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '2px' }}>
                {item.title}
            </div>
            <div style={{ fontSize: '12px', color: '#475569' }}>
                {item.subtitle}
            </div>
        </div>
    </div>
);

// --- Main Component ---

const CrimeTimeReplay = ({ cadResults = [], arrestResults = [], crimeResults = [], sexOffenderResults = [], trafficResults = [] }) => {
    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(60); // Multiplier: 1 real sec = X data seconds. Default Medium (1s = 1min)
    const [currentTime, setCurrentTime] = useState(new Date().getTime());
    const [timeRange, setTimeRange] = useState({ start: new Date().setHours(0, 0, 0, 0), end: new Date().getTime() });
    const [selectedInterval, setSelectedInterval] = useState('12h'); // 12h, 24h, 48h, 1wk

    const feedRef = useRef(null);
    const requestRef = useRef();
    const previousTimeRef = useRef();

    // 1. Prepare Data
    const allEvents = useMemo(() => {
        const events = [];

        const parseCoord = (val) => {
            if (val === null || val === undefined || val === '') return null;
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
        };

        // Helper to add events
        const add = (data, type, timeKey, titleKey, subKey) => {
            data.forEach(d => {
                // Handle case sensitivity for coordinates
                const lat = parseCoord(d.lat || d.Lat);
                const lon = parseCoord(d.lon || d.Lon);

                if (d[timeKey]) {
                    events.push({
                        id: d.id || d.incident_id || d.book_id || Math.random().toString(36),
                        type,
                        time: new Date(d[timeKey]).getTime(),
                        title: d[titleKey] || 'Unknown Event',
                        subtitle: d[subKey] || d.address || d.location || '',
                        lat: lat,
                        lon: lon,
                        raw: d
                    });
                }
            });
        };

        add(cadResults, 'CAD', 'starttime', 'nature', 'location');
        add(arrestResults, 'Arrest', 'event_time', 'charge', 'location');
        add(crimeResults, 'Crime', 'event_time', 'charge', 'location'); // Fixed timeKey
        add(sexOffenderResults, 'SexOffender', 'last_changed', 'nature', 'address_line_1'); // nature is manually added in App.jsx
        add(trafficResults, 'Traffic', 'event_time', 'charge', 'location');

        return events.sort((a, b) => a.time - b.time);
    }, [cadResults, arrestResults, crimeResults, sexOffenderResults, trafficResults]);

    // 2. Handle Interval Changes
    useEffect(() => {
        const now = new Date();
        let start = new Date();

        switch (selectedInterval) {
            case '12h': start.setHours(now.getHours() - 12); break;
            case '24h': start.setHours(now.getHours() - 24); break;
            case '48h': start.setHours(now.getHours() - 48); break;
            case '1wk': start.setDate(now.getDate() - 7); break;
            default: start.setHours(now.getHours() - 12);
        }

        const startTs = start.getTime();
        const endTs = now.getTime();

        setTimeRange({ start: startTs, end: endTs });
        setCurrentTime(endTs); // Start at the end (show all data)
        setIsPlaying(false);
    }, [selectedInterval]);

    // 3. Replay Loop
    const animate = time => {
        if (previousTimeRef.current != undefined) {
            const deltaTime = time - previousTimeRef.current;

            setCurrentTime(prevTime => {
                const newTime = prevTime + (deltaTime * speed);

                if (newTime >= timeRange.end) {
                    setIsPlaying(false);
                    return timeRange.end;
                }
                return newTime;
            });
        }
        previousTimeRef.current = time;
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(animate);
        }
    };

    useEffect(() => {
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(requestRef.current);
            previousTimeRef.current = undefined;
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, speed, timeRange.end]);


    // 4. Derived State for UI
    const visibleEvents = useMemo(() => {
        return allEvents.filter(e => e.time >= timeRange.start && e.time <= currentTime);
    }, [allEvents, timeRange.start, currentTime]);

    // Auto-scroll feed
    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [visibleEvents.length]);

    // Progress percentage
    const progress = Math.min(100, Math.max(0, ((currentTime - timeRange.start) / (timeRange.end - timeRange.start)) * 100));

    // Handlers
    const togglePlay = () => {
        if (!isPlaying && currentTime >= timeRange.end) {
            setCurrentTime(timeRange.start);
        }
        setIsPlaying(!isPlaying);
    };
    const handleSeek = (e) => {
        const percent = parseFloat(e.target.value);
        const newTime = timeRange.start + ((timeRange.end - timeRange.start) * (percent / 100));
        setCurrentTime(newTime);
    };

    const mappedEventCount = visibleEvents.filter(e => e.lat != null && e.lon != null).length;

    return (
        <div style={{ position: 'relative', height: 'calc(100vh - 140px)', width: '100%', overflow: 'hidden', borderRadius: '12px', border: '1px solid #e2e8f0' }}>

            {/* Map Background */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
                <MapContainer center={MAP_CENTER} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    />
                    {visibleEvents.filter(e => e.lat != null && e.lon != null).map(event => (
                        <CircleMarker
                            key={event.id}
                            center={[event.lat, event.lon]}
                            radius={8}
                            pathOptions={{
                                color: COLORS[event.type],
                                fillColor: COLORS[event.type],
                                fillOpacity: 0.6,
                                weight: 2
                            }}
                        >
                            <Popup>
                                <div style={{ minWidth: '200px' }}>
                                    <div style={{
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        color: COLORS[event.type],
                                        marginBottom: '4px'
                                    }}>
                                        {event.type} • {new Date(event.time).toLocaleString()}
                                    </div>

                                    <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px', lineHeight: '1.2' }}>
                                        {event.title}
                                    </div>

                                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                                        {event.subtitle}
                                    </div>

                                    {/* Type Specific Details */}
                                    <div style={{ fontSize: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>

                                        {event.type === 'CAD' && (
                                            <>
                                                <div><strong>Agency:</strong> {event.raw.agency || 'N/A'}</div>
                                                <div><strong>Service:</strong> {event.raw.service || 'N/A'}</div>
                                            </>
                                        )}

                                        {event.type === 'Arrest' && (
                                            <>
                                                <div><strong>Name:</strong> {event.raw.name || 'N/A'}</div>
                                                <div><strong>Officer:</strong> {event.raw.officer || 'N/A'}</div>
                                            </>
                                        )}

                                        {event.type === 'SexOffender' && (
                                            <>
                                                <div style={{ marginBottom: '8px', textAlign: 'center' }}>
                                                    {event.raw.photo_data ? (
                                                        <img
                                                            src={`data:image/jpeg;base64,${event.raw.photo_data}`}
                                                            alt="Offender"
                                                            style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                        />
                                                    ) : event.raw.photo_url ? (
                                                        <img
                                                            src={event.raw.photo_url}
                                                            alt="Offender"
                                                            style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                        />
                                                    ) : (
                                                        <div style={{ width: '100px', height: '100px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '10px', color: '#94a3b8' }}>No Photo</div>
                                                    )}
                                                </div>
                                                <div><strong>Name:</strong> {event.raw.first_name} {event.raw.last_name}</div>
                                                <div><strong>Tier:</strong> {event.raw.tier}</div>
                                            </>
                                        )}

                                        {event.type === 'Traffic' && (
                                            <>
                                                <div><strong>Type:</strong> {event.raw._source === 'TrafficCitation' ? 'Citation' : 'Accident'}</div>
                                                <div><strong>Name:</strong> {event.raw.name || 'N/A'}</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}
                </MapContainer>
            </div>

            {/* Controls Overlay (Bottom Center) */}
            <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '600px', maxWidth: '90%' }}>
                <div style={GLASS_PANEL}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button onClick={togglePlay} style={{ ...CONTROL_BTN, background: isPlaying ? '#ef4444' : '#22c55e', width: '100px', justifyContent: 'center' }}>
                                {isPlaying ? 'PAUSE' : 'PLAY'}
                            </button>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Current Time</span>
                                <span style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'monospace' }}>
                                    {new Date(currentTime).toLocaleTimeString()} <span style={{ fontSize: '12px', color: '#64748b' }}>{new Date(currentTime).toLocaleDateString()}</span>
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                                value={selectedInterval}
                                onChange={(e) => setSelectedInterval(e.target.value)}
                                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', fontSize: '13px' }}
                            >
                                <option value="12h">Last 12 Hours</option>
                                <option value="24h">Last 24 Hours</option>
                                <option value="48h">Last 48 Hours</option>
                                <option value="1wk">Last 1 Week</option>
                            </select>

                            <select
                                value={speed}
                                onChange={(e) => setSpeed(Number(e.target.value))}
                                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', fontSize: '13px' }}
                            >
                                <option value={10}>Slow (10x)</option>
                                <option value={60}>Medium (60x)</option>
                                <option value={300}>Fast (300x)</option>
                                <option value={3600}>Blitz (1hr/s)</option>
                            </select>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>{new Date(timeRange.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={progress}
                            onChange={handleSeek}
                            style={{ flex: 1, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>{new Date(timeRange.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            </div>

            {/* Live Feed Overlay (Right Side) */}
            <div style={{ position: 'absolute', top: '20px', right: '20px', bottom: '20px', width: '320px', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
                <div style={{ ...GLASS_PANEL, height: '100%', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.5)' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', boxShadow: '0 0 8px #ef4444' }}></span>
                            CrimeTime Live Feed
                        </h3>
                    </div>

                    <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', scrollBehavior: 'smooth' }}>
                        {visibleEvents.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                Waiting for events...
                            </div>
                        ) : (
                            // Group events by Hour
                            (() => {
                                const groups = [];
                                let lastHour = null;
                                visibleEvents.forEach(event => {
                                    const date = new Date(event.time);
                                    const hourStr = date.toLocaleTimeString([], { hour: 'numeric', hour12: true }) + (date.getHours() < 12 ? ' AM' : ' PM'); // Simple hour grouping
                                    // Better grouping: Full Date + Hour
                                    const groupKey = date.toLocaleDateString() + ' ' + date.getHours();
                                    const displayHeader = date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

                                    if (groupKey !== lastHour) {
                                        groups.push({ type: 'header', title: displayHeader, id: 'header-' + groupKey });
                                        lastHour = groupKey;
                                    }
                                    groups.push({ type: 'item', data: event });
                                });

                                return groups.map(item => {
                                    if (item.type === 'header') {
                                        return (
                                            <div key={item.id} style={{
                                                padding: '8px 12px',
                                                background: '#f1f5f9',
                                                color: '#64748b',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase',
                                                borderBottom: '1px solid #e2e8f0',
                                                borderTop: '1px solid #e2e8f0'
                                            }}>
                                                {item.title}
                                            </div>
                                        );
                                    }
                                    return <FeedItem key={item.data.id} item={item.data} />;
                                });
                            })()
                        )}
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(248, 250, 252, 0.8)', borderTop: '1px solid rgba(0,0,0,0.05)', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                        Showing {visibleEvents.length} events ({mappedEventCount} on map)
                    </div>
                </div>
            </div>

            {/* Legend (Bottom Left) - Adjusted position to avoid overlap if needed */}
            <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000 }}>
                <div style={{ ...GLASS_PANEL, padding: '12px', display: 'flex', gap: '16px' }}>
                    {Object.entries(COLORS).map(([type, color]) => (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }}></div>
                            <span style={{ fontSize: '12px', fontWeight: '600' }}>{type}</span>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                /* Custom Range Slider Styling */
                input[type=range] {
                    -webkit-appearance: none;
                    background: transparent;
                }
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #2563eb;
                    cursor: pointer;
                    margin-top: -6px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                input[type=range]::-webkit-slider-runnable-track {
                    width: 100%;
                    height: 4px;
                    cursor: pointer;
                    background: #cbd5e1;
                    border-radius: 2px;
                }
            `}</style>
        </div>
    );
};

export default CrimeTimeReplay;
