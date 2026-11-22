# Israeli Validators

Dependency-free JavaScript input validators for Israeli ID checksums, Israeli IBAN checksums, mobile/general/fixed-line phone formats and seven-digit postal-code formats. Includes an interactive **local-only browser studio**.

**Important:** A valid checksum or format does **not** establish a person's identity, account existence, ownership, active phone number or postal address. Use these utilities for client-side input feedback, not identity or payment verification.

## Browser

From the repository root, run a static HTTP server:

    python3 -m http.server 8000

Open http://localhost:8000. Choose a format and enter a non-sensitive sample value. In single-value mode, full normalized identifiers and extracted IBAN bank/branch/account fields are **hidden by default**. Opt in using **Show the full normalized value** to reveal those details on-screen; this does not hide the value already typed in the form. Switch to **Batch** to check up to 100 newline-separated values with a pass/fail count and a reason for each input line. The browser batch table deliberately shows **line numbers, not submitted identifiers**. Your input is processed in the browser only. The application makes no remote validation requests.

## Library

Requires modern JavaScript with ES modules; Node.js 22+ is recommended.

    import { validateIsraeliId, validateIsraeliIban, validateIsraeliMobile, validateIsraeliPhone, validateIsraeliLandline, validateIsraeliPostalCode, validate } from './src/index.js';

    const id = validateIsraeliId('000000000');
    const phone = validateIsraeliMobile('050-1234567');
    const landline = validateIsraeliLandline('02-1234567');
    const postal = validateIsraeliPostalCode('1234567');
    const generic = validate('0501234567', 'mobile');

Each validator returns an object with `valid`, `normalized`, and `reason`, plus optional structural fields for Israeli IBAN. The caller must not treat `valid: true` as proof of real-world issuance or account ownership.

## Local batch validation

    import { validateBatch, batchSummary } from './src/batch.js';
    const result = validateBatch('000000000\n123456789', 'id');
    const countsOnly = batchSummary(result);

This function accepts **1–100 nonempty lines**, up to **10,000 characters** total, and returns one result per input with line number, validation outcome and reason. Input values are returned to the programmatic caller as part of the rows so the calling code can associate the outcome; do not log or persist them accidentally. The browser UI purposely does not display the input values in its batch results and does not export or upload submitted identifiers.

For on-screen results that should never contain identifiers in the returned row objects, use `validateBatchRedacted()`:

    import { validateBatchRedacted } from './src/batch.js';
    const display = validateBatchRedacted('000000000\n123456789', 'id');
    // Each row has only { line, valid, reason }.

The browser's batch table now uses this redacted API rather than constructing `validateBatch()` objects with original and normalized values. Identifiers remain in the user's input control until cleared; the browser also constructs a separate direct counts-only audit for download. The count-only summary excludes input values. Like single checks, passing a checksum is not proof of identity, account existence or delivery.

### Counts-only audit report

Batch mode can download `validation-audit-counts.json`. It contains the selected validation kind, counts of passed/failed inputs and a per-reason failure breakdown. It contains **no submitted values**, no normalized identifiers and no per-line record details.

    import { batchAudit } from './src/batch.js';
    const audit = batchAudit(result);
    // For privacy-oriented callers, avoid materializing identifier-bearing rows:
    import { auditBatchInput } from './src/batch.js';
    const directAudit = auditBatchInput('000000000\n123456789', 'id');
    // { format, kind, total, passed, failed, invalidReasons, advisory }

`auditBatchInput()` validates lines and returns counts without constructing a `rows` array containing original values. The browser export uses this route. Unlike the result rows returned by `validateBatch()`, the audit is suitable for sharing as aggregate data *when the count distribution itself is not sensitive*. Always review exports before publication. Blank input lines are ignored but line numbers for nonblank entries refer to their **original positions** in the input (not renumbered after removing blanks). Clear removes both single-value and batch-value input.

## Supported checks

- **Israeli ID:** nine-digit mod-10 checksum with alternating factors 1 and 2. Input may be entered with up to nine digits and is padded with leading zeroes for the calculation. A passing checksum is not proof that an ID was issued.
- **Israeli IBAN:** syntax beginning with IL and 21 digits, plus international modulo-97 check. Exposes three-digit bank, three-digit branch and thirteen-digit account fields; it cannot confirm the bank/account exists.
- **Mobile:** common 10-digit local format starting 05, including +972/00972 normalization. Prefix assignment and reachability are not checked.
- **Telephone:** common cellular, 07 and 02/03/04/08/09 formats. This is a narrow syntax check and is not exhaustive for Israeli telecom numbering.
- **Fixed-line (`landline`):** the 02/03/04/08/09 nine-digit local numbering shape, with optional `+972`/`00972` normalization. The stricter validator excludes cellular 05 and 07 ranges; it does not establish the physical line type or check allocation, number portability or reachability. Available in both single and privacy-redacted batch modes.
- **Postal:** modern seven-digit numeric format only. Does not confirm code allocation or physical delivery addresses.

The library deliberately does not claim official integration with the Population and Immigration Authority, Postal Company, telecom carriers or banking networks. No database checks or government endpoints are contacted.

## Scope

No dependencies, accounts, cookies, localStorage, analytics, tracking or network requests from the app. Do not enter real sensitive identifiers into shared devices or untrusted websites.

This is an implementation-only delivery. **Automated tests and external interoperability checks have not been performed** at the owner's request.

## Files

- `src/index.js` — normalization, input format checks and arithmetic checksums
- `src/batch.js` — bounded bulk checking, redacted display rows, direct aggregate-only audit and count-only summaries
- `index.html`, `app.js`, `styles.css` — local demonstration and accessible UI
- `package.json` — ES module metadata
- `LICENSE` — MIT

## Author

Built by Meir Dvir · https://github.com/MeiRR17
