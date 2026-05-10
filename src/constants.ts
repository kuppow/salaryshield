import type { AppSettings, DemoRoleFallback } from './types'

// ─── Wallet addresses ─────────────────────────────────────────────────────────
export const HR_ADDRESS       = '0xEb85c4Ab9e16D9D0A627Df4DE3eB8d47E9de85b1'
export const AUDITOR_ADDRESS  = '0x83897DcaD72563588103803b778b71cB95a4eD32'

export const DEMO_ROLE_FALLBACK: DemoRoleFallback = {
  hr:      HR_ADDRESS,
  auditor: AUDITOR_ADDRESS,
}

// ─── Demo mode ────────────────────────────────────────────────────────────────
export const DEMO_MODE = true

// ─── Chain / contract ────────────────────────────────────────────────────────
export const SEPOLIA_CHAIN_ID     = 11155111
export const USDC_CONTRACT_SEPOLIA = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
export const SS_CONTRACT_SEPOLIA   = '0x0000000000000000000000000000000000000000'

export const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
] as const

// ─── Simulation defaults ──────────────────────────────────────────────────────
export const SIM_INITIAL_USDC    = 10_000.00
export const SIM_INITIAL_SHIELDED = 0.00

// ─── App defaults ────────────────────────────────────────────────────────────
export const DEFAULT_SETTINGS: AppSettings = {
  companyName:    'Fhenix Labs',
  payrollToken:   'cUSDC',
  payPeriod:      'monthly',
  encryptionMode: 'fhe',
  demoMode:       DEMO_MODE,
  network:        'Sepolia Testnet',
  contractAddr:   SS_CONTRACT_SEPOLIA,
}

// ─── Encryption display ──────────────────────────────────────────────────────
export const ENC_PLACEHOLDER = 'enc·0x'
export const enc = (seed: string | number): string =>
  `${ENC_PLACEHOLDER}${Math.abs(Number(seed) * 0x9e3779b9 | 0).toString(16).padStart(4, '0')}...${Math.abs(Number(seed) * 0x6c62272e | 0).toString(16).slice(-2)}`
