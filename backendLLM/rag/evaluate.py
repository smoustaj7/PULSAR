"""How well each step of the search finds passages that answer the question.

    python -m rag.evaluate                 the models in rag/retriever.py
    RAG_RERANK_MODEL=... python -m rag.evaluate   another cross-encoder, and so on

Thirty questions an astronaut might ask are searched four ways: keywords only, meaning only,
both fused (hybrid), and hybrid reordered by the cross-encoder. A passage counts as an answer
when its text has every fact pattern listed for the question (and comes from the named site,
where one is given), so a passage from the right report that doesn't answer still counts as
a miss. For each way it reports
  hit@4  the share of questions with an answer among the 4 passages Dr.Jarvis would read
  P@4    the share of those 4 passages that answer the question
  MRR    how high the first answer ranks, on average (1 = always first)
Then it shows the cross-encoder's best scores for the weakest questions and for small talk,
which the relevance gate in Library.search must keep apart.
"""

import re
import time

from .index import reciprocal_rank_fusion
from .retriever import GATE, Library

# (question, site the answer must come from or None, patterns the passage's text must all match)
QUESTIONS = [
    ("Why do astronauts lose bone in space and how fast?", None, [r"bone", r"per month|a month|each month|monthly"]),
    ("What is SANS and how does it affect my eyes?", None, [r"SANS|neuro-ocular", r"optic|globe|choroid|vision|visual|eye"]),
    ("I keep sleeping badly on the station, what does that do to my performance?", None, [r"sleep", r"performance|alertness|fatigue|cognitive|error"]),
    ("How does high CO2 in the cabin affect crew health?", None, [r"CO2|carbon dioxide", r"headache|symptom|health|effect|exposure"]),
    ("Can microgravity make my heart weaker?", None, [r"heart|cardiac|cardiovascular", r"atroph|mass|decondition|weak|smaller|orthostatic"]),
    ("What exercise do astronauts do to keep their muscles strong?", None, [r"exercise|ARED|resistance|treadmill", r"muscle"]),
    ("How does space radiation raise the risk of cancer?", None, [r"radiation", r"cancer|carcinogen"]),
    ("Why do I feel dizzy and clumsy after landing?", None, [r"dizz|vertigo|balance|motion sickness|sensorimotor|vestibular|orthostatic", r"landing|return|post-?flight|R\+0"]),
    ("Does spaceflight weaken the immune system and wake up dormant viruses?", None, [r"immun", r"virus|viral|reactivat|herpes|shingles|latent"]),
    ("What does long isolation and confinement do to the mind?", None, [r"isolat|confine", r"behavio|psych|mood|stress|depress|cognit"]),
    ("How can a crew avoid conflict and work well together?", None, [r"team|crew", r"conflict|cohesion|communication|tension"]),
    ("What is decompression sickness and when can it happen on a spacewalk?", None, [r"decompression sickness|DCS", r"EVA|spacewalk|suit|pre-?breath"]),
    ("What should astronauts eat to stay healthy on long missions?", None, [r"food|nutrition|diet|nutrient", r"health|vitamin|calori|energy|intake"]),
    ("Can kidney stones form in space?", None, [r"(kidney|renal) stone"]),
    ("How does low oxygen affect the crew?", None, [r"hypoxi|low oxygen", r"crew|performance|symptom|health|cognit"]),
    ("Can blood clots form in the neck veins during spaceflight?", None, [r"thrombo|clot", r"jugular|vein|venous"]),
    ("How do fluid shifts change the pressure in my head?", None, [r"fluid shift", r"head|brain|intracranial|cephalad|pressure"]),
    ("How does the Canadian Space Agency measure radiation on astronauts?", r"asc-csa", [r"radiation", r"dosimet|monitor|measur|detector"]),
    ("Why do scientists run experiments on the space station?", None, [r"experiment|research|science", r"microgravity|space station|ISS|weightless"]),
    ("How do communication delays with Earth affect a crew going to Mars?", None, [r"delay", r"communicat"]),
    ("What injuries can the forces of launch and landing cause?", None, [r"dynamic load|landing|launch|impact|acceleration", r"injur"]),
    ("How are astronauts' vital signs monitored in flight?", None, [r"monitor|measur|wearable|vital", r"heart rate|blood pressure|vital sign|ECG|electrocardio|Tempus"]),
    ("Do depression and anxiety become more likely on long missions?", None, [r"depress|anxiety|psychiatric|mood disorder"]),
    ("Why do astronauts get taller in space?", None, [r"taller|height|spin(e|al)", r"elongat|grow|taller|lengthen|inch|cm"]),
    ("What are the five hazards of human spaceflight?", None, [r"hazard", r"radiation", r"isolation|distance|gravity|hostile"]),
    ("How do bisphosphonates help prevent bone loss?", None, [r"bisphosphonate"]),
    ("Do microbes on the station become more dangerous to the crew?", None, [r"microb|bacteri|pathogen", r"virulen|resist|infect|danger|risk"]),
    ("How does the lack of gravity affect balance and orientation?", None, [r"balance|orientation|spatial|vestibular|sensorimotor", r"gravity|weightless|microgravity"]),
    ("What do work overload and a disrupted body clock do to astronauts?", None, [r"workload|work overload|circadian"]),
    ("How much radiation do astronauts receive on the ISS?", None, [r"radiation", r"dose|mSv|millisievert|sievert"]),
]
SMALL_TALK = ["hi", "thanks, that helps!", "how are you today?", "tell me a joke", "ok"]
OFF_TOPIC = ["What is the capital of France?", "Write a poem about the sea", "Who won the football match yesterday?"]


