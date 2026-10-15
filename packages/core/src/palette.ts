/** Encoded sRGB components in [0,255]; fractions are retained for compositing. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}
/** Alpha is normalized [0,1], unlike the decoded pixel-array alpha byte. */
export interface RGBA extends RGB {
  a: number;
}

export const PALETTE_LIMITS = {
  maxPixels: 4_000_000,
  maxSamples: 100_000,
  maxColors: 32,
  maxTokens: 128,
  maxTokenNameLength: 64,
} as const;
export const CONTRAST_THRESHOLDS = {
  aaNormal: 4.5,
  aaLarge: 3,
  aaaNormal: 7,
  aaaLarge: 4.5,
} as const;
export const PALETTE_SUPPORT_RULES: readonly string[] = [
  'Input is decoded, interleaved 8-bit RGBA pixels, not an image file. RGB components use 0..255; RGBA object alpha uses 0..1, pixel-array alpha uses 0..255.',
  'An explicit opaque RGB backing is required. Source-over compositing is performed on encoded sRGB channels, first background over backing then foreground over that background. No blend modes or linear-light compositing are simulated.',
  'Palette extraction composites each sampled pixel over the chosen backing, including fully transparent pixels; alpha is never silently discarded. Fixed 4-bit-per-channel buckets (4096 maximum) are used, not perceptual clustering or machine learning.',
  'Sampling selects floor(i * pixelCount / sampleCount) for i=0..sampleCount-1. Buckets rank by descending sample count then ascending RGB bucket index. Representatives are rounded arithmetic means of composited encoded sRGB channels.',
  'Frequency is bucket count divided by all sampled pixels, not by returned colors. Top-color truncation is disclosed by omittedSampleCount. Sampling can alias spatial patterns; counts are not perceptual dominance or full-image proportions.',
  'WCAG 2.x sRGB relative luminance uses the 0.04045 breakpoint and weights 0.2126, 0.7152, 0.0722. Contrast is (lighter + 0.05) / (darker + 0.05). Evaluate unrounded ratios: AA normal 4.5, large 3; AAA normal 7, large 4.5.',
  'Normal/large are threshold labels only: the caller must establish actual text conditions. No font-size classification, whole-page accessibility certification, HDR/wide-gamut or image-decoder color management is provided.',
  'CSS export accepts only explicitly selected opaque RGB colors and lowercase kebab-case token names without a leading --. Values are numeric rgb() with original component precision; no CSS input, automatic naming, hidden failing combinations or alpha removal.',
  'Limits: 4000000 pixels, 100000 samples, 32 returned colors, 128 tokens, 64 characters per token name. Defaults: 10000 samples and 8 colors. No DOM, Canvas, image parsing, network or storage.',
];

