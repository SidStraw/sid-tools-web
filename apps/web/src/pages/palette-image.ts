import { inspectImage } from '@sid-tools/core/images';

export const PALETTE_IMAGE_LIMITS = {
  files: 1,
  bytes: 8_000_000,
  edge: 4096,
  pixels: 4_000_000,
  timeoutMs: 10_000,
} as const;
export interface DecodedPaletteImage {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Inspect before a native decoder is given any Blob URL. Actual decoding still belongs to the browser. */
export async function decodePaletteImage(
  file: File,
  signal: AbortSignal,
): Promise<DecodedPaletteImage> {
  const aborted = () => {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  };
  aborted();
  if (!file.size || file.size > PALETTE_IMAGE_LIMITS.bytes)
    throw new Error('請提供非空、最多 8 MB（8,000,000 bytes）的圖片。');
  if (file.type && !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw new Error('只支援靜態 PNG、JPEG、WebP；不支援 SVG、GIF 或其他宣告型別。');
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    const cleanup = () => {
      signal.removeEventListener('abort', cancel);
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
    };
    const cancel = () => {
      reader.abort();
      cleanup();
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    reader.onload = () => {
      const result = reader.result;
      cleanup();
      if (result instanceof ArrayBuffer) resolve(result);
      else reject(new Error('無法讀取本機圖片。'));
    };
    reader.onerror = () => {
      cleanup();
      reject(new Error('無法讀取本機圖片。'));
    };
    reader.onabort = () => {
      cleanup();
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    signal.addEventListener('abort', cancel, { once: true });
    reader.readAsArrayBuffer(file);
  });
  const bytes = new Uint8Array(buffer);
  aborted();
  const info = inspectImage(bytes);
  if (
    info.width > PALETTE_IMAGE_LIMITS.edge ||
    info.height > PALETTE_IMAGE_LIMITS.edge ||
    info.width * info.height > PALETTE_IMAGE_LIMITS.pixels
  )
    throw new Error('圖片超出本頁限制：最長邊 4096 px、最多 4,000,000 像素；不先解碼再縮圖。');
  if (file.type && file.type !== info.format)
    throw new Error('圖片宣告型別與檔案內容不同；請提供正確的 PNG、JPEG 或 WebP。');
  // VP8X canvas metadata alone does not bound a mismatched VP8/VP8L coded frame.
  if (info.format === 'image/webp') {
    const view = new DataView(bytes.buffer);
    let frames = 0,
      extendedHeaders = 0;
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const length = view.getUint32(offset + 4, true),
        data = offset + 8;
      const type = String.fromCharCode(...bytes.subarray(offset, offset + 4));
      let width: number | undefined, height: number | undefined;
      if (type === 'VP8X') {
        extendedHeaders++;
        const w = length >= 10 ? 1 + (view.getUint32(data + 4, true) & 0xffffff) : 0;
        const h =
          length >= 10
            ? 1 +
              ((bytes[data + 7] ?? 0) |
                ((bytes[data + 8] ?? 0) << 8) |
                ((bytes[data + 9] ?? 0) << 16))
            : 0;
        if (extendedHeaders > 1 || w !== info.width || h !== info.height)
          throw new Error('WebP 容器尺寸重複或不一致；未開始解碼。');
      }
      if (type === 'VP8 ' && length >= 10) {
        width = view.getUint16(data + 6, true) & 0x3fff;
        height = view.getUint16(data + 8, true) & 0x3fff;
      }
      if (type === 'VP8L' && length >= 5 && bytes[data] === 0x2f) {
        const bits = view.getUint32(data + 1, true);
        width = (bits & 0x3fff) + 1;
        height = ((bits >>> 14) & 0x3fff) + 1;
      }
      if (type === 'VP8 ' || type === 'VP8L') {
        frames++;
        if (width !== info.width || height !== info.height)
          throw new Error('WebP coded frame 與容器尺寸不符；未開始解碼。');
      }
      offset = data + length + (length % 2);
    }
    if (frames !== 1) throw new Error('只支援單一靜態 coded frame 的 WebP。');
  }
  // Reject multiple JPEG frames rather than relying on which SOF the decoder chooses.
  if (info.format === 'image/jpeg') {
    const view = new DataView(bytes.buffer);
    let frames = 0;
    for (let offset = 2; offset + 1 < bytes.length;) {
      if (bytes[offset] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 1 || (marker !== undefined && marker >= 0xd0 && marker <= 0xd7)) continue;
      if (
        marker !== undefined &&
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        )
      )
        frames++;
      if (offset + 2 > bytes.length) break;
      offset += view.getUint16(offset);
    }
    if (frames !== 1) throw new Error('不支援多 frame 或不完整的 JPEG 結構。');
  }
  aborted();
  const url = URL.createObjectURL(new Blob([bytes], { type: info.format }));
  const image = new Image();
  image.decoding = 'async';
  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', cancel);
        image.onload = null;
        image.onerror = null;
        if (error) reject(error);
        else resolve();
      };
      const cancel = () => {
        image.removeAttribute('src');
        finish(new DOMException('Cancelled', 'AbortError'));
      };
      const timer = setTimeout(() => {
        image.removeAttribute('src');
        finish(new Error('圖片解碼超過 10 秒；已停止等待，請換較小的靜態圖片。'));
      }, PALETTE_IMAGE_LIMITS.timeoutMs);
      image.onload = () => finish();
      image.onerror = () => finish(new Error('瀏覽器無法解碼這張圖片；沒有產生色盤。'));
      signal.addEventListener('abort', cancel, { once: true });
      image.src = url;
    });
    aborted();
    const width = image.naturalWidth,
      height = image.naturalHeight;
    if (
      !width ||
      !height ||
      width > PALETTE_IMAGE_LIMITS.edge ||
      height > PALETTE_IMAGE_LIMITS.edge ||
      width * height > PALETTE_IMAGE_LIMITS.pixels ||
      !(
        (width === info.width && height === info.height) ||
        (width === info.height && height === info.width)
      )
    )
      throw new Error('解碼尺寸與受限的容器尺寸不符；未讀取 pixels。');
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    try {
      const context = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
      if (!context) throw new Error('瀏覽器未提供可用的 sRGB Canvas。');
      context.drawImage(image, 0, 0);
      return {
        width,
        height,
        pixels: context.getImageData(0, 0, width, height, { colorSpace: 'srgb' }).data,
      };
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    image.removeAttribute('src');
    URL.revokeObjectURL(url);
  }
}
