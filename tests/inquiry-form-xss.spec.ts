import { test, expect } from '@playwright/test';
import { InquiryPage } from '../pages/InquiryPage';

// TC-09: XSS payload in the Name field should render as inert text, never
// execute. Uses an <img onerror=...> payload rather than alert()/script
// tags — it sets a page-global flag instead of popping a dialog, which
// would otherwise block the test (dialogs must be avoided per Playwright
// automation guidance) and is a more reliable signal than trying to spot
// an alert.
test.describe('inquiry form XSS handling', () => {
  test('script/event-handler payload in Name does not execute (TC-09)', { tag: '@regression' }, async ({ page }) => {
    const inquiry = new InquiryPage(page);
    await inquiry.stubSubmit();
    await inquiry.goto();

    const xssPayload = '<img src=x onerror="window.__xssFired = true">';

    await inquiry.fillName(xssPayload);
    await inquiry.fillLastName('Jack Faulkner');
    await inquiry.fillEmail('qa.candidate+twdfaulkner@gmail.com');
    await inquiry.fillPostalCode('80014');
    await inquiry.fillPhone('4239032636');
    await inquiry.selectContactMethod('Email');
    await inquiry.checkConsent();
    await inquiry.submit();

    // The payload should never execute, whether echoed back on the page
    // immediately or (if the app renders any post-submit confirmation
    // that includes the submitted name) after submission.
    const xssFired = await page.evaluate(() => (window as any).__xssFired === true);
    expect(xssFired, 'XSS payload executed — Name field is not safely escaped when rendered').toBeFalsy();

    // Defense-in-depth: also confirm no live <script> element on the page
    // contains our marker (covers a raw-script-tag injection variant, in
    // case a different field/rendering path is more permissive).
    const scriptContents = await page.locator('script').allTextContents();
    const leaked = scriptContents.some((s) => s.includes('__xssFired'));
    expect(leaked, 'Payload marker found injected into a live <script> tag on the page').toBeFalsy();
  });
});
