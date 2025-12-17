import React, { useState, useEffect } from 'react';
import { getDatabaseStats, getJailInmates } from '../../client';

const MobileHome = ({ setActiveTab }) => {
    const [stats, setStats] = useState({
        arrests: '-',
        jail: '-'
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [dbStats, jailRes] = await Promise.all([
                    getDatabaseStats(),
                    getJailInmates({ limit: 1 }) // Just to get total count if paginated, or rely on dbStats
                ]);

                // dbStats normally returns { arrests: { count: N }, corrections: { count: N }, etc }
                // jailRes might be paginated, so if we can't get total count from it, we rely on dbStats if it has jail info
                // If dbStats doesn't have jail, we might need a separate call or specific endpoint. 
                // Assuming dbStats structure from previous review.

                setStats({
                    arrests: dbStats?.arrests?.count || '-',
                    jail: jailRes?.response?.data?.data?.length || dbStats?.jailBodyCount || '-' // Simplify
                });
            } catch (e) {
                console.error("Failed to fetch home stats", e);
            }
        };
        fetchStats();
    }, []);

    return (
        <div style={{ padding: '20px', background: 'var(--bg-color)', minHeight: '100%', overflowY: 'auto' }}>
            <header style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-color)', margin: 0 }}>CrimeTime</h1>
                <p style={{ color: 'var(--secondary-color)', margin: '4px 0 0' }}>Dubuque, Iowa</p>
            </header>

            <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{
                    background: 'linear-gradient(135deg, var(--primary-color) 0%, #2563eb 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    color: 'white',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <h2 style={{ margin: 0, fontSize: '20px' }}>Welcome!</h2>
                    <p style={{ margin: '8px 0 0', opacity: 0.9 }}>
                        Access local crime data, jail records, and offender information on the go.
                    </p>
                </div>

                <div style={{
                    background: 'var(--card-bg)',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid var(--border-color)'
                }}>
                    <h3 style={{ margin: '0 0 12px', color: 'var(--text-color)' }}>Quick Stats</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '20px' }}>🚔</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', margin: '4px 0' }}>{stats.arrests}</div>
                            <div style={{ fontSize: '10px', color: 'var(--secondary-color)' }}>Arrests</div>
                        </div>
                        <div onClick={() => setActiveTab('Records')} style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}>
                            <div style={{ fontSize: '20px' }}>🔒</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', margin: '4px 0' }}>{stats.jail}</div>
                            <div style={{ fontSize: '10px', color: 'var(--secondary-color)' }}>Inmates</div>
                        </div>
                    </div>
                </div>

                <a href="http://realdubuque.news" target="_blank" rel="noopener noreferrer" style={{
                    display: 'block',
                    background: '#1e293b',
                    color: 'white',
                    textDecoration: 'none',
                    padding: '16px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    fontWeight: 600
                }}>
                    Visit Real Dubuque News ↗
                </a>
            </div>
        </div>
    );
};

export default MobileHome;
