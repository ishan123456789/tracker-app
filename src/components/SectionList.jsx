// src/components/SectionList.js
import React, { useState } from 'react';
import Section from './Section';
import NewSectionForm from './NewSectionForm.jsx';
import { v4 as uuidv4 } from 'uuid';

const SectionList = ({ sections, addSection, updateSection, deleteSection }) => {
  const [showForm, setShowForm] = useState(false);

  const handleCreateSection = (sectionData) => {
    const newSection = {
      id: uuidv4(),
      title: sectionData.title,
      columns: sectionData.columns,
      entries: []
    };
    addSection(newSection);
    setShowForm(false);
  };

  return (
    <div className="section-list">
      {sections.map(section => (
        <Section
          key={section.id}
          section={section}
          updateSection={updateSection}
          deleteSection={deleteSection}
        />
      ))}

      {showForm ? (
        <NewSectionForm
          onCreate={handleCreateSection}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button
          className="add-section-btn"
          onClick={() => setShowForm(true)}
        >
          + Add New Section
        </button>
      )}
    </div>
  );
};

export default SectionList;