function validateRGB(color: RGB): void {
  if (
    !color ||
    [color.r, color.g, color.b].some(
      (v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 255,
    )
  ) {
    throw new Error('RGB components must be finite numbers in [0,255].');
  }
  // Opaque APIs must not silently ignore a supplied alpha component.
  if ('a' in color) throw new Error('Opaque RGB required; composite RGBA explicitly first.');
}

function validateRGBA(color: RGBA): void {
  if (
    !color ||
    [color.r, color.g, color.b].some(
      (v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 255,
    ) ||
    typeof color.a !== 'number' ||
    !Number.isFinite(color.a) ||
    color.a < 0 ||
    color.a > 1
  ) {
    throw new Error('RGBA requires finite RGB in [0,255] and alpha in [0,1].');
  }
}

/** Opaque source-over result; no rounding or implicit backing color. */
export function composite(foreground: RGBA, backing: RGB): RGB {
  validateRGBA(foreground);
  validateRGB(backing);
  const a = foreground.a;
  return {
    r: foreground.r * a + backing.r * (1 - a),
    g: foreground.g * a + backing.g * (1 - a),
    b: foreground.b * a + backing.b * (1 - a),
  };
}

export function relativeLuminance(color: RGB): number {
  validateRGB(color);
  const linear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

/** Opaque-color contrast only; use evaluateContrast for compositing and thresholds. */
export function contrastRatio(first: RGB, second: RGB): number {
  const a = relativeLuminance(first),
    b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export interface ContrastEvaluation {
  standard: 'WCAG 2.x sRGB contrast';
  backing: RGB;
  background: RGB;
  foreground: RGB;
  ratio: number;
  thresholds: typeof CONTRAST_THRESHOLDS;
  passes: { aaNormal: boolean; aaLarge: boolean; aaaNormal: boolean; aaaLarge: boolean };
  limitation: string;
}

export function evaluateContrast(
  foreground: RGBA,
  background: RGBA,
  backing: RGB,
): ContrastEvaluation {
  const renderedBackground = composite(background, backing);
  const renderedForeground = composite(foreground, renderedBackground);
  const ratio = contrastRatio(renderedForeground, renderedBackground);
  return {
    standard: 'WCAG 2.x sRGB contrast',
    backing: { ...backing },
    background: renderedBackground,
    foreground: renderedForeground,
    ratio,
    thresholds: { ...CONTRAST_THRESHOLDS },
    passes: {
      aaNormal: ratio >= CONTRAST_THRESHOLDS.aaNormal,
      aaLarge: ratio >= CONTRAST_THRESHOLDS.aaLarge,
      aaaNormal: ratio >= CONTRAST_THRESHOLDS.aaaNormal,
      aaaLarge: ratio >= CONTRAST_THRESHOLDS.aaaLarge,
    },
    limitation:
      'Threshold labels only; actual text conditions and full accessibility require separate validation.',
  };
}

export interface PaletteOptions {
  backing: RGB;
  maxSamples?: number;
  maxColors?: number;
}
export interface PaletteColor {
  rgb: RGB;
  hex: string;
  count: number;
  frequency: number;
}
export interface PaletteReport {
  colors: PaletteColor[];
  backing: RGB;
  pixelCount: number;
  sampleCount: number;
  omittedSampleCount: number;
  method: 'sRGB-4bit-buckets';
  supportRules: string[];
}
export type PixelRGBA = Uint8Array | Uint8ClampedArray | readonly number[];

function boundedInteger(value: number, max: number): boolean {
  return Number.isSafeInteger(value) && value >= 1 && value <= max;
}

/** Validates all components, then samples deterministically; never mutates pixel input. */
export function extractPalette(pixels: PixelRGBA, options: PaletteOptions): PaletteReport {
  if (!options) throw new Error('An explicit opaque backing is required.');
  validateRGB(options.backing);
  if (
    !(
      Array.isArray(pixels) ||
      pixels instanceof Uint8Array ||
      pixels instanceof Uint8ClampedArray
    ) ||
    !pixels.length ||
    pixels.length % 4 !== 0 ||
    pixels.length > PALETTE_LIMITS.maxPixels * 4
  ) {
    throw new Error('Pixels must be a nonempty bounded interleaved RGBA byte array.');
  }
  const maxSamples = options.maxSamples ?? 10_000,
    maxColors = options.maxColors ?? 8;
  if (
    !boundedInteger(maxSamples, PALETTE_LIMITS.maxSamples) ||
    !boundedInteger(maxColors, PALETTE_LIMITS.maxColors)
  ) {
    throw new Error('Sample/color counts must be positive integers within limits.');
  }
  for (let i = 0; i < pixels.length; i++) {
    const value = pixels[i];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 255)
      throw new Error('All pixel components must be integer bytes in [0,255].');
  }
  const pixelCount = pixels.length / 4,
    sampleCount = Math.min(pixelCount, maxSamples);
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  for (let i = 0; i < sampleCount; i++) {
    const offset = Math.floor((i * pixelCount) / sampleCount) * 4;
    const color = composite(
      {
        r: pixels[offset]!,
        g: pixels[offset + 1]!,
        b: pixels[offset + 2]!,
        a: pixels[offset + 3]! / 255,
      },
      options.backing,
    );
    const index =
      Math.floor(color.r / 16) * 256 + Math.floor(color.g / 16) * 16 + Math.floor(color.b / 16);
    const bucket = buckets.get(index) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count++;
    bucket.r += color.r;
    bucket.g += color.g;
    bucket.b += color.b;
    buckets.set(index, bucket);
  }
  const ranked = [...buckets]
    .sort(([a, x], [b, y]) => y.count - x.count || a - b)
    .slice(0, maxColors);
  const colors = ranked.map(([, bucket]): PaletteColor => {
    const rgb = {
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count),
    };
    const hex = '#' + [rgb.r, rgb.g, rgb.b].map((v) => v.toString(16).padStart(2, '0')).join('');
    return { rgb, hex, count: bucket.count, frequency: bucket.count / sampleCount };
  });
  return {
    colors,
    backing: { ...options.backing },
    pixelCount,
    sampleCount,
    omittedSampleCount: sampleCount - colors.reduce((n, color) => n + color.count, 0),
    method: 'sRGB-4bit-buckets',
    supportRules: [...PALETTE_SUPPORT_RULES],
  };
}

export interface CssColorToken {
  name: string;
  color: RGB;
}

/** No inferred/default tokens. Fractions are serialized intact to match rendered RGB. */
export function exportCssTokens(tokens: readonly CssColorToken[]): string {
  if (!Array.isArray(tokens) || tokens.length > PALETTE_LIMITS.maxTokens)
    throw new Error('Token list exceeds limits.');
  const names = new Set<string>();
  const declarations: string[] = [];
  for (const token of tokens) {
    if (
      !token ||
      typeof token.name !== 'string' ||
      token.name.length > PALETTE_LIMITS.maxTokenNameLength ||
      !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(token.name) ||
      names.has(token.name)
    ) {
      throw new Error('Token names must be unique lowercase kebab-case identifiers.');
    }
    validateRGB(token.color);
    names.add(token.name);
    const { r, g, b } = token.color;
    declarations.push(`  --${token.name}: rgb(${r} ${g} ${b});`);
  }
  return declarations.length ? ':root {\n' + declarations.join('\n') + '\n}\n' : '';
}

/** Authored pixel arrays, not real-photo color-frequency measurements. */
export const PALETTE_EXAMPLES: readonly {
  id: string;
  provenance: 'synthetic';
  pixels: readonly number[];
}[] = [
  {
    id: 'opaque-primary',
    provenance: 'synthetic',
    pixels: [255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255],
  },
  {
    id: 'alpha-backing',
    provenance: 'synthetic',
    pixels: [255, 0, 0, 0, 0, 0, 0, 128, 255, 255, 255, 255],
  },
];
