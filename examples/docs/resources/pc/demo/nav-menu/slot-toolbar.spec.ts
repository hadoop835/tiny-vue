import { test, expect } from '@playwright/test';

test('Toolbar 插槽', async ({ page }) => {
    page.on('pageerror', (exception) => expect(exception).toBeNull());
    await page.goto('http://localhost:7130/pc/nav-menu/slot-toolbar');
    const preview = page.locator('#preview');
    await expect(preview.locator('.slot-toolbar svg')).toHaveCount(1);
});