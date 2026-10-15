const ns = 'http://www.sitemaps.org/schemas/sitemap/0.9';
export const sitemapDemos = {
  valid: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="${ns}">
  <url><loc>https://example.test/</loc><lastmod>2026-10-15</lastmod></url>
  <url><loc>https://example.test/docs/start</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://example.test/docs/api?lang=zh&amp;v=1</loc></url>
  <url><loc>https://example.test/blog/release</loc></url>
</urlset>`,
  issues: `<urlset xmlns="${ns}">
  <url><loc>https://example.test/docs/start</loc><lastmod>2026-02-30</lastmod></url>
  <url><loc>https://example.test/docs/start</loc></url>
  <url><loc>https://other.test/blog/post</loc></url>
  <url><lastmod>2026-10-15</lastmod></url>
  <url><loc>javascript:alert(1)</loc></url>
</urlset>`,
  index: `<sitemapindex xmlns="${ns}">
  <sitemap><loc>https://example.test/maps/docs.xml</loc><lastmod>2026-10-15</lastmod></sitemap>
  <sitemap><loc>https://example.test/maps/blog.xml</loc></sitemap>
</sitemapindex>`,
  unsupported: `<urlset xmlns="${ns}" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>https://example.test/photo</loc><image:image><image:loc>https://example.test/photo.jpg</image:loc></image:image></url>
  <url><loc>https://example.test/first</loc><loc>https://example.test/second</loc></url>
  <url><loc><b>https://example.test/nested</b></loc></url>
</urlset>`,
} as const;
