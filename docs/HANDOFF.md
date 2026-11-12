# Ms. Whitby's Playground — canonical project handoff

**Updated:** 2026-11-06 (America/Chicago)  
**Canonical project:** `mswhitby/playground`  
**Standing instructions:** [../AGENTS.md](../AGENTS.md)
**Curriculum repository guide:** [CURRICULUM-REPOSITORIES.md](CURRICULUM-REPOSITORIES.md)

This is the **master handoff for the whole platform**, not just the React redesign. Always recheck current GitHub PRs, workflow runs, main branch and deployed site; every SHA and PR status below is a snapshot.

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

## React published-content migration (2026-11-12; review stage, no production merge)

**User decision:** migrate existing, published course material into the preferred React interface now, host it only at `/playground/preview/` for hands-on verification, and defer further TSI curriculum and other lesson authoring until the frontend migration is reviewed. This is a frontend migration; **not** authorization to merge or deploy the live main Playground.

**Owning repo and open PR:** `mswhitby/playground-react`, PR #10 (`course-accents-editor-teacher-catalog`), https://github.com/mswhitby/playground-react/pull/10. Review changes in that repo; all production backend and student records remain in canonical `mswhitby/playground`.

- Reuse authentic CS1 content (10 units/40 original lessons). Add the 7-unit, 11-lesson Game Programming course; 4 Mobile App & Web lessons plus 3 distinct guided projects and original step identifiers; the UIL published written practice and 6 Java lessons; and the current TSI 20-day schedule, 4 authored draft strand lessons, 24-item practice diagnostic and 81 MATH locator profiles. Keep original source ID/order and Markdown/student-facing starters. No canonical Capstone content exists, so label that area unpublished rather than inventing lessons.
- React reads **existing published student-facing artifacts** at same-origin `/playground/data/<course>/` during preview, retaining ownership and authoring in course repos. Missing files surface load errors. Never package private challenge solutions, hidden tests, privileged keys or student data.
- A new React project-step workspace shows the actual published walkthroughs with one browser-local draft per project. Its Run/Check/Submit remain **preview-only for HTML/JS/Java/C#**. Python Run/Check in CS1 run published examples only. TSI diagnostic/placement are instructional and browser-local, not official TSIA2 readiness results or enrolled student information.
- Remove fabricated student-facing grades/assignments for all courses; React teacher/admin pages still use fictional sample accounts/assignments, **not authenticated real tools**. True GitHub/Supabase account linking, trusted grading, scores, weekly improvements, student data, role authorization, real class-specific assignments and non-Python runtimes must remain in the main app and be preserved during later frontend integration.
- React tests and static build verified by GitHub Actions; see PR #10 current checks. New tests cover imported IDs, guided projects, TSI, safe URLs, and preventing fake grades. Initial CI failure from an obsolete mock-grade test was corrected; subsequent builds passed.
- **Preview deployment:** `mswhitby/classroom/.github/workflows/publish-react-cs1-preview.yml` pins an exact reviewed React commit and publishes only `playground/preview/`. Verify current pin and GitHub Pages deployment before asserting that the updated website is live. Do not publish `playground/dist` to production or modify `classroom/playground/` outside the isolated preview.

**Next actionable step:** finish React CI and preview publication verification, manually review published content and navigation at https://www.mswhitby.com/playground/preview/, then create a separate **unmerged** integration PR in canonical `playground` implementing the React UI against the existing real services. After user approval and production-compatible runtime/auth/grade validation, proceed to author remaining TSI differentiated days and other course content in their owned curriculum repositories.

### Preview publication verification — November 12, 2026

