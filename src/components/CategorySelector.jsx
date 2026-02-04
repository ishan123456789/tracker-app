import React, { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const CategorySelector = ({
  mainCategory,
  subcategory,
  activityType,
  onCategoryChange,
  onSubcategoryChange,
  onActivityTypeChange,
  showActivityType = true,
  disabled = false,
  className = ""
}) => {
  const categoryOptions = useQuery(api.categoryHierarchy.getCategoryOptions);
  const [selectedMain, setSelectedMain] = useState(mainCategory || '');
  const [selectedSub, setSelectedSub] = useState(subcategory || '');
  const [selectedActivity, setSelectedActivity] = useState(activityType || '');
  const [customSubcategory, setCustomSubcategory] = useState('');
  const [showCustomSubInput, setShowCustomSubInput] = useState(false);
  const [customActivityType, setCustomActivityType] = useState('');
  const [showCustomActivityInput, setShowCustomActivityInput] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setSelectedMain(mainCategory || '');
  }, [mainCategory]);

  useEffect(() => {
    const sub = subcategory || '';
    setSelectedSub(sub);

    // Check if the subcategory is a custom one (not in predefined options)
    if (sub && categoryOptions && selectedMain) {
      const availableSubcategories = getSubcategoriesForMain(selectedMain);
      const isCustom = !availableSubcategories.some(s => s.value === sub);
      if (isCustom) {
        setShowCustomSubInput(true);
        setCustomSubcategory(sub);
        setSelectedSub('custom');
      } else {
        setShowCustomSubInput(false);
        setCustomSubcategory('');
      }
    }
  }, [subcategory, categoryOptions, selectedMain]);

  useEffect(() => {
    const activity = activityType || '';
    setSelectedActivity(activity);

    // Check if the activity type is a custom one (not in predefined options)
    if (activity && categoryOptions && selectedMain && selectedSub) {
      const availableActivityTypes = getActivityTypesForSubcategory(selectedMain, selectedSub);
      const isCustom = !availableActivityTypes.some(a => a.value === activity);
      if (isCustom) {
        setShowCustomActivityInput(true);
        setCustomActivityType(activity);
        setSelectedActivity('custom');
      } else {
        setShowCustomActivityInput(false);
        setCustomActivityType('');
      }
    }
  }, [activityType, categoryOptions, selectedMain, selectedSub]);

  // Helper function to get activity types for a subcategory
  const getActivityTypesForSubcategory = (mainCat, subCat) => {
    if (!categoryOptions || !mainCat || !subCat) return [];
    const activityData = categoryOptions.activityTypesBySubcategory.find(
      item => item.mainCategory === mainCat && item.subcategory === subCat
    );
    return activityData?.activityTypes || [];
  };

  // Helper function to get subcategories for a main category
  const getSubcategoriesForMain = (mainCat) => {
    if (!categoryOptions || !mainCat) return [];
    const mainCategoryData = categoryOptions.subcategoriesByMain.find(
      item => item.mainCategory === mainCat
    );
    return mainCategoryData?.subcategories || [];
  };

  // Handle main category change
  const handleMainCategoryChange = (e) => {
    const newMainCategory = e.target.value;
    setSelectedMain(newMainCategory);
    setSelectedSub(''); // Reset subcategory
    setSelectedActivity(''); // Reset activity type
    setShowCustomSubInput(false); // Hide custom input
    setCustomSubcategory(''); // Clear custom input
    setShowCustomActivityInput(false); // Hide custom activity input
    setCustomActivityType(''); // Clear custom activity input

    onCategoryChange?.(newMainCategory);
    onSubcategoryChange?.('');
    onActivityTypeChange?.('');
  };

  // Handle subcategory change
  const handleSubcategoryChange = (e) => {
    const newSubcategory = e.target.value;
    setSelectedSub(newSubcategory);
    setSelectedActivity(''); // Reset activity type
    setShowCustomActivityInput(false); // Hide custom activity input
    setCustomActivityType(''); // Clear custom activity input

    if (newSubcategory === 'custom') {
      setShowCustomSubInput(true);
      // Don't call onSubcategoryChange yet, wait for custom input
    } else {
      setShowCustomSubInput(false);
      setCustomSubcategory('');
      onSubcategoryChange?.(newSubcategory);
    }
    onActivityTypeChange?.('');
  };

  // Handle custom subcategory input
  const handleCustomSubcategoryChange = (e) => {
    const customValue = e.target.value;
    setCustomSubcategory(customValue);
    onSubcategoryChange?.(customValue);
  };

  // Handle activity type change
  const handleActivityTypeChange = (e) => {
    const newActivityType = e.target.value;
    setSelectedActivity(newActivityType);

    if (newActivityType === 'custom') {
      setShowCustomActivityInput(true);
      // Don't call onActivityTypeChange yet, wait for custom input
    } else {
      setShowCustomActivityInput(false);
      setCustomActivityType('');
      onActivityTypeChange?.(newActivityType);
    }
  };

  // Handle custom activity type input
  const handleCustomActivityTypeChange = (e) => {
    const customValue = e.target.value;
    setCustomActivityType(customValue);
    onActivityTypeChange?.(customValue);
  };

  // Get available subcategories for selected main category
  const getSubcategories = () => {
    if (!categoryOptions || !selectedMain) return [];
    const mainCategoryData = categoryOptions.subcategoriesByMain.find(
      item => item.mainCategory === selectedMain
    );
    const subcategories = mainCategoryData?.subcategories || [];

    // Add custom option at the end
    return [...subcategories, { value: 'custom', label: 'Custom...', icon: '✏️' }];
  };

  // Get available activity types for selected subcategory
  const getActivityTypes = () => {
    if (!categoryOptions || !selectedMain || !selectedSub || selectedSub === 'custom') return [];
    const activityData = categoryOptions.activityTypesBySubcategory.find(
      item => item.mainCategory === selectedMain && item.subcategory === selectedSub
    );
    const activityTypes = activityData?.activityTypes || [];

    // Add custom option at the end
    return [...activityTypes, { value: 'custom', label: 'Custom...', icon: '✏️' }];
  };

  if (!categoryOptions) {
    return <div className="category-selector-loading">Loading categories...</div>;
  }

  return (
    <div className={`category-selector ${className}`}>
      {/* Main Category Dropdown */}
      <div className="category-dropdown-group">
        <label className="category-label">Category</label>
        <select
          value={selectedMain}
          onChange={handleMainCategoryChange}
          disabled={disabled}
          className="category-dropdown main-category"
        >
          <option value="">Select Category</option>
          {categoryOptions.mainCategories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      {/* Subcategory Dropdown */}
      {selectedMain && (
        <div className="category-dropdown-group">
          <label className="category-label">Subcategory</label>
          <select
            value={selectedSub}
            onChange={handleSubcategoryChange}
            disabled={disabled}
            className="category-dropdown subcategory"
          >
            <option value="">Select Subcategory</option>
            {getSubcategories().map((subcategory) => (
              <option key={subcategory.value} value={subcategory.value}>
                {subcategory.icon && `${subcategory.icon} `}{subcategory.label}
              </option>
            ))}
          </select>

          {/* Custom Subcategory Input */}
          {showCustomSubInput && (
            <input
              type="text"
              value={customSubcategory}
              onChange={handleCustomSubcategoryChange}
              placeholder="Enter custom subcategory..."
              disabled={disabled}
              className="category-dropdown custom-input"
              autoFocus
            />
          )}
        </div>
      )}

      {/* Activity Type Dropdown */}
      {showActivityType && selectedMain && (selectedSub || showCustomSubInput) && (
        <div className="category-dropdown-group">
          <label className="category-label">Activity Type</label>
          {selectedSub === 'custom' || showCustomSubInput ? (
            // For custom subcategories, only show custom activity type input
            <input
              type="text"
              value={customActivityType}
              onChange={handleCustomActivityTypeChange}
              placeholder="Enter custom activity type..."
              disabled={disabled}
              className="category-dropdown custom-input"
              autoFocus
            />
          ) : (
            // For predefined subcategories, show dropdown with custom option
            <>
              <select
                value={selectedActivity}
                onChange={handleActivityTypeChange}
                disabled={disabled}
                className="category-dropdown activity-type"
              >
                <option value="">Select Activity Type (Optional)</option>
                {getActivityTypes().map((activityType) => (
                  <option key={activityType.value} value={activityType.value}>
                    {activityType.icon && `${activityType.icon} `}{activityType.label}
                  </option>
                ))}
              </select>

              {/* Custom Activity Type Input */}
              {showCustomActivityInput && (
                <input
                  type="text"
                  value={customActivityType}
                  onChange={handleCustomActivityTypeChange}
                  placeholder="Enter custom activity type..."
                  disabled={disabled}
                  className="category-dropdown custom-input"
                  autoFocus
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Category Breadcrumb */}
      {selectedMain && (
        <div className="category-breadcrumb">
          <span className="breadcrumb-item main">
            {categoryOptions.mainCategories.find(c => c.value === selectedMain)?.icon} {selectedMain}
          </span>
          {(selectedSub && selectedSub !== 'custom') || customSubcategory ? (
            <>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-item sub">
                {showCustomSubInput ? (
                  <>✏️ {customSubcategory}</>
                ) : (
                  <>
                    {getSubcategories().find(s => s.value === selectedSub)?.icon} {selectedSub}
                  </>
                )}
              </span>
            </>
          ) : null}
          {(selectedActivity && selectedActivity !== 'custom') || customActivityType ? (
            <>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-item activity">
                {showCustomActivityInput ? (
                  <>✏️ {customActivityType}</>
                ) : (
                  <>
                    {getActivityTypes().find(a => a.value === selectedActivity)?.icon} {selectedActivity}
                  </>
                )}
              </span>
            </>
          ) : null}
        </div>
      )}

      <style jsx>{`
        .category-selector {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .category-selector.horizontal {
          flex-direction: row;
          align-items: end;
        }

        .category-dropdown-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .category-label {
          font-size: 12px;
          font-weight: 500;
          color: #666;
          margin-bottom: 2px;
        }

        .category-dropdown {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s ease;
        }

        .category-dropdown:hover {
          border-color: #999;
        }

        .category-dropdown:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .category-dropdown:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .custom-input {
          margin-top: 8px;
          padding: 8px 12px;
          border: 2px solid #4ECDC4;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          transition: border-color 0.2s ease;
        }

        .custom-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .custom-input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .main-category {
          border-color: #FF6B6B;
        }

        .subcategory {
          border-color: #4ECDC4;
        }

        .activity-type {
          border-color: #45B7D1;
        }

        .category-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          font-size: 13px;
          margin-top: 4px;
        }

        .breadcrumb-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
        }

        .breadcrumb-item.main {
          color: #FF6B6B;
        }

        .breadcrumb-item.sub {
          color: #4ECDC4;
        }

        .breadcrumb-item.activity {
          color: #45B7D1;
        }

        .breadcrumb-separator {
          color: #999;
          font-weight: bold;
        }

        .category-selector-loading {
          padding: 12px;
          text-align: center;
          color: #666;
          font-style: italic;
        }

        /* Horizontal layout styles */
        .category-selector.horizontal .category-dropdown-group {
          flex: 1;
          min-width: 150px;
        }

        .category-selector.horizontal .category-breadcrumb {
          margin-top: 0;
          flex: 1;
          min-width: 200px;
        }

        /* Compact styles */
        .category-selector.compact {
          gap: 8px;
        }

        .category-selector.compact .category-dropdown {
          padding: 6px 10px;
          font-size: 13px;
        }

        .category-selector.compact .category-label {
          font-size: 11px;
        }

        .category-selector.compact .category-breadcrumb {
          padding: 6px 10px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default CategorySelector;
