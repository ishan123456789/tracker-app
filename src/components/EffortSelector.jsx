import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';

const EffortSelector = ({ value, onChange, size = 'medium', fullWidth = false }) => {
  const effortLevels = [
    { value: 'low', label: '⚡ Low', tooltip: 'Quick task (< 15 min)' },
    { value: 'medium', label: '⚡⚡ Medium', tooltip: 'Standard task (15-60 min)' },
    { value: 'deep_work', label: '⚡⚡⚡ Deep Work', tooltip: 'Focus task (> 60 min)' },
  ];

  return (
    <ToggleButtonGroup
      value={value || ''}
      exclusive
      onChange={(e, newValue) => onChange(newValue)}
      size={size}
      fullWidth={fullWidth}
      sx={{
        display: 'flex',
        gap: 0.5,
        '& .MuiToggleButton-root': {
          flex: 1,
          textTransform: 'none',
          fontWeight: 500,
          fontSize: size === 'small' ? '0.75rem' : '0.875rem',
          py: size === 'small' ? 0.5 : 1,
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
      {effortLevels.map((level) => (
        <Tooltip key={level.value} title={level.tooltip} arrow>
          <ToggleButton value={level.value} aria-label={level.label}>
            {level.label}
          </ToggleButton>
        </Tooltip>
      ))}
    </ToggleButtonGroup>
  );
};

export default EffortSelector;
