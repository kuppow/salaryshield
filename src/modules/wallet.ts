import type { ethers as EthersType } from 'ethers'
import type { UserRole, EthereumProvider } from '../types'
import { HR_ADDRESS, AUDITOR_ADDRESS, DEMO_ROLE_FALLBACK, DEMO_MODE, USDC_CONTRACT_SEPOLIA, USDC_ABI } from '../constants'
import { appState, setWalletAddress } from '../state/appState'
import { shortAddr, simTxHash, sleep } from '../utils'

// ─── Role detection ───────────────────────────────────────────────────────────

export function detectRole(addr: string): UserRole {
  const a = addr.toLowerCase()
  let role: UserRole = 'unauthorized'

  // Step 1: HR check
  if (a === HR_ADDRESS.toLowerCase()) {
    return 'hr'
  }

  // Step 2: Auditor check FIRST (before employee list)
  const auditorAddr = (window.keyHolderState?.auditor?.addr ?? AUDITOR_ADDRESS ?? '').toLowerCase()
  const isAuditor = auditorAddr && auditorAddr !== '0x0000...0000' && (
    a === auditorAddr ||
    (auditorAddr.includes('...') &&
      a.startsWith(auditorAddr.slice(0, 6)) &&
      a.endsWith(auditorAddr.slice(-4)))
  )

  if (isAuditor || a === AUDITOR_ADDRESS.toLowerCase()) {
    return 'auditor'
  }

  // Step 3: Employee list (only if not auditor)
  if (a !== AUDITOR_ADDRESS.toLowerCase()) {
    const match = appState.employees.find(e =>
      e.wallet &&
      e.wallet.toLowerCase() === a &&
      e.wallet.toLowerCase() !== HR_ADDRESS.toLowerCase()
    )
    if (match) {
      role = 'employee'
      window._matchedDemoEmp = match
    }
  }

  // Step 4: DEMO_MODE fallback
  if (role === 'unauthorized' && DEMO_MODE) {
    if (a === DEMO_ROLE_FALLBACK.hr.toLowerCase()) return 'hr'
    if (a === AUDITOR_ADDRESS.toLowerCase() ||
        a === DEMO_ROLE_FALLBACK.auditor?.toLowerCase()) return 'auditor'
    return 'employee'
  }

  return role
}

// ─── USDC balance ────────────────────────────────────────────────────────────

export async function fetchUSDCBalance(): Promise<number | null> {
  const addr = appState.walletAddress
  if (!window.ethereum || !addr) return null

  try {
    const ethers = window.ethers as typeof EthersType | undefined
  if (!ethers) return null
    const provider = new ethers.BrowserProvider(window.ethereum as never)
    const usdc = new ethers.Contract(USDC_CONTRACT_SEPOLIA, USDC_ABI, provider)
    const [raw, dec]: [bigint, number] = await Promise.all([
      (usdc['balanceOf'] as (addr: string) => Promise<bigint>)(addr),
      (usdc['decimals'] as () => Promise<number>)()
    ])
    const real   = parseFloat(ethers.formatUnits(raw, dec))
    const adjBal = Math.max(0, real - appState.simShieldedTotal)
    _updateBalanceUI(adjBal)
    return adjBal
  } catch {
    // Simulation fallback
    const adjBal = Math.max(0, appState.simUSDCBalance - appState.simShieldedTotal)
    _updateBalanceUI(adjBal)
    return adjBal
  }
}

function _updateBalanceUI(adjBal: number): void {
  const display = adjBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const wdEl = document.getElementById('wd-usdc-balance')
  if (wdEl) wdEl.textContent = display + ' USDC'
  // Only update payslip label if already revealed
  if (window._payslipBalanceRevealed) {
    const unshieldEl = document.getElementById('unshield-usdc-bal')
    if (unshieldEl) unshieldEl.textContent = display + ' USDC in wallet'
  }
  const shieldAvail = document.getElementById('shield-usdc-avail')
  if (shieldAvail) shieldAvail.textContent = display + ' USDC available'
  const wInput = document.getElementById('shield-usdc-amount') as HTMLInputElement | null
  if (wInput) wInput.max = String(adjBal)
}

// ─── Shield (USDC → cUSDC) ───────────────────────────────────────────────────

