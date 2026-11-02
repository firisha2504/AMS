const fs = require('fs');
const path = require('path');

let totalErrors = 0;

console.log('==============================================');
console.log('--- AFOSHA TRANSLATION AUDIT: WEB MODULES ---');
console.log('==============================================');

const enDir = path.join(__dirname, '..', 'web', 'src', 'i18n', 'locales', 'en');
const omDir = path.join(__dirname, '..', 'web', 'src', 'i18n', 'locales', 'om');

const modules = [
  'common',
  'nav',
  'dashboard',
  'payments',
  'penalties',
  'members',
  'admin',
  'auditor',
  'public',
  'notifications'
];

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

for (const mod of modules) {
  const enFile = path.join(enDir, `${mod}.json`);
  const omFile = path.join(omDir, `${mod}.json`);

  if (!fs.existsSync(enFile)) {
    console.error(`[FAIL] Missing English module: ${mod}.json`);
    totalErrors++;
    continue;
  }
  if (!fs.existsSync(omFile)) {
    console.error(`[FAIL] Missing Oromoo module: ${mod}.json`);
    totalErrors++;
    continue;
  }

  const enJson = JSON.parse(fs.readFileSync(enFile, 'utf8'));
  const omJson = JSON.parse(fs.readFileSync(omFile, 'utf8'));

  const enKeys = new Set(getKeys(enJson));
  const omKeys = new Set(getKeys(omJson));

  const missingInOm = [...enKeys].filter(k => !omKeys.has(k));
  const missingInEn = [...omKeys].filter(k => !enKeys.has(k));

  if (missingInOm.length > 0) {
    console.error(`[FAIL] [${mod}] Keys present in EN but missing in OM:`, missingInOm);
    totalErrors += missingInOm.length;
  }
  if (missingInEn.length > 0) {
    console.error(`[FAIL] [${mod}] Keys present in OM but missing in EN:`, missingInEn);
    totalErrors += missingInEn.length;
  }

  if (missingInOm.length === 0 && missingInEn.length === 0) {
    console.log(`[PASS] [${mod}] 100% key match (${enKeys.size} keys verified)`);
  }
}

console.log('\n=================================================');
console.log('--- AFOSHA TRANSLATION AUDIT: MOBILE ARB FILES ---');
console.log('=================================================');

const mobileEn = path.join(__dirname, '..', 'mobile', 'lib', 'l10n', 'app_en.arb');
const mobileOm = path.join(__dirname, '..', 'mobile', 'lib', 'l10n', 'app_om.arb');

if (!fs.existsSync(mobileEn) || !fs.existsSync(mobileOm)) {
  console.error('[FAIL] Missing mobile ARB files!');
  totalErrors++;
} else {
  const enArb = JSON.parse(fs.readFileSync(mobileEn, 'utf8'));
  const omArb = JSON.parse(fs.readFileSync(mobileOm, 'utf8'));

  const enKeys = Object.keys(enArb).filter(k => !k.startsWith('@'));
  const omKeys = Object.keys(omArb).filter(k => !k.startsWith('@'));

  const enSet = new Set(enKeys);
  const omSet = new Set(omKeys);

  const missingInOm = enKeys.filter(k => !omSet.has(k));
  const missingInEn = omKeys.filter(k => !enSet.has(k));

  if (missingInOm.length > 0) {
    console.error('[FAIL] Mobile keys in EN but missing in OM:', missingInOm);
    totalErrors += missingInOm.length;
  }
  if (missingInEn.length > 0) {
    console.error('[FAIL] Mobile keys in OM but missing in EN:', missingInEn);
    totalErrors += missingInEn.length;
  }

  if (missingInOm.length === 0 && missingInEn.length === 0) {
    console.log(`[PASS] Mobile ARB files: 100% key match (${enKeys.length} keys verified)`);
  }
}

console.log('\n==============================================');
if (totalErrors === 0) {
  console.log('ALL TRANSLATION AUDITS PASSED WITH 0 ERRORS!');
  process.exit(0);
} else {
  console.error(`AUDIT COMPLETED WITH ${totalErrors} ERROR(S).`);
  process.exit(1);
}
