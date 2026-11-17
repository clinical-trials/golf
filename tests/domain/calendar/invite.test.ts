import { describe, it, expect } from 'vitest'
import { googleCalendarUrl, buildIcs, toCalendarStamp, type CalendarEvent } from '@/domain/calendar/invite'

const event: CalendarEvent = {
  title: 'Private lesson with Tom',
  start: new Date('2026-09-07T17:30:00.000Z'),
  end: new Date('2026-09-07T18:30:00.000Z'),
  description: 'Bring the driver; we work the tee shot.',
  location: 'Austin, TX',
  url: 'https://pocketpro.example/dashboard',
}

describe('toCalendarStamp', () => {
  it('formats a Date as UTC basic format', () => {
    expect(toCalendarStamp(event.start)).toBe('20260907T173000Z')
  })
})

describe('googleCalendarUrl', () => {
  it('builds a prefilled template link with start/end, details and location', () => {
    const url = new URL(googleCalendarUrl(event))
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('text')).toBe('Private lesson with Tom')
    expect(url.searchParams.get('dates')).toBe('20260907T173000Z/20260907T183000Z')
    expect(url.searchParams.get('details')).toContain('Bring the driver')
    expect(url.searchParams.get('details')).toContain('pocketpro.example')
    expect(url.searchParams.get('location')).toBe('Austin, TX')
  })

  it('omits optional fields when absent', () => {
    const url = new URL(googleCalendarUrl({ title: 'Clinic', start: event.start, end: event.end }))
    expect(url.searchParams.get('details')).toBeNull()
    expect(url.searchParams.get('location')).toBeNull()
  })
})

describe('buildIcs', () => {
  const ics = buildIcs(event, { uid: 'fixed-uid@pocketpro', dtstamp: new Date('2026-09-01T00:00:00.000Z') })

  it('is a well-formed VCALENDAR/VEVENT with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('BEGIN:VEVENT\r\n')
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
    expect(ics).toContain('VERSION:2.0')
  })

  it('carries the event times, title, uid and dtstamp', () => {
    expect(ics).toContain('UID:fixed-uid@pocketpro')
    expect(ics).toContain('DTSTAMP:20260901T000000Z')
    expect(ics).toContain('DTSTART:20260907T173000Z')
    expect(ics).toContain('DTEND:20260907T183000Z')
    expect(ics).toContain('SUMMARY:Private lesson with Tom')
    expect(ics).toContain('LOCATION:Austin\\, TX')
  })

  it('escapes commas, semicolons and newlines in text', () => {
    const tricky = buildIcs({
      title: 'Lesson; bring clubs, balls',
      start: event.start,
      end: event.end,
      description: 'line one\nline two',
    })
    expect(tricky).toContain('SUMMARY:Lesson\\; bring clubs\\, balls')
    expect(tricky).toContain('DESCRIPTION:line one\\nline two')
  })

  it('is deterministic for the same input and options', () => {
    expect(buildIcs(event, { uid: 'fixed-uid@pocketpro', dtstamp: new Date('2026-09-01T00:00:00.000Z') })).toBe(ics)
  })
})
