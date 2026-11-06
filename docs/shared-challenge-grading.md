# Shared challenge bank: preview and private grading

## Current state

The shared bank contains ten original problems, with Python, Java, JavaScript, and C# starter code, private reference solutions, and private grading tests in `mswhitby/challenges`. The standalone demo lives at:

https://www.mswhitby.com/playground/preview/challenges.html

The demo uses *only* the allowlisted public catalog, problem Markdown, and visible examples copied into `mswhitby/classroom/playground/preview/`. It runs practice checks in the browser and keeps demo hand-ins in memory. It does not write real submissions or verified grades. Do not include `solutions/`, `tests/hidden.json`, private tokens, or grading inputs in the static site.

## Existing grading

`grading/worker.py` now recognizes `challenge:shared-<challenge-id>` and reads `config.json` and `tests/hidden.json` **inside the trusted grading runner** through `GRADER_SHARED_DIR`. It uses a Python `main.py` submitted snapshot, calls the exact function declared in the private bank's Python signature, compares encoded return values in the trusted parent, and assigns points using the private problem's configured point value. Existing Computer Science I Python submissions are unaffected.

The GitHub grading workflow supports a private checkout pinned to `69ce52fc851a91545075724c9b0290db7bf6fef6`. To activate that checkout, add an Actions secret named `CHALLENGES_READ_TOKEN` in `mswhitby/playground`, containing a fine-grained GitHub token with **read-only Contents** access to **only** `mswhitby/challenges`. Do not put tokens or solutions in any public frontend files.

## Not yet activated

The database currently enqueues the older Computer Science I lessons/challenges. Shared bank activity IDs have not been added to the production queue. This is deliberate while preview testing and private checkout access are being finalized. Real submissions should use activity IDs of the form `challenge:shared-temperature-alert`, for example, with `activity_kind = 'challenge'` and `files = {"main.py": "<student code>"}` for Python. This is different from the demo hand-in.

Once the private token works and the Python server grader has passed its isolated tests in CI, extend `playground_private.enqueue_grade()` to enqueue only supported shared-bank Python snapshot activity IDs across approved courses. Keep the explicit student confirmation and append-only snapshot model. Do **not** queue Java, JavaScript, or C# as verified grades yet: their secure server execution is not implemented. Their *browser example checks* are practice feedback only.

## Validation and deployment

- CI: `python3 -m unittest discover -s grading -p 'test_*.py'`; check container isolation with `python3 grading/smoke_isolation.py`.
- Private bank: `python scripts/verify_private.py` on the bank checkout.
- Preview: test all four languages using the standalone page; only published examples are available, not the private grading tests.
- Review exact names, outputs, console errors, reset, and demo history. Verify production `/playground/` remains unchanged.

The eventual production build needs to package **only** `catalog.json`, `problem.md`, `config.json`, `examples.json`, and `starters/` from the shared bank; never copy the entire private repository into a public artifact.
