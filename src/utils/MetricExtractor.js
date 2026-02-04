/**
 * Metric Extraction Utility
 * Parses todo text to extract metrics like numbers, units, and activity types
 */

// Common metric patterns and their regex patterns
const METRIC_PATTERNS = [
  // Chess patterns
  { regex: /(\d+)\s*(?:chess\s*)?puzzles?/gi, type: 'puzzles', unit: 'puzzles' },
  { regex: /(\d+)\s*(?:chess\s*)?games?/gi, type: 'games', unit: 'games' },
  { regex: /won\s*(\d+)\s*games?/gi, type: 'games_won', unit: 'games' },
  { regex: /lost\s*(\d+)\s*games?/gi, type: 'games_lost', unit: 'games' },
  { regex: /(\d+)\s*(?:chess\s*)?matches?/gi, type: 'matches', unit: 'matches' },

  // Basketball patterns
  { regex: /(\d+)\s*(?:free\s*)?throws?/gi, type: 'free_throws', unit: 'shots' },
  { regex: /(\d+)\s*shots?/gi, type: 'shots', unit: 'shots' },
  { regex: /(\d+)\s*baskets?/gi, type: 'baskets', unit: 'baskets' },
  { regex: /(\d+)\s*points?/gi, type: 'points', unit: 'points' },
  { regex: /(\d+)\s*rebounds?/gi, type: 'rebounds', unit: 'rebounds' },

  // Reading patterns
  { regex: /(\d+)\s*pages?/gi, type: 'pages', unit: 'pages' },
  { regex: /(\d+)\s*chapters?/gi, type: 'chapters', unit: 'chapters' },
  { regex: /(\d+)\s*books?/gi, type: 'books', unit: 'books' },
  { regex: /(\d+)\s*articles?/gi, type: 'articles', unit: 'articles' },

  // Exercise patterns
  { regex: /(\d+)\s*(?:push\s*)?ups?/gi, type: 'pushups', unit: 'reps' },
  { regex: /(\d+)\s*(?:sit\s*)?ups?/gi, type: 'situps', unit: 'reps' },
  { regex: /(\d+)\s*reps?/gi, type: 'reps', unit: 'reps' },
  { regex: /(\d+)\s*sets?/gi, type: 'sets', unit: 'sets' },
  { regex: /(\d+)\s*(?:lbs?|pounds?)/gi, type: 'weight', unit: 'lbs' },
  { regex: /(\d+)\s*(?:kg|kilograms?)/gi, type: 'weight', unit: 'kg' },

  // Time patterns
  { regex: /(\d+)\s*(?:minutes?|mins?)/gi, type: 'minutes', unit: 'minutes' },
  { regex: /(\d+)\s*(?:hours?|hrs?)/gi, type: 'hours', unit: 'hours', multiplier: 60 },
  { regex: /(\d+)\s*(?:seconds?|secs?)/gi, type: 'seconds', unit: 'seconds' },

  // Study patterns
  { regex: /(\d+)\s*(?:practice\s*)?problems?/gi, type: 'problems', unit: 'problems' },
  { regex: /(\d+)\s*exercises?/gi, type: 'exercises', unit: 'exercises' },
  { regex: /(\d+)\s*lessons?/gi, type: 'lessons', unit: 'lessons' },
  { regex: /(\d+)\s*videos?/gi, type: 'videos', unit: 'videos' },

  // General patterns (should be last to avoid conflicts)
  { regex: /(\d+)\s*items?/gi, type: 'items', unit: 'items' },
  { regex: /(\d+)\s*tasks?/gi, type: 'tasks', unit: 'tasks' },
  { regex: /(\d+)\s*times?/gi, type: 'times', unit: 'times' },
];

