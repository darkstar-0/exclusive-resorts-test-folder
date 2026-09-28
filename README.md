# Exclusive Resorts — Inquiry Form QA Assessment

Playwright UI test suite + Postman/Newman API collection for the
`/inquire/` form on `public-site.stage.exclusiveresorts.com`.

## Setup

```bash
npm install
npx playwright install        # installs chromium/webkit browsers
npm install -g newman          # for the Postman/API collection
```

Node version: whatever your local default is — no version-specific
features used. Tests run against `https://public-site.stage.exclusiveresorts.com`
by default (see `playwright.config.ts` / `environment.json`).

## Running the UI suite

Everything:
```bash
npx playwright test
```

Smoke only (happy-path, tagged `@smoke` — the one test that must pass for a
build to be considered healthy):
```bash
npx playwright test --grep @smoke
```

Full regression (negative/edge cases, tagged `@regression`):
```bash
npx playwright test --grep @regression
```

HTML report after a run:
```bash
npx playwright show-report
```

## Running the API collection

```bash
newman run collection.json -e environment.json
```

See `README-postman.md` for the full scenario list and — importantly — the
result of the live run against staging (blocked at the CDN layer; see
below).

## Project structure

```
tests/
  inquiry-form.spec.ts           # smoke: happy-path submit
  inquiry-form-negative.spec.ts  # regression: validation & known defects
pages/
  InquiryPage.ts                 # Page Object Model for the inquiry form
collection.json                  # Postman collection (submit-form/ endpoint)
environment.json                 # Postman environment (baseUrl, no secrets)
README-postman.md                # API collection details + live-run findings
```

## CI

**Not wired up in the time available.** What I'd add first with another
day: a GitHub Actions workflow that runs `@smoke` on every PR (fast gate,
~seconds) and the full `@regression` tag nightly or on merge to main, with
the HTML report uploaded as a build artifact. The suite is already
structured for this (tag-based filtering, no test interdependencies), so
wiring it up is mechanical, not a redesign.

## Bugs found

All found through UI exploration and encoded as regression tests, not just
reported:

1. **Uncaught `TypeError: Cannot read properties of undefined (reading
   'country')`** in the form's submit handler (manual repro; automated as
   a guard test that fails if any uncaught page error fires on submit).
2. **Phone field validation is cosmetic, not enforced.** Entering a
   malformed number (`123`) shows "Please enter a valid phone number" —
   but the form submits anyway, with the invalid value sent to the
   backend. The visible error gives users false confidence that submission
   was blocked.
3. **Silent submit failure under an async validation race.** The app
   validates email via a background `/validate-email/` call before
   allowing submission; clicking Submit before that call resolves causes
   the click to silently no-op — no error, no network request, no visual
   feedback. A real user with a slow connection (or just a fast clicker)
   could hit Submit and have nothing happen, with no indication why.

(1) and (3) are the same underlying pattern — the app fails silently with
no user-facing signal — which is the more interesting/systemic finding
versus a one-off cosmetic bug.

## Known limitations & what I'd do with another day

- **Accessibility and security beyond input validation weren't covered.**
  No axe-core scan, no auth/authorization testing (this form has none to
  test), no broader security sweep beyond the SQL-injection-in-name API
  case. I'd add an axe-core check on the smoke test as a cheap first step.
- **Only chromium + webkit are exercised**, not firefox — no specific
  reason to exclude it beyond time; trivial to add to `playwright.config.ts`.
- **The hydration-race fix (`waitForLoadState('networkidle')` +
  submit-button-interactive check) is a heuristic, not a guarantee.** It
  held up across repeated runs but isn't logically airtight — a more
  robust fix would hook a real app-ready signal if the framework exposes
  one, rather than inferring readiness from network/DOM state.
- **The Postman collection's response-shape and status-code assertions are
  unconfirmed against a live server** — every real run against staging
  was blocked by a CloudFront 403 before reaching the app (see
  `README-postman.md` for the full writeup, including the actual response
  captured and what I'd ask for in a real engagement to unblock it).
- **Empty-required-field validation test needed reworking mid-suite**
  because this app has no native HTML5 `required` validation at all —
  it's fully custom JS-driven, which isn't obvious from the outside and
  cost real debugging time before I found it.

## Walkthrough notes

For the live demo: happy to break a selector on request to show a failure
mode, and the strongest bug to walk through is either #2 or #3 above — both
are silent-failure patterns rather than crashes, which is the harder
(and more realistic) class of bug to catch without instrumented network/
console logging, which is how each was actually found here.