- React PR #10 pinned at reviewed commit `ecbfcaf26f5fe8f48577fbe1f0c112e70e573d16` in `classroom/.github/workflows/publish-react-cs1-preview.yml`.
- React code tests and Vite build passed at `25f77eb1ac350da92c33e3926ce7d145c82213c2` (GitHub Actions run `43259375598`). The preview publisher reran **both `npm test` and `npm run build` on the exact pinned `ecbfcaf...` commit** and succeeded (run `43259777713`).
- The publisher committed just `playground/preview/index.html` and the corresponding React JS/CSS assets to `mswhitby/classroom/main` as `13a8d23c94b5f7319de765d9bfa202644c9dad54`; no production `/playground/` artifacts were changed.
- GitHub Pages build/deployment for this published commit succeeded in run `43259861313`. The published preview HTML references the new hashed assets under `/playground/preview/assets/`. **Headless browser/UI click-through was not run; user testing is next.**
- Review URL: https://www.mswhitby.com/playground/preview/ . Existing production: https://www.mswhitby.com/playground/ . Neither the React PR #10 nor this documentation PR #32 has been merged.

## November 12, 2026 — live browser Run/Check development (review pending)

**User-approved scope:** make React checks resemble the live Playground's expected/received cards and run actual Python, Java, C#, HTML, CSS, JavaScript, React and public shared-bank examples in the isolated preview. **Keep Submit disabled; no trusted grading, point awards, roster data or teacher operations.**

- React `CodePane` and `ConsolePane` now share a structured pass/review grid of publicly authored checks, separate Console and browser Preview tabs, running status, error feedback and a disabled Submit button. The optional public-check fraction is labeled practice-only.
- Python continues to execute in the existing preview Pyodide worker; public function examples now display a real returned value on Run and individual pass/received/expected values on Check.
- C# and Java load the same-origin public production browser worker/runtime modules lazily from `/playground/`; lesson checks use the production's C# Roslyn checker and Java public example contracts. C# shared-bank array outputs use structural comparison. Java 26 file-input tasks explicitly remain IDE-only.
- HTML, CSS, JavaScript and React use a sandboxed `iframe srcDoc` with actual user code and runtime DOM checks. Existing guided Mobile App projects reuse published production step validators (`project-preview.mjs`); students keep a shared browser-local draft across steps.
- The shared Challenge Bank now uses this common workspace for Python, Java, JavaScript and C# with the **already public** sample cases; no private solutions or hidden tests are bundled. Legacy mock Submit and simulated check messages in these views were replaced; submission/grade APIs are not called.
- New `src/lib/livePreviewRuntime.js`, `src/lib/previewChecks.js`, `tests/live-language-checks.test.mjs`; updated `src/components/course/{CodePane,ConsolePane,ProjectWorkspace}.jsx`, `src/pages/ChallengeDetail.jsx`, shared CSS and relevant prior tests.
- **Testing before publication:** JavaScript syntax checks and sandbox JS public-example execution were inspected. CI/build and the publisher's exact-commit npm test/build gate **must pass on the final SHA** before declaring the website updated. The last published preview remains the verified curriculum migration until then.
- **Limitations:** supported browsers and school CDN access still determine whether Pyodide loads; Java file I/O tasks need a full Java 26 IDE; no hidden grading, sandboxed execution trust, official grades or server submissions. Do not imply the client-side checker is authoritative.

**Next:** pin the final reviewed React commit in `mswhitby/classroom/.github/workflows/publish-react-cs1-preview.yml`; verify the isolated publisher tests/build, the Pages deployment and real course links. Once approved, port the reviewed frontend to the canonical Playground against its existing authentication, grading and runtimes. Do not merge/deploy production without explicit user approval.

### Verified React live-practice preview publication — November 12, 2026

- React open PR #10 unmerged at `4b52173a8260bed39beed5d77ba1557b45331ce9`. No canonical main Playground application change.
- Preview publisher workflow pinned exact SHA and committed as `mswhitby/classroom` `22451152db596593f1e4e7c0d4437c2238254045`.
- Publisher run `43268280514` succeeded: **66 tests passed, zero failed**, hosted Vite build succeeded and isolated preview publish succeeded. An earlier Vite failure for a Python helper import was fixed before this successful release.
- Generated classroom preview commit `12b1d269b9030c8afe385e3db2358400823a118d` changes only `playground/preview/index.html` and three React preview assets; it does not change production application artifacts.
- GitHub Pages deployment `43268373582` **succeeded** for this commit. Preview URL: https://www.mswhitby.com/playground/preview/ . No in-browser UI click-through or campus network test performed in this session.
- Python uses Pyodide with a CDN that can be affected by school filtering. Java file-I/O tasks require Java 26 IDE, and Unity gameplay scenes require Unity. All client checks are public-example practice, never trusted grading; Submit remains disabled.
- **Next:** review deployed functional Run/Check/Preview in every course on actual browsers, then port approved React UI to canonical Playground while preserving role-protected student data and server grading. Neither React PR #10 nor handoff PR #32 may be merged without authorization.

