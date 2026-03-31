const AVATAR_BG = ['#b8d4f0', '#b8e6c8', '#ffd9a8', '#ffc4c4', '#c8c4f0', '#e0c4f0', '#ffc4d8', '#b8e0f0']
const AVATAR_FG = ['#1a5fa0', '#1a7a3a', '#a05a00', '#a02020', '#3a3080', '#6a2080', '#a02050', '#1a6080']

export function avatarColor(name: string): { bg: string; text: string } {
  let h = 0
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0)
  const i = Math.abs(h) % AVATAR_BG.length
  return { bg: AVATAR_BG[i], text: AVATAR_FG[i] }
}
