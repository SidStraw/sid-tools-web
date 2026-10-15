/** Authored pixels, no external image/photograph or measured brand palette. Same PNG decode path as uploads. */
export async function makePaletteDemo(
  kind: 'forest' | 'alpha',
  signal: AbortSignal,
): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 160;
  try {
    const context = canvas.getContext('2d', { colorSpace: 'srgb' });
    if (!context) throw new Error('Canvas unavailable');
    if (kind === 'forest') {
      for (const [x, width, color] of [
        [0, 120, '#234f43'],
        [120, 60, '#ece8d8'],
        [180, 36, '#bd9551'],
        [216, 24, '#99ad98'],
      ] as const) {
        context.fillStyle = color;
        context.fillRect(x, 0, width, 160);
      }
      context.fillStyle = '#ece8d8';
      context.fillRect(28, 32, 64, 96);
      context.fillStyle = '#234f43';
      context.fillRect(44, 48, 32, 64);
    } else {
      context.fillStyle = '#000000';
      context.fillRect(0, 0, 80, 160);
      context.fillStyle = 'rgba(255,0,0,0.5)';
      context.fillRect(80, 0, 80, 160);
      // Final third is intentionally fully transparent, including in extraction counts.
    }
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('PNG generation failed'))),
        'image/png',
      ),
    );
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    return new File([blob], kind === 'forest' ? 'synthetic-forest.png' : 'synthetic-alpha.png', {
      type: 'image/png',
    });
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
