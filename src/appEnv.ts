import fs from 'node:fs';
import { createLogger } from '@/utilities/loggingUtilities.ts';
import { stringifyError } from '@/utilities/tryCatch.ts';

const logger = createLogger('@/appEnv');

interface AppEnv {
    readonly development: boolean;
    readonly tls: {
        readonly cert: Buffer;
        readonly key: Buffer;
    } | null;
    readonly port: number;
}

export const appEnv: AppEnv = (() => {
    const development = process.env.NODE_ENV === 'development';
    const tlsEnabled = process.env.TLS === 'true';

    const port = Number.parseInt(process.env.PORT ?? '', 10);
    if (Number.isNaN(port) || port < 1 || port > 65535) {
        return logger.fatal(
            'Invalid port: %s',
            process.env.PORT ?? '(undefined)',
        );
    }

    let tlsConfig: null | { cert: Buffer; key: Buffer } = null;
    if (tlsEnabled) {
        const tlsCert = process.env.TLS_CERT;
        const tlsKey = process.env.TLS_KEY;
        if (tlsCert === undefined || tlsKey === undefined) {
            return logger.fatal(
                'TLS is enabled but TLS_CERT or TLS_KEY is undefined',
            );
        }

        // Read the TLS certificate and key
        try {
            tlsConfig = {
                cert: fs.readFileSync(tlsCert),
                key: fs.readFileSync(tlsKey),
            };
        } catch (error) {
            return logger.fatal(
                'Failed to read TLS certificate and key: %s',
                stringifyError(error),
            );
        }
    }

    return {
        development,
        port,
        tls: tlsConfig,
    };
})();
