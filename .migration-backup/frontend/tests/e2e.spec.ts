import { test, expect } from '@playwright/test';

test.describe('File Master E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local server dashboard
    await page.goto('http://localhost:3000');
  });

  test('should display the upload zone and header on load', async ({ page }) => {
    // Verify Page Header
    await expect(page.locator('h1')).toHaveText('File Master');
    
    // Verify Drag Zone
    const uploadZone = page.locator('[role="button"][aria-label*="File upload zone"]');
    await expect(uploadZone).toBeVisible();
  });

  test('should transition to step 2 configuration after uploading image in mock mode', async ({ page }) => {
    // 1. Force standalone simulator mode to run independent client-only tests
    const toggle = page.locator('[role="switch"][aria-label*="standalone"]');
    await expect(toggle).toBeVisible();
    
    const isChecked = await toggle.getAttribute('aria-checked');
    if (isChecked === 'false') {
      await toggle.click();
    }
    
    // 2. Set up file chooser for mock upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[role="button"][aria-label*="File upload zone"]').click();
    const fileChooser = await fileChooserPromise;
    
    // Create a mock buffer representing a JPEG image
    await fileChooser.setFiles([{
      name: 'test_photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-jpeg-magic-bytes')
    }]);

    // 3. Confirm file details are listed in preview list
    await expect(page.locator('text=test_photo.jpg')).toBeVisible();
    
    // 4. Click Suggestion tool grid or select option
    const compressTool = page.locator('text=Compress Images');
    await compressTool.click();

    // 5. Select slider / configuration options
    await expect(page.locator('text=Operation Settings')).toBeVisible();
    await expect(page.locator('text=Output Quality')).toBeVisible();
    
    // 6. Click Process Action and wait for Download Hub step transition
    const processBtn = page.locator('button:has-text("Process files")');
    await processBtn.click();
    
    // Wait for the simulated countdown expiration alerts
    await expect(page.locator('text=processed successfully')).toBeVisible();
    await expect(page.locator('text=Download now')).toBeVisible();
  });
});
