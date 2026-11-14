"""Build the NASA reference library from the Space Apps challenge's resources.

    python -m rag.build_corpus --discover   find the documents and list them in rag/sources.json
    python -m rag.build_corpus              download them and save their text to rag/corpus.jsonl.gz

The starting points are the resources the challenge lists ("Create Health Monitoring Software
for Astronauts on Space Missions", tab Resources). From NASA's three pages it follows the links in
the article text, two levels down: the hazard and risk pages, the research they describe, the
Human System Risk Board's summaries, and the PDFs those link to (evidence reports, risk
narratives, technical briefs). Menus and "Related Content" lists are not followed.

Both files are committed, so the server never needs the network for them. Run from backendLLM/
with the backend's environment (it needs beautifulsoup4 and pypdf).
"""

import argparse
import gzip
import io
import json
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

HERE = Path(__file__).parent
SOURCES = HERE / "sources.json"
CORPUS = HERE / "corpus.jsonl.gz"
CHALLENGE = "https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources"

# The challenge's resources, as listed on its Resources tab.
ROOTS = [
    "https://www.nasa.gov/hrp/hazards/",
    "https://www.nasa.gov/hrp/risks/",
    "https://www.nasa.gov/hrp/ongoing-hrp-research/",
    "https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp",
    "https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp",
]

# nasa.gov pages that hold an article, a hazard, a risk or a research summary.
ARTICLE = re.compile(
    r"^https://www\.nasa\.gov/("
    r"hrp/hazard-[\w-]+|reference/[\w-]+|directorates/esdmd/hhp/[\w-]+|hrp/radiation/[\w-]+"
    r"|humans-in-space/[\w-]+|missions/[\w/-]+|general/[\w-]+"
    r")/$"
)
# Section and program pages that only list other pages.
HUBS = {
    "https://www.nasa.gov/humans-in-space/astronauts/",
    "https://www.nasa.gov/humans-in-space/artemis/",
    "https://www.nasa.gov/humans-in-space/humans-to-mars/",
    "https://www.nasa.gov/humans-in-space/chapea/",
    "https://www.nasa.gov/humans-in-space/living-in-space/",
    "https://www.nasa.gov/reference/about-human-health-countermeasures/",
}
# Linked from the pages above but not about crew health: a profile, mission schedules, an
# engineering overview and an image.
OFF_TOPIC = {
    "https://www.nasa.gov/missions/artemis/i-am-artemis-katie-spicer/",
    "https://www.nasa.gov/missions/artemis/nasa-shares-plans-to-accelerate-artemis-return-to-moon/",
    "https://www.nasa.gov/wp-content/uploads/2026/10/artemis-acceleration-readiness-oct-2026.pdf",
    "https://www.nasa.gov/wp-content/uploads/2021/02/473486main_iss_atcs_overview.pdf",
    "https://www.nasa.gov/wp-content/uploads/2020/06/connect2-graphic-cd-small.pdf",
}
PDF_HOSTS = {"www.nasa.gov", "www3.nasa.gov", "humanresearchroadmap.nasa.gov"}
# Link text that names the document itself ("+ 2017 May Evidence Report (PDF)") rather than a
# phrase in a sentence ("1% to 1.5%").
DOCUMENT_LINK = re.compile(r"Evidence Report|Narrative|Risk Record|\(PDF\)|\(MSWord\)", re.I)
# PDFs linked only from a phrase in a sentence, titled as their first page names them.
TITLES = {
    "cardio%20risk%20eb%202022%20final_4-3-2023.pdf": "Evidence Report: Risk of Cardiovascular Adaptations Contributing to Adverse Mission Performance and Health Outcomes (2022)",
    "nutrition%20er_human_adaptation_2020_final.pdf": "Human Adaptation to Spaceflight: The Role of Food and Nutrition (2nd edition)",
    "ochmo-tb-030-bone-loss.pdf": "Bone Loss: NASA technical brief",
    "whatisyourspaceheight.pdf": "What's Your Space Height? (Train Like an Astronaut)",
    "160410main_space_training_fact_sheet.pdf": "Training for Space: Astronaut Training and Mission Preparation",
    "degen.pdf": "Evidence Report: Risk of Cardiovascular Disease and Other Degenerative Tissue Effects from Radiation Exposure (2016)",
    "hrp-rap-for-web-62026.pdf": "HRP Risk Approach Plans (June 2026)",
    "aft.pdf": "Evidence Report: Risk of Performance Decrement and Crew Illness Due to an Inadequate Food System (2016)",
    "food.pdf": "Evidence Report: Risk of Performance Decrement and Crew Illness Due to an Inadequate Food System",
    "radiationchallenge.pdf": "Space Faring: The Radiation Challenge (educator guide)",
    "sf_radiation_stu_bob.pdf": "Space Faring: The Radiation Challenge (middle school student guide)",
    "bmed.pdf": "Evidence Report: Risk of Adverse Cognitive or Behavioral Conditions and Psychiatric Disorders (2016)",
    "renal.pdf": "Evidence Report: Risk of Renal Stone Formation (2017)",
    "bodyinspace_revised_forweb-2022-updated.pdf": "The Human Body in Space",
}
DOWNLOADS = HERE / ".cache" / "downloads"
# Where the page's own text ends and the site's lists of other pages begin.
END_OF_ARTICLE = re.compile(r"^(Related Content|Keep Exploring|Discover More Topics|Date modified|Share|Follow us)\b", re.I)
# Lines that are page furniture: reading times, and the "+ Document (PDF)" link lists.
FURNITURE = re.compile(r"^(\d+ min read|read more|learn more|\+ .*)$", re.I)

