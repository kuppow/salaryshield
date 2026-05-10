import type { Employee } from '../types'
import { appState } from '../state/appState'
import { fmt, gel, shortAddr, initials, isValidAddress, avatarColor } from '../utils'
import { toast, addAuditEvent } from './wallet'
import { enc } from '../constants'

// ─── Render employee table ─────────────────────────────────────────────────────

export function renderEmployees(filter?: { search?: string; role?: string; status?: string }): void {
  const tbody = gel('emp-tbody')
  if (!tbody) return

  let list = appState.employees
  if (filter?.search) {
    const q = filter.search.toLowerCase()
    list = list.filter(e => e.name.toLowerCase().includes(q) || e.wallet.toLowerCase().includes(q))
  }
  if (filter?.role)   list = list.filter(e => e.role === filter.role)
  if (filter?.status) list = list.filter(e => e.status === filter.status)

  const countEl = gel('emp-count-label')
  if (countEl) countEl.textContent = `${list.length} employee${list.length !== 1 ? 's' : ''}`

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--tx-low);padding:32px;font-size:12px;">No employees found</td></tr>'
    return
  }

  tbody.innerHTML = list.map((e, i) => {
    const [bg, fg] = avatarColor(e.id)
    const isDecrypted = window.isHRAutoDecrypt
    const salaryDisplay = isDecrypted
      ? `<span style="font-family:monospace;font-weight:700;color:var(--tx-hi);">${fmt(e.base)}</span>`
      : `<span class="ss-enc-val">${enc(e.base)}</span>`
    const claimedBadge = e.hasClaimed
      ? ' <span style="color:var(--ac);font-size:10px;">✓ Claimed</span>'
      : ''

    return `
      <tr>
        <td style="padding-left:16px;color:var(--tx-low);font-size:11px;">${i + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="ss-avatar" style="background:${bg};color:${fg};">${e.init}</div>
            <div>
              <div style="font-weight:600;color:var(--tx-hi);font-size:12px;">${e.name}${claimedBadge}</div>
              <div style="font-family:monospace;font-size:10px;color:var(--tx-low);">${shortAddr(e.wallet)}</div>
            </div>
          </div>
        </td>
        <td style="font-family:monospace;font-size:11px;color:var(--tx-mid);">${e.empid}</td>
        <td>
          <div style="font-size:12px;color:var(--tx-mid);">${e.role}</div>
          <span class="ss-dept-badge ${_deptClass(e.dept)}">${e.dept}</span>
        </td>
        <td style="font-size:11px;color:var(--tx-low);">${e.address || '—'}</td>
        <td>${salaryDisplay}</td>
        <td><span class="ss-status-active">${e.status ?? 'active'}</span></td>
        <td style="padding-right:16px;">
          <div style="display:flex;gap:6px;">
            <button class="ss-btn-ghost" style="font-size:10px;padding:4px 10px;" onclick="openEditPanel(${e.id})">Edit</button>
            <button class="ss-btn-ghost" style="font-size:10px;padding:4px 10px;color:var(--red);border-color:var(--red)22;" onclick="confirmDeleteEmployee(${e.id})">Remove</button>
          </div>
        </td>
      </tr>
    `
  }).join('')
}

function _deptClass(dept: string): string {
  const d = dept.toLowerCase()
  if (d.includes('eng')) return 'ss-dept-eng'
  if (d.includes('des')) return 'ss-dept-des'
  return 'ss-dept-mod'
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export function updateEmployeeStats(reveal = false): void {
  const headEl = gel('stat-headcount')
  const utilEl = gel('stat-util')
  if (headEl) headEl.textContent = String(appState.activeEmployees.length)

  // Simple util: net payroll vs a cap of $50k
  const cap = 50_000
  const util = Math.min(100, Math.round((appState.totalNet / cap) * 100))
  if (utilEl) utilEl.textContent = util + '%'

  if (reveal) {
    const bonusEncEl = gel('stat-bonus-enc')
    const bonusDecEl = gel('stat-bonus-dec')
    const bonusValEl = gel('stat-bonus-val')
    if (bonusEncEl) bonusEncEl.style.display = 'none'
    if (bonusDecEl) bonusDecEl.style.display = ''
    if (bonusValEl) bonusValEl.textContent = fmt(appState.totalBonus)

    const netEncEl = gel('stat-net-enc')
    const netDecEl = gel('stat-net-dec')
    const netValEl = gel('stat-net-val')
    if (netEncEl) netEncEl.style.display = 'none'
    if (netDecEl) netDecEl.style.display = ''
    if (netValEl) netValEl.textContent = fmt(appState.totalNet)

    const dedEncEl = gel('stat-ded-enc')
    const dedDecEl = gel('stat-ded-dec')
    const dedValEl = gel('stat-ded-val')
    if (dedEncEl) dedEncEl.style.display = 'none'
    if (dedDecEl) dedDecEl.style.display = ''
    if (dedValEl) dedValEl.textContent = fmt(appState.totalDed)
  }
}

// ─── Validate wallet input ────────────────────────────────────────────────────

export function validateWalletInput(
  inputId: string,
  statusId: string,
  excludeId?: number
): boolean {
  const inp    = gel(inputId) as HTMLInputElement | null
  const status = gel(statusId)
  if (!inp || !status) return false
  const v = inp.value.trim()

  if (!v) {
    status.style.color = 'var(--tx-low)'; status.textContent = ''
    inp.style.borderColor = ''
    return false
  }

  if (!isValidAddress(v)) {
    status.style.color = 'var(--amber)'; status.textContent = '⚠ Must be a valid 0x Ethereum address'
    inp.style.borderColor = 'rgba(245,158,11,0.4)'
    return false
  }

  const duplicate = appState.employees.find(e =>
    e.wallet.toLowerCase() === v.toLowerCase() && e.id !== excludeId
  )
  if (duplicate) {
    status.style.color = 'var(--red)'
    status.textContent = `✗ Already assigned to ${duplicate.name} (${duplicate.empid})`
    inp.style.borderColor = 'rgba(248,113,113,0.4)'
    return false
  }

  status.style.color = 'var(--ac)'
  status.textContent = '✓ Valid — payroll will send to this wallet'
  inp.style.borderColor = 'var(--ac-bd)'
  return true
}

// ─── Delete employee ─────────────────────────────────────────────────────────

export function deleteEmployee(id: number): void {
  const emp = appState.getEmployee(id)
  if (!emp) return
  appState.removeEmployee(id)
  addAuditEvent('removeEmployee(' + emp.empid + ')', emp.name, 'var(--red)')
  renderEmployees()
  updateEmployeeStats()
  toast(`${emp.name} removed from payroll`)
}
