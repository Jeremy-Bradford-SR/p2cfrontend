import React, { useState, useRef, useCallback } from 'react';
import { search360 } from '../../client';
import MobileView360Modal from './MobileView360Modal';

const MobileSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const observer = useRef();

    // Reuse colors from desktop but map to variables where possible or keep specific highlights
    const typeStyles = {
        'ARREST': { bg: '#fef2f2', border: 'var(--danger-color)', text: '#991b1b', label: 'Arrest' },
        'CRIME': { bg: '#f5f3ff', border: '#7c3aed', text: '#5b21b6', label: 'Crime' },
        'TRAFFIC': { bg: '#fff7ed', border: '#ea580c', text: '#9a3412', label: 'Traffic' },
        'SEX_OFFENDER': { bg: '#fff1f2', border: 'var(--warning-color)', text: '#be123c', label: 'Sex Offender' },
        'PROBATION': { bg: '#f0fdf4', border: 'var(--success-color)', text: '#166534', label: 'Probation' },
        'PAROLE': { bg: '#ecfccb', border: '#65a30d', text: '#365314', label: 'Parole' },
        'DOC': { bg: '#eff6ff', border: 'var(--primary-color)', text: '#1e40af', label: 'DOC' },
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setPage(1); // Reset page
        try {
            // Fetch Page 1
            const res = await search360(query, 1, 50);
            if (res.success && res.response?.data?.data) {
                setResults(res.response.data.data);
                setHasMore(res.response.data.meta?.hasMore || false);
            } else {
                setResults([]);
                setHasMore(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async (nextPage) => {
        setLoading(true);
        try {
            const res = await search360(query, nextPage, 50);
            if (res.success && res.response?.data?.data) {
                setResults(prev => [...prev, ...res.response.data.data]); // Append
                setHasMore(res.response.data.meta?.hasMore || false);
                setPage(nextPage);
            } else {
                setHasMore(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Infinite Scroll Ref
    const lastElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                const nextPage = page + 1;
                loadMore(nextPage);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, page, query]); // Added query dependency

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-color)' }}>
            <div style={{ padding: '16px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="search"
                        placeholder="Search name, charge..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '12px 16px',
                            borderRadius: '24px',
                            border: '1px solid var(--border-color)',
                            fontSize: '16px', // Prevents zoom on iOS
                            outline: 'none',
                            background: 'var(--bg-color)',
                            color: 'var(--text-color)'
                        }}
                    />
                    <button type="submit" style={{
                        background: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '44px',
                        height: '44px',
                        fontSize: '18px',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        🔍
                    </button>
                </form>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {results.length > 0 ? (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {results.map((item, i) => {
                            const style = typeStyles[item.type] || { bg: 'white', border: '#ddd', text: '#333', label: item.type };
                            return (
                                <div
                                    key={i}
                                    ref={i === results.length - 1 ? lastElementRef : null}
                                    onClick={() => setSelected(item)}
                                    style={{
                                        background: 'var(--card-bg)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        borderLeft: `4px solid ${style.border}`,
                                        boxShadow: 'var(--shadow-sm)',
                                        cursor: 'pointer',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{
                                            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                                            background: style.bg, color: style.text, padding: '2px 6px', borderRadius: '4px'
                                        }}>
                                            {style.label}
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>
                                            {item.date ? new Date(item.date).toLocaleDateString() : ''}
                                        </span>
                                    </div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '15px', marginBottom: '4px' }}>
                                        {item.name}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-color)', opacity: 0.8, lineHeight: '1.4' }}>
                                        {/* Truncate details if too long? */}
                                        {item.details && item.details.length > 100 ? item.details.substring(0, 100) + '...' : item.details}
                                    </div>
                                    {item.location && item.location !== 'N/A' && (
                                        <div style={{ fontSize: '12px', color: 'var(--secondary-color)', marginTop: '8px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            📍 {item.location}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {loading && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary-color)' }}>Loading...</div>}
                    </div>
                ) : (
                    !loading && (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--secondary-color)' }}>
                            {query ? (
                                <p>No results found for "{query}"</p>
                            ) : (
                                <>
                                    <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.5 }}>🕵️‍♂️</div>
                                    <p>Search for people, arrests, or traffic incidents.</p>
                                </>
                            )}
                        </div>
                    )
                )}

                {loading && results.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--secondary-color)' }}>Searching...</div>
                )}
            </div>

            {/* Detail Modal */}
            {selected && (
                <MobileView360Modal
                    record={selected}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );
};

export default MobileSearch;
