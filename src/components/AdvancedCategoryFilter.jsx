import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Button,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Divider
} from '@mui/material';
import {
  ExpandMore,
  Clear,
  FilterList,
  Category,
  Label,
  Assignment
} from '@mui/icons-material';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const AdvancedCategoryFilter = ({
  selectedCategories = [],
  selectedSubcategories = [],
  selectedActivityTypes = [],
  onCategoriesChange,
  onSubcategoriesChange,
  onActivityTypesChange,
  onClearAll,
  showCompact = false,
  className = ""
}) => {
  const categoryOptions = useQuery(api.categoryHierarchy.getCategoryOptions);
  const [isExpanded, setIsExpanded] = useState(!showCompact);

  // Get all unique values from existing todos for better filtering
  const todos = useQuery(api.todos.get) || [];

  // Extract unique categories from both category options and actual data
  const uniqueCategories = useMemo(() => {
    const categories = new Set();

    // Add categories from category hierarchy
    if (categoryOptions?.mainCategories) {
      categoryOptions.mainCategories.forEach(cat => categories.add(cat.value));
    }

    // Add categories from actual todos
    todos.forEach(todo => {
      if (todo.mainCategory) categories.add(todo.mainCategory);
      if (todo.category) categories.add(todo.category); // Legacy support
    });

    return Array.from(categories).sort();
  }, [todos, categoryOptions]);

  const uniqueSubcategories = useMemo(() => {
    const subcategories = new Set();

    // Add subcategories from category hierarchy
    if (categoryOptions?.subcategoriesByMain) {
      categoryOptions.subcategoriesByMain.forEach(item => {
        item.subcategories.forEach(sub => subcategories.add(sub.value));
      });
    }

    // Add subcategories from actual todos
    todos.forEach(todo => {
      if (todo.subcategory) subcategories.add(todo.subcategory);
    });

    return Array.from(subcategories).sort();
  }, [todos, categoryOptions]);

  const uniqueActivityTypes = useMemo(() => {
    const activityTypes = new Set();

    // Add activity types from category hierarchy
    if (categoryOptions?.activityTypesBySubcategory) {
      categoryOptions.activityTypesBySubcategory.forEach(item => {
        item.activityTypes.forEach(act => activityTypes.add(act.value));
      });
    }

    // Add activity types from actual todos
    todos.forEach(todo => {
      if (todo.activityType) activityTypes.add(todo.activityType);
    });

    return Array.from(activityTypes).sort();
  }, [todos, categoryOptions]);

  // Get available options based on current selections
  const getAvailableSubcategories = () => {
    if (selectedCategories.length === 0) return uniqueSubcategories;

    const availableSubs = new Set();
    todos.forEach(todo => {
      if (selectedCategories.includes(todo.mainCategory) && todo.subcategory) {
        availableSubs.add(todo.subcategory);
      }
    });
    return Array.from(availableSubs).sort();
  };

  const getAvailableActivityTypes = () => {
    if (selectedCategories.length === 0 && selectedSubcategories.length === 0) {
      return uniqueActivityTypes;
    }

    const availableActivities = new Set();
    todos.forEach(todo => {
      const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(todo.mainCategory);
      const subcategoryMatch = selectedSubcategories.length === 0 || selectedSubcategories.includes(todo.subcategory);

      if (categoryMatch && subcategoryMatch && todo.activityType) {
        availableActivities.add(todo.activityType);
      }
    });
    return Array.from(availableActivities).sort();
  };

  const handleCategoryChange = (event) => {
    const value = typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value;
    onCategoriesChange?.(value);
  };

  const handleSubcategoryChange = (event) => {
    const value = typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value;
    onSubcategoriesChange?.(value);
  };

  const handleActivityTypeChange = (event) => {
    const value = typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value;
    onActivityTypesChange?.(value);
  };

  const handleClearAll = () => {
    onCategoriesChange?.([]);
    onSubcategoriesChange?.([]);
    onActivityTypesChange?.([]);
    onClearAll?.();
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedSubcategories.length > 0 || selectedActivityTypes.length > 0;

  const renderFilterChips = () => {
    const chips = [];

    selectedCategories.forEach(category => {
      chips.push(
        <Chip
          key={`cat-${category}`}
          label={`📁 ${category}`}
          onDelete={() => onCategoriesChange?.(selectedCategories.filter(c => c !== category))}
          color="primary"
          variant="outlined"
          size="small"
        />
      );
    });

    selectedSubcategories.forEach(subcategory => {
      chips.push(
        <Chip
          key={`sub-${subcategory}`}
          label={`📂 ${subcategory}`}
          onDelete={() => onSubcategoriesChange?.(selectedSubcategories.filter(s => s !== subcategory))}
          color="secondary"
          variant="outlined"
          size="small"
        />
      );
    });

    selectedActivityTypes.forEach(activityType => {
      chips.push(
        <Chip
          key={`act-${activityType}`}
          label={`🎯 ${activityType}`}
          onDelete={() => onActivityTypesChange?.(selectedActivityTypes.filter(a => a !== activityType))}
          color="success"
          variant="outlined"
          size="small"
        />
      );
    });

    return chips;
  };

  if (!categoryOptions && uniqueCategories.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="body2" color="textSecondary">
          Loading category options...
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper className={className} sx={{ mb: 2 }}>
      <Accordion expanded={isExpanded} onChange={(e, expanded) => setIsExpanded(expanded)}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <FilterList color="primary" />
            <Typography variant="h6">
              Advanced Category Filter
            </Typography>
            {hasActiveFilters && (
              <Chip
                label={`${selectedCategories.length + selectedSubcategories.length + selectedActivityTypes.length} filters active`}
                color="primary"
                size="small"
                sx={{ ml: 'auto', mr: 2 }}
              />
            )}
          </Box>
        </AccordionSummary>

        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Main Categories */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="categories-label">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Category fontSize="small" />
                    Main Categories
                  </Box>
                </InputLabel>
                <Select
                  labelId="categories-label"
                  multiple
                  value={selectedCategories}
                  onChange={handleCategoryChange}
                  input={<OutlinedInput label="Main Categories" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                >
                  {uniqueCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      <Checkbox checked={selectedCategories.indexOf(category) > -1} />
                      <ListItemText primary={category} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Subcategories */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="subcategories-label">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Label fontSize="small" />
                    Subcategories
                  </Box>
                </InputLabel>
                <Select
                  labelId="subcategories-label"
                  multiple
                  value={selectedSubcategories}
                  onChange={handleSubcategoryChange}
                  input={<OutlinedInput label="Subcategories" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                >
                  {getAvailableSubcategories().map((subcategory) => (
                    <MenuItem key={subcategory} value={subcategory}>
                      <Checkbox checked={selectedSubcategories.indexOf(subcategory) > -1} />
                      <ListItemText primary={subcategory} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Activity Types */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="activity-types-label">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Assignment fontSize="small" />
                    Activity Types
                  </Box>
                </InputLabel>
                <Select
                  labelId="activity-types-label"
                  multiple
                  value={selectedActivityTypes}
                  onChange={handleActivityTypeChange}
                  input={<OutlinedInput label="Activity Types" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                >
                  {getAvailableActivityTypes().map((activityType) => (
                    <MenuItem key={activityType} value={activityType}>
                      <Checkbox checked={selectedActivityTypes.indexOf(activityType) > -1} />
                      <ListItemText primary={activityType} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Active Filters:
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Clear />}
                    onClick={handleClearAll}
                    color="error"
                  >
                    Clear All
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {renderFilterChips()}
                </Box>
              </Box>
            </>
          )}

          {/* Filter Summary */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="textSecondary">
              <strong>Filter Logic:</strong> Results will include tasks that match ANY of the selected categories,
              AND ANY of the selected subcategories, AND ANY of the selected activity types.
              Leave a filter empty to include all options for that level.
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default AdvancedCategoryFilter;
