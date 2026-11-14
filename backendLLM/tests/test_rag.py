"""Tests for the NASA library search. Run from backendLLM/:  .venv/bin/python -m unittest

The search's models are replaced by small stand-ins, so these run in a second without
downloading anything."""

import re
import unittest

import torch

from rag.grounding import attribute, passages_block, search_query, sentence_spans
from rag.index import BM25, make_passages, reciprocal_rank_fusion, split_sentences, tokenize, top
from rag.retriever import Hit, Library


def doc(id_, sections, title=None):
    return {"id": id_, "title": title or id_.title(), "url": f"https://www.nasa.gov/{id_}/", "publisher": "NASA", "sections": sections}


def sentences(topic, n, words=10):
    """n sentences of `words` words each about `topic`."""
    return " ".join(f"{topic.capitalize()} sentence {i} " + " ".join(["filler"] * (words - 3)) + "." for i in range(n))


class WordEmbedder:
    """Stand-in meaning model: a text's vector counts its words, hashed into 64 slots."""

    def encode(self, texts, progress=False):
        vectors = torch.zeros(len(texts), 64)
        for i, text in enumerate(texts):
            for word in tokenize(text):
                vectors[i, hash(word) % 64] += 1
        return torch.nn.functional.normalize(vectors, dim=-1)

    def encode_query(self, query):
        return self.encode([query])[0]


class OverlapReranker:
    """Stand-in cross-encoder: how many of the query's words the passage has, minus one, so a
    passage sharing no word scores below the relevance gate."""

    def score(self, query, passages):
        words = set(tokenize(query))
        return [len(words & set(tokenize(p))) - 1.0 for p in passages]


class Passages(unittest.TestCase):
    def test_sentences_split_and_long_runs_are_cut(self):
        self.assertEqual(split_sentences("Bone thins. Muscle weakens! Why? Rest."), ["Bone thins.", "Muscle weakens!", "Why?", "Rest."])
        table = " ".join(["cell"] * 250)
        self.assertEqual([len(s.split()) for s in split_sentences(table)], [100, 100, 50])

    def test_passages_are_about_the_target_size_and_overlap(self):
        passages = make_passages([doc("bone", [{"heading": "Loss", "text": sentences("bone", 60)}])], size=200, overlap=40)
        self.assertGreater(len(passages), 2)
        for p in passages[:-1]:
            self.assertTrue(200 <= len(p.text.split()) < 220, len(p.text.split()))
        # The next passage starts with the last sentences of the one before (up to 40 words).
        first, second = split_sentences(passages[0].text), split_sentences(passages[1].text)
        carried = second[: second.index(first[-1]) + 1]
        self.assertEqual(carried, first[-len(carried) :])
        self.assertTrue(10 <= sum(len(s.split()) for s in carried) <= 40)

    def test_a_passage_never_spans_two_sections(self):
        passages = make_passages([doc("sleep", [{"heading": "Causes", "text": sentences("light", 8)}, {"heading": "Effects", "text": sentences("fatigue", 8)}])])
        self.assertEqual([p.heading for p in passages], ["Causes", "Effects"])
        self.assertNotIn("Fatigue", passages[0].text)

    def test_a_short_tail_joins_the_passage_before_and_labels_are_dropped(self):
        passages = make_passages([doc("co2", [{"heading": "", "text": sentences("carbon", 21) + " Short tail here."}])], size=200)
        self.assertTrue(passages[-1].text.endswith("Short tail here."))
        self.assertEqual(make_passages([doc("x", [{"heading": "", "text": "1 min read"}])]), [])

    def test_passages_carry_their_context_and_page(self):
        [p] = make_passages([doc("sans", [{"heading": "Optic disc edema", "page": 7, "text": sentences("eye", 3)}], title="SANS Evidence Report")])
        self.assertEqual(p.context, "SANS Evidence Report — Optic disc edema")
        self.assertEqual(p.page, 7)
        self.assertTrue(p.searchable.startswith("SANS Evidence Report — Optic disc edema\n"))


