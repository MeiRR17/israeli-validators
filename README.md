# Israeli Validators

Dependency-free JavaScript input validators for Israeli ID checksums, Israeli IBAN checksums, phone formats and seven-digit postal-code formats. Includes an interactive **local-only browser studio**.

**Important:** A valid checksum or format does **not** establish a person's identity, account existence, ownership, active phone number or postal address. Use these utilities for client-side input feedback, not identity or payment verification.

## Browser

From the repository root, run a static HTTP server:

    python3 -m http.server 8000

Open http://localhost:8000. Choose a format and enter a non-sensitive sample value. Your input is processed in the browser only. The application makes no remote validation requests.

## Library

Requires modern JavaScript with ES modules; Node.js 22+ is recommended.

    import { validateIsraeliId, validateIsraeliIban, validateIsraeliMobile, validateIsraeliPhone, validateIsraeliPostalCode, validate } from './src/index.js';

    const id = validateIsraeliId('000000000');
    const phone = validateIsraeliMobile('050-1234567');
    const postal = validateIsraeliPostalCode('1234567');
    const generic = validate('0501234567', 'mobile');

Each validator returns an object with `valid`, `normalized`, and `reason`, plus optional structural fields for Israeli IBAN. The caller must not treat `valid: true` as proof of real-world issuance or account ownership.

## Supported checks

- **Israeli ID:** nine-digit mod-10 checksum with alternating factors 1 and 2. Input may be entered with up to nine digits and is padded with leading zeroes for the calculation. A passing checksum is not proof that an ID was issued.
- **Israeli IBAN:** syntax beginning with IL and 21 digits, plus international modulo-97 check. Exposes three-digit bank, three-digit branch and thirteen-digit account fields; it cannot confirm the bank/account exists.
- **Mobile:** common 10-digit local format starting 05, including +972/00972 normalization. Prefix assignment and reachability are not checked.
- **Telephone:** common cellular, 07 and 02/03/04/08/09 formats. This is a narrow syntax check and is not exhaustive for Israeli telecom numbering.
- **Postal:** modern seven-digit numeric format only. Does not confirm code allocation or physical delivery addresses.

The library deliberately does not claim official integration with the Population and Immigration Authority, Postal Company, telecom carriers or banking networks. No database checks or government endpoints are contacted.

## Scope

No dependencies, accounts, cookies, localStorage, analytics, tracking or network requests from the app. Do not enter real sensitive identifiers into shared devices or untrusted websites.

This is an implementation-only delivery. **Automated tests and external interoperability checks have not been performed** at the owner's request.

## Files

- `src/index.js` — normalization, input format checks and arithmetic checksums
- `index.html`, `app.js`, `styles.css` — local demonstration and accessible UI
- `package.json` — ES module metadata
- `LICENSE` — MIT

## Author

Built by Meir Dvir · https://github.com/MeiRR17