// Activity category keywords for classification
const ACTIVITY_KEYWORDS = {
  chess: ['chess', 'puzzle', 'game', 'match', 'tournament', 'rating'],
  basketball: ['basketball', 'shoot', 'throw', 'basket', 'court', 'dribble'],
  reading: ['read', 'book', 'page', 'chapter', 'article', 'novel'],
  exercise: ['workout', 'exercise', 'gym', 'fitness', 'training', 'pushup', 'situp'],
  study: ['study', 'learn', 'practice', 'homework', 'lesson', 'course'],
  coding: ['code', 'program', 'debug', 'commit', 'function', 'algorithm'],
  music: ['practice', 'play', 'song', 'instrument', 'piano', 'guitar'],
  writing: ['write', 'blog', 'article', 'journal', 'essay', 'story'],
};

/**
 * Extract metrics from todo text
 * @param {string} text - The todo text to analyze
 * @param {Array} customPatterns - Additional patterns to check
 * @returns {Object} Extracted metrics and metadata
 */
export function extractMetrics(text, customPatterns = []) {
  const metrics = [];
  const allPatterns = [...METRIC_PATTERNS, ...customPatterns];

  // Extract metrics using patterns
  allPatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern.regex)];
    matches.forEach(match => {
      const value = parseInt(match[1]);
      if (!isNaN(value) && value > 0) {
        const finalValue = pattern.multiplier ? value * pattern.multiplier : value;
        metrics.push({
          type: pattern.type,
          value: finalValue,
          unit: pattern.unit,
          originalText: match[0],
          confidence: calculateConfidence(match[0], text)
        });
      }
    });
  });

  // Remove duplicates and keep highest confidence
  const uniqueMetrics = deduplicateMetrics(metrics);

  // Detect activity category
  const activityCategory = detectActivityCategory(text);

  return {
    metrics: uniqueMetrics,
    activityCategory,
    confidence: calculateOverallConfidence(uniqueMetrics),
    originalText: text
  };
}

/**
 * Calculate confidence score for a metric extraction
 * @param {string} matchText - The matched text
 * @param {string} fullText - The full todo text
 * @returns {number} Confidence score between 0 and 1
 */
function calculateConfidence(matchText, fullText) {
  let confidence = 0.5; // Base confidence

  // Higher confidence for specific patterns
  if (matchText.includes('chess') || matchText.includes('puzzle')) confidence += 0.2;
  if (matchText.includes('basketball') || matchText.includes('shot')) confidence += 0.2;
  if (matchText.includes('page') || matchText.includes('chapter')) confidence += 0.2;

  // Higher confidence for exact matches
  if (matchText.length > 3) confidence += 0.1;

  // Lower confidence for very short matches
  if (matchText.length < 3) confidence -= 0.2;

  // Context-based confidence
  const words = fullText.toLowerCase().split(/\s+/);
  if (words.length > 3) confidence += 0.1; // More context = higher confidence

  return Math.max(0, Math.min(1, confidence));
}

/**
 * Calculate overall confidence for all extracted metrics
 * @param {Array} metrics - Array of extracted metrics
 * @returns {number} Overall confidence score
 */
function calculateOverallConfidence(metrics) {
  if (metrics.length === 0) return 0;

  const avgConfidence = metrics.reduce((sum, m) => sum + m.confidence, 0) / metrics.length;

  // Bonus for multiple metrics (more comprehensive extraction)
  const bonusForMultiple = Math.min(0.2, (metrics.length - 1) * 0.1);

  return Math.min(1, avgConfidence + bonusForMultiple);
}

/**
 * Remove duplicate metrics and keep the one with highest confidence
 * @param {Array} metrics - Array of metrics
 * @returns {Array} Deduplicated metrics
 */
function deduplicateMetrics(metrics) {
  const metricMap = new Map();

  metrics.forEach(metric => {
    const key = `${metric.type}_${metric.unit}`;
    const existing = metricMap.get(key);

    if (!existing || metric.confidence > existing.confidence) {
      metricMap.set(key, metric);
    }
  });

  return Array.from(metricMap.values());
}

/**
 * Detect the activity category based on keywords in the text
 * @param {string} text - The todo text
 * @returns {string|null} Detected activity category
 */
export function detectActivityCategory(text) {
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(ACTIVITY_KEYWORDS)) {
    const matchCount = keywords.filter(keyword =>
      lowerText.includes(keyword)
    ).length;

    // If multiple keywords match, it's likely this category
    if (matchCount >= 1) {
      return category;
    }
  }

  return null;
}

