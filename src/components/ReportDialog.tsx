import { useEffect, useMemo, useRef, useState } from 'react'
import { buildReport, reportToMarkdown, type ReportInput } from '../lib/report'

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportDialog({ open, onClose, input }: { open: boolean; onClose: () => void; input: ReportInput }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [copied, setCopied] = useState(false)
  const report = useMemo(() => (open ? buildReport(input) : null), [open, input])
  const markdown = useMemo(() => (report ? reportToMarkdown(report) : ''), [report])

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const base = report ? `astropulse-report-day${report.missionDay}-${report.generatedAt.slice(0, 10)}` : 'report'
  const btn = 'rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5'

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-space-900 p-0 text-slate-100 backdrop:bg-black/70"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-4">
        <div>
          <h2 className="font-semibold">Health report for the flight surgeon</h2>
          <p className="text-xs text-slate-400">Last 7 days. Copy it into a message or download it to send with the next comms pass.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
            onClick={async () => {
              await navigator.clipboard.writeText(markdown)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
          <button type="button" className={btn} onClick={() => download(`${base}.md`, markdown, 'text/markdown')}>
            Download .md
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => report && download(`${base}.json`, JSON.stringify(report, null, 2), 'application/json')}
          >
            Download .json
          </button>
          <button type="button" className={`${btn} text-slate-400`} onClick={onClose} aria-label="Close report">
            ✕
          </button>
        </div>
      </div>
      <pre className="max-h-[70vh] overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-300">
        {markdown}
      </pre>
    </dialog>
  )
}
