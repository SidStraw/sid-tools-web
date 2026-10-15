import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { GitDiffExport } from '@sid-tools/core/git-diff';

test('Git review has explicit file AND hunk selection; preview and both downloads exclude unselected sensitive content and headers', async ({
  page,
}) => {
  await page.goto('tools/git-diff/');
  await expect(page.locator('#route-loading')).toBeHidden();
  const requests: string[] = [],
    errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (
      /^https?:/.test(url.protocol) &&
      (url.origin !== 'http://127.0.0.1:4173' ||
        !url.pathname.startsWith('/assets/') ||
        r.method() !== 'GET')
    )
      requests.push(r.url());
  });
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#status')).toContainText('4 個檔案、4 個 hunk');
  const files = page.locator('.diff-file');
  await expect(files).toHaveCount(4);
  for (const [index, kind] of [
    [0, '修改'],
    [1, '新增'],
    [2, '刪除'],
    [3, '重新命名'],
  ] as const)
    await expect(files.nth(index).locator('.diff-kind')).toHaveText(kind);
  await expect(page.locator('#preview-run')).toBeDisabled();
  await expect(page.locator('#export')).toBeDisabled();
  expect(await page.locator('#result input:checked').count()).toBe(0);
  const app = files.nth(0),
    fileBox = app.locator('input[data-file-id]'),
    safeHunk = app.locator('input[data-hunk-id]').nth(0),
    privateHunk = app.locator('input[data-hunk-id]').nth(1);
  await expect(safeHunk).toBeDisabled();
  await fileBox.focus();
  await page.keyboard.press('Space');
  await expect(safeHunk).not.toBeChecked();
  await expect(privateHunk).not.toBeChecked();
  await page.locator('#preview-run').click();
  await expect(page.locator('#selection-error')).toContainText('明確選取檔案與至少一個 hunk');
  await expect(page.locator('#preview')).toBeHidden();
  await app
    .locator('.diff-hunk')
    .first()
    .getByRole('button', { name: '原始 diff 第 5 行', exact: true })
    .click();
  await expect(page.locator('#patch')).toBeFocused();
  const selectedSource = await page.locator('#patch').evaluate((input) => {
    const node = input as HTMLTextAreaElement;
    return node.value.slice(node.selectionStart, node.selectionEnd);
  });
  expect(selectedSource).toBe('@@ -1 +1 @@ PRIVATE_SECTION_LABEL');
  await expect(app.locator('.diff-code-table th')).toHaveText([
    'diff 行',
    '舊行',
    '新行',
    '內容（含原始前綴）',
  ]);
  await expect(app.locator('.diff-line-added td')).toHaveText([
    '7',
    '—',
    '1',
    '+const label = "after";',
  ]);
  await safeHunk.check();
  await page.locator('#preview-run').click();
  await expect(page.locator('#preview')).toBeVisible();
  const previewJson = await page.locator('#preview-json').textContent();
  if (!previewJson) throw new Error('Missing JSON preview');
  const previewData = JSON.parse(previewJson) as GitDiffExport;
  expect(previewData.scope).toBe('selection-only');
  expect(previewData.summary).toMatchObject({ files: 1, hunks: 1, addedLines: 1, deletedLines: 1 });
  for (const secret of [
    'SYNTHETIC_OLD_SECRET',
    'SYNTHETIC_NEW_SECRET',
    'secrets/private.env',
    'ONLY_PRIVATE_BODY',
    'PRIVATE_SECTION_LABEL',
    'PRIVATE_HUNK_LABEL',
    'deadbeef',
    'feedbeef',
    'obsolete.txt',
    'old-name.md',
    'new-name.md',
  ]) {
    await expect(page.locator('#preview')).not.toContainText(secret);
    expect(previewJson).not.toContain(secret);
  }
  const downloadJson = page.waitForEvent('download');
  await page.locator('#export').click();
  const jsonPath = await (await downloadJson).path();
  if (!jsonPath) throw new Error('Missing JSON download');
  expect(JSON.parse(await readFile(jsonPath, 'utf8'))).toEqual(previewData);
  const downloadText = page.waitForEvent('download');
  await page.locator('#export-text').click();
  const textPath = await (await downloadText).path();
  if (!textPath) throw new Error('Missing extract download');
  expect(await readFile(textPath, 'utf8')).toBe(previewData.patch);
  expect(previewData.notice).toContain('not a complete or application-ready patch');
  await privateHunk.check();
  await expect(page.locator('#preview')).toBeHidden();
  await expect(page.locator('#export')).toBeDisabled();
  await privateHunk.uncheck();
  await page.locator('#preview-run').click();
  await expect(page.locator('#preview')).toBeVisible();
  await fileBox.uncheck();
  await expect(safeHunk).not.toBeChecked();
  await expect(safeHunk).toBeDisabled();
  await expect(page.locator('#preview')).toBeHidden();
  expect(
    await page.evaluate(() => [
      localStorage.length,
      sessionStorage.length,
      location.search,
      location.hash,
    ]),
  ).toEqual([0, 0, '', '']);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test('incomplete original diff reports binary/truncated/unsupported locations but permits only selected complete files', async ({
  page,
}) => {
  await page.goto('tools/git-diff/');
  await page.locator('#demo-invalid').click();
  await page
    .locator('#patch')
    .fill('UNSUPPORTED_PREAMBLE_SECRET\n' + (await page.locator('#patch').inputValue()));
  await page.locator('#run').click();
  await expect(page.locator('#result')).toContainText('輸入不完整');
  await expect(page.locator('#result')).toContainText('僅為已觀察統計');
  await expect(page.locator('.diff-diagnostic[data-code=unsupported-format]')).toContainText(
    '原始 diff 第 1 行',
  );
  await expect(page.locator('.diff-diagnostic[data-code=binary-unsupported]')).toContainText(
    '二進位',
  );
  expect(
    await page
      .locator(
        '.diff-diagnostic[data-code=truncated], .diff-diagnostic[data-code=hunk-count-mismatch]',
      )
      .count(),
  ).toBeGreaterThan(0);
  const files = page.locator('.diff-file');
  await expect(files.nth(1).locator('input[data-file-id]')).toBeDisabled();
  await expect(files.nth(2).locator('input[data-file-id]')).toBeDisabled();
  await files.nth(0).locator('input[data-file-id]').check();
  await files.nth(0).locator('input[data-hunk-id]').check();
  await page.locator('#preview-run').click();
  await expect(page.locator('#preview-scope')).toContainText('原始輸入仍不完整');
  await expect(page.locator('#preview')).not.toContainText('UNSUPPORTED_PREAMBLE_SECRET');
  await expect(page.locator('#preview')).not.toContainText('image.png');
  await expect(page.locator('#preview')).not.toContainText('broken.txt');
  const json = JSON.parse(
    (await page.locator('#preview-json').textContent()) ?? '{}',
  ) as GitDiffExport;
  expect(json.summary.complete).toBe(true);
  expect(json.files).toHaveLength(1);
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await page.locator('.diff-file').last().locator('input[data-file-id]').check();
  await page.locator('#preview-run').click();
  const renamed = JSON.parse(
    (await page.locator('#preview-json').textContent()) ?? '{}',
  ) as GitDiffExport;
  expect(renamed.files[0]?.kind).toBe('renamed');
  expect(renamed.summary.hunks).toBe(0);
  expect(renamed.patch).toContain('rename from "old-name.md"');
});

