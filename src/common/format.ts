/**
 * Locale-aware date/time formatting helpers used by `todo` and `task`
 * row builders.
 *
 * Pure functions — they take a `Strings` instance (for the microcopy +
 * locale) and a reference `now: Date`. Output:
 *   - past         → `Overdue Jun 8` (via todo.deadline.overdue)
 *   - today        → `Today 14:00`   (via todo.deadline.today)
 *   - future       → `Jun 12 09:00`  (Intl-formatted, no microcopy key)
 *   - undefined    → `undefined` (caller omits the segment)
 */
import type { Strings } from './strings'

function dayBoundaries(now: Date): { startOfToday: Date; startOfTomorrow: Date } {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  return { startOfToday, startOfTomorrow }
}

function intlLocaleFor(strings: Strings): string {
  return strings.locale === 'fr' ? 'fr-FR' : 'en-US'
}

/**
 * Renders the "Quand" segment for a task subtitle. Past dates surface
 * as overdue, today as a time-only string, future as date + time so the
 * `task <q>` keyword can list tasks beyond today.
 */
export function formatDeadlineSubtitle(
  deadlineAt: string | undefined,
  now: Date,
  strings: Strings,
): string | undefined {
  if (!deadlineAt) return undefined
  const d = new Date(deadlineAt)
  if (Number.isNaN(d.getTime())) return undefined

  const locale = intlLocaleFor(strings)
  const { startOfToday, startOfTomorrow } = dayBoundaries(now)

  if (d < startOfToday) {
    const date = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d)
    return strings.t('todo.deadline.overdue', { date })
  }
  if (d < startOfTomorrow) {
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
    return strings.t('todo.deadline.today', { time })
  }
  const date = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d)
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return `${date} ${time}`
}
