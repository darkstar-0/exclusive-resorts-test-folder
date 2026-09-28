import { test, expect } from '@playwright/test';
import { InquiryPage } from '../pages/InquiryPage';

// TC-02 / TC-03: earlier tests only confirmed backend behavior (was a
// request sent or not). Given this app has already shown a pattern of
// failing silently with no user-facing signal (BUG-04: submit no-ops
// during the async email-validation race), these tests close that gap by
// asserting what the USER actually sees, not just what hits the network.
//
// TC-02 note: confirmed there is no static "success" message on submit —
// a successful submission advances the user to the next step (the
// referral/club-connection page). So "success is visible" is checked as
// "the page actually moved on," via didAdvanceAfterSubmit().
//
// ADJUST: hasVisibleFieldErrors() in InquiryPage uses a broad, guessed
// selector (see InquiryPage.ts). Replace with the app's real error markup
// once visible in the DOM.
test.describe('inquiry form UI feedback', () => {
  test.fixme('valid submission advances to the next step (TC-02) — blocked: real /submit-form/ response shape unknown, stub may not trigger real navigation logic', { tag: '@regression' }, async ({ page }) => {
    const inquiry = new InquiryPage(page);
    await inquiry.stubSubmit();
    await inquiry.goto();
    const urlBeforeSubmit = page.url();
    await inquiry.fillValidForm();
    await inquiry.submit();

    expect(inquiry.getCapturedPayload()).toContain('qa.candidate');
    expect(
      await inquiry.didAdvanceAfterSubmit(urlBeforeSubmit),
      'Request was sent successfully but the page never advanced to the next step (referral/club-connection page) — no visible confirmation to the user'
    ).toBeTruthy();
  });

  test('empty submit shows visible field-level errors, not just a blocked request (TC-03)', { tag: '@regression' }, async ({ page }) => {
    const inquiry = new InquiryPage(page);
    await inquiry.stubSubmit();
    await inquiry.goto();
    await inquiry.submit();

    expect(inquiry.getCapturedPayload()).toBeNull();
    expect(
      await inquiry.hasVisibleFieldErrors(),
      'Submission was blocked but no visible error indicated why — user gets no feedback'
    ).toBeTruthy();
  });
});