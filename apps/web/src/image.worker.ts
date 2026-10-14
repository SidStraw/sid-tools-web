import { fitDimensions, inspectImage, LIMITS, validateOptions } from '@sid-tools/core';
import type { ProcessRequest, ProcessResponse, ImageResult } from './types';

async function processImage({ file, options }: ProcessRequest): Promise<ImageResult> {
  validateOptions(options);
  if (file.size > LIMITS.fileBytes) throw new Error('單檔不可超過 20 MB。');
  const source = inspectImage(new Uint8Array(await file.arrayBuffer()));
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { width, height } = fitDimensions(
      bitmap.width,
      bitmap.height,
      options.maxWidth,
      options.maxHeight,
    );
    const format = options.format === 'original' ? source.format : options.format;
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('此瀏覽器無法啟用圖片處理，請改用較新的瀏覽器。');
    context.drawImage(bitmap, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    let transparent = false;
    for (let i = 3; i < pixels.length; i += 4)
      if (pixels[i] !== 255) {
        transparent = true;
        break;
      }
    if (transparent && format === 'image/jpeg' && !options.flatten) {
      throw new Error(
        '圖片含透明背景，JPEG 無法保留。請改用 PNG／WebP，或明確勾選「允許 JPEG 填白底」。',
      );
    }
    const notes: string[] = [];
    if (width !== bitmap.width || height !== bitmap.height)
      notes.push(`依尺寸上限縮至 ${width} × ${height}，不放大圖片。`);
    if (transparent && format === 'image/jpeg') {
      context.globalCompositeOperation = 'destination-over';
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      notes.push('依你的設定，透明區域已填入白底。');
    } else if (transparent) notes.push('保留透明背景；縮圖及有損編碼可能改變邊緣像素。');
    const encode = async (quality: number) => {
      const blob = await canvas.convertToBlob({ type: format, quality });
      if (blob.type !== format) throw new Error('此瀏覽器不支援所選輸出格式，請改選 PNG 或 JPEG。');
      return blob;
    };
    let blob = await encode(0.95);
    if (format !== 'image/png' && blob.size > options.maxBytes) {
      let smallest = blob;
      let feasible: Blob | undefined;
      let low = 0.1,
        high = 0.95;
      const floor = await encode(low);
      if (floor.size < smallest.size) smallest = floor;
      if (floor.size <= options.maxBytes) feasible = floor;
      for (let i = 0; i < 8; i++) {
        const quality = (low + high) / 2;
        const candidate = await encode(quality);
        if (candidate.size < smallest.size) smallest = candidate;
        if (candidate.size <= options.maxBytes) {
          feasible = candidate;
          low = quality;
        } else high = quality;
      }
      blob = feasible ?? smallest;
    }
    const reused =
      source.format === format &&
      width === bitmap.width &&
      height === bitmap.height &&
      file.size <= blob.size;
    if (reused) {
      blob = new Blob([file], { type: format });
      notes.push('重新編碼沒有更小，保留原檔（包含原始中繼資料與方向）。');
    } else notes.push('已依圖片方向輸出；重新編碼不保留 EXIF 等原始中繼資料。');
    if (blob.size > options.maxBytes)
      notes.push(
        format === 'image/png'
          ? 'PNG 無損編碼在目前尺寸下超出預算。可調小尺寸，或改用保留透明度的 WebP。'
          : '已嘗試降低品質，仍超出預算。請調小尺寸或提高大小上限；不會為了達標再偷偷縮圖。',
      );
    return {
      blob,
      format,
      width,
      height,
      originalWidth: bitmap.width,
      originalHeight: bitmap.height,
      withinBudget: blob.size <= options.maxBytes,
      transparent: transparent && format !== 'image/jpeg',
      reused,
      notes,
    };
  } finally {
    bitmap.close();
  }
}
self.onmessage = (event: MessageEvent<ProcessRequest>) => {
  void processImage(event.data)
    .then((result) => {
      self.postMessage({ ok: true, result } satisfies ProcessResponse);
    })
    .catch((error: unknown) => {
      self.postMessage({
        ok: false,
        error: error instanceof Error ? error.message : '無法讀取圖片，請確認檔案完整。',
      } satisfies ProcessResponse);
    });
};
