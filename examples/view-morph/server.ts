/**
 * Programmatic Melina Server for view-morph example
 */
import { start } from '../../src/web';

await start({
    appDir: './app',
    port: 3000,
    defaultTitle: 'View Morph Demo',
});
