import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Charts = ({ data }) => {
  const incidentsByTime = data.reduce((acc, curr) => {
    const date = new Date(curr.starttime || curr.event_time).toLocaleDateString();
    if (acc[date]) {
      acc[date]++;
    } else {
      acc[date] = 1;
    }
    return acc;
  }, {});

  const incidentsByType = data.reduce((acc, curr) => {
    const type = curr.nature || curr.charge || 'Unknown';
    if (acc[type]) {
      acc[type]++;
    } else {
      acc[type] = 1;
    }
    return acc;
  }, {});

  const chartDataByTime = Object.keys(incidentsByTime).map(key => ({
    date: key,
    count: incidentsByTime[key],
  }));

  const chartDataByType = Object.keys(incidentsByType).map(key => ({
    type: key,
    count: incidentsByType[key],
  })).sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <div className="charts-container">
      <h3>Incidents by Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartDataByTime}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>

      <h3>Top 10 Incident Types</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartDataByType} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="type" width={150} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Charts;