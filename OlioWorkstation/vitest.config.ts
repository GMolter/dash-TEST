import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts', 'test/**/*.test.{ts,tsx}', 'shared/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    reporters: ['default'],
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'local-test-anon-key',
    },
  },
});
