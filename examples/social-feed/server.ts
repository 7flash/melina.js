/**
 * Social Feed Server
 */
import { start } from '../../src/web';
import path from 'path';

const appDir = path.join(import.meta.dir, 'app');

await start({
    port: parseInt(process.env.BUN_PORT || "3000"),
    appDir,
    defaultTitle: 'Social Feed | Melina Demo'
});
