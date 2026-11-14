import { describe, expect, it } from 'vitest'
import { citedSource, linkCitations, sourceDetail, sourceHref, withoutCitations, type Source } from './citations'

const report: Source = { n: 1, title: 'Evidence Report: Risk of Renal Stone Formation (2017)', page: 12, publisher: 'NASA', url: 'https://humanresearchroadmap.nasa.gov/evidence/reports/renal.pdf' }
const page: Source = { n: 2, title: 'Hazard: Gravity Fields', publisher: 'NASA', url: 'https://www.nasa.gov/hrp/hazard-gravity-fields/' }

describe('citations', () => {
  it('turns citations into chip links and drops ones with no source', () => {
    expect(linkCitations('Stones form faster [1]. Bone thins [2][3].', [report, page])).toBe(
      'Stones form faster[1](#cite-1). Bone thins[2](#cite-2).',
    )
  })

  it('leaves Markdown links and text without citations alone', () => {
    expect(linkCitations('See [the page](https://nasa.gov).', [report])).toBe('See [the page](https://nasa.gov).')
    expect(linkCitations('No sources here.', [])).toBe('No sources here.')
  })

  it('strips citations from history', () => {
    expect(withoutCitations('Stones form faster [1]. Bone thins [2].')).toBe('Stones form faster. Bone thins.')
  })

  it('finds the source a chip points at', () => {
    expect(citedSource('#cite-2', [report, page])).toBe(page)
    expect(citedSource('#cite-9', [report, page])).toBeUndefined()
    expect(citedSource('https://nasa.gov', [report, page])).toBeUndefined()
  })

  it('opens a PDF at the passage’s page and says so', () => {
    expect(sourceHref(report)).toBe('https://humanresearchroadmap.nasa.gov/evidence/reports/renal.pdf#page=12')
    expect(sourceHref(page)).toBe('https://www.nasa.gov/hrp/hazard-gravity-fields/')
    expect(sourceDetail(report)).toBe('NASA · PDF, page 12')
    expect(sourceDetail(page)).toBe('NASA')
  })
})
