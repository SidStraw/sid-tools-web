import { defineConfig } from 'vite-plus';

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'development-connections',
      apply: 'serve',
      transformIndexHtml: (html) => html.replace("connect-src 'none'", "connect-src 'self' ws:"),
    },
  ],
  run: {
    tasks: {
      dev: { command: 'vp dev', cache: false },
      build: { command: 'vp build', dependsOn: [{ task: 'build', from: 'dependencies' }] },
    },
  },
});
