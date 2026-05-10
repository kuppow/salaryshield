// ─── Formatting ──────────────────────────────────────────────────────────────

export function fmt(n: number, decimals = 2): string {
  return '$' + n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtNum(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────

export function gel(id: string): HTMLElement | null {
  return document.getElementById(id)
}

export function gelAs<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null
}

export function qs<T extends Element = Element>(
  selector: string,
  parent: Document | Element = document
): T | null {
  return parent.querySelector<T>(selector)
}

export function qsa<T extends Element = Element>(
  selector: string,
  parent: Document | Element = document
): T[] {
  return Array.from(parent.querySelectorAll<T>(selector))
}

// ─── Type guards ─────────────────────────────────────────────────────────────

export function isHTMLInput(el: HTMLElement | null): el is HTMLInputElement {
  return el instanceof HTMLInputElement
}

export function isHTMLSelect(el: HTMLElement | null): el is HTMLSelectElement {
  return el instanceof HTMLSelectElement
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{6,40}$/.test(addr) || addr.includes('...')
}

// ─── Time ────────────────────────────────────────────────────────────────────

export function formatTs(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

export function currentPeriod(): string {
  const d = new Date()
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

// ─── Color ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  ['#0d1a14','#00d4aa'],
  ['#0d0e1a','#818cf8'],
  ['#1a0e00','#f59e0b'],
  ['#0e0d1a','#c084fc'],
  ['#1a0a0a','#f87171'],
  ['#0a1a14','#34d399'],
]

export function avatarColor(id: number): [string, string] {
  const entry = AVATAR_COLORS[id % AVATAR_COLORS.length]
  return entry ? [entry[0], entry[1]] : ['#060810', '#00d4aa']
}

// ─── Async helpers ───────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function randomHex(bytes = 16): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function simTxHash(prefix = 'sim'): string {
  return `${prefix}:0x${Date.now().toString(16)}${randomHex(8)}`
}

// ─── Parse ───────────────────────────────────────────────────────────────────

export function parseAmount(v: string | number | undefined | null): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return v
  return parseFloat(String(v).replace(/[^0-9.]/g, '')) || 0
}
