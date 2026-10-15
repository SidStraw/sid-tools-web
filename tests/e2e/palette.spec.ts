import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function png(
  page: Page,
  colors: string[] = ['#000000', '#ffffff', 'rgba(255,0,0,0.5)', 'rgba(0,0,0,0)'],
) {
  const data = await page.evaluate((colors) => {
    const canvas = document.createElement('canvas');
    canvas.width = colors.length;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    colors.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(index, 0, 1, 1);
    });
    return canvas.toDataURL('image/png').split(',')[1]!;
  }, colors);
  return Buffer.from(data, 'base64');
}
async function upload(page: Page, buffer: Buffer, name = 'synthetic.png', mimeType = 'image/png') {
  await page.locator('#palette-file').setInputFiles({ name, mimeType, buffer });
}
async function run(page: Page) {
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
}
async function cssDownload(page: Page) {
  const pending = page.waitForEvent('download');
  await page.locator('#export').click();
  const path = await (await pending).path();
  if (!path) throw new Error('No CSS download');
  return readFile(path, 'utf8');
}
async function urlTracker(page: Page) {
  await page.evaluate(() => {
    const state = { created: 0, active: new Set<string>() },
      create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    Object.defineProperty(window, '__paletteUrls', { value: state });
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      state.created++;
      state.active.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      state.active.delete(url);
      revoke(url);
    };
  });
}
const activeUrls = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __paletteUrls: { active: Set<string> } }).__paletteUrls.active.size,
  );

test('real small PNG follows explicit backing, exact alpha/bucket counts and role assignment without claiming exact full-image colors', async ({
  page,
}) => {
  await page.goto('tools/palette/');
  await upload(page, await png(page));
  await page.locator('#run').click();
  await expect(page.locator('#error')).toContainText('明確選擇');
  await page.locator('#backing').selectOption('#ffffff');
  await run(page);
  await expect(page.locator('#sample-meta')).toContainText(
    '來源 4 pixels ／ 取樣 4 ／ 回傳 3 個 buckets ／ 省略 0 samples',
  );
  await expect(page.locator('.palette-swatch').first()).toHaveAttribute('data-hex', '#ffffff');
  await expect(page.locator('.palette-swatch').first()).toContainText('50% · 2 samples');
  await expect(page.locator('[data-hex="#ff7f7f"]')).toContainText('25% · 1 samples');
  await page.locator('#assign-role').selectOption('foreground');
  await page.locator('[data-hex="#000000"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#foreground')).toHaveValue('#000000');
  await page.locator('#assign-role').selectOption('background');
  await page.locator('[data-hex="#ffffff"]').click();
  await expect(page.locator('[data-pair=text]')).toHaveAttribute('data-ratio', '21');
  await expect(page.locator('[data-pair=text] [data-pass=true]')).toHaveCount(4);
  await page.locator('#backing').selectOption('#142e26');
  await expect(page.locator('[data-hex="#142e26"]')).toBeVisible();
  await expect(page.locator('[data-hex="#ffffff"]')).toContainText('25%');
  await expect(page.locator('#foreground')).toHaveValue('#000000');
  await expect(page.locator('#background')).toHaveValue('#ffffff');
});

test('manual RGBA source-over preview matches precise opaque token CSS; failing combinations stay visible and unsafe names never serialize', async ({
  page,
}) => {
  await page.goto('tools/palette/');
  await page.locator('#demo').click();
  await page.locator('#backing').selectOption('#ffffff');
  await run(page);
  await page.locator('#reference').click();
  await expect(page.locator('#css-output')).toHaveText('尚未選取 token。');
  await expect(page.locator('#export')).toBeDisabled();
  await page.locator('#foreground-alpha').fill('0.5');
  await expect(page.locator('[data-pair=text] [data-threshold=aaNormal]')).toContainText('未通過');
  await expect(page.locator('[data-pair=text] li')).toHaveCount(4);
  await expect(page.locator('#resolved-colors')).toContainText('rgb(127.5 127.5 127.5)');
  await expect(page.locator('#interface-preview')).toHaveCSS('color', 'rgb(128, 128, 128)');
  await page.locator('#token-foreground').check();
  await page.locator('#name-foreground').fill('body-text');
  const css = await cssDownload(page);
  expect(css).toBe(':root {\n  --body-text: rgb(127.5 127.5 127.5);\n}\n');
  await expect(page.locator('#css-output')).toHaveText(css.trim());
  expect(css).not.toContain('surface');
  expect(css).not.toContain('synthetic');
  await page.locator('#name-foreground').fill('x;}body{color:red');
  await expect(page.locator('#export')).toBeDisabled();
  await expect(page.locator('#css-output')).not.toContainText('body{');
  await page.locator('#name-foreground').fill('surface');
  await page.locator('#token-background').check();
  await expect(page.locator('#export')).toBeDisabled();
  await page.locator('#name-foreground').fill('text');
  await page.locator('#background').fill('#000000');
  await page.locator('#background-alpha').fill('0.5');
  await page.locator('#foreground').fill('#ffffff');
  await expect(page.locator('#resolved-colors')).toContainText('rgb(191.25 191.25 191.25)');
  expect(await cssDownload(page)).toContain('--text: rgb(191.25 191.25 191.25)');
  await page.locator('#foreground-alpha').fill('0');
  await expect(page.locator('[data-pair=text]')).toHaveAttribute('data-ratio', '1');
  await expect(page.locator('[data-pair=text] [data-pass=false]')).toHaveCount(4);
  await page.locator('#foreground').fill('#oops');
  await expect(page.locator('#export')).toBeDisabled();
  await expect(page.locator('#interface-preview')).toBeHidden();
  await expect(page.locator('#contrast-results')).toContainText('沒有可判定');
});

