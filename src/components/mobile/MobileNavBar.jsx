import React from 'react';

const MobileNavBar = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'Home', icon: '🏠', label: 'Home' },
        { id: 'Search', icon: '🔍', label: '360°' },
        { id: 'Replay', label: 'Replay', icon: '⏱️' },
        { id: 'Data Science', label: 'Data', icon: '📊' },
        { id: 'Records', label: 'Records', icon: '📂' }
    ];

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            background: 'var(--card-bg)',
            borderTop: '1px solid var(--border-color)',
            padding: '8px 0',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
            position: 'sticky',
            bottom: 0,
            zIndex: 100
        }}>
            {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            background: 'none',
                            border: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            color: isActive ? 'var(--primary-color)' : 'var(--secondary-color)',
                            fontWeight: isActive ? 600 : 400,
                            fontSize: '11px',
                            padding: '8px',
                            cursor: 'pointer',
                            flex: 1
                        }}
                    >
                        <span style={{ fontSize: '20px' }}>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default MobileNavBar;
