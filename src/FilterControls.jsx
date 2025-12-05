import React, { useState, useEffect } from 'react';

const FilterControls = ({ onFilterChange, data }) => {
    const [searchText, setSearchText] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        onFilterChange({ searchText, startDate, endDate });
    }, [searchText, startDate, endDate, onFilterChange]);

    return (
        <div style={{ padding: '10px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
                type="text"
                placeholder="Search..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', flex: '1', minWidth: '200px' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '14px', color: '#6c757d' }}>From:</span>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '14px', color: '#6c757d' }}>To:</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
            </div>
            {(searchText || startDate || endDate) && (
                <button
                    onClick={() => { setSearchText(''); setStartDate(''); setEndDate(''); }}
                    style={{ padding: '8px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Clear
                </button>
            )}
            <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#6c757d' }}>
                {data ? `${data.length} records` : ''}
            </div>
        </div>
    );
};

export const filterData = (data, filters) => {
    if (!data) return [];
    const { searchText, startDate, endDate } = filters;

    const lowerSearch = searchText ? searchText.toLowerCase() : '';
    const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

    return data.filter(row => {
        // Text Search
        if (lowerSearch) {
            const match = Object.values(row).some(val =>
                String(val).toLowerCase().includes(lowerSearch)
            );
            if (!match) return false;
        }

        // Date Range
        if (start || end) {
            // Try to find a date field
            const dateVal = row.event_time || row.starttime || row.arrest_date || row.TimeReceived || row.DateScraped || row.registration_date || row.time;
            if (dateVal) {
                const d = new Date(dateVal).getTime();
                if (start && d < start) return false;
                if (end && d > end) return false;
            }
        }

        return true;
    });
};

export default FilterControls;
