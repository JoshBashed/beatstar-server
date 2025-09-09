import fs from 'node:fs';
import net from 'node:net';
import tls, { type TlsOptions } from 'node:tls';
import zlib from 'node:zlib';
import {
    RequestHeaderProtobuf,
    ResponseHeaderProtobuf,
} from '@/models/flamingoProtobuf.ts';
import { pb } from '@/models/flamingoProtobufTypes.ts';
import { isKnownService, SERVICES } from '@/services/index.ts';
import { createLogger } from '@/utilities/loggingUtilities.ts';
import { stringifyError } from '@/utilities/tryCatch.ts';

const DEFAULT_PORT = 443; // pick your port, 443 needs root/admin
const DEFAULT_TLS = false;

export class FlamingoServer {
    private readonly logger = createLogger('@/models/flamingoServer');
    private readonly port: number;
    private readonly tls: boolean;
    private server: net.Server | tls.Server | null = null;

    constructor(port: number = DEFAULT_PORT, tls: boolean = DEFAULT_TLS) {
        this.port = port;
        this.tls = tls;
    }

    public async start(
        tlsOptions?: TlsOptions, // only needed if ssl=true
    ): Promise<[true, null] | [false, 'tlsOptionsRequired' | 'serverError']> {
        return new Promise<
            [true, null] | [false, 'tlsOptionsRequired' | 'serverError']
        >((resolve) => {
            try {
                if (this.tls) {
                    this.logger.info('Starting TLS server...');
                    if (!tlsOptions)
                        return resolve([false, 'tlsOptionsRequired']);
                    this.server = tls.createServer(tlsOptions, (socket) => {
                        this.handleConnection(socket);
                    });
                } else {
                    this.logger.info('Starting non-TLS server...');
                    this.server = net.createServer((socket) => {
                        this.handleConnection(socket);
                    });
                }

                this.server.on('error', (err) => {
                    this.logger.error('server error: %s', stringifyError(err));
                    resolve([false, 'serverError']);
                });

                this.server.listen(this.port, () => {
                    this.logger.info(`Listening on port ${this.port}`);
                    resolve([true, null]);
                });
            } catch (err) {
                this.logger.error(`server start error: ${err}`);
                resolve([false, 'serverError']);
            }
        });
    }

    private createErrorResponse(
        header: pb.infer<typeof RequestHeaderProtobuf>,
    ): [pb.infer<typeof ResponseHeaderProtobuf>, Uint8Array] {
        this.logger.error('Failed to handle request: %o', header.service);
        return [
            {
                gzipped: undefined,
                id: '',
                rpc: header.rpc,
                timestamp: Date.now(),
            },
            new Uint8Array(0),
        ];
    }

    private async handleRequest(
        index: number,
        header: pb.infer<typeof RequestHeaderProtobuf> | null,
        body: Uint8Array | null,
    ): Promise<[pb.infer<typeof ResponseHeaderProtobuf>, Uint8Array]> {
        if (!header)
            return [
                {
                    gzipped: undefined,
                    id: '',
                    rpc: '',
                    timestamp: Date.now(),
                },
                new Uint8Array(0),
            ];
        if (!body) return this.createErrorResponse(header);

        // Check if the service is known
        if (!isKnownService(header.service)) {
            this.logger.info('Unknown service: %s', header.service);
            // Write the buffer for debugging to the console.
            fs.writeFileSync('resources/unknownService.bin', body);
            return this.createErrorResponse(header);
        }

        this.logger.info('Handling request to service: %s', header.service);
        const service = SERVICES[header.service];

        // Parse the request
        const [requestResult, request] = pb.parse(body, service.request);
        if (requestResult !== true) {
            this.logger.info('Failed to parse request: %o', request);
            return this.createErrorResponse(header);
        }

        const response = await service.handle({
            header,
            request,
        });
        if (response === null) return this.createErrorResponse(header);

        // Encode the response
        const [responseDataResult, responseData] = pb.serialize(
            response,
            service.response,
        );
        if (responseDataResult !== true) {
            this.logger.info('Failed to serialize response: %o', response);
            return this.createErrorResponse(header);
        }

        let gzippedResponseData: Uint8Array | undefined;

        if (service.config.gzip) {
            const [gzipResult, gzip] = await new Promise<
                [true, Uint8Array] | [false, 'gzipError']
            >((resolve) => {
                zlib.gzip(responseData, (error, result) => {
                    if (error) resolve([false, 'gzipError']);
                    resolve([true, result]);
                });
            });
            if (gzipResult !== true) return this.createErrorResponse(header);
            gzippedResponseData = gzip;
        }

        return [
            {
                gzipped: service.config.gzip ? 1 : undefined,
                id: index.toString(),
                rpc: header.rpc,
                timestamp: Date.now(),
            },
            gzippedResponseData ?? responseData,
        ];
    }

