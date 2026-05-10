import type { TxHistoryEntry } from '../types'
import { appState } from '../state/appState'
import { fmt, parseAmount, formatTs, gel } from '../utils'
import { fetchUSDCBalance } from './wallet'

// ─── Treasury panel ───────────────────────────────────────────────────────────

export async function updateTreasuryPanel(): Promise<void> {
  const el = (id: string, v: string) => { const e = gel(id); if (e) e.textContent = v }

  // USDC balance — from wallet, not hardcoded
  const liveBal = await fetchUSDCBalance()
  if (liveBal === null) {
    el('treasury-usdc-bal', '—')
  } else {
    el('treasury-usdc-bal', fmt(liveBal) + ' USDC')
  }

  // cUSDC pool — only show if revealed
  if (window._treasuryCUSDCRevealed) {
    el('treasury-cusdc-bal', fmt(appState.simShieldedTotal) + ' cUSDC')
  }

  // Payroll obligations
  el('treasury-base-total',  fmt(appState.totalBase))
  el('treasury-bonus-total', fmt(appState.totalBonus))
  el('treasury-net-total',   fmt(appState.totalNet))

  // Runway
  const pool    = (liveBal ?? 0) + appState.simShieldedTotal
  const runway  = appState.totalNet > 0 ? (pool / appState.totalNet).toFixed(1) : '∞'
  el('treasury-runway', runway + ' months')
}

// ─── cUSDC pool decrypt toggle ────────────────────────────────────────────────

export function toggleTreasuryCUSDC(): void {
  window._treasuryCUSDCRevealed = !window._treasuryCUSDCRevealed
  const revealed = window._treasuryCUSDCRevealed ?? false

  const encEl = gel('treasury-cusdc-enc')
  const decEl = gel('treasury-cusdc-dec')
  const btn   = gel('treasury-cusdc-decrypt-btn')

  if (encEl) encEl.style.display = revealed ? 'none' : ''
  if (decEl) decEl.style.display = revealed ? ''     : 'none'

  if (btn) {
    btn.innerHTML = revealed
      ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:-1px;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Encrypt`
      : `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:-1px;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>Decrypt`
  }

  if (revealed) void updateTreasuryPanel()
}

// ─── TX history ───────────────────────────────────────────────────────────────

type TxType = 'payroll' | 'shield' | 'unshield' | 'claim' | 'other'

function classifyTx(title: string): TxType {
  const t = title.toLowerCase()
  if (t.includes('payroll') || t.includes('pay run') || t.includes('salary claim')) return 'payroll'
  if (t.includes('unshield') || t.includes('withdrawal') || t.includes('withdraw'))  return 'unshield'
  if (t.includes('shield'))  return 'shield'
  if (t.includes('claim'))   return 'claim'
  return 'other'
}

const TX_STYLE: Record<TxType, { bg: string; border: string; text: string; label: string }> = {
  payroll:  { bg:'#0d1a14', border:'rgba(0,212,170,0.2)',  text:'var(--ac)',     label:'PAYROLL'  },
  shield:   { bg:'#0d0e1a', border:'rgba(129,140,248,0.2)', text:'var(--indigo)', label:'SHIELD'   },
  unshield: { bg:'#1a0e00', border:'rgba(245,158,11,0.2)', text:'var(--amber)',  label:'UNSHIELD' },
  claim:    { bg:'#0e0d1a', border:'rgba(192,132,252,0.2)',text:'var(--violet)', label:'CLAIM'    },
  other:    { bg:'#06080f', border:'var(--bd-faint)',       text:'var(--tx-mid)', label:'TX'       },
}

export function renderTxHistoryPanel(filterType = 'all'): void {
  const tbody = gel('tx-history-tbody')
  if (!tbody) return

  const allTx = appState.getAllTx()

  // Stats
  const byType = (type: TxType) => allTx.filter(t => classifyTx(t.title) === type)
  const payTx  = byType('payroll')
  const totalDisbursed = payTx.reduce((s, t) => s + parseAmount(t.amount), 0)

  const setEl = (id: string, v: string) => { const e = gel(id); if (e) e.textContent = v }
  setEl('tx-stat-payrolls',  String(payTx.length  || 0))
  setEl('tx-stat-disbursed', fmt(totalDisbursed))
  setEl('tx-stat-shields',   String(byType('shield').length   || 0))
  setEl('tx-stat-unshields', String(byType('unshield').length || 0))

  const filtered = filterType === 'all'
    ? allTx
    : allTx.filter(t => classifyTx(t.title) === filterType as TxType)

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--tx-low);padding:24px;font-family:monospace;font-size:11px;">No transactions recorded yet — run payroll or shield USDC to see entries here</td></tr>`
    return
  }

  tbody.innerHTML = filtered.map(t => {
    const type   = classifyTx(t.title)
    const tc     = TX_STYLE[type]
    const shortW = t.wallet ? t.wallet.slice(0,6) + '...' + t.wallet.slice(-4) : '—'
    const amt    = parseAmount(t.amount)
    const amtStr = amt > 0 ? fmt(amt) : (t.amount ? String(t.amount) : '—')
    const rawSt  = String(t.status ?? 'confirmed').toLowerCase().replace(/[^a-z]/g,'')
    const stLabel = rawSt.includes('sim') ? 'SIMULATED' : rawSt.includes('pend') ? 'PENDING' : 'CONFIRMED'
    const stColor = rawSt.includes('sim') || rawSt.includes('pend') ? 'var(--amber)' : 'var(--ac)'
    const hash   = t.txHash ? `<span style="font-family:monospace;font-size:10px;color:var(--tx-low);">${t.txHash.slice(0,12)}…</span>` : '<span style="color:var(--tx-dim);">—</span>'

    return `<tr>
      <td>${hash}</td>
      <td style="font-family:monospace;font-size:10px;color:var(--tx-mid);">${shortW}</td>
      <td style="text-align:right;font-family:monospace;font-size:11px;color:var(--tx-hi);font-weight:600;">${amtStr}</td>
      <td style="text-align:center;"><span style="background:${tc.bg};border:1px solid ${tc.border};color:${tc.text};font-size:9px;font-family:monospace;padding:3px 7px;border-radius:4px;white-space:nowrap;">${tc.label}</span></td>
      <td style="text-align:center;"><span style="color:${stColor};font-size:9px;font-family:monospace;">${stLabel}</span></td>
      <td style="text-align:right;font-size:10px;color:var(--tx-low);font-family:monospace;">${formatTs(t.ts)}</td>
    </tr>`
  }).join('')
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

export function exportTxHistory(): void {
  const all = appState.getAllTx()
  if (all.length === 0) { alert('No transactions to export'); return }

  const rows = ['TxHash,Wallet,Amount,Title,Status,Timestamp']
  all.forEach(t => {
    rows.push([
      t.txHash ?? '',
      t.wallet ?? '',
      parseAmount(t.amount),
      (t.title ?? '').replace(/,/g, ' '),
      t.status ?? '',
      t.ts ? new Date(t.ts).toISOString() : '',
    ].join(','))
  })

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(blob)
  a.download = 'salaryshield-transactions.csv'
  a.click()
}
