# SalaryShield — Confidential Onchain Payroll

## Overview
SalaryShield is a confidential payroll system using Zama's fhEVM. 
Salaries are FHE-encrypted on-chain, only decryptable by authorized wallets.

## How It Works

### Encryption Flow
1. HR adds employee → browser encrypts salary with contract's public key
2. Ciphertext + ZK proof sent to SalaryShield contract
3. Contract stores `euint32` using `FHE.fromExternal()`

### Payroll Processing
1. HR clicks "Process Payroll"
2. Contract performs FHE operations entirely on ciphertexts:
   - `gross = add(salary, bonus)`
   - `net = sub(gross, deductions)`
   - `total = sum(all net amounts)`
   - `le(total, budgetCap)` — encrypted comparison
3. Encrypted payslips stored, only employee can decrypt

### Decryption (Re-encryption)
1. Employee clicks "Decrypt My Payslip"
2. Wallet signs EIP-712 authorization
3. Contract calls `TFHE.reencrypt(salary, publicKey)`
4. KMS re-encrypts under ephemeral key
5. Client decrypts locally

## Smart Contract Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| SalaryShield | `0x54CA5F9e453Db2bb9bfE7F83863CfC5125F9F4D9` |
| USDC | `0x4C424Dc42717EbB6c043c645845E425D4F40fCe0` |
| ConfidentialUSDC (cUSDC) | `0xc4F1991C0394D91AC4ac7021de12F90123FF118a` |

## Tech Stack
- **FHE**: Zama fhEVM / TFHE
- **Blockchain**: Ethereum Sepolia
- **Frontend**: HTML/CSS/JS, ethers.js
- **Wallet**: MetaMask

## Running the Demo
1. Open `salaryshield.html` in browser
2. Connect MetaMask (Sepolia network)
3. The app detects your role automatically

## Role-Based Access
| Role | Access |
|------|--------|
| HR | Full access, auto-decrypt |
| Employee | Payslip only, signs to decrypt |
| Auditor | Dashboard + Reports + Audit Log |

## FHE Operations Used
- `FHE.add()` — gross = salary + bonus
- `FHE.sub()` — net = gross − deductions
- `FHE.sum()` — total payroll
- `FHE.le()` — budget cap check
- `TFHE.reencrypt()` — payslip decryption

## License
MIT
