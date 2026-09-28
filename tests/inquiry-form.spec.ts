import { test, expect } from '@playwright/test';
import { InquiryPage } from '../pages/InquiryPage';

test('happy path submit succeeds', { tag: '@smoke' }, async ({ page }) => {
    const inquiry = new InquiryPage(page);
    await inquiry.stubSubmit();
    await inquiry.goto();
    await inquiry.fillValidForm();
    await page.screenshot({ path: 'before-submit.png', fullPage: true });
    await inquiry.submit();
    expect(inquiry.getCapturedPayload()).toContain('qa.candidate');
});