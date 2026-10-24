# Ms. Whitby’s Playground

One shared website, separate repositories for course content. The initial site is published at **https://www.mswhitby.com/playground/** using the existing `mswhitby/classroom` Pages deployment. This repo owns the source; files copied into `classroom/playground/` are built deployment artifacts, not a second implementation.

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

The sibling `game-programming` checkout is needed for local build/tests. The build workflow checks it out automatically and uploads the `playground-site` artifact. Validate the artifact, then copy **its contents** into `mswhitby/classroom/playground/` to publish through the existing site. Retain the existing classroom CNAME and site; do not replace its root.

The site attempts to load the public Game Programming manifest from its canonical repository, validates it, and falls back to the last bundled snapshot if that request is unavailable or invalid. Content edits can therefore appear without changing shared application code. A new build refreshes the fallback snapshot. Shared UI changes require republishing the artifact. Source commit metadata for the bundled snapshot is in `content-sources.json`.

## Current student experience

- All four courses have entry routes. Python and Game Programming have lessons and exercises; Mobile Development has four working sample lessons.
- Quizzes grade locally with explanations, retry, best/latest results, and stable activity IDs.
- Unity practice completion is explicitly self-reported and separate from quiz results.
- C# drafts save locally. Run code compiles and executes the original C# in a terminable browser worker using .NET and Roslyn. Check answer compiles a separate entry point for the published test cases and preserves terminal output. Stop interrupts loading/execution; execution has a 30-second timeout and captured output has a 20,000-character limit. Fork/PR checks remain available as separate compiled practice checks.
- Theme controls are inside Account & Preferences. Navigation uses a small sidebar caret.

## Account architecture: next phase

GitHub SSO and verified cross-device tracking are **not implemented**. Do not treat local records as official grades. The static site must not contain an OAuth client secret or GitHub token.

The next phase needs an OAuth app and a backend session service. Use GitHub’s stable numeric user ID as the external account identity, not a username. Store records by `(student_id, course_id, activity_id, content_version)` and keep attempts as separate records. Existing course/activity IDs are stable; adding a course must not create a second student identity. Namespaced device-local records are a temporary practice convenience. Import them only as unverified practice after explicit student choice, never as trusted assessment results.

A single backend can then expose `/api/session`, `/api/progress`, and `/api/attempts` for all courses. Official C# assessments require trusted execution and server-side records. Authorization should let students read their own records and teachers access only their assigned groups. GitHub sign-in does not itself provide a progress database.

## Curriculum alignment

Game content links to official Unity Essentials, Junior Programmer, Player Control, and Basic Gameplay resources. These are original companion lessons and quizzes, not copies of Unity materials or claims of full pathway completion. Pathway references were checked 2026-10-23.

## Browser C# runtime

The runtime is pinned to `@wasmsharp/core@0.10.2` (Apache-2.0), with runtime binaries loaded from unpkg. Vendored loader modules adapt the package’s bundler asset imports to pinned CDN URLs; regenerate them with `python scripts/prepare-csharp-runtime.py <extracted-package-directory>`. The local worker imports `WasmSharpWorker.js` directly; it does not import the package’s Comlink/unpkg entry point. The first use downloads the compiler/runtime; C# source is compiled and executed locally and is not sent to a code-execution service. The CDN serves runtime assets only. C# runtime downloads use `unpkg.com`, which is allowed by the district course policy.

Our managed driver uses real Roslyn syntax trees and metadata references. Run compiles the original source unchanged and invokes its true entry point, including parameterless Main. Check adds a separate checker syntax tree and selects its startup class. Standard output/errors and actual compiler diagnostics return through a bounded protocol. This is synchronous console C# practice, not UnityEngine execution. `Console.ReadLine` and awaited asynchronous programs are not supported in this initial classroom runner. Practice results are client-side and must not be treated as tamper-proof grades.

The worker can be terminated on Stop, navigation, load timeout, or execution timeout. It has no DOM access. As with any client-side editor, this does not turn browser results into a trusted assessment service.

## Guided debugging
The Debugging page accepts standalone C# console programs and uses the same local compiler. Unity scripts must run in Unity; students can paste Unity Console errors for rule-based troubleshooting prompts. Expected behavior and drafts stay in browser storage. This is not a conversational AI tutor. No API key or student-code upload is required.

The course now follows all six Unity Essentials missions in order, followed by the introductory Junior Programmer unit. Each mission links to its official Unity Learn companion.

## Shared Material design
All four course areas and the Python lesson/challenge pages load `material.css` and `theme.js` from the central Playground. The actual Material Style 3.1.1 stylesheet supplies the base components; the purple palette follows its theming reference. The shared CSS handles course layout, editors, and legacy Python surfaces. Appearance supports device setting, light, and dark; older preferences migrate and tabs synchronize. No additional runtime UI framework is required.

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
