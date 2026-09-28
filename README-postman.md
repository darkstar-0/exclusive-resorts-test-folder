# Inquiry Form API Collection — README

## What this covers

Postman/Newman collection exercising `POST {{baseUrl}}/submit-form/`, the
backend endpoint the `/inquire/` form on `public-site.stage.exclusiveresorts.com`
posts to. Built from a real captured request (via Playwright route
interception during UI test development), covering the 8 scenarios below.

| ID | Scenario | Expected |
|----|----------|----------|
| API-01 | POST with all valid fields | 2xx, success payload |
| API-02 | POST missing a required field (Email) | 4xx with field-level error |
| API-03 | POST with malformed email | 4xx validation error |
| API-04 | POST without consent flag (`termsAgreement=false`) | 4xx — server-side enforcement |
| API-05 | POST with SQL-injection payload in FirstName | Sanitized; no DB error leaked |
| API-06 | GET on the submit endpoint | 405 Method Not Allowed |
| API-07 | Response time p95 over 10 calls | All < 2000ms |
| API-08 | Response shape matches contract | Required keys present, correct types |

## ⚠️ Important caveat — read before trusting a green run

**Every request capture used to build this collection came from Playwright's
`page.route()` interception, which stubs the response before it ever reaches
the real server.** We have high confidence in the *request* shape (field
names, encoding, the `values`/`form` envelope) because that's exactly what a
real browser sent. We have **no confirmed evidence of the real response
shape or the real status codes for the negative/edge cases** — those
assertions are reasonable inferences, marked `ADJUST AFTER LIVE RUN` in the
test scripts (API-01, API-02, API-08).

**Before treating this as done:** run it once against real staging and
update those assertions to match what actually comes back. If the endpoint
is protected (CSRF token, bot/WAF detection, rate limiting) and Postman
can't get a clean response even for the baseline case, don't force it — this
is exactly the scenario the assessment brief calls out. Document instead:
what you tried, what you observed (status code, headers, any block page),
and what you'd do in a real engagement (request a staging bypass token from
the backend team, or fall back to Playwright's `APIRequestContext`, which
carries the browser's session/cookies and may get past bot detection that a
bare Postman/Newman call won't).

## Files

- `collection.json` — the Postman collection (import into Postman, or run via Newman).
- `environment.json` — `baseUrl` and `perfIterations`, placeholder values, no secrets.
  - Currently set to staging (`https://public-site.stage.exclusiveresorts.com`).
  - To point at production, edit `baseUrl` in this file to the real prod host —
    the actual production domain wasn't confirmed during UI testing (only
    staging was exercised), so don't assume the obvious `public-site.exclusiveresorts.com`
    without checking.

## Running it

Install Newman once:
```
npm install -g newman
```

Run the full collection (all scenarios once):
```
newman run collection.json -e environment.json
```

Run just the performance scenario (API-07) 10 times, isolated from the rest,
so the p95 calculation gets a real 10-sample window:
```
newman run collection.json -e environment.json --folder "API-07 - Response Time (p95)" -n 10
```

## Known open items

- API-08's exact response contract is a placeholder (`{ success: boolean }`) —
  replace with the real shape once observed live.
- API-02/API-03's assertion that the error text mentions the field name is a
  guess at the error format — adjust once you see the real 4xx body.
- Given today's UI testing found that the **phone field's client-side
  validation message displays but does not actually block submission** (a
  real defect found via Playwright, not fixed at time of writing), it's
  worth specifically checking whether the *server* also fails to enforce
  phone format — if so, that's the same defect class as API-03/API-04 are
  testing for on email/consent, and worth adding as an explicit API-09 case
  if time allows.
