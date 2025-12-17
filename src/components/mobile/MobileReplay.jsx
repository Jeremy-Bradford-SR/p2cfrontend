import React, { useState, useEffect } from 'react';
import { getIncidents } from '../../client';

const MobileReplay = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(1);

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const now = new Date();
                const from = new Date();
                from.setDate(now.getDate() - days);

                // Reusing getIncidents which fetches CAD, Arrests, Crime
                const res = await getIncidents({
                    dateFrom: from.toISOString().slice(0, 19).replace('T', ' '),
                    dateTo: now.toISOString().slice(0, 19).replace('T', ' '),
                    cadLimit: 200,
                    arrestLimit: 200,
                    crimeLimit: 200
                });

                if (res.success && res.response?.data?.data) {
                    const data = res.response.data.data;
                    // Sort by time descending
                    const sorted = data.sort((a, b) => {
                        const tA = new Date(a.starttime || a.event_time || 0);
                        const tB = new Date(b.starttime || b.event_time || 0);
                        return tB - tA;
                    });
                    setEvents(sorted);
                }
            } catch (e) {
                console.error("Replay fetch failed", e);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, [days]);

    const getTypeColor = (type, source) => {
        if (source === 'DailyBulletinArrests') return '#ef4444'; // Red
        if (source === 'Crime') return '#f97316'; // Orange
        if (source === 'cadHandler') return '#3b82f6'; // Blue
        return '#64748b';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-color)' }}>
            {/* Header / Controls */}
            <div style={{ padding: '12px 16px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Live Feed</h2>
                <select
                    value={days}
                    onChange={e => setDays(Number(e.target.value))}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                >
                    <option value={1}>Last 24 Hours</option>
                    <option value={3}>Last 3 Days</option>
                    <option value={7}>Last Week</option>
                </select>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--secondary-color)' }}>Loading events...</div>
                ) : events.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--secondary-color)' }}>No events found in this period.</div>
                ) : (
                    events.map((e, i) => {
                        const time = new Date(e.starttime || e.event_time);
                        const title = e.nature || e.charge || 'Unknown Event';
                        const loc = e.address || e.location || '';
                        const color = getTypeColor(e.type, e._source);
                        const sourceLabel = e._source === 'cadHandler' ? 'CAD' : (e._source === 'DailyBulletinArrests' ? 'ARREST' : 'CRIME');

                        return (
                            <div key={i} style={{
                                padding: '16px',
                                borderBottom: '1px solid var(--border-color)',
                                background: 'var(--card-bg)',
                                display: 'flex',
                                gap: '12px'
                            }}>
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', width: '50px',
                                    borderRight: '1px solid var(--border-color)', paddingRight: '12px'
                                }}>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-color)' }}>
                                        {time.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}
                                    </span>
                                    <span style={{ fontSize: '10px', color: 'var(--secondary-color)' }}>
                                        {time.getDate()}/{time.getMonth() + 1}
                                    </span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{
                                            background: color, color: 'white',
                                            padding: '2px 6px', borderRadius: '4px',
                                            fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'
                                        }}>
                                            {sourceLabel}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-color)', marginBottom: '4px', lineHeight: '1.3' }}>
                                        {title}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--secondary-color)' }}>
                                        {loc}
                                        {e.agency && <span style={{ opacity: 0.7 }}> • {e.agency}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default MobileReplay;
