import React, { useState } from 'react';

const NewSectionForm = ({ onCreate, onCancel }) => {
  const [title, setTitle] = useState('');
  const [columns, setColumns] = useState([
    { name: 'Date', type: 'date' }
  ]);

  const addColumn = () => {
    setColumns([...columns, { name: '', type: 'text' }]);
  };

  const updateColumn = (index, field, value) => {
    const updatedColumns = [...columns];
    updatedColumns[index][field] = value;
    setColumns(updatedColumns);
  };

  const removeColumn = (index) => {
    if (columns.length <= 1) return;
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({ title, columns });
  };

  return (
    <div className="new-section-form">
      <h3>Create New Section</h3>
      <form onSubmit={handleSubmit}>
        <label>
          Section Title:
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <h4>Columns:</h4>
        {columns.map((col, index) => (
          <div key={index} className="column-config">
            <input
              type="text"
              value={col.name}
              onChange={(e) => updateColumn(index, 'name', e.target.value)}
              placeholder="Column name"
              required
            />
            <select
              value={col.type}
              onChange={(e) => updateColumn(index, 'type', e.target.value)}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
            </select>
            <button
              type="button"
              onClick={() => removeColumn(index)}
              disabled={columns.length <= 1}
            >
              Remove
            </button>
          </div>
        ))}

        <button type="button" onClick={addColumn}>
          + Add Column
        </button>

        <div className="form-actions">
          <button type="submit">Create</button>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default NewSectionForm;
