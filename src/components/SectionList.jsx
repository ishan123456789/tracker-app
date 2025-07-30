import React, { useState } from 'react';
import Section from './Section';
import NewSectionForm from './NewSectionForm.jsx';
import { v4 as uuidv4 } from 'uuid';
import { Button, Box } from '@mui/material';
import { Add } from '@mui/icons-material';

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
    <Box sx={{ mt: 4 }}>
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
          onSubmit={handleCreateSection}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <Box textAlign="center" sx={{ mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Add />}
            onClick={() => setShowForm(true)}
          >
            Add New Section
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default SectionList;


