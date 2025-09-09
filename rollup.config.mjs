import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { default as alias } from '@rollup/plugin-alias';
import { default as commonjs } from '@rollup/plugin-commonjs';
import { default as swc } from '@rollup/plugin-swc';
import { default as terser } from '@rollup/plugin-terser';
import { defineConfig } from 'rollup';
import { default as copy } from 'rollup-plugin-copy';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig([
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/index.cjs',
            format: 'cjs',
        },
        plugins: [
            alias({
                entries: [{ find: '@', replacement: join(currentDir, 'src') }],
            }),
            swc(),
            commonjs(),
            process.env.NODE_ENV === 'production' && terser(),
            copy({
                targets: [
                    {
                        dest: 'dist/resources',
                        src: 'resources/**/*',
                    },
                ],
            }),
        ],
    },
]);
