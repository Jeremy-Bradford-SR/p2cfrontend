import React, { useState, useMemo } from 'react';
import DataGrid from './DataGrid';
import FilterControls, { filterData } from './FilterControls';

const FilterableDataGrid = ({ data, columns, onRowClick, loading, onLoadMore, hasMore }) => {
    const [filters, setFilters] = useState({ searchText: '', startDate: '', endDate: '' });

    const filteredData = useMemo(() => {
        return filterData(data, filters);
    }, [data, filters]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <FilterControls onFilterChange={setFilters} data={filteredData} />
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {(loading && (!data || data.length === 0)) ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading records...</div>
                    ) : (
                        <DataGrid data={filteredData} columns={columns} onRowClick={onRowClick} />
                    )}
                </div>
                {onLoadMore && hasMore && (
                    <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
                        <button
                            onClick={onLoadMore}
                            disabled={loading}
                            style={{
                                padding: '8px 24px',
                                background: loading ? '#9ca3af' : '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: loading ? 'wait' : 'pointer',
                                fontSize: '14px',
                                fontWeight: 500,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        >
                            {loading ? '⏳ Loading...' : 'Load More Records'}
                        </button>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                            Showing {filteredData.length} records (Total Loaded: {data.length})
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FilterableDataGrid;
