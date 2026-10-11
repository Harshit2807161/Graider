"""Run the CBSE Class X Science 2025 paper through a running Gr8r and save what it produced.

    cd backend && python ../docs/evals/cbse-x-science-2025/run.py --email admin@example.com

Creates an exam with the 51 questions in questions.json, waits for the rubrics, uploads the
answer book, waits for grading, and writes review.json and results.csv to runs/<name>/.
It makes paid model calls (about $0.30 with the models in the README). The USD cap only works
if the server has a price for its models: see "Run it yourself" in the README.
"""

import argparse
import csv
import getpass
import json
import os
import sys
import time
from collections import Counter
from datetime import datetime
from pathlib import Path

import httpx

HERE = Path(__file__).resolve().parent
ORG_SLUG = "cbse-demo"
ACTIVE = {"pending", "processing"}


def check(response: httpx.Response) -> httpx.Response:
    if response.status_code >= 400:
        sys.exit(f"{response.request.method} {response.request.url.path} -> {response.status_code}: {response.text[:300]}")
    return response


def find_org(api: httpx.Client, org_id: str | None) -> str:
    if org_id:
        return org_id
    for org in check(api.get("/orgs/")).json():
        if org["slug"] == ORG_SLUG:
            return org["id"]
    body = {"name": "CBSE Demo School", "slug": ORG_SLUG, "description": "Real CBSE board papers for evaluation"}
    return check(api.post("/orgs/", json=body)).json()["id"]  # needs a superuser; otherwise pass --org-id


def rubric_statuses(api: httpx.Client, exam_id: str) -> list[dict]:
    return check(api.get(f"/exams/{exam_id}/rubric-status")).json()


def wait_for_rubrics(api: httpx.Client, exam_id: str, timeout_s: int) -> list[dict]:
    deadline = time.monotonic() + timeout_s
    while True:
        rows = rubric_statuses(api, exam_id)
        if not any(r["rubric_status"] == "pending" for r in rows) or time.monotonic() > deadline:
            return rows
        time.sleep(4)


def results_rows(review: dict) -> list[list]:
    rows = [["label", "max_marks", "score", "status", "counted", "escalation_reason", "evaluator_rounds",
             "transcription_confidence", "transcript_chars"]]
    for q in review["questions"]:
        grade, transcription = q.get("grade") or {}, q.get("transcription") or {}
        rows.append([q["label"], q["max_score"], grade.get("score"), grade.get("status"), grade.get("counted"),
                     grade.get("escalation_reason") or "", len(grade.get("rounds") or []),
                     transcription.get("confidence"), len(transcription.get("text") or "")])
    return rows


