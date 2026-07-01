import { test, expect } from '@playwright/test'

const TEST_EMAIL = `test+${Date.now()}@example.com`
const TEST_PASSWORD = 'testpass123'

test('landing page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Pay for anything')).toBeVisible()
  await expect(page.getByText('Get started')).toBeVisible()
})

test('register page renders', async ({ page }) => {
  await page.goto('/register')
  await expect(page.getByText('Create account')).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
})

test('register form validates', async ({ page }) => {
  await page.goto('/register')
  await page.getByRole('button', { name: 'Create account' }).click()
  // HTML5 validation prevents submit — email field should be focused
  const email = page.getByLabel('Email')
  await expect(email).toBeFocused()
})

test('login page renders', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('Welcome back')).toBeVisible()
})

test('invalid login shows error', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('wrong@example.com')
  await page.getByLabel('Password').fill('wrongpassword')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Invalid email or password')).toBeVisible()
})

test('unauthenticated access to dashboard redirects to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/login')
})

test('unauthenticated access to admin redirects to login', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL('/login')
})
