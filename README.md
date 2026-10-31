# Ms. Whitby’s Playground

One shared website, separate repositories for course content. The initial site is published at **https://www.mswhitby.com/playground/** using the existing `mswhitby/classroom` Pages deployment. This repo owns the source; files copied into `classroom/playground/` are built deployment artifacts, not a second implementation.

## Frontend redesign and shared Python workspace

The uploaded frontend is the interface reference: its compact header, course picker, collapsible outline, class cards, lesson tables and full-height editor layout are used directly. The previous site skin is no longer loaded in the shared shell. No mock student identities, due dates, grades or pattern-based code checker are included.

Coding pages have one lesson header with Submit, a Practice/Learn switch above the task, a filename strip, one editor, Run/Check/Reset actions and output directly below. There are no nested Tests/Console tabs or repeated instructional panel headers. Practice retains the full published task, examples and hints. Learn uses the same task, original explanations, worked examples and hints as steps, and retains access to the complete original lesson. Both modes share the original draft, checker, activity identity and hand-in.

Python now renders natively under `#/course/computer-science-1`, alongside the other subjects. `computer-science-1` remains its authoring repository: the shared build packages all 24 original Markdown lessons, 24 challenge contracts, starters, examples, skills guides, prerequisite map and unchanged Pyodide worker. Lesson, challenge and filter behavior is available inside the shared shell. Existing `cs1:guided:v1:` and `cs1:challenges:2026-10-26:` draft/progress keys and submission activity IDs are preserved, including earlier guest-draft migration.

Width, editor height, terminal height and preview height retain pointer and keyboard gutters, persisted preferences and workspace expansion. Narrow screens stack the task and editor and use a menu button for the sidebar. The redesign uses installed system fonts only: no font files, embedded font data or external font requests are added.

For local work, check out `computer-science-1`, `game-programming`, `mobile-app-dev` and `uil` alongside this repo. Run `npm ci && npm run build:ui`, then `python scripts/build.py` and `npm run preview`. Open `http://127.0.0.1:8088/playground/`. The browser checks use `npx playwright install chromium && npm run test:browser`; `CHROME_PATH` can select an installed browser. The preview server also serves legacy Python entry URLs for redirect checks.

Publish the shared Playground artifact first, then the companion Python entry-page redirects. Old lesson and challenge bookmarks carry their activity hashes into the shared shell. Curriculum authoring stays in its subject repo. The existing classroom site and CNAME stay intact. A signed-in OAuth/teacher smoke check must happen on the deployment origin; localhost cannot reproduce the configured callback or user-specific class access.

## Course sources

| Course | Source | Current status |
|---|---|---|
| Computer Science I | `mswhitby/computer-science-1` | 24 original Markdown lessons, Python exercises and challenges |
| Game Programming & Design | `mswhitby/game-programming` | 7 units, 11 lessons, 11 C# exercises, 22 checkpoint questions |
| Mobile App Development | `mswhitby/mobile-app-dev` | Four Markdown sample lessons: HTML, CSS, JavaScript, React |
| Capstone | Repository not selected yet | Entry page prepared; course content not published |

`public/` owns the shared header, course navigation, appearance settings, lesson rendering, code drafts, and checkpoint UI. Lesson bodies are ordinary Markdown in each curriculum repository. `course.json` contains navigation and exercise contracts, not prose. No copies of shared application code belong in course repositories.

## Build and publish

Use Python 3 and Node 22+. Prebuilt browser assets are checked in. To rebuild the pinned Material Style, Markdown renderer, and highlighted editors, run `npm ci && npm run build:ui`.

```bash
node --test tests/*.test.mjs
python scripts/build.py --game-source ../game-programming --mobile-source ../mobile-app-dev
python -m http.server 8080 --directory dist
```

The sibling subject checkouts, including `computer-science-1`, are needed for local build/tests. The build workflow checks it out automatically and uploads the `playground-site` artifact. Validate the artifact, then copy **its contents** into `mswhitby/classroom/playground/` to publish through the existing site. Retain the existing classroom CNAME and site; do not replace its root.

The site attempts to load the public Game Programming manifest from its canonical repository, validates it, and falls back to the last bundled snapshot if that request is unavailable or invalid. Content edits can therefore appear without changing shared application code. A new build refreshes the fallback snapshot. Shared UI changes require republishing the artifact. Source commit metadata for the bundled snapshot is in `content-sources.json`.

## Current student experience

- All four courses have entry routes. Python and Game Programming have lessons and exercises; Mobile Development has four working sample lessons.
- Quizzes grade locally with explanations, retry, best/latest results, and stable activity IDs.
- Unity practice completion is explicitly self-reported and separate from quiz results.
- C# drafts save locally. Run code compiles and executes the original C# in a terminable browser worker using .NET and Roslyn. Check answer compiles a separate entry point for the published test cases and preserves terminal output. Stop interrupts loading/execution; execution has a 30-second timeout and captured output has a 20,000-character limit. Fork/PR checks remain available as separate compiled practice checks.
- Theme controls are inside Account & Preferences. Navigation uses a small sidebar caret.

