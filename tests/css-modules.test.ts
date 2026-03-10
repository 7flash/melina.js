/**
 * CSS Modules — Unit Tests
 * 
 * Tests the buildCSSModule() function that scopes class names
 * and builds CSS modules for client-side import.
 */

import { test, expect, describe, beforeAll, afterAll, beforeEach } from 'bun:test';
import { buildCSSModule, clearCaches } from '../src/server/build';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.join(process.cwd(), 'test-data-css-modules');

describe('CSS Modules', () => {
    beforeAll(() => {
        fs.mkdirSync(TEST_DIR, { recursive: true });
    });

    afterAll(() => {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    });

    beforeEach(() => {
        clearCaches();
    });

    test('extracts class names and creates scoped versions', async () => {
        const cssPath = path.join(TEST_DIR, 'card.module.css');
        fs.writeFileSync(cssPath, `
.card {
    padding: 16px;
    border-radius: 8px;
}

.card-header {
    font-weight: bold;
}

.active {
    opacity: 1;
}
`);

        const result = await buildCSSModule(cssPath);

        // Should have all 3 class names in the map
        expect(Object.keys(result.classMap)).toHaveLength(3);
        expect(result.classMap['card']).toBeDefined();
        expect(result.classMap['card-header']).toBeDefined();
        expect(result.classMap['active']).toBeDefined();

        // Scoped names should include the original name + hash
        expect(result.classMap['card']).toMatch(/^card_[a-f0-9]{8}$/);
        expect(result.classMap['card-header']).toMatch(/^card-header_[a-f0-9]{8}$/);
    });

    test('scoped CSS contains renamed class selectors', async () => {
        const cssPath = path.join(TEST_DIR, 'button.module.css');
        fs.writeFileSync(cssPath, `
.btn {
    cursor: pointer;
}

.btn-primary {
    background: blue;
}
`);

        const result = await buildCSSModule(cssPath);

        // The CSS should contain the scoped class names, not the originals
        expect(result.css).toContain(result.classMap['btn']);
        expect(result.css).toContain(result.classMap['btn-primary']);
        expect(result.css).toContain('cursor: pointer');
        expect(result.css).toContain('background: blue');
    });

    test('returns a valid CSS URL path', async () => {
        const cssPath = path.join(TEST_DIR, 'nav.module.css');
        fs.writeFileSync(cssPath, `.nav { display: flex; }`);

        const result = await buildCSSModule(cssPath);

        expect(result.cssUrl).toMatch(/^\/nav\.module-[a-f0-9]{8}\.css$/);
    });

    test('different files produce different hashes', async () => {
        const cssPath1 = path.join(TEST_DIR, 'a.module.css');
        const cssPath2 = path.join(TEST_DIR, 'b.module.css');
        fs.writeFileSync(cssPath1, `.item { color: red; }`);
        fs.writeFileSync(cssPath2, `.item { color: blue; }`);

        const result1 = await buildCSSModule(cssPath1);
        const result2 = await buildCSSModule(cssPath2);

        // Same class name but different scoped names (different file hashes)
        expect(result1.classMap['item']).not.toBe(result2.classMap['item']);
    });

    test('handles pseudo-selectors and combinators', async () => {
        const cssPath = path.join(TEST_DIR, 'complex.module.css');
        fs.writeFileSync(cssPath, `
.wrapper:hover {
    opacity: 0.8;
}

.wrapper .child {
    margin: 0;
}

.wrapper > .child:first-child {
    margin-top: 0;
}
`);

        const result = await buildCSSModule(cssPath);

        expect(result.classMap['wrapper']).toBeDefined();
        expect(result.classMap['child']).toBeDefined();
        // Should scope both classes used in the CSS
        expect(result.css).toContain(result.classMap['wrapper']);
        expect(result.css).toContain(result.classMap['child']);
    });

    test('handles @media queries with scoped classes inside', async () => {
        const cssPath = path.join(TEST_DIR, 'responsive.module.css');
        fs.writeFileSync(cssPath, `
.container {
    width: 100%;
}

@media (min-width: 768px) {
    .container {
        max-width: 720px;
    }
}
`);

        const result = await buildCSSModule(cssPath);

        expect(result.classMap['container']).toBeDefined();
        expect(result.css).toContain('@media');
        expect(result.css).toContain(result.classMap['container']);
    });

    test('throws on non-existent file', async () => {
        expect(buildCSSModule('/nonexistent/file.module.css')).rejects.toThrow('CSS module not found');
    });
});
