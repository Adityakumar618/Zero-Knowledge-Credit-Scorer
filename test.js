import forge from 'node-forge';
import crypto from 'crypto';
import fs from 'fs';

// ─── Helpers (mirrors index.js logic exactly) ─────────────────────────────────
function generateKeyPair() {
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  return {
    privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
    publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
  };
}

function signScoreData(scoreData, privateKeyPem) {
  const payload = JSON.stringify(scoreData); // no spaces — must match Compact contract
  const sign = crypto.createSign('SHA256');
  sign.update(payload);
  sign.end();
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  return { signature: sign.sign(privateKey, 'base64'), signed_payload: payload };
}

function verifySignature(payload, signature, publicKeyPem) {
  const verify = crypto.createVerify('SHA256');
  verify.update(payload);
  verify.end();
  const publicKey = crypto.createPublicKey(publicKeyPem);
  return verify.verify(publicKey, signature, 'base64');
}

// ─── Test Runner ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function check(label, condition) {
  if (condition) {
    console.log(`  ✓ PASSED: ${label}`);
    passed++;
  } else {
    console.log(`  ✗ FAILED: ${label}`);
    failed++;
  }
}

// ─── Hardcoded Mock Score Data ────────────────────────────────────────────────
const mockScoreData = {
  user_id: 'user_001',
  credit_score: 742,
  average_monthly_balance: 1005.0,
  debt_to_income_ratio: 0.5787,
  late_payments: 0,
  risk_level: 'LOW',
  score_breakdown: {
    payment_history: 35,
    debt_ratio: 22,
    average_balance: 28,
  },
  timestamp: '2025-05-16T10:00:00.000Z',
};

async function runTests() {
  console.log('\n========================================');
  console.log('  ZK-Credit Scorer — Test Suite');
  console.log('========================================\n');

  // Test 1: Key pair generation
  console.log('[Test 1] RSA-2048 key pair generation');
  let keys;
  try {
    keys = generateKeyPair();
    check('Key pair generated without error', !!keys.privateKey && !!keys.publicKey);
    check('Private key is PEM format', keys.privateKey.includes('BEGIN RSA PRIVATE KEY') || keys.privateKey.includes('BEGIN PRIVATE KEY'));
    check('Public key is PEM format', keys.publicKey.includes('BEGIN PUBLIC KEY'));
  } catch (err) {
    check('Key pair generated without error', false);
    console.error('  Error:', err.message);
  }

  // Test 2: Sign mock data
  console.log('\n[Test 2] Sign mock score data');
  let signature, signed_payload;
  try {
    ({ signature, signed_payload } = signScoreData(mockScoreData, keys.privateKey));
    check('Signature produced (non-empty)', signature && signature.length > 0);
    check('Signed payload is compact JSON (no spaces)', signed_payload === JSON.stringify(mockScoreData));
  } catch (err) {
    check('Signing completed without error', false);
    console.error('  Error:', err.message);
  }

  // Test 3: Verify valid signature
  console.log('\n[Test 3] Verify valid signature');
  try {
    const isValid = verifySignature(signed_payload, signature, keys.publicKey);
    check('Valid signature verifies correctly', isValid === true);
  } catch (err) {
    check('Verification completed without error', false);
    console.error('  Error:', err.message);
  }

  // Test 4: Tamper detection — change credit_score, signature must FAIL
  console.log('\n[Test 4] Tamper detection (altered credit_score)');
  try {
    const tampered = { ...mockScoreData, credit_score: 850 };
    const tamperedPayload = JSON.stringify(tampered);
    const isTamperedValid = verifySignature(tamperedPayload, signature, keys.publicKey);
    check('Tampered data correctly FAILS verification', isTamperedValid === false);
  } catch (err) {
    check('Tamper detection completed without error', false);
    console.error('  Error:', err.message);
  }

  // Test 5: SHA256 of public key (for_compact_contract hash)
  console.log('\n[Test 5] Public key hash (SHA256)');
  try {
    const hash = crypto.createHash('sha256').update(keys.publicKey).digest('hex');
    check('SHA256 hash is 64 hex characters', hash.length === 64);
    check('Hash is deterministic (same key → same hash)', hash === crypto.createHash('sha256').update(keys.publicKey).digest('hex'));
  } catch (err) {
    check('Hash computation completed without error', false);
    console.error('  Error:', err.message);
  }

  // ─── Save test_output.json ────────────────────────────────────────────────
  const testOutput = {
    test_run_at: new Date().toISOString(),
    mock_score_data: mockScoreData,
    signature_sample: signature ? signature.slice(0, 40) + '...' : null,
    signed_payload,
    issuer_public_key_hash: keys ? crypto.createHash('sha256').update(keys.publicKey).digest('hex') : null,
    results: { passed, failed: failed + (keys ? 0 : 5) },
  };
  fs.writeFileSync('test_output.json', JSON.stringify(testOutput, null, 2));

  // ─── Final summary ────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  if (failed === 0) {
    console.log('  ALL TESTS PASSED — Ready for Dev 2 integration.\n');
  } else {
    console.log('  SOME TESTS FAILED — Review output above.\n');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
