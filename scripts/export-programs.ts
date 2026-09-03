/**
 * Exports the class curriculum to docs/programs.json so the static site renders
 * the same modules the backend sells. Quiz ANSWERS and explanations are
 * stripped — scoring is server-side; the site shows only question counts.
 *
 * Run: pnpm exec tsx scripts/export-programs.ts
 */
import { writeFileSync } from 'node:fs'
import { ALL_PROGRAMS } from '../src/domain/program/curriculum'

const payload = {
  note: 'Draft curricula pending Tom Harris review. Quiz answers are never published.',
  programs: ALL_PROGRAMS.map((p) => ({
    slug: p.slug,
    name: p.name,
    description: p.description,
    weeks: p.weeks.length,
    priceMinor: p.priceMinor,
    currency: p.currency,
    modules: p.weeks.map((w) => ({
      week: w.week,
      title: w.title,
      videoId: w.videoId,
      homework: w.homework,
      quizQuestions: w.quiz.length,
    })),
  })),
}

writeFileSync('docs/programs.json', JSON.stringify(payload, null, 1))
console.log(`wrote docs/programs.json — ${payload.programs.length} programs`)
