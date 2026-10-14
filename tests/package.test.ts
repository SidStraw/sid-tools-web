import { readFile } from 'node:fs/promises';
import { expect, expectTypeOf, test } from 'vite-plus/test';
import { inspectImage, type ImageInfo } from '@sid-tools/core';

test('public exports inspect real JPEG and PNG inputs', async () => {
  expect(inspectImage(await readFile('tests/fixtures/photo.jpg'))).toEqual({
    format: 'image/jpeg',
    width: 3872,
    height: 2592,
  });
  expect(inspectImage(await readFile('tests/fixtures/transparent.png'))).toEqual({
    format: 'image/png',
    width: 706,
    height: 1442,
  });
  expectTypeOf(inspectImage).returns.toEqualTypeOf<ImageInfo>();
});
