# Curriculum repositories — source of truth, authoring, validation and publication

**Owner:** `mswhitby/playground` is the central application, but **curriculum lives in its respective authoring repositories**. This guide is authoritative for cross-repo work. Also read [../AGENTS.md](../AGENTS.md), [HANDOFF.md](HANDOFF.md), and the target curriculum repo's current README, manifest and validator before editing. Repository structures may evolve; inspect their current trees rather than relying on memorized file paths.

## Ownership map

| Course or bank | Canonical repository | Authoring structure | Main Playground integration |
| --- | --- | --- | --- |
| Computer Science I — Python | `mswhitby/computer-science-1` | `units/**` Markdown and practice files; `docs/units/data-XX.js` ordered lesson catalogs; `docs/challenges/data-*.js` legacy public challenges | `scripts/package-python.mjs` packages all catalogs, Markdown, challenges, public examples and worker into `dist/data/computer-science-1/` |
| Game Programming & Design — Unity/C# | `mswhitby/game-programming` | `course.json` nested unit/lesson/exercise/checkpoint contracts; `lessons/*.md` prose; `exercises/**/Program.cs` code | `scripts/build.py` validates C# exercise files and packages `course.json`, Markdown and exercises into `dist/data/game-programming/` |
| Mobile App & Web — HTML/CSS/JS/React | `mswhitby/mobile-app-dev` | `course.json` has lesson and **separate project** navigation; `lessons/<competency>/lesson.md` and adjacent starters; `projects/**` guided mini-project Markdown and starter/example source | `scripts/build.py` packages approved course data to `dist/data/mobile-app-dev/` |
| UIL Computer Science — written/Java | `mswhitby/uil` | `course.json` manifest; `lessons/*.md` prose; `programming/*.java` starters; `practice/written-01.json` original written questions | `scripts/build.py` packages the course to `dist/data/uil/`; Playground has its own browser Java practice runtime |
| TSI Math Advisory | `mswhitby/TSI` | `course.json` weeks/session IDs; **canonical student source** `content/week-01-student.json`; teacher key `teachers/week-01/answers.json`; generated `lessons/` and printable materials | `scripts/package_tsi.py` through `scripts/build.py`; `public/data/tsi-math/` is a pinned fallback snapshot for the open demo |
| Reusable cross-course challenges | **Private:** `mswhitby/challenges` | `catalog.json`; `problems/<id>/problem.md`, `config.json`, `examples.json`, `starters/`; **private** `solutions/` and hidden tests | Only an **explicit allowlist** of student-safe files may be published. A trusted grading worker may read hidden tests in private execution. See [shared-challenge-grading.md](shared-challenge-grading.md). |
| Capstone | **No canonical curriculum repository selected yet** | Planned; do not invent a repository or mark mock lessons as published | Keep preview content clearly marked as sample until a real source is chosen |

**Production source / publishing boundary:** `mswhitby/playground` owns the app and the content integration/build; `mswhitby/classroom/playground/` hosts **generated production artifacts**, not a second authoring repository. `mswhitby/playground-react` is an independent UI sandbox at `/playground/preview/`; its copied lesson data is a snapshot, **not** the editing source. A content change in an authoring repo is not necessarily live until the central package is rebuilt and published, though some readers can fetch a validated newer public manifest and fall back to a bundled one.

## Non-negotiable rules for every course

1. **Edit the owning repository first.** Add Markdown to the course authoring repo; edit its catalog/contract to add or link the lesson. Do not hand-edit `classroom/playground/data/`, generated `playground/dist/`, or React preview snapshots as the long-term source of content.
2. **Do not rename/recycle published course, unit, lesson, challenge, checkpoint, or submission activity IDs.** IDs are referenced by bookmarks, saved drafts, roster assignments, submission history and earned points. Titles and descriptions may improve without breaking IDs. Preserve original lesson order unless an intentional curriculum change is approved.
3. **Don't delete graded history.** For CS1, mark a retired lesson `status: "archived"` in its source catalog, keeping its original contract, Markdown, points and addressable ID; see [python-curriculum-archiving.md](python-curriculum-archiving.md). When assessment requirements or hidden grading change materially, create a **new activity ID** and archive the old one instead of silently replacing it.
4. **Separate instructions, practice checks and verified grading.** Starter code, explanations, hints, and **published** examples are student-facing. Browser Run/Check and self-reported Unity work are practice, not verified server grades. Real points come from trusted assessed submission records; highest verified scores and positive weekly improvements must survive revisions.
5. **Keep solutions and private tests out of public bundles.** A GitHub repo being private is not enough if a static-site build copies all its files. Use explicit file allowlists and keep secret/test access in privileged backend workers. A public repo may already contain reference solutions or teacher keys for formative material—**do not assume they are protected secrets** or copy them into the public React bundle. Protect any new confidential assessment on the server.
6. **Respect licensing.** Use original instructional prose and examples or clearly license/attribute appropriately. CS1's [CURRICULUM_SOURCES.md](https://github.com/mswhitby/computer-science-1/blob/main/CURRICULUM_SOURCES.md) documents reuse restrictions. Unity pathway and UIL topic lists can be linked; don't copy proprietary Unity course tests, UIL A+ materials or protected source content.
7. **Keep Markdown readable in GitHub and in the app.** Lesson prose belongs in `.md`, not giant JSON strings. Preserve inline code, fenced code, lists, tables, expandable `<details>` hints when used, and Learn pagination headings. Test actual long titles and embedded code. Do not overwrite student drafts in a UI migration.
8. **Don't infer assignment eligibility from catalog metadata.** Cross-course challenge `suggestedCourses` is a recommendation, not an assignment; check **all** prerequisites and whether the class has covered them. Whole-section/selected-student assignments and due dates belong to the authenticated, section-scoped backend—not hardcoded into lesson Markdown.
9. **Never commit student identifiers, contact information, Google Sheets URLs or access tokens, grades, OAuth secrets or privileged answer keys to public course or website repos.** TSI teacher source is public formative material; it does not implement access-controlled assessment.

