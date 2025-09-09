import type { RequestHeaderProtobuf } from '@/models/flamingoProtobuf.ts';
import type { pb } from '@/models/flamingoProtobufTypes.ts';

export interface Service<
    RequestType extends pb.PBRootAnyType,
    ResponseType extends pb.PBRootAnyType,
> {
    request: RequestType;
    response: ResponseType;
    config: { gzip: boolean };
    handle(
        props: HandlerProps<RequestType>,
    ): Promise<pb.infer<ResponseType> | null>;
}

export interface HandlerProps<RequestType extends pb.PBRootAnyType> {
    header: pb.infer<typeof RequestHeaderProtobuf>;
    request: pb.infer<RequestType>;
}

export const createService = <
    RequestType extends pb.PBRootAnyType,
    ResponseType extends pb.PBRootAnyType,
    H extends (
        props: HandlerProps<RequestType>,
    ) => Promise<pb.infer<ResponseType> | null>,
>(
    request: RequestType,
    response: ResponseType,
    config: { gzip?: boolean } = {},
    handle: H,
): Service<RequestType, ResponseType> => {
    return {
        config: { gzip: config.gzip ?? false },
        handle,
        request,
        response,
    };
};
