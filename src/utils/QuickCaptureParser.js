/**
 * Quick Capture Parser
 * Parses natural language task input like: "algorithms tomorrow 7am p1 @learning #deep"
 * Returns: { text, deadline, dueTime, priority, mainCategory, effortLevel }
 */

export const parseQuickCapture = (input) => {
  const result = {
    text: '',
    deadline: undefined,
    dueTime: undefined,
    priority: undefined,
    mainCategory: undefined,
    effortLevel: undefined,
  };

  if (!input || typeof input !== 'string') return result;

  let remaining = input.trim();

  // Extract priority: p1, p2, p3, !high, !med, !low
  const priorityMatch = remaining.match(/\b(p1|p2|p3|!high|!med|!low)\b/i);
  if (priorityMatch) {
    const p = priorityMatch[1].toLowerCase();
    if (p === 'p1' || p === '!high') result.priority = 'high';
    else if (p === 'p2' || p === '!med') result.priority = 'medium';
    else if (p === 'p3' || p === '!low') result.priority = 'low';
    remaining = remaining.replace(priorityMatch[0], '').trim();
  }

  // Extract effort level: #deep, #quick, #medium
  const effortMatch = remaining.match(/#(deep|quick|medium)/i);
  if (effortMatch) {
    const e = effortMatch[1].toLowerCase();
    if (e === 'deep') result.effortLevel = 'deep_work';
    else if (e === 'quick') result.effortLevel = 'low';
    else if (e === 'medium') result.effortLevel = 'medium';
    remaining = remaining.replace(effortMatch[0], '').trim();
  }

  // Extract category: @fitness, @learning, @work, etc.
  const categoryMatch = remaining.match(/@(\w+)/i);
  if (categoryMatch) {
    result.mainCategory = categoryMatch[1].charAt(0).toUpperCase() + categoryMatch[1].slice(1);
    remaining = remaining.replace(categoryMatch[0], '').trim();
  }

  // Extract time: 7am, 14:00, 3:30pm, at 9am, etc.
  const timeMatch = remaining.match(/(?:at\s+)?(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const meridiem = timeMatch[3]?.toLowerCase();

    if (meridiem === 'pm' && hour !== 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;

    result.dueTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    remaining = remaining.replace(timeMatch[0], '').trim();
  }

  // Extract date: tomorrow, today, monday, next week, 2024-03-15, etc.
  const dateMatch = remaining.match(
    /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+week|this\s+week|\d{4}-\d{2}-\d{2})\b/i
  );
  if (dateMatch) {
    const dateStr = dateMatch[1].toLowerCase();
    const today = new Date();
    let targetDate = new Date(today);

    if (dateStr === 'today') {
      // Keep today
    } else if (dateStr === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (dateStr.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/)) {
      const dayMap = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 0,
      };
      const targetDay = dayMap[dateStr];
      const currentDay = targetDate.getDay();
      let daysAhead = targetDay - currentDay;
      if (daysAhead <= 0) daysAhead += 7;
      targetDate.setDate(targetDate.getDate() + daysAhead);
    } else if (dateStr === 'next week') {
      targetDate.setDate(targetDate.getDate() + 7);
    } else if (dateStr === 'this week') {
      // Keep today
    } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      targetDate = new Date(dateStr);
    }

    result.deadline = targetDate.toISOString().split('T')[0];
    remaining = remaining.replace(dateMatch[0], '').trim();
  }

  // Remaining text is the task name
  result.text = remaining || 'Untitled Task';

  return result;
};

/**
 * Format parsed result for display
 */
export const formatParsedResult = (parsed) => {
  const parts = [];

  if (parsed.text) parts.push(`📝 ${parsed.text}`);
  if (parsed.deadline) {
    const date = new Date(parsed.deadline);
    parts.push(`📅 ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`);
  }
  if (parsed.dueTime) parts.push(`🕐 ${parsed.dueTime}`);
  if (parsed.priority) {
    const icon = parsed.priority === 'high' ? '🔴' : parsed.priority === 'medium' ? '🟡' : '🟢';
    parts.push(`${icon} ${parsed.priority}`);
  }
  if (parsed.mainCategory) parts.push(`📂 ${parsed.mainCategory}`);
  if (parsed.effortLevel) {
    const icon = parsed.effortLevel === 'deep_work' ? '⚡⚡⚡' : parsed.effortLevel === 'medium' ? '⚡⚡' : '⚡';
    parts.push(`${icon} ${parsed.effortLevel}`);
  }

  return parts.join(' • ');
};
