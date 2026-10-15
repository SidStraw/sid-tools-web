import { describe, expect, test } from 'vite-plus/test';
import {
  composite,
  contrastRatio,
  evaluateContrast,
  exportCssTokens,
  extractPalette,
  PALETTE_EXAMPLES,
  PALETTE_LIMITS,
  relativeLuminance,
  type RGB,
} from './palette.js';

const black = { r: 0, g: 0, b: 0 },
  white = { r: 255, g: 255, b: 255 };
const gray = (v: number): RGB => ({ r: v, g: v, b: v });
const opaque = (color: RGB) => ({ ...color, a: 1 });

describe('pure sRGB/WCAG math and synthetic palette samples', () => {
  test('black/white reference luminance and contrast 21; equal colors 1', () => {
    expect(relativeLuminance(black)).toBe(0);
    expect(relativeLuminance(white)).toBe(1);
    expect(contrastRatio(black, white)).toBe(21);
    expect(contrastRatio(white, black)).toBe(21);
    expect(contrastRatio(gray(117), gray(117))).toBe(1);
    expect(relativeLuminance({ r: 255, g: 0, b: 0 })).toBeCloseTo(0.2126, 10);
  });

  test('midgray AA boundary uses unrounded contrast, not displayed 4.5', () => {
    const pass = evaluateContrast(opaque(gray(118)), opaque(white), black);
    const fail = evaluateContrast(opaque(gray(119)), opaque(white), black);
    expect(pass.ratio).toBeCloseTo(4.542224959605253, 10);
    expect(fail.ratio).toBeCloseTo(4.478089453577214, 10);
    expect(pass.passes).toEqual({
      aaNormal: true,
      aaLarge: true,
      aaaNormal: false,
      aaaLarge: true,
    });
    expect(fail.passes).toEqual({
      aaNormal: false,
      aaLarge: true,
      aaaNormal: false,
      aaaLarge: false,
    });
    expect(evaluateContrast(opaque(black), opaque(white), white).passes).toEqual({
      aaNormal: true,
      aaLarge: true,
      aaaNormal: true,
      aaaLarge: true,
    });
  });

  test('luminance handles both sides of sRGB transfer breakpoint', () => {
    expect(relativeLuminance(gray(10))).toBeCloseTo(10 / 255 / 12.92, 12);
    expect(relativeLuminance(gray(11))).toBeCloseTo(((11 / 255 + 0.055) / 1.055) ** 2.4, 12);
  });

  test('alpha composites explicitly with chosen backing without rounding', () => {
    expect(composite({ r: 255, g: 0, b: 0, a: 0 }, white)).toEqual(white);
    expect(composite({ r: 255, g: 0, b: 0, a: 0 }, black)).toEqual(black);
    expect(composite({ ...black, a: 0.5 }, white)).toEqual(gray(127.5));
    expect(composite({ r: 255, g: 0, b: 0, a: 1 }, white)).toEqual({ r: 255, g: 0, b: 0 });
  });

  test('foreground composites over rendered background, not directly over backing', () => {
    const r = evaluateContrast({ ...black, a: 0.5 }, { ...black, a: 0.5 }, white);
    expect(r.background).toEqual(gray(127.5));
    expect(r.foreground).toEqual(gray(63.75));
    expect(r.ratio).toBe(contrastRatio(gray(63.75), gray(127.5)));
    const transparent = evaluateContrast({ r: 255, g: 0, b: 0, a: 0 }, { ...black, a: 0 }, white);
    expect(transparent.ratio).toBe(1);
    expect(transparent.passes).toEqual({
      aaNormal: false,
      aaLarge: false,
      aaaNormal: false,
      aaaLarge: false,
    });
  });

  test.each([-1, 256, NaN, Infinity])(
    'invalid RGB component %s is rejected, never clamped',
    (r) => {
      expect(() => relativeLuminance({ r, g: 0, b: 0 })).toThrow('RGB components');
      expect(() => composite({ r, g: 0, b: 0, a: 1 }, white)).toThrow('RGBA requires');
    },
  );

  test.each([-0.1, 1.1, NaN, Infinity])('invalid alpha %s is rejected', (a) => {
    expect(() => composite({ ...black, a }, white)).toThrow('RGBA requires');
  });

  test('opaque APIs reject accidental RGBA input rather than dropping alpha', () => {
    const translucent = { ...black, a: 0.5 };
    const alphaBacking = { ...white, a: 1 };
    expect(() => contrastRatio(translucent, white)).toThrow('Opaque RGB required');
    expect(() => exportCssTokens([{ name: 'text', color: translucent }])).toThrow(
      'Opaque RGB required',
    );
    expect(() => extractPalette([0, 0, 0, 255], { backing: alphaBacking })).toThrow(
      'Opaque RGB required',
    );
  });

  test('deterministic bucket frequency and mean are source-grounded, not perceptual claims', () => {
    const input = [1, 2, 3, 255, 15, 14, 13, 255, 255, 0, 0, 255, 0, 0, 255, 255];
    const r = extractPalette(input, { backing: white, maxColors: 3 });
    expect(r.colors).toEqual([
      { rgb: { r: 8, g: 8, b: 8 }, hex: '#080808', count: 2, frequency: 0.5 },
      { rgb: { r: 0, g: 0, b: 255 }, hex: '#0000ff', count: 1, frequency: 0.25 },
      { rgb: { r: 255, g: 0, b: 0 }, hex: '#ff0000', count: 1, frequency: 0.25 },
    ]);
    expect(r.omittedSampleCount).toBe(0);
    expect(extractPalette(input, { backing: white, maxColors: 3 })).toEqual(r);
    expect(input).toEqual([1, 2, 3, 255, 15, 14, 13, 255, 255, 0, 0, 255, 0, 0, 255, 255]);
  });

  test('top-color truncation never renormalizes away omitted frequencies', () => {
    const r = extractPalette(PALETTE_EXAMPLES[0]!.pixels, { backing: white, maxColors: 1 });
    expect(r.colors[0]?.count).toBe(2);
    expect(r.colors[0]?.frequency).toBe(2 / 3);
    expect(r.omittedSampleCount).toBe(1);
  });

  test('transparent pixel counts become chosen backing; semi-transparent bytes are composited first', () => {
    const pixels = [255, 0, 0, 0, 0, 0, 0, 128];
    const onWhite = extractPalette(pixels, { backing: white });
    expect(onWhite.colors.map((c) => c.rgb)).toEqual([gray(127), white]);
    const onBlack = extractPalette(pixels, { backing: black });
    expect(onBlack.colors).toEqual([{ rgb: black, hex: '#000000', count: 2, frequency: 1 }]);
  });

  test('sampling order is explicit and deterministic and validates unsampled bytes', () => {
    const input = [0, 0, 0, 255, 255, 0, 0, 255, 0, 0, 0, 255, 255, 0, 0, 255];
    const r = extractPalette(input, { backing: white, maxSamples: 2 });
    expect(r.sampleCount).toBe(2);
    expect(r.pixelCount).toBe(4);
    expect(r.colors).toEqual([{ rgb: black, hex: '#000000', count: 2, frequency: 1 }]);
    input[4] = -1;
    expect(() => extractPalette(input, { backing: white, maxSamples: 2 })).toThrow(
      'All pixel components',
    );
  });

  test('typed byte arrays work without DOM or image decoding', () => {
    for (const pixels of [new Uint8Array([0, 0, 0, 255]), new Uint8ClampedArray([0, 0, 0, 255])]) {
      expect(extractPalette(pixels, { backing: white }).colors[0]?.rgb).toEqual(black);
    }
  });

  test.each(
    [[], [0], [0, 0, 0], [0, 0, 0, -1], [0, 0, 0, 256], [0.5, 0, 0, 255], [NaN, 0, 0, 255]].map(
      (pixels) => [pixels] as const,
    ),
  )('malformed/short pixel input rejected: %j', (pixels) => {
    expect(() => extractPalette(pixels, { backing: white })).toThrow(
      /Pixels must|All pixel components/,
    );
  });

  test('sparse and oversized arrays reject before pretending to have valid pixels', () => {
    expect(() => extractPalette(new Array<number>(4), { backing: white })).toThrow(
      'All pixel components',
    );
    expect(() =>
      extractPalette(new Array<number>((PALETTE_LIMITS.maxPixels + 1) * 4), { backing: white }),
    ).toThrow('bounded');
  });

  test.each([0, -1, 0.5, Infinity, PALETTE_LIMITS.maxSamples + 1])(
    'invalid sample limit %s rejected',
    (maxSamples) => {
      expect(() => extractPalette([0, 0, 0, 255], { backing: white, maxSamples })).toThrow(
        'Sample/color counts',
      );
    },
  );

  test.each([0, -1, 1.5, Infinity, PALETTE_LIMITS.maxColors + 1])(
    'invalid color limit %s rejected',
    (maxColors) => {
      expect(() => extractPalette([0, 0, 0, 255], { backing: white, maxColors })).toThrow(
        'Sample/color counts',
      );
    },
  );

  test('exact count limits accepted and sample count clamps to available pixels', () => {
    const r = extractPalette([0, 0, 0, 255], {
      backing: white,
      maxSamples: PALETTE_LIMITS.maxSamples,
      maxColors: PALETTE_LIMITS.maxColors,
    });
    expect(r.sampleCount).toBe(1);
    expect(r.colors).toHaveLength(1);
  });

  test('only explicitly named/selected numeric colors exported, without precision loss', () => {
    expect(
      exportCssTokens([
        { name: 'text-primary', color: black },
        { name: 'surface', color: gray(127.5) },
      ]),
    ).toBe(':root {\n  --text-primary: rgb(0 0 0);\n  --surface: rgb(127.5 127.5 127.5);\n}\n');
    expect(exportCssTokens([])).toBe('');
    expect(exportCssTokens([{ name: 'constructor', color: white }])).toContain('--constructor:');
  });

  test.each([
    '--text',
    '9text',
    'text; color:red',
    'x}\nbody{display:none',
    'x/*',
    'x:root',
    'x y',
    'UPPER',
    'x--y',
    'x-',
    'x'.repeat(PALETTE_LIMITS.maxTokenNameLength + 1),
  ])('unsafe/non-subset token name rejected: %s', (name) => {
    expect(() => exportCssTokens([{ name, color: black }])).toThrow('Token names');
  });

  test('duplicate names, excessive tokens, bad numeric colors rejected without partial CSS', () => {
    expect(() =>
      exportCssTokens([
        { name: 'text', color: black },
        { name: 'text', color: white },
      ]),
    ).toThrow('Token names');
    expect(() =>
      exportCssTokens(
        Array.from({ length: PALETTE_LIMITS.maxTokens + 1 }, (_, i) => ({
          name: `color-${i}`,
          color: white,
        })),
      ),
    ).toThrow('Token list');
    expect(() => exportCssTokens([{ name: 'text', color: { r: Infinity, g: 0, b: 0 } }])).toThrow(
      'RGB components',
    );
  });

  test('fixed example provenance is synthetic and reports are JSON-safe copies', () => {
    expect(PALETTE_EXAMPLES.every((sample) => sample.provenance === 'synthetic')).toBe(true);
    const r = extractPalette(PALETTE_EXAMPLES[0]!.pixels, { backing: white });
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
    r.backing.r = 0;
    r.supportRules.length = 0;
    expect(white.r).toBe(255);
    expect(
      extractPalette(PALETTE_EXAMPLES[0]!.pixels, { backing: white }).supportRules.length,
    ).toBeGreaterThan(0);
  });
});
