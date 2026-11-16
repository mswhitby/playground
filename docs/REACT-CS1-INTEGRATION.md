# React Computer Science I integration — read-only release candidate

Date: November 16, 2026 (America/Chicago)

## Goal
Validate the approved React frontend against the existing live Playground's **own-account, server-verified** Computer Science I history, without changing student submissions, grades, drafts, memberships, or production routes. This is an integration milestone, not a student-facing replacement.

## Ownership
- Canonical production app: mswhitby/playground
- React frontend: mswhitby/playground-react, feature/cs1-readonly-production-bridge-20261116, stacked on the React preview series
- Isolated deployment target: mswhitby/classroom/playground/integration/, alongside (not instead of) /playground/ and /playground/preview/.

## Existing service contracts
- Production authentication uses Supabase GitHub OAuth and the localStorage key playground-auth-v1. This test **only reads** an established session; sign-in, sign-out and token refresh remain with the live Playground.
- public/integration/account-bridge.js verifies identity with Auth GET /auth/v1/user, then reads the authenticated user's CS1 submission IDs and verified-grade fields through existing RLS-protected GETs. It never fetches student code files, writes data, or persists records to localStorage.
- Server score semantics come from public/grade-results.mjs and 202611030007_grades.sql. Keep the highest valid graded score, including archived activity IDs. Weekly verified increments follow 202611050010_teacher_student_history_weekly_points.sql: positive improvements only, credited to the submission week in America/Chicago.
- The React adapter uses this bridge only when VITE_READONLY_INTEGRATION=true, a flag exclusively set in the isolated integration build.

## Safety boundary
- Existing full-course React preview stays unchanged. The isolated build limits navigation to Computer Science I, grades and public practice.
- Run/Check still uses browser examples. **Submit is disabled** and the manual complete toggle is hidden; completion depends on verified grades.
- Teacher/Admin, journals, challenge submissions, enrollment and background sync remain disabled in this test build.
- The production site, assessment identifiers, grading workers, schema, signed-in teacher APIs and old deep links remain unchanged.
- No student data is committed to GitHub. Tests use fictional users and UUIDs.

## Release gates
1. React npm test and npm run build succeed at a pinned commit.
2. Canonical Node tests, including tests/react-integration-bridge.test.mjs, and production build pass in PR CI.
3. Publish the pinned React frontend plus canonical bridge **only** under /playground/integration/, with a separately scoped publisher.
4. Verify GitHub Pages deployment; test signed-out and signed-in flows with an authorized test account, compare actual grades to the current live app, and check read-only network methods. Never capture session tokens in logs.
5. Check Python practice, direct deep links, mobile, school-network behavior, archived scores and cross-account isolation.
6. Only then implement and audit permissioned submissions, roster, teacher/admin, and journal adapters in later PRs. Keep an immediate rollback route.

Do not merge or replace production until the user explicitly approves the release.