## November 12, 2026 — Mobile App & Web multi-file preview (production unchanged)

**Decision:** In the React course preview, each Mobile App & Web lesson uses three separately editable browser-local files: `index.html`, `styles.css`, `script.js` (React: `App.jsx` in place of `script.js`). Run/Check assemble those linked files into the existing isolated browser preview. The HTML source visibly references its separate stylesheet/script; students no longer need to edit inline CSS or JS in a giant HTML document. Source folders and IDs remain owned by `mswhitby/mobile-app-dev`.

**Implementation** (`mswhitby/playground-react` PR #10, still open, branch `course-accents-editor-teacher-catalog`):
- `src/components/course/WebFilesPane.jsx` owns independent, tabbed, per-file drafts for each lesson/project and a common preview/console/checks panel. It opens the relevant file when a guided project advances to HTML, styling or JavaScript; project steps retain one **shared project** file set, while different lessons/projects have isolated draft keys. Save, Reset, download of the selected file, Run and published Check work browser-locally; Submit remains disabled.
- `src/lib/webFiles.js` separates previous inline `<style>` and `<script>` content in existing one-file starters and any saved one-file browser draft **without deleting the legacy draft**. Browser preview assembles only files explicitly linked by `index.html`; separate files are never sent to grading or student-data services. The existing opaque-origin iframe, publicly authored step checks, and special React JSX compiler/runtime are reused.
- `src/lib/publishedCourseLoader.js` now accepts optional per-lesson/per-project `starterFiles` maps of actual published paths in the Mobile App curriculum repository. Until those are authored and published, the preview continues to split the existing single-file starters. Course, project, lesson, and step IDs and order are unchanged.
- Existing published Markdown for Club Connect/Bracket Challenge still describes inline `<style>`/`<script>` and complete cumulative one-file examples. The React project reading pane explicitly remaps those directions to `styles.css`/`script.js`. Source prose must be rewritten in its **owning curriculum repo** during the next curriculum authoring phase, not silently rewritten in generated classroom assets.
- `mswhitby/mobile-app-dev` draft PR #3 (`docs/separate-mobile-source-files`) documents the next-authoring standard for physical source files and the optional manifest map. It is documentation-only and unmerged; existing starter files and production site remain unchanged.
- **Validation:** isolated preview publisher run `43273518799` successfully ran **73 tests, 0 failures**, the hosted Vite build and preview-only publisher. It checked out React code SHA `046f632d70444e3c72e22b595e68233a7ac887a1` (no production grading/login changes). Classroom workflow pin commit `921d0b994dfdf167e41663c59f4552af703575a7`; published React assets commit `8f42197a38be7509b2bdd892df1833b9ebbc5d10` touches only the preview tree. Pages deployment run `43273602383` must be checked for completed success; UI click-through on a school device was not performed.
- **Next:** verify Pages deployment, review the linked file tabs and Club Connect/Bracket checks in a browser, retain existing drafts, and update future lesson Markdown/starter sources in `mobile-app-dev` only after frontend review. No merging or production deployment without explicit approval.

### Final multi-file preview publication confirmation

- GitHub Pages site deployment **completed successfully** in `mswhitby/classroom` run `43273602383` for commit `8f42197a38be7509b2bdd892df1833b9ebbc5d10`. The publisher changed only the isolated preview index and its generated JS/CSS assets. The separate production `/playground/` application was not modified.
- Preview ready for user review: https://www.mswhitby.com/playground/preview/ . Review HTML lesson, CSS lesson, JavaScript lesson, React lesson, Club Connect step changes and Bracket Challenge; browser-specific smoke testing remains unverified beyond successful build and automated tests.
