import { validate, validators } from './index.js';

/**
 * Bounded, local-only bulk structural checks.
 * The utility never stores, logs or transmits values.
 * No input is evaluated as code or used to query any external registry.
 */
const MAX_ENTRIES = 100;
const MAX_LENGTH = 10_000;

/**
 * @param {string} lines One input per newline, with empty lines ignored.
 * @param {'id'|'iban'|'mobile'|'phone'|'landline'|'postal'} kind
 * @returns {{kind:string,total:number,passed:number,failed:number,rows:Array<object>}}
 */
export function validateBatch(lines, kind) {
  if (typeof lines !== 'string' || lines.length > MAX_LENGTH) {
    throw new RangeError('Bulk input must be text of at most 10,000 characters.');
  }
  if (!Object.hasOwn(validators, kind)) throw new RangeError('Unsupported input type.');
  const entries = lines.split(/\r\n?|\n/u)
    .map((value, index) => ({ value: value.trim(), line: index + 1 }))
    .filter(entry => Boolean(entry.value));
  if (!entries.length) throw new RangeError('Enter one or more values.');
  if (entries.length > MAX_ENTRIES) {
    throw new RangeError('Enter no more than 100 non-empty lines.');
  }
  const rows = entries.map(entry => {
    const result = validate(entry.value, kind);
    return {
      line: entry.line,
      value: entry.value,
      valid: result.valid,
      normalized: result.normalized,
      reason: result.reason ?? null,
    };
  });
  const passed = rows.filter(item => item.valid).length;
  return { kind, total: rows.length, passed, failed: rows.length - passed, rows };
}


/**
 * Display-safe batch inspection: only source line numbers, boolean outcomes
 * and bounded reason codes leave this function. Unlike validateBatch(), no
 * returned row contains the entered value or a normalized identifier.
 *
 * This does not erase the caller's input string or validate real-world
 * identity, account existence or phone number allocation.
 */
export function validateBatchRedacted(lines, kind) {
  if (typeof lines !== 'string' || lines.length > MAX_LENGTH) {
    throw new RangeError('Bulk input must be text of at most 10,000 characters.');
  }
  if (!Object.hasOwn(validators, kind)) throw new RangeError('Unsupported input type.');
  const rows = [];
  let passed = 0;
  for (const [index, raw] of lines.split(/\r\n?|\n/u).entries()) {
    const value = raw.trim();
    if (!value) continue;
    if (rows.length >= MAX_ENTRIES) throw new RangeError('Enter no more than 100 non-empty lines.');
    const outcome = validate(value, kind);
    if (outcome.valid) passed++;
    const reason = !outcome.valid && typeof outcome.reason === 'string' &&
      /^[a-z0-9_]{1,80}$/u.test(outcome.reason)
      ? outcome.reason : outcome.valid ? null : 'other_invalid';
    rows.push({ line: index + 1, valid: outcome.valid === true, reason });
  }
  if (!rows.length) throw new RangeError('Enter one or more values.');
  return { kind, total: rows.length, passed, failed: rows.length - passed, rows };
}

/** Privacy-preserving summary containing counts, not source identifiers. */
export function batchSummary(result) {
  if (!result || !Number.isInteger(result.total) ||
      !Number.isInteger(result.passed) || !Number.isInteger(result.failed)) {
    throw new TypeError('Expected a bulk validation result.');
  }
  return {
    kind: result.kind,
    total: result.total,
    passed: result.passed,
    failed: result.failed,
  };
}


/**
 * Counts-only analysis of invalid reasons. No raw input, normalized
 * identifiers, source line numbers or account data are included.
 */
export function batchAudit(result) {
  if (!result || !Array.isArray(result.rows)) {
    throw new TypeError('Expected a batch validation result.');
  }
  const summary = batchSummary(result);
  const reasons = Object.create(null);
  for (const item of result.rows) {
    if (!item.valid) {
      const reason = typeof item.reason === 'string' && /^[a-z0-9_]{1,80}$/u.test(item.reason)
        ? item.reason : 'other_invalid';
      reasons[reason] = (reasons[reason] ?? 0) + 1;
    }
  }
  return {
    format: 'israeli-validators-batch-audit-v1',
    ...summary,
    invalidReasons: Object.entries(reasons)
      .sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([reason, count]) => ({ reason, count })),
    advisory: 'Format/checksum validation only; no real-world issuance or ownership verified.',
  };
}


/**
 * Counts-only validation directly from the input string. Unlike
 * validateBatch(), this function never constructs or returns row objects
 * containing the entered identifiers or account numbers.
 */
export function auditBatchInput(lines, kind) {
  if (typeof lines !== 'string' || lines.length > MAX_LENGTH) {
    throw new RangeError('Bulk input must be text of at most 10,000 characters.');
  }
  if (!Object.hasOwn(validators, kind)) throw new RangeError('Unsupported input type.');
  const counts = new Map();
  let total = 0, passed = 0;
  for (const raw of lines.split(/\r\n?|\n/u)) {
    const value = raw.trim();
    if (!value) continue;
    total++;
    if (total > MAX_ENTRIES) throw new RangeError('Enter no more than 100 non-empty lines.');
    const outcome = validate(value, kind);
    if (outcome.valid) {
      passed++;
    } else {
      const reason = typeof outcome.reason === 'string' && /^[a-z0-9_]{1,80}$/u.test(outcome.reason)
        ? outcome.reason : 'other_invalid';
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }
  if (!total) throw new RangeError('Enter one or more values.');
  return {
    format: 'israeli-validators-batch-audit-v1',
    kind,
    total,
    passed,
    failed: total - passed,
    invalidReasons: [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([reason, count]) => ({ reason, count })),
    advisory: 'Format/checksum validation only; no real-world issuance or ownership verified.',
  };
}
