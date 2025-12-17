import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getCorrections, getReoffenders, getSexOffenders } from '../../client';
import MobileView360Modal from './MobileView360Modal';

const MobileRecords = () => {
    const [activeTab, setActiveTab] = useState('PROBATION'); // PROBATION, VIOLATORS, SEX_OFFENDERS, JAIL
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selected, setSelected] = useState(null);
    const observer = useRef();

    const loadData = async (pageNum, isLoadMore = false) => {
        setLoading(true);
        let res;
        try {
            if (activeTab === 'PROBATION') {
                res = await getCorrections({ page: pageNum, limit: 20 });
            } else if (activeTab === 'VIOLATORS') {
                res = await getReoffenders({ page: pageNum, limit: 20 });
            } else if (activeTab === 'SEX_OFFENDERS') {
                res = await getSexOffenders({ page: pageNum, limit: 20 });
            } else if (activeTab === 'JAIL') {
                // Import getJailInmates at top if not there
                const { getJailInmates } = require('../../client');
                res = await getJailInmates({ page: pageNum, limit: 20 });
            }

            if (res.success && res.response?.data?.data) {
                const newData = res.response.data.data;
                if (isLoadMore) {
                    setData(prev => {
                        const existingIds = new Set(prev.map(p => JSON.stringify(p)));
                        const uniqueNew = newData.filter(p => !existingIds.has(JSON.stringify(p)));
                        return [...prev, ...uniqueNew];
                    });
                } else {
                    setData(newData);
                }
                setHasMore(newData.length === 20);
            } else {
                if (!isLoadMore) setData([]);
                setHasMore(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setData([]); // Clear data immediately to prevent rendering mismatch
        setPage(1);
        setHasMore(true);
        loadData(1, false);
    }, [activeTab]);

    // Infinite Scroll Ref
    const lastElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                const nextPage = page + 1;
                setPage(nextPage);
                loadData(nextPage, true);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, page]);

    const mapRecordTo360 = (item) => {
        if (activeTab === 'PROBATION') {
            return {
                name: item.Name,
                firstname: item.Name.split(' ')[0],
                lastname: item.Name.split(' ')[1] || '',
                OffenderNumbers: item.OffenderNumber
            };
        } else if (activeTab === 'VIOLATORS') {
            return {
                name: item.ArrestRecordName,
                OffenderNumbers: item.OffenderNumbers,
                firstname: item.ArrestRecordName.split(' ')[0],
                lastname: item.ArrestRecordName.split(' ')[1] || ''
            };
        } else if (activeTab === 'SEX_OFFENDERS') {
            return {
                name: `${item.first_name} ${item.last_name}`,
                firstname: item.first_name,
                lastname: item.last_name,
            };
        } else if (activeTab === 'JAIL') {
            return {
                name: item.name, // Assuming name field
                firstname: item.first_name || item.name?.split(' ')[0],
                lastname: item.last_name || item.name?.split(' ')[1] || '',
            };
        }
        return item;
    };

    const tabs = [
        { id: 'PROBATION', label: 'Probation' },
        { id: 'VIOLATORS', label: 'Violators' },
        { id: 'JAIL', label: 'Jail' },
        { id: 'SEX_OFFENDERS', label: 'Sex Offenders' }
    ];

    const renderCard = (item, i) => {
        let content;
        if (activeTab === 'PROBATION') {
            content = (
                <>
                    <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{item.Name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-color)', opacity: 0.8 }}>{item.Offense}</div>
                    <div style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>{item.SupervisionStatus}</div>
                </>
            );
        } else if (activeTab === 'VIOLATORS') {
            content = (
                <>
                    <div style={{ fontWeight: 600, color: '#ef4444' }}>{item.ArrestRecordName}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-color)', opacity: 0.8 }}>{item.ArrestCharge}</div>
                    <div style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>Orig: {item.OriginalOffenses}</div>
                </>
            );
        } else if (activeTab === 'SEX_OFFENDERS') {
            content = (
                <>
                    <div style={{ fontWeight: 600, color: '#f43f5e' }}>{item.first_name} {item.last_name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-color)', opacity: 0.8 }}>Tier {item.tier}</div>
                    <div style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>{item.address_line_1}, {item.city}</div>
                </>
            );
        } else if (activeTab === 'JAIL') {
            content = (
                <>
                    <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>{item.name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-color)', opacity: 0.8 }}>Age: {item.age} • Gender: {item.gender}</div>
                    <div style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>Booked: {item.book_date ? new Date(item.book_date).toLocaleDateString() : 'N/A'}</div>
                </>
            );
        }

        return (
            <div key={i} ref={i === data.length - 1 ? lastElementRef : null} onClick={() => setSelected(mapRecordTo360(item))} style={{
                background: 'var(--card-bg)', padding: '16px', borderRadius: '12px', marginBottom: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)',
                color: 'var(--text-color)'
            }}>
                {content}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-color)' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', overflowX: 'auto', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', padding: '0 8px' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: '1 0 auto',
                            padding: '12px 16px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid var(--primary-color)' : '2px solid transparent',
                            color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--secondary-color)',
                            fontWeight: activeTab === tab.id ? 600 : 400,
                            fontSize: '14px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {data.map(renderCard)}

                {loading && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary-color)' }}>Loading...</div>}

                {!loading && data.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--secondary-color)' }}>No records found.</div>
                )}
            </div>

            {selected && <MobileView360Modal record={selected} onClose={() => setSelected(null)} />}
        </div>
    );
};

export default MobileRecords;
