#!/usr/bin/env bun

/**
 * melina CLI — Project scaffolding
 * 
 * Usage:
 *   npx melina init <project-name>   Create a new Melina.js project
 *   npx melina init                  Create in current directory
 */

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
    console.log(`
🦊 melina — Bun-native web framework

Usage:
  npx melina init <project-name>   Create a new project
  npx melina init .                Create in current directory

Options:
  --help, -h                       Show this help message
`);
    process.exit(0);
}

if (command !== 'init') {
    console.error(`Unknown command: ${command}\nRun 'npx melina --help' for usage.`);
    process.exit(1);
}

// ─── Init Command ──────────────────────────────────────────────────────────────

const projectName = args[1] || '.';
const targetDir = projectName === '.' ? process.cwd() : `${process.cwd()}/${projectName}`;
const fs = await import('fs');
const path = await import('path');

// Create directory if needed
if (projectName !== '.') {
    if (fs.existsSync(targetDir)) {
        console.error(`Directory "${projectName}" already exists.`);
        process.exit(1);
    }
    fs.mkdirSync(targetDir, { recursive: true });
}

const appDir = path.join(targetDir, 'app');
fs.mkdirSync(appDir, { recursive: true });

// ─── Templates ─────────────────────────────────────────────────────────────────

const files: Record<string, string> = {
    'server.ts': `import { start } from 'melina';
import path from 'path';

await start({
    port: parseInt(process.env.BUN_PORT || "3000"),
    appDir: path.join(import.meta.dir, 'app'),
    defaultTitle: '${projectName === '.' ? 'My App' : projectName}',
});
`,

    'tsconfig.json': `{
    "compilerOptions": {
        "jsx": "react-jsx",
        "jsxImportSource": "melina/client",
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "noEmit": true,
        "skipLibCheck": true
    },
    "include": ["app/**/*", "server.ts"]
}
`,

    'app/layout.tsx': `export default function RootLayout({ children }: { children: any }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>${projectName === '.' ? 'My App' : projectName}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </head>
            <body>
                <main id="melina-page-content">{children}</main>
            </body>
        </html>
    );
}
`,

    'app/page.tsx': `export default function HomePage() {
    return (
        <div style={{ maxWidth: '640px', margin: '80px auto', padding: '0 24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '16px' }}>
                🦊 ${projectName === '.' ? 'My App' : projectName}
            </h1>
            <p style={{ color: '#71717a', fontSize: '1.1rem', lineHeight: 1.6 }}>
                Your Melina.js app is running. Edit <code>app/page.tsx</code> to get started.
            </p>
            <div id="app-root" style={{ marginTop: '32px' }} />
        </div>
    );
}
`,

    'app/page.client.tsx': `import { render } from 'melina/client';

function App() {
    return (
        <div style={{ padding: '20px', background: '#18181b', borderRadius: '12px', color: '#e4e4e7' }}>
            <p>✨ Client interactivity works! Edit <code>app/page.client.tsx</code> to add more.</p>
        </div>
    );
}

export default function mount() {
    const root = document.getElementById('app-root');
    if (!root) return;
    render(<App />, root);
    return () => render(null, root);
}
`,

    'app/globals.css': `@import "tailwindcss";

@theme {
    --color-background: #0a0a0f;
    --color-surface: #111118;
    --color-foreground: #e4e4e7;
    --color-muted: #71717a;
    --color-accent: #6366f1;

    --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
}

body {
    background: var(--color-background);
    color: var(--color-foreground);
    margin: 0;
}

code {
    background: rgba(99, 102, 241, 0.15);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
}
`,
};

// ─── Write Files ───────────────────────────────────────────────────────────────

let written = 0;
for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(targetDir, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Don't overwrite existing files
    if (fs.existsSync(fullPath)) {
        console.log(`  skip  ${filePath} (already exists)`);
        continue;
    }
    fs.writeFileSync(fullPath, content);
    console.log(`  create  ${filePath}`);
    written++;
}

// ─── Done ──────────────────────────────────────────────────────────────────────

const displayName = projectName === '.' ? 'current directory' : projectName;
console.log(`
🦊 Project scaffolded in ${displayName} (${written} files)

Next steps:
  ${projectName !== '.' ? `cd ${projectName}\n  ` : ''}bun install
  bun run server.ts

Open http://localhost:3000 to see your app.
`);
