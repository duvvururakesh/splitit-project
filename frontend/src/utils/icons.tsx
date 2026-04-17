/** Shared icon components - consistent style: strokeWidth 1.75 */

type IconProps = { size?: number }

function baseProps(size = 16) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
}

export function IconPencil({ size = 16 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  )
}

export function IconTrash({ size = 16 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

export function IconReceipt({ size = 16 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  )
}

export function IconUsers({ size = 16 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function IconActivity({ size = 16 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

export function IconUser({ size = 16 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export function IconPlus({ size = 16 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function IconChevronLeft({ size = 16 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

export const iconBtnEdit =
  'w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-caption)] hover:text-[var(--color-apple-blue)] hover:bg-[var(--color-apple-blue-light)] transition-colors'
export const iconBtnDelete =
  'w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-caption)] hover:text-[var(--color-apple-red)] hover:bg-[var(--color-apple-danger-soft)] transition-colors'
