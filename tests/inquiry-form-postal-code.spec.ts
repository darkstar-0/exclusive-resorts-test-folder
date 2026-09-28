import { test, expect } from '@playwright/test';
import { InquiryPage } from '../pages/InquiryPage';

test.describe('inquiry form postal code validation', () => {
  // TC-06: postal code should be constrained to the stated 1-15 character
  // range. Written to assert the CORRECT behavior (rejection). If this
  // test fails, that confirms the reported defect (over-length values are
  // silently accepted) — at that point, flip the assertion to
  // `.not.toBeNull()` and retitle as a documented "known defect" test,
  // same pattern as the malformed-phone case.
  test('postal code exceeding 15 characters is rejected (TC-06)', { tag: '@regression' }, async ({ page }) => {
    const inquiry = new InquiryPage(page);
    await inquiry.stubSubmit();
    await inquiry.goto();

    await inquiry.fillName('QA Candidate');
    await inquiry.fillLastName('Jack Faulkner');
    await inquiry.fillEmail('qa.candidate+twdfaulkner@gmail.com');
    await inquiry.fillPostalCode('123456789012345678'); // 18 chars, exceeds stated 15-char max
    await inquiry.fillPhone('4239032636');
    await inquiry.selectContactMethod('Email');
    await inquiry.checkConsent();
    await inquiry.submit();

    expect(
      inquiry.getCapturedPayload(),
      'Over-length postal code (18 chars, stated max is 15) was accepted and submitted'
    ).toBeNull();
  });

  // TC-07 (known defect): exploratory testing found postal code validation
  // is inconsistent — it blocks some special characters (e.g. "©") but not
  // others (e.g. repeated dashes). This test documents the ACTUAL observed
  // behavior rather than the ideal behavior, same pattern as the
  // malformed-phone known-defect test.
  test('postal code special-character validation is inconsistent (TC-07, known defect)', { tag: '@regression' }, async ({ page }) => {
    const inquiryBlocked = new InquiryPage(page);
    await inquiryBlocked.stubSubmit();
    await inquiryBlocked.goto();

    await inquiryBlocked.fillName('QA Candidate');
    await inquiryBlocked.fillLastName('Jack Faulkner');
    await inquiryBlocked.fillEmail('qa.candidate+twdfaulkner@gmail.com');
    await inquiryBlocked.fillPostalCode('8001©'); // special char reported to be blocked
    await inquiryBlocked.fillPhone('4239032636');
    await inquiryBlocked.selectContactMethod('Email');
    await inquiryBlocked.checkConsent();
    await inquiryBlocked.submit();

    expect(
      inquiryBlocked.getCapturedPayload(),
      'Expected "©" in postal code to be blocked, consistent with prior exploratory findings'
    ).toBeNull();
  });

  test('postal code with repeated dashes is NOT blocked, unlike other special characters (TC-07, known defect)', { tag: '@regression' }, async ({ page }) => {
    const inquiryAccepted = new InquiryPage(page);
    await inquiryAccepted.stubSubmit();
    await inquiryAccepted.goto();

    await inquiryAccepted.fillName('QA Candidate');
    await inquiryAccepted.fillLastName('Jack Faulkner');
    await inquiryAccepted.fillEmail('qa.candidate+twdfaulkner@gmail.com');
    await inquiryAccepted.fillPostalCode('80--14'); // repeated dashes, reported to pass through
    await inquiryAccepted.fillPhone('4239032636');
    await inquiryAccepted.selectContactMethod('Email');
    await inquiryAccepted.checkConsent();
    await inquiryAccepted.submit();

    expect(
      inquiryAccepted.getCapturedPayload(),
      'Documents the known inconsistency: repeated dashes pass through where "©" is blocked'
    ).not.toBeNull();
  });
});
