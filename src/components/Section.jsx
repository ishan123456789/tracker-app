import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const Section = ({ section, updateSection, deleteSection }) => {
  const [newEntry, setNewEntry] = useState({});
  const [isAdding, setIsAdding] = useState(false);

  const handleInputChange = (colName, value) => {
    setNewEntry({ ...newEntry, [colName]: value });
  };

  const addEntry = () => {
    const entry = {
      id: uuidv4(),
      ...newEntry,
      date: newEntry.date || new Date().toISOString().split('T')[0]
    };

    const updatedSection = {
      ...section,
      entries: [...section.entries, entry]
    };

    updateSection(section.id, updatedSection);
    setNewEntry({});
    setIsAdding(false);
  };

  const deleteEntry = (entryId) => {
    const updatedSection = {
      ...section,
      entries: section.entries.filter(entry => entry.id !== entryId)
    };
    updateSection(section.id, updatedSection);
  };

  return (
    <div className="section">
      <div className="section-header">
        <h2>{section.title}</h2>
        <div>
          <button onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? 'Cancel' : '+ Add Entry'}
          </button>
          <button onClick={() => deleteSection(section.id)}>Delete</button>
        </div>
      </div>

      {isAdding && (
        <div className="add-entry-form">
          {section.columns.map((col, index) => (
            <div key={index}>
              <label>{col.name}:</label>
              {col.type === 'date' ? (
                <input
                  type="date"
                  value={newEntry[col.name] || ''}
                  onChange={(e) => handleInputChange(col.name, e.target.value)}
                  required
                />
              ) : col.type === 'number' ? (
                <input
                  type="number"
                  value={newEntry[col.name] || ''}
                  onChange={(e) => handleInputChange(col.name, e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  value={newEntry[col.name] || ''}
                  onChange={(e) => handleInputChange(col.name, e.target.value)}
                />
              )}
            </div>
          ))}
          <button onClick={addEntry}>Add</button>
        </div>
      )}

      <div className="section-content">
        {section.entries.length > 0 ? (
          <table>
            <thead>
              <tr>
                {section.columns.map((col, index) => (
                  <th key={index}>{col.name}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {section.entries.map((entry) => (
                <tr key={entry.id}>
                  {section.columns.map((col, index) => (
                    <td key={index}>
                      {col.type === 'date'
                        ? new Date(entry[col.name]).toLocaleDateString()
                        : entry[col.name]}
                    </td>
                  ))}
                  <td>
                    <button onClick={() => deleteEntry(entry.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No entries yet. Click "Add Entry" to get started.</p>
        )}
      </div>
    </div>
  );
};

export default Section;
