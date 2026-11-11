import { useMemo, useState } from 'react'
import { copyText } from '../lib/browser'
import { buildReport, reportToMarkdown, type ReportInput } from '../lib/report'
import { Sheet } from './Sheet'

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportDialog({ open, onClose, input }: { open: boolean; onClose: () => void; input: ReportInput }) {
  const [copied, setCopied] = useState<'done' | 'failed' | null>(null)
  const report = useMemo(() => (open ? buildReport(input) : null), [open, input])
  const markdown = useMemo(() => (report ? reportToMarkdown(report) : ''), [report])
  const base = report ? `astropulse-report-day${report.missionDay}-${report.generatedAt.slice(0, 10)}` : 'report'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title="Report to ground"
      description="Your last 7 days for the flight surgeon. Copy it into a message, or download it for the next comms pass."
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            setCopied((await copyText(markdown)) ? 'done' : 'failed')
            setTimeout(() => setCopied(null), 1500)
          }}
        >
          {copied === 'done' ? 'Copied' : copied === 'failed' ? 'Couldn’t copy, use Download' : 'Copy report'}
        </button>
        <button type="button" className="btn btn-plain" onClick={() => download(`${base}.md`, markdown, 'text/markdown')}>
          Download .md
        </button>
        <button
          type="button"
          className="btn btn-plain"
          onClick={() => report && download(`${base}.json`, JSON.stringify(report, null, 2), 'application/json')}
        >
          Download .json
        </button>
      </div>
      <pre className="mt-4 max-h-[55dvh] overflow-auto rounded-2xl border border-line bg-ink-950/60 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-fg-muted">
        {markdown}
      </pre>
    </Sheet>
  )
}
