# Pravesh

A fitness, nutrition and lifestyle tracker built around one idea:

> **Track less. Understand more.**

You log what you did. The app works out the rest — consistency, progress,
personal records, goals and what to do next.

---

## Status

**Phase 1 of 9 complete.** The app runs, onboards a user, persists data, and
renders a live Home screen from real logged data.

Nothing in the UI is simulated. Areas that are not yet built say so explicitly
rather than showing mock data behind a working-looking interface.

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Foundation — setup, theme, navigation, data model, auth, profile, seed data | **Done** |
| 2 | Workout — live logging, sets, PRs, e1RM, progression | Not started |
| 3 | Nutrition — foods, meals, macros, targets | Not started |
| 4 | Habits + schedule — consistency engine, calendar | Partially: engine built and tested |
| 5 | Progress — monthly reports, charts, goals, bodyweight | Not started |
| 6 | Strength ranking — percentile engine, comparison groups | Schema only |
| 7 | Pravesh Bot — AI provider abstraction, structured context | Not started |
| 8 | Premium polish — animation, haptics, a11y, performance | Partially: motion + a11y foundations |
| 9 | QA — tests, offline, security review | Ongoing (133 tests) |

---

## Running it

```bash
npm install
npm run web        # browser
npm run ios        # requires a local iOS toolchain
npm run android    # requires a local Android SDK
```

Verification:

```bash
npm run typecheck  # tsc --noEmit, strict
npm run lint       # eslint
npm test           # jest
```

There is no backend to configure. The app is fully functional offline on first
launch, with a demo history seeded so there is something to look at. Remove it
any time from **More → Sample data**.

---

## Architecture

```
UI (screens, components)      no business logic, no storage access
  ↓
hooks / feature modules       assemble view state
  ↓
calculations/                 pure functions — no React, no storage, no clock
  ↓
database/ repositories        domain queries over typed entities
  ↓
StorageDriver                 swappable: Memory | AsyncStorage | (later) SQLite | Supabase
```

Four boundaries are kept deliberately clean: **calculations, database, auth, AI.**
Everything else can move without touching them.

### Calculations are pure

`src/calculations/` imports nothing from React or storage. Every number the app
displays — estimated 1RM, volume, consistency, progress deltas — comes from a
function that can be tested in isolation and reproduced by hand. This is what
lets the AI layer describe results without being able to invent them.

### Offline is the default, not a mode

Local storage is the source of truth. No write path touches the network. IDs are
client-generated UUIDs and every row carries `updatedAt`, so a future sync can
reconcile without renumbering anything.

### Honest data

Several decisions exist specifically to avoid lying to the user:

- **Estimated 1RM returns `null`** above 15 reps instead of extrapolating a
  number the formula cannot support.
- **Month-over-month comparisons refuse to report** unless both periods have at
  least two sessions. One session against one session is noise.
- **Percent change from a zero baseline is `null`**, not `Infinity`.
- **A planned rest day is excluded** from the consistency score rather than
  scored zero — missing a workout you never planned is not a failure.
- **Nutrition macros are snapshotted at log time**, so editing a food tomorrow
  never rewrites what last month's totals were.
- **Strength percentiles ship with a demo dataset**, flagged as such in the
  schema, with the real-data requirement documented. No fake science.

---

## Data model

36 tables. Canonical units everywhere — **kg, cm, metres, seconds, kcal, grams** —
converted only at the display edge.

Dates are handled in two distinct forms, which is what prevents the classic
UTC day-shift bug:

- `localDate` (`YYYY-MM-DD`) for anything belonging to a calendar day, resolved
  in the *user's* timezone.
- ISO-8601 UTC timestamps for instants.

A 23:30 meal in Asia/Kolkata belongs to that day, not to tomorrow. There are
tests for this.

The TypeScript entities in `src/database/schema/` and the Postgres DDL in
`supabase/migrations/0001_initial_schema.sql` are kept name-for-name in sync.

---

## Backend

Not provisioned. The migration is written, and has been applied and verified
against a real PostgreSQL 16 instance:

- 36 tables created
- row-level security enabled and forced on all 36
- 36 owner-only policies
- isolation verified: each user sees only their own rows, an unauthenticated
  session sees none, and a cross-user write is rejected by the policy

Enabling it is a transport change, not a remodel.

---

## Security and privacy

- No secret ever reaches the client bundle. Anything prefixed `EXPO_PUBLIC_` is
  public by definition; provider keys and the Supabase service-role key belong
  only to server-side code. See `.env.example`.
- Row-level security enforces per-user ownership at the database, not in
  application code.
- AI features can be switched off entirely, in which case no data is sent
  anywhere. Each AI message records which structured context functions supplied
  its data, so a user can audit exactly what left the device.
- Technical errors are logged, never shown. Users get plain language.

---

## Project layout

```
src/
  app/              expo-router routes (tabs, onboarding)
  components/ui/    design-system primitives
  features/         feature modules (home, onboarding, shell)
  calculations/     pure domain maths + tests
  database/
    schema/         entity definitions — the source of truth for shape
    driver/         StorageDriver implementations
    seed/           exercise & food library, demo history
  services/         database, auth and session providers
  theme/            tokens, palettes, ThemeProvider
  utils/            date and unit handling + tests
supabase/migrations/  Postgres DDL with RLS
```

---

## Testing

133 tests covering the parts where a silent error would be most damaging:
timezone boundaries, unit conversion round-trips, e1RM bounds, volume
aggregation, consistency weighting, rest-day handling, streak bridging, and
comparison gating.

Edge cases are tested explicitly: zero reps, zero weight, missing data, no
previous month, negative values, leap days, DST transitions. **The app never
renders `NaN` or `Infinity`** — non-finite results surface as `—`.

### A note on verification

This build was developed in a headless Linux container with no iOS or Android
emulator available. Everything claimed above was verified by running it: the web
build was driven end-to-end in Chromium (onboarding completed, tabs navigated,
settings changed and persisted across reload), and the SQL was applied to a real
Postgres instance.

Native-only surfaces — haptics, push notifications, Apple/Google sign-in — are
behind platform-guarded abstractions that no-op safely on web. They are **not**
verified on device and need a local `expo run:ios` / `expo run:android` or an EAS
build to exercise.
