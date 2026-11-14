/** A NASA document Dr.Jarvis's answer drew on (backendLLM/rag/grounding.py, cited_sources). */
export type Source = {
  /** The number the answer cites it by, as in "[2]". */
  n: number
  title: string
  section?: string
  /** The PDF page the passage starts on; none for web pages. */
  page?: number | null
  publisher: string
  url: string
}

/** Where to read a source: a PDF opens at the passage's page. */
export const sourceHref = (s: Source) => (s.page ? `${s.url}#page=${s.page}` : s.url)

/** "NASA · PDF, page 12" */
export const sourceDetail = (s: Source) => `${s.publisher}${s.page ? ` · PDF, page ${s.page}` : ''}`

/**
 * The answer with each citation ("[2]") turned into a Markdown link the chat draws as a chip.
 * A citation with no matching source is dropped rather than shown as a dead number.
 */
export function linkCitations(text: string, sources: Source[]): string {
  const cited = new Set(sources.map((s) => s.n))
  return text.replace(/\s?\[(\d+)\](?!\()/g, (_, n: string) => (cited.has(Number(n)) ? `[${n}](#cite-${n})` : ''))
}

/** The answer without citation numbers, as sent back as conversation history: the numbers
 *  only mean something next to the passages they were given with. */
export const withoutCitations = (text: string) => text.replace(/\s?\[\d+\]/g, '')

/** The cited source a chip's link points at, if any. */
export function citedSource(href: string | undefined, sources: Source[]): Source | undefined {
  const n = href?.match(/^#cite-(\d+)$/)?.[1]
  return n ? sources.find((s) => s.n === Number(n)) : undefined
}
