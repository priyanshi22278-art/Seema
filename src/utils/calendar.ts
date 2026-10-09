import { EventItem } from '../types';

export function getGoogleCalendarUrl(event: EventItem): string {
  const [year, month, day] = event.date.split('-').map(Number);
  let hours = 10;
  let minutes = 0;

  if (event.time && event.time.includes(':')) {
    const parts = event.time.split(':');
    hours = parseInt(parts[0], 10) || 10;
    minutes = parseInt(parts[1], 10) || 0;
  }

  const startDate = new Date(year, (month || 1) - 1, day || 1, hours, minutes);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const formatGDate = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const isCancelled = event.status === 'Cancelled';
  const isDeleted = event.status === 'Deleted';
  const datesParam = `${formatGDate(startDate)}/${formatGDate(endDate)}`;
  const title = encodeURIComponent(
    isDeleted ? `[DELETED] ${event.name}` : isCancelled ? `[CANCELLED] ${event.name}` : event.name
  );
  const details = encodeURIComponent(
    `${
      isDeleted
        ? '*** EVENT STATUS: DELETED / ARCHIVED ***\n\nThis event was deleted. Registrations are cancelled and inactive.\n\n'
        : isCancelled
        ? '*** EVENT STATUS: CANCELLED ***\n\n'
        : ''
    }${event.description}\n\nVenue: ${event.venue}\nEvent ID: ${event.id}\nRegistered Capacity: ${event.currentRegistrations}/${event.maxCapacity}`
  );
  const location = encodeURIComponent(event.venue);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}`;
}

export function downloadIcsFile(event: EventItem) {
  const [year, month, day] = event.date.split('-').map(Number);
  let hours = 10;
  let minutes = 0;

  if (event.time && event.time.includes(':')) {
    const parts = event.time.split(':');
    hours = parseInt(parts[0], 10) || 10;
    minutes = parseInt(parts[1], 10) || 0;
  }

  const startDate = new Date(year, (month || 1) - 1, day || 1, hours, minutes);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const formatIcs = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const isCancelled = event.status === 'Cancelled';
  const isDeleted = event.status === 'Deleted';

  const summary = isDeleted ? `[DELETED] ${event.name}` : isCancelled ? `[CANCELLED] ${event.name}` : event.name;
  const descriptionPrefix = isDeleted
    ? '*** EVENT STATUS: DELETED / ARCHIVED ***\\n'
    : isCancelled
    ? '*** EVENT STATUS: CANCELLED ***\\n'
    : '';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CampusPulse//Event Management//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}-${Date.now()}@campuspulse.edu`,
    `DTSTAMP:${formatIcs(new Date())}`,
    `DTSTART:${formatIcs(startDate)}`,
    `DTEND:${formatIcs(endDate)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${descriptionPrefix + event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.venue}`,
    `STATUS:${isCancelled || isDeleted ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.id}_${event.name.replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