class KeywordSearch(unittest.TestCase):
    def test_tokens_keep_terms_as_written_and_drop_plurals_and_stopwords(self):
        self.assertEqual(tokenize("The CO2 levels in the astronaut's cabin"), ["co2", "level", "astronaut", "cabin"])
        self.assertEqual(tokenize("SpO2 and mmHg"), ["spo2", "mmhg"])
        self.assertEqual(tokenize("bones studies glass"), ["bone", "study", "glass"])

    def test_bm25_ranks_the_passage_with_the_rare_term_first(self):
        texts = ["Bone loss in space is about one percent a month.", "Space is big.", "Sleep in space is short.", "CO2 scrubbers clean the cabin air."]
        bm25 = BM25(texts)
        self.assertEqual(top(bm25.scores("how much bone do I lose"), 4, matches_only=True), [0])
        self.assertEqual(top(bm25.scores("co2 in the cabin"), 1, matches_only=True), [3])
        self.assertEqual(top(bm25.scores("unrelated words"), 4, matches_only=True), [])

    def test_rank_fusion_favours_what_both_rankings_agree_on(self):
        # 1 tops one list only; 3 is lower but in both, so it comes first.
        self.assertEqual(reciprocal_rank_fusion([[1, 2, 3], [2, 9, 3]])[:3], [2, 3, 1])
        self.assertEqual(reciprocal_rank_fusion([[5], []]), [5])


