import type { Employee, PayrollRecord } from '../types'
import { appState } from '../state/appState'
import { fmt, simTxHash, sleep, currentPeriod } from '../utils'
import { addAuditEvent, toast, fetchUSDCBalance } from './wallet'

// ─── Run payroll ──────────────────────────────────────────────────────────────

export async function runPayroll(periodLabel?: string): Promise<void> {
  const period = periodLabel ?? currentPeriod()
  const active = appState.activeEmployees
  if (active.length === 0) {
    toast('No active employees to pay', true)
    return
  }

  const totalNet   = appState.totalNet
  const totalGross = appState.totalBase + appState.totalBonus

  // Simulate processing delay
  await sleep(1200)

  // Mark all active employees as processed for this period
  active.forEach(e => {
    e._processed = true
    e._approved  = true
    e.hasClaimed = false   // reset — new period
  })

  const txHash = simTxHash('sim')

  const record: PayrollRecord = {
    id:         appState.nextPayrollId++,
    period,
    date:       new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }),
    totalGross,
    totalNet,
    employees:  active.length,
    txHash,
    status:     'confirmed',
  }

  appState.payrollHistory.unshift(record)

  appState.appendTxEntry({
    title:  'Payroll Run · ' + period,
    amount: totalNet,
    txHash,
    status: 'confirmed',
  })

  addAuditEvent('runPayroll()', fmt(totalNet), '#00d4aa', txHash)
  toast('Payroll processed — ' + fmt(totalNet) + ' distributed to ' + active.length + ' employees')

  document.dispatchEvent(new CustomEvent('salaryshield:payroll-complete', { detail: record }))
}

// ─── Claim salary (employee) ──────────────────────────────────────────────────

export async function claimPayout(emp: Employee): Promise<void> {
  if (emp.hasClaimed) {
    toast('Salary already claimed for this period', true)
    return
  }

  const netAmt = Math.max(0, emp.base + emp.bonus - emp.ded)
  if (netAmt <= 0) {
    toast('No balance to claim', true)
    return
  }

  await sleep(1200)

  // Sim: credit wallet
  appState.simUSDCBalance += netAmt
  emp.hasClaimed = true

  const txHash = simTxHash('sim')

  appState.appendTxEntry({
    title:  'Salary Claim · ' + emp.empid,
    amount: netAmt,
    txHash,
    status: 'confirmed',
  })
  addAuditEvent('claimPayout()', emp.empid, '#00d4aa', txHash)

  // Update UI state flags
  window._remainingCUSDC        = 0
  window._cUSDCDepleted         = true
  window._payslipBalanceRevealed = true

  // Refresh balances
  await fetchUSDCBalance()

  const newBal = Math.max(0, appState.simUSDCBalance - appState.simShieldedTotal)
  const displayBal = newBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  _updatePostClaimUI(displayBal)

  document.dispatchEvent(new CustomEvent('salaryshield:claim-complete', {
    detail: { amount: netAmt, txHash, emp }
  }))

  toast('Salary claimed — ' + fmt(netAmt) + ' USDC sent to wallet')
}

// ─── Unshield claim ───────────────────────────────────────────────────────────

export async function doUnshieldClaim(claimed: number, burnTxHash: string | null): Promise<void> {
  await sleep(1000)

  // Credit wallet — move from shielded to USDC
  appState.simShieldedTotal = Math.max(0, appState.simShieldedTotal - claimed)
  appState.simUSDCBalance  += claimed

  window._payslipBalanceRevealed = true

  const freshBal = await fetchUSDCBalance()
  const displayBal = (freshBal !== null
    ? freshBal
    : Math.max(0, appState.simUSDCBalance - appState.simShieldedTotal)
  ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const unshieldEl = document.getElementById('unshield-usdc-bal')
  if (unshieldEl) unshieldEl.textContent = displayBal + ' USDC in wallet'
  const wdEl = document.getElementById('wd-usdc-balance')
  if (wdEl) wdEl.textContent = displayBal + ' USDC'

  appState.appendTxEntry({
    title:  'Withdrawal · cUSDC → USDC',
    amount: claimed,
    txHash: burnTxHash ?? simTxHash('sim'),
    status: burnTxHash && !burnTxHash.startsWith('sim:') ? 'confirmed' : 'simulated',
  })

  addAuditEvent('unshieldClaim(' + fmt(claimed) + ')', 'wallet', '#34d399')

  const availLbl = document.getElementById('cusdc-withdraw-available')
  if (availLbl) {
    window._cUSDCDepleted = true
    window._remainingCUSDC = 0
    availLbl.innerHTML = '<span style="color:var(--ac);font-family:\'IBM Plex Mono\',monospace;font-size:10px;">0.00 cUSDC available</span>'
  }

  document.dispatchEvent(new CustomEvent('salaryshield:treasury-update'))
  document.dispatchEvent(new CustomEvent('salaryshield:txhistory-update'))
}

// ─── Post-claim UI update ────────────────────────────────────────────────────

export function _updatePostClaimUI(displayBal: string): void {
  const usdcBalEl = document.getElementById('unshield-usdc-bal')
  if (usdcBalEl) usdcBalEl.textContent = displayBal + ' USDC in wallet'

  const availLbl = document.getElementById('cusdc-withdraw-available')
  if (availLbl) availLbl.innerHTML = '<span style="color:var(--ac);font-family:\'IBM Plex Mono\',monospace;font-size:10px;">0.00 cUSDC available</span>'

  const plainBal = document.getElementById('cusdc-plain-balance')
  if (plainBal) plainBal.textContent = '$0.00 cUSDC'

  const equiv = document.getElementById('cusdc-equiv-usdc')
  if (equiv) equiv.textContent = '$0.00'

  const wInput = document.getElementById('cusdc-withdraw-amount') as HTMLInputElement | null
  if (wInput) { wInput.value = ''; wInput.max = '0'; wInput.disabled = true }
}

// ─── Payroll history ─────────────────────────────────────────────────────────

export function buildPayrollHistoryTable(): void {
  const tbody = document.getElementById('payroll-history-tbody')
  if (!tbody) return
  if (appState.payrollHistory.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--tx-low);padding:24px;font-size:12px;">No payroll runs yet</td></tr>'
    return
  }
  tbody.innerHTML = appState.payrollHistory.map(r => `
    <tr>
      <td style="font-family:monospace;font-size:10px;">${r.txHash.slice(0,12)}…</td>
      <td>${r.period}</td>
      <td style="text-align:right;font-family:monospace;">${fmt(r.totalNet)}</td>
      <td style="text-align:center;">${r.employees}</td>
      <td style="text-align:center;">
        <span style="color:var(--ac);font-size:10px;font-family:monospace;">${r.status.toUpperCase()}</span>
      </td>
      <td style="text-align:right;font-size:11px;color:var(--tx-low);">${r.date}</td>
    </tr>
  `).join('')
}
