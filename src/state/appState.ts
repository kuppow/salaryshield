import type { Employee, PayrollRecord, AuditEvent, AppSettings, TxHistoryEntry, AppState } from '../types'
import { DEFAULT_SETTINGS, SIM_INITIAL_USDC, SIM_INITIAL_SHIELDED } from '../constants'
import { initials, avatarColor, currentPeriod } from '../utils'

// ─── Reactive state ───────────────────────────────────────────────────────────

class AppStateManager {
  // Employees
  employees: Employee[] = this._defaultEmployees()

  // Payroll
  payrollHistory: PayrollRecord[] = []
  nextId = this.employees.length + 1
  nextPayrollId = 1

  // Simulation balances
  simUSDCBalance    = SIM_INITIAL_USDC
  simShieldedTotal  = SIM_INITIAL_SHIELDED

  // TX history keyed by wallet address
  txHistoryByWallet: Record<string, TxHistoryEntry[]> = {}

  // Audit log
  auditLog: AuditEvent[] = []

  // Settings
  settings: AppSettings = { ...DEFAULT_SETTINGS }

  // Payslip unshield state
  unshieldBurned         = false
  unshieldDecrypted      = false
  unshieldPendingAmount  = 0
  lastUnshieldTxHash: string | null = null

  // Current edit context
  currentEditId: number | null = null

  // Wallet
  walletAddress: string | null = null
  currentEditIdBefore: string | null = null

  // ─── Employee helpers ───────────────────────────────────────────────────────

  getEmployee(id: number): Employee | undefined {
    return this.employees.find(e => e.id === id)
  }

  findByWallet(addr: string): Employee | undefined {
    return this.employees.find(e =>
      e.wallet.toLowerCase() === addr.toLowerCase()
    )
  }

  addEmployee(emp: Omit<Employee, 'id' | 'empid' | 'init' | 'avatarColor' | 'hasClaimed' | '_processed' | '_approved'>): Employee {
    const id     = this.nextId++
    const empid  = 'EMP-' + String(id).padStart(3, '0')
    const [bg, fg] = avatarColor(id)
    const newEmp: Employee = {
      ...emp,
      id,
      empid,
      init:        initials(emp.name),
      avatarColor: fg,
      hasClaimed:  false,
      _processed:  false,
      _approved:   false,
    }
    this.employees.push(newEmp)
    return newEmp
  }

  removeEmployee(id: number): void {
    this.employees = this.employees.filter(e => e.id !== id)
  }

  // ─── TX history ─────────────────────────────────────────────────────────────

  appendTxEntry(entry: Omit<TxHistoryEntry, 'ts'> & { wallet?: string }): void {
    const key = (entry.wallet ?? this.walletAddress ?? 'anon').toLowerCase()
    if (!this.txHistoryByWallet[key]) this.txHistoryByWallet[key] = []
    this.txHistoryByWallet[key]!.unshift({ ...entry, ts: Date.now() })
  }

  getAllTx(): (TxHistoryEntry & { wallet: string })[] {
    const all: (TxHistoryEntry & { wallet: string })[] = []
    for (const [wallet, entries] of Object.entries(this.txHistoryByWallet)) {
      for (const e of entries) all.push({ ...e, wallet })
    }
    return all.sort((a, b) => b.ts - a.ts)
  }

  // ─── Payroll ────────────────────────────────────────────────────────────────

  get activeEmployees(): Employee[] {
    return this.employees.filter(e => e.status === 'active' || !e.status)
  }

  get totalBase(): number {
    return this.activeEmployees.reduce((s, e) => s + (e.base || 0), 0)
  }

  get totalBonus(): number {
    return this.activeEmployees.reduce((s, e) => s + (e.bonus || 0), 0)
  }

  get totalDed(): number {
    return this.activeEmployees.reduce((s, e) => s + (e.ded || 0), 0)
  }

  get totalNet(): number {
    return Math.max(0, this.totalBase + this.totalBonus - this.totalDed)
  }

  // ─── State serialization ────────────────────────────────────────────────────

  toJSON(): AppState {
    return {
      employees:      this.employees,
      payrollHistory: this.payrollHistory,
      auditLog:       this.auditLog,
      settings:       this.settings,
      txHistory:      this.txHistoryByWallet,
    }
  }

  // ─── Default data ───────────────────────────────────────────────────────────

  private _defaultEmployees(): Employee[] {
    const defaults = [
      { name:'Alice Chen',    wallet:'0xABCD1234ABCD1234ABCD1234ABCD1234ABCD1234', email:'alice@fhenix.io',  role:'Engineer',  dept:'Engineering', base:8500,  bonus:500,  ded:300,  currency:'cUSDC' as const },
      { name:'Bob Nakamura',  wallet:'0x2345234523452345234523452345234523452345', email:'bob@fhenix.io',    role:'Designer',  dept:'Design',       base:7200,  bonus:400,  ded:250,  currency:'cUSDC' as const },
      { name:'Carol Mbeki',   wallet:'0x3456345634563456345634563456345634563456', email:'carol@fhenix.io',  role:'Moderator', dept:'Community',    base:6000,  bonus:300,  ded:200,  currency:'cUSDC' as const },
      { name:'David Santos',  wallet:'0x4567456745674567456745674567456745674567', email:'david@fhenix.io',  role:'Creator',   dept:'Content',      base:6800,  bonus:350,  ded:220,  currency:'cUSDC' as const },
    ]
    return defaults.map((d, i) => {
      const id    = i + 1
      const [, fg] = avatarColor(id)
      return {
        ...d,
        id,
        empid:       'EMP-' + String(id).padStart(3, '0'),
        init:        initials(d.name),
        avatarColor: fg,
        status:      'active' as const,
        startDate:   '2024-01-15',
        contract:    'full-time' as const,
        vesting:     'cliff' as const,
        tokenGrants: '10,000 FHE',
        address:     '',
        hasClaimed:  false,
        _processed:  false,
        _approved:   false,
      }
    })
  }
}

// Singleton export
export const appState = new AppStateManager()

// Also expose what the old global vars were for easier migration
export function getEmployees(): Employee[] { return appState.employees }
export function setWalletAddress(addr: string | null): void { appState.walletAddress = addr }
export function getWalletAddress(): string | null { return appState.walletAddress }
export function getPeriodLabel(): string { return currentPeriod() }