## Account architecture

GitHub sign-in, cross-device progress sync, and the teacher dashboard are implemented
using Supabase PKCE, verified GitHub identities, and scoped database RPCs.
The current setup is documented in **Student accounts**, **Class sections and
teacher dashboard**, and **Manual class assignments** below.

Signed-in accounts use a single identity across all subject playgrounds.
Client-side practice checks are useful evidence but are not independently verified
grades. Explicit hand-ins are separately stored, timestamped snapshots.
Unfinished drafts remain private. Never store GitHub OAuth secrets or bearer
tokens in static browser assets.

## Curriculum alignment

Game content links to official Unity Essentials, Junior Programmer, Player Control, and Basic Gameplay resources. These are original companion lessons and quizzes, not copies of Unity materials or claims of full pathway completion. Pathway references were checked 2026-10-23.

## Browser C# runtime

The runtime is pinned to `@wasmsharp/core@0.10.2` (Apache-2.0), with runtime binaries loaded from unpkg. Vendored loader modules adapt the package’s bundler asset imports to pinned CDN URLs; regenerate them with `python scripts/prepare-csharp-runtime.py <extracted-package-directory>`. The local worker imports `WasmSharpWorker.js` directly; it does not import the package’s Comlink/unpkg entry point. The first use downloads the compiler/runtime; C# source is compiled and executed locally and is not sent to a code-execution service. The CDN serves runtime assets only. C# runtime downloads use `unpkg.com`, which is allowed by the district course policy.

Our managed driver uses real Roslyn syntax trees and metadata references. Run compiles the original source unchanged and invokes its true entry point, including parameterless Main. Check adds a separate checker syntax tree and selects its startup class. Standard output/errors and actual compiler diagnostics return through a bounded protocol. This is synchronous console C# practice, not UnityEngine execution. `Console.ReadLine` and awaited asynchronous programs are not supported in this initial classroom runner. Practice results are client-side and must not be treated as tamper-proof grades.

The worker can be terminated on Stop, navigation, load timeout, or execution timeout. It has no DOM access. As with any client-side editor, this does not turn browser results into a trusted assessment service.

## Guided debugging
The Debugging page accepts standalone C# console programs and uses the same local compiler. Unity scripts must run in Unity; students can paste Unity Console errors for rule-based troubleshooting prompts. Expected behavior and drafts stay in browser storage. This is not a conversational AI tutor. No API key or student-code upload is required.

The course now follows all six Unity Essentials missions in order, followed by the introductory Junior Programmer unit. Each mission links to its official Unity Learn companion.

## Shared interface
All subjects use the central Playground interface, reference stylesheet and appearance settings. The shared shell loads the editor stylesheet directly and does not load the previous Material skin. Appearance supports light, dark and device settings; saved preferences migrate and tabs synchronize.

Exercises use descriptive PascalCase C# methods and snake_case Python functions. Prompts, starters, and published examples agree. Older Solution/solution drafts are retained and accepted during migration; new starters use the new names.

## Editing lesson content

Python: edit the original `units/**/*.md` files in `computer-science-1`. Game and Mobile: edit `lessons/**/*.md` in their respective repositories. Use normal Markdown headings, bold vocabulary, inline code, lists, images, and fenced code; no fixed body template is required. GitHub renders previews. Exercise starters and check cases remain separate from the prose. Never replace teacher-authored text with shortened generated fields. Ask before changing the authoring format or imposing a new lesson structure.

The Python site reads canonical Markdown and uses `docs/units/content/` as a network fallback; refresh it with `python scripts/publish-markdown.py` in that repository before publishing. Shared Playground builds package Game and Mobile Markdown alongside the site. Material Style 3.1.1 supplies the actual base components, with the reference purple palette and a small layout stylesheet.

## Shared lesson layout

CS1 is the layout reference for the other playgrounds: a full-height sidebar flush to the header and left edge, a unit or competency selector, lesson text beside the coding workspace, a draggable width divider, adjustable editor and output heights, output below the editor, and an expandable workspace. `public/study-layout.mjs` shares that behavior between Game Programming and Mobile Development. Keep course navigation attached to the page rather than presenting it as a floating card.

## Browser console

Mobile App & Web uses a collapsible, draggable console below its preview. It starts closed, counts actual log/warning/error entries, opens for errors, and supports clearing. Successful rendering does not print a synthetic ready message. All course output panes use Material Style's selected surface/text roles.

## Future project workspace (not implemented)

