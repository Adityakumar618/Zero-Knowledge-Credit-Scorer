import Groq from 'groq-sdk';
import { fromPath } from 'pdf2pic';
import dotenv from 'dotenv';
import fs from 'fs';
import crypto from 'crypto';
import os from 'os';
import path from 'path';

dotenv.config();

// ─── Fallback mock data (used when no PDF is provided) ────────────────────────
const mockFinancialData = {
  user_id: 'user_001',
  bank: 'Mock Bank',
  currency: 'USD',
  account_holder: 'John Doe',
  period: 'Oct 2024 - Nov 2024',
  beginning_balance: 69.96,
  ending_balance: 586.71,
  average_balance: 643.24,
  months: [
    { month: 'Oct 2024', income: 1526.02, expenses: 1320.02, debt_payment: 0 },
    { month: 'Nov 2024', income: 350.26,  expenses: 12.00,   debt_payment: 0 },
  ],
  total_credits: 1876.28,
  total_debits: 1320.02,
  service_charges: 12.00,
  late_payments: 0,
  total_debt: 0,
};

// ─── Step 1: Parse PDF via GROQ vision ───────────────────────────────────────
async function parsePDFStatement(pdfPath) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set in .env');

  const groq = new Groq({ apiKey });
  const tmpDir  = os.tmpdir();
  const tmpId   = crypto.randomUUID();

  console.log('  Converting PDF pages to images...');
  const convert = fromPath(pdfPath, {
    density:      150,
    format:       'png',
    width:        2480,
    height:       3508,
    saveFilename: tmpId,
    savePath:     tmpDir,
  });

  const pages = await convert.bulk(-1, { responseType: 'base64' });
  console.log(`  Converted ${pages.length} page(s).`);

  const imageBlocks = pages
    .filter(p => p.base64)
    .map(p => ({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${p.base64}` },
    }));

  console.log(`  Sending ${imageBlocks.length} image(s) to GROQ vision...`);

  const completion = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: 'You are a bank statement parser. Extract all financial data and return ONLY raw JSON. No markdown, no explanation.',
      },
      {
        role: 'user',
        content: [
          ...imageBlocks,
          {
            type: 'text',
            text: `Extract all financial data from this bank statement and return exactly this JSON structure (compute all values from what you see — no placeholders):
{
  "user_id": "<account number from statement>",
  "bank": "<bank name>",
  "currency": "<currency code, e.g. USD>",
  "account_holder": "<full name on statement>",
  "period": "<statement period, e.g. Oct 2024 - Nov 2024>",
  "beginning_balance": <number>,
  "ending_balance": <number>,
  "average_balance": <number>,
  "months": [
    { "month": "<Mon YYYY>", "income": <total credits that month>, "expenses": <total debits that month>, "debt_payment": <debt/loan payments, 0 if none> }
  ],
  "total_credits": <number>,
  "total_debits": <number>,
  "service_charges": <number>,
  "late_payments": <integer count of overdue or late payments>,
  "total_debt": <outstanding debt amount, 0 if none>
}`,
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
  });

  // Clean up temp PNG files
  pages.forEach(p => { if (p.path) try { fs.unlinkSync(p.path); } catch {} });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('No response from GROQ vision');

  const parsed = JSON.parse(content);
  console.log(`  Extracted: ${parsed.account_holder} | ${parsed.bank} | Period: ${parsed.period}`);
  return parsed;
}

// ─── Step 2: Credit scoring via GROQ ─────────────────────────────────────────
async function getCreditScore(financialData) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set in .env');

  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: 'You are a credit scoring AI. Return ONLY raw valid JSON. No markdown. No explanation. No code blocks.',
      },
      {
        role: 'user',
        content: `Analyze this financial data and return ONLY this JSON structure with computed values:

Financial data: ${JSON.stringify(financialData)}

Required JSON:
{
  "user_id": "${financialData.user_id}",
  "credit_score": <integer 300-850>,
  "average_monthly_balance": <average of (income - expenses - debt_payment) across all months>,
  "debt_to_income_ratio": <total_debt / sum of all monthly incomes, 4 decimal places, 0 if no debt>,
  "late_payments": ${financialData.late_payments},
  "risk_level": "<LOW if score>=700, MEDIUM if 600-699, HIGH if <600>",
  "score_breakdown": {
    "payment_history": <integer out of 35>,
    "debt_ratio": <integer out of 30>,
    "average_balance": <integer out of 35>
  },
  "timestamp": "<current ISO 8601 timestamp>"
}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error('No response from GROQ scoring model');
  return JSON.parse(text);
}

// ─── Step 3: RSA key pair (reuse if exists) ───────────────────────────────────
function getOrCreateKeyPair() {
  const privPath = 'mock_bank_private.pem';
  const pubPath  = 'mock_bank_public.pem';

  if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
    console.log('  Reusing existing RSA key pair.');
    return {
      privateKey: fs.readFileSync(privPath, 'utf8'),
      publicKey:  fs.readFileSync(pubPath,  'utf8'),
    };
  }

  console.log('  Generating new RSA-2048 key pair...');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength:      2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  fs.writeFileSync(privPath, privateKey);
  fs.writeFileSync(pubPath,  publicKey);
  console.log('  Saved mock_bank_private.pem and mock_bank_public.pem');

  return { privateKey, publicKey };
}

// ─── Step 4: Sign (CRITICAL: JSON.stringify with no spaces) ───────────────────
function signScoreData(scoreData, privateKeyPem) {
  const payload = JSON.stringify(scoreData); // no spaces — this is the invariant
  const sign = crypto.createSign('SHA256');
  sign.update(payload);
  sign.end();
  const signature = sign.sign(crypto.createPrivateKey(privateKeyPem), 'base64');
  return { signature, signed_payload: payload };
}

// ─── Step 5: Verify signature locally ────────────────────────────────────────
function verifySignature(payload, signature, publicKeyPem) {
  const verify = crypto.createVerify('SHA256');
  verify.update(payload);
  verify.end();
  return verify.verify(crypto.createPublicKey(publicKeyPem), signature, 'base64');
}

// ─── Step 6: Build Verifiable Credential ─────────────────────────────────────
function buildVC(scoreData, publicKeyPem, signature, signedPayload) {
  return {
    vc_version:         '1.0',
    issuer:             'MockBank-ZK-Scorer',
    issuer_public_key:  publicKeyPem,
    subject:            scoreData.user_id,
    issued_at:          new Date().toISOString(),
    credential: {
      credit_score:          scoreData.credit_score,
      risk_level:            scoreData.risk_level,
      average_monthly_balance: scoreData.average_monthly_balance,
      debt_to_income_ratio:  scoreData.debt_to_income_ratio,
      late_payments:         scoreData.late_payments,
    },
    proof: {
      type:           'RSA-SHA256',
      signature,
      signed_payload: signedPayload,
    },
  };
}

// ─── Step 7: Build output.json ────────────────────────────────────────────────
function buildOutput(scoreData, financialData, publicKeyPem, signature, signedPayload) {
  const pubKeyHash = crypto.createHash('sha256').update(publicKeyPem).digest('hex');

  return {
    for_compact_contract: {
      credit_score:          scoreData.credit_score,
      risk_level:            scoreData.risk_level,
      user_id:               scoreData.user_id,
      signature,
      issuer_public_key_hash: pubKeyHash,
    },
    public_state: {
      credit_score:    scoreData.credit_score,
      risk_level:      scoreData.risk_level,
      verified:        true,
      proof_timestamp: new Date().toISOString(),
    },
    private_state: {
      raw_financial_data:   financialData,
      score_breakdown:      scoreData.score_breakdown,
      debt_to_income_ratio: scoreData.debt_to_income_ratio,
    },
  };
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────
async function main() {
  console.log('\n========================================');
  console.log('  ZK-Credit Scorer — Dev 1 Pipeline');
  console.log('========================================\n');

  // Step 1 — load financial data
  const pdfPath = process.argv[2];
  let financialData;

  if (pdfPath) {
    if (!fs.existsSync(pdfPath)) {
      console.error(`Error: File not found — ${pdfPath}`);
      process.exit(1);
    }
    console.log(`[Step 1] Parsing PDF: ${path.basename(pdfPath)}`);
    financialData = await parsePDFStatement(pdfPath);
  } else {
    console.log('[Step 1] No PDF provided — using mock financial data.');
    financialData = mockFinancialData;
  }

  // Step 2 — credit scoring
  console.log('\n[Step 2] Scoring with GROQ...');
  const scoreData = await getCreditScore(financialData);
  console.log(`  credit_score: ${scoreData.credit_score}, risk_level: ${scoreData.risk_level}`);

  // Step 3 — RSA key pair
  console.log('\n[Step 3] RSA Key Pair:');
  const { privateKey, publicKey } = getOrCreateKeyPair();

  // Step 4 — sign
  console.log('\n[Step 4] Signing AI output...');
  const { signature, signed_payload } = signScoreData(scoreData, privateKey);
  console.log(`  Signature (first 40 chars): ${signature.slice(0, 40)}...`);

  // Step 5 — verify
  console.log('\n[Step 5] Verifying signature locally...');
  const isValid = verifySignature(signed_payload, signature, publicKey);
  console.log(`  Local verification: ${isValid ? 'PASSED ✓' : 'FAILED ✗'}`);
  if (!isValid) throw new Error('Signature verification failed — aborting.');

  // Step 6 — verifiable credential
  console.log('\n[Step 6] Building Verifiable Credential...');
  const vc = buildVC(scoreData, publicKey, signature, signed_payload);
  fs.writeFileSync('verifiable_credential.json', JSON.stringify(vc, null, 2));
  console.log('  Saved verifiable_credential.json');

  // Step 7 — output.json
  console.log('\n[Step 7] Saving output.json...');
  const output = buildOutput(scoreData, financialData, publicKey, signature, signed_payload);
  fs.writeFileSync('output.json', JSON.stringify(output, null, 2));
  console.log('  Saved output.json');

  // Handoff summary
  console.log('\n========================================');
  console.log('  PIPELINE COMPLETE — HANDOFF SUMMARY');
  console.log('========================================');
  if (pdfPath) console.log(`  Source       : ${path.basename(pdfPath)}`);
  console.log(`  Account      : ${financialData.account_holder ?? financialData.user_id}`);
  console.log(`  Credit Score : ${scoreData.credit_score}`);
  console.log(`  Risk Level   : ${scoreData.risk_level}`);
  console.log(`  Late Payments: ${scoreData.late_payments}`);
  console.log('\n  Files for Dev 2 (Compact contract):');
  console.log('    → output.json          (for_compact_contract section)');
  console.log('    → mock_bank_public.pem');
  console.log('\n  Files for Dev 3 (ZK proof / frontend):');
  console.log('    → output.json          (all three sections)');
  console.log('    → verifiable_credential.json');
  console.log('\n  CRITICAL: Signature is over JSON.stringify(scoreData) with NO spaces.\n');
}

main().catch(err => {
  console.error('\nPipeline error:', err.message);
  process.exit(1);
});
