import { createService } from '@/models/baseService.ts';
import { pb } from '@/models/flamingoProtobufTypes.ts';

export const userService = createService(
    pb.root({
        appVersion: [7, pb.string(), { optional: false, repeatable: false }],
        id: [1, pb.varint(), { optional: false, repeatable: false }],
        login: [
            112,
            pb.packed({
                cinta: [3, pb.string(), { optional: true, repeatable: false }],
                unknown1: [
                    15,
                    pb.varint(),
                    { optional: true, repeatable: false },
                ],
            }),
            { optional: false, repeatable: false },
        ],
        timestamp: [11, pb.varint(), { optional: false, repeatable: false }],
        type: [2, pb.varint(), { optional: false, repeatable: false }],
    }),
    pb.root({
        clide: [10, pb.string(), { optional: false, repeatable: false }],
        id: [1, pb.varint(), { optional: false, repeatable: false }],
        login: [
            112,
            pb.packed({
                authenticationTicket: [
                    1,
                    pb.string(),
                    { optional: false, repeatable: false },
                ],
                cinta: [4, pb.string(), { optional: false, repeatable: false }],
                clide: [2, pb.string(), { optional: false, repeatable: false }],
                expiryTimestamp: [
                    3,
                    pb.varint(),
                    { optional: false, repeatable: false },
                ],
            }),
            { optional: false, repeatable: false },
        ],
        status: [3, pb.varint(), { optional: false, repeatable: false }],
        type: [2, pb.varint(), { optional: false, repeatable: false }],
    }),
    {},
    async ({ request }) => {
        const clide = crypto.randomUUID();
        return {
            clide,
            id: 1,
            login: {
                authenticationTicket:
                    'VCS1axRWJeppqPZzPZRqJBueww3tZxhNvwloyhBkc9n9JjR5pPZLk7Q0QfvjYF+NoswsBRTRcz40SACMGbPyD4j9d3t6ZYXXc2xUiXISVqnCdZLnOtjNDR0W+rpSKCnfdPAPnGFW1WjznHHPdDptd+hRDdhpsASXg21ssolAo0MTDWYPh0dtYg==',
                cinta: request.login.cinta ?? crypto.randomUUID(),
                clide,
                expiryTimestamp: Date.now() + 1000 * 60 * 60 * 24 * 7,
            },
            status: 200,
            type: 7,
        };

        // authenticationTicket:
        //     "VCS1axRWJeq4jFJdpI3RFfnaIPjAV3ksi8W3cc3VYedwSiQFozfoIZpRN663Tmn4oswsBRTRcz6r8E+aDLuhDzh6xg/vB0e6SqjD2fpd/N1oY/4ulGb8qQ4qc2cGwuS4dPAPnGFW1WjP7SZ3MRJI0WRo2iHbz5Qlg21ssolAo0MTDWYPh0dtYg==",
    },
);
