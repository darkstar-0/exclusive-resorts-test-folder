# Test Plan — Exclusive Resorts Inquiry Form

## Objective

Validate the public membership inquiry form at `/inquire/` — both the
initial inquiry form and the referral/club-connection form — for
functional correctness, client/server validation consistency, and
frontend-to-backend submission integrity, prioritized by risk rather than
exhaustive coverage.

## Scope

Testing the public membership inquiry form at `/inquire/`, covering both
the initial inquiry form and the referral/club-connection form. Tests
cover functional input validation, keyboard accessibility, client-side
behavior, and the frontend-to-backend submission flow.

## Out of scope

- Full international postal code format validation per country.
- Load or performance testing (beyond a lightweight p95 response-time
  sanity check on the API layer — not a load test).
- The internal CRM system receiving the submitted requests.
- Security vulnerabilities beyond PII being stored in session storage
  (e.g. no full penetration test, no auth testing — this form has no
  authentication surface to test).

## Risk areas (prioritization rationale)

Exploratory testing surfaced two dominant risk themes, both prioritized
above general functional coverage:

1. **Field validation inconsistency between client and server (highest
   risk).** Client-side validation does not reliably match server-side
   enforcement — confirmed directly: the phone field displays a "Please
   enter a valid phone number" message but does **not** actually block
   submission, sending the invalid value to the backend regardless. This
   means client-side validation cannot be trusted as a real gate, and any
   field where server-side enforcement hasn't been independently confirmed
   should be treated as unverified. This is the top priority because it's
   both a UX trust issue (users are shown false reassurance/warnings that
   don't reflect real behavior) and a data-integrity issue (bad data
   reaches the backend).

2. **Keyboard accessibility — required consent checkbox is not keyboard-
   operable.** The consent checkbox (legally required before submission —
   PII/consent-to-contact language) cannot be toggled via keyboard at all.
   Given the legal significance of consent capture, this is elevated to a
   primary risk area alongside field validation, not treated as a general
   a11y nice-to-have. A user relying on keyboard navigation cannot
   complete the form's legally-required consent step, which is both an
   accessibility failure and a compliance exposure.

Secondary/lower priority: client-side runtime errors (uncaught exceptions
during submission) and environment configuration (SSR/hydration timing
issues affecting form reliability) — real defects found and automated as
regression guards, but lower risk than (1) and (2) above since they were
found to be less directly tied to legal/compliance exposure or silent data
corruption.

## Test approach

| Layer | Method | Tooling |
|---|---|---|
| UI functional & validation | Automated E2E, Page Object Model | Playwright (chromium + webkit) |
| Exploratory | Manual, DevTools network/console inspection | Chrome DevTools |
| API | Automated request/response assertions | Postman / Newman |
| Accessibility | Manual keyboard-only walkthrough (this pass); automated scan recommended next | axe-core (not yet integrated — see Known Limitations) |

Two tiers of UI tests, tag-driven so either can run independently in CI:
- **`@smoke`** — single happy-path submission, both browsers. Gates build health.
- **`@regression`** — negative/edge cases and defect-regression guards.

## Test environment

- Target: `https://public-site.stage.exclusiveresorts.com/inquire/`
- Browsers: Chromium, WebKit (Firefox not yet included — time constraint, not a deliberate exclusion)
- API testing target: same host, `/submit-form/` and `/validate-email/` endpoints

## Entry / exit criteria

**Entry:** staging environment reachable; no active deploy in progress.

**Exit:**
- `@smoke` passes on both browsers — required to consider the form releasable.
- `@regression` suite run and all results triaged (pass, or failure filed as a known/tracked defect — not silently ignored).
- All identified defects logged with repro steps and severity (see Findings below).
- Any blocked test area (e.g. API testing blocked by infrastructure) documented with what was tried and what's needed to unblock it.

## Test case matrix

