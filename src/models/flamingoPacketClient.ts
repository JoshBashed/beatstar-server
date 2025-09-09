import net from 'node:net';
import tls from 'node:tls';
import { createLogger } from '@/utilities/loggingUtilities.ts';

const DEFAULT_HOSTNAME = 'socket-gateway.prod.flamingo.apelabs.net';
const DEFAULT_PORT = 443;

export class FlamingoPacketClient {
    private readonly logger = createLogger('@/models/flamingoPacketClient');
    private readonly hostname: string;
    private readonly port: number;
    private readonly ssl: boolean;
    private socket: net.Socket | null;
    private closed: boolean = true;

    constructor(
        hostname: string = DEFAULT_HOSTNAME,
        port: number = DEFAULT_PORT,
        ssl: boolean = true,
    ) {
        this.hostname = hostname;
        this.port = port;
        this.ssl = ssl;
        this.socket = null;
    }

    public async connect(): Promise<[true, null] | [false, 'socketError']> {
        const result = new Promise<[true, null] | [false, 'socketError']>(
            (resolve) => {
                const socket = net.createConnection(this.port, this.hostname);
                socket.once('error', (error) => {
                    this.logger.error(`socket error: ${error}`);
                    resolve([false, 'socketError']);
                });
                socket.once('connect', () => {
                    if (this.ssl) {
                        const tlsSocket = tls.connect({
                            servername: this.hostname,
                            socket,
                        });
                        this.closed = false;
                        this.socket = tlsSocket;
                        tlsSocket.once('secureConnect', () => {
                            resolve([true, null]);
                        });
                    } else {
                        this.closed = false;
                        this.socket = socket;
                        resolve([true, null]);
                    }
                });
                socket.on('close', () => {
                    this.logger.error('socket closed');
                    this.closed = true;
                    this.onClose();
                });
            },
        );
        return result;
    }

    private onClose(): void {
        // TODO: reconnect
        this.logger.info('socket closed');
    }

    public async sendPacket(
        headerBuffer: Uint8Array,
        bodyBuffer: Uint8Array,
    ): Promise<[true, null] | [false, 'socketError' | 'socketClosed']> {
        if (this.closed) return [false, 'socketClosed'];
        const headerLenBuffer = Buffer.alloc(4);
        headerLenBuffer.writeUInt32BE(headerBuffer.length, 0);

        const packetBuffer = Buffer.concat([headerBuffer, bodyBuffer]);
        const packetLenBuffer = Buffer.alloc(4);
        packetLenBuffer.writeUInt32BE(packetBuffer.length + 4, 0);

        const finalBuffer = Buffer.concat([
            packetLenBuffer,
            headerLenBuffer,
            packetBuffer,
        ]);

        return await new Promise<[true, null] | [false, 'socketError']>(
            (resolve) => {
                const sock = this.socket;
                if (sock === null) return resolve([false, 'socketError']);
                sock.write(finalBuffer, (error) => {
                    if (error) {
                        this.logger.error(
                            `socket error (sendPacket): ${error}`,
                        );
                        resolve([false, 'socketError']);
                    } else resolve([true, null]);
                });
            },
        );
    }

    private async readBytesWithoutTimeout(
        socket: net.Socket,
        length: number,
        race: { current: boolean } = { current: false },
    ): Promise<[true, Buffer] | [false, 'socketClosed']> {
        if (this.closed) return [false, 'socketClosed'];
        const buf = Buffer.alloc(length);
        let byteOffset = 0;

        const waitReadable = () =>
            new Promise<void>((resolve) => {
                let resolved = false;
                const onReadable = () => {
                    cleanup();
                    resolve();
                };
                const onClose = () => {
                    cleanup();
                    resolve(); // will be detected as short read below
                };
                const cleanup = () => {
                    socket.removeListener('readable', onReadable);
                    socket.removeListener('end', onClose);
                    socket.removeListener('close', onClose);
                };
                socket.once('readable', onReadable);
                socket.once('end', onClose);
                socket.once('close', onClose);
                if (socket.readable) {
                    cleanup();
                    resolve();
                }
                setTimeout(() => {
                    if (resolved) return;
                    resolved = true;
                    cleanup();
                    resolve();
                }, 1000);
            });

        while (byteOffset < length) {
            if (race.current) return [false, 'socketClosed'];
            const chunk = socket.read(length - byteOffset) as Buffer | null;
            if (chunk) {
                chunk.copy(buf, byteOffset);
                byteOffset += chunk.length;
            } else {
                await waitReadable();
                if (socket.destroyed) return [false, 'socketClosed'];
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        return [true, buf];
    }

    private async readBytes(
        socket: net.Socket,
        length: number,
        timeout: number = 1000,
    ): Promise<[true, Buffer] | [false, 'socketClosed' | 'timeout']> {
        const winData = { current: false };
        const result = await Promise.race<
            [true, Buffer] | [false, 'timeout'] | [false, 'socketClosed']
        >([
            this.readBytesWithoutTimeout(socket, length, winData),
            new Promise<[false, 'timeout']>((resolve) => {
                setTimeout(() => {
                    if (winData.current) return;
                    this.logger.error('Timeout');
                    resolve([false, 'timeout']);
                }, timeout);
            }),
        ]);
        winData.current = true;

        return result;
    }

    public async receivePacket(): Promise<
        | [
              true,
              {
                  header: Buffer;
                  body: Buffer;
              },
          ]
        | [
              false,
              'uninitializedSocket' | 'socketClosed' | 'invalidPacketLength',
          ]
    > {
        if (this.closed) return [false, 'socketClosed'];
        if (this.socket === null) return [false, 'uninitializedSocket'];

        const [packetLengthBufferResult, packetLengthBuffer] =
            await this.readBytes(this.socket, 4);
        if (packetLengthBufferResult === false) return [false, 'socketClosed'];
        const packetLength = packetLengthBuffer.readUInt32BE(0);

        const [packetBufferResult, packetBuffer] = await this.readBytes(
            this.socket,
            packetLength,
        );
        if (packetBufferResult === false) return [false, 'socketClosed'];

        // Header
        const headerLenBuffer = packetBuffer.readUInt32BE(0);
        if (headerLenBuffer + 4 > packetBuffer.length)
            return [false, 'invalidPacketLength'];
        const headerBuffer = packetBuffer.subarray(4, headerLenBuffer + 4);

        // Body
        const bodyBuffer = packetBuffer.subarray(headerLenBuffer + 4);
        return [
            true,
            {
                body: bodyBuffer,
                header: headerBuffer,
            },
        ];
    }
}
