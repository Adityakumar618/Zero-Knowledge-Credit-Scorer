import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import forge from 'node-forge';
import fs from 'fs';
import crypto from 'crypto';

dotenv.config();

// ─── Step 1: Mock Financial Data ──────────────────────────────────────────────
const financialData = {
  user_id: 'user_001',
  months: [
    { month: 'Nov 2024', income: 5200, expenses: 3800, debt_payment: 420 },
    { month: 'Dec 2024', income: 5200, expenses: 4100, debt_payment: 420 },
    { month: 'Jan 2025', income: 5400, expenses: 3950, debt_payment: 420 },
    { month: 'Feb 2025', income: 5400, expenses: 3700, debt_payment: 420 },
    { month: 'Mar 2025', income: 5600, expenses: 3600, debt_payment: 420 },
    { month: 'Apr 2025', income: 5600, expenses: 3750, debt_payment: 420 },
  ],
  total_debt: 18500,
  late_payments: 0,
};

// ─── Step 2: Call Gemini 1.5 Flash ────────────────────────────────────────────
async function getCreditScore(data) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not set in .env');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a credit scoring AI. Analyze the financial data below and return ONLY raw JSON with no markdown, no code fences, no explanation.

Financial Data:
${JSON.stringify(data, null, 2)}

Return exactly this JSON structure (fill in computed values):
{
  "user_id": "${data.user_id}",
  "credit_score": <integer 300-850>,
  "average_monthly_balance": <number: average of (income - expenses - debt_payment) per month>,
  "debt_to_income_ratio": <number: total_debt / (sum of all monthly incomes), rounded to 4 decimals>,
  "late_payments": ${data.late_payments},
  "risk_level": "<LOW if score>=700, MEDIUM if score 600-699, HIGH if score<600>",
  "score_breakdown": {
    "payment_history": <integer out of 35, higher if fewer late payments>,
    "debt_ratio": <integer out of 30, higher if lower debt-to-income>,
    "average_balance": <integer out of 35, higher if higher average balance>
  },
  "timestamp": "<current ISO 8601 timestamp>"
}

Rules:
- Return ONLY the raw JSON object. No markdown. No backticks. No explanation.
- All numbers must be actual computed values, not placeholders.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip any accidental markdown fences
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

// ─── Step 3: RSA Key Pair (reuse if exists) ───────────────────────────────────
function getOrCreateKeyPair() {
  const privPath = 'mock_bank_private.pem';
  const pubPath = 'mock_bank_public.pem';

  if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
    console.log('  Reusing existing RSA key pair.');
    return {
      privateKey: fs.readFileSync(privPath, 'utf8'),
      publicKey: fs.readFileSync(pubPath, 'utf8'),
    };
  }

  console.log('  Generating new RSA-2048 key pair...');
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
  const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);

  fs.writeFileSync(privPath, privateKeyPem);
  fs.writeFileSync(pubPath, publicKeyPem);
  console.log('  Saved mock_bank_private.pem and mock_bank_public.pem');

  return { privateKey: privateKeyPem, publicKey: publicKeyPem };
}

// ─── Step 4: Sign (CRITICAL: JSON.stringify with no spaces) ───────────────────
function signScoreData(scoreData, privateKeyPem) {
  const payload = JSON.stringify(scoreData); // no spaces — this is the rule
  const sign = crypto.createSign('SHA256');
  sign.update(payload);
  sign.end();
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  return { signature: sign.sign(privateKey, 'base64'), signed_payload: payload };
}

// ─── Step 5: Verify signature locally ────────────────────────────────────────
function verifySignature(payload, signature, publicKeyPem) {
  const verify = crypto.createVerify('SHA256');
  verify.update(payload);
  verify.end();
  const publicKey = crypto.createPublicKey(publicKeyPem);
  return verify.verify(publicKey, signature, 'base64');
}