session = requests.Session()
session.headers["User-Agent"] = "PULSAR reference-library builder (NASA Space Apps 2026)"


def fetch(url: str) -> requests.Response:
    for attempt in range(3):
        try:
            response = session.get(url, timeout=60)
            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            # A missing page stays missing; only network trouble is worth another try.
            gone = isinstance(exc, requests.HTTPError) and exc.response is not None and exc.response.status_code < 500
            if gone or attempt == 2:
                raise
    raise AssertionError("unreachable")


def clean_url(url: str) -> str:
    """The address without its fragment, and without the cache-busting queries NASA adds to PDFs
    (?rnd=..., ?emrc=...). The Human Research Roadmap's server ignores case, and NASA's pages
    link the same report as Evidence/reports/ and evidence/reports/, so its paths are lowercased."""
    url = url.split("#")[0]
    if not urlparse(url).path.lower().endswith(".pdf"):
        return url
    url = url.split("?")[0]
    parsed = urlparse(url)
    if parsed.netloc == "humanresearchroadmap.nasa.gov":
        url = parsed._replace(path=parsed.path.lower()).geturl()
    return url


def is_pdf(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.netloc in PDF_HOSTS and parsed.path.lower().endswith(".pdf")


# --- Reading pages -------------------------------------------------------------------------


def article_root(soup: BeautifulSoup):
    """The page's main content, without menus, breadcrumbs and other site furniture."""
    main = soup.find("main") or soup.body or soup
    for junk in main.select("nav, header, footer, aside, script, style, form, figure, .usa-breadcrumb, [class*='usa-nav']"):
        junk.decompose()
    return main


def article_blocks(soup: BeautifulSoup):
    """The page's own headings, paragraphs and list items, in order, up to its lists of other
    pages. Each yields (tag, element, text)."""
    for el in article_root(soup).find_all(["h1", "h2", "h3", "h4", "p", "li"]):
        text = el.get_text(" ", strip=True)
        if not text:
            continue
        if el.name.startswith("h") and END_OF_ARTICLE.match(text):
            return
        # A paragraph inside a list item is already part of the item's text.
        if el.name == "p" and el.find_parent("li"):
            continue
        yield el.name, el, text


def page_title(soup: BeautifulSoup) -> str:
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    return re.sub(r"\s+[-|–]\s+(NASA|Canadian Space Agency)\s*$", "", title).strip()


def article_links(url: str, soup: BeautifulSoup) -> list[tuple[str, str]]:
    """(link text, address) for each link in the article, buttons included, up to its lists of
    other pages."""
    links = []
    for el in article_root(soup).find_all(["h1", "h2", "h3", "h4", "a"]):
        if el.name.startswith("h"):
            if END_OF_ARTICLE.match(el.get_text(" ", strip=True)):
                break
        elif el.get("href"):
            links.append((el.get_text(" ", strip=True), clean_url(urljoin(url, el["href"]))))
    return links


def page_sections(soup: BeautifulSoup) -> list[dict]:
    """The page's text as sections, each under its nearest heading."""
    sections, heading, lines = [], "", []
    for tag, _, text in article_blocks(soup):
        if tag.startswith("h"):
            if lines:
                sections.append({"heading": heading, "text": "\n".join(lines)})
            heading, lines = text, []
        elif not FURNITURE.match(text):
            lines.append(text)
    if lines:
        sections.append({"heading": heading, "text": "\n".join(lines)})
    return sections


# --- Reading PDFs --------------------------------------------------------------------------

REFERENCES = re.compile(r"^\s*(?:[IVX]+\.|\d+(?:\.\d+)*\.?)?\s*(References|Bibliography|Literature Cited|Works Cited)\s*$", re.I)
NUMBERED_HEADING = re.compile(r"^(?:[IVX]+\.|[A-Z]\.|\d+(?:\.\d+)*\.?)\s+[A-Z][^.]{2,90}$")
TOC_LINE = re.compile(r"\.{5,}\s*\d+\s*$")


def pdf_sections(content: bytes) -> tuple[str, list[dict]]:
    """A PDF's title (from its metadata, when it has a real one) and its pages as sections.

    Page headers and footers repeated on many pages, page numbers, tables of contents and the
    reference list at the end are dropped: they would only add noise to the search. Each
    section's heading is the latest numbered heading seen, so a passage keeps its context."""
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(content))
    meta_title = ((reader.metadata or {}).get("/Title") or "").strip()
    pages = [(page.extract_text() or "").splitlines() for page in reader.pages]

    # Lines on more than a third of the pages are running headers or footers.
    counts = Counter(line.strip() for lines in pages for line in set(lines) if line.strip())
    repeated = {line for line, n in counts.items() if len(pages) >= 6 and n > len(pages) / 3}

    sections, heading = [], ""
    for number, lines in enumerate(pages, start=1):
        # A table of contents lists headings, not content.
        if any(re.fullmatch(r"\s*(Table of )?Contents\s*", line, re.I) for line in lines[:6]):
            continue
        kept = []
        for line in lines:
            line = re.sub(r"\s+", " ", line).strip()
            if not line or line in repeated or line.isdigit() or TOC_LINE.search(line):
                continue
            # The reference list runs to the end; past the first third of the document, stop there.
            if REFERENCES.match(line) and number > len(pages) / 3:
                kept.append("\x00")
                break
            if NUMBERED_HEADING.match(line) and len(line.split()) <= 14:
                heading = line
            kept.append(line)
        text = join_lines([l for l in kept if l != "\x00"])
        if text:
            sections.append({"heading": heading, "page": number, "text": text})
        if "\x00" in kept:
            break
    good_title = meta_title if len(meta_title) > 12 and not re.match(r"(microsoft word|untitled)", meta_title, re.I) else ""
    return good_title, sections


