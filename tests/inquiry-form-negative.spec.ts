import { test, expect } from '@playwright/test';
import { InquiryPage } from '../pages/InquiryPage';

test.describe('inquiry form validation', () => {
  test('blocks submit when required fields are empty', { tag: '@regression' }, async ({ page }) => {
    const inquiry = new InquiryPage(page);
    await inquiry.stubSubmit();
    await inquiry.goto();
    await inquiry.submit();

    await page.screenshot({ path: 'empty-submit.png', fullPage: true });
    expect(inquiry.getCapturedPayload()).toBeNull();
  });

  test('rejects an invalid email format', { tag: '@regression' }, async ({ page }) => {
    const inquiry = new InquiryPage(page);
    await inquiry.stubSubmit();
    await inquiry.goto();

    await inquiry.fillName('QA Candidate');
    await inquiry.fillLastName('Jack Faulkner');
    await inquiry.fillEmail('not-an-email');
    await inquiry.fillPostalCode('80014');
    await inquiry.fillPhone('4239032636');
    await inquiry.selectContactMethod('Email');
    await inquiry.checkConsent();
    await inquiry.submit();

    expect(inquiry.getCapturedPayload()).toBeNull();
    });

  test('blocks submit when consent is not checked', { tag: '@regression' }, async ({ page }) => {
    const inquiry = new InquiryPage(page);
    await inquiry.stubSubmit();
    await inquiry.goto();

    await inquiry.fillName('QA Candidate');
    await inquiry.fillLastName('Jack Faulkner');
    await inquiry.fillEmail('qa.candidate+twdfaulkner@gmail.com');
    await inquiry.fillPostalCode('80014');
    await inquiry.fillPhone('4239032636');
    await inquiry.selectContactMethod('Email');
    // intentionally skip checkConsent()
    await inquiry.submit();

    expect(await inquiry.isConsentChecked()).toBeFalsy();
    expect(inquiry.getCapturedPayload()).toBeNull();
  });

  test('does not throw an uncaught error on submit (BUG-01 regression)', { tag: '@regression' }, async ({ page }) => {
    const inquiry = new InquiryPage(page);
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await inquiry.stubSubmit();
    await inquiry.goto();
    await inquiry.fillValidForm();
    await inquiry.submit();

    expect(pageErrors, `Unexpected uncaught error(s): ${pageErrors.join('; ')}`).toEqual([]);
  });

    test('phone validation message shows but does not block submit (known defect)', { tag: '@regression' }, async ({ page }) => {
    const inquiry = new InquiryPage(page);
    await inquiry.stubSubmit();
    await inquiry.goto();

    await inquiry.fillName('QA Candidate');
    await inquiry.fillLastName('Jack Faulkner');
    await inquiry.fillEmail('qa.candidate+twdfaulkner@gmail.com');
    await inquiry.fillPostalCode('80014');
    await inquiry.fillPhone('123'); // malformed — triggers the visible error
    await inquiry.selectContactMethod('Email');
    await inquiry.checkConsent();

    await inquiry.submit();

    expect(await inquiry.isPhoneErrorVisible()).toBeTruthy();
    expect(inquiry.getCapturedPayload()).not.toBeNull(); // documents the actual (buggy) behavior
    });
});