| ID | Title | Type | Priority | Status |
|---|---|---|---|---|
| TC-01 | Page loads with all required fields visible | Smoke / UI | P0 | Implicit (fields interacted with in smoke test) — no dedicated visibility assertion yet |
| TC-02 | Submit valid lead — success confirmation displayed | Smoke / E2E | P0 | **Partial.** Automated test asserts the captured request payload, not that a success confirmation renders in the UI — gap to close |
| TC-03 | Empty submit blocks and shows required-field errors | Negative | P0 | **Partial.** Automated test confirms submission is blocked (no payload captured); does not yet assert the error messages are visibly shown (app has no native `:invalid` state — custom JS only, confirmed during development) |
| TC-04 | Malformed email rejected | Negative | P1 | Automated |
| TC-05 | Phone field accepts invalid input with no client- or server-side rejection | Negative | P1 | Automated — **this is BUG-02** below; confirmed the client message displays but doesn't block submission |
| TC-06 | Postal code accepts values exceeding the stated 1–15 char range | Negative | P1 | Not yet covered |
| TC-07 | Postal code validation inconsistent — blocks some special chars, not others | Negative | P1 | Not yet covered (new exploratory finding, not previously automated) |
| TC-08 | Consent checkbox required — submit blocked when unchecked | Compliance | P0 | Automated |
| TC-09 | XSS payload in Name renders as text, no script execution | Security | P0 | Not yet covered — API layer has a SQL-injection check (API-05) but no XSS check on the UI Name field yet |
| TC-10 | Radios (Phone/Text/Email) selectable & mutually exclusive | UI | P1 | Not yet covered |
| TC-11 | SMS opt-in is optional — form submits without it | Functional | P1 | Not yet covered |
| TC-12 | Form is keyboard-navigable (tab order, Enter to submit) | Accessibility | P1 | Not yet covered |
| TC-13 | Double-clicking Submit does not create duplicate leads | Concurrency | P1 | Not yet covered |
| TC-14 | Valid international phone with "+" prefix is accepted | Boundary | P2 | Not yet covered |
| TC-15 | Preferred Time of Day dropdown responds to keyboard input | Accessibility | P1 | Not yet covered |
| TC-16 | Consent checkbox toggles via Space bar; Enter does not trigger submission while focused | Accessibility | P0 | Not yet covered — **this is BUG-03** below; exploratory testing found the checkbox isn't keyboard-operable at all, which is more severe than TC-16 as scoped (the issue isn't just Space-vs-Enter behavior, it's that no keyboard path reaches/toggles the checkbox) |

**Coverage gaps worth flagging honestly:** TC-06, TC-07, TC-09 through TC-15
are designed but not yet automated — time-boxed out, not skipped by
oversight. TC-02 and TC-03 are automated against backend behavior
(payload sent/not sent) but not against the actual UI feedback the user
sees, which is a real gap: a test can pass on "no request fired" while the
page still shows something misleading (or nothing) to the user. Closing
that gap is the single highest-value next step given BUG-04 already showed
this app fails silently more than once.

## Findings summary

| ID | Finding | Severity | Status |
|---|---|---|---|
| BUG-01 | Uncaught `TypeError` (`Cannot read properties of undefined (reading 'country')`) during submit | High | Automated as a regression guard |
| BUG-02 (TC-05) | Phone field shows validation error but does not block submission — invalid value reaches backend | High | Automated as a regression test (documents actual behavior) |
| BUG-03 (TC-16) | Consent checkbox not operable via keyboard — legally required field, no keyboard path to complete it | High | Found exploratorily; not yet automated (see Known Limitations) |
| BUG-04 | Submit silently no-ops if clicked before async `/validate-email/` call resolves — no error, no request, no user feedback | Medium-High | Root-caused during smoke test development; test now waits on this response deterministically |
| N/A | Nuxt hydration race: form fields can be silently wiped by client-side re-render if interacted with before hydration completes | Medium | Fixed in test setup (`waitForLoadState('networkidle')` + interactive-element check); worth flagging to dev team as a real-user risk on slow connections, not just a test-timing issue |

## Known limitations & next steps

- **Keyboard-accessibility failure (BUG-03) is documented but not yet
  automated.** With more time: a Playwright test that tabs through the
  form using `page.keyboard.press('Tab')` and asserts the consent checkbox
  receives focus and responds to `Space`/`Enter`, plus a broader axe-core
  scan on the smoke test as a cheap accessibility regression net.
- **Server-side validation for other fields (beyond phone) is unconfirmed** —
  API-level testing against real staging is currently blocked by a
  CloudFront 403 at the CDN layer (see `README-postman.md`). Until that's
  resolved, whether email/postal-code/consent are genuinely enforced
  server-side (vs. just client-side, like phone) remains unverified for
  those specific fields.
- **Only chromium + webkit covered**, not firefox.
