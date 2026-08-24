import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const command = process.argv[2];

function copyGlob(srcDir: string, pattern: RegExp, destDir: string): void {
    mkdirSync(destDir, { recursive: true });
    for (const file of readdirSync(srcDir)) {
        if (pattern.test(file)) {
            cpSync(resolve(srcDir, file), resolve(destDir, file));
        }
    }
}

if (command === 'admin:copy') {
    const buildDir = resolve(__dirname, 'src-admin/build');
    const customDir = resolve(__dirname, 'admin/custom');
    // Vite hashes the asset file names, so without clearing the target every build
    // leaves its predecessors behind. Only assets/ is wiped - i18n/ lives next to it
    // and is maintained by hand.
    rmSync(resolve(customDir, 'assets'), { recursive: true, force: true });
    copyGlob(resolve(buildDir, 'assets'), /\.js$/, resolve(customDir, 'assets'));
    // The admin fetches <dir of url>/mf-manifest.json next to the remote entry and reads from it
    // which component library the build was made against. Without the manifest the component set
    // counts as GUI API generation 1 and admin 8 refuses to start it.
    copyGlob(buildDir, /^(customComponents\.js|mf-manifest\.json)$/, customDir);
    console.log('admin:copy done');
} else if (command === 'sync:datapoints') {
    console.log('sync:datapoints done (no-op)');
} else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
