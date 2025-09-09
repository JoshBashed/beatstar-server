import { createService } from '@/models/baseService.ts';
import { pb } from '@/models/flamingoProtobufTypes.ts';

export const pingService = createService(
    pb.root({}),
    pb.root({}),
    {},
    async () => {
        return {};
    },
);
