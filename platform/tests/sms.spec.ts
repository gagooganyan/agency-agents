import { test, expect } from '@playwright/test'

test('sms page is protected', async ({ page }) => {
  await page.goto('/dashboard/sms')
  await expect(page).toHaveURL('/login')
})

test('pricing section shows SMS pricing', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('SMS Activation')).toBeVisible()
  await expect(page.getByText('from $0.15')).toBeVisible()
})
