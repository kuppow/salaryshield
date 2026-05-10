/**
 * SalaryShield TypeScript Layer
 *
 * Runs AFTER the original inline JS in index.html.
 * Does NOT reimplement existing functions — wraps them with typed
 * interfaces, syncs typed state, and installs typed module overrides.
 */

import type { Employee, UserRole, TxHistoryEntry } from './types'
import { appState }         from './state/appState'
import { updateTreasuryPanel, toggleTreasuryCUSDC, renderTxHistoryPanel, exportTxHistory } from './modules/treasury'
import { fmt, shortAddr, parseAmount } from './utils'

// ─── Wait for original JS to initialize ──────────────────────────────────────

function onAppReady(cb: () => void): void {
  if (document.readyState === 'complete') {
    setTimeout(cb, 150)
  } else {
    window.addEventListener('load', () => setTimeout(cb, 150))
  }
}

// ─── Additional window declarations (supplements types/index.ts) ─────────────

declare global {
  interface Window {
    // Original JS globals not in types/index.ts
    employees:              import('./types').Employee[]
    walletAddress:          string | null
    simUSDCBalance:         number
    simShieldedTotal:       number
    txHistoryByWallet:      Record<string, import('./types').TxHistoryEntry[]>
    nextId:                 number
    DEMO_MODE:              boolean
    HR_ADDRESS:             string
    AUDITOR_ADDRESS:        string
    setTab:                 (tab: string, btn?: Element | null) => void
    updateTreasuryPanel:    () => Promise<void>
    renderTxHistoryPanel:   (filter?: string) => void
    toggleTreasuryCUSDC:    () => void
    exportTxHistory:        () => void
    fetchUSDCBalance:       () => Promise<number | null>
    toast:                  (msg: string, isError?: boolean) => void
  }
}

// ─── Sync typed state from JS globals ────────────────────────────────────────

function syncState(): void {
  if (window.employees)             appState.employees         = window.employees
  if (window.simUSDCBalance != null) appState.simUSDCBalance   = window.simUSDCBalance
  if (window.simShieldedTotal != null) appState.simShieldedTotal = window.simShieldedTotal
  if (window.walletAddress !== undefined) appState.walletAddress = window.walletAddress
  if (window.txHistoryByWallet)     appState.txHistoryByWallet = window.txHistoryByWallet
  if (window.nextId)                appState.nextId            = window.nextId
}

// ─── Install typed module overrides ──────────────────────────────────────────

function installOverrides(): void {
  window.updateTreasuryPanel  = updateTreasuryPanel
  window.renderTxHistoryPanel = renderTxHistoryPanel
  window.toggleTreasuryCUSDC  = toggleTreasuryCUSDC
  window.exportTxHistory      = exportTxHistory
}

// ─── Event sync ──────────────────────────────────────────────────────────────

function bindListeners(): void {
  document.addEventListener('salaryshield:treasury-update', () => {
    syncState(); void updateTreasuryPanel()
  })
  document.addEventListener('salaryshield:txhistory-update', () => {
    syncState(); renderTxHistoryPanel()
  })
  document.addEventListener('salaryshield:payroll-complete', () => syncState())
}

// ─── Dev helpers ─────────────────────────────────────────────────────────────

function exposeDevHelpers(): void {
  ;(window as unknown as Record<string, unknown>)['SS'] = {
    state:        appState,
    syncState,
    fmt,
    shortAddr,
    parseAmount,
    getEmployees: () => window.employees,
    getRole:      () => window.currentUserRole,
    getBalance:   () => window.simUSDCBalance,
    getShielded:  () => window.simShieldedTotal,
    version:      '2.0.0-ts',
  }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

onAppReady(() => {
  syncState()
  installOverrides()
  bindListeners()
  exposeDevHelpers()
  console.info('[SalaryShield TS] Layer initialized — type SS in console for helpers')
})