test('known references evaluate unrounded WCAG thresholds and state actual text requirements separately', async ({
  page,
}) => {
  await page.goto('tools/palette/');
  await page.locator('#demo').click();
  await page.locator('#backing').selectOption('#ffffff');
  await run(page);
  await page.locator('#reference').click();
  await expect(page.locator('[data-pair=text]')).toHaveAttribute('data-ratio', '21');
  await page.locator('#foreground').fill('#767676');
  await expect(page.locator('[data-pair=text] [data-threshold=aaNormal]')).toContainText('通過');
  expect(Number(await page.locator('[data-pair=text]').getAttribute('data-ratio'))).toBeCloseTo(
    4.542224959605253,
    12,
  );
  await page.locator('#foreground').fill('#777777');
  await expect(page.locator('[data-pair=text] [data-threshold=aaNormal]')).toContainText('未通過');
  expect(Number(await page.locator('[data-pair=text]').getAttribute('data-ratio'))).toBeCloseTo(
    4.478089453577214,
    12,
  );
  await expect(page.locator('#output')).toContainText('18pt');
  await expect(page.locator('#output')).toContainText('不偵測字級');
  await expect(page.locator('.palette-guide')).toContainText('無法取代');
});

test('file byte/type/dimension/pixel/count and animation limits reject before Blob decode; malformed images fail honestly', async ({
  page,
}) => {
  await page.goto('tools/palette/');
  await page.locator('#backing').selectOption('#ffffff');
  const valid = await png(page);
  await urlTracker(page);
  const webpBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 2;
    canvas.getContext('2d')!.fillRect(0, 0, 4, 2);
    return canvas.toDataURL('image/webp').split(',')[1]!;
  });
  const webp = Buffer.from(webpBase64, 'base64');
  // VP8X metadata claims 1×1 while the browser-authored coded frame is 4×2.
  const vp8x = Buffer.alloc(18);
  vp8x.write('VP8X');
  vp8x.writeUInt32LE(10, 4);
  const codedChunks: Buffer[] = [];
  for (let offset = 12; offset + 8 <= webp.length;) {
    const length = webp.readUInt32LE(offset + 4),
      end = offset + 8 + length + (length % 2);
    if (webp.toString('ascii', offset, offset + 4) !== 'VP8X')
      codedChunks.push(webp.subarray(offset, end));
    offset = end;
  }
  const mismatchedWebp = Buffer.concat([webp.subarray(0, 12), vp8x, ...codedChunks]);
  mismatchedWebp.writeUInt32LE(mismatchedWebp.length - 8, 4);
  const oversizedEdge = Buffer.from(valid);
  oversizedEdge.writeUInt32BE(5000, 16);
  const oversizedPixels = Buffer.from(valid);
  oversizedPixels.writeUInt32BE(2001, 16);
  oversizedPixels.writeUInt32BE(2000, 20);
  const apng = Buffer.concat([
    valid.subarray(0, 33),
    Buffer.from([0, 0, 0, 0, 97, 99, 84, 76, 0, 0, 0, 0]),
    valid.subarray(33),
  ]);
  const animatedWebp = Buffer.from('RIFF\x0c\x00\x00\x00WEBPANIM\x00\x00\x00\x00', 'binary');
  for (const [buffer, mime, message] of [
    [Buffer.alloc(8_000_001), 'image/png', '8 MB'],
    [valid, 'image/svg+xml', '宣告型別'],
    [valid, 'image/jpeg', '宣告型別與檔案內容不同'],
    [oversizedEdge, 'image/png', '4096'],
    [oversizedPixels, 'image/png', '4,000,000'],
    [apng, 'image/png', 'APNG'],
    [animatedWebp, 'image/webp', '動態 WebP'],
    [mismatchedWebp, 'image/webp', 'coded frame'],
    [Buffer.from('GIF89a'), '', 'GIF'],
  ] as const) {
    await upload(page, buffer, 'synthetic-test', mime);
    await page.locator('#run').click();
    await expect(page.locator('#error')).toContainText(message);
    await expect(page.locator('#output')).toBeHidden();
  }
  expect(
    await page.evaluate(
      () => (window as unknown as { __paletteUrls: { created: number } }).__paletteUrls.created,
    ),
  ).toBe(0);
  await page.locator('#palette-file').evaluate((input) => {
    const data = new DataTransfer();
    data.items.add(new File(['a'], 'one.png', { type: 'image/png' }));
    data.items.add(new File(['b'], 'two.png', { type: 'image/png' }));
    (input as HTMLInputElement).files = data.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#error')).toContainText('一次只接受一張');
  const broken = Buffer.from(valid);
  broken.fill(0, 41, broken.length - 12);
  await upload(page, broken);
  await page.locator('#run').click();
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#output')).toBeHidden();
  expect(await activeUrls(page)).toBe(0);
  await upload(page, valid);
  await run(page);
  expect(await activeUrls(page)).toBe(0);
});

