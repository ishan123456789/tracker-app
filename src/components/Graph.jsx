import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const Graph = ({ data, columns }) => {
  const [selectedLegend, setSelectedLegend] = useState(null);

  const numericColumns = columns.filter(col => col.type === 'number').map(col => col.name);
  const dateColumn = columns.find(col => col.type === 'date').name;

  const handleLegendClick = (e) => {
    if (selectedLegend === e.dataKey) {
      setSelectedLegend(null);
    } else {
      setSelectedLegend(e.dataKey);
    }
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={dateColumn} />
        <YAxis />
        <Tooltip />
        <Legend onClick={handleLegendClick} />
        {numericColumns.map((colName, index) => (
          <Line 
            key={index} 
            type="monotone" 
            dataKey={colName} 
            stroke={`#${Math.floor(Math.random()*16777215).toString(16)}`} 
            strokeOpacity={selectedLegend === null || selectedLegend === colName ? 1 : 0.2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default Graph;