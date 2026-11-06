# Classroom improvements for review

These changes belong on review branches. They do not deploy a website, merge content, or alter the independent `mswhitby/playground-react` Design Lab.

## Findings

- The [PlayerController reference](https://github.com/mswhitby/game-programming/blob/sample-lessons/samples/PlayerController.md) explains additions in order and shows the complete cumulative script after each step. The former bracket starter instead supplied the entire page, data, event listeners, and unfinished advanced functions.
- The TSI authoring repository and bundled snapshot provide one five-day week with 50 original practice questions, covering percents and linear relationships. They do not provide a broad intake diagnostic or full prep for nonlinear algebra, geometry, or statistics.
- Weekly journals exist in [Playground PR #21](https://github.com/mswhitby/playground/pull/21), not main. That page tells students to get the prompt in class. The prompt extension targets that existing branch and uses its course-scoped, append-only submission flow.
- Mobile App & Web already packages markdown projects, a shared editable index.html draft, runnable previews, and advisory behavior checks. Reuse those tools for Component Studio rather than creating a separate classroom platform.

## Proposed implementation

The math page adds 24 questions across six skills with explicit Not sure responses. Grouping is by skill, not total score. 0–2 of four suggests guided prep; 3–4 suggests a deeper teacher check. This is a pilot instructional heuristic, not validated TSI placement. Plans include worked examples, existing lesson links where available, and explicit gaps where full lessons are not published. First and latest attempts stay separate and can be downloaded; no roster or automatic grade is created.

The mobile content branch replaces the bracket starter with an empty file and ten cumulative checkpoints: HTML document, visible page, CSS, data, matchup functions, rendering, winner events, scoring, leaderboard, and testing. Every lesson shows the entire current file with expected output and troubleshooting. Existing six step IDs remain so older links still resolve; students should begin the new sequence at Create your first HTML file. An existing saved bracket draft is retained; students who want to start over use Reset after downloading a backup.

Component Studio adds two teacher-run modes: anonymous design comparison/vote or assigned component checkout. Both use an explicit contract, issue owner/reviewer, isolated demo, scoped styles, peer feedback, and teacher-approved integration PR. Event-card checks exercise save/unsave and two independent instances. Planning and peer review receive no automatic passing score. GitHub assignments and the teacher's ballot are the workflow records; no live voting or checkout service is claimed.

The journal extension loads teacher-authored prompts by course and Monday from a versioned JSON file. It displays the prompt above writing, allows drafts when a prompt is absent, blocks hand-in when absent or unavailable, and includes the displayed prompt revision/text in each submission. The file starts empty because the teacher has not supplied an actual prompt. Publishing uses a branch/PR and the existing site release. It is course-wide, public prompt content, not a class-specific teacher editor.

## Recommended rollout

1. Review and merge Playground project-check support before the new mobile course sequence. The UI support works with the old six steps; the reverse order would introduce unknown checkpoints.
2. Review TSI content and the matching Playground diagnostic snapshot together. The normal build uses the reviewed local snapshot; `--tsi-source` refreshes it from the authoring checkout.
3. Merge or rebase the journal prompt extension with PR #21, then publish the teacher's first real prompt before assigning a journal hand-in.
4. Pilot the diagnostic and the first component with one class. Review written mathematical reasoning and unfamiliar follow-up questions before grouping students. Give credit for component testing and revisions, regardless of voting outcome.
5. Build missing math prep next. Add server-owned, class-specific journal drafts and publishing when multiple teachers/sections need distinct prompts. Keep the React Design Lab in its own repository and release path.

## Validation and limits

The shared site packages successfully with the local mobile and TSI sources. All 100 shared Playground tests and all six focused journal tests passed. A DOM execution check passed all ten full-file bracket checkpoints, event-card toggling/independence, and missing/offline prompt behavior with a copied prompt revision. The in-app browser verified diagnostic incomplete-answer handling, correct scoring, separate first/latest results, reload persistence, and desktop rendering.

The standalone Playwright browser runner could not launch Chrome in this environment. `scripts/smoke-classroom-improvements.mjs` is supplied for a machine with a supported Playwright Chromium installation; it verifies cumulative code samples and phone/desktop layouts. Full automated responsive browser testing remains to be run there. No live student records, database schemas, production deployment, or Design Lab files were changed.
