import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, Tab } from './Tabs';
import FilterableDataGrid from './FilterableDataGrid';
import MapWithData from './MapWithData';
import { getCorrections, getReoffenders, getSexOffenders, getJailInmates } from './client';

export default function RecordsTab({
    // Column Props
    correctionsColumns,
    reoffenderColumns,
    sexOffenderColumns,
    jailColumns,
    // Handler Props
    setSelectedOffender,
    setSelectedViolator,
    setSelectedSexOffender,
    setSelectedInmate,
    // Map Props
    mapHeight,
    setMapHeight
}) {
    // --- State Management ---
    const LIMIT = 50;

    // Probation/Parole
    const [probationData, setProbationData] = useState([]);
    const [probationPage, setProbationPage] = useState(1);
    const [probationLoading, setProbationLoading] = useState(false);
    const [probationHasMore, setProbationHasMore] = useState(true);

    // Violators
    const [violatorsData, setViolatorsData] = useState([]);
    const [violatorsPage, setViolatorsPage] = useState(1);
    const [violatorsLoading, setViolatorsLoading] = useState(false);
    const [violatorsHasMore, setViolatorsHasMore] = useState(true);

    // Jail
    const [jailData, setJailData] = useState([]);
    const [jailPage, setJailPage] = useState(1);
    const [jailLoading, setJailLoading] = useState(false);
    const [jailHasMore, setJailHasMore] = useState(true);

    // Sex Offenders (Fetch large batch for map compatibility)
    const [sexData, setSexData] = useState([]);
    const [sexLoading, setSexLoading] = useState(false);

    // --- Fetchers ---

    const fetchProbation = useCallback(async (page, reset = false) => {
        setProbationLoading(true);
        try {
            const res = await getCorrections({ page, limit: LIMIT });
            const newData = res.response?.data?.data || [];

            if (reset) {
                setProbationData(newData);
            } else {
                setProbationData(prev => [...prev, ...newData]);
            }

            setProbationHasMore(newData.length === LIMIT);
            setProbationPage(page);
        } catch (e) {
            console.error("Failed to fetch probation", e);
        } finally {
            setProbationLoading(false);
        }
    }, []);

    const fetchViolators = useCallback(async (page, reset = false) => {
        setViolatorsLoading(true);
        try {
            const res = await getReoffenders({ page, limit: LIMIT });
            const newData = res.response?.data?.data || [];

            if (reset) {
                setViolatorsData(newData);
            } else {
                setViolatorsData(prev => [...prev, ...newData]);
            }

            setViolatorsHasMore(newData.length === LIMIT);
            setViolatorsPage(page);
        } catch (e) {
            console.error("Failed to fetch violators", e);
        } finally {
            setViolatorsLoading(false);
        }
    }, []);

    const fetchJail = useCallback(async (page, reset = false) => {
        setJailLoading(true);
        try {
            const res = await getJailInmates({ page, limit: LIMIT });
            const newData = res.response?.data?.data || [];

            if (reset) {
                setJailData(newData);
            } else {
                setJailData(prev => [...prev, ...newData]);
            }

            setJailHasMore(newData.length === LIMIT);
            setJailPage(page);
        } catch (e) {
            console.error("Failed to fetch jail", e);
        } finally {
            setJailLoading(false);
        }
    }, []);

    const fetchSexOffenders = useCallback(async () => {
        setSexLoading(true);
        try {
            // Fetch 1000 for map
            const res = await getSexOffenders({ limit: 1000 });
            setSexData(res.response?.data?.data || []);
        } catch (e) {
            console.error("Failed to fetch sex offenders", e);
        } finally {
            setSexLoading(false);
        }
    }, []);

    // --- Initial Load ---
    useEffect(() => {
        fetchProbation(1, true);
        fetchViolators(1, true);
        fetchJail(1, true);
        fetchSexOffenders();
    }, [fetchProbation, fetchViolators, fetchJail, fetchSexOffenders]);

    return (
        <div className="records-tab-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Tabs>
                <Tab label="Probation/Parole">
                    <div style={{ padding: '10px', background: '#e0f2fe', marginBottom: '10px', borderRadius: '4px', fontSize: '14px', color: '#1e3a8a' }}>
                        ℹ️ Click on any row to view complete offender record and charges.
                    </div>
                    <FilterableDataGrid
                        data={probationData}
                        columns={correctionsColumns}
                        loading={probationLoading}
                        onRowClick={(row) => setSelectedOffender(row.OffenderNumber)}
                        onLoadMore={() => fetchProbation(probationPage + 1)}
                        hasMore={probationHasMore}
                    />
                </Tab>
                <Tab label="Violators">
                    <div style={{ padding: '10px', background: '#fef2f2', marginBottom: '10px', borderRadius: '4px', fontSize: '14px', borderLeft: '4px solid #dc2626', color: '#991b1b' }}>
                        ⚠️ Click on any row to view arrest details alongside DOC offender record.
                    </div>
                    <FilterableDataGrid
                        data={violatorsData}
                        columns={reoffenderColumns}
                        loading={violatorsLoading}
                        onRowClick={setSelectedViolator}
                        onLoadMore={() => fetchViolators(violatorsPage + 1)}
                        hasMore={violatorsHasMore}
                    />
                </Tab>
                <Tab label="Sex Offenders">
                    <MapWithData
                        data={sexData}
                        columns={sexOffenderColumns}
                        loading={sexLoading}
                        mapHeight={mapHeight}
                        setMapHeight={setMapHeight}
                        onRowClick={setSelectedSexOffender}
                    />
                </Tab>
                <Tab label="Jail">
                    <div style={{ padding: '10px', background: '#e0f2fe', marginBottom: '10px', borderRadius: '4px', fontSize: '14px', color: '#1e3a8a' }}>
                        ℹ️ Click on any row to view inmate photo and details.
                    </div>
                    <FilterableDataGrid
                        data={jailData}
                        columns={jailColumns}
                        onRowClick={setSelectedInmate}
                        loading={jailLoading}
                        onLoadMore={() => fetchJail(jailPage + 1)}
                        hasMore={jailHasMore}
                    />
                </Tab>
            </Tabs>
        </div>
    );
}
