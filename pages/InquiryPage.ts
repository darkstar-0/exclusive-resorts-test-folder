import { Page, Locator, expect } from '@playwright/test';

export class InquiryPage {
  readonly page: Page;

  readonly name: Locator; //matching page's structure and naming convention
  readonly lastName: Locator;
  readonly email: Locator;
  readonly postalCode: Locator;
  readonly countryCodeSelector: Locator;
  readonly phone: Locator;
  readonly phoneErrorMessage: Locator;
  readonly contactMethodPhone: Locator;
  readonly contactMethodText: Locator;
  readonly contactMethodEmail: Locator;
  readonly consentCheckbox: Locator;
  readonly smsConsentCheckbox: Locator;
  readonly submitButton: Locator;

  private capturedPayload: string | null = null;
  private emailValidated: Promise<unknown> | null = null;

  constructor(page: Page) {
    this.page = page;
    this.name = page.getByRole('textbox', { name: 'Name*' });
    this.lastName = page.getByRole('textbox', { name: 'Last' });
    this.email = page.getByRole('textbox', { name: 'Email*' });
    this.postalCode = page.getByRole('textbox', { name: 'Postal Code*' });
    this.countryCodeSelector = page.getByRole('button', { name: 'Country Code Selector' });
    this.phone = page.getByRole('textbox', { name: 'Enter a phone number' });
    this.phoneErrorMessage = page.getByText('Please enter a valid phone number');
    this.contactMethodPhone = page.getByRole('radio', { name: 'Phone', exact: true });
    this.contactMethodText = page.getByRole('radio', { name: 'Text', exact: true });
    this.contactMethodEmail = page.getByRole('radio', { name: 'Email', exact: true });
    this.consentCheckbox = page.getByRole('checkbox', { name: 'I expressly consent to' });
    this.smsConsentCheckbox = page.getByRole('checkbox', { name: 'Stay in the know. Sign up for' });
    this.submitButton = page.getByRole('button', { name: 'Submit' });
  }

  async goto() {
    await this.page.goto('https://public-site.stage.exclusiveresorts.com/inquire/');
    await this.page.waitForLoadState('networkidle');
    await expect(this.submitButton).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
  }

  async stubSubmit() {
    await this.page.route('**/submit-form/', async (route) => {
      this.capturedPayload = route.request().postData();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
  }

  async fillName(value: string) {
    await this.name.fill(value);
  }
 
  async fillLastName(value: string) {
    await this.lastName.fill(value);
  }
 
  async fillEmail(value: string) {
    this.emailValidated = this.page
      .waitForResponse(resp => resp.url().includes('/validate-email/'), { timeout: 5000 })
      .catch(() => null);
    await this.email.fill(value);
  }
 
  async fillPostalCode(value: string) {
    await this.postalCode.fill(value);
  }
 
  async fillPhone(value: string) {
    await this.phone.fill(value);
  }
  
  async isPhoneErrorVisible(): Promise<boolean> {
    return this.phoneErrorMessage.isVisible().catch(() => false);
  }
 
  async isConsentChecked(): Promise<boolean> {
    return this.consentCheckbox.isChecked();
  }

  async selectContactMethod(method: 'Phone' | 'Text' | 'Email') {
    await this.page.locator('label').filter({ hasText: new RegExp(`^${method}$`) }).click();
  }

  async checkConsent() {
    await this.page
      .locator('label')
      .filter({ hasText: 'I expressly consent to' })
      .first()
      .click({ position: { x: 5, y: 5 } });
  }

  async checkSmsOptIn() {
    await this.page.locator('label').filter({ hasText: 'Stay in the know' }).click();
  }

  // Call this AFTER submitting, to check what was sent (or wasn't)
  getCapturedPayload(): string | null {
    return this.capturedPayload;
  }

  async fillValidForm(overrides: Partial<{
    firstName: string; lastName: string; email: string;
    postalCode: string; phone: string;
    }> = {}) {
      this.emailValidated = this.page
      .waitForResponse(resp => resp.url().includes('/validate-email/'), { timeout: 5000 })
      .catch(() => null);

    await this.name.fill(overrides.firstName ?? 'QA Candidate');
    await this.lastName.fill(overrides.lastName ?? 'Jack Faulkner');
    await this.email.fill(overrides.email ?? 'qa.candidate+twdfaulkner@gmail.com');
    await this.postalCode.fill(overrides.postalCode ?? '80014');
    await this.phone.fill(overrides.phone ?? '4239032636');
    await this.selectContactMethod('Email');
    await this.checkConsent();
  }

  async submit() {
    if (this.emailValidated) await this.emailValidated;
    await this.submitButton.click();
  }

  async getInvalidFields() {
    return this.page.evaluate(() =>
      Array.from(document.querySelectorAll(':invalid')).map(el => ({
        tag: el.tagName,
        name: (el as HTMLInputElement).name,
        id: el.id,
        validationMessage: (el as HTMLInputElement).validationMessage,
      }))
    );
  }
}