test('raw hostile paths and body remain literal text; source-grounded code review and preview fit mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('tools/git-diff/');
  const path = '<img src=x onerror=alert(1)>';
  await page
    .locator('#patch')
    .fill(
      `diff --git "a/${path}" "b/${path}"\n--- "a/${path}"\n+++ "b/${path}"\n@@ -1 +1 @@\n-<script>alert(1)</script>\n+<svg onload=alert(1)>`,
    );
  await page.locator('#run').click();
  await expect(page.locator('.diff-file h3')).toContainText(path);
  await expect(page.locator('.diff-code-table')).toContainText('<svg onload=alert(1)>');
  await expect(page.locator('#output img, #output svg, #output script')).toHaveCount(0);
  await page.locator('input[data-file-id]').check();
  await page.locator('input[data-hunk-id]').check();
  await page.locator('#preview-run').click();
  await expect(page.locator('#preview-patch')).toContainText(path);
  await expect(page.locator('#preview img, #preview svg')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('editing and rerunning resets source IDs/selections/preview; clear and SPA history discard all input', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('#route-loading')).toBeHidden();
  await page.evaluate(() => {
    document.documentElement.dataset.gitSession = 'same';
  });
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Git diff 檢視', exact: true })
    .click();
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await page.locator('.diff-file').first().locator('input[data-file-id]').check();
  await page.locator('.diff-file').first().locator('input[data-hunk-id]').first().check();
  await page.locator('#preview-run').click();
  await expect(page.locator('#preview')).toBeVisible();
  const raw = await page.locator('#patch').inputValue();
  await page.locator('#patch').fill('\n' + raw);
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#preview')).toBeHidden();
  await expect(page.locator('#export')).toBeDisabled();
  await page.locator('#run').click();
  await expect(page.locator('.diff-file').first()).toHaveAttribute('data-file-id', 'file-2');
  await expect(page.locator('#result input:checked')).toHaveCount(0);
  await expect(page.locator('#preview-run')).toBeDisabled();
  await page.locator('#clear').click();
  await expect(page.locator('#patch')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await page.getByRole('navigation').getByRole('link', { name: '.env 預檢', exact: true }).click();
  await expect(page).toHaveURL(/tools\/env-check\/$/);
  await page.goBack();
  await expect(page.locator('#patch')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#preview')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.dataset.gitSession)).toBe('same');
  await page.reload();
  await expect(page.locator('#patch')).toHaveValue('');
});

test('Git parser is lazy and a cleared slow load cannot restore old state; limits/unsupported/empty inputs stay honest', async ({
  page,
}) => {
  await page.goto('tools/git-diff/');
  await expect(page.locator('#route-loading')).toBeHidden();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/git-diff-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#status')).toHaveText('正在檢視…');
  await page.locator('#clear').click();
  release();
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#patch')).toHaveValue('');
  await page.locator('#run').click();
  await expect(page.locator('#result')).toContainText('沒有檔案變更');
  await page.locator('#patch').fill('x'.repeat(20_001));
  await page.locator('#run').click();
  await expect(page.locator('.diff-diagnostic[data-code=line-length-limit]')).toContainText(
    '原始 diff 第 1 行',
  );
  await expect(page.locator('.diff-file')).toHaveCount(0);
  await page.locator('#patch').fill('--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b');
  await page.locator('#run').click();
  await expect(page.locator('#result')).toContainText('不支援的 diff 格式');
  const body = Array.from({ length: 205 }, (_, i) => `+line${i}`).join('\n');
  await page
    .locator('#patch')
    .fill(
      `diff --git a/large.txt b/large.txt\nnew file mode 100644\n--- /dev/null\n+++ b/large.txt\n@@ -0,0 +1,205 @@\n${body}`,
    );
  await page.locator('#run').click();
  await expect(page.locator('.diff-code-table tbody tr')).toHaveCount(200);
  await page.getByRole('button', { name: '下一段', exact: true }).click();
  await expect(page.locator('.diff-code-table tbody tr')).toHaveCount(5);
  await expect(page.locator('.diff-code-pagination')).toContainText('201–205 / 205 行');
});
