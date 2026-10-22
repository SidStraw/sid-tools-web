import { test, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { startMock } from '../helpers/mock-runtime';
test('local SPA changes real HTTP scenarios and restores saved settings after restart', async ({
  page,
}) => {
  const dir = await mkdtemp(join(tmpdir(), 'stw24-browser-')),
    state = join(dir, 'state.json'),
    fixture = resolve('tests/fixtures/mock-runtime/contract.json');
  let runtime: Awaited<ReturnType<typeof startMock>> | undefined;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    runtime = await startMock(fixture, state);
    await page.goto(runtime.url);
    await page.locator('#mock-connect').click();
    await expect(page.locator('#mock-controls')).toBeVisible();
    await page.locator('#mock-operation').selectOption('GET /pets/{id}');
    const snapshot = await runtime.snapshot(),
      second = snapshot.choices.find((c) => c.example === 'second')!,
      error = snapshot.choices.find((c) => c.status === '503')!;
    await page.locator('#mock-choice').selectOption(second.id);
    await page.locator('#mock-preview').click();
    await expect(page.locator('#mock-fixture')).toContainText('<img src=x onerror=alert(1)>');
    expect(await page.locator('#mock-fixture img').count()).toBe(0);
    await page.locator('#mock-choice').selectOption(error.id);
    await expect(page.locator('#mock-fixture')).toBeHidden();
    await page.locator('#mock-delay').fill('75');
    await page.locator('#mock-apply').click();
    await expect(page.locator('#mock-status')).toContainText('情境已保存');
    const response = await fetch(runtime.origin + '/mock/pets/123');
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'try-again' });
    await page.setViewportSize({ width: 320, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: test.info().outputPath('mock-api-mobile.png'), fullPage: true });
    await page.evaluate(() => {
      (window as unknown as { mockSpa: number }).mockSpa = 1;
    });
    await page.getByRole('navigation').getByRole('link', { name: '圖片壓縮', exact: true }).click();
    await expect(page.locator('#file-input')).toBeAttached();
    await page.goBack();
    await expect(page.locator('#mock-connect')).toBeVisible();
    await expect(page.locator('#mock-controls')).toBeHidden();
    expect(await page.evaluate(() => (window as unknown as { mockSpa: number }).mockSpa)).toBe(1);
    await runtime.stop();
    runtime = await startMock(fixture, state);
    await page.goto(runtime.url);
    await page.locator('#mock-connect').click();
    await expect(page.locator('#mock-controls')).toBeVisible();
    await page.locator('#mock-operation').selectOption('GET /pets/{id}');
    await expect(page.locator('#mock-choice')).toHaveValue(error.id);
    await expect(page.locator('#mock-delay')).toHaveValue('75');
    await page.locator('#mock-clear').click();
    await expect(page.locator('#mock-controls')).toBeHidden();
    await expect(page.locator('#mock-fixture')).toBeEmpty();
    expect((await fetch(runtime.origin + '/mock/pets/1')).status).toBe(503);
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
    expect(errors).toEqual([]);
  } finally {
    await runtime?.stop();
    await rm(dir, { recursive: true, force: true });
  }
});
test('static SSG explains setup without contacting a local service automatically', async ({
  page,
}) => {
  const calls: string[] = [];
  page.on('request', (r) => calls.push(r.url()));
  await page.goto('tools/mock-api/');
  await expect(page.getByRole('heading', { name: 'OpenAPI Mock API 情境服務' })).toBeVisible();
  await expect(page.locator('#mock-controls')).toBeHidden();
  expect(calls.some((u) => u.includes('/__sidtools/') || u.includes(':4010'))).toBe(false);
});