class Search(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.library = Library(
            [
                doc("bone", [{"heading": "", "text": "Astronauts lose bone mineral density in microgravity every month. Resistance exercise slows that bone loss."}]),
                doc("bone-report", [{"heading": "", "text": "Bone loss continues on long missions far from Earth. Bone recovers slowly after landing."}]),
                doc("bone-brief", [{"heading": "", "text": "Bisphosphonate medication protects the skeleton during flight. Regular bone scans track how it responds."}]),
                doc("sleep", [{"heading": "", "text": "Sleep loss and circadian misalignment reduce crew performance on the station during long missions."}]),
            ],
            embedder=WordEmbedder(),
            reranker=OverlapReranker(),
            cache=None,
        )

    # The stand-in reranker scores a passage sharing no word with the query at -1.
    GATE = -0.5

    def test_search_returns_relevant_passages_best_first(self):
        hits = self.library.search("why do astronauts lose bone", gate=self.GATE)
        self.assertEqual(hits[0].passage.doc_id, "bone")
        self.assertTrue(all("bone" in h.passage.doc_id for h in hits))

    def test_small_talk_and_off_topic_questions_get_no_passages(self):
        self.assertEqual(self.library.search("thanks, that helps!", gate=self.GATE), [])
        self.assertEqual(self.library.search("   ", gate=self.GATE), [])
        self.assertEqual(self.library.search("quantum chromodynamics lattice", gate=self.GATE), [])

    def test_at_most_k_passages_and_per_document_limit(self):
        hits = self.library.search("bone loss", k=2, per_document=1, gate=self.GATE)
        self.assertEqual(len(hits), 2)
        self.assertEqual(len({h.passage.doc_id for h in hits}), 2)


class Grounding(unittest.TestCase):
    METRICS = "Crew member: Ana\nNeeds attention: Sleep (Critical), Cabin CO2 (Caution)\nIn range: Heart rate"

    def test_short_follow_ups_carry_the_question_before(self):
        self.assertEqual(search_query("why is that?", "Does radiation cause cancer?"), "Does radiation cause cancer? why is that?")
        long_question = "How do bisphosphonates protect bone in microgravity?"
        self.assertEqual(search_query(long_question, "Does radiation cause cancer?"), long_question)

    def test_questions_about_me_add_the_flagged_readings(self):
        self.assertEqual(search_query("What should I watch today?", metrics=self.METRICS), "What should I watch today? (Sleep, Cabin CO2 in spaceflight)")
        self.assertEqual(search_query("What is SANS exactly?", metrics=self.METRICS), "What is SANS exactly?")
        calm = "Needs attention: nothing; every logged reading is in range"
        self.assertEqual(search_query("How am I doing?", metrics=calm), "How am I doing?")

    # Two passages, sleep first, so a citation of the bone one shows the renumbering.
    PASSAGES = [
        ("sleep", "Sleep loss and circadian misalignment reduce crew performance and alertness on long missions."),
        ("bone", "Astronauts lose bone mineral density at about 1.5% each month in microgravity without exercise."),
    ]

    def hits(self):
        docs = [doc(id_, [{"heading": "", "page": i, "text": text}]) for i, (id_, text) in enumerate(self.PASSAGES, 1)]
        return [Hit(p, 1.0) for p in make_passages(docs)]

    @staticmethod
    def score(sentence, texts):
        """Stand-in cross-encoder: a sentence sharing 3 or more words with a passage draws on it."""
        words = set(tokenize(sentence))
        return [5.0 if len(words & set(tokenize(t))) >= 3 else -8.0 for t in texts]

    def test_passages_are_introduced_by_their_source(self):
        block = passages_block(self.hits())
        self.assertTrue(block.startswith("From Sleep (NASA, page 1):\nSleep loss"))
        self.assertIn("\n\nFrom Bone (NASA, page 2):\nAstronauts lose", block)

    def test_sentences_end_at_full_stops_not_inside_numbers_and_at_line_breaks(self):
        text = "It is 1.5% a month. Exercise helps!\n- Eat well"
        self.assertEqual([text[a:b] for a, b in sentence_spans(text)], ["It is 1.5% a month.", "Exercise helps!", "- Eat well"])

    def test_sentences_drawing_on_a_passage_cite_it_numbered_in_order(self):
        answer, sources = attribute(
            "Your sleep reading is low today. Astronauts lose bone mineral density each month in microgravity.", self.hits(), self.score
        )
        self.assertEqual(answer, "Your sleep reading is low today. Astronauts lose bone mineral density each month in microgravity [1].")
        self.assertEqual([(s["n"], s["url"], s["page"]) for s in sources], [(1, "https://www.nasa.gov/bone/", 2)])

    def test_a_run_of_sentences_on_one_passage_gets_one_citation(self):
        answer, sources = attribute(
            "Bone mineral density falls in microgravity. Astronauts lose about 1.5% of bone mineral density each month. "
            "Sleep loss reduces crew performance and alertness.",
            self.hits(),
            self.score,
        )
        self.assertEqual(
            answer,
            "Bone mineral density falls in microgravity. Astronauts lose about 1.5% of bone mineral density each month [1]. "
            "Sleep loss reduces crew performance and alertness [2].",
        )
        self.assertEqual([s["url"] for s in sources], ["https://www.nasa.gov/bone/", "https://www.nasa.gov/sleep/"])

    def test_questions_back_are_never_cited(self):
        answer, sources = attribute("Any other questions about bone mineral density in microgravity?", self.hits(), self.score)
        self.assertEqual((answer, sources), ("Any other questions about bone mineral density in microgravity?", []))

    def test_the_models_own_citations_are_replaced_and_no_passages_means_no_sources(self):
        self.assertEqual(attribute("Rest helps [7]. Hydrate [1, 2].", self.hits(), self.score), ("Rest helps. Hydrate.", []))
        self.assertEqual(attribute("Hi there [1].", [], self.score), ("Hi there.", []))


class Corpus(unittest.TestCase):
    def test_the_committed_library_has_the_challenge_resources(self):
        from rag.retriever import load_documents

        documents = load_documents()
        urls = {d["url"] for d in documents}
        for resource in ["https://www.nasa.gov/hrp/hazards/", "https://www.nasa.gov/hrp/risks/", "https://www.nasa.gov/hrp/ongoing-hrp-research/"]:
            self.assertIn(resource, urls)
        self.assertTrue(any("asc-csa.gc.ca" in u for u in urls))
        self.assertGreater(len(documents), 100)
        for d in documents:
            self.assertTrue(d["title"] and d["sections"], d["url"])
            self.assertFalse(re.search(r"\s{2,}|\t", d["title"]), d["title"])


if __name__ == "__main__":
    unittest.main()
