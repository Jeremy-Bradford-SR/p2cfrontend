import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    getArrestsByName,
    getTrafficByName,
    getCrimeByName,
    getJailByName,
    getOffenderDetail,
    getOffenderDetailByName
} from '../../client';

const MobileView360Modal = ({ record, onClose }) => {
    const [activeTab, setActiveTab] = useState('ARRESTS');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        arrests: [],
        traffic: [],
        crime: [],
        jail: [],
        doc: null
    });

    useEffect(() => {
        let mounted = true;
        const fetchData = async () => {
            // Extract names
            let first = record.firstname || '';
            let last = record.lastname || '';

            // Fallback if name is in single string
            if (!first && record.name) {
                const parts = record.name.split(' ');
                if (parts.length > 0) first = parts[0];
                if (parts.length > 1) last = parts.slice(1).join(' '); // Simple split
            }

            // If still empty (e.g. business name?), we might skip or try exact match. 
            // Assuming Person for 360 view.

            const promises = [];
            const newData = { ...data };

            // Helpers to safely set data
            const load = (fn, key) => promises.push(
                fn(first, last)
                    .then(res => { if (mounted) newData[key] = res.response?.data?.data || []; })
                    .catch(err => console.error(`Error loading ${key}`, err))
            );

            load(getArrestsByName, 'arrests');
            load(getTrafficByName, 'traffic');
            load(getCrimeByName, 'crime');
            load(getJailByName, 'jail');

            // DOC Logic
            if (record.OffenderNumbers) {
                const offNum = String(record.OffenderNumbers).split(',')[0].trim();
                promises.push(
                    getOffenderDetail(offNum)
                        .then(res => { if (mounted && res.success) newData.doc = res.response; })
                        .catch(e => console.error('DOC load error', e))
                );
            } else {
                promises.push(
                    getOffenderDetailByName(first, last)
                        .then(res => { if (mounted && res.success) newData.doc = res.response; })
                        .catch(e => console.error('DOC load error', e))
                );
            }

            await Promise.all(promises);
            if (mounted) {
                setData(newData);
                setLoading(false);
            }
        };

        fetchData();
        return () => { mounted = false; };
    }, [record]);

    const tabs = [
        { id: 'ARRESTS', label: 'Arrests', count: data.arrests.length },
        { id: 'TRAFFIC', label: 'Traffic', count: data.traffic.length },
        { id: 'CRIME', label: 'Crime', count: data.crime.length },
        { id: 'JAIL', label: 'Jail', count: data.jail.length },
        { id: 'DOC', label: 'DOC', count: data.doc ? 1 : 0 },
    ];

    /* Helper to format dates */
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';
    const fmtTime = (d) => d ? new Date(d).toLocaleString() : 'N/A';

    const renderContent = () => {
        if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary-color)' }}>Loading associated records...</div>;

        switch (activeTab) {
            case 'ARRESTS':
                return (
                    <div style={{ padding: '16px', display: 'grid', gap: '12px' }}>
                        {data.arrests.length === 0 ? <div style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary-color)' }}>No arrest records found.</div> :
                            data.arrests.map((item, i) => (
                                <div key={i} style={{ background: 'var(--card-bg)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid var(--danger-color)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--danger-color)', marginBottom: '4px' }}>{item.charge}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-color)' }}>{fmtTime(item.event_time)}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--secondary-color)' }}>{item.location}</div>
                                </div>
                            ))}
                    </div>
                );
            case 'TRAFFIC':
                return (
                    <div style={{ padding: '16px', display: 'grid', gap: '12px' }}>
                        {data.traffic.length === 0 ? <div style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary-color)' }}>No traffic records found.</div> :
                            data.traffic.map((item, i) => (
                                <div key={i} style={{ background: 'var(--card-bg)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #ea580c', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontWeight: 600, color: '#9a3412', marginBottom: '4px' }}>{item.charge}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-color)' }}>{fmtTime(item.event_time)}</div>
                                    <div style={{ fontSize: '12px', background: item.key === 'TC' ? '#ffedd5' : '#fed7aa', color: '#c2410c', display: 'inline-block', padding: '2px 6px', borderRadius: '4px', marginTop: '4px' }}>
                                        {item.key === 'TC' ? 'Citation' : 'Accident'}
                                    </div>
                                </div>
                            ))}
                    </div>
                );
            case 'CRIME':
                return (
                    <div style={{ padding: '16px', display: 'grid', gap: '12px' }}>
                        {data.crime.length === 0 ? <div style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary-color)' }}>No crime reports found.</div> :
                            data.crime.map((item, i) => (
                                <div key={i} style={{ background: 'var(--card-bg)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #7c3aed', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontWeight: 600, color: '#5b21b6', marginBottom: '4px' }}>{item.charge}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-color)' }}>{fmtTime(item.event_time)}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--secondary-color)' }}>{item.location}</div>
                                </div>
                            ))}
                    </div>
                );
            case 'JAIL':
                return (
                    <div style={{ padding: '16px', display: 'grid', gap: '12px' }}>
                        {data.jail.length === 0 ? <div style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary-color)' }}>No jail records found.</div> :
                            data.jail.map((item, i) => (
                                <div key={i} style={{ background: 'var(--card-bg)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid var(--text-color)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-color)', marginBottom: '4px' }}>Inmate Record</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-color)' }}>Booked: {fmtTime(item.book_date)}</div>
                                    {item.released_date && <div style={{ fontSize: '13px', color: 'var(--secondary-color)' }}>Released: {fmtTime(item.released_date)}</div>}
                                </div>
                            ))}
                    </div>
                );
            case 'DOC':
                if (!data.doc) return <div style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary-color)' }}>No DOC record found.</div>;
                const s = data.doc.summary;
                // Detail list
                return (
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Summary Card */}
                        <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--primary-color)' }}>{s?.Name}</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', color: 'var(--text-color)' }}>
                                <div><strong>DOB:</strong> {fmtDate(s?.DOB)}</div>
                                <div><strong>Offender #:</strong> {s?.OffenderNumber}</div>
                                <div><strong>Gender:</strong> {s?.Gender}</div>
                                <div><strong>Race:</strong> {s?.Race}</div>
                            </div>
                        </div>

                        {/* Charges */}
                        {data.doc.charges && data.doc.charges.length > 0 && (
                            <div>
                                <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--secondary-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DOC Charges</h4>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {data.doc.charges.map((c, i) => (
                                        <div key={i} style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', color: 'var(--text-color)' }}>{c.Offense}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>Class: {c.OffenseClass}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>End Date: {fmtDate(c.EndDate)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            default: return null;
        }
    };

    const modalContent = (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'var(--bg-color)', zIndex: 9999, // Increased z-index
            display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.3s ease-out'
        }}>
            {/* Header */}
            <div style={{ background: 'var(--card-bg)', padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)' }}>
                <div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-color)' }}>{record.name || 'Detail View'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>360° Profile</div>
                </div>
                <button onClick={onClose} style={{ border: 'none', background: 'var(--bg-color)', width: '36px', height: '36px', borderRadius: '50%', fontSize: '20px', color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ✕
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', padding: '0 8px' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '12px 16px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid var(--primary-color)' : '2px solid transparent',
                            color: activeTab === tab.id ? 'var(--primary-color)' : (tab.count > 0 ? 'var(--text-color)' : 'var(--secondary-color)'),
                            fontWeight: activeTab === tab.id ? 600 : 400,
                            flexShrink: 0,
                            fontSize: '14px'
                        }}
                    >
                        {tab.label} <span style={{ fontSize: '11px', opacity: 0.7 }}>({tab.count})</span>
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {renderContent()}
            </div>

            <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default MobileView360Modal;
