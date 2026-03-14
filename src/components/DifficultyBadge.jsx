import React from 'react';
import { Box, Chip, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';

const DifficultyBadge = ({ value, onChange, variant = 'display', size = 'small' }) => {
  const difficulties = [
    { value: 'easy', label: '🟢 Easy', color: '#4caf50', bgColor: '#e8f5e9' },
    { value: 'medium', label: '🟡 Medium', color: '#ff9800', bgColor: '#fff3e0' },
    { value: 'hard', label: '🔴 Hard', color: '#f44336', bgColor: '#ffebee' },
  ];

  const difficulty = difficulties.find(d => d.value === value);

  if (variant === 'display') {
    if (!value) return null;
    return (
      <Chip
        label={difficulty?.label}
        size={size}
        sx={{
          bgcolor: difficulty?.bgColor,
          color: difficulty?.color,
          fontWeight: 600,
          border: `1px solid ${difficulty?.color}`,
        }}
      />
    );
  }

  if (variant === 'selector') {
    return (
      <ToggleButtonGroup
        value={value || ''}
        exclusive
        onChange={(e, newValue) => onChange(newValue)}
        size={size}
        fullWidth
        sx={{
          display: 'flex',
          gap: 0.5,
          '& .MuiToggleButton-root': {
            flex: 1,
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            py: 0.75,
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            },
          },
        }}
      >
        {difficulties.map((d) => (
          <Tooltip key={d.value} title={d.label} arrow>
            <ToggleButton value={d.value} aria-label={d.label}>
              {d.label}
            </ToggleButton>
          </Tooltip>
        ))}
      </ToggleButtonGroup>
    );
  }

  return null;
};

export default DifficultyBadge;
