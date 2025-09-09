import { createService } from '@/models/baseService.ts';
import { pb } from '@/models/flamingoProtobufTypes.ts';

const DeviceDetailsProtobuf = pb.packed({
    activeLocale: pb.packedField(7, pb.string(), {}),
    displayDPI: pb.packedField(10, pb.varint(), {}),
    displayHeight: pb.packedField(9, pb.varint(), {}),
    displayType: pb.packedField(16, pb.string(), {}),
    displayWidth: pb.packedField(8, pb.varint(), {}),
    gpu: pb.packedField(15, pb.string(), {}),
    gpuMemory: pb.packedField(13, pb.varint(), {}),
    phoneMemory: pb.packedField(12, pb.varint(), {}),
    phoneModel: pb.packedField(4, pb.string(), {}),
    phoneVendor: pb.packedField(1, pb.string(), {}),
    shaderLevel: pb.packedField(14, pb.varint(), {}),
    systemLocale: pb.packedField(5, pb.string(), {}),
    systemOs: pb.packedField(2, pb.string(), {}),
    systemOsVersion: pb.packedField(3, pb.string(), {}),
    systemRegion: pb.packedField(6, pb.string(), {}),
    timezone: pb.packedField(11, pb.string(), {
        optional: false,
        repeatable: false,
    }),
});

const TelemetryProtobuf = pb.packed({
    analyticsData: pb.packedField(
        5,
        pb.packed({
            appVersion: pb.packedField(13, pb.string(), {}),
            clide: pb.packedField(1, pb.string(), {}),
            client: pb.packedField(14, pb.string(), {}),
            installId: pb.packedField(15, pb.string(), {}),
            platform: pb.packedField(9, pb.varint(), {}),
            sessionId: pb.packedField(4, pb.string(), {}),
            UTCTimeOffset: pb.packedField(8, pb.varint({ signed: true }), {}),
            unknownTimeOffset: pb.packedField(3, pb.varint(), {}),
        }),
        {},
    ),
    appDetails: pb.packedField(
        2,
        pb.packed({
            analytics: pb.packedField(
                3,
                pb.packed({
                    analyticsService: pb.packedField(1, pb.string(), {}),
                    installId: pb.packedField(2, pb.string(), {}),
                    unknown: pb.packedField(3, pb.varint(), {}),
                }),
                {},
            ),
            appValidationData: pb.packedField(9, pb.string(), {}),
            deviceInfo: pb.packedField(2, DeviceDetailsProtobuf, {}),
            version: pb.packedField(
                1,
                pb.packed({
                    appVersion: pb.packedField(1, pb.string(), {}),
                }),
                {},
            ),
        }),
        {},
    ),
    clide: pb.packedField(4, pb.string(), {}),
    id: pb.packedField(1, pb.varint(), {}),
    timestamp: pb.packedField(3, pb.varint(), {}),
});

const RequestDataProtobuf = pb.packed({
    client: pb.packedField(
        4,
        pb.packed({
            callingCardConfigVersion: pb.packedField(7, pb.string(), {}),
            gameConfigVersion: pb.packedField(5, pb.string(), {}),
            langConfigVersion: pb.packedField(4, pb.string(), {}),
            liveOpsEmojiConfigVersion: pb.packedField(10, pb.string(), {}),
            liveOpsProfileIconConfigVersion: pb.packedField(8, pb.string(), {}),
            liveOpsTrackSkinConfigVersion: pb.packedField(9, pb.string(), {}),
            songConfigVersion: pb.packedField(6, pb.string(), {}),
            telemetry: pb.packedField(3, TelemetryProtobuf, {
                optional: false,
                repeatable: false,
            }),
        }),
        {},
    ),
    header: pb.packedField(2, pb.string(), {}),
    id: pb.packedField(1, pb.varint(), {}),
    rpcType: pb.packedField(
        3,
        pb.enumeration([
            ['profileSync', 2],
            ['sync', 5],
        ]),
        {},
    ),
});

export const gameService = createService(
    pb.root({
        appVersion: pb.packedField(2, pb.string(), {
            optional: false,
            repeatable: false,
        }),
        authenticationTicket: pb.packedField(6, pb.string(), {}),
        data: pb.packedField(5, RequestDataProtobuf, {}),
        id: pb.packedField(1, pb.varint(), {}),
        profileData: pb.packedField(
            4,
            pb.packed({
                lastSyncTimestamp: pb.packedField(7, pb.varint(), {
                    optional: true,
                }),
                profileVersion: pb.packedField(9, pb.varint(), {
                    optional: true,
                }),
            }),
            {},
        ),
        timestamp: pb.packedField(3, pb.varint(), {}),
    }),
    pb.root({
        data: pb.packedField(
            5,
            pb.packed({
                id: pb.packedField(1, pb.varint(), {}),
                rpcType: pb.packedField(
                    3,
                    pb.enumeration([
                        ['profileSync', 2],
                        ['sync', 5],
                    ]),
                    {},
                ),
                unknown4: [
                    4,
                    pb.packed({
                        unknown1: [
                            1,
                            pb.varint(),
                            { optional: false, repeatable: false },
                        ],
                        unknown2: [
                            2,
                            pb.string(),
                            { optional: false, repeatable: false },
                        ],
                        unknown3: [
                            3,
                            pb.string(),
                            { optional: false, repeatable: false },
                        ],
                        unknown4: [
                            4,
                            pb.string(),
                            { optional: false, repeatable: false },
                        ],
                    }),
                    { optional: false, repeatable: false },
                ],
            }),
            { optional: true },
        ),
        id: [1, pb.varint(), { optional: false, repeatable: false }],
        profileData: pb.packedField(
            4,
            pb.packed({
                lastSyncTimestamp: pb.packedField(7, pb.varint(), {
                    optional: true,
                }),
                profileVersion: pb.packedField(9, pb.varint(), {
                    optional: true,
                }),
            }),
            {},
        ),
        timestamp: [2, pb.varint(), { optional: false, repeatable: false }],
    }),
    {},
    async ({ header, request }) => {
        console.log(JSON.stringify(request));
        return {
            data: {
                id: 1,
                rpcType: 'sync',
                unknown4: {
                    unknown1: 30005,
                    unknown2: 'TimestampBelowMinTime: 09/01/1970 16:14:03.359',
                    unknown3: header.rpc,
                    unknown4: 'TimestampBelowMinTime: 09/01/1970 16:14:03.359',
                },
            },
            id: 2,
            profileData: {
                lastSyncTimestamp: undefined,
                profileVersion: undefined,
            },
            timestamp: Date.now(),
        };
    },
);
