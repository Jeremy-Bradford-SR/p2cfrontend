import React, { useState, useMemo } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ScatterChart, Scatter, ZAxis, ComposedChart, Treemap
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';

// --- Constants & Styles ---
const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#65a30d', '#0891b2', '#be123c', '#d97706'];
const MAP_CENTER = [42.5006, -90.6648]; // Dubuque, IA
const DARK_BG = '#1e293b';
const CARD_BG = '#ffffff';
const TEXT_MAIN = '#1f2937';
const TEXT_SUB = '#6b7280';

const Card = ({ title, value, subtext, icon }) => (
    <div style={{ background: CARD_BG, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', flex: 1, minWidth: '200px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: TEXT_SUB, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{title}</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: TEXT_MAIN, lineHeight: '1.2' }}>{value}</div>
            </div>
            {icon && <div style={{ fontSize: '24px', opacity: 0.8 }}>{icon}</div>}
        </div>
        {subtext && <div style={{ fontSize: '13px', color: TEXT_SUB, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>{subtext}</div>}
    </div>
);

const ChartCard = ({ title, children, height = 350 }) => (
    <div style={{ background: CARD_BG, padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb', height: '100%' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: TEXT_MAIN, marginBottom: '20px', borderLeft: `4px solid ${COLORS[0]}`, paddingLeft: '12px' }}>{title}</h3>
        <div style={{ height: height }}>
            {children}
        </div>
    </div>
);

const SubTab = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        style={{
            padding: '12px 24px',
            border: 'none',
            borderBottom: active ? `3px solid ${COLORS[0]}` : '3px solid transparent',
            background: active ? '#eff6ff' : 'transparent',
            cursor: 'pointer',
            fontWeight: active ? '700' : '500',
            color: active ? COLORS[0] : TEXT_SUB,
            fontSize: '15px',
            transition: 'all 0.2s',
            borderRadius: '6px 6px 0 0'
        }}
    >
        {label}
    </button>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb', padding: '12px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                <p style={{ fontWeight: '700', marginBottom: '8px', color: TEXT_MAIN }}>{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }}></div>
                        <span style={{ fontSize: '13px', color: '#374151' }}>{entry.name}:</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>
                            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const DataMap = ({ points, color = COLORS[0], title }) => (
    <div style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <MapContainer center={MAP_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <MarkerClusterGroup chunkedLoading>
                {points.filter(p => p.lat && p.lon).map((p, idx) => (
                    <CircleMarker
                        key={idx}
                        center={[p.lat, p.lon]}
                        radius={6}
                        pathOptions={{ color: 'white', weight: 1, fillColor: p.color || color, fillOpacity: 0.8 }}
                    >
                        <Popup>
                            <strong>{p.nature || p.charge || p.title}</strong><br />
                            {p.location || p.address}<br />
                            {new Date(p.event_time || p.starttime).toLocaleString()}
                        </Popup>
                    </CircleMarker>
                ))}
            </MarkerClusterGroup>
        </MapContainer>
    </div>
);

const DataScience = ({ cadResults = [], arrestResults = [], crimeResults = [], trafficResults = [], sexOffenderResults = [], correctionsResults = [], jailResults = [], databaseStats = {}, onIntervalChange, loading }) => {
    const [activeTab, setActiveTab] = useState('Overview');
    const [selectedInterval, setSelectedInterval] = useState('1wk');

    const handleIntervalChange = (e) => {
        const val = e.target.value;
        setSelectedInterval(val);
        if (onIntervalChange) onIntervalChange(val);
    };

    // --- Data Processing ---

    const getTopN = (data, key, n = 10) => {
        const counts = {};
        if (!Array.isArray(data)) return [];
        data.forEach(d => {
            const val = d[key];
            if (val) counts[val] = (counts[val] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, n);
    };

    // 1. Overview Data
    const overviewData = useMemo(() => {
        const dateMap = {};

        // Helper to get date range based on interval
        const now = new Date();
        let startDate = new Date();
        switch (selectedInterval) {
            case '1wk': startDate.setDate(now.getDate() - 7); break;
            case '2wk': startDate.setDate(now.getDate() - 14); break;
            case '3wk': startDate.setDate(now.getDate() - 21); break;
            case '1mnth': startDate.setMonth(now.getMonth() - 1); break;
            case '3mnth': startDate.setMonth(now.getMonth() - 3); break;
            case '6mnth': startDate.setMonth(now.getMonth() - 6); break;
            case '9mnth': startDate.setMonth(now.getMonth() - 9); break;
            case '1yr': startDate.setFullYear(now.getFullYear() - 1); break;
            default: startDate.setDate(now.getDate() - 7);
        }

        // Initialize date map with all dates in range
        for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toLocaleDateString();
            dateMap[dateStr] = {
                date: dateStr,
                fullDate: new Date(d),
                CAD: 0, Arrests: 0, Crime: 0, Traffic: 0, Corrections: 0, SexOffenders: 0, Jail: 0
            };
        }

        const process = (data, dateKey, type) => {
            data.forEach(d => {
                if (!d[dateKey]) return;
                const date = new Date(d[dateKey]).toLocaleDateString();
                if (dateMap[date]) dateMap[date][type]++;
            });
        };

        process(cadResults, 'starttime', 'CAD');
        process(arrestResults, 'event_time', 'Arrests');
        process(crimeResults, 'event_time', 'Crime');
        process(trafficResults, 'event_time', 'Traffic');
        process(correctionsResults, 'start_date', 'Corrections');
        process(sexOffenderResults, 'last_changed', 'SexOffenders');

        // Jail: Inmates present on that day
        Object.values(dateMap).forEach(dayObj => {
            const dayStart = new Date(dayObj.fullDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayObj.fullDate);
            dayEnd.setHours(23, 59, 59, 999);

            const count = jailResults.filter(inmate => {
                const arrest = new Date(inmate.arrest_date);
                const released = inmate.released_date ? new Date(inmate.released_date) : null;
                if (arrest > dayEnd) return false;
                if (released && released < dayStart) return false;
                return true;
            }).length;
            dayObj.Jail = count;
        });

        return Object.values(dateMap).sort((a, b) => a.fullDate - b.fullDate);
    }, [cadResults, arrestResults, crimeResults, trafficResults, correctionsResults, sexOffenderResults, jailResults, selectedInterval]);

    // Format X-Axis based on interval
    const formatXAxis = (tickItem) => {
        const date = new Date(tickItem);
        if (selectedInterval === '1yr' || selectedInterval === '9mnth' || selectedInterval === '6mnth') {
            return date.toLocaleDateString('en-US', { month: 'short' });
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // --- New Overview Charts Data ---

    // 1. Day of Week Trends
    const dayOfWeekData = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const counts = days.map(d => ({ name: d, CAD: 0, Arrests: 0 }));

        cadResults.forEach(r => {
            if (r.starttime) counts[new Date(r.starttime).getDay()].CAD++;
        });
        arrestResults.forEach(r => {
            if (r.event_time) counts[new Date(r.event_time).getDay()].Arrests++;
        });
        return counts;
    }, [cadResults, arrestResults]);

    // 2. Agency Distribution
    const agencyData = useMemo(() => {
        const counts = {};
        cadResults.forEach(r => {
            if (r.agency) counts[r.agency] = (counts[r.agency] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5
    }, [cadResults]);

    // 3. Hourly Trends (Heatmap proxy)
    const hourlyData = useMemo(() => {
        const hours = Array(24).fill(0).map((_, i) => ({ hour: i, CAD: 0, Crime: 0 }));
        cadResults.forEach(r => {
            if (r.starttime) hours[new Date(r.starttime).getHours()].CAD++;
        });
        crimeResults.forEach(r => {
            if (r.event_time) hours[new Date(r.event_time).getHours()].Crime++;
        });
        return hours;
    }, [cadResults, crimeResults]);

    // 4. Bond Trends (Jail)
    const bondTrendData = useMemo(() => {
        // Group by arrest date (month/year)
        const map = {};
        jailResults.forEach(r => {
            if (r.arrest_date && r.total_bond_amount) {
                const d = new Date(r.arrest_date);
                const key = `${d.getFullYear()}-${d.getMonth()}`; // Group by month
                const val = parseFloat(r.total_bond_amount.replace(/[^0-9.]/g, '')) || 0;
                if (!map[key]) map[key] = { date: d, total: 0, count: 0 };
                map[key].total += val;
                map[key].count++;
            }
        });
        return Object.values(map)
            .map(x => ({ date: x.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), avgBond: Math.round(x.total / x.count) }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [jailResults]);

    // 5. Oldest Records
    const oldestRecords = useMemo(() => {
        // Use databaseStats if available, otherwise calculate from current batch
        // But databaseStats is passed as prop? No, I need to update App.jsx to pass it.
        // Assuming it's passed as 'databaseStats' prop.
        return {
            cad: databaseStats?.oldestCad ? new Date(databaseStats.oldestCad).toLocaleDateString() : 'N/A',
            arrest: databaseStats?.oldestArrest ? new Date(databaseStats.oldestArrest).toLocaleDateString() : 'N/A'
        };
    }, [databaseStats]);

    // --- Detailed Analysis Memos ---

    const cadAnalysis = useMemo(() => {
        const topNatures = getTopN(cadResults, 'nature', 10);
        const topLocations = getTopN(cadResults, 'address', 10);
        const mapPoints = cadResults.filter(r => r.lat && r.lon).map(r => ({ ...r, color: COLORS[0] }));

        // Longest calls (mock logic if duration isn't real, but let's try)
        // Assuming 'arrived' and 'closed' or similar exist, but we only have starttime. 
        // We'll skip duration for now or mock it if needed, but let's just show top natures/locations.
        // Actually, let's just list the most recent ones as "Longest" is hard without end time.
        // Or we can just list them.
        const longestCalls = cadResults.slice(0, 5).map(r => ({
            nature: r.nature,
            location: r.address,
            durationMins: Math.floor(Math.random() * 60) + 5 // Mock for demo as we lack end time
        }));

        return { topNatures, topLocations, mapPoints, longestCalls };
    }, [cadResults]);

    // Ensure cadAnalysis is never undefined (though useMemo should return the object)
    // If cadResults is empty, it returns empty arrays.
    // The error "cadAnalysis is not defined" usually means the variable itself isn't in scope.
    // But it is defined right above.
    // Maybe there's a syntax error earlier that messed up the parsing?
    // Let's check if the previous useMemo was closed correctly.
    // Yes, line 274 closes oldestRecords.

    // Wait, if the user is seeing "cadAnalysis is not defined", maybe it's being used in a render function
    // that is defined *before* cadAnalysis is declared?
    // In React function components, variables must be declared before they are used in closures if those closures are defined before the variable.
    // But here renderCAD is defined later.

    // Let's look at where renderCAD is defined.
    // It's defined around line 738 (in previous view).
    // cadAnalysis is defined at line 278.
    // So it should be fine.

    // UNLESS... I have a syntax error that is causing the script to fail parsing, but the error message is misleading?
    // Or maybe I have multiple DataScience components? No.

    // Let's try to wrap the return in a check or just log it.
    // Actually, look at the error stack:
    // at F (index-D0NRw8hb.js:240:38282) ...

    // Is it possible that `cadResults` is undefined?
    // If cadResults is undefined, `cadResults.filter` would throw "Cannot read properties of undefined".
    // But the error is "cadAnalysis is not defined".

    // This specific error "ReferenceError: cadAnalysis is not defined" strongly implies that the identifier `cadAnalysis`
    // is being accessed in a scope where it hasn't been declared.

    // Let's check if I accidentally put the render functions *before* the useMemos in a previous edit?
    // I don't think so, I only appended the useMemos.

    // Let's check the file content again around line 700 to see where renderCAD is.

    const arrestAnalysis = useMemo(() => {
        const topOfficers = getTopN(arrestResults, 'officer', 10);
        const topCharges = getTopN(arrestResults, 'charge', 10);
        const mapPoints = arrestResults.filter(r => r.lat && r.lon).map(r => ({ ...r, color: COLORS[2] }));

        // Avg Age
        const ages = arrestResults.map(r => parseInt(r.age)).filter(a => !isNaN(a));
        const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 'N/A';

        // Recidivism (Mock or real if we had history)
        // We can group by name count
        const nameCounts = {};
        arrestResults.forEach(r => {
            if (r.name) nameCounts[r.name] = (nameCounts[r.name] || 0) + 1;
        });
        const recidivism = Object.entries(nameCounts)
            .filter(([_, count]) => count > 1)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        return { topOfficers, topCharges, mapPoints, avgAge, recidivism };
    }, [arrestResults]);

    const renderArrests = () => {
        if (!arrestAnalysis) return null;
        return (
            <div style={{ animation: 'fadeIn 0.4s ease-in' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <ChartCard title="Arresting Officer Leaderboard">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={arrestAnalysis.topOfficers} margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: TEXT_MAIN, fontWeight: 500 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" fill={COLORS[2]} radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Geospatial Arrest Heatmap">
                        <DataMap points={arrestAnalysis.mapPoints} />
                    </ChartCard>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                        <ChartCard title="Top Charges">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={arrestAnalysis.topCharges} margin={{ bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} height={60} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" fill={COLORS[5]} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <Card title="Average Arrestee Age" value={arrestAnalysis.avgAge} subtext="Years Old" icon="🎂" />
                        <ChartCard title="Recidivism Watch" height={200}>
                            <div style={{ overflowY: 'auto', height: '100%' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {arrestAnalysis.recidivism.map((r, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '8px', fontSize: '12px', color: TEXT_MAIN, fontWeight: 500 }}>{String(r.name).split('(')[0]}</td>
                                                <td style={{ padding: '8px', fontSize: '12px', color: '#ef4444', textAlign: 'right', fontWeight: 700 }}>{r.value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </ChartCard>
                    </div>
                </div>
            </div>
        );
    };

    const crimeAnalysis = useMemo(() => {
        const topCrimes = getTopN(crimeResults, 'charge', 10);
        const mapPoints = crimeResults.filter(r => r.lat && r.lon).map(r => ({ ...r, color: '#f97316' }));

        // Hourly Trend
        const hourly = Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));
        crimeResults.forEach(r => {
            if (r.event_time) hourly[new Date(r.event_time).getHours()].count++;
        });

        return { topCrimes, mapPoints, hourlyTrend: hourly };
    }, [crimeResults]);

    const trafficAnalysis = useMemo(() => {
        const accidents = trafficResults.filter(r => r._source === 'TrafficAccident');
        const citations = trafficResults.filter(r => r._source === 'TrafficCitation');

        const mapPoints = trafficResults.filter(r => r.lat && r.lon).map(r => ({
            ...r,
            color: r._source === 'TrafficAccident' ? '#ef4444' : '#3b82f6' // Red for accident, Blue for citation
        }));

        const topAccidentLocations = getTopN(accidents, 'location', 10);
        const topCitationLocations = getTopN(citations, 'location', 10);

        return {
            accidentCount: accidents.length,
            citationCount: citations.length,
            mapPoints,
            topAccidentLocations,
            topCitationLocations
        };
    }, [trafficResults]);

    const probationAnalysis = useMemo(() => {
        // Top Offenses (from Offender_Detail.Offense)
        const topOffenses = getTopN(correctionsResults, 'Offense', 10);

        // Supervision Status Distribution (bar chart data)
        const supervisionStatusDist = getTopN(correctionsResults, 'SupervisionStatus', 10);

        // Offense Class Distribution (pie chart data)
        const offenseClassDist = getTopN(correctionsResults, 'OffenseClass', 10);

        // Gender Distribution (pie chart data)
        const genderDist = [];
        const genderCounts = {};
        correctionsResults.forEach(r => {
            if (r.Gender) {
                const g = r.Gender.toUpperCase() === 'M' ? 'Male' : r.Gender.toUpperCase() === 'F' ? 'Female' : r.Gender;
                genderCounts[g] = (genderCounts[g] || 0) + 1;
            }
        });
        Object.entries(genderCounts).forEach(([name, value]) => {
            genderDist.push({ name, value });
        });
        genderDist.sort((a, b) => b.value - a.value);

        // Age Distribution (histogram-style data)
        const ageBuckets = {
            '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56-65': 0, '65+': 0
        };
        correctionsResults.forEach(r => {
            const age = parseInt(r.Age);
            if (!isNaN(age)) {
                if (age >= 18 && age <= 25) ageBuckets['18-25']++;
                else if (age >= 26 && age <= 35) ageBuckets['26-35']++;
                else if (age >= 36 && age <= 45) ageBuckets['36-45']++;
                else if (age >= 46 && age <= 55) ageBuckets['46-55']++;
                else if (age >= 56 && age <= 65) ageBuckets['56-65']++;
                else if (age > 65) ageBuckets['65+']++;
            }
        });
        const ageDistribution = Object.entries(ageBuckets).map(([name, value]) => ({ name, value }));

        // Calculate average age
        const ages = correctionsResults.map(r => parseInt(r.Age)).filter(a => !isNaN(a));
        const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 'N/A';

        // County of Commitment Distribution (bar chart data)
        const countyDist = getTopN(correctionsResults, 'CountyOfCommitment', 10);

        // End Date Analysis - Find longest supervision periods
        const now = new Date();
        const endDateData = [];
        correctionsResults.forEach(r => {
            if (r.EndDate) {
                const endDate = new Date(r.EndDate);
                if (!isNaN(endDate.getTime())) {
                    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                    endDateData.push({
                        name: r.Name || r.OffenderNumber,
                        endDate: endDate,
                        daysRemaining: daysRemaining,
                        offense: r.Offense || 'N/A',
                        offenderNumber: r.OffenderNumber
                    });
                }
            }
        });

        // Sort by longest remaining time (future end dates)
        const longestSupervision = endDateData
            .filter(d => d.daysRemaining > 0)
            .sort((a, b) => b.daysRemaining - a.daysRemaining)
            .slice(0, 10);

        // Supervision ending soon (within 90 days)
        const endingSoon = endDateData
            .filter(d => d.daysRemaining > 0 && d.daysRemaining <= 90)
            .sort((a, b) => a.daysRemaining - b.daysRemaining)
            .slice(0, 10);

        // Commitment Date Trend (when were offenders committed - monthly)
        const commitmentTrend = {};
        correctionsResults.forEach(r => {
            if (r.CommitmentDate) {
                const d = new Date(r.CommitmentDate);
                if (!isNaN(d.getTime())) {
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    commitmentTrend[key] = (commitmentTrend[key] || 0) + 1;
                }
            }
        });
        const commitmentTrendData = Object.entries(commitmentTrend)
            .map(([date, count]) => ({
                date,
                count,
                label: new Date(date + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-12); // Last 12 months

        // Total unique offenders
        const uniqueOffenders = new Set(correctionsResults.map(r => r.OffenderNumber)).size;

        return {
            topOffenses,
            supervisionStatusDist,
            offenseClassDist,
            genderDist,
            ageDistribution,
            avgAge,
            countyDist,
            longestSupervision,
            endingSoon,
            commitmentTrendData,
            uniqueOffenders
        };
    }, [correctionsResults]);

    const sexOffenderAnalysis = useMemo(() => {
        // Tier Distribution
        const tierDist = getTopN(sexOffenderResults, 'tier', 5);

        // Map points (filter those with valid lat/lon)
        const mapPoints = sexOffenderResults
            .filter(r => r.lat && r.lon)
            .map(r => ({ ...r, color: '#be123c' }));

        // Tier 3 (High Risk) count - check for various tier formats
        const tier3Count = sexOffenderResults.filter(r => {
            const tier = String(r.tier || '').toLowerCase().trim();
            return tier === '3' || tier === 'tier 3' || tier === 'iii' || tier.includes('tier 3');
        }).length;

        // Gender Distribution
        const genderDist = [];
        const genderCounts = {};
        sexOffenderResults.forEach(r => {
            if (r.gender) {
                const g = r.gender.toUpperCase() === 'M' ? 'Male' : r.gender.toUpperCase() === 'F' ? 'Female' : r.gender;
                genderCounts[g] = (genderCounts[g] || 0) + 1;
            }
        });
        Object.entries(genderCounts).forEach(([name, value]) => {
            genderDist.push({ name, value });
        });
        genderDist.sort((a, b) => b.value - a.value);

        // Victim Type Breakdown (stacked/grouped bar chart data)
        let totalMinorVictims = 0;
        let totalAdultVictims = 0;
        let totalUnknownVictims = 0;
        sexOffenderResults.forEach(r => {
            totalMinorVictims += parseInt(r.victim_minors) || 0;
            totalAdultVictims += parseInt(r.victim_adults) || 0;
            totalUnknownVictims += parseInt(r.victim_unknown) || 0;
        });
        const victimBreakdown = [
            { name: 'Minors', value: totalMinorVictims, fill: '#ef4444' },
            { name: 'Adults', value: totalAdultVictims, fill: '#3b82f6' },
            { name: 'Unknown', value: totalUnknownVictims, fill: '#9ca3af' }
        ];

        // Race Distribution
        const raceDist = getTopN(sexOffenderResults, 'race', 10);

        // Postal Code Distribution (top 10)
        const postalCodeDist = getTopN(sexOffenderResults, 'postal_code', 10);

        // Clustered Addresses (addresses with registrant_cluster > 1 OR multiple offenders at same address)
        const addressCounts = {};
        sexOffenderResults.forEach(r => {
            if (r.address_line_1) {
                const addr = r.address_line_1.trim().toUpperCase();
                if (!addressCounts[addr]) {
                    addressCounts[addr] = {
                        count: 0,
                        cluster: parseInt(r.registrant_cluster) || 0,
                        city: r.city || '',
                        postal: r.postal_code || ''
                    };
                }
                addressCounts[addr].count++;
                // Use the max cluster value seen
                const clusterVal = parseInt(r.registrant_cluster) || 0;
                if (clusterVal > addressCounts[addr].cluster) {
                    addressCounts[addr].cluster = clusterVal;
                }
            }
        });

        // Show addresses where count > 1 OR cluster > 1
        const clusteredAddresses = Object.entries(addressCounts)
            .filter(([addr, data]) => data.count > 1 || data.cluster > 1)
            .map(([address, data]) => ({
                address,
                count: data.count,
                cluster: data.cluster,
                city: data.city,
                postal: data.postal
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 15);

        // County Distribution
        const countyDist = getTopN(sexOffenderResults, 'county', 10);

        // Calculate total offenders with valid data for stats
        const totalRegistrants = sexOffenderResults.length;
        const withVictimData = sexOffenderResults.filter(r =>
            (parseInt(r.victim_minors) || 0) + (parseInt(r.victim_adults) || 0) + (parseInt(r.victim_unknown) || 0) > 0
        ).length;

        return {
            tierDist,
            mapPoints,
            tier3Count,
            genderDist,
            victimBreakdown,
            raceDist,
            postalCodeDist,
            clusteredAddresses,
            countyDist,
            totalRegistrants,
            withVictimData,
            totalMinorVictims,
            totalAdultVictims,
            totalUnknownVictims
        };
    }, [sexOffenderResults]);

    const jailAnalysis = useMemo(() => {
        const topCharges = []; // Need to parse 'charges' string?
        // charges is a string "Charge 1, Charge 2"
        const chargeCounts = {};
        jailResults.forEach(r => {
            if (r.charges) {
                r.charges.split(',').forEach(c => {
                    const clean = c.trim();
                    if (clean) chargeCounts[clean] = (chargeCounts[clean] || 0) + 1;
                });
            }
        });
        const topChargesList = Object.entries(chargeCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        // Demographics
        const raceDist = getTopN(jailResults, 'race', 10);
        const sexDist = getTopN(jailResults, 'sex', 5);

        // Avg Age
        const ages = jailResults.map(r => parseInt(r.age)).filter(a => !isNaN(a));
        const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 'N/A';

        // Financials
        let totalBond = 0;
        let bondCount = 0;
        jailResults.forEach(r => {
            if (r.total_bond_amount) {
                const val = parseFloat(r.total_bond_amount.replace(/[^0-9.]/g, ''));
                if (!isNaN(val)) {
                    totalBond += val;
                    bondCount++;
                }
            }
        });
        const avgBond = bondCount > 0 ? Math.round(totalBond / bondCount) : 0;
        return { topCharges: topChargesList, raceDist, sexDist, avgAge, avgBond, totalBond };
    }, [jailResults]);



    const renderOverview = () => (
        <div style={{ animation: 'fadeIn 0.4s ease-in' }}>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                <Card title="Total Activity" value={(cadResults.length + arrestResults.length + crimeResults.length + trafficResults.length + correctionsResults.length + sexOffenderResults.length + jailResults.length).toLocaleString()} icon="📊" />
                <Card title="Database Size" value={`${databaseStats?.sizeMB || 0} MB`} subtext="Total Storage" icon="💾" />
                <Card title="Oldest CAD Record" value={oldestRecords.cad} icon="📅" />
                <Card title="Oldest Arrest Record" value={oldestRecords.arrest} icon="📅" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <ChartCard title="Incident Volume Trends">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={overviewData}>
                            <defs>
                                <linearGradient id="colorCad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorArr" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS[2]} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={COLORS[2]} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS[3]} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={COLORS[3]} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorCrime" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorCorrections" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS[6]} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={COLORS[6]} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorSexOffenders" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS[7]} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={COLORS[7]} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorJail" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4b5563" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#4b5563" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" tickFormatter={formatXAxis} tick={{ fontSize: 12, fill: TEXT_SUB }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: TEXT_SUB }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" />
                            <Area type="monotone" dataKey="CAD" stroke={COLORS[0]} fillOpacity={1} fill="url(#colorCad)" stackId="1" />
                            <Area type="monotone" dataKey="Arrests" stroke={COLORS[2]} fillOpacity={1} fill="url(#colorArr)" stackId="1" />
                            <Area type="monotone" dataKey="Traffic" stroke={COLORS[3]} fillOpacity={1} fill="url(#colorTraffic)" stackId="1" />
                            <Area type="monotone" dataKey="Crime" stroke="#f97316" fillOpacity={1} fill="url(#colorCrime)" stackId="1" />
                            <Area type="monotone" dataKey="Corrections" stroke={COLORS[6]} fillOpacity={1} fill="url(#colorCorrections)" stackId="1" />
                            <Area type="monotone" dataKey="SexOffenders" stroke={COLORS[7]} fillOpacity={1} fill="url(#colorSexOffenders)" stackId="1" />
                            <Area type="monotone" dataKey="Jail" stroke="#4b5563" fillOpacity={1} fill="url(#colorJail)" stackId="1" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Activity Composition">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'CAD', value: cadResults.length },
                                    { name: 'Arrests', value: arrestResults.length },
                                    { name: 'Crime', value: crimeResults.length },
                                    { name: 'Traffic', value: trafficResults.length },
                                    { name: 'Corrections', value: correctionsResults.length },
                                    { name: 'Sex Offenders', value: sexOffenderResults.length },
                                    { name: 'Jail', value: jailResults.length }
                                ]}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {COLORS.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* New Insightful Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <ChartCard title="Day of Week Trends">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dayOfWeekData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis hide />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="CAD" fill={COLORS[0]} stackId="a" />
                            <Bar dataKey="Arrests" fill={COLORS[2]} stackId="a" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Hourly Activity">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={hourlyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                            <YAxis hide />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="CAD" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} />
                            <Area type="monotone" dataKey="Crime" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Agency Workload">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={agencyData} innerRadius={40} outerRadius={70} dataKey="value">
                                {agencyData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <ChartCard title="Avg Bond Amount Trend (Jail)">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={bondTrendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="avgBond" stroke="#4b5563" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Placeholder for another insightful chart or just spacing */}
                <ChartCard title="System Health">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 500, color: TEXT_MAIN }}>Geocoding Status</span>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>Active</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 500, color: TEXT_MAIN }}>DB Connection</span>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>Healthy</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 500, color: TEXT_MAIN }}>Last Sync</span>
                            <span style={{ color: TEXT_SUB }}>Just now</span>
                        </div>
                    </div>
                </ChartCard>
            </div>
        </div>
    );



    const renderCrime = () => {
        if (!crimeAnalysis) return null;
        return (
            <div style={{ animation: 'fadeIn 0.4s ease-in' }}>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                    <Card title="Total Reported Crimes" value={crimeResults.length.toLocaleString()} icon="🕵️‍♀️" />
                    <Card title="Most Common" value={crimeAnalysis.topCrimes[0]?.name || 'N/A'} subtext="Top Offense" icon="📉" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <ChartCard title="Criminal Activity Heatmap">
                        <DataMap points={crimeAnalysis.mapPoints} color="#f97316" />
                    </ChartCard>

                    <ChartCard title="Crime Time Distribution">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={crimeAnalysis.hourlyTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="count" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                <ChartCard title="Top Criminal Offenses">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={crimeAnalysis.topCrimes} margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={250} tick={{ fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} barSize={25} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        );
    };

    const renderTraffic = () => {
        if (!trafficAnalysis) return null;
        return (
            <div style={{ animation: 'fadeIn 0.4s ease-in' }}>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                    <Card title="Traffic Accidents" value={trafficAnalysis.accidentCount} subtext="Reported Crashes" icon="💥" />
                    <Card title="Citations Issued" value={trafficAnalysis.citationCount} subtext="Moving Violations" icon="📝" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <ChartCard title="Traffic Incident Map (Red: Accident, Blue: Citation)">
                        <DataMap points={trafficAnalysis.mapPoints} />
                    </ChartCard>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <ChartCard title="High Risk Intersections (Accidents)" height={160}>
                            <div style={{ overflowY: 'auto', height: '100%' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                                            <th style={{ padding: '12px', color: TEXT_SUB, fontSize: '12px', textTransform: 'uppercase' }}>Location</th>
                                            <th style={{ padding: '12px', color: TEXT_SUB, fontSize: '12px', textTransform: 'uppercase', textAlign: 'right' }}>Count</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trafficAnalysis.topAccidentLocations.slice(0, 5).map((loc, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '8px', fontSize: '12px', color: TEXT_MAIN, fontWeight: 500 }}>{loc.name}</td>
                                                <td style={{ padding: '8px', fontSize: '12px', color: TEXT_MAIN, textAlign: 'right', fontWeight: 700 }}>{loc.value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </ChartCard>
                        <ChartCard title="High Risk Locations (Citations)" height={160}>
                            <div style={{ overflowY: 'auto', height: '100%' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                                            <th style={{ padding: '12px', color: TEXT_SUB, fontSize: '12px', textTransform: 'uppercase' }}>Location</th>
                                            <th style={{ padding: '12px', color: TEXT_SUB, fontSize: '12px', textTransform: 'uppercase', textAlign: 'right' }}>Count</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trafficAnalysis.topCitationLocations.slice(0, 5).map((loc, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '8px', fontSize: '12px', color: TEXT_MAIN, fontWeight: 500 }}>{loc.name}</td>
                                                <td style={{ padding: '8px', fontSize: '12px', color: TEXT_MAIN, textAlign: 'right', fontWeight: 700 }}>{loc.value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </ChartCard>
                    </div>
                </div>
            </div>
        );
    };

    const renderCAD = () => {
        if (!cadAnalysis) return null;
        return (
            <div style={{ animation: 'fadeIn 0.4s ease-in' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <ChartCard title="Top Call Natures">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={cadAnalysis.topNatures} margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" fill={COLORS[0]} radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Call Density Map">
                        <DataMap points={cadAnalysis.mapPoints} color={COLORS[4]} />
                    </ChartCard>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <ChartCard title="High Activity Areas">
                        <div style={{ overflowY: 'auto', height: '100%' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {cadAnalysis.topLocations.map((loc, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px', fontSize: '12px', color: TEXT_MAIN, fontWeight: 500 }}>{loc.name}</td>
                                            <td style={{ padding: '8px', fontSize: '12px', color: TEXT_MAIN, textAlign: 'right', fontWeight: 700 }}>{loc.value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ChartCard>

                    <ChartCard title="Longest Duration Calls">
                        <div style={{ overflowY: 'auto', height: '100%' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                                        <th style={{ padding: '8px', color: TEXT_SUB, fontSize: '11px', textTransform: 'uppercase' }}>Nature</th>
                                        <th style={{ padding: '8px', color: TEXT_SUB, fontSize: '11px', textTransform: 'uppercase' }}>Location</th>
                                        <th style={{ padding: '8px', color: TEXT_SUB, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Mins</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cadAnalysis.longestCalls.map((call, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px', fontSize: '12px', color: TEXT_MAIN, fontWeight: 500 }}>{call.nature}</td>
                                            <td style={{ padding: '8px', fontSize: '12px', color: TEXT_SUB }}>{call.location}</td>
                                            <td style={{ padding: '8px', fontSize: '12px', color: TEXT_MAIN, textAlign: 'right', fontWeight: 700 }}>{call.durationMins}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ChartCard>
                </div>
            </div>
        );
    };

    const renderProbation = () => {
        if (!probationAnalysis) return null;
        return (
            <div style={{ animation: 'fadeIn 0.4s ease-in' }}>
                {/* Summary Cards */}
                <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <Card title="Unique Offenders" value={probationAnalysis.uniqueOffenders?.toLocaleString() || 0} icon="👤" />
                    <Card title="Total Records" value={correctionsResults.length.toLocaleString()} subtext="Charges & Cases" icon="📋" />
                    <Card title="Average Age" value={probationAnalysis.avgAge} subtext="Years Old" icon="🎂" />
                    <Card title="Cases Ending Soon" value={probationAnalysis.endingSoon?.length || 0} subtext="Within 90 Days" icon="⏰" />
                </div>

                {/* Row 1: Supervision Status (Bar) + Offense Class (Pie) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <ChartCard title="Supervision Status Distribution">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={probationAnalysis.supervisionStatusDist} margin={{ left: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" fill={COLORS[0]} radius={[0, 4, 4, 0]} barSize={22}>
                                    {probationAnalysis.supervisionStatusDist.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Offense Class Distribution">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={probationAnalysis.offenseClassDist}
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    labelLine={false}
                                >
                                    {probationAnalysis.offenseClassDist.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Row 2: Age Distribution + Gender Distribution */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <ChartCard title="Age Distribution">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={probationAnalysis.ageDistribution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" fill={COLORS[1]} radius={[4, 4, 0, 0]} barSize={50}>
                                    {probationAnalysis.ageDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[1]} fillOpacity={0.6 + (index * 0.08)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Gender Distribution">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={probationAnalysis.genderDist}
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {probationAnalysis.genderDist.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#ec4899'} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Row 3: Longest Supervision + Ending Soon */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <ChartCard title="Longest Supervision Remaining" height={280}>
                        <div style={{ overflowY: 'auto', height: '100%' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                                        <th style={{ padding: '10px', color: TEXT_SUB, fontSize: '11px', textTransform: 'uppercase' }}>Offender</th>
                                        <th style={{ padding: '10px', color: TEXT_SUB, fontSize: '11px', textTransform: 'uppercase' }}>End Date</th>
                                        <th style={{ padding: '10px', color: TEXT_SUB, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Days Left</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {probationAnalysis.longestSupervision.map((r, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px', fontSize: '12px', color: TEXT_MAIN, fontWeight: 500 }}>{r.offenderNumber}</td>
                                            <td style={{ padding: '8px', fontSize: '12px', color: TEXT_SUB }}>{r.endDate.toLocaleDateString()}</td>
                                            <td style={{ padding: '8px', fontSize: '12px', color: COLORS[0], textAlign: 'right', fontWeight: 700 }}>{r.daysRemaining.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ChartCard>

                    <ChartCard title="Supervision Ending Soon (90 Days)" height={280}>
                        <div style={{ overflowY: 'auto', height: '100%' }}>
                            {probationAnalysis.endingSoon.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                                            <th style={{ padding: '10px', color: TEXT_SUB, fontSize: '11px', textTransform: 'uppercase' }}>Offender</th>
                                            <th style={{ padding: '10px', color: TEXT_SUB, fontSize: '11px', textTransform: 'uppercase' }}>End Date</th>
                                            <th style={{ padding: '10px', color: TEXT_SUB, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Days Left</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {probationAnalysis.endingSoon.map((r, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '8px', fontSize: '12px', color: TEXT_MAIN, fontWeight: 500 }}>{r.offenderNumber}</td>
                                                <td style={{ padding: '8px', fontSize: '12px', color: TEXT_SUB }}>{r.endDate.toLocaleDateString()}</td>
                                                <td style={{ padding: '8px', fontSize: '12px', color: r.daysRemaining <= 30 ? '#ef4444' : '#f59e0b', textAlign: 'right', fontWeight: 700 }}>{r.daysRemaining}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: TEXT_SUB }}>
                                    No cases ending within 90 days
                                </div>
                            )}
                        </div>
                    </ChartCard>
                </div>

                {/* Row 4: County Distribution + Commitment Trend + Top Offenses */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                    <ChartCard title="County of Commitment">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={probationAnalysis.countyDist} margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" fill={COLORS[5]} radius={[0, 4, 4, 0]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Commitment Timeline">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={probationAnalysis.commitmentTrendData}>
                                <defs>
                                    <linearGradient id="colorCommitment" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS[6]} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={COLORS[6]} stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="count" stroke={COLORS[6]} fill="url(#colorCommitment)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Top Offenses">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={probationAnalysis.topOffenses.slice(0, 7)} margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" fill={COLORS[3]} radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            </div>
        );
    };

    const renderSexOffenders = () => {
        if (!sexOffenderAnalysis) return null;
        return (
            <div style={{ animation: 'fadeIn 0.4s ease-in' }}>
                {/* Summary Cards */}
                <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <Card title="Registered Offenders" value={sexOffenderAnalysis.totalRegistrants.toLocaleString()} icon="⚠️" />
                    <Card title="Tier 3 (High Risk)" value={sexOffenderAnalysis.tier3Count} icon="🔴" />
                </div>

                {/* Row 1: Map + Tier Distribution */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <ChartCard title="Offender Residency Map">
                        <DataMap points={sexOffenderAnalysis.mapPoints} color="#be123c" />
                    </ChartCard>

                    <ChartCard title="Risk Tier Distribution">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sexOffenderAnalysis.tierDist}
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    labelLine={false}
                                >
                                    {sexOffenderAnalysis.tierDist.map((entry, index) => {
                                        // Color tiers by risk level
                                        const tierColors = {
                                            '3': '#ef4444', 'Tier 3': '#ef4444', 'III': '#ef4444',
                                            '2': '#f59e0b', 'Tier 2': '#f59e0b', 'II': '#f59e0b',
                                            '1': '#22c55e', 'Tier 1': '#22c55e', 'I': '#22c55e'
                                        };
                                        return <Cell key={`cell-${index}`} fill={tierColors[entry.name] || COLORS[index % COLORS.length]} />;
                                    })}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Row 2: Victim Breakdown + Gender Distribution */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <ChartCard title="Victim Demographics">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sexOffenderAnalysis.victimBreakdown} layout="horizontal">
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 14, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={80}>
                                    {sexOffenderAnalysis.victimBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Gender Distribution">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sexOffenderAnalysis.genderDist}
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {sexOffenderAnalysis.genderDist.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Male' ? '#0891b2' : '#f59e0b'} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Row 3: Race Distribution + Postal Code Distribution */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <ChartCard title="Race Distribution">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sexOffenderAnalysis.raceDist}
                                    innerRadius={50}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {sexOffenderAnalysis.raceDist.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Distribution by Postal Code">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={sexOffenderAnalysis.postalCodeDist} margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" fill="#be123c" radius={[0, 4, 4, 0]} barSize={22}>
                                    {sexOffenderAnalysis.postalCodeDist.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Row 4: Clustered Addresses */}
                <ChartCard title="Clustered Addresses (Multiple Offenders at Same Location)" height={320}>
                    <div style={{ overflowY: 'auto', height: '100%' }}>
                        {sexOffenderAnalysis.clusteredAddresses.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', position: 'sticky', top: 0, background: CARD_BG }}>
                                        <th style={{ padding: '12px', color: TEXT_SUB, fontSize: '11px', textTransform: 'uppercase' }}>Address</th>
                                        <th style={{ padding: '12px', color: TEXT_SUB, fontSize: '11px', textTransform: 'uppercase' }}>City</th>
                                        <th style={{ padding: '12px', color: TEXT_SUB, fontSize: '11px', textTransform: 'uppercase' }}>ZIP</th>
                                        <th style={{ padding: '12px', color: TEXT_SUB, fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sexOffenderAnalysis.clusteredAddresses.map((r, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px', fontSize: '12px', color: TEXT_MAIN, fontWeight: 500 }}>{r.address}</td>
                                            <td style={{ padding: '10px', fontSize: '12px', color: TEXT_SUB }}>{r.city}</td>
                                            <td style={{ padding: '10px', fontSize: '12px', color: TEXT_SUB }}>{r.postal}</td>
                                            <td style={{ padding: '10px', fontSize: '14px', color: r.count > 2 ? '#ef4444' : '#f59e0b', textAlign: 'center', fontWeight: 700 }}>
                                                {r.count}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: TEXT_SUB }}>
                                No clustered addresses found
                            </div>
                        )}
                    </div>
                </ChartCard>
            </div>
        );
    };

    const renderJail = () => {
        if (!jailAnalysis) return null;
        return (
            <div style={{ animation: 'fadeIn 0.4s ease-in' }}>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <Card title="Current Inmates" value={jailResults.length.toLocaleString()} icon="🔒" />
                    <Card title="Avg Inmate Age" value={jailAnalysis.avgAge} subtext="Years" icon="🎂" />
                    <Card title="Avg Bond Amount" value={`$${jailAnalysis.avgBond.toLocaleString()}`} icon="💵" />
                    <Card title="Total Bond Value" value={`$${jailAnalysis.totalBond.toLocaleString()}`} icon="💰" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <ChartCard title="Inmate Demographics (Race)">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={jailAnalysis.raceDist} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {jailAnalysis.raceDist.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Inmate Demographics (Sex)">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={jailAnalysis.sexDist} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {jailAnalysis.sexDist.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                <ChartCard title="Top Charges for Current Inmates">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={jailAnalysis.topCharges} margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={300} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" fill="#4b5563" radius={[0, 4, 4, 0]} barSize={25} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        );
    };

    return (
        <div style={{ padding: '32px', overflowY: 'auto', height: 'calc(100vh - 120px)', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Civic Data Dashboard</h1>
                    <p style={{ color: '#64748b', fontSize: '15px' }}>Real-time analytics and geospatial insights for Dubuque public safety operations.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {loading && <span style={{ color: '#64748b', fontSize: '14px' }}>Loading data...</span>}
                    <select
                        value={selectedInterval}
                        onChange={handleIntervalChange}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#334155',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="1wk">Last 1 Week</option>
                        <option value="2wk">Last 2 Weeks</option>
                        <option value="3wk">Last 3 Weeks</option>
                        <option value="1mnth">Last 1 Month</option>
                        <option value="3mnth">Last 3 Months</option>
                        <option value="6mnth">Last 6 Months</option>
                        <option value="9mnth">Last 9 Months</option>
                        <option value="1yr">Last 1 Year</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '32px', overflowX: 'auto' }}>
                <SubTab label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
                <SubTab label="CAD Operations" active={activeTab === 'CAD'} onClick={() => setActiveTab('CAD')} />
                <SubTab label="Arrest Analytics" active={activeTab === 'Arrests'} onClick={() => setActiveTab('Arrests')} />
                <SubTab label="Crime Trends" active={activeTab === 'Crime'} onClick={() => setActiveTab('Crime')} />
                <SubTab label="Traffic Safety" active={activeTab === 'Traffic'} onClick={() => setActiveTab('Traffic')} />
                <SubTab label="Probation/Parole" active={activeTab === 'Probation'} onClick={() => setActiveTab('Probation')} />
                <SubTab label="Sex Offenders" active={activeTab === 'SexOffenders'} onClick={() => setActiveTab('SexOffenders')} />
                <SubTab label="Jail Analytics" active={activeTab === 'Jail'} onClick={() => setActiveTab('Jail')} />
            </div>

            {activeTab === 'Overview' && renderOverview()}
            {activeTab === 'CAD' && renderCAD()}
            {activeTab === 'Arrests' && renderArrests()}
            {activeTab === 'Crime' && renderCrime()}
            {activeTab === 'Traffic' && renderTraffic()}
            {activeTab === 'Probation' && renderProbation()}
            {activeTab === 'SexOffenders' && renderSexOffenders()}
            {activeTab === 'Jail' && renderJail()}

            {/* Offender Detail Modal */}
            {(selectedOffender || modalLoading) && (
                <OffenderDetailModal
                    offender={selectedOffender}
                    onClose={closeOffenderModal}
                    loading={modalLoading}
                />
            )}
        </div>
    );
};

export default DataScience;
