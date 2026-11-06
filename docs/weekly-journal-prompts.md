# Publish the weekly journal prompt

Keep prompts in Playground, next to the submission page. Students should not have to locate a separate handout or upload a prompt themselves. This first workflow uses a reviewed content file; it does not add a teacher editor or file uploads.

1. Open `public/data/journal-prompts.json` in GitHub and choose Edit. Use a new branch and pull request.
2. Add an entry to `prompts` using the example below. Select the course and Monday date for the journal week in America/Chicago. The prompt is course-wide: use this workflow when every section of that course receives the same prompt.
3. Write your actual prompt in `body`. Include response expectations, any required evidence, and due-date instructions. Plain text and line breaks display literally; HTML is not executed. Do not put answer keys, private information, or student writing here: published prompts are public website content.
4. Preview the submission page for that course/week. Verify wording and week selection. Publish through the normal reviewed site release after approval.
5. For corrections, retain the id and increment revision. Each hand-in includes `journal-prompt.json` with the complete prompt text and revision the student saw. Existing submissions remain unchanged.

Example structure (illustration only; no prompt is pre-published):

```json
{
  "schemaVersion": 1,
  "prompts": [
    {
      "id": "mobile-2026-11-02",
      "revision": 1,
      "course": "mobile-app-dev",
      "week": "2026-11-02",
      "title": "Your teacher-authored title",
      "body": "Replace this with your journal question.\nAdd your response expectations here."
    }
  ]
}
```

Missing or unavailable prompts allow drafting but prevent hand-in, with an explanation on the page. Students can still save writing while the teacher publishes. A page already open retains the prompt it displayed, and submits that version; reload to see a revision. The server's existing course-scoped submission permissions still control hand-ins; prompt snapshots are contextual evidence, not a server-verified assignment record.

This PR depends on the existing weekly journals PR #21 and targets its branch. No live migration is needed for prompts. A later in-app editor should support class/teacher-specific prompts, drafts and publish controls, server-enforced ownership, and immutable published revisions. Do not simulate those permissions with browser storage.
