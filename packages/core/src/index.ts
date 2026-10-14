export const LIMITS = {
  files: 30,
  fileBytes: 20_000_000,
  batchBytes: 100_000_000,
  pixels: 32_000_000,
  edge: 8192,
} as const;
export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';
export interface ImageInfo {
  format: ImageFormat;
  width: number;
  height: number;
}
export interface BudgetOptions {
  maxWidth: number;
  maxHeight: number;
  maxBytes: number;
  format: ImageFormat | 'original';
  flatten: boolean;
}

export function validateOptions(options: BudgetOptions): void {
  if (
    ![options.maxWidth, options.maxHeight, options.maxBytes].every(
      (n) => Number.isSafeInteger(n) && n > 0,
    ) ||
    options.maxWidth > LIMITS.edge ||
    options.maxHeight > LIMITS.edge ||
    options.maxBytes > LIMITS.fileBytes ||
    !['original', 'image/jpeg', 'image/png', 'image/webp'].includes(options.format)
  ) {
    throw new Error('請輸入有效限制：尺寸 1–8192 px，大小上限不可超過 20 MB。');
  }
}
export function fitDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const ratio = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}
function checked(format: ImageFormat, width: number, height: number): ImageInfo {
  if (
    width < 1 ||
    height < 1 ||
    width > LIMITS.edge ||
    height > LIMITS.edge ||
    width * height > LIMITS.pixels
  ) {
    throw new Error('圖片尺寸超出限制：最長邊 8192 px、最多 3200 萬像素。');
  }
  return { format, width, height };
}
/** Inspect container dimensions and animation before allocating decoded pixels. */
export function inspectImage(bytes: Uint8Array): ImageInfo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (start: number, count: number) =>
    String.fromCharCode(...bytes.subarray(start, start + count));
  const invalid = () => new Error('檔案損毀或不是支援的 JPEG、PNG、WebP 圖片。');
  if (tag(0, 3) === 'GIF')
    throw new Error('不支援動畫 GIF；不會只取第一格，請先提供靜態 JPEG、PNG 或 WebP。');
  if (
    bytes.length >= 33 &&
    tag(1, 3) === 'PNG' &&
    bytes[0] === 137 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  ) {
    if (tag(12, 4) !== 'IHDR' || view.getUint32(8) !== 13) throw invalid();
    const info = checked('image/png', view.getUint32(16), view.getUint32(20));
    let end = false;
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = view.getUint32(offset);
      if (offset + length + 12 > bytes.length) throw invalid();
      const type = tag(offset + 4, 4);
      if (type === 'acTL') throw new Error('不支援 APNG 動畫；請提供靜態圖片，不會丟掉動畫畫格。');
      offset += length + 12;
      if (type === 'IEND') {
        end = true;
        break;
      }
    }
    if (!end) throw invalid();
    return info;
  }
  if (bytes.length >= 12 && tag(0, 4) === 'RIFF' && tag(8, 4) === 'WEBP') {
    const end = view.getUint32(4, true) + 8;
    if (end !== bytes.length) throw invalid();
    let info: ImageInfo | undefined;
    for (let offset = 12; offset + 8 <= end;) {
      const length = view.getUint32(offset + 4, true),
        type = tag(offset, 4),
        data = offset + 8;
      if (data + length > end) throw invalid();
      if (
        type === 'ANIM' ||
        type === 'ANMF' ||
        (type === 'VP8X' && length >= 10 && (bytes[data] ?? 0) & 2)
      ) {
        throw new Error('不支援動態 WebP；請提供靜態圖片，不會丟掉動畫畫格。');
      }
      if (type === 'VP8X' && length >= 10)
        info = checked(
          'image/webp',
          1 + (view.getUint32(data + 4, true) & 0xffffff),
          1 +
            ((bytes[data + 7] ?? 0) |
              ((bytes[data + 8] ?? 0) << 8) |
              ((bytes[data + 9] ?? 0) << 16)),
        );
      if (!info && type === 'VP8 ' && length >= 10)
        info = checked(
          'image/webp',
          view.getUint16(data + 6, true) & 0x3fff,
          view.getUint16(data + 8, true) & 0x3fff,
        );
      if (!info && type === 'VP8L' && length >= 5 && bytes[data] === 0x2f) {
        const bits = view.getUint32(data + 1, true);
        info = checked('image/webp', (bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
      }
      offset = data + length + (length % 2);
    }
    if (info) return info;
    throw invalid();
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let info: ImageInfo | undefined;
    for (let offset = 2; offset + 1 < bytes.length;) {
      if (bytes[offset] !== 0xff) throw invalid();
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker !== undefined && marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) throw invalid();
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) throw invalid();
      if (
        marker !== undefined &&
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        )
      ) {
        if (length < 8) throw invalid();
        info = checked('image/jpeg', view.getUint16(offset + 5), view.getUint16(offset + 3));
      }
      offset += length;
    }
    if (info) return info;
  }
  throw invalid();
}
export function formatBytes(bytes: number): string {
  return `${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 1 }).format(bytes / 1000)} KB`;
}
export function outputName(name: string, format: ImageFormat, index: number): string {
  const stem =
    name
      .replace(/\.[^.]*$/, '')
      .replace(/[\\/<>:"|?*]/g, '_')
      .split('')
      .map((char) => (char.charCodeAt(0) < 32 ? '_' : char))
      .join('')
      .slice(0, 100) || 'image';
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[format];
  return `${String(index + 1).padStart(2, '0')}-${stem}.${ext}`;
}
