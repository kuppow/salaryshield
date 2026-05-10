// ─── Core domain types ────────────────────────────────────────────────────────

export type EmployeeStatus = 'active' | 'onleave' | 'inactive'
export type ContractType   = 'full-time' | 'part-time' | 'contractor'
export type TokenGrant     = 'none' | 'cliff' | 'vesting'
export type Currency       = 'USDC' | 'cUSDC'
export type UserRole       = 'hr' | 'employee' | 'auditor' | 'unauthorized'

export interface Employee {
  id:          number
  empid:       string
  name:        string
  init:        string
  wallet:      string
  email:       string
  role:        string
  dept:        string
  base:        number
  bonus:       number
  ded:         number
  currency:    Currency
  status:      EmployeeStatus
  startDate:   string
  contract:    ContractType
  vesting:     TokenGrant
  tokenGrants: string
  address:     string
  hasClaimed:  boolean
  _processed:  boolean
  _approved:   boolean
  // Encrypted display values
  encBase?:    string
  encBonus?:   string
  encDed?:     string
  encNet?:     string
  avatarColor?: string
}

export interface PayrollRecord {
  id:         number
  period:     string
  date:       string
  totalGross: number
  totalNet:   number
  employees:  number
  txHash:     string
  status:     'pending' | 'processing' | 'confirmed' | 'failed'
}

export interface TxHistoryEntry {
  title:   string
  amount:  number | string
  txHash:  string
  status:  string
  ts:      number
  wallet?: string
}

export interface KeyHolderState {
  hr?:     { addr: string; name: string }
  auditor?: { addr: string; name: string }
  employee?: { addr: string; name: string }
}

export interface AuditEvent {
  action:    string
  actor:     string
  color:     string
  timestamp: number
  txHash?:   string
}

export interface DemoRoleFallback {
  hr:      string
  auditor: string
}

// ─── Payslip ─────────────────────────────────────────────────────────────────

export interface PayslipData {
  name:       string
  empid:      string
  period:     string
  base:       number
  bonus:      number
  ded:        number
  net:        number
  currency:   Currency
  wallet:     string
  dept:       string
  role:       string
  startDate:  string
  hasClaimed: boolean
}

// ─── Claim modal ─────────────────────────────────────────────────────────────

export interface ClaimSuccessOptions {
  amount: string
  txHash: string | null
  isReal: boolean
}

// ─── Wallet / chain ──────────────────────────────────────────────────────────

export interface WalletState {
  address:   string | null
  role:      UserRole | null
  connected: boolean
  network:   string
  chainId:   number | null
}

export interface BalanceSnapshot {
  usdc:   number
  cusdc:  number
  ts:     number
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface AppSettings {
  companyName:    string
  payrollToken:   string
  payPeriod:      'monthly' | 'biweekly' | 'weekly'
  encryptionMode: 'fhe' | 'symmetric'
  demoMode:       boolean
  network:        string
  contractAddr:   string
}

// ─── State cache ─────────────────────────────────────────────────────────────

export interface CacheEntry {
  ts:    number
  state: unknown
}

export interface AppState {
  employees:      Employee[]
  payrollHistory: PayrollRecord[]
  auditLog:       AuditEvent[]
  settings:       AppSettings
  txHistory:      Record<string, TxHistoryEntry[]>
}

// ─── Ethereum window extension ────────────────────────────────────────────────

export interface EthereumProvider {
  request:       (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on:            (event: string, handler: (...args: unknown[]) => void) => void
  removeListener:(event: string, handler: (...args: unknown[]) => void) => void
  isMetaMask?:   boolean
  selectedAddress?: string | null
  chainId?:      string
}

declare global {
  interface Window {
    ethereum?:               EthereumProvider
    ethers?:                 unknown
    currentUserRole?:        UserRole | null
    isHRAutoDecrypt?:        boolean
    _remainingCUSDC?:        number
    _cUSDCDepleted?:         boolean
    _budgetDecryptAuthorised?:boolean
    _payslipBalanceRevealed?:boolean
    _treasuryCUSDCRevealed?: boolean
    _matchedDemoEmp?:        Employee | null
    keyHolderState?:         KeyHolderState
  }
}
