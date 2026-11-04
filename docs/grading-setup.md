# Activate submitted grades

The website deployment alone cannot activate server-side grading. These two setup steps require access to the existing Supabase project and GitHub repository settings. Do not paste server keys into chat, browser code, or a committed file.

1. In the existing Supabase project's SQL Editor, run `supabase/migrations/202611030007_grades.sql` after the classroom setup. It adds a protected grading queue and results table. Existing immutable Python hand-ins are queued for grading; drafts and public checks are excluded.
2. In **mswhitby/playground → Settings → Secrets and variables → Actions**, save the existing project's **service_role** key as `SUPABASE_SERVICE_ROLE_KEY`. Keep this key server-side. Run **Actions → Grade Playground hand-ins → Run workflow** once to verify activation.

The worker processes up to 60 snapshots per run, claiming one at a time for up to seven minutes. It runs every five minutes; GitHub may delay scheduled runs. Submit therefore displays **Grading…** until the worker finishes. The current page keeps checking while the activity stays open (up to about 14 minutes); reopening the activity, Challenges, or Grades loads the stored grade. Receipt IDs remain internal. Old submissions are graded gradually in timestamp order.

Python challenge results use the existing grader test set pinned at `75f2d50ab64bd9552aeb2008f83ad5b456c63394` in `mswhitby/python_problems_20261026`. These tests are omitted from the browser bundle but live in a public GitHub branch, so they are not confidential. Lessons use their authored published cases, labeled `published_tests`. This release does not invent hidden lesson tests or grade the C#, web, or Java courses. Unsupported work displays **Not graded**, never a fabricated zero.

The parent worker holds the database credential and expected answers. Each case runs student code inside a disposable container with no network, no credentials, a read-only source mount, an unprivileged user, and CPU, memory, process, output, and wall-time limits. The parent compares actual returned values with the trusted expectations. No student-controlled pass/fail flag is accepted. Infrastructure failures become **Needs review**, not a score of zero.

Students can read only their own grade columns and cannot insert or change grades. Queue claiming and grade completion are service-role-only RPCs with expiring leases. A newer edit or public check cannot alter a submitted snapshot or its grade. The Grades page shows the latest submitted version per activity; older snapshots remain stored.

Verification: `python3 -m unittest discover -s grading -p 'test_*.py'`; `python3 grading/smoke_isolation.py` requires Docker. `npm run test:database` verifies ownership, write denial, queue leasing, and score calculation. The source CI runs the real container checks before publication.
