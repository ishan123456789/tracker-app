import React, { useState, useEffect } from 'react';
import SectionList from './components/SectionList.jsx';
import './App.css';

function App() {
  const [sections, setSections] = useState(() => {
    const saved = localStorage.getItem('activity-tracker');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage whenever sections change
  useEffect(() => {
    localStorage.setItem('activity-tracker', JSON.stringify(sections));
  }, [sections]);

  const addSection = (section) => {
    setSections([...sections, section]);
  };

  const updateSection = (id, updatedSection) => {
    setSections(sections.map(section =>
      section.id === id ? updatedSection : section
    ));
  };

  const deleteSection = (id) => {
    setSections(sections.filter(section => section.id !== id));
  };

  return (
    <div className="app">
      <header>
        <h1>Activity Tracker</h1>
      </header>
      <main>
        <SectionList
          sections={sections}
          addSection={addSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
        />
      </main>
    </div>
  );
}

export default App;


