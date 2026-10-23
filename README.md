# Ms. Whitby’s Playground

One shared website, separate repositories for course content. The initial site is published at **https://www.mswhitby.com/playground/** using the existing `mswhitby/classroom` Pages deployment. This repo owns the source; files copied into `classroom/playground/` are built deployment artifacts, not a second implementation.

## Course sources

| Course | Source | Current status |
|---|---|---|
| Computer Science I | `mswhitby/computer-science-1` | Link to existing Python playground; content migration pending |
| Game Programming & Design | `mswhitby/game-programming` | 2 units, 8 lessons, 8 C# exercises, 16 checkpoint questions |
| Mobile App Development | `mswhitby/mobile-app-dev` | Entry page prepared; course content not published |
| Capstone | Repository not selected yet | Entry page prepared; course content not published |

`public/` owns the shared header, course navigation, appearance settings, lesson rendering, code drafts, and checkpoint UI. `game-programming/course.json` owns lesson content. No copies of shared application code belong in course repositories.

## Build and publish

Use Python 3 and Node 22+. No npm packages are required.

```bash
node --test tests/*.test.mjs
python scripts/build.py --game-source ../game-programming
python -m http.server 8080 --directory dist
```

The sibling `game-programming` checkout is needed for local build/tests. The build workflow checks it out automatically and uploads the `playground-site` artifact. Validate the artifact, then copy **its contents** into `mswhitby/classroom/playground/` to publish through the existing site. Retain the existing classroom CNAME and site; do not replace its root.

The site attempts to load the public Game Programming manifest from its canonical repository, validates it, and falls back to the last bundled snapshot if that request is unavailable or invalid. Content edits can therefore appear without changing shared application code. A new build refreshes the fallback snapshot. Shared UI changes require republishing the artifact. Source commit metadata for the bundled snapshot is in `content-sources.json`.

## Current student experience

- All four courses have entry routes; only Game Programming’s new units and the existing Python course have material.
- Quizzes grade locally with explanations, retry, best/latest results, and stable activity IDs.
- Unity practice completion is explicitly self-reported and separate from quiz results.
- C# drafts save locally. Run code compiles and executes the original C# in a terminable browser worker using .NET and Roslyn. Check answer compiles a separate entry point for the published test cases and preserves terminal output. Stop interrupts loading/execution; execution has a 10-second timeout and captured output has a 20,000-character limit. Fork/PR checks remain available as separate compiled practice checks.
- Theme controls are inside Account & Preferences. Navigation uses a small sidebar caret.

## Account architecture: next phase

GitHub SSO and verified cross-device tracking are **not implemented**. Do not treat local records as official grades. The static site must not contain an OAuth client secret or GitHub token.

The next phase needs an OAuth app and a backend session service. Use GitHub’s stable numeric user ID as the external account identity, not a username. Store records by `(student_id, course_id, activity_id, content_version)` and keep attempts as separate records. Existing course/activity IDs are stable; adding a course must not create a second student identity. Namespaced device-local records are a temporary practice convenience. Import them only as unverified practice after explicit student choice, never as trusted assessment results.

A single backend can then expose `/api/session`, `/api/progress`, and `/api/attempts` for all courses. Official C# assessments require trusted execution and server-side records. Authorization should let students read their own records and teachers access only their assigned groups. GitHub sign-in does not itself provide a progress database.

## Curriculum alignment

Game content links to official Unity Essentials, Junior Programmer, Player Control, and Basic Gameplay resources. These are original companion lessons and quizzes, not copies of Unity materials or claims of full pathway completion. Pathway references were checked 2026-10-23.

## Browser C# runtime

The runtime is pinned to `@wasmsharp/core@0.10.2` (Apache-2.0), loaded from jsDelivr. The local worker imports `WasmSharpWorker.js` directly; it does not import the package’s Comlink/unpkg entry point. The first use downloads the compiler/runtime; C# source is compiled and executed locally and is not sent to a code-execution service. The CDN serves runtime assets only. School networks must allow `cdn.jsdelivr.net`, as for the existing Python runtime.

Our managed driver uses real Roslyn syntax trees and metadata references. Run compiles the original source unchanged and invokes its true entry point, including parameterless Main. Check adds a separate checker syntax tree and selects its startup class. Standard output/errors and actual compiler diagnostics return through a bounded protocol. This is synchronous console C# practice, not UnityEngine execution. `Console.ReadLine` and awaited asynchronous programs are not supported in this initial classroom runner. Practice results are client-side and must not be treated as tamper-proof grades.

The worker can be terminated on Stop, navigation, load timeout, or execution timeout. It has no DOM access. As with any client-side editor, this does not turn browser results into a trusted assessment service.
