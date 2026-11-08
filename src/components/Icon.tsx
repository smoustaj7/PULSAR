import type { SVGProps } from 'react'

/** 24px stroke icons, drawn on one grid so they share weight and optical size. */
const PATHS = {
  overview: 'M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-3H4v3Zm10-13h6V4h-6v3Z',
  trends: 'M3 17l5-6 4 3 5-7 4 4M3 21h18',
  manual: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15ZM4 20.5A2.5 2.5 0 0 0 6.5 23H20M8 7h8M8 11h6',
  resources: 'M12 3 3 8h18l-9-5ZM5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18',
  plus: 'M12 5v14M5 12h14',
  send: 'M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z',
  close: 'M6 6l12 12M18 6 6 18',
  chevron: 'M9 6l6 6-6 6',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alert: 'M12 4 2.5 20h19L12 4Zm0 6v4m0 3v.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-11v6m0-9v.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 2',
  doc: 'M14 3H6v18h12V7l-4-4Zm0 0v4h4M9 13h6M9 17h6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, className = 'size-5', ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
