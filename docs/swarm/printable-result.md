# Printable graded copy (student result page)
Done: Print button (window.print) on /dashboard/results/[submissionId]; @media print in results.module.css and globals.css (hides sidebar, nav, buttons; black on white; exam name, student, total, per-question marks and feedback; each answer-sheet page image on its own page via break-before).
Remaining: none known; visual check in a real browser print preview.
Test: npx tsc --noEmit && npm run lint; open a published result, click Print (or Ctrl+P).
