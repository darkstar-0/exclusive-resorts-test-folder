import { test, expect } from '@playwright/test';
import { InquiryPage } from '../pages/InquiryPage';

// TC-16 (BUG-03): consent checkbox must be reachable and toggleable via
// keyboard alone. Highest-priority accessibility/compliance finding in the
// risk assessment — consent capture has legal significance, so a
// keyboard-only user who cannot toggle it cannot legally consent, meaning
// they cannot complete the form at all.
test.describe('inquiry form keyboard accessibility', () => {
  test('consent checkbox can be reached and toggled via keyboard (TC-16)', { tag: '@regression' }, async ({ page }) => {
    const inquiry = new InquiryPage(page);
    await inquiry.stubSubmit();
    await inquiry.goto();

    // Start from a known field rather than assuming absolute tab order.
    await inquiry.name.focus();

    // Tab forward a bounded number of times looking for the checkbox to
    // receive focus. Bounded so a real failure (checkbox unreachable)
    // fails fast instead of hanging.
    const MAX_TABS = 20;
    let reached = false;
    for (let i = 0; i < MAX_TABS; i++) {
      await page.keyboard.press('Tab');
      const isFocused = await inquiry.consentCheckbox.evaluate(
        (el) => el === document.activeElement
      ).catch(() => false);
      if (isFocused) {
        reached = true;
        break;
      }
    }

    expect(reached, 'Consent checkbox was never reached via Tab within 20 presses').toBeTruthy();

    // Confirm current state, then attempt to toggle with Space.
    const before = await inquiry.isConsentChecked();
    await page.keyboard.press('Space');
    const after = await inquiry.isConsentChecked();

    expect(after, 'Space bar did not toggle the consent checkbox while it had focus').toBe(!before);
  });

  test('Enter does not submit the form while consent checkbox has focus', { tag: '@regression' }, async ({ page }) => {
    const inquiry = new InquiryPage(page);
    await inquiry.stubSubmit();
    await inquiry.goto();

    await inquiry.fillName('QA Candidate');
    await inquiry.fillLastName('Jack Faulkner');
    await inquiry.fillEmail('qa.candidate+twdfaulkner@gmail.com');
    await inquiry.fillPostalCode('80014');
    await inquiry.fillPhone('4239032636');
    await inquiry.selectContactMethod('Email');

    await inquiry.consentCheckbox.focus();
    await page.keyboard.press('Enter');

    // A premature Enter-triggered submit would populate this — it should
    // still be null, since consent wasn't deliberately checked+submitted.
    expect(inquiry.getCapturedPayload()).toBeNull();
  });
});
