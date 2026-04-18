import { cpSync, mkdirSync, readdirSync } from 'node:fs';
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
    copyGlob(resolve(buildDir, 'assets'), /\.js$/, resolve(customDir, 'assets'));
    copyGlob(buildDir, /^customComponents\.js$/, customDir);
    console.log('admin:copy done');
} else if (command === 'sync:datapoints') {
    console.log('sync:datapoints done (no-op)');
} else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
