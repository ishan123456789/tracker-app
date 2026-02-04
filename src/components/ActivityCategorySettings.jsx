import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import ActivityCategoryMapper from './ActivityCategoryMapper';

const ActivityCategorySettings = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('mappings');
  const [showMapper, setShowMapper] = useState(false);

  // Fetch data
  const mappings = useQuery(api.activityCategories.getMappings);
  const templates = useQuery(api.activityCategories.getTemplates);
  const sections = useQuery(api.sections.list);

  // Mutations
  const createTemplate = useMutation(api.activityCategories.createTemplate);
  const deleteMapping = useMutation(api.activityCategories.deleteMapping);
  const toggleMappingActive = useMutation(api.activityCategories.toggleMappingActive);

  if (!isOpen) return null;

  const tabs = [
    { id: 'mappings', label: 'Activity Mappings', icon: '🔗' },
    { id: 'templates', label: 'Templates', icon: '📋' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">Activity Category Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'mappings' && (
            <MappingsTab
              mappings={mappings}
              sections={sections}
              onShowMapper={() => setShowMapper(true)}
              onDeleteMapping={deleteMapping}
              onToggleActive={toggleMappingActive}
            />
          )}

          {activeTab === 'templates' && (
            <TemplatesTab
              templates={templates}
              onCreateTemplate={createTemplate}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab />
          )}
        </div>
      </div>

      {/* Activity Category Mapper Modal */}
      <ActivityCategoryMapper
        isOpen={showMapper}
        onClose={() => setShowMapper(false)}
        onSave={() => setShowMapper(false)}
      />
    </div>
  );
};

