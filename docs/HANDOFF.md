# Ms. Whitby's Playground — canonical project handoff

**Updated:** 2026-11-13 (America/Chicago)  
**Canonical project:** `mswhitby/playground`  
**Standing instructions:** [../AGENTS.md](../AGENTS.md)
**Curriculum repository guide:** [CURRICULUM-REPOSITORIES.md](CURRICULUM-REPOSITORIES.md)

This is the **master handoff for the whole platform**, not just the React redesign. Always recheck current GitHub PRs, workflow runs, main branch and deployed site; every SHA and PR status below is a snapshot.

## Current update — 2026-11-13: Test Prep expansion (staged, React preview only)

- **Architecture:** Test Prep is the intended top-level public area for existing TSI Math plus ASVAB, SAT and ACT. Keep the published `tsi-math` course ID and direct URLs unchanged; do not delete/recreate its 20-day curriculum, diagnostic work or existing learning history. A repository rename from `mswhitby/TSI` to `mswhitby/test-prep` is proposed, **not yet performed**.
- **React design lab:** [draft PR #11](https://github.com/mswhitby/playground-react/pull/11) from branch `feature/test-prep-hub-20261113`, stacked on open PR #10. A Test Prep home card and hub link to the existing TSI course; original ASVAB/SAT/ACT samples cover 10 subject topics/20 formative MCQs with explanations and browser-only practice progress. New test-prep lesson pages are custom practice UI, not coding lessons; 75/75 React tests and build passed in [CI run 43504385667](https://github.com/mswhitby/playground-react/actions/runs/43504385667). These are not official items, tests or scaled scores.
- **TSI source repo:** [draft PR #3](https://github.com/mswhitby/TSI/pull/3), branch `feature/test-prep-curriculum-20261113`, adds `test-prep.json`, new exam `track.json` files, a catalog validator and a rename/migration plan. Existing `course.json`, 20-day TSI assets and scripts remain unchanged. TSI validation passed [CI run 43504414481](https://github.com/mswhitby/TSI/actions/runs/43504414481) before the new CI workflow update; verify run after that commit too. This is **not** a completed test-prep migration or a new GitHub repository.
- **Hosted preview:** `mswhitby/classroom/.github/workflows/publish-react-cs1-preview.yml` now pins React SHA `710a71b25e1bdb75614168890e3d5d7d021ac124` for `https://www.mswhitby.com/playground/preview/`. Preview publisher [run 43504615471](https://github.com/mswhitby/classroom/actions/runs/43504615471) succeeded; verify subsequent GitHub Pages deployment as a separate step. This workflow only updates isolated `/playground/preview` files, **not production** `/playground/`.
- **Next:** (1) review preview with the other teacher, (2) migrate TSI and new exam catalogs into the shared source/packager with ID compatibility and student-safe filtering, (3) complete TSI 20-day differentiated content, (4) update all CI and provenance references and rename TSI repo only after dependencies are verified and approval is given. Do not merge draft PRs automatically or treat browser demo quiz attempts as verified grades.

## Curriculum authoring — now documented

The canonical [curriculum repository guide](CURRICULUM-REPOSITORIES.md) records each source repository's authoring files, manifest format, build integration, private/public content boundary, validators and release workflow. **Read it before editing course lessons or challenges.** Do not update generated copies in `classroom` or React snapshots as the primary source. The guide was verified against the current course repository trees and manifest/README contents on 2026-11-06. No curriculum or student data was changed as part of this documentation work.

## Source of truth and deployment map

| Purpose | Repo | What belongs there |
| --- | --- | --- |
| **Real app / central project** | `mswhitby/playground` | Shared frontend, backend/identity integration, authenticated teacher/student dashboard, grades and points, schema migrations, grading, build and tests |
| **Real website / published artifacts** | `mswhitby/classroom` | Serves **`https://www.mswhitby.com/playground/`** by publishing built `playground/dist/` artifacts. It is **not** a second application source repo |
| **Temporary frontend design lab** | `mswhitby/playground-react` | React UI experiments, prototypes and sample data; previews at **`https://www.mswhitby.com/playground/preview/`** |
| **Content authoring** | `computer-science-1`, `game-programming`, `mobile-app-dev`, `uil`, `TSI` | Curriculum lesson Markdown, published activity metadata, course-specific contracts. Some shared challenge solutions and tests reside in private repositories |

**Important:** `playground-react` changes do not automatically become production features. The long-term goal is to migrate accepted React frontend designs **into the central `playground` repo while retaining its existing auth, grading, student history, course runtimes and submission systems**. Do not deploy prototype mock data to real students.

## Production today

- Real app source `mswhitby/playground`, built and published at `/playground/` using `mswhitby/classroom`.
- Production currently includes GitHub sign-in, Supabase PKCE account synchronization, classroom/teacher-scoped APIs, stored hand-ins and grades, weekly verified point calculations and real curriculum. Read `public/account*.js`, `public/account*.mjs`, `public/classroom-client.mjs`, `public/teacher-*.mjs`, `public/classroom-page.mjs` and `supabase/migrations/` before proposing a new auth/roster system.
- The `.github/workflows/build.yml` build checks out course repos, tests contracts, database access, student pages and runtimes, then uploads the combined `playground-site` artifact. `classroom/playground/` is a deployment destination, not source to edit for permanent product features.
- Computer Science I has 10 units and 40 authentic lessons in the redesigned content bundle. Production preserves original lesson IDs, grade history and archived lessons; `docs/python-curriculum-archiving.md` governs archiving and point preservation.
- At the time of this handoff, **no open PRs were returned by GitHub for `mswhitby/playground`**. Verify when starting a new task.

## Frontend React redesign — current work

- **Repo:** `mswhitby/playground-react`. **PR #10**: `https://github.com/mswhitby/playground-react/pull/10`, branch `course-accents-editor-teacher-catalog`. **OPEN, not merged** at the time recorded here.
- Latest React PR #10 commit at documentation time: `a98b2066c570efdc41c4763d2cf267f5a04bd911` (includes a React-local `AGENTS.md` and handoff). Confirm the actual PR head before editing; further commits may have landed.
- PR #9 (original published CS1 data, original unit/lesson titles/IDs and legacy links) **was merged to React `main`**, not production `playground/main`.
- React site at `https://www.mswhitby.com/playground/preview/` is published through `mswhitby/classroom/.github/workflows/publish-react-cs1-preview.yml`, which **pins an exact React commit** and copies React entry/assets without deleting other journal/challenge standalone previews.
- PR #10 preview last verified by GitHub Actions: React tests + build succeeded at run `42311186343`; preview publisher succeeded at run `42311348962`; Pages build/deploy succeeded at run `42311397738`. Reverify on later commits.
- Real CS1 **public** curriculum is integrated in the React preview (10 units, 40 lessons, original Markdown, hints, starter code, published examples, Python Run and browser-only public Check). Other courses still use mock datasets.
- UI decisions: students can customize each course color; no global red/purple accent selector. The lesson-number backgrounds keep course color even when an item is complete/assigned/overdue. Status badge/dot colors: green=complete, amber=assigned, red=overdue. The sidebar green dot, overview lesson card and preview progress are synchronized, but **manual completion is visual-only**.
- Solve and Learn tabs; numbered or titled Markdown step pagination; plain course-colored chevron Prev/Next links, previous/next lesson names, hidden at boundaries; brighter yellow inline code. Bundled CodeMirror editor with highlighting, auto-pairs, local completion and resizable console.
- Teacher Dashboard: current public CS1 catalog (units, names, published points, starters) plus **browser-local demonstration** of assigning to an entire section or selected fictional students, due dates, override points, remove/edit assignments. These are **not live assignments**.
- React **Solution** tab is deliberately locked—do not serve private answer keys in public JS.
- Accounts moved out of class-specific Teacher Dashboard to a separate **Admin Dashboard mock**. Section setup button sits next to section selector. Neither the demo Admin Dashboard nor mock teacher roster is authenticated live student data.

## NEXT — priority workflow

1. **Review React PR #10** and confirm desired teacher controls, course colors, editor and navigation. Do **not** automatically merge or replace production until user approves.
2. **Integrate the accepted frontend changes into `mswhitby/playground`**, which owns the real product. Use the React preview for UX reference, not as a separate permanent backend or replacement for existing production. Preserve route IDs, archived history and points earned.
3. Connect React-based teacher/admin screens to the **existing production GitHub/Supabase login and permissioned teacher/class RPCs**; verify ownership, membership and role guards from actual SQL. GitHub login **alone** is not sufficient to authorize teacher/admin data.
4. Use authorized backend endpoints to fetch real students, class rosters, historical grades and weekly points. Replace sample assignment editor with real, class-scoped assignment writes; verify whether current schema supports **whole-class vs selected-student targeting, due dates and point overrides** before writing migrations. Keep test mode separate from live data.
5. Build **teacher-only** solution retrieval behind server authentication/authorization, without exposing answer keys or hidden tests in static assets. Apply real role checks before showing Admin Accounts.
6. Keep `docs/HANDOFF.md` in **this production repo** current after every major development session, including frontend-lab work; update the React-local handoff as a pointer/secondary record when its code changes.

## Design and safety constraints

- User's courses: CS1 Python, Game Programming & Design (Unity/C#), Mobile App & Web, Capstone, UIL, and TSI. Only real CS1 is loaded in the current React preview; don't mistake demo content for production reality.
- Real progress comes from **verified earned points**; never convert a prototype `Mark complete` click to a real grade or overwrite existing scoring/submissions. Weekly points are positive score improvements measured in **America/Chicago**.
- Existing course lesson IDs are permanent. Archives retain original names/content, available points and historical scores. Preserve old bookmarks.
- Keep teacher information scoped to authorized sections; never expose student personal information, Sheets tokens, privileged Supabase secrets, hidden tests or private solutions in public GitHub/static assets.
- Production should remain at `https://www.mswhitby.com/playground/`; the React test build remains at `https://www.mswhitby.com/playground/preview/`.
- User prefers **copyable raw URLs in fenced code blocks** when sharing preview and GitHub links from a phone.
- Deployments and merges require explicit consent; verify CI and website deployment before reporting them complete.

## Key paths

**Main `playground` repo:** `.github/workflows/build.yml`, `public/` (production app, auth, teacher/student views), `frontend/` (shared UI), `grading/`, `supabase/migrations/`, `scripts/build.py`, `tests/`, `docs/python-curriculum-archiving.md`.

**React design lab:** `AGENTS.md`, `docs/HANDOFF.md` (secondary), `src/data/liveCs1/`, `src/components/course/`, `src/components/teacher/TeacherCurriculum.jsx`, `src/pages/{TeacherDashboard,AdminDashboard}.jsx`, `src/lib/previewAssignments.js`.

**Classroom publisher:** `.github/workflows/publish-react-cs1-preview.yml` (React preview), `playground/` (production build files).

## Always update this file when work changes

Write: date, owning repo and branch, approved decision, exact open/merged PR state, tests performed and outcome, deployment verified or not, mock vs real data boundary, then a **specific next step**. Do not merely update a React-specific handoff and leave the canonical product handoff stale.

For a new ChatGPT conversation, ask: **"Read `AGENTS.md` and `docs/HANDOFF.md` from `mswhitby/playground/main`, verify open PRs and deployed previews, and continue our Playground work."**

## TSI 20-day existing-UI integration (in progress, 2026-11-06)

PR #27 (`tsi-20-day-existing-ui`) adds a 20-day schedule view and four interactive draft strand lessons under the existing `#/course/tsi-math/study` route. Existing five-day IDs and local practice results are retained. `scripts/package_tsi.py` copies the new plan, locator profiles, lesson Markdown and answer explanations when `--tsi-source` is provided. `public/app.js` bumps the TSI module cache version. **Not yet tested or deployed.** Next: verify build/browser tests, update the classroom workflow to check out TSI and build from the verified Playground commit, then verify production; the schedule is not a complete 20-day authored curriculum. Longer-term direction: independent curriculum bundle deployment without duplicating the shared app.

## TSI replacement (2026-11-06)

Branch `tsi-clean-replacement` replaces the TSI-only UI and package with the 20-day plan, 81-code strand placement, and a new 12-item four-strand free-response diagnostic. No old TSI browser demo data, UI, or lessons are retained in the new experience. Four authored draft strand lessons provide multiple-choice practice; other scheduled days and all level-specific content remain incomplete and are explicitly labeled. No TSI database or real student records exist. This is **not** a completed 20-day curriculum; do not describe it as such. Tests and production publication must be verified before marking complete. Next: author differentiated Learn/Practice/Simulation content for each day/level, teacher integration, and independent TSI-only deployment.

## TSI-only production publishing status (2026-11-06)

PR #28 merged as `58f31c5269235dfab09681659845f8e54c53a104`. The latest PR build/browser smoke run #42337543949 passed, including free-response diagnostic, 20-day schedule, MC practice, and draft simulation navigation. `mswhitby/classroom/.github/workflows/publish-tsi-curriculum.yml` publishes only `playground/data/tsi-math/`, `playground/tsi.mjs`, and the shared `playground/app.js` module version; coding course repositories and published course folders are untouched. The TSI-only publish run #42337653352 succeeded; GitHub Pages final deployment must be verified separately. The 20-day outline is NOT a completed 20-day curriculum: only four draft strand practices and a 16-item draft simulation are authored, and level-specific lesson content remains to be developed. TSI student records and earned points do not exist in a database.
