import React, { useState, useMemo } from 'react';
import DataGrid from './DataGrid';
import FilterControls, { filterData } from './FilterControls';

const FilterableDataGrid = ({ data, columns, onRowClick, loading }) => {
    const [filters, setFilters] = useState({ searchText: '', startDate: '', endDate: '' });

    const filteredData = useMemo(() => {
        return filterData(data, filters);
    }, [data, filters]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <FilterControls onFilterChange={setFilters} data={filteredData} />
            {loading ? (
                <div style={{ padding: '20px' }}>Loading...</div>
            ) : (
                <DataGrid data={filteredData} columns={columns} onRowClick={onRowClick} />
            )}
        </div>
    );
};

export default FilterableDataGrid;
