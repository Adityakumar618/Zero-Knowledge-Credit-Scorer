# zk-credit-dev1

AI prompt and signature logic for the ZK-Credit Scorer on the Midnight blockchain.

## What this does

1. Sends 6 months of mock financial data to **Gemini 1.5 Flash**, which returns a structured credit score JSON.
2. Signs the JSON with an **RSA-2048 private key** (SHA256) to produce a tamper-proof credential.
3. Packages the result into three output sections consumed by the rest of the ZK pipeline:
   - **for_compact_contract** — inputs for the Midnight Compact smart contract (Dev 2)
   - **public_state** — on-chain visible data (Dev 3 / frontend)
   - **private_state** — kept in the ZK proof, never revealed on-chain (Dev 3)

## Setup

```bash
npm install
```

Add your Gemini API key to `.env`:

```
GEMINI_API_KEY=your_actual_key_here
```

## Running

| Command | What it does |
|---------|-------------|
| `npm test` | Runs the full test suite — **no API key needed** |
| `npm start` | Runs the full pipeline with a live Gemini API call |

## Output files

| File | Description |
|------|-------------|
| `output.json` | Main output: three sections for Compact contract, public state, private state |
| `verifiable_credential.json` | Full VC object with proof, for Dev 3 |
| `mock_bank_private.pem` | RSA private key — **never share** |
| `mock_bank_public.pem` | RSA public key — share with Dev 2 and Dev 3 |
| `test_output.json` | Test run artifacts |

## Handoff

**→ Dev 2 (Compact contract on Midnight):**
- `output.json` → use the `for_compact_contract` section
- `mock_bank_public.pem` → for on-chain signature verification

**→ Dev 3 (ZK proof / frontend):**
- `output.json` → all three sections
- `verifiable_credential.json` → full VC with proof

## CRITICAL: JSON serialization rule

The signature is always computed over:

```js
JSON.stringify(scoreData)   // compact, no spaces, no formatting
```

**Never reformat this string before passing it to the Compact contract.**  
Any whitespace change will invalidate the signature and break ZK proof verification.

The `signed_payload` field in `output.json` and `verifiable_credential.json` contains the exact string that was signed — use it as-is.
