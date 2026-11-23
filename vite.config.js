import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Content Security Policy for the built site. GitHub Pages cannot send headers, so it goes in a <meta> tag.
// Only our own scripts run; the page talks only to our API; images come only from us and Unsplash.
// Not used in `npm run dev`, because the dev server injects inline scripts.
function securityPolicy(apiUrl) {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
    "img-src 'self' data: https://images.unsplash.com",
    `connect-src 'self'${apiUrl ? ' ' + new URL(apiUrl).origin : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ')
  return {
    name: 'security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' },
      { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head' },
    ],
  }
}

// Relative base, so the build works on GitHub Pages at /<repo>/ and locally.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), securityPolicy(env.VITE_API_URL)],
    base: './',
  }
})
