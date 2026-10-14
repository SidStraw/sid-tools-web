import { describe, expect, it } from 'vite-plus/test';
import { fitDimensions, inspectImage, outputName, validateOptions } from './index';

const options = {
  maxWidth: 1920,
  maxHeight: 1080,
  maxBytes: 100_000,
  format: 'original' as const,
  flatten: false,
};
describe('image limits', () => {
  it('preserves aspect ratio, does not enlarge, and fits both boundaries', () => {
    expect(fitDimensions(4000, 3000, 1920, 1080)).toEqual({ width: 1440, height: 1080 });
    expect(fitDimensions(20, 10, 100, 100)).toEqual({ width: 20, height: 10 });
    expect(fitDimensions(8192, 1, 1, 1)).toEqual({ width: 1, height: 1 });
  });
  it.each([0, -1, NaN, Infinity, 1.5, 20_000_001])('rejects invalid budgets: %s', (maxBytes) => {
    expect(() => validateOptions({ ...options, maxBytes })).toThrow(/請輸入有效限制/);
  });
  it('rejects excessive dimensions and unknown formats', () => {
    expect(() => validateOptions({ ...options, maxWidth: 8193 })).toThrow(/請輸入有效限制/);
    expect(() => validateOptions({ ...options, format: 'image/gif' as 'original' })).toThrow(
      /請輸入有效限制/,
    );
  });
  it('rejects corrupt data and unsupported GIF without decoding', () => {
    expect(() => inspectImage(new Uint8Array([0, 1, 2]))).toThrow(/損毀/);
    expect(() => inspectImage(new TextEncoder().encode('GIF89a'))).toThrow(/動畫/);
  });
  it('rejects a PNG pixel bomb before decoding pixels', () => {
    const bytes = new Uint8Array(33);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
    new DataView(bytes.buffer).setUint32(16, 100_000);
    new DataView(bytes.buffer).setUint32(20, 100_000);
    expect(() => inspectImage(bytes)).toThrow(/尺寸超出/);
  });
  it('rejects animated WebP and malformed RIFF lengths', () => {
    const bytes = new Uint8Array(30);
    bytes.set(new TextEncoder().encode('RIFF'));
    new DataView(bytes.buffer).setUint32(4, 22, true);
    bytes.set(new TextEncoder().encode('WEBPVP8X'), 8);
    new DataView(bytes.buffer).setUint32(16, 10, true);
    bytes[20] = 2;
    expect(() => inspectImage(bytes)).toThrow(/動態 WebP/);
    new DataView(bytes.buffer).setUint32(4, 1000, true);
    expect(() => inspectImage(bytes)).toThrow(/損毀/);
  });
  it('creates distinct safe ZIP paths for colliding input names', () => {
    expect(outputName('../photo.png', 'image/webp', 0)).toBe('01-.._photo.webp');
    expect(outputName('../photo.png', 'image/webp', 1)).toBe('02-.._photo.webp');
  });
});