const MappingsTab = ({ mappings, sections, onShowMapper, onDeleteMapping, onToggleActive }) => {
  const getSectionName = (sectionId) => {
    const section = sections?.find(s => s._id === sectionId);
    return section?.title || 'Unknown Section';
  };

  const handleDeleteMapping = async (mappingId) => {
    if (confirm('Are you sure you want to delete this mapping?')) {
      try {
        await onDeleteMapping({ id: mappingId });
      } catch (error) {
        console.error('Error deleting mapping:', error);
        alert('Failed to delete mapping. Please try again.');
      }
    }
  };

  const handleToggleActive = async (mappingId, currentState) => {
    try {
      await onToggleActive({ id: mappingId, isActive: !currentState });
    } catch (error) {
      console.error('Error toggling mapping:', error);
      alert('Failed to update mapping. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Activity Mappings</h3>
          <p className="text-gray-600 text-sm">
            Configure how todo categories automatically map to activity sections
          </p>
        </div>
        <button
          onClick={onShowMapper}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create New Mapping
        </button>
      </div>

      {mappings?.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">🔗</div>
          <h4 className="text-lg font-medium mb-2">No Activity Mappings</h4>
          <p className="text-gray-600 mb-4">
            Create your first mapping to start auto-tracking todo completion to activity sections.
          </p>
          <button
            onClick={onShowMapper}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create First Mapping
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {mappings?.map((mapping) => (
            <div
              key={mapping._id}
              className={`border rounded-lg p-4 ${
                mapping.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">{mapping.name}</h4>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        mapping.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {mapping.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Todo Category:</span>
                      <div className="text-gray-600">{mapping.todoCategory}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Target Section:</span>
                      <div className="text-gray-600">{getSectionName(mapping.targetSectionId)}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Column Mappings:</span>
                      <div className="text-gray-600">{mapping.columnMappings?.length || 0} configured</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Extraction Rules:</span>
                      <div className="text-gray-600">{mapping.extractionRules?.length || 0} rules</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(mapping._id, mapping.isActive)}
                    className={`px-3 py-1 rounded text-sm border ${
                      mapping.isActive
                        ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                        : 'border-green-300 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    {mapping.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDeleteMapping(mapping._id)}
                    className="px-3 py-1 rounded text-sm border border-red-300 text-red-700 hover:bg-red-50"
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

const TemplatesTab = ({ templates, onCreateTemplate }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const builtInTemplates = [
    {
      name: 'Chess Training',
      category: 'chess',
      description: 'Track chess puzzles, games, and practice sessions',
      columns: ['Date', 'Puzzles Solved', 'Games Played', 'Games Won', 'Time Spent'],
      metrics: ['puzzles', 'games', 'games_won', 'minutes']
    },
    {
      name: 'Basketball Practice',
      category: 'basketball',
      description: 'Track shooting practice and game performance',
      columns: ['Date', 'Shots Taken', 'Shots Made', 'Free Throws', 'Practice Time'],
      metrics: ['shots', 'baskets', 'free_throws', 'minutes']
    },
    {
      name: 'Reading Log',
      category: 'reading',
      description: 'Track reading progress and time spent',
      columns: ['Date', 'Pages Read', 'Chapters', 'Reading Time', 'Book'],
      metrics: ['pages', 'chapters', 'minutes']
    },
    {
      name: 'Workout Tracker',
      category: 'exercise',
      description: 'Track exercise routines and progress',
      columns: ['Date', 'Exercise Type', 'Sets', 'Reps', 'Weight', 'Duration'],
      metrics: ['sets', 'reps', 'weight', 'minutes']
    }
  ];

  const handleCreateFromTemplate = async (template) => {
    try {
      await onCreateTemplate({
        name: template.name,
        category: template.category,
        description: template.description,
        sectionTemplate: {
          title: template.name,
          columns: template.columns.map(col => ({
            name: col,
            type: col === 'Date' ? 'date' : 'number'
          }))
        },
        defaultMappings: template.metrics.map(metric => ({
          metricType: metric,
          columnName: template.columns.find(col =>
            col.toLowerCase().includes(metric) ||
            metric.includes(col.toLowerCase().split(' ')[0])
          ) || template.columns[1]
        })),
        isBuiltIn: true
      });
      alert('Template created successfully!');
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Failed to create template. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Activity Templates</h3>
          <p className="text-gray-600 text-sm">
            Quick-start templates for common activity tracking scenarios
          </p>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-3">Built-in Templates</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {builtInTemplates.map((template) => (
            <div key={template.name} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h5 className="font-medium">{template.name}</h5>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
                <button
                  onClick={() => handleCreateFromTemplate(template)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Use Template
                </button>
              </div>

              <div className="text-xs text-gray-500">
                <div className="mb-1"><strong>Columns:</strong> {template.columns.join(', ')}</div>
                <div><strong>Metrics:</strong> {template.metrics.join(', ')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {templates && templates.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Your Templates</h4>
          <div className="space-y-2">
            {templates.map((template) => (
              <div key={template._id} className="border rounded p-3 flex justify-between items-center">
                <div>
                  <div className="font-medium">{template.name}</div>
                  <div className="text-sm text-gray-600">{template.description}</div>
                </div>
                <div className="text-xs text-gray-500">
                  Used {template.usageCount || 0} times
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsTab = () => {
  const [settings, setSettings] = useState({
    autoTrackingEnabled: true,
    showPreviewBeforeTracking: true,
    defaultConfidenceThreshold: 0.6,
    enableSmartSuggestions: true,
    autoCreateSections: false
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Auto-tracking Settings</h3>
        <p className="text-gray-600 text-sm">
          Configure how activity auto-tracking behaves
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <div className="font-medium">Enable Auto-tracking</div>
            <div className="text-sm text-gray-600">
              Automatically track metrics when todos are completed
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.autoTrackingEnabled}
            onChange={(e) => handleSettingChange('autoTrackingEnabled', e.target.checked)}
            className="rounded"
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <div className="font-medium">Show Preview Before Tracking</div>
            <div className="text-sm text-gray-600">
              Display a preview of what will be tracked before completing todos
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.showPreviewBeforeTracking}
            onChange={(e) => handleSettingChange('showPreviewBeforeTracking', e.target.checked)}
            className="rounded"
          />
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-medium">Confidence Threshold</div>
              <div className="text-sm text-gray-600">
                Minimum confidence required for automatic metric extraction
              </div>
            </div>
            <div className="text-sm font-medium">
              {Math.round(settings.defaultConfidenceThreshold * 100)}%
            </div>
          </div>
          <input
            type="range"
            min="0.3"
            max="0.9"
            step="0.1"
            value={settings.defaultConfidenceThreshold}
            onChange={(e) => handleSettingChange('defaultConfidenceThreshold', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <div className="font-medium">Smart Suggestions</div>
            <div className="text-sm text-gray-600">
              Get AI-powered suggestions for activity categories and metrics
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.enableSmartSuggestions}
            onChange={(e) => handleSettingChange('enableSmartSuggestions', e.target.checked)}
            className="rounded"
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <div className="font-medium">Auto-create Sections</div>
            <div className="text-sm text-gray-600">
              Automatically create activity sections when using templates
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.autoCreateSections}
            onChange={(e) => handleSettingChange('autoCreateSections', e.target.checked)}
            className="rounded"
          />
        </div>
      </div>

      <div className="pt-4 border-t">
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default ActivityCategorySettings;
