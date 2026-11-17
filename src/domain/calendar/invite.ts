/**
 * Calendar invites for bookings and cohort sessions: an "Add to calendar" that
 * works everywhere without any account or integration. Two outputs from one
 * event:
 *   - googleCalendarUrl() — a prefilled Google Calendar template link.
 *   - buildIcs() — an RFC 5545 .ics the viewer downloads for Apple Calendar,
 *     Outlook, or anything else; the same file email reminders will attach.
 *
 * Pure functions, no I/O — the student's own calendar then handles the reminder,
 * which is most of "lesson reminders" for none of the cost.
 */

export interface CalendarEvent {
  title: string
  start: Date
  end: Date
  description?: string
  location?: string
  /** A link back to the booking/dashboard, shown in the event. */
  url?: string
}

/** UTC basic format: 20260907T173000Z — what both Google and .ics expect. */
export function toCalendarStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** A prefilled Google Calendar event link. Opens Google's "new event" form with
 *  the fields filled; the viewer just hits save. */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toCalendarStamp(event.start)}/${toCalendarStamp(event.end)}`,
  })
  const details = [event.description, event.url].filter(Boolean).join('\n\n')
  if (details) params.set('details', details)
  if (event.location) params.set('location', event.location)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Escapes a value for an iCalendar text field (RFC 5545 §3.3.11). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Folds a content line to <=75 octets with CRLF + space continuations. */
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = []
  let rest = line
  parts.push(rest.slice(0, 75))
  rest = rest.slice(75)
  while (rest.length > 74) {
    parts.push(' ' + rest.slice(0, 74))
    rest = rest.slice(74)
  }
  if (rest.length) parts.push(' ' + rest)
  return parts.join('\r\n')
}

export interface IcsOptions {
  /** Stable identifier for the event; defaults to a deterministic value derived
   *  from the start time and title so re-issuing updates rather than duplicates. */
  uid?: string
  /** Generation timestamp; injectable for deterministic output in tests. */
  dtstamp?: Date
}

/** Builds an RFC 5545 VCALENDAR with a single VEVENT. CRLF line endings, folded
 *  and escaped per spec, so Apple Calendar / Outlook / Google all accept it. */
export function buildIcs(event: CalendarEvent, options: IcsOptions = {}): string {
  const uid = options.uid ?? `${toCalendarStamp(event.start)}-${hash(event.title)}@pocketpro`
  const dtstamp = options.dtstamp ?? new Date()

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pocket Pro//Lessons//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toCalendarStamp(dtstamp)}`,
    `DTSTART:${toCalendarStamp(event.start)}`,
    `DTEND:${toCalendarStamp(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ]
  const description = [event.description, event.url].filter(Boolean).join('\n\n')
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`)
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`)
  if (event.url) lines.push(`URL:${escapeText(event.url)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')

  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/** Small stable hash for a default UID — not security-sensitive. */
function hash(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}
