import React, { useState, useEffect } from 'react';
import { getDatabaseStats, getJailInmates } from '../../client';

const MobileDataScience = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [dbStats, jailRes] = await Promise.all([
                    getDatabaseStats(),
                    getJailInmates()
                ]);

                setStats({
                    ...dbStats,
                    jailBodyCount: jailRes?.response?.data?.data?.length || 0
                });
            } catch (e) {
                console.error("Failed to load mobile stats", e);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Analytics...</div>;

    const cards = [
        { label: 'Total Inmates', value: stats?.jailBodyCount, icon: '🔒', color: '#0ea5e9' },
        { label: 'Sex Offenders', value: stats?.sex_offenders?.count, icon: '⚠️', color: '#f43f5e' },
        { label: 'Probationers', value: stats?.corrections?.count, icon: '🛑', color: '#f97316' },
        { label: 'Crimes (All Time)', value: stats?.crime?.count, icon: '📋', color: '#8b5cf6' },
        { label: 'Arrests (All Time)', value: stats?.arrests?.count, icon: '🚔', color: '#ef4444' },
    ];

    return (
        <div style={{ padding: '16px', height: '100%', overflowY: 'auto', background: 'var(--bg-color)' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold' }}>Data Insights</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {cards.map((c, i) => (
                    <div key={i} style={{
                        background: 'var(--card-bg)',
                        padding: '16px',
                        borderRadius: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        borderTop: `4px solid ${c.color}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>{c.icon}</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-color)' }}>
                            {c.value ? c.value.toLocaleString() : '-'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--secondary-color)', fontWeight: '500' }}>
                            {c.label}
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
};

export default MobileDataScience;
