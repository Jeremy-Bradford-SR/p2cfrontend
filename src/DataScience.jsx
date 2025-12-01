import React, { useMemo } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const DataScience = ({ cadResults, arrestResults, crimeResults, trafficResults }) => {

    // Helper to aggregate by date
    const getDailyCounts = (data, dateKey) => {
        const counts = {};
        data.forEach(d => {
            if (!d[dateKey]) return;
            const date = new Date(d[dateKey]).toLocaleDateString();
            counts[date] = (counts[date] || 0) + 1;
        });
        return counts;
    };

    // 1. Timeline Data (Merged)
    const timelineData = useMemo(() => {
        const cadCounts = getDailyCounts(cadResults, 'starttime');
        const arrestCounts = getDailyCounts(arrestResults, 'event_time');
        const crimeCounts = getDailyCounts(crimeResults, 'event_time');
        const trafficCounts = getDailyCounts(trafficResults, 'event_time');

        const allDates = new Set([
            ...Object.keys(cadCounts),
            ...Object.keys(arrestCounts),
            ...Object.keys(crimeCounts),
            ...Object.keys(trafficCounts)
        ]);

        return Array.from(allDates).map(date => ({
            date,
            CAD: cadCounts[date] || 0,
            Arrests: arrestCounts[date] || 0,
            Crime: crimeCounts[date] || 0,
            Traffic: trafficCounts[date] || 0,
            Total: (cadCounts[date] || 0) + (arrestCounts[date] || 0) + (crimeCounts[date] || 0) + (trafficCounts[date] || 0)
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [cadResults, arrestResults, crimeResults, trafficResults]);

    // Helper for Top N items
    const getTopN = (data, key, n = 10) => {
        const counts = {};
        data.forEach(d => {
            const val = d[key];
            if (val) counts[val] = (counts[val] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, n);
    };

    const topCadNatures = useMemo(() => getTopN(cadResults, 'nature'), [cadResults]);
    const topArrestCharges = useMemo(() => getTopN(arrestResults, 'charge'), [arrestResults]);
    const topCrimeCharges = useMemo(() => getTopN(crimeResults, 'charge'), [crimeResults]);
    const topTrafficCharges = useMemo(() => getTopN(trafficResults, 'charge'), [trafficResults]);

    // Time of Day Analysis
    const timeOfDayData = useMemo(() => {
        const hours = Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));
        const process = (data, dateKey) => {
            data.forEach(d => {
                if (d[dateKey]) {
                    const h = new Date(d[dateKey]).getHours();
                    if (hours[h]) hours[h].count++;
                }
            });
        };
        process(cadResults, 'starttime');
        process(arrestResults, 'event_time');
        process(crimeResults, 'event_time');
        process(trafficResults, 'event_time');
        return hours;
    }, [cadResults, arrestResults, crimeResults, trafficResults]);

    return (
        <div style={{ padding: 20, overflowY: 'auto', height: 'calc(100vh - 150px)' }}>
            <h2>Data Science Dashboard</h2>
            <p>Analyzing {cadResults.length + arrestResults.length + crimeResults.length + trafficResults.length} total records.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                {/* Timeline */}
                <div style={{ gridColumn: '1 / -1', background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3>Incidents Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={timelineData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="CAD" stroke="#8884d8" />
                            <Line type="monotone" dataKey="Arrests" stroke="#82ca9d" />
                            <Line type="monotone" dataKey="Crime" stroke="#FF8042" />
                            <Line type="monotone" dataKey="Traffic" stroke="#0088FE" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Time of Day */}
                <div style={{ gridColumn: '1 / -1', background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3>Incidents by Hour of Day</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={timeOfDayData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="hour" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Top CAD Natures */}
                <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3>Top 10 CAD Natures</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart layout="vertical" data={topCadNatures}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={150} style={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Arrest Charges */}
                <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3>Top 10 Arrest Charges</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart layout="vertical" data={topArrestCharges}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={150} style={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Crime Charges */}
                <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3>Top 10 Crime Charges</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart layout="vertical" data={topCrimeCharges}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={150} style={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#FF8042" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Traffic Charges */}
                <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3>Top 10 Traffic Charges</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart layout="vertical" data={topTrafficCharges}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={150} style={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#0088FE" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

            </div>
        </div>
    );
};

export default DataScience;
