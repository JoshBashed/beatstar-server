import { randomInt } from 'node:crypto';
import zlib from 'node:zlib';
import { FlamingoPacketClient } from '@/models/flamingoPacketClient.ts';
import {
    RequestHeaderProtobuf,
    ResponseHeaderProtobuf,
} from '@/models/flamingoProtobuf.ts';
import { pb } from '@/models/flamingoProtobufTypes.ts';
import { createLogger } from '@/utilities/loggingUtilities.ts';

const APP_VERSION = '999.9.9.99999';

export class FlamingoInterfaceClient {
    public readonly appVersion = APP_VERSION;
    private readonly logger = createLogger('@/models/flamingoInterfaceClient');
    private readonly packetClient: FlamingoPacketClient;
    private packetIndex = 1;

    private constructor(packetClient: FlamingoPacketClient) {
        this.packetClient = packetClient;
    }

    public generateRPCId(): string {
        return `rpc-${this.packetIndex}-${randomInt(100000, 999999)}`;
    }

    public async recivePacket(): Promise<
        | [
              true,
              {
                  header: pb.infer<typeof ResponseHeaderProtobuf>;
                  body: Uint8Array;
              },
          ]
        | [false, 'recivePacketError' | 'headerParseError' | 'unzipError']
    > {
        this.packetIndex += 1;
        const [packetResult, packet] = await this.packetClient.receivePacket();
        if (packetResult !== true) {
            return [false, 'recivePacketError'];
        }

        const [headerResult, header] = pb.parse(
            packet.header,
            ResponseHeaderProtobuf,
        );
        if (headerResult !== true) {
            this.logger.error('Failed to parse header: %o', header);
            return [false, 'headerParseError'];
        }

        if (!header.gzipped)
            return [
                true,
                {
                    body: packet.body,
                    header,
                },
            ];

        const [unzipResult, unzip] = await new Promise<
            [true, Uint8Array] | [false, 'unzipError']
        >((resolve) => {
            zlib.unzip(packet.body, (error, result) => {
                if (error) {
                    this.logger.error('Failed to unzip packet: %o', error);
                    resolve([false, 'unzipError']);
                }
                resolve([true, result]);
            });
        });
        if (unzipResult !== true) return [false, 'unzipError'];
        return [true, { body: unzip, header }];
    }

    public async sendPacket(
        header: pb.infer<typeof RequestHeaderProtobuf>,
        body: Uint8Array,
    ): Promise<
        [true, null] | [false, 'headerSerializeError' | 'sendPacketError']
    > {
        this.packetIndex += 1;
        const [headerBufferResult, headerBuffer] = pb.serialize(
            header,
            RequestHeaderProtobuf,
        );
        if (headerBufferResult !== true) {
            this.logger.error(`Failed to serialize header: ${headerBuffer}`);
            return [false, 'headerSerializeError'];
        }

        const [sendPacketResult, sendPacket] =
            await this.packetClient.sendPacket(headerBuffer, body);

        if (sendPacketResult !== true) {
            this.logger.error(`Failed to send packet: ${sendPacket}`);
            return [false, 'sendPacketError'];
        }
        return [true, null];
    }

    public static async connect(
        ssl: boolean = true,
        hostname: string | null = null,
        port: number | null = null,
    ): Promise<[true, FlamingoInterfaceClient] | [false, 'socketError']> {
        const packetClient = new FlamingoPacketClient(
            hostname ?? undefined,
            port ?? undefined,
            ssl,
        );
        const [connectResult, connect] = await packetClient.connect();
        if (connectResult !== true) return [false, connect];
        return [true, new FlamingoInterfaceClient(packetClient)];
    }
}
