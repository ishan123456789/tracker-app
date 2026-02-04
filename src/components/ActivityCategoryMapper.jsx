import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { getDefaultRulesForCategory } from '../utils/MetricExtractor';

const ActivityCategoryMapper = ({ isOpen, onClose, onSave }) => {
  const [mappings, setMappings] = useState([]);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch existing mappings and sections
  const existingMappings = useQuery(api.activityCategories.getMappings);
  const sections = useQuery(api.sections.list);

  // Mutations
  const createMapping = useMutation(api.activityCategories.createMapping);
  const updateMapping = useMutation(api.activityCategories.updateMapping);
  const deleteMapping = useMutation(api.activityCategories.deleteMapping);

  useEffect(() => {
    if (existingMappings) {
      setMappings(existingMappings);
    }
  }, [existingMappings]);

  const handleCreateMapping = () => {
    const newMapping = {
      name: 'New Mapping',
      todoCategory: '',
      targetSectionId: null,
      columnMappings: [],
      extractionRules: [],
      isActive: true
    };
    setSelectedMapping(newMapping);
    setIsEditing(true);
  };

  const handleEditMapping = (mapping) => {
    setSelectedMapping(mapping);
    setIsEditing(true);
  };

  const handleSaveMapping = async (mappingData) => {
    try {
      if (mappingData._id) {
        await updateMapping({
          id: mappingData._id,
          ...mappingData
        });
      } else {
        await createMapping(mappingData);
      }
      setIsEditing(false);
      setSelectedMapping(null);
    } catch (error) {
      console.error('Error saving mapping:', error);
      alert('Failed to save mapping. Please try again.');
    }
  };

  const handleDeleteMapping = async (mappingId) => {
    if (confirm('Are you sure you want to delete this mapping?')) {
      try {
        await deleteMapping({ id: mappingId });
      } catch (error) {
        console.error('Error deleting mapping:', error);
        alert('Failed to delete mapping. Please try again.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Activity Category Mappings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {!isEditing ? (
          <MappingsList
            mappings={mappings}
            sections={sections}
            onEdit={handleEditMapping}
            onDelete={handleDeleteMapping}
            onCreate={handleCreateMapping}
          />
        ) : (
          <MappingEditor
            mapping={selectedMapping}
            sections={sections}
            onSave={handleSaveMapping}
            onCancel={() => {
              setIsEditing(false);
              setSelectedMapping(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

const MappingsList = ({ mappings, sections, onEdit, onDelete, onCreate }) => {
  const getSectionName = (sectionId) => {
    const section = sections?.find(s => s._id === sectionId);
    return section?.title || 'Unknown Section';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Existing Mappings</h3>
        <button
          onClick={onCreate}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create New Mapping
        </button>
      </div>

      {mappings?.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No activity mappings configured yet.</p>
          <p>Create your first mapping to start auto-tracking!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mappings?.map((mapping) => (
            <div
              key={mapping._id}
              className="border rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{mapping.name}</h4>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        mapping.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {mapping.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Todo Category:</strong> {mapping.todoCategory || 'Not set'}</p>
                    <p><strong>Target Section:</strong> {getSectionName(mapping.targetSectionId)}</p>
                    <p><strong>Column Mappings:</strong> {mapping.columnMappings?.length || 0} configured</p>
                    <p><strong>Extraction Rules:</strong> {mapping.extractionRules?.length || 0} rules</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(mapping)}
                    className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded border border-blue-300 hover:bg-blue-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(mapping._id)}
                    className="text-red-600 hover:text-red-800 px-3 py-1 rounded border border-red-300 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MappingEditor = ({ mapping, sections, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: mapping?.name || '',
    todoCategory: mapping?.todoCategory || '',
    targetSectionId: mapping?.targetSectionId || '',
    columnMappings: mapping?.columnMappings || [],
    extractionRules: mapping?.extractionRules || [],
    isActive: mapping?.isActive ?? true
  });

  const [selectedSection, setSelectedSection] = useState(null);

  useEffect(() => {
    if (formData.targetSectionId && sections) {
      const section = sections.find(s => s._id === formData.targetSectionId);
      setSelectedSection(section);
    }
  }, [formData.targetSectionId, sections]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSectionChange = (sectionId) => {
    const section = sections.find(s => s._id === sectionId);
    setSelectedSection(section);
    setFormData(prev => ({
      ...prev,
      targetSectionId: sectionId,
      columnMappings: [] // Reset column mappings when section changes
    }));
  };

  const addColumnMapping = () => {
    setFormData(prev => ({
      ...prev,
      columnMappings: [
        ...prev.columnMappings,
        { metricType: '', columnName: '', defaultValue: 0 }
      ]
    }));
  };

  const updateColumnMapping = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      columnMappings: prev.columnMappings.map((mapping, i) =>
        i === index ? { ...mapping, [field]: value } : mapping
      )
    }));
  };

  const removeColumnMapping = (index) => {
    setFormData(prev => ({
      ...prev,
      columnMappings: prev.columnMappings.filter((_, i) => i !== index)
    }));
  };

  const addExtractionRule = () => {
    setFormData(prev => ({
      ...prev,
      extractionRules: [
        ...prev.extractionRules,
        { pattern: '', metricType: '', unit: '' }
      ]
    }));
  };

  const updateExtractionRule = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      extractionRules: prev.extractionRules.map((rule, i) =>
        i === index ? { ...rule, [field]: value } : rule
      )
    }));
  };

  const removeExtractionRule = (index) => {
    setFormData(prev => ({
      ...prev,
      extractionRules: prev.extractionRules.filter((_, i) => i !== index)
    }));
  };

  const loadDefaultRules = () => {
    if (formData.todoCategory) {
      const defaultRules = getDefaultRulesForCategory(formData.todoCategory);
      setFormData(prev => ({
        ...prev,
        extractionRules: defaultRules.map(rule => ({
          pattern: rule.regex.source,
          metricType: rule.type,
          unit: rule.unit
        }))
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      alert('Please enter a mapping name');
      return;
    }
    if (!formData.todoCategory.trim()) {
      alert('Please enter a todo category');
      return;
    }
    if (!formData.targetSectionId) {
      alert('Please select a target section');
      return;
    }

    onSave({
      ...mapping,
      ...formData
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Mapping Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., Chess Progress Tracking"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Todo Category</label>
          <input
            type="text"
            value={formData.todoCategory}
            onChange={(e) => handleInputChange('todoCategory', e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., Chess, Basketball, Reading"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Target Section</label>
        <select
          value={formData.targetSectionId}
          onChange={(e) => handleSectionChange(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">Select a section...</option>
          {sections?.map((section) => (
            <option key={section._id} value={section._id}>
              {section.title}
            </option>
          ))}
        </select>
      </div>

      {selectedSection && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium">Column Mappings</h4>
            <button
              type="button"
              onClick={addColumnMapping}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Mapping
            </button>
          </div>

          <div className="space-y-2">
            {formData.columnMappings.map((mapping, index) => (
              <div key={index} className="flex gap-2 items-center">
                <select
                  value={mapping.metricType}
                  onChange={(e) => updateColumnMapping(index, 'metricType', e.target.value)}
                  className="flex-1 border rounded px-2 py-1 text-sm"
                >
                  <option value="">Select metric type...</option>
                  <option value="puzzles">Puzzles</option>
                  <option value="games">Games</option>
                  <option value="pages">Pages</option>
                  <option value="minutes">Minutes</option>
                  <option value="shots">Shots</option>
                  <option value="reps">Reps</option>
                </select>

                <span className="text-sm text-gray-500">→</span>

                <select
                  value={mapping.columnName}
                  onChange={(e) => updateColumnMapping(index, 'columnName', e.target.value)}
                  className="flex-1 border rounded px-2 py-1 text-sm"
                >
                  <option value="">Select column...</option>
                  {selectedSection.columns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => removeColumnMapping(index)}
                  className="text-red-600 hover:text-red-800 text-sm px-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium">Extraction Rules</h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadDefaultRules}
              className="text-green-600 hover:text-green-800 text-sm"
            >
              Load Defaults
            </button>
            <button
              type="button"
              onClick={addExtractionRule}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Rule
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {formData.extractionRules.map((rule, index) => (
            <div key={index} className="grid grid-cols-4 gap-2 items-center">
              <input
                type="text"
                value={rule.pattern}
                onChange={(e) => updateExtractionRule(index, 'pattern', e.target.value)}
                placeholder="Regex pattern"
                className="border rounded px-2 py-1 text-sm"
              />
              <input
                type="text"
                value={rule.metricType}
                onChange={(e) => updateExtractionRule(index, 'metricType', e.target.value)}
                placeholder="Metric type"
                className="border rounded px-2 py-1 text-sm"
              />
              <input
                type="text"
                value={rule.unit}
                onChange={(e) => updateExtractionRule(index, 'unit', e.target.value)}
                placeholder="Unit"
                className="border rounded px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => removeExtractionRule(index)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => handleInputChange('isActive', e.target.checked)}
        />
        <label htmlFor="isActive" className="text-sm">
          Enable auto-tracking for this mapping
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Save Mapping
        </button>
      </div>
    </form>
  );
};

export default ActivityCategoryMapper;
