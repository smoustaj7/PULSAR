"""The parts of the search that need no model: passages, keyword search (BM25) and rank fusion."""

import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass

import numpy as np


@dataclass
class Passage:
    """About 200 words of one document, with what a reader needs to find it again."""

    id: int
    doc_id: str
    title: str
    url: str
    publisher: str
    heading: str
    page: int | None
    text: str

    @property
    def context(self) -> str:
        """The document and section the passage comes from, put in front of its text when it is
        searched, so a passage that says "it" or "this risk" is still found for its subject."""
        return f"{self.title} — {self.heading}" if self.heading and self.heading != self.title else self.title

    @property
    def searchable(self) -> str:
        return f"{self.context}\n{self.text}"


SENTENCE_END = re.compile(r"(?<=[.!?])[\"”’)]?\s+(?=[A-Z0-9“\"(])")


def split_sentences(text: str, longest: int = 100) -> list[str]:
    """Sentences, with any run of text longer than `longest` words (a table, a list with no full
    stops) cut into pieces of that size, so no passage grows past its intended length."""
    sentences = []
    for s in SENTENCE_END.split(text.replace("\n", " ")):
        words = s.split()
        sentences += [" ".join(words[i : i + longest]) for i in range(0, len(words), longest)]
    return sentences


def make_passages(documents: list[dict], size: int = 200, overlap: int = 40) -> list[Passage]:
    """Each document cut into passages of about `size` words, whole sentences only.

    A passage never spans two sections, so its heading is true for all of it. Consecutive
    passages share about `overlap` words, so a point made across a cut is whole in one of them.
    PDF pages of one section run on into each other; the passage keeps the page it starts on."""
    passages: list[Passage] = []

    for doc in documents:
        run: list[str] = []  # the passage being filled: sentences carried over, then new ones
        fresh = 0  # how many of them are new since the last cut
        page, heading = None, None

        def cut() -> None:
            nonlocal run, fresh
            if fresh:
                new_words = sum(len(s.split()) for s in run[-fresh:])
                last = passages[-1] if passages else None
                # A sliver at the end of a section reads better as the end of the previous passage.
                if new_words < 40 and last and last.doc_id == doc["id"] and last.heading == (heading or ""):
                    last.text = f"{last.text} {' '.join(run[-fresh:])}"
                elif len(" ".join(run).split()) >= 12:  # shorter is a caption or a label, not content
                    passages.append(Passage(len(passages), doc["id"], doc["title"], doc["url"], doc["publisher"], heading or "", page, " ".join(run)))
            run, fresh = [], 0

        for section in doc["sections"]:
            if section.get("heading", "") != heading:
                cut()
                heading = section.get("heading", "")
            for sentence in split_sentences(section["text"]):
                if not run:
                    page = section.get("page")
                run.append(sentence)
                fresh += 1
                if sum(len(s.split()) for s in run) >= size:
                    full = run
                    cut()
                    # Start the next passage with the last sentences, up to `overlap` words.
                    words = 0
                    for s in reversed(full[1:]):
                        words += len(s.split())
                        if words > overlap:
                            break
                        run.insert(0, s)
                    page = section.get("page")
        cut()
    return passages


# --- Keyword search ------------------------------------------------------------------------

STOPWORDS = frozenset(
    "a about above after again against all am an and any are as at be because been before being "
    "below between both but by can could did do does doing down during each few for from further had "
    "has have having he her here hers him his how i if in into is it its itself just me more most my "
    "no nor not now of off on once only or other our ours out over own same she should so some such "
    "than that the their theirs them then there these they this those through to too under until up "
    "very was we were what when where which while who whom why will with would you your yours".split()
)


def normalize(word: str) -> str:
    """A light, predictable stemmer: plural and possessive endings only ("bones" → "bone",
    "astronaut's" → "astronaut"). Meaning-based search covers the rest of word forms."""
    if word.endswith("'s"):
        word = word[:-2]
    if len(word) > 4 and word.endswith("ies"):
        return word[:-3] + "y"
    if len(word) > 4 and word.endswith(("sses", "xes", "ches", "shes")):
        return word[:-2]
    if len(word) > 3 and word.endswith("s") and not word.endswith(("ss", "us", "is")):
        return word[:-1]
    return word


def tokenize(text: str) -> list[str]:
    """Lowercase words and numbers, so "CO2", "SpO2" and "mmHg" stay searchable as written."""
    return [normalize(w) for w in re.findall(r"[a-z0-9]+(?:'s)?", text.lower()) if w not in STOPWORDS]


class BM25:
    """Okapi BM25 over the passages: rewards the query's rarer words, appearing often, in a
    passage that isn't padded out with other words."""

    def __init__(self, texts: list[str], k1: float = 1.2, b: float = 0.75):
        self.k1, self.b = k1, b
        self.postings: dict[str, list[tuple[int, int]]] = defaultdict(list)
        lengths = []
        for i, text in enumerate(texts):
            counts = Counter(tokenize(text))
            lengths.append(sum(counts.values()))
            for term, tf in counts.items():
                self.postings[term].append((i, tf))
        self.lengths = np.array(lengths, dtype=np.float32)
        self.average = float(self.lengths.mean()) if texts else 0.0
        n = len(texts)
        self.idf = {t: math.log(1 + (n - len(p) + 0.5) / (len(p) + 0.5)) for t, p in self.postings.items()}

    def scores(self, query: str) -> np.ndarray:
        scores = np.zeros(len(self.lengths), dtype=np.float32)
        for term in set(tokenize(query)):
            for i, tf in self.postings.get(term, ()):
                norm = self.k1 * (1 - self.b + self.b * self.lengths[i] / self.average)
                scores[i] += self.idf[term] * tf * (self.k1 + 1) / (tf + norm)
        return scores


def top(scores: np.ndarray, k: int, matches_only: bool = False) -> list[int]:
    """The indices of the k highest scores, best first. With `matches_only`, a score of zero
    (a passage sharing no word with the query) never makes the list."""
    k = min(k, int((scores > 0).sum()) if matches_only else len(scores))
    if k <= 0:
        return []
    best = np.argpartition(-scores, k - 1)[:k]
    return best[np.argsort(-scores[best])].tolist()


def reciprocal_rank_fusion(rankings: list[list[int]], k: int = 60) -> list[int]:
    """One ranking from several: each list adds 1 / (k + rank) for every passage it ranks.

    It uses ranks only, so BM25's open-ended scores and cosine similarities need no
    calibration against each other, and a passage both searches rank well comes first."""
    fused: dict[int, float] = defaultdict(float)
    for ranking in rankings:
        for rank, item in enumerate(ranking, start=1):
            fused[item] += 1 / (k + rank)
    return sorted(fused, key=lambda item: -fused[item])