export async function shieldUSDC(amount: number): Promise<boolean> {
  if (amount <= 0) return false
  const addr = appState.walletAddress
  if (!addr) return false

  try {
    const ethers2 = window.ethers as typeof EthersType | undefined
    if (ethers2 && window.ethereum) {
      const provider = new ethers2.BrowserProvider(window.ethereum as never)
      const signer   = await provider.getSigner()
      const usdc     = new ethers2.Contract(USDC_CONTRACT_SEPOLIA, USDC_ABI, signer)
      const decimals = await (usdc['decimals'] as () => Promise<number>)()
      const amt      = ethers2.parseUnits(amount.toString(), decimals)
      const tx       = await (usdc['transfer'] as (to: string, amt: bigint) => Promise<{ wait(): Promise<unknown> }>)(
        addr, amt
      )
      await tx.wait()
      appState.simShieldedTotal += amount
      return true
    }
  } catch {
    // Sim fallback
  }
  appState.simShieldedTotal += amount
  return false
}

// ─── Connect / disconnect ────────────────────────────────────────────────────

export async function connectWallet(): Promise<string | null> {
  const eth = window.ethereum as EthereumProvider | undefined
  if (!eth) {
    toast('MetaMask not detected — install it to connect a real wallet', true)
    return null
  }
  try {
    const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[]
    const addr = accounts[0] ?? null
    if (addr) {
      setWalletAddress(addr)
      await fetchUSDCBalance()
    }
    return addr
  } catch {
    return null
  }
}

export function disconnectWallet(): void {
  setWalletAddress(null)
  window.currentUserRole        = null
  window.isHRAutoDecrypt        = false
  window._remainingCUSDC        = undefined
  window._cUSDCDepleted         = false
  window._budgetDecryptAuthorised = false
  window._payslipBalanceRevealed  = false
  window._treasuryCUSDCRevealed   = false
  document.body.classList.remove('hr-mode','employee-mode','auditor-mode','unauthorized-mode')
  document.body.classList.add('wallet-locked')
  _resetAuditorUI()
}

function _resetAuditorUI(): void {
  const ids = ['auditor-decrypt-panel','auditor-decrypt-results','compliance-section','tx-history-treasury-section']
  ids.forEach(id => {
    const el = document.getElementById(id)
    if (el) el.style.display = 'none'
  })
  const keyInput = document.getElementById('auditor-key-input') as HTMLInputElement | null
  if (keyInput) keyInput.value = ''
}

// ─── Toast helper (re-exported for modules that need it) ─────────────────────

export function toast(msg: string, isError = false): void {
  const existing = document.getElementById('ss-toast')
  if (existing) existing.remove()
  const el = document.createElement('div')
  el.id = 'ss-toast'
  el.className = 'toast' + (isError ? ' error' : ' success')
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 3500)
}

// ─── Audit log ───────────────────────────────────────────────────────────────

export function addAuditEvent(action: string, actor: string, color = '#00d4aa', txHash?: string): void {
  appState.auditLog.unshift({ action, actor, color, timestamp: Date.now(), txHash })
  renderAuditLog()
}

function renderAuditLog(): void {
  const tbody = document.getElementById('audit-tbody')
  if (!tbody) return
  tbody.innerHTML = appState.auditLog.slice(0, 100).map(e => `
    <tr>
      <td style="font-family:monospace;font-size:10px;color:${e.color};">${e.action}</td>
      <td style="font-family:monospace;font-size:10px;">${e.actor}</td>
      <td style="font-size:10px;color:var(--tx-low);">${new Date(e.timestamp).toLocaleTimeString()}</td>
    </tr>
  `).join('')
}

// ─── Simulate shield wrap ────────────────────────────────────────────────────

export async function doShieldWrap(amount: number): Promise<void> {
  await sleep(800)
  const ok = await shieldUSDC(amount)
  appState.appendTxEntry({
    title:  'Shield · USDC → cUSDC',
    amount,
    txHash: simTxHash('sim·'),
    status: ok ? 'confirmed' : 'simulated',
  })
  await fetchUSDCBalance()
  // Treasury update dispatched via event so we don't import UI from here
  document.dispatchEvent(new CustomEvent('salaryshield:treasury-update'))
  document.dispatchEvent(new CustomEvent('salaryshield:txhistory-update'))
  addAuditEvent('shieldUSDC(' + amount + ')', shortAddr(appState.walletAddress ?? ''), '#818cf8')
}