Add file tabs and a file tree for HTML/CSS/JavaScript projects and React component modules, keeping editable source files separate from rendered previews. React Native needs an Expo-capable preview rather than assuming the DOM preview can run every native API. Repository integration should let students select a repository/branch, open files, review a diff, then save a commit. Use the shared GitHub account system and narrowly scoped repository access, keep credentials on a session service, and detect conflicting changes before saving. GitHub sign-in alone does not provide repository write access or a progress database. These are later features, not changes to the Markdown curriculum authoring format.

## UIL practice

`mswhitby/uil` owns the original 40-question written practice and six programming activities. Edit lesson prose in Markdown, starters as `.java`, and question/test contracts in the separate manifests. The first 15 written questions follow the published topic sequence; questions 39–40 are discrete-answer free response. This is a starter set, not full topic coverage.

Before building locally, run `python scripts/prepare-java-runtime.py`. It downloads the reviewed TeaVM compiler and libraries and verifies the hashes in `scripts/java-runtime.json`; builds fail if the upstream files change. The build workflow does this automatically. The runtime is included in deployment artifacts and loaded locally in terminable workers. Browser Java is basic computation practice, not a Java 26 runtime or full desktop library; file input practice is downloaded for a Java 26 IDE.

The shared console now sits directly under the editor, above actions. Preview height is independent. Editors support wrapping selected text with brackets/quotes and Ctrl/Cmd+/ comments. Python challenge Run executes the student program; Check compares return values separately.

## Guided Mobile App & Web projects

Mini-projects have their own `#/course/mobile-app-dev/projects` browsing page, course collection, and `#/course/mobile-app-dev/project/<id>/<step>` route, distinct from competency lessons. Club Connect starts with one HTML source file containing style and script sections. Markdown walkthroughs, starter, and finished example live in `mswhitby/mobile-app-dev/projects/club-connect/`. All steps share a single device-local draft; related lesson drafts stay separate. The finished example is a collapsible comparison, never an automatic replacement of student work.

The project preview keeps an opaque-origin sandbox and enables form events for the signup exercise. An injected `form-action 'none'` content policy prevents native form transmission. Checks exercise actual validation and repeated submit behavior in the preview. No real enrollment, backend, or personal-information storage is implemented.


## Student accounts

GitHub sign-in uses Supabase PKCE. Public browser configuration lives in
`frontend/account.js`; GitHub client secrets belong only in Supabase's provider
settings. Build the account bundle with `npm run build:ui`.

Apply `supabase/migrations/202610240001_progress.sql` once through the Supabase SQL
editor. Set the Site URL to `https://www.mswhitby.com/playground/` and allow
`https://www.mswhitby.com/playground/auth-callback.html` as a redirect. Enable the
GitHub provider using an OAuth app with the Supabase `/auth/v1/callback` address.

Practice summaries, append-only attempts, and drafts are scoped to the signed-in
Supabase user through RLS. Browser checks and self-reports are practice evidence,
not verified grades. No teacher access is granted by this migration.

Guest data remains on its original device. Signed-in data uses a separate local
cache per account; guest import requires an explicit choice. Offline changes stay
queued. Draft updates use server revisions to detect changes from another device;
conflicting copies require a choice and preserve a local backup. Sign out on shared
computers to clear the account cache. Unsynced work can be downloaded before sign-out.

Run `npm test` for cache separation, queue ownership, retry, and conflict tests.
After deployment, verify a real GitHub round trip, a draft and check result on a
second device, and sign-out before treating the integration as fully verified.


### Explicit submissions

Apply `supabase/migrations/202610240002_submissions.sql` once to add the separate
hand-in table. Draft sync and unlimited practice checks never create submissions.
Only **Submit work**, followed by confirmation, saves an immutable snapshot with
a database timestamp and receipt. Draft editing continues afterward. A later
explicit hand-in creates another snapshot. A passing practice check is displayed
as practice evidence, never as a submitted assignment. Existing practice history
is not migrated into submissions. Teacher review access is not configured yet.


### Class sections and teacher dashboard

Apply the teacher dashboard setup supplied with this release once in Supabase SQL
Editor (it includes submission storage if that earlier setup was skipped). The
classroom migration is `202610240003_classrooms.sql`. Teacher access is derived
from verified `auth.identities` GitHub provider IDs 63321092 (deoncarlette) and
104539455 (deandrawhitby), never editable user metadata. Both accounts share the
mswhitby teacher group. Private classroom tables have no browser table grants;
intentional authenticated RPCs check teacher group or own membership on every call.

Teachers open `#/teacher` to create class sections and review enrolled students.
Students may join with a code at `#/classes` and enroll immediately. Teachers can
also enroll known GitHub accounts directly using Manual class assignments (below).
Removed members expose no course work or activity to a teacher. Removing/leaving stops teacher access to that
student's records in that section. Teachers can see practice summaries, check counts,
and immutable submitted copies for their approved roster and the section course.
Unfinished draft source remains private.

