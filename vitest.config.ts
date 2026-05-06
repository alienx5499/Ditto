import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/types/**',
        'src/**/*.d.ts',
        'src/prompts/**',
        'src/ui/banner.ts',
        'src/ui/input.ts',
        'src/ui/spinner.ts',
        'src/ui/theme.ts',
        'src/ui/step-renderer.ts',
        'src/index.ts',
        'src/commands/chat.ts',
        'src/commands/clone.ts',
        'src/commands/doctor.ts',
        'src/commands/oneshot.ts',
        'src/clone/screenshot.ts',
        'src/tools/extract-site.ts',
        'src/providers/llm-provider.ts',
        'src/providers/vertex-gemini.ts',
      ],
      thresholds: {
        lines: 70,
        statements: 70,
        functions: 70,
        branches: 65,
      },
    },
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