/**
 * Suggest activity category based on extracted metrics
 * @param {Array} metrics - Extracted metrics
 * @returns {string|null} Suggested category
 */
export function suggestCategoryFromMetrics(metrics) {
  if (metrics.length === 0) return null;

  const metricTypes = metrics.map(m => m.type);

  // Chess-related metrics
  if (metricTypes.some(type => ['puzzles', 'games', 'games_won', 'matches'].includes(type))) {
    return 'chess';
  }

  // Basketball-related metrics
  if (metricTypes.some(type => ['free_throws', 'shots', 'baskets', 'points'].includes(type))) {
    return 'basketball';
  }

  // Reading-related metrics
  if (metricTypes.some(type => ['pages', 'chapters', 'books', 'articles'].includes(type))) {
    return 'reading';
  }

  // Exercise-related metrics
  if (metricTypes.some(type => ['pushups', 'situps', 'reps', 'sets', 'weight'].includes(type))) {
    return 'exercise';
  }

  // Study-related metrics
  if (metricTypes.some(type => ['problems', 'exercises', 'lessons', 'videos'].includes(type))) {
    return 'study';
  }

  return null;
}

/**
 * Format metrics for display
 * @param {Array} metrics - Array of metrics
 * @returns {string} Formatted string
 */
export function formatMetrics(metrics) {
  if (metrics.length === 0) return 'No metrics detected';

  return metrics.map(metric =>
    `${metric.value} ${metric.unit}`
  ).join(', ');
}

/**
 * Validate extracted metrics against expected patterns
 * @param {Array} metrics - Extracted metrics
 * @param {string} category - Expected category
 * @returns {Object} Validation result
 */
export function validateMetrics(metrics, category) {
  const validation = {
    isValid: true,
    warnings: [],
    suggestions: []
  };

  // Check if metrics match the category
  if (category) {
    const suggestedCategory = suggestCategoryFromMetrics(metrics);
    if (suggestedCategory && suggestedCategory !== category) {
      validation.warnings.push(
        `Metrics suggest "${suggestedCategory}" category, but "${category}" was specified`
      );
    }
  }

  // Check for unrealistic values
  metrics.forEach(metric => {
    if (metric.type === 'minutes' && metric.value > 1440) {
      validation.warnings.push(`${metric.value} minutes seems unrealistic (>24 hours)`);
    }
    if (metric.type === 'pages' && metric.value > 1000) {
      validation.warnings.push(`${metric.value} pages seems unrealistic`);
    }
    if (metric.type === 'puzzles' && metric.value > 100) {
      validation.warnings.push(`${metric.value} puzzles seems like a lot for one session`);
    }
  });

  return validation;
}

/**
 * Get default extraction rules for a category
 * @param {string} category - Activity category
 * @returns {Array} Default patterns for the category
 */
export function getDefaultRulesForCategory(category) {
  const categoryPatterns = {
    chess: METRIC_PATTERNS.filter(p =>
      ['puzzles', 'games', 'games_won', 'games_lost', 'matches'].includes(p.type)
    ),
    basketball: METRIC_PATTERNS.filter(p =>
      ['free_throws', 'shots', 'baskets', 'points', 'rebounds'].includes(p.type)
    ),
    reading: METRIC_PATTERNS.filter(p =>
      ['pages', 'chapters', 'books', 'articles'].includes(p.type)
    ),
    exercise: METRIC_PATTERNS.filter(p =>
      ['pushups', 'situps', 'reps', 'sets', 'weight'].includes(p.type)
    ),
    study: METRIC_PATTERNS.filter(p =>
      ['problems', 'exercises', 'lessons', 'videos'].includes(p.type)
    )
  };

  return categoryPatterns[category] || [];
}

export default {
  extractMetrics,
  detectActivityCategory,
  suggestCategoryFromMetrics,
  formatMetrics,
  validateMetrics,
  getDefaultRulesForCategory,
  METRIC_PATTERNS,
  ACTIVITY_KEYWORDS
};
