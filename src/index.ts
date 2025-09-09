import { appEnv } from '@/appEnv.ts';
import { FlamingoServer } from '@/models/flamingoServer.ts';
import { createLogger } from '@/utilities/loggingUtilities.ts';

const logger = createLogger('@/index');

const main = async () => {
    logger.info('Starting server...');
    const server = new FlamingoServer(appEnv.port, appEnv.tls !== null);
    server.start(
        appEnv.tls
            ? {
                  cert: appEnv.tls.cert,
                  key: appEnv.tls.key,
              }
            : undefined,
    );
};

main();
