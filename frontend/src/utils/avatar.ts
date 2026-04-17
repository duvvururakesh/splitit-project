const AVATAR_BG = [
  'var(--color-avatar-bg-1)',
  'var(--color-avatar-bg-2)',
  'var(--color-avatar-bg-3)',
  'var(--color-avatar-bg-4)',
  'var(--color-avatar-bg-5)',
  'var(--color-avatar-bg-6)',
  'var(--color-avatar-bg-7)',
  'var(--color-avatar-bg-8)',
]

const AVATAR_FG = [
  'var(--color-avatar-fg-1)',
  'var(--color-avatar-fg-2)',
  'var(--color-avatar-fg-3)',
  'var(--color-avatar-fg-4)',
  'var(--color-avatar-fg-5)',
  'var(--color-avatar-fg-6)',
  'var(--color-avatar-fg-7)',
  'var(--color-avatar-fg-8)',
]

export function avatarColor(name: string): { bg: string; text: string } {
  let h = 0
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0)
  const i = Math.abs(h) % AVATAR_BG.length
  return { bg: AVATAR_BG[i], text: AVATAR_FG[i] }
}