def compare(rows: list[list], baseline: Path) -> None:
    """Parts whose score or status differs from an earlier run's results.csv."""
    old = {r["label"]: r for r in csv.DictReader(baseline.open())}
    changed = []
    for label, _, score, status, *_ in rows[1:]:
        before = old.get(label)
        new_score = "" if score is None else str(float(score))
        if before and (before["score"], before["status"]) != (new_score, status):
            changed.append((label, before["score"] or "-", before["status"], new_score or "-", status))
    print(f"\nCompared with {baseline.parent.name}: {len(changed)} of {len(rows) - 1} parts differ")
    for label, old_score, old_status, new_score, new_status in changed:
        print(f"  {label:>10}  {old_score} {old_status}  ->  {new_score} {new_status}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api", default=os.environ.get("GR8R_API", "http://localhost:8000/api/v1"))
    parser.add_argument("--email", default=os.environ.get("GR8R_EMAIL"), required="GR8R_EMAIL" not in os.environ)
    parser.add_argument("--org-id", help=f"organization to use (default: find or create '{ORG_SLUG}')")
    parser.add_argument("--name", default=datetime.now().strftime("%Y-%m-%d-%H%M"), help="folder name under runs/")
    parser.add_argument("--baseline", default="2026-10-11-gpt-4.1-mini", help="earlier run under runs/ to compare with")
    parser.add_argument("--yes", action="store_true", help="don't ask before making paid model calls")
    args = parser.parse_args()
    password = os.environ.get("GR8R_PASSWORD") or getpass.getpass(f"Password for {args.email}: ")

    exam_spec = json.loads((HERE / "questions.json").read_text())
    answer_book = HERE / "papers" / "answer_book.pdf"
    out = HERE / "runs" / args.name
    if out.exists():
        sys.exit(f"{out} already exists; pick another --name")
    if not args.yes and input("This makes paid model calls (about $0.30 on gpt-4.1-mini + gpt-4.1). Continue? [y/N] ").lower() != "y":
        sys.exit("Stopped.")

    with httpx.Client(base_url=args.api, timeout=120) as api:
        token = check(api.post("/auth/login", data={"username": args.email, "password": password})).json()["access_token"]
        api.headers["Authorization"] = f"Bearer {token}"

        org_id = find_org(api, args.org_id)
        exam = check(api.post("/exams/", json={
            "name": f"CBSE Class X Science 2025, set 31/1/3 ({args.name})", "org_id": org_id,
            "description": "Board exam 2025 (086), official marking scheme, a CBSE-published candidate answer book.",
            "config": {"choice_groups": exam_spec["choice_groups"], "choice_policy": "best"},
        })).json()
        print(f"exam {exam['id']}")

        questions = [
            {"question_text": q["text"], "order_index": i, "max_score": q["marks"], "rubric_criteria": q["rubric"],
             "question_type": q["type"], "label": q["label"], "printed_label": q["label"],
             "choice_group": q.get("choice_group")}
            for i, q in enumerate(exam_spec["questions"])
        ]
        check(api.post(f"/exams/{exam['id']}/questions", json=questions))
        labels = [q["label"] for q in exam_spec["questions"]]  # rubric-status reports Q1..Qn, in order

        rows = wait_for_rubrics(api, exam["id"], 600)
        for _ in range(2):  # a small parser model miscounts marks now and then; a fresh parse usually fixes it
            bad = [r for r in rows if r["rubric_status"] in ("invalid", "error")]
            if not bad:
                break
            for r in bad:
                check(api.post(f"/exams/{exam['id']}/questions/{r['question_id']}/rubric-spec/reparse"))
            time.sleep(3)
            rows = wait_for_rubrics(api, exam["id"], 300)
        print("rubrics:", dict(Counter(r["rubric_status"] for r in rows)))
        not_ready = [(labels[i], r["rubric_status"], r["validation_errors"] or r["rubric_error"])
                     for i, r in enumerate(rows) if r["rubric_status"] != "ready"]
        for label, status, why in not_ready:
            print(f"  {label}: {status} {why}  (will be escalated as rubric_invalid; fix it on the exam page to grade it)")

        with answer_book.open("rb") as f:
            submission = check(api.post(f"/exams/{exam['id']}/submissions",
                                        files={"file": (answer_book.name, f, "application/pdf")})).json()
        print(f"submission {submission['id']}: grading", end="", flush=True)
        while (state := check(api.get(f"/submissions/{submission['id']}")).json())["status"].lower() in ACTIVE:
            print(".", end="", flush=True)
            time.sleep(5)
        print(f" {state['status']}")
        if state["status"].lower() == "failed":
            sys.exit(f"Grading failed: {state.get('error_message') or state.get('current_step')}")

        review = check(api.get(f"/submissions/{submission['id']}/review")).json()
        timeline = check(api.get(f"/submissions/{submission['id']}/timeline")).json()

    run = next((e["data"] for e in timeline if e["type"] == "run"), {})
    calls = Counter((e["data"]["purpose"], e["data"]["model_requested"]) for e in timeline if e["type"] == "llm_call")
    rows = results_rows(review)
    out.mkdir(parents=True)
    (out / "review.json").write_text(json.dumps(review, ensure_ascii=False, indent=1))
    with (out / "results.csv").open("w", newline="") as f:
        csv.writer(f).writerows(rows)
    summary = {
        "status": state["status"], "total_score": state.get("total_score"), "max_score": state.get("max_score"),
        "parts": dict(Counter(r[3] for r in rows[1:])),
        "escalations": dict(Counter(r[5] for r in rows[1:] if r[5])),
        "rubrics_not_ready": [label for label, _, _ in not_ready],
        "grading_run": {k: run.get(k) for k in ("llm_calls", "cost_usd", "started_at", "finished_at")},
        "calls": {f"{purpose} ({model})": n for (purpose, model), n in sorted(calls.items())},
    }
    (out / "summary.json").write_text(json.dumps(summary, indent=1))
    print(json.dumps(summary, indent=1))
    print(f"\nSaved to {out}. Review it in the app: /dashboard/exams/{exam['id']}/submissions/{submission['id']}")

    baseline = HERE / "runs" / args.baseline / "results.csv"
    if baseline.exists():
        compare(rows, baseline)


if __name__ == "__main__":
    main()