def join_lines(lines: list[str]) -> str:
    """PDF lines joined back into running text, rejoining words hyphenated across lines."""
    text = ""
    for line in lines:
        if text.endswith("-") and line[:1].islower():
            text = text[:-1] + line
        else:
            text = f"{text} {line}" if text else line
    return re.sub(r"\s+", " ", text).strip()


# --- Finding the documents -----------------------------------------------------------------


def discover() -> list[dict]:
    """Every document two levels below the challenge's resources, and how it was reached."""
    found: dict[str, dict] = {}
    queue = [(url, 0, CHALLENGE, "") for url in ROOTS]
    while queue:
        url, depth, via, link_text = queue.pop(0)
        if url in found:
            # A PDF linked again by its own name ("2017 May Evidence Report") is better titled
            # from that link than from a phrase in a sentence.
            seen = found[url]
            if seen["kind"] == "pdf" and DOCUMENT_LINK.search(link_text) and not DOCUMENT_LINK.search(seen["link_text"]):
                seen.update(via=via, link_text=link_text)
            continue
        if is_pdf(url):
            found[url] = {"url": url, "kind": "pdf", "via": via, "link_text": link_text}
            print(f"  pdf   {url}", file=sys.stderr)
            continue
        try:
            soup = BeautifulSoup(fetch(url).text, "html.parser")
        except requests.RequestException as exc:  # NASA's pages link to a few that are gone
            print(f"  gone  {url} ({exc.__class__.__name__})", file=sys.stderr)
            continue
        found[url] = {"url": url, "kind": "page", "via": via, "title": page_title(soup)}
        print(f"  page  {url}", file=sys.stderr)
        if "asc-csa.gc.ca" in url:
            continue
        for text, link in article_links(url, soup):
            if link in HUBS or link in OFF_TOPIC or link == url:
                continue
            # Articles are followed two levels down; the PDFs they link to, one more.
            if is_pdf(link) or (depth < 2 and ARTICLE.match(link)):
                queue.append((link, depth + 1, url, text))
    return list(found.values())


