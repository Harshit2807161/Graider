# Side-by-side transcript correction (M7 backlog)

## Done
- `TranscriptDialog` takes optional `submissionId`, `pages`, `currentPage`. With pages it opens as an
  `xl` modal (new `Modal` size, 76rem) with the page viewer on the left and the transcript + reason
  form on the right; the save flow (`onSubmit(text, reason)` -> PATCH transcript) is unchanged.
- Opens at the first page the answer's segments came from (`q.transcription.segments[].page`);
  buttons jump between those pages. If none are known it opens at the page the review screen was
  showing, with a note saying so.
- Two columns from 64rem up (CSS grid, sticky image column); stacked below that. Design tokens only.
- The review screen (`app/dashboard/exams/[id]/submissions/[submissionId]/page.tsx`) passes the pages.

## Remaining
- "Viewer follows the answer being read" on the main review screen (scrolling the answer list moves
  the page viewer) is not done; only the dialog follows its own answer.
- No visual check in a browser was done (no API calls allowed in this task).

## How to test
- `cd frontend && npx tsc --noEmit && npm run lint` (both pass).
- Manually: open a graded submission, "Correct transcript" on an answer: the page image of that
  answer is shown left; resize below 1024px and it stacks; save still regrades.
