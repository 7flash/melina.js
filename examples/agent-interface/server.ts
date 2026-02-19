import { start } from '../../src/web';
import path from 'path';

// Use same app directory pattern as other examples
const appDir = path.join(import.meta.dir, 'app');

await start({
    port: parseInt(process.env.BUN_PORT || "3334"),
    appDir,
    defaultTitle: 'Agent Interface | Melina Demo'
});