# --- Building the corpus -------------------------------------------------------------------


def pdf_title(source: dict, meta_title: str, titles: dict[str, str]) -> str:
    """A name a reader recognises: "Evidence Report: <risk> (2017 May)" for the evidence reports,
    the link's own name for the other documents, else the PDF's metadata title."""
    if source.get("title"):
        return source["title"]
    if Path(urlparse(source["url"]).path).name.lower() in TITLES:
        return TITLES[Path(urlparse(source["url"]).path).name.lower()]
    text = re.sub(r"^\+\s*|\s*\((PDF|MSWord)\)\s*$", "", source.get("link_text", "")).strip()
    parent = titles.get(source["via"], "")
    dated = re.match(r"^(\d{4} \w+) Evidence Report$", text)
    if dated and parent:
        return f"Evidence Report: {parent} ({dated.group(1)})"
    if "technical-brief" in source["url"]:
        return f"{text}: NASA technical brief"
    if DOCUMENT_LINK.search(source.get("link_text", "")) or not meta_title:
        return text or meta_title or Path(urlparse(source["url"]).path).stem
    return meta_title


def download(url: str) -> bytes:
    """The document's bytes, kept in rag/.cache/downloads so a rebuild doesn't fetch them again."""
    import hashlib

    path = DOWNLOADS / hashlib.sha1(url.encode()).hexdigest()
    if path.exists():
        return path.read_bytes()
    content = fetch(url).content
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return content


def build(sources: list[dict]) -> list[dict]:
    titles = {s["url"]: s.get("title", "") for s in sources}
    documents, seen_texts = [], set()
    for source in sources:
        url = source["url"]
        try:
            content = download(url)
        except requests.RequestException as exc:
            print(f"  skipped {url}: {exc}", file=sys.stderr)
            continue
        if source["kind"] == "pdf":
            meta_title, sections = pdf_sections(content)
            title = pdf_title(source, meta_title, titles)
        else:
            soup = BeautifulSoup(content, "html.parser")
            sections = page_sections(soup)
            title = source.get("title") or page_title(soup)
        words = sum(len(s["text"].split()) for s in sections)
        if words < 40:
            print(f"  skipped {url}: only {words} words of text", file=sys.stderr)
            continue
        # NASA posts some reports at two addresses; keep the first copy.
        text = "\n".join(s["text"] for s in sections)
        if text in seen_texts:
            print(f"  skipped {url}: same text as a document already kept", file=sys.stderr)
            continue
        seen_texts.add(text)
        documents.append({
            "id": re.sub(r"[^a-z0-9]+", "-", urlparse(url).path.lower()).strip("-"),
            "title": title,
            "url": url,
            "publisher": "Canadian Space Agency" if "asc-csa.gc.ca" in url else "NASA",
            "kind": source["kind"],
            "sections": sections,
        })
        print(f"  {words:>7} words  {title[:80]}", file=sys.stderr)
    return documents


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--discover", action="store_true", help="find the documents and rewrite sources.json")
    args = parser.parse_args()

    if args.discover:
        sources = discover()
        SOURCES.write_text(json.dumps(sources, indent=1, ensure_ascii=False) + "\n")
        print(f"Listed {len(sources)} documents in {SOURCES}", file=sys.stderr)
        return

    documents = build(json.loads(SOURCES.read_text()))
    with gzip.open(CORPUS, "wt", encoding="utf-8") as out:
        for doc in documents:
            out.write(json.dumps(doc, ensure_ascii=False) + "\n")
    words = sum(len(s["text"].split()) for d in documents for s in d["sections"])
    print(f"Saved {len(documents)} documents ({words:,} words) to {CORPUS}", file=sys.stderr)


if __name__ == "__main__":
    main()
