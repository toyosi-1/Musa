import { defineConfig } from 'vitest/config';

/**
 * Dedicated Vitest config for Firebase rules tests.
 *
 * These tests require:
 * - Java installed (Firebase emulator runtime)
 * - The RTDB + Auth emulators running on the ports in `firebase.json`
 *
 * Kick off with:
 *   npm run test:rules       # assumes emulator already running
 *   npm run test:rules:ci    # starts emulator, runs tests, shuts down
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/rules/**/*.{test,spec}.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