// ─── Step 6: Build Verifiable Credential ─────────────────────────────────────
function buildVC(scoreData, publicKeyPem, signature, signedPayload) {
  return {
    vc_version: '1.0',
    issuer: 'MockBank-ZK-Scorer',
    issuer_public_key: publicKeyPem,
    subject: scoreData.user_id,
    issued_at: new Date().toISOString(),
    credential: {
      credit_score: scoreData.credit_score,
      risk_level: scoreData.risk_level,
      average_monthly_balance: scoreData.average_monthly_balance,
      debt_to_income_ratio: scoreData.debt_to_income_ratio,
      late_payments: scoreData.late_payments,
    },
    proof: {
      type: 'RSA-SHA256',
      signature,
      signed_payload: signedPayload,
    },
  };
}

// ─── Step 7: Build output.json ────────────────────────────────────────────────
function buildOutput(scoreData, publicKeyPem, signature, signedPayload) {
  const pubKeyHash = crypto.createHash('sha256').update(publicKeyPem).digest('hex');

  return {
    for_compact_contract: {
      credit_score: scoreData.credit_score,
      risk_level: scoreData.risk_level,
      user_id: scoreData.user_id,
      signature,
      issuer_public_key_hash: pubKeyHash,
    },
    public_state: {
      credit_score: scoreData.credit_score,
      risk_level: scoreData.risk_level,
      verified: true,
      proof_timestamp: new Date().toISOString(),
    },
    private_state: {
      raw_financial_data: financialData,
      score_breakdown: scoreData.score_breakdown,
      debt_to_income_ratio: scoreData.debt_to_income_ratio,
    },
  };
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────
async function main() {
  console.log('\n========================================');
  console.log('  ZK-Credit Scorer — Dev 1 Pipeline');
  console.log('========================================\n');

  // Step 2
  console.log('[Step 2] Calling Gemini 1.5 Flash...');
  const scoreData = await getCreditScore(financialData);
  console.log(`  AI returned credit_score: ${scoreData.credit_score}, risk_level: ${scoreData.risk_level}`);

  // Step 3
  console.log('\n[Step 3] RSA Key Pair:');
  const { privateKey, publicKey } = getOrCreateKeyPair();

  // Step 4
  console.log('\n[Step 4] Signing AI output...');
  const { signature, signed_payload } = signScoreData(scoreData, privateKey);
  console.log(`  Signature (first 40 chars): ${signature.slice(0, 40)}...`);

  // Step 5
  console.log('\n[Step 5] Verifying signature locally...');
  const isValid = verifySignature(signed_payload, signature, publicKey);
  console.log(`  Local verification: ${isValid ? 'PASSED' : 'FAILED'}`);
  if (!isValid) throw new Error('Signature verification failed — aborting.');

  // Step 6
  console.log('\n[Step 6] Building Verifiable Credential...');
  const vc = buildVC(scoreData, publicKey, signature, signed_payload);
  fs.writeFileSync('verifiable_credential.json', JSON.stringify(vc, null, 2));
  console.log('  Saved verifiable_credential.json');

  // Step 7
  console.log('\n[Step 7] Saving output.json...');
  const output = buildOutput(scoreData, publicKey, signature, signed_payload);
  fs.writeFileSync('output.json', JSON.stringify(output, null, 2));
  console.log('  Saved output.json');

  // Step 8 — Handoff summary
  console.log('\n========================================');
  console.log('  PIPELINE COMPLETE — HANDOFF SUMMARY');
  console.log('========================================');
  console.log(`  Credit Score : ${scoreData.credit_score}`);
  console.log(`  Risk Level   : ${scoreData.risk_level}`);
  console.log(`  Late Payments: ${scoreData.late_payments}`);
  console.log('\n  Files for Dev 2 (Compact contract):');
  console.log('    → output.json          (for_compact_contract section)');
  console.log('    → mock_bank_public.pem (for on-chain key verification)');
  console.log('\n  Files for Dev 3 (ZK proof / frontend):');
  console.log('    → output.json          (all three sections)');
  console.log('    → verifiable_credential.json');
  console.log('\n  CRITICAL: Pass signature over JSON.stringify(scoreData) with NO spaces.');
  console.log('            Do NOT reformat before handing to the Compact contract.\n');
}

main().catch((err) => {
  console.error('\nPipeline error:', err.message);
  process.exit(1);
});