test('decoded dimensions are checked again before allocating pixel canvas and release the source URL on mismatch', async ({
  page,
}) => {
  await page.goto('tools/palette/');
  await upload(page, await png(page));
  await page.locator('#backing').selectOption('#ffffff');
  await urlTracker(page);
  await page.evaluate(() => {
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      configurable: true,
      get: () => 5000,
    });
  });
  await page.locator('#run').click();
  await expect(page.locator('#error')).toContainText('解碼尺寸');
  await expect(page.locator('#output')).toBeHidden();
  expect(await activeUrls(page)).toBe(0);
  expect(
    await page.locator('#source-preview').evaluate((node) => (node as HTMLCanvasElement).width),
  ).toBe(0);
});

test('actual browser-encoded static JPEG and WebP use the same bounded local extraction path', async ({
  page,
}) => {
  await page.goto('tools/palette/');
  await page.locator('#backing').selectOption('#ffffff');
  for (const mimeType of ['image/jpeg', 'image/webp']) {
    const base64 = await page.evaluate((type) => {
      const canvas = document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 2;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 4, 2);
      return canvas.toDataURL(type).split(',')[1]!;
    }, mimeType);
    await upload(
      page,
      Buffer.from(base64, 'base64'),
      `synthetic.${mimeType === 'image/jpeg' ? 'jpg' : 'webp'}`,
      mimeType,
    );
    await run(page);
    await expect(page.locator('#source-meta')).toContainText('4 × 2 px');
    await expect(page.locator('#sample-meta')).toContainText('來源 8 pixels ／ 取樣 8');
    await expect(page.locator('.palette-swatch')).toHaveCount(1);
    await expect(page.locator('.palette-swatch')).toHaveAttribute('data-hex', '#000000');
  }
});

test('synthetic alpha demo and sample/top-bucket omissions are disclosed, not renormalized full-image percentages', async ({
  page,
}) => {
  await page.goto('tools/palette/');
  await page.locator('#backing').selectOption('#ffffff');
  await page.locator('#demo-alpha').click();
  await run(page);
  await expect(page.locator('#source-name')).toContainText('人工合成');
  await expect(page.locator('#sample-meta')).toContainText('來源 38,400 pixels ／ 取樣 10,000');
  await expect(page.locator('[data-hex="#ffffff"]')).toBeVisible();
  const colors = Array.from({ length: 16 }, (_, i) => `rgb(${i * 16},0,0)`);
  await upload(page, await png(page, colors));
  await run(page);
  await expect(page.locator('.palette-swatch')).toHaveCount(8);
  await expect(page.locator('#sample-meta')).toContainText('省略 8 samples');
  for (const item of await page.locator('.palette-swatch').all())
    await expect(item).toContainText('6.25%');
  await page.locator('#colors').selectOption('16');
  await expect(page.locator('.palette-swatch')).toHaveCount(16);
  await expect(page.locator('#sample-meta')).toContainText('省略 0 samples');
});

