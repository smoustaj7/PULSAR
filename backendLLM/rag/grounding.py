"""Between the search and Dr.Jarvis: what to search for, how the passages are put in front of
the model, and which of them the answer cites."""

import re

from .retriever import Hit

# Questions about the astronaut themself ("What should I watch today?") carry little to search
# for; the readings the app flagged say what they are really about.
ABOUT_ME = re.compile(r"\b(i|i'm|me|my|mine|myself|today)\b", re.I)


def search_query(question: str, previous_question: str = "", metrics: str = "") -> str:
    """What to look up for a question.

    A short follow-up ("why is that?", "and on Mars?") is searched together with the question
    before it, which holds its subject. A question about the astronaut's own state is searched
    together with the readings the app flagged, so the passages match their situation."""
    query = question.strip()
    if previous_question and len(query.split()) <= 6:
        query = f"{previous_question.strip()} {query}"
    flagged = re.search(r"^Needs attention: (.+)$", metrics, re.M)
    if flagged and ABOUT_ME.search(question) and not flagged.group(1).startswith("nothing"):
        readings = re.sub(r"\s*\([^)]*\)", "", flagged.group(1))
        query = f"{query} ({readings} in spaceflight)"
    return query


def passages_block(hits: list[Hit]) -> str:
    """The passages as the model reads them, each introduced by where it comes from."""
    blocks = []
    for hit in hits:
        p = hit.passage
        where = f", page {p.page}" if p.page else ""
        blocks.append(f"From {p.context} ({p.publisher}{where}):\n{p.text}")
    return "\n\n".join(blocks)


# The model isn't asked to cite: asked to, MedGemma (4B) mostly ignored it, and when reminded it
# listed the passages one by one instead of answering. It answers in its own words and
# `attribute` adds the citations afterwards.
GROUNDING = """
Below is what NASA's reference library (the Human Research Program's hazard and risk pages, evidence reports and technical briefs) says about this question. For facts about spaceflight and health, rely on it: say what it says, in plain words. If it doesn't answer the question, say NASA's library doesn't cover it and keep to what you are sure of. The astronaut's readings come from the app, not from this library. Don't copy it word for word, list its parts, or call them "passages"; say "NASA's research" if you need to name it.

{passages}
"""

# A sentence whose best passage scores at least this with the cross-encoder draws on that
# passage. Measured on MedGemma's answers: sentences restating a passage score above 0, and
# the ones about the astronaut's readings, questions back and general advice -5 to -11.
SUPPORT = -2.0
CITATION = re.compile(r"\s?\[\d+(?:\s*,\s*\d+)*\]")


def sentence_spans(text: str) -> list[tuple[int, int]]:
    """Where each sentence of an answer starts and ends. A full stop inside a number ("1.5%")
    doesn't end one; a line break always does, so list items stay separate."""
    spans = []
    for line in re.finditer(r"[^\n]+", text):
        for piece in re.finditer(r".+?(?:[.!?]+(?=\s|$)|$)", line.group()):
            lead = len(piece.group()) - len(piece.group().lstrip())
            if piece.group().strip():
                spans.append((line.start() + piece.start() + lead, line.start() + piece.end()))
    return spans


def attribute(answer: str, hits: list[Hit], score) -> tuple[str, list[dict]]:
    """The answer with citations ("[1]") after the sentences that draw on NASA's passages, and
    those passages as sources, numbered in the order the answer cites them.

    `score(sentence, texts)` is the cross-encoder's scores of a sentence against each passage.
    A sentence is attributed to its best passage when that scores at least SUPPORT; a run of
    sentences drawing on the same passage gets one citation, at its end."""
    answer = CITATION.sub("", answer)  # the model's own citations, if it wrote any anyway
    if not hits:
        return answer, []
    texts = [h.passage.searchable for h in hits]
    # A question back to the astronaut states no fact, so it never cites.
    spans = [s for s in sentence_spans(answer) if len(answer[s[0] : s[1]].split()) >= 4 and not answer[s[0] : s[1]].rstrip("*_ ").endswith("?")]
    best: list[int | None] = []
    for start, end in spans:
        scores = score(answer[start:end], texts)
        i = max(range(len(scores)), key=scores.__getitem__)
        best.append(i if scores[i] >= SUPPORT else None)

    marks: list[tuple[int, int]] = []  # (where, passage index)
    for j, ((start, end), passage) in enumerate(zip(spans, best)):
        run_continues = j + 1 < len(spans) and best[j + 1] == passage and "\n" not in answer[end : spans[j + 1][0]]
        if passage is not None and not run_continues:
            where = end
            while where > start and answer[where - 1] in ".!?:;*)\"'”’":  # before the closing punctuation
                where -= 1
            marks.append((where, passage))

    order: list[int] = []
    for _, passage in marks:
        if passage not in order:
            order.append(passage)
    for where, passage in reversed(marks):
        answer = f"{answer[:where]} [{order.index(passage) + 1}]{answer[where:]}"
    sources = []
    for n, passage in enumerate(order, start=1):
        p = hits[passage].passage
        sources.append({"n": n, "title": p.title, "section": p.heading, "page": p.page, "publisher": p.publisher, "url": p.url})
    return answer, sources
