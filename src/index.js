/**
 * Dependency-free Israeli input format and checksum checks.
 * These functions establish syntactic/checksum plausibility, never identity,
 * bank-account existence, account ownership or deliverability.
 */
const ASCII_DIGITS = /^\d+$/;
const INVALID = Object.freeze({ valid: false });

function noWhitespace(value) {
  return typeof value === 'string' ? value.replace(/[\s-]/g, '') : '';
}

/**
 * Israeli identity number checksum (mod-10 Luhn variant).
 * A full ID has nine decimal digits. Shorter historical representations can
 * be normalized with leading zeros, but passing does not establish identity.
 */
export function normalizeIsraeliId(value) {
  const digits = noWhitespace(value);
  if (!ASCII_DIGITS.test(digits) || digits.length < 1 || digits.length > 9) return null;
  return digits.padStart(9, '0');
}

export function validateIsraeliId(value) {
  const normalized = normalizeIsraeliId(value);
  if (!normalized) return { valid: false, normalized: null, reason: 'expected_1_to_9_digits' };
  let checksum = 0;
  for (let i = 0; i < 9; i++) {
    let product = Number(normalized[i]) * (i % 2 === 0 ? 1 : 2);
    if (product > 9) product -= 9;
    checksum += product;
  }
  return {
    valid: checksum % 10 === 0,
    normalized,
    reason: checksum % 10 === 0 ? null : 'checksum_mismatch',
  };
}

/**
 * Structural Israel IBAN check: IL + two numeric check digits + a 19-digit BBAN.
 * Returns bank/branch/account segments for display only; does not contact banks.
 */
export function validateIsraeliIban(value) {
  if (typeof value !== 'string') return { valid: false, normalized: null, reason: 'invalid_type' };
  const normalized = value.replace(/[\s-]/g, '').toUpperCase();
  if (!/^IL\d{21}$/.test(normalized)) {
    return { valid: false, normalized: null, reason: 'invalid_israeli_iban_format' };
  }
  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const mapped = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of mapped) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  const valid = remainder === 1;
  return {
    valid,
    normalized,
    reason: valid ? null : 'checksum_mismatch',
    // Country (2), check digits (2), bank (3), branch (3), account (13).
    bankCode: normalized.slice(4, 7),
    branchCode: normalized.slice(7, 10),
    accountNumber: normalized.slice(10, 23),
  };
}

/**
 * Normalize commonly entered Israeli numbers into local 0-prefixed digits.
 * Removes spaces, hyphens, dots and brackets. Converts +972/00972 prefixes.
 */
export function normalizeIsraeliPhone(value) {
  if (typeof value !== 'string') return null;
  let trimmed = value.trim();
  if (trimmed.startsWith('+972')) trimmed = '0' + trimmed.slice(4);
  else if (trimmed.startsWith('00972')) trimmed = '0' + trimmed.slice(5);
  trimmed = trimmed.replace(/[\s().-]/g, '');
  return /^\d{9,10}$/.test(trimmed) ? trimmed : null;
}

/**
 * Number format only: cellular 05X followed by 7 further digits.
 * Prefix allocation, routing, portability and active service are not checked.
 */
export function validateIsraeliMobile(value) {
  const normalized = normalizeIsraeliPhone(value);
  const valid = normalized !== null && /^05\d{8}$/.test(normalized);
  return { valid, normalized, reason: valid ? null : 'invalid_mobile_format' };
}

/** Basic fixed-line and 07X VoIP/mobile-like formats, without carrier lookup. */
export function validateIsraeliPhone(value) {
  const normalized = normalizeIsraeliPhone(value);
  const valid = normalized !== null && (
    /^05\d{8}$/.test(normalized) ||
    /^07\d{8}$/.test(normalized) ||
    /^0[23489]\d{7}$/.test(normalized)
  );
  return { valid, normalized, reason: valid ? null : 'invalid_phone_format' };
}

/**
 * Strict local fixed-line numbering shape: 02/03/04/08/09 followed by
 * seven digits. Deliberately excludes 05 mobile and 07 service/VoIP ranges.
 * This does NOT verify allocation, reachability, or number portability.
 */
export function validateIsraeliLandline(value) {
  const normalized = normalizeIsraeliPhone(value);
  const valid = normalized !== null && /^0[23489]\d{7}$/.test(normalized);
  return { valid, normalized, reason: valid ? null : 'invalid_landline_format' };
}

/**
 * Validate a calendar date in unambiguous ISO YYYY-MM-DD or Israeli
 * day-first DD/MM/YYYY, DD.MM.YYYY or DD-MM-YYYY notation.
 * Returns a normalized ISO date; this checks Gregorian calendar validity,
 * not age, eligibility, identity or whether a date is someone's real DOB.
 */
export function validateIsraeliDate(value) {
  if (typeof value !== 'string') {
    return { valid: false, normalized: null, reason: 'invalid_type' };
  }
  const input = value.trim();
  let year, month, day;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(input);
  if (match) {
    [, year, month, day] = match;
  } else {
    match = /^(\d{2})([/.\\-])(\d{2})\2(\d{4})$/u.exec(input);
    if (!match) return { valid: false, normalized: null, reason: 'invalid_date_format' };
    [, day, , month, year] = match;
  }
  const y = Number(year), m = Number(month), d = Number(day);
  // setUTCFullYear avoids Date.UTC's legacy 1900 offset for years 00–99.
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(y, m - 1, d);
  const valid = y >= 1 && y <= 9999 && date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  const normalized = valid
    ? String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0')
    : null;
  return { valid, normalized, reason: valid ? null : 'invalid_calendar_date' };
}

/** Modern Israeli postal code format: exactly seven decimal digits. */
export function validateIsraeliPostalCode(value) {
  const normalized = noWhitespace(value);
  const valid = /^\d{7}$/.test(normalized);
  return { valid, normalized: valid ? normalized : null, reason: valid ? null : 'expected_7_digits' };
}

export const validators = Object.freeze({
  id: validateIsraeliId,
  iban: validateIsraeliIban,
  mobile: validateIsraeliMobile,
  phone: validateIsraeliPhone,
  landline: validateIsraeliLandline,
  postal: validateIsraeliPostalCode,
  date: validateIsraeliDate,
});

/** Stable utility for form validation based on a named supported check. */
export function validate(value, kind) {
  if (!Object.hasOwn(validators, kind)) throw new RangeError('Unsupported validator: ' + kind);
  return validators[kind](value);
}