def answers(library: Library, site: str | None, patterns: list[str]) -> set[int]:
    rxs = [re.compile(p, re.I) for p in patterns]
    return {p.id for p in library.passages if (not site or re.search(site, p.url)) and all(rx.search(p.text) for rx in rxs)}


def score(rankings: list[list[int]], truth: list[set[int]], k: int = 4) -> tuple[float, float, float]:
    n = len(truth)
    hits = sum(bool(set(r[:k]) & a) for r, a in zip(rankings, truth)) / n
    precision = sum(len(set(r[:k]) & a) / k for r, a in zip(rankings, truth)) / n
    mrr = sum(next((1 / i for i, p in enumerate(r[:10], 1) if p in a), 0) for r, a in zip(rankings, truth)) / n
    return hits, precision, mrr


def main() -> None:
    library = Library()
    truth = [answers(library, site, patterns) for _, site, patterns in QUESTIONS]
    for (question, _, _), a in zip(QUESTIONS, truth):
        assert a, f"No passage answers {question!r}: loosen its patterns"

    def fused(q: str) -> list[int]:
        keyword, semantic = library.keyword(q), library.semantic(q)
        reranked = [h.passage.id for h in library.rerank(q, reciprocal_rank_fusion([keyword, semantic])[:30])]
        return reciprocal_rank_fusion([keyword, semantic, reranked])

    methods = {
        "keywords (BM25)": lambda q: library.keyword(q),
        "meaning (embeddings)": lambda q: library.semantic(q),
        "hybrid (RRF)": lambda q: library.hybrid(q),
        "cross-encoder alone": lambda q: [h.passage.id for h in library.rerank(q, library.hybrid(q)[:30])],
        "hybrid + cross-encoder": fused,
    }
    print(f"\n{'method':<24} {'hit@4':>6} {'P@4':>6} {'MRR':>6} {'ms/query':>9}")
    for name, method in methods.items():
        started = time.time()
        rankings = [method(q) for q, _, _ in QUESTIONS]
        ms = (time.time() - started) * 1000 / len(QUESTIONS)
        hits, precision, mrr = score(rankings, truth)
        print(f"{name:<24} {hits:>6.0%} {precision:>6.0%} {mrr:>6.2f} {ms:>9.0f}")

    final = [[h.passage.id for h in library.search(q)] for q, _, _ in QUESTIONS]
    hits, precision, _ = score(final, truth)
    print(f"\nWhat Dr.Jarvis reads (search()): hit@4 {hits:.0%}, P@4 {precision:.0%}, {sum(not r for r in final)} of 30 questions got no passages")
    for (question, _, _), r, a in zip(QUESTIONS, final, truth):
        if not set(r) & a:
            print(f"  missed: {question}  (got: {'; '.join(library.passages[i].title[:40] for i in r) or 'nothing'})")

    best = lambda q: max(h.score for h in library.rerank(q, library.hybrid(q)[:30]))  # noqa: E731
    print(f"\nBest cross-encoder score; the gate ({GATE}) must sit between the questions and off-topic requests")
    for score_, q in sorted((best(q), q) for q, _, _ in QUESTIONS)[:4]:
        print(f"  {score_:>6.2f}  {q}  (one of the weakest questions)")
    for q in OFF_TOPIC:
        print(f"  {best(q):>6.2f}  {q!r} (off topic: {len(library.search(q))} passages)")
    print(f"Small talk searched: {[q for q in SMALL_TALK if library.search(q)] or 'none'}")


if __name__ == "__main__":
    main()