    private async handleConnection(socket: net.Socket) {
        let destroyed = false;
        this.logger.info(
            `Client connected (%s)`,
            socket.remoteAddress ?? 'unknown',
        );

        socket.on('close', () => {
            destroyed = true;
            this.logger.info(
                'Client disconnected (%s)',
                socket.remoteAddress ?? 'unknown',
            );
        });

        let packetBuffer: Uint8Array | null = null;
        let expectedPacketLength = 0;
        let byteOffset = 0;
        let prefixBuffer: Buffer | null = null;
        let packetTimeout: NodeJS.Timeout | null = null;

        const createPacketTimeout = () => {
            if (packetTimeout !== null) clearTimeout(packetTimeout);
            packetTimeout = setTimeout(() => {
                this.logger.info('Packet timeout');
                socket.destroy();
                destroyed = true;
            }, 10000);
        };

        let index = 0;
        const handleCompletePacket = async (packet: Uint8Array) => {
            index += 1;
            this.logger.debug('Handling packet with length %d', packet.length);

            let headerObject: pb.infer<typeof RequestHeaderProtobuf> | null =
                null;
            let bodyBuffer: Uint8Array | null = null;

            // Read the header
            let headerLength: number | null = new DataView(
                packet.buffer,
                packet.byteOffset + 4,
                4,
            ).getUint32(0, false);
            if (packet.length < headerLength) {
                this.logger.warn(
                    'Packet length is %d, but header length is %d',
                    packet.length,
                    headerLength,
                );
                headerLength = null;
            }
            if (headerLength !== null) {
                const headerData = packet.subarray(8, 8 + headerLength);
                const [decodedHeaderResult, decodedHeader] = pb.parse(
                    headerData,
                    RequestHeaderProtobuf,
                );
                if (decodedHeaderResult !== true)
                    this.logger.warn(
                        'Failed to parse decoded header: %o',
                        decodedHeader,
                    );
                else headerObject = decodedHeader;
            }

            // Read the body
            if (headerLength !== null) {
                bodyBuffer = packet.subarray(8 + headerLength);
            }

            const [responseHeader, responseBody] = await this.handleRequest(
                index,
                headerObject,
                bodyBuffer,
            );

            let resultBodyBuffer: Uint8Array = responseBody;

            if (responseHeader.gzipped !== undefined) {
                // Gzip the body
                const [gzipResult, gzip] = await new Promise<
                    [true, Uint8Array] | [false, 'gzipError']
                >((resolve) => {
                    zlib.gzip(responseBody, (error, result) => {
                        if (error) resolve([false, 'gzipError']);
                        resolve([true, result]);
                    });
                });
                if (gzipResult !== true) {
                    this.logger.error('Failed to gzip body: %o', gzip);
                    socket.destroy();
                    destroyed = true;
                    return;
                }
                resultBodyBuffer = gzip;
            }

            const [serializedResponseHeaderResult, serializedResponseHeader] =
                pb.serialize(responseHeader, ResponseHeaderProtobuf);
            if (serializedResponseHeaderResult !== true) {
                this.logger.error(
                    'Failed to serialize response header: %o',
                    serializedResponseHeader,
                );
                socket.destroy();
                destroyed = true;
                return;
            }

            const totalLength =
                serializedResponseHeader.length + resultBodyBuffer.length + 8;
            const packetBuffer = new Uint8Array(totalLength);
            const dataView = new DataView(
                packetBuffer.buffer,
                packetBuffer.byteOffset,
                packetBuffer.byteLength,
            );
            dataView.setUint32(0, totalLength - 4, false);
            dataView.setUint32(4, serializedResponseHeader.length, false);
            packetBuffer.set(serializedResponseHeader, 8);
            packetBuffer.set(
                resultBodyBuffer,
                8 + serializedResponseHeader.length,
            );

            socket.write(packetBuffer);
        };
        socket.on('error', (err) => {
            this.logger.error('Socket error: %s', stringifyError(err));
            socket.destroy();
            destroyed = true;
        });

        socket.on('data', (buf) => {
            createPacketTimeout();
            if (destroyed) return;
            let usedBytes = 0;

            while (usedBytes < buf.length) {
                if (packetBuffer !== null) {
                    // Fill the current packet buffer
                    const remaining = expectedPacketLength - byteOffset;
                    const chunkLen = Math.min(
                        remaining,
                        buf.length - usedBytes,
                    );
                    packetBuffer.set(
                        buf.subarray(usedBytes, usedBytes + chunkLen),
                        byteOffset,
                    );
                    byteOffset += chunkLen;
                    usedBytes += chunkLen;

                    if (byteOffset === expectedPacketLength) {
                        handleCompletePacket(packetBuffer);
                        packetBuffer = null;
                        expectedPacketLength = 0;
                        byteOffset = 0;
                    }
                    continue;
                }

                // If we don’t yet have a prefix, start/stash one
                if (prefixBuffer !== null || buf.length - usedBytes < 4) {
                    const take = Math.min(
                        4 - (prefixBuffer?.length ?? 0),
                        buf.length - usedBytes,
                    );
                    prefixBuffer = Buffer.concat([
                        prefixBuffer ?? Buffer.alloc(0),
                        buf.subarray(usedBytes, usedBytes + take),
                    ]);
                    usedBytes += take;
                    if (prefixBuffer.length < 4) break; // wait for more data
                    const bufferLength = prefixBuffer.readUInt32BE(0);
                    expectedPacketLength = bufferLength + 4;
                    packetBuffer = new Uint8Array(expectedPacketLength);
                    packetBuffer.set(prefixBuffer, 0);
                    byteOffset = 4;
                    prefixBuffer = null;
                    continue;
                }

                // Normal case: full 4-byte prefix is present in buf
                const bufferLength = buf.readUInt32BE(usedBytes);
                expectedPacketLength = bufferLength + 4;
                packetBuffer = new Uint8Array(expectedPacketLength);
                packetBuffer.set(buf.subarray(usedBytes, usedBytes + 4), 0);
                byteOffset = 4;
                usedBytes += 4;
            }
        });
    }

    public stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
            this.logger.info('server stopped');
        }
    }
}
