import React, { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const AutoTrackingPreview = ({
  todo,
  extractedMetrics,
  activityCategory,
  onConfirm,
  onCancel,
  onModify
}) => {
  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get the mapping for this todo's category
  const mappings = useQuery(api.activityCategories.getMappingsByCategory,
    activityCategory ? { category: activityCategory } : "skip"
  );

  // Get the target section details
  const targetSection = useQuery(api.sections.get,
    previewData?.sectionId ? { id: previewData.sectionId } : "skip"
  );

  useEffect(() => {
    if (mappings && mappings.length > 0 && extractedMetrics) {
      generatePreview();
    } else if (mappings && mappings.length === 0) {
      setError('No activity mapping found for this category');
      setIsLoading(false);
    }
  }, [mappings, extractedMetrics, activityCategory]);

  const generatePreview = () => {
    try {
      const mapping = mappings[0]; // Use the first active mapping
      const newEntry = {};

      // Add date column (always today)
      newEntry['Date'] = new Date().toISOString().split('T')[0];

      // Map extracted metrics to section columns
      mapping.columnMappings.forEach(columnMapping => {
        const metricValue = extractedMetrics.metrics?.find(
          m => m.type === columnMapping.metricType
        )?.value;

        if (metricValue !== undefined) {
          newEntry[columnMapping.columnName] = metricValue;
        } else if (columnMapping.defaultValue !== undefined) {
          newEntry[columnMapping.columnName] = columnMapping.defaultValue;
        }
      });

      // Add todo reference
      newEntry['Todo'] = todo.text;

      setPreviewData({
        sectionId: mapping.targetSectionId,
        sectionTitle: 'Loading...',
        entry: newEntry,
        mapping: mapping,
        confidence: extractedMetrics.confidence || 0.8
      });

      setIsLoading(false);
    } catch (err) {
      setError('Failed to generate preview: ' + err.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (targetSection && previewData) {
      setPreviewData(prev => ({
        ...prev,
        sectionTitle: targetSection.title
      }));
    }
  }, [targetSection]);

  const handleConfirm = () => {
    if (previewData && onConfirm) {
      onConfirm({
        sectionId: previewData.sectionId,
        entry: previewData.entry,
        mapping: previewData.mapping
      });
    }
  };

  const handleModifyEntry = (columnName, newValue) => {
    setPreviewData(prev => ({
      ...prev,
      entry: {
        ...prev.entry,
        [columnName]: newValue
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-800">Preparing auto-tracking preview...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <span className="text-yellow-600">⚠️</span>
          <div>
            <div className="font-medium text-yellow-800">Auto-tracking not available</div>
            <div className="text-yellow-700 text-sm mt-1">{error}</div>
            <div className="text-yellow-600 text-xs mt-2">
              You can set up activity mappings in the settings to enable auto-tracking.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!previewData) {
    return null;
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 0.8) return 'High confidence';
    if (confidence >= 0.6) return 'Medium confidence';
    return 'Low confidence';
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-green-600">🎯</span>
            <span className="font-medium text-green-800">Auto-tracking Preview</span>
            <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(previewData.confidence)}`}>
              {getConfidenceText(previewData.confidence)}
            </span>
          </div>
          <div className="text-green-700 text-sm mt-1">
            This entry will be added to "{previewData.sectionTitle}" when you complete this todo.
          </div>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded border">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <div className="font-medium text-sm">Preview Entry</div>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(previewData.entry).map(([columnName, value]) => (
              <div key={columnName} className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">
                  {columnName}
                </label>
                {columnName === 'Date' || columnName === 'Todo' ? (
                  <div className="text-sm bg-gray-50 px-2 py-1 rounded border">
                    {value}
                  </div>
                ) : (
                  <input
                    type={typeof value === 'number' ? 'number' : 'text'}
                    value={value || ''}
                    onChange={(e) => handleModifyEntry(columnName,
                      typeof value === 'number' ? parseInt(e.target.value) || 0 : e.target.value
                    )}
                    className="w-full text-sm border rounded px-2 py-1"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Extraction Details */}
      {extractedMetrics.metrics && extractedMetrics.metrics.length > 0 && (
        <div className="text-xs text-green-600 bg-green-100 rounded p-2">
          <div className="font-medium mb-1">Detected metrics:</div>
          <div className="space-y-1">
            {extractedMetrics.metrics.map((metric, index) => (
              <div key={index} className="flex justify-between">
                <span>{metric.type}:</span>
                <span>{metric.value} {metric.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
        >
          Skip Auto-tracking
        </button>
        <button
          onClick={handleConfirm}
          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
        >
          Confirm & Complete Todo
        </button>
      </div>
    </div>
  );
};

// Simplified version for inline preview (without full modal)
export const AutoTrackingInlinePreview = ({
  todo,
  extractedMetrics,
  activityCategory
}) => {
  const mappings = useQuery(api.activityCategories.getMappingsByCategory,
    activityCategory ? { category: activityCategory } : "skip"
  );

  if (!mappings || mappings.length === 0 || !extractedMetrics.metrics?.length) {
    return null;
  }

  const mapping = mappings[0];
  const metricsCount = extractedMetrics.metrics.length;

  return (
    <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 mt-1">
      <span className="font-medium">Auto-tracking:</span> {metricsCount} metric(s) → {mapping.name}
    </div>
  );
};

// Modal wrapper for the preview
export const AutoTrackingPreviewModal = ({
  isOpen,
  todo,
  extractedMetrics,
  activityCategory,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Complete Todo with Auto-tracking</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="font-medium text-sm mb-1">Todo:</div>
          <div className="text-gray-700">{todo.text}</div>
        </div>

        <AutoTrackingPreview
          todo={todo}
          extractedMetrics={extractedMetrics}
          activityCategory={activityCategory}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
};

export default AutoTrackingPreview;
