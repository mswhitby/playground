# Python course updates, archiving and score preservation

The Python curriculum lives in `mswhitby/computer-science-1`. The shared Playground packages that course's lesson catalogs and Markdown at build time. The build now discovers all unit data files (not just the original six).

## Rules for published activities

- A published lesson's `id` must never be renamed, recycled or removed from the packaged catalog while student history exists. The persisted activity is `computer-science-1` + `lesson:<id>`.
- Keep the authored Markdown and original point value so archived lesson links and historical grades remain intelligible.
- To retire a lesson, mark `"status": "archived"` in its `docs/units/data-XX.js` entry. This hides it from active lessons, unit navigation and next/previous links. A direct link remains reviewable, but no longer accepts hand-ins.
- To materially change an assessed task, publish a **new** lesson with a **new ID**. Don't silently replace grading examples for a published activity.
- Submission history, grade rows and weekly-earnings SQL must remain independent of the active catalog. Never delete rows when content is retired.
- The *highest verified* grade for an activity is shown to students even if a later attempt is worse or ungraded. Weekly awarded points already use positive increments from previous high grades and are calculated from stored records.
- Do not assume a passing public example is an authoritative grade. Only server-assessed submissions contribute verified points.
- Archived content remains in the generated `course.json` and `units/` directory for review and audit.

## Local verification

From sibling checkouts of `playground` and `computer-science-1`:

```bash
cd playground
node --test tests/python.test.mjs tests/course-navigation.test.mjs
node scripts/package-python.mjs ../computer-science-1 /tmp/playground-python-package
```

For an archive regression test, mark one existing lesson `status: "archived"`, rebuild, check that it vanishes from the active list while remaining addressable by its original ID, and verify that its existing graded submission is still visible under Grades and the teacher assignment history. No migration or mass update of students is necessary.
