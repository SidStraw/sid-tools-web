import type { BudgetOptions, ImageFormat } from '@sid-tools/core';
export interface ProcessRequest {
  file: File;
  options: BudgetOptions;
}
export interface ImageResult {
  blob: Blob;
  format: ImageFormat;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  withinBudget: boolean;
  transparent: boolean;
  reused: boolean;
  notes: string[];
}
export type ProcessResponse = { ok: true; result: ImageResult } | { ok: false; error: string };
