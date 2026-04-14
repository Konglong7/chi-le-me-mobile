// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('index html runtime config wiring', () => {
  it('loads runtime-config.js from index html as an ignored public module script', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const runtimeConfigPath = resolve(process.cwd(), 'public', 'runtime-config.js');

    expect(html).toContain('<script type="module" src="/runtime-config.js" vite-ignore></script>');
    expect(existsSync(runtimeConfigPath)).toBe(true);
    expect(readFileSync(runtimeConfigPath, 'utf8')).toContain('globalThis.__CHI_LE_ME_API_BASE_URL__');
  });
});