## Per-repository development and validation

### 1. Computer Science I — `mswhitby/computer-science-1`

- **Authoring:** Source lesson Markdown is under `units/`; the ordered catalogs are `docs/units/data-01.js` through `data-10.js` (inspect what currently exists). Entries include nested IDs such as `02-values-and-variables/01-meet-variables`, `unit`, `unitName`, `title`, `mode` (`script` or `function`), `starter`, public `cases`, `points`, `hints` and relative `markdown` paths. Old Unit 01 draft/pass keys are part of compatibility.
- **Course work:** Some exercises have `practice/<lesson>/main.py` for fork/PR submission. Older `challenges/` and `docs/challenges/data-*.js` are a **legacy Python-specific challenge track**, distinct from the private multi-language shared bank. See the source repo's `SUBMITTING.md` before changing the student workflow.
- **Packaging:** Main Playground runs `node scripts/package-python.mjs ../computer-science-1 dist/data/computer-science-1`, discovering `docs/units/data-XX.js` and copying actual `units/` Markdown and `docs/python-worker.js`. Archived activities remain in the package but disappear from active navigation.
- **Validation:** Use the course's graders where applicable, then from main Playground run `node --test tests/python.test.mjs tests/course-navigation.test.mjs` and `node scripts/package-python.mjs ../computer-science-1 /tmp/playground-python-package`. If updating a legacy Markdown mirror, use the source repository's `scripts/publish-markdown.py` rather than editing generated copies manually.
- **Change discipline:** Update source Markdown + metadata and preserve the `id`/points for existing graded lessons; use a fresh ID when the assessed contract changes.

### 2. Game Programming — `mswhitby/game-programming`

- **Manifest:** `course.json` defines **7 units**, lesson IDs, prerequisites, skills, Unity Learn links, C# exercise function names/signatures, published examples and checkpoint quizzes. `lessons/*.md` is normal prose; `exercises/<lesson>/Program.cs` supplies starters.
- **C# practices are console programs**, not UnityEngine scripts. A method returns a value, and `Main` can print a demonstration. Do not add Unity APIs to a browser console checker or conflate Unity tasks/self-reports with verified graded submissions.
- **Unity alignment:** The six Essentials missions plus Junior Programmer introduction are **original companions**. Keep official pathway links and verify version changes rather than copying official quiz content or claiming pathway completion.
- **Validation:** Check `course.json` references and matching `.md`/`.cs` files. Run `node scripts/validate.mjs ../game-programming/course.json` **from main Playground** and its relevant build/runtime tests; the course repo also has a `.github/workflows/check.yml` and `scripts/grade.py` for published C# cases.

### 3. Mobile App & Web — `mswhitby/mobile-app-dev`

- **Lessons:** `course.json` lists HTML, CSS, JavaScript and React competencies with paths to `lessons/<competency>/lesson.md` and adjacent source starters. Keep prose Markdown-readable and avoid replacing it with an opaque JSON lesson body.
- **Projects are a separate collection**, **not** regular lessons. `projects/club-connect/`, `projects/bracket-challenge/` and `projects/component-studio/` contain guided steps, code starters and examples. Multiple steps of one project can share a **single persisted student source draft**; don't reset it between steps or casually renumber published project-step IDs.
- **Exercise scope:** Browser preview/checks are observable formative feedback, not verified back-end grades. Sample signup, tournament and leaderboard data are fictional; do not introduce real personal-data collection without explicit backend/security work.
- **Validation:** Ensure `course.json` paths resolve to every referenced Markdown, starter and example. Test project state persistence and step order using the main Playground's browser/build tests before publishing.

### 4. UIL — `mswhitby/uil`

