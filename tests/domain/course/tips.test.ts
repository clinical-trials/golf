import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { importCourse, type CourseJson } from '@/domain/course/import'
import { upsertCourseTip, publishTip, getPublishedTips } from '@/domain/course/tips'
import { resetDatabase } from '../../reset'

const COURSE: CourseJson = {
  id: 'tip-links', name: 'Tip Links', place: 'Testville, USA', country: 'US', coverage: 'DETAILED',
  holes: [{ number: 1, par: 4, meters: 350, strokeIndex: 10, path: [[35, -106], [35.003, -106.003]] }],
  features: [],
}

beforeEach(resetDatabase)

describe('course tips', () => {
  it('creates a tip as an unpublished draft', async () => {
    await importCourse(COURSE)
    const tip = await upsertCourseTip({ courseSlug: 'us/tip-links', body: 'Wind off the left all afternoon — club up.' })
    expect(tip.published).toBe(false)
    expect(await getPublishedTips('us/tip-links')).toHaveLength(0)
  })

  it('shows a tip to players only after it is published', async () => {
    await importCourse(COURSE)
    const tip = await upsertCourseTip({ courseSlug: 'us/tip-links', holeNumber: 1, body: 'Aim at the left bunker; the slope kicks it back to center.' })
    await publishTip(tip.id)
    const visible = await getPublishedTips('us/tip-links')
    expect(visible).toHaveLength(1)
    expect(visible[0]?.holeNumber).toBe(1)
  })

  it('replaces an existing note and re-drafts it (needs re-approval)', async () => {
    await importCourse(COURSE)
    const first = await upsertCourseTip({ courseSlug: 'us/tip-links', body: 'First draft.' })
    await publishTip(first.id)
    const second = await upsertCourseTip({ courseSlug: 'us/tip-links', body: 'Corrected note.' })
    expect(second.id).toBe(first.id)
    expect(second.published).toBe(false)
    expect(await getPublishedTips('us/tip-links')).toHaveLength(0)
  })

  it('rejects a tip for an unknown course and an empty body', async () => {
    await importCourse(COURSE)
    await expect(upsertCourseTip({ courseSlug: 'us/nope', body: 'x' })).rejects.toThrow(/not found/i)
    await expect(upsertCourseTip({ courseSlug: 'us/tip-links', body: ' ' })).rejects.toThrow(/required/i)
  })
})
