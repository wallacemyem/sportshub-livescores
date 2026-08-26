/**
 * Safely parses any date input format (ISO-8601, SQL timestamp, UNIX ms/sec, Date)
 */
export function parseDateSafe(dateInput: string | Date | number | undefined | null): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  if (typeof dateInput === 'number') {
    const ms = dateInput < 10000000000 ? dateInput * 1000 : dateInput;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateInput === 'string') {
    let s = dateInput.trim();
    if (!s) return null;
    // Replace space between date and time with T
    if (s.includes(' ') && !s.includes('T')) {
      s = s.replace(' ', 'T');
    }
    // Fix "+00" to "Z"
    if (s.endsWith('+00')) {
      s = s.slice(0, -3) + 'Z';
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * Formats time with explicit AM / PM (e.g. "2:30 PM", "11:45 AM")
 */
export function formatTimeAMPM(dateInput: string | Date | number | undefined | null): string {
  const d = parseDateSafe(dateInput);
  if (!d) return 'Upcoming';
  try {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Upcoming';
  }
}

/**
 * Formats a date in proper written English (e.g. "Wednesday, Aug 26, 2026" or "Aug 26, 2026")
 */
export function formatProperDate(
  dateInput: string | Date | number | undefined | null,
  includeWeekday = false
): string {
  const d = parseDateSafe(dateInput);
  if (!d) return '';
  try {
    return d.toLocaleDateString('en-US', {
      weekday: includeWeekday ? 'short' : undefined,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Formats a full date and time (e.g. "Aug 26, 2026, 2:30 PM" or "Today at 2:30 PM")
 */
export function formatMatchDateTime(dateInput: string | Date | number | undefined | null): string {
  const d = parseDateSafe(dateInput);
  if (!d) return 'Upcoming';
  try {
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const timeStr = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (isToday) {
      return `Today at ${timeStr}`;
    }

    const dateStr = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return `${dateStr}, ${timeStr}`;
  } catch {
    return 'Upcoming';
  }
}