- **Manifest and files:** `course.json` lists written practice and 6 programming activities. Prose is `lessons/*.md`; Java starters are `programming/*.java`; original written practice and explanations are `practice/written-01.json` (38 multiple-choice and 2 discrete-answer questions per source README).
- **Compatibility:** The browser Java runtime is a practice tool, not a complete Java 26 contest IDE. Use a Java 26 environment for contest-specific file/library preparation. Some activities require file handling beyond browser support.
- **Rights:** Use original practice and publicly provided UIL references/topic lists. **No A+ materials** in the public repository/site.
- **Validation:** Ensure the written-question references and program class names/starter file paths match `course.json`; run the main Playground's Java-runtime prep, build and tests.

### 5. TSI Math — `mswhitby/TSI`

- **Canonical authoring:** The first week's lessons and exercises are authored in `content/week-01-student.json` plus `teachers/week-01/answers.json`; `course.json` defines stable week/session IDs, order and 30-minute lesson timing. `lessons/week-01/*.md` and `print/week-01-student-packet.html` are generated output.
- **Use the generator**, not manual edits to generated files: from TSI run `python3 scripts/build.py` and `python3 scripts/validate.py`. Source also provides facilitator guides and resource-provenance metadata.
- **Main Playground:** `scripts/package_tsi.py` packages matching content/key material into the **open demo**, with a pinned fallback in `public/data/tsi-math/`. Keep student/key snapshot versions paired. This is formative and not the planned protected TSI roster, login or counselor reporting system.
- **Privacy:** The TSI authoring repo is public and includes teacher keys; they are not access-controlled assessment secrets. Don't include real student progress, retest scores, names or credentials in the repository. Don't present browser self-check as a validated TSIA2 prediction.

### 6. Shared challenge bank — **private** `mswhitby/challenges`

- **Canonical bank:** `catalog.json` indexes language-neutral problems, supported languages (Python, Java, JavaScript, C#), skill tags, prerequisites, difficulty and points. Each `problems/<id>/` has student-safe `problem.md`, `config.json`, `examples.json` and `starters/`.
- **Never publish** `solutions/`, `tests/hidden.json`, hidden grading contracts or any privileged credentials. A static build may package only the **explicitly approved** statement, metadata, visible examples and starters. The React design lab uses its own preview snapshot; it should not fetch private bank contents from the browser.
- **Validate:** In the challenge repo run `node scripts/validate.mjs`. For privileged grader integration also run `python scripts/verify_private.py` and the main Playground's grading tests/isolation smoke checks. Read [shared-challenge-grading.md](shared-challenge-grading.md): **production queueing of shared-bank activity IDs and cross-language trusted server grading are not yet fully activated**. Do not present browser demo Run/Check as production scoring.
- **Secure checkout:** An authorized CI build/worker may read the private repo with a **read-only repository-scoped credential**; never expose that credential in static code or course metadata. Course suggestions do not imply readiness or assignment.

## How to publish any curriculum revision

1. **Locate the owning course repo.** Read that repo's latest `README.md`, `course.json` / catalog and related `AGENTS.md` if present; check tests and published IDs. Write new Markdown and matching metadata there.
2. **Validate in the content repo.** Check all linked files, starter language, published checks, difficulty/prerequisites, copyright and exposure of solutions/keys.
3. **Build and test the central app** from sibling source checkouts: `cd playground`; run `npm ci && npm run build:ui`, `node --test tests/*.test.mjs`, and `python scripts/build.py --game-source ../game-programming --mobile-source ../mobile-app-dev --uil-source ../uil --python-source ../computer-science-1 --tsi-source ../TSI` **if the local TSI source exists**. Otherwise use the build's configured TSI fallback; inspect current build options first. For browser/runtime/grading changes run additional checks in `.github/workflows/build.yml`.
4. **Review generated artifact.** Verify `dist/data/<course>/`, updated titles/ordering, Markdown rendering, public/private allowlists, archived visibility, saved drafts/IDs, and `content-sources.json` source provenance. Never copy private tests or solutions to `dist/`.
5. **Review and approve release.** Use PRs for changes and do **not** publish to students without user approval. Production releases publish the tested main `playground` build artifact to `mswhitby/classroom/playground/`. The React Design Lab can be updated at `/playground/preview/` independently and is not a substitute for production integration.
6. **Update the canonical handoff**: `mswhitby/playground/docs/HANDOFF.md` with what changed, source commits, tests, where published (if anywhere), compatibility concerns, and next step.

## Fast decision guide

- **New lesson or revised instructional wording:** Edit course repo Markdown + manifest; package in central app.
- **Change editor, course screens, student dashboard, teacher auth, grading or layout:** Edit `mswhitby/playground` (React prototype only if specifically reviewing a design).
- **New reusable challenge in multiple languages:** Author in private `mswhitby/challenges`; package only public files, check all prerequisites, keep grading confidential.
- **Rename unit/lesson label:** Edit the source title, not its stable ID; test links, progress and historical grades.
- **Retire a graded lesson:** Archive rather than delete; preserve history and original contract.
- **Publish a redesign:** Review React implementation, integrate approved elements into `mswhitby/playground`, build/test, then publish via `classroom` only with authorization.
