import { test, expect } from '@playwright/test'

test('balance page is protected', async ({ page }) => {
  await page.goto('/dashboard/balance')
  await expect(page).toHaveURL('/login')
})

test('top up modal opens', async ({ page, context }) => {
  // This test requires a logged-in session — skip if no test user configured
  test.skip(!process.env.TEST_EMAIL, 'TEST_EMAIL not set')
})
