/** Shared icon components — 14×14, strokeWidth 2, consistent across all pages */

export function IconPencil({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    </svg>
  )
}

export function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

/** Standard icon button class strings */
export const iconBtnEdit = 'w-7 h-7 flex items-center justify-center rounded-full text-[#aeaeb2] hover:text-[#0071e3] hover:bg-[#e8f1fb] transition-colors'
export const iconBtnDelete = 'w-7 h-7 flex items-center justify-center rounded-full text-[#aeaeb2] hover:text-[#ff3b30] hover:bg-[#ffe5e5] transition-colors'
