import React, { useState } from 'react';
import MobileNavBar from './components/mobile/MobileNavBar';
import MobileHome from './components/mobile/MobileHome';
import MobileSearch from './components/mobile/MobileSearch';
import MobileRecords from './components/mobile/MobileRecords';
import MobileJail from './components/mobile/MobileJail';
import MobileDataScience from './components/mobile/MobileDataScience';
import MobileReplay from './components/mobile/MobileReplay';

export default function MobileApp() {
    const [activeTab, setActiveTab] = useState('Home'); // Home, Search, Records, Jail, Data Science, Replay

    const renderContent = () => {
        switch (activeTab) {
            case 'Home': return <MobileHome setActiveTab={setActiveTab} />;
            case 'Search': return <MobileSearch />;
            case 'Replay': return <MobileReplay />;
            case 'Data Science': return <MobileDataScience />;
            case 'Records': return <MobileRecords />;
            case 'Jail': return <MobileJail />;
            default: return <MobileHome setActiveTab={setActiveTab} />;
        }
    };

    return (
        <div className="mobile-app" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            width: '100vw',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-color, #f3f4f6)',
            color: 'var(--text-color, #1f2937)'
        }}>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                {renderContent()}
            </div>
            <MobileNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
    );
}
