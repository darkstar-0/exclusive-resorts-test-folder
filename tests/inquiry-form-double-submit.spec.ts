import { test, expect } from '@playwright/test';
import { InquiryPage } from '../pages/InquiryPage';

// TC-13: double-clicking Submit (or two rapid clicks) should not create
// duplicate leads. Worth automating given this app already has known
// history of submit-handler race conditions (BUG-04: async email
// validation race). Requires InquiryPage.getSubmissionCount() — see
// InquiryPage-additions-2.ts.
test.describe('inquiry form double-submit', () => {
  test('rapid double-click on Submit does not create duplicate leads (TC-13)', { tag: '@regression' }, async ({ page }) => {
    const inquiry = new InquiryPage(page);
    await inquiry.stubSubmit();
    await inquiry.goto();
    await inquiry.fillValidForm();

    if ((inquiry as any).emailValidated) {
      await (inquiry as any).emailValidated;
    }

    // Fire two clicks back-to-back without waiting between them, rather
    // than using submit() twice sequentially (which would naturally
    // serialize and might not reproduce a real race).
    await Promise.all([
      inquiry.submitButton.click(),
      inquiry.submitButton.click({ force: true }).catch(() => {
        // second click may hit a disabled/removed button if the app
        // guards against this correctly — that's fine, not a test failure
      }),
    ]);

    // Give any in-flight network activity a moment to settle.
    await page.waitForTimeout(1000);

    expect(
      inquiry.getSubmissionCount(),
      `Expected exactly 1 submission, but the endpoint was hit ${inquiry.getSubmissionCount()} times — double-click created duplicate lead(s)`
    ).toBe(1);
  });
});
