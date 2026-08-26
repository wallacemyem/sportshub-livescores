/**
 * Formats time with explicit AM / PM (e.g. "2:30 PM", "11:45 AM")
 */
export function formatTimeAMPM(dateInput: string | Date | number | undefined | null): string {
  if (!dateInput) return 'Upcoming';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Upcoming';
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
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
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
  if (!dateInput) return 'Upcoming';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Upcoming';

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