Activity signals are sent only for signed-in, approved class members while using
an activity. Visible pages send a heartbeat about every 30 seconds; interaction
signals are throttled to at most once per 15 seconds. No key contents, clipboard,
window titles, browsing outside the site, or mouse coordinates are stored. The
private activity table holds a latest snapshot per tab; rows older than 24 hours
are cleaned during a later approved signal. The dashboard refreshes every 20 seconds
while visible and uses server timestamps. Recently interacting = visible heartbeat
within 65 seconds plus interaction within two minutes; viewing page = visible
heartbeat without recent interaction; otherwise no recent signal. Multiple tabs
are combined. These are browser-reported clues, not attendance or verified effort.
Guests send no class signals. No external analytics were added.


### Manual class assignments (October 30, 2026)

Apply `supabase/migrations/202610300005_manual_class_assignments.sql` in the existing
Supabase SQL Editor **after** the classroom and auto-join migrations.
This migration preserves current sections, membership, practice, and submissions.
Deployment also requires rebuilding the central `mswhitby/playground` site and
publishing the artifact to the existing `mswhitby/classroom/playground/` directory.
The separate subject repositories need no changes.

In `#/teacher`, select an existing section and expand **Manually assign students**.
Paste GitHub usernames (up to 500 in one action, processed in batches of 100).
Recognized usernames belonging to GitHub accounts already signed in to the
Playground enroll immediately without student approval or a class code.
Students not yet known to Supabase are queued; the assignment resolves automatically
on their first verified GitHub sign-in, using the username in GitHub provider
identity data. The teacher dashboard shows queued names and allows cancellation.
This does not create GitHub accounts or fetch unknown account IDs from GitHub.

Previously removed students are not restored by bulk assignment. Use the existing
Restore control if intentional. Course access and all teacher reports remain scoped
to the selected class and course. Class assignments share the same account across
all subject playgrounds. No changes to assessment logic or local drafts are made.

Database tests: `npm run test:database`. Browser tests: `npm test`.


### Registered-account directory and private Sheet overlay (October 30, 2026)

Apply `supabase/migrations/202610300006_registered_account_roster.sql` after
the existing classroom and auto-join migrations. The registered-account
directory displays **all GitHub accounts that have signed in to Playground**,
including unassigned people; teacher accounts are excluded. Teachers may
create course sections, add accounts individually or in bulk, move between
sections of the same course, remove memberships, and mark private clients
without deleting saved progress. Only verified GitHub usernames and internal
identifiers are stored as student membership data.

The optional Google Sheet overlay is **read-only, browser-only, and ephemeral**.
A teacher pastes the Sheet URL in `#/teacher`. Google Identity Services obtains
a short-lived browser token from the signed-in Google account. Google Sheets
values are fetched **directly by that browser**, with only `Class Period`,
`First Name`, `Last Name`, and `GitHub Username` columns requested.
Whitespace in the original Google Form headers is normalized. The local
directory matches case-insensitive GitHub usernames and shows name/period,
unmatched usernames, and duplicate handles. None of the Google Sheet data,
sheet URL, or Google OAuth access token goes into Supabase; backend roster
writes pass only existing Supabase user UUIDs and section UUIDs. The Google
token and sheet rows are held in memory until navigating away. The public
Google OAuth web client ID (not secret) is the sole browser-saved setting.

For a **private** spreadsheet, URL-only access is not possible. Enable the
Google Sheets API in a Google Cloud project, configure the OAuth consent
screen and its test users as required, and create a Web OAuth client with
`https://www.mswhitby.com` as an authorized JavaScript origin. Enter that
public OAuth client ID under the teacher dashboard's one-time Google
authorization setup. Use the Google account that owns or has access to the
Sheet when prompted. Do **not** publish the spreadsheet to the web or put
Sheets API keys, service account secrets, or private Sheet URLs in this
public repository. The requested `spreadsheets.readonly` OAuth scope is
Google-classified as sensitive, and may require verification if used beyond
the consent screen's permitted test accounts.

Use the Sheet's **class period filter**, select visible registered students,
choose the destination section, then **Add selected**. Existing membership
and progress are preserved; moving between sections of the same course uses
the per-person Move action. Sheet entries whose GitHub account has not
registered cannot be enrolled until the student signs in to Playground.
No subject curriculum repositories are modified.

Run `npm test` and `npm run test:database` before publication.

### Visual system

`public/visual.css` adds shared typography, surfaces, and light/dark colors while
preserving the existing course layouts and actions. DM Sans, Fraunces, and Space
Mono are self-hosted under `public/vendor/fonts/`; OFL licenses are checked in.
Run `python scripts/prepare-fonts.py` before packaging to fetch the pinned font
assets with SHA-256 verification. No Canva SDK, telemetry, external font request,
or content from the reference's generated application is used.
