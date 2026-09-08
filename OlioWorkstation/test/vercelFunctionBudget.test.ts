import { readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const HOBBY_FUNCTION_LIMIT = 12;

function productionFunctions(root: string, directory = root): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name.startsWith('_') ? [] : productionFunctions(root, fullPath);
    }
    if (!/\.(?:cjs|js|mjs|ts)$/.test(entry.name)) {
      return [];
    }
    return [relative(root, fullPath).replaceAll('\\', '/')];
  });
}

describe('Vercel Hobby serverless-function budget', () => {
  it('keeps production API entrypoints within the deployment limit', () => {
    const functions = productionFunctions(resolve(process.cwd(), 'api'));

    expect(functions).not.toContain('admin/help-article.ts');
    expect(functions).toContain('admin/help-articles.ts');
    expect(functions).toContain('admin/data.ts');
    expect(functions).toContain('auth/complete-password-reset.ts');
    expect(functions).not.toContain('projects/ai-usage-admin.ts');
    expect(functions.some((entry) => entry.includes('.test.'))).toBe(false);
    expect(functions.length).toBeLessThanOrEqual(HOBBY_FUNCTION_LIMIT);
  });
});
