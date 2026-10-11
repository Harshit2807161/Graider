"""Build the exam's questions (English text + official marking scheme) from the PDFs' text layers.

    python build_questions.py papers/question_paper.pdf papers/marking_scheme.pdf questions.json

One gradable question per top-level number (1-39); internal choices ("OR") stay inside the
question, so the rubric carries both alternatives. Marks follow the paper's sections.
"""
import json
import re
import sys

import pypdfium2 as pdfium

SYMBOLS = {"": "×", "": "·", "": "⇒", "": "∴", "": "Ω", "": "→", "": "°"}

def pages(path):
    doc = pdfium.PdfDocument(path)
    out = []
    for i in range(len(doc)):
        t = doc[i].get_textpage().get_text_range().replace("\r", "")
        for k, v in SYMBOLS.items():
            t = t.replace(k, v)
        out.append("".join(ch for ch in t if ch == "\n" or ch == "\t" or ord(ch) >= 32 and not 0xE000 <= ord(ch) <= 0xF8FF))
    return out

def ascii_share(t):
    return sum(c.isascii() for c in t) / max(len(t), 1)

def split_numbered(text, last, pattern):
    """Cut text at question numbers 1..last, accepted only in increasing order."""
    marks, want = [], 1
    for m in re.finditer(pattern, text, flags=re.MULTILINE):
        if int(m.group(1)) == want:
            marks.append((want, m.start(), m.end()))
            want += 1
            if want > last:
                break
    return {n: text[e:(marks[i + 1][1] if i + 1 < len(marks) else len(text))].strip() for i, (n, s, e) in enumerate(marks)}

def marks_for(n):
    return 1 if n <= 20 else 2 if n <= 26 else 3 if n <= 33 else 5 if n <= 36 else 4

def clean(t):
    t = re.sub(r"Page \d+ of \d+\s*X_086_ ?31/1/3", "", t)
    t = re.sub(r"\n31/1/3\s.*?P\.T\.O\.", "\n", t)  # question paper footer
    t = re.sub(r"[ \t]+", " ", t)
    return re.sub(r"\n\s*\n+", "\n", t).strip()

HALF = "½"

def tidy_question(t):
    t = re.split(r"\n\*31/1/3\*|\nSECTION [A-E]\b", t)[0] if not re.search(r"\n\*31/1/3\*.*\n\*ECNEICS\*\n\(", t) else re.sub(r"\n\*31/1/3\*.*\n\*ECNEICS\*", "", t)
    t = re.split(r"\n\s*SECTION [A-E]\b", t)[0]
    return re.sub(r"\s+\d(\s+\d)?\s*$", "", t.strip())  # printed marks at the end

def value(tok):
    """'½' -> 0.5, '1½'/'1 ½' -> 1.5, '½×4' -> 2.0"""
    m = re.fullmatch(r"(\d+)?\s*(½)?(?:\s*[×x]\s*(\d+))?", tok.strip())
    if not m or not (m.group(1) or m.group(2)):
        return None
    return (int(m.group(1) or 0) + (0.5 if m.group(2) else 0)) * int(m.group(3) or 1)

def split_scheme(t, total):
    """The scheme's text, and its marks column (the bare numbers at the end, minus the total)."""
    t = re.split(r"\n\s*SECTION [A-E]\b", t)[0].strip()
    lines = t.split("\n")
    col = []
    while lines and re.fullmatch(r"[\d½×x,\s]+", lines[-1]) and lines[-1].strip():
        col.insert(0, lines.pop().strip())
    tokens = [x for line in col for x in re.split(r"\s*,\s*", line)]
    if tokens:  # the last number is the question's total, sometimes after a mark on the same line
        last = tokens.pop()
        head = re.sub(rf"\s*{total}\s*$", "", last).strip()
        if head:
            tokens.append(head)
    values = [value(x) for x in tokens]
    return "\n".join(lines).strip(), (values if values and None not in values else None)

def take(values, target):
    """Leading marks that add up to target, and the rest (None if they don't fit)."""
    acc = 0.0
    for i, v in enumerate(values or []):
        acc += v
        if abs(acc - target) < 1e-9:
            return values[: i + 1], values[i + 1 :]
        if acc > target:
            break
    return None, values