test('local source/name remains inert, no network/upload/storage/share, mobile keyboard controls and long token layout stay contained', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('tools/palette/');
  await expect(page.locator('#route-loading')).toBeHidden();
  const requests: string[] = [],
    errors: string[] = [],
    origin = new URL(page.url()).origin;
  page.on('pageerror', (issue) => errors.push(issue.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      /^https?:/.test(url.protocol) &&
      (url.origin !== origin || request.method() !== 'GET' || !url.pathname.startsWith('/assets/'))
    )
      requests.push(request.url());
  });
  await upload(page, await png(page), '<img src=x onerror=alert(1)>.png');
  await expect(page.locator('#source-name')).toHaveText('<img src=x onerror=alert(1)>.png');
  await page.locator('#backing').selectOption('#ffffff');
  await run(page);
  await expect(
    page.locator('.palette-main img, .palette-main script, .palette-main svg'),
  ).toHaveCount(0);
  await page.locator('#token-foreground').check();
  await page.locator('#name-foreground').fill('x'.repeat(64));
  const css = await cssDownload(page);
  expect(css).not.toContain('onerror');
  expect(css).not.toContain('.png');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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

test('edit/replacement/clear and SPA disposal revoke Blob URLs and discard image/pixels/selected tokens; reload resets backing', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('#route-loading')).toBeHidden();
  await page.evaluate(() => {
    document.documentElement.dataset.paletteSession = 'same';
  });
  await page.getByRole('navigation').getByRole('link', { name: '圖片配色', exact: true }).click();
  await urlTracker(page);
  await page.locator('#demo').click();
  await page.locator('#backing').selectOption('#ffffff');
  await run(page);
  expect(await activeUrls(page)).toBe(0);
  await page.locator('#token-foreground').check();
  await cssDownload(page);
  expect(await activeUrls(page)).toBe(1);
  await page.locator('#foreground-alpha').fill('0.5');
  expect(await activeUrls(page)).toBe(0);
  await cssDownload(page);
  await page.locator('#demo-alpha').click();
  expect(await activeUrls(page)).toBe(0);
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#token-foreground')).not.toBeChecked();
  await run(page);
  await page.locator('#clear').click();
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#backing')).toHaveValue('');
  expect(
    await page.locator('#source-preview').evaluate((node) => (node as HTMLCanvasElement).width),
  ).toBe(0);
  await page.locator('#demo').click();
  await page.locator('#backing').selectOption('#ffffff');
  await run(page);
  await page.locator('#token-foreground').check();
  await cssDownload(page);
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'EXPLAIN 檢視', exact: true })
    .click();
  await expect(page).toHaveURL(/tools\/explain\/$/);
  await expect.poll(() => activeUrls(page)).toBe(0);
  await page.goBack();
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#backing')).toHaveValue('');
  await expect(page.locator('#source-name')).toContainText('還沒有圖片');
  expect(await page.evaluate(() => document.documentElement.dataset.paletteSession)).toBe('same');
  await page.locator('#demo').click();
  await page.reload();
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#backing')).toHaveValue('');
});

test('lazy decode cannot resurrect cleared state, cancel releases in-flight image URL, timeout reports no palette', async ({
  page,
}) => {
  await page.goto('tools/palette/');
  await expect(page.locator('#route-loading')).toBeHidden();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/palette-image-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  await page.locator('#demo').click();
  await page.locator('#backing').selectOption('#ffffff');
  await page.locator('#run').click();
  await page.locator('#clear').click();
  release();
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#backing')).toHaveValue('');
  await urlTracker(page);
  await page.evaluate(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!;
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      ...descriptor,
      set(value: string) {
        if (!value.startsWith('blob:')) descriptor.set!.call(this, value);
      },
    });
  });
  await page.locator('#demo').click();
  await page.locator('#backing').selectOption('#ffffff');
  await page.locator('#run').click();
  await expect.poll(() => activeUrls(page)).toBe(1);
  await page.locator('#cancel').click();
  await expect.poll(() => activeUrls(page)).toBe(0);
  await expect(page.locator('#output')).toBeHidden();
  await page.clock.install();
  await page.locator('#run').click();
  await expect.poll(() => activeUrls(page)).toBe(1);
  await page.clock.fastForward(10001);
  await expect(page.locator('#error')).toContainText('10 秒');
  await expect(page.locator('#output')).toBeHidden();
  expect(await activeUrls(page)).toBe(0);
});
