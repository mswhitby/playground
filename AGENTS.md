# Ms. Whitby's Playground — canonical project instructions

**This repository is the source of truth for the actual Playground product.** Read [docs/HANDOFF.md](docs/HANDOFF.md) for the current project status, review branches, latest frontend work, and next step. The companion `playground-react` repository is a **temporary frontend design lab**, not the main project.

## Session startup (all GitHub/Codex development work)

1. Read this `AGENTS.md` and `docs/HANDOFF.md` **from `mswhitby/playground/main`**.
2. Inspect GitHub's current branches, open PRs, relevant files, test results, and production/preview publication status before taking action. Handoff SHAs and dates are snapshots, not guarantees.
3. Confirm which repository actually owns the requested work. **Do not substitute the React prototype for the main app.** If a frontend prototype change was approved, integrate it into the main `playground` implementation deliberately, preserving its real services.
4. Make changes in the owning repository, run its appropriate tests/build, and use a review PR unless the user specifically directs otherwise.
5. At the end of substantial work, update the **canonical** `mswhitby/playground/docs/HANDOFF.md` with results, pending work, PRs/SHAs, tests and deployment status. If React design-lab work changed, also update its local handoff or link back here. Never report a deploy/merge before verifying it.

## Architecture and repository ownership

- **Main product and production source:** `mswhitby/playground` (this repository). Owns shared frontend and editor, GitHub/Supabase authentication, role-checked teacher/class APIs, lesson activity and grading systems, schema migrations, build tooling and packaging. Its generated `dist/` is the production website artifact.
- **Production site publisher:** `mswhitby/classroom`. Serves the built main app at `https://www.mswhitby.com/playground/` using GitHub Pages. `classroom/playground/` contains **deployed artifacts**, not a competing product implementation. Preserve the other classroom pages and site CNAME.
- **Frontend redesign/design lab:** `mswhitby/playground-react`. The static review build is served separately at `https://www.mswhitby.com/playground/preview/` through a pinned-commit workflow in `classroom/.github/workflows/publish-react-cs1-preview.yml`. Its mock data, fake completion and demo assignments **must not replace** real production student records or backend operations.
- **Curriculum authoring sources:** `mswhitby/computer-science-1`, `mswhitby/game-programming`, `mswhitby/mobile-app-dev`, `mswhitby/uil`, and TSI materials in `mswhitby/TSI`. Shared challenge/solutions repositories may be private. Keep ownership of curriculum and tests with their authoritative sources; package published content without redefining IDs.
- Files in `playground-react` do not automatically ship to production. Files deployed in `classroom` do not automatically modify `playground` source. Always identify which flow is requested.

## Rules that must survive the React redesign

- Existing **GitHub sign-in + Supabase classroom system** lives in this repository. Reuse and audit it; do not casually create a second authentication system. Teacher/admin authorization must be verified by trusted backend policy, **not** the visibility of a tab or GitHub login alone.
- The actual teacher dashboard uses real, class-scoped data; production student scores are based on **server-verified earned points** and preserved submission history. A prototype `Mark complete` toggle never awards real grades. Do not introduce fictional rosters, assignments, or badges into the real student view.
- Keep all previously published course, unit, lesson and challenge IDs stable (including slash-separated IDs); keep archived lessons addressable and their earned points intact. See `docs/python-curriculum-archiving.md`.
- Never embed protected solutions, hidden tests, API service secrets, bearer tokens, Google Sheets access tokens, or private student records in a public web bundle. Any solution viewer must check the authenticated user's teacher/admin permissions on the server.
- User-selected **course colors** are separate from status colors (completed=green, assigned=amber/yellow, overdue=red). Number tiles keep course colors. Respect the approved React preview design when integrating it into production, but preserve real editor behavior, native course runtimes and Supabase identity.
- Preserve Learn's original Markdown, hints, paginated steps and yellow inline code; Solve first, Learn second; plain colored Prev/Next text links with arrows and actual lesson titles, hidden when unavailable. The editor and Console/Checks must stay resizable with syntax highlighting and local runtime functionality.
- Preserve weekly-point rules (verified positive score improvements, Central Time), due dates, per-student assignment targeting and data access scoped to enrolled classes.
- Avoid school-blocked hosting/CDN dependencies when possible. `mswhitby.com` is the working school URL.

## Build, review and release

- Production build: see `README.md` and `.github/workflows/build.yml`. The workflow checks out the curriculum repositories, runs Node/database/browser/runtime tests, builds the combined `dist/` artifact and uploads `playground-site`.
- Production publish: publish the tested `playground-site` artifact into `mswhitby/classroom/playground/` **only after approval**; do not overwrite the classroom site or the isolated React preview.
- React design lab: `npm test` and `npm run build` in `mswhitby/playground-react`; preview deploy is separate and pins an exact reviewed React commit.
- Do not merge a PR or change production behavior without explicit user authorization. Do not imply a screenshot/mock or passing public example is a real graded submission.
- At the end of any task, update the canonical handoff in this repository as part of the work.

**Canonical status and next action:** [docs/HANDOFF.md](docs/HANDOFF.md).