def fmt(v):
    return (str(int(v)) if v >= 1 and v == int(v) else (str(int(v)) if int(v) else "") + HALF) if v else "0"

def rubric_text(body, col, total):
    marks = f"\nMarks for the points above, in order: {', '.join(fmt(v) for v in col)}." if col else ""
    return f"Official CBSE marking scheme. Maximum marks: {total}.\n{body}{marks}"

def cut(t, pattern):
    m = re.search(pattern, t, flags=re.MULTILINE)
    return (t[: m.start()].strip(), t[m.end():].strip()) if m else (t, None)

OR = r"^\s*OR\s*$"
ASSERTION = ("\nChoose: (A) Both A and R are true and R is the correct explanation of A. (B) Both are true, but R is not "
             "the correct explanation of A. (C) A is true, but R is false. (D) A is false, but R is true.")


def build(qp, ms):
    """Questions and choice groups from the question paper and marking scheme PDFs."""
    english = "\n".join(p for p in pages(qp) if ascii_share(p) > 0.9 and re.search(r"^\s*\d{1,2}\.\s", p, flags=re.MULTILINE))
    questions = split_numbered(english, 39, r"^\s*(\d{1,2})\.[ \t]")
    # Scheme rows: "7 D / 1 : 8" for the MCQs, then "22.\n(a)" (number, dot, any whitespace)
    scheme = split_numbered("\n".join(pages(ms)), 39, r"^\s*(\d{1,2})(?:\.\s|[ \t](?=[A-D] /))")
    out, groups = [], []
    for n in range(1, 40):
        total = marks_for(n)
        text = tidy_question(clean(questions[n])) + (ASSERTION if 17 <= n <= 20 else "")
        body, col = split_scheme(clean(scheme[n]), total)
        kind = "mcq" if n <= 20 else "descriptive"
        first_t, second_t = cut(text, OR)
        first_r, second_r = cut(body, OR)
        if second_t is None or second_r is None:  # no internal choice
            out.append({"label": str(n), "text": text, "rubric": rubric_text(body, col, total), "marks": total, "type": kind})
            continue
        if n >= 37:  # case study: (a) and (b) for everyone, then (c)(i) OR (c)(ii)
            passage_ab, c1 = cut(first_t, r"^(?=\(c\))")
            passage = cut(passage_ab, r"^(?=\(a\))")[0]
            rub_ab, rub_c1 = cut(first_r, r"^(?=\(c\))")
            ab, rest = take(col, 2); m1, rest = take(rest, 2); m2, _ = take(rest, 2)
            parts = [(f"{n}(a)-(b)", passage_ab, rub_ab, ab, 2, None), (f"{n}(c)(i)", f"{passage}\n{c1}", rub_c1, m1, 2, f"g{n}"),
                     (f"{n}(c)(ii)", f"{passage}\n{second_t}", second_r, m2, 2, f"g{n}")]
        else:  # the whole question is (a) OR (b)
            m1, rest = take(col, total); m2, _ = take(rest, total)
            parts = [(f"{n}(a)", first_t, first_r, m1, total, f"g{n}"), (f"{n}(b)", second_t, second_r, m2, total, f"g{n}")]
        for label, t, r, marks, mx, group in parts:
            out.append({"label": label, "text": tidy_question(t), "rubric": rubric_text(r, marks, mx), "marks": mx, "type": kind, "choice_group": group})
        groups.append({"id": f"g{n}", "labels": [p[0] for p in parts if p[5]], "pick": 1, "note": "Internal choice (OR)"})
    return {"questions": out, "choice_groups": groups}


def total_marks(exam):
    grouped = {label for g in exam["choice_groups"] for label in g["labels"]}
    by_label = {q["label"]: q["marks"] for q in exam["questions"]}
    return sum(m for label, m in by_label.items() if label not in grouped) + sum(
        max(by_label[label] for label in g["labels"]) for g in exam["choice_groups"])


if __name__ == "__main__":
    exam = build(sys.argv[1], sys.argv[2])
    with open(sys.argv[3], "w") as f:
        json.dump(exam, f, ensure_ascii=False, indent=1)
    print(len(exam["questions"]), "questions;", len(exam["choice_groups"]), "choice groups; total marks:", total_marks(exam))
