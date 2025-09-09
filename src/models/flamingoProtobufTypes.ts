// Credit: https://github.com/DavidBuchanan314, https://github.com/ExternalAddress4401

// ByteReader
export class ByteReader {
    private readonly buffer: Uint8Array;
    private offset: number;

    public constructor(buffer: Uint8Array) {
        this.buffer = buffer;
        this.offset = 0;
    }

    public static fromBuffer(buffer: Buffer): ByteReader {
        return new ByteReader(buffer);
    }

    public getOffset(): number {
        return this.offset;
    }

    public setOffset(offset: number): void {
        this.offset = offset;
    }

    public advance(length: number): boolean {
        this.offset += length;
        return this.offset <= this.buffer.length;
    }

    public read(length: number): Uint8Array | null {
        if (this.offset + length > this.buffer.length) return null;
        const result = this.buffer.subarray(this.offset, this.offset + length);
        this.offset += length;
        return result;
    }
}

// String
interface StringProtobufField {
    type: 'string';
}
type StringProtobufFieldInfered = string;

// Varint
interface VarintProtobufField {
    type: 'varint';
    signed: boolean;
}
type VarintProtobufFieldInfered = number;

// Boolean
interface BooleanProtobufField {
    type: 'boolean';
}
type BooleanProtobufFieldInfered = boolean;

// Float
interface FloatProtobufField {
    type: 'float';
}
type FloatProtobufFieldInfered = number;

// Buffer
interface BufferProtobufField {
    type: 'buffer';
}
type BufferProtobufFieldInfered = Uint8Array;

// Collection: Root, Packed
type CollectionProtobufFieldDataTuple = readonly [
    number,
    ProtobufField,
    {
        optional: boolean;
        repeatable: boolean;
    },
];
type CollectionProtobufFieldData = Record<
    string,
    CollectionProtobufFieldDataTuple
>;
type RootProtobufField<T extends CollectionProtobufFieldData> = {
    type: 'root';
    fields: T;
};
type PackedProtobufField<T extends CollectionProtobufFieldData> = {
    type: 'packed';
    fields: T;
};
type CollectionProtobufField<T extends CollectionProtobufFieldData> =
    | RootProtobufField<T>
    | PackedProtobufField<T>;
type AnyCollectionProtobufField =
    CollectionProtobufField<CollectionProtobufFieldData>;
type CollectionProtobufFieldDataInfered<
    T extends CollectionProtobufFieldDataTuple,
> = T[2]['optional'] extends true
    ? T[2]['repeatable'] extends true
        ? ProtobufFieldInfered<T[1]>[] | undefined
        : ProtobufFieldInfered<T[1]> | undefined
    : T[2]['repeatable'] extends true
      ? ProtobufFieldInfered<T[1]>[]
      : ProtobufFieldInfered<T[1]>;
type CollectionProtobufFieldInfered<T extends CollectionProtobufFieldData> = {
    [K in keyof T]: CollectionProtobufFieldDataInfered<T[K]>;
};

// Array
type ArrayProtobufField<T extends ProtobufField> = {
    type: 'array';
    field: T;
};
type ArrayProtobufFieldInfered<T extends ProtobufField> =
    ProtobufFieldInfered<T>[];

// Enumeration
type EnumerationProtobufFieldData<T extends string> = readonly (readonly [
    T,
    number,
])[];
type EnumerationProtobufField<T extends EnumerationProtobufFieldData<string>> =
    {
        type: 'enum';
        field: T;
    };
type EnumerationProtobufFieldInfered<
    T extends EnumerationProtobufFieldData<string>,
> = T[number][0];

// ProtobufField
type ProtobufField =
    | RootProtobufField<CollectionProtobufFieldData>
    | PackedProtobufField<CollectionProtobufFieldData>
    // biome-ignore lint/suspicious/noExplicitAny: required because typescript doesn't support recursive types
    | ArrayProtobufField<any>
    | EnumerationProtobufField<EnumerationProtobufFieldData<string>>
    | BufferProtobufField
    | StringProtobufField
    | VarintProtobufField
    | BooleanProtobufField
    | FloatProtobufField;
type ProtobufFieldInfered<T extends ProtobufField> =
    T extends AnyCollectionProtobufField
        ? CollectionProtobufFieldInfered<T['fields']>
        : T extends ArrayProtobufField<ProtobufField>
          ? ArrayProtobufFieldInfered<ProtobufField>
          : T extends EnumerationProtobufField<
                  EnumerationProtobufFieldData<string>
              >
            ? EnumerationProtobufFieldInfered<T['field']>
            : T extends BufferProtobufField
              ? BufferProtobufFieldInfered
              : T extends StringProtobufField
                ? StringProtobufFieldInfered
                : T extends VarintProtobufField
                  ? VarintProtobufFieldInfered
                  : T extends BooleanProtobufField
                    ? BooleanProtobufFieldInfered
                    : T extends FloatProtobufField
                      ? FloatProtobufFieldInfered
                      : never;

// Parse / Serialize Error
type Error<Type extends string, Reason extends string> = {
    type: Type;
    reason: Reason;
    data?: string | number;
    path: string[];
};
type AnyError = Error<string, string>;

const SERIALIZE_TYPE_MAP: Record<ProtobufField['type'], number> = {
    array: 2,
    boolean: 0,
    buffer: 2,
    enum: 0,
    float: 5,
    packed: 2,
    root: 2,
    string: 2,
    varint: 0,
};

// Root
const createPbRoot = <T extends CollectionProtobufFieldData>(
    fields: T,
): RootProtobufField<T> => {
    return {
        fields: fields,
        type: 'root',
    };
};
const parsePbRoot = <T extends RootProtobufField<CollectionProtobufFieldData>>(
    reader: ByteReader,
    root: T,
    path: string[],
):
    | [true, CollectionProtobufFieldInfered<T['fields']>]
    | [
          -1,
          Error<
              'root',
              | 'missingField'
              | 'notEnoughData'
              | 'unknownField'
              | 'duplicateField'
          >,
      ]
    | [0, AnyError] => {
    // Danger!
    const items: Map<string, unknown> = new Map();
    let debugId = 0;
    while (true) {
        const [tagResult, tag] = parsePbVarintInternal(reader, [
            ...path,
            `[${debugId}]`,
            '[tag]',
        ]);
        if (tagResult !== true) {
            if (tagResult === -1 && tag.reason === 'notEnoughData') break;
            return [0, tag];
        }
        const field = tag >> 3;
        const wireType = tag & 0x7;
        const uncheckedFieldData = Object.entries(root.fields).find(
            ([_, value]) => value[0] === field,
        );
        if (uncheckedFieldData === undefined) {
            return [
                -1,
                {
                    data: `unknownField(${field}), wireType(${wireType})`,
                    path: [...path, `[${debugId}]`],
                    reason: 'unknownField',
                    type: 'root',
                },
            ];
        }
        const [fieldName, fieldData] = uncheckedFieldData;
        const repeatCount: null | number = fieldData[2].repeatable
            ? ((items.get(fieldName) as Array<unknown> | undefined)?.length ??
              0)
            : null;
        const [dataResult, data] = parsePbItem(reader, fieldData[1], [
            ...path,
            `${fieldName}${repeatCount !== null ? `[${repeatCount}]` : ''}`,
        ]);
        if (dataResult !== true) return [0, data];
        if (repeatCount === null) {
            if (items.has(fieldName))
                return [
                    -1,
                    {
                        path: [...path, fieldName],
                        reason: 'duplicateField',
                        type: 'root',
                    },
                ];
            items.set(fieldName, data);
        } else
            items.set(fieldName, [
                ...((items.get(fieldName) as Array<unknown> | undefined) ?? []),
                data,
            ]);
        debugId++;
    }

    for (const [fieldName, fieldData] of Object.entries(root.fields)) {
        // If the field type is repeated, and it doenn't exist, create an empty array
        if (fieldData[2].repeatable) {
            if (items.get(fieldName) === undefined) items.set(fieldName, []);
        }
        // Ensure all required fields are present
        if (!fieldData[2].optional && items.get(fieldName) === undefined)
            return [
                0,
                {
                    path: [...path, fieldName],
                    reason: 'missingField',
                    type: 'root',
                },
            ];
    }

    return [
        true,
        Object.fromEntries(items) as CollectionProtobufFieldInfered<
            T['fields']
        >,
    ];
};
const serializePbRoot = <
    T extends RootProtobufField<CollectionProtobufFieldData>,
>(
    schema: T,
    value: CollectionProtobufFieldInfered<T['fields']>,
    path: string[],
):
    | [true, Uint8Array]
    | [-1, Error<'root', 'varintInvalidValue' | 'duplicateIdError'>]
    | [0, AnyError] => {
    const buffers: Uint8Array[] = [];
    const finishedIds = new Set<number>();
    const valueEntries = (
        Array.from(Object.entries(schema.fields)) as [
            keyof T['fields'] & string,
            T['fields'][string],
        ][]
    ).sort((a, b) => a[1][0] - b[1][0]);
    for (const [fieldName, fieldSchema] of valueEntries) {
        if (finishedIds.has(fieldSchema[0])) {
            return [
                -1,
                {
                    path: [...path, fieldName],
                    reason: 'duplicateIdError',
                    type: 'root',
                },
            ];
        }
        finishedIds.add(fieldSchema[0]);

        // Get the value(s)
        const currentValue = value[fieldName];
        const fieldDataArray = (
            fieldSchema[2].repeatable ? currentValue : [currentValue]
        ) as CollectionProtobufFieldDataInfered<typeof fieldSchema>[];

        for (let i = 0; i < fieldDataArray.length; i++) {
            const item = fieldDataArray[i];
            if (item === undefined) continue;
            for (let i = 0; i < fieldDataArray.length; i++) {
                const item = fieldDataArray[i];
                if (item === undefined) continue;
                const wireType = SERIALIZE_TYPE_MAP[fieldSchema[1].type];
                const tag = (fieldSchema[0] << 3) | wireType;
                const [varintResult, varint] = serializePbVarintInternal(tag, [
                    ...path,
                    `${fieldName}[${i}]`,
                    '[tag]',
                ]);
                if (varintResult !== true) return [0, varint];
                const [itemResult, itemBuffer] = serializePbItem(
                    item,
                    fieldSchema[1],
                    [...path, `${fieldName}[${i}]`],
                );
                if (itemResult !== true) return [0, itemBuffer];
                buffers.push(varint, itemBuffer);
            }
        }
    }

    // Combine
    const result = new Uint8Array(buffers.reduce((a, b) => a + b.length, 0));
    let offset = 0;
    for (const buffer of buffers) {
        result.set(buffer, offset);
        offset += buffer.length;
    }
    return [true, result];
};

// Packed
const createPbPacked = <T extends CollectionProtobufFieldData>(
    fields: T,
): PackedProtobufField<T> => {
    return {
        fields: fields,
        type: 'packed',
    };
};
const parsePbPacked = <
    T extends PackedProtobufField<CollectionProtobufFieldData>,
>(
    reader: ByteReader,
    pack: T,
    path: string[],
):
    | [true, CollectionProtobufFieldInfered<T['fields']>]
    | [-1, Error<'packed', 'bufferTooSmall'>]
    | [0, AnyError] => {
    // Parse the varint
    const [varintResult, varint] = parsePbVarintInternal(reader, [
        ...path,
        '[length]',
    ]);
    if (varintResult !== true) return [0, varint];

    // Parse the root
    const buffer = reader.read(varint);
    if (buffer === null)
        return [-1, { path, reason: 'bufferTooSmall', type: 'packed' }];
    const [rootResult, root] = parsePbRoot(
        new ByteReader(buffer),
        {
            fields: pack.fields,
            type: 'root',
        },
        path,
    );
    if (rootResult !== true) return [0, root];
    return [true, root];
};
const serializePbPacked = <
    T extends PackedProtobufField<CollectionProtobufFieldData>,
>(
    value: CollectionProtobufFieldInfered<T['fields']>,
    pack: T,
    path: string[],
): [true, Uint8Array] | [0, AnyError] => {
    // Serialize the root
    const [rootResult, root] = serializePbRoot(
        {
            fields: pack.fields,
            type: 'root',
        },
        value,
        path,
    );
    if (rootResult !== true) return [0, root];

    // Serialize the varint
    const [varintResult, varint] = serializePbVarintInternal(root.length, [
        ...path,
        '[length]',
    ]);
    if (varintResult !== true) return [0, varint];

    // Combine
    const result = new Uint8Array(varint.length + root.length);
    result.set(varint, 0);
    result.set(root, varint.length);
    return [true, result];
};

// Array
const createPbArray = <T extends ProtobufField>(
    field: T,
): ArrayProtobufField<T> => {
    return {
        field,
        type: 'array',
    };
};
const parsePbArray = <T extends ProtobufField>(
    reader: ByteReader,
    array: ArrayProtobufField<T>,
    path: string[],
):
    | [true, ArrayProtobufFieldInfered<T>]
    | [-1, Error<'array', 'bufferTooSmall'>]
    | [0, AnyError] => {
    // Parse the varint
    const [varintResult, varint] = parsePbVarintInternal(reader, [
        ...path,
        '[length]',
    ]);
    if (varintResult !== true) return [0, varint];

    // Parse the root
    const buffer = reader.read(varint);
    if (buffer === null)
        return [-1, { path, reason: 'bufferTooSmall', type: 'array' }];
    const arrayReader = new ByteReader(buffer);

    // While there is data left to parse
    const result: ArrayProtobufFieldInfered<T> = [];
    let debugId = 0;
    while (true) {
        const [innerLengthResult, innerLength] = parsePbVarintInternal(
            arrayReader,
            [...path, `[${debugId}]`, '[length]'],
        );
        if (innerLengthResult !== true) break;
        const innerArrayBuffer = arrayReader.read(innerLength);
        if (innerArrayBuffer === null)
            return [
                -1,
                {
                    path: [...path, `[${debugId}]`],
                    reason: 'bufferTooSmall',
                    type: 'array',
                },
            ];
        const innerArrayReader = new ByteReader(innerArrayBuffer);

        const [innerResult, inner] = parsePbItem(
            innerArrayReader,
            array.field,
            [...path, `[${debugId}]`],
        );
        if (innerResult !== true) return [0, inner];
        result.push(inner);
        debugId++;
    }

    return [true, result];
};
const serializePbArray = <T extends ProtobufField>(
    value: ArrayProtobufFieldInfered<T>,
    array: ArrayProtobufField<T>,
    path: string[],
): [true, Uint8Array] | [0, AnyError] => {
    const buffers: Uint8Array[] = [new Uint8Array(0)];
    for (const item of value) {
        const [itemResult, itemBuffer] = serializePbItem(item, array.field, [
            ...path,
            `[${buffers.length}]`,
        ]);
        if (itemResult !== true) return [0, itemBuffer];
        const [lengthResult, length] = serializePbVarintInternal(
            itemBuffer.length,
            [...path, `[${buffers.length}]`, '[length]'],
        );
        if (lengthResult !== true) return [0, length];
        buffers.push(length);
        buffers.push(itemBuffer);
    }

    // Get the total length
    let innerLength = 0;
    for (let i = 1; i < buffers.length; i++) {
        innerLength += buffers[i].length;
    }

    // Create the outer varint
    const [varintResult, varint] = serializePbVarintInternal(innerLength, [
        ...path,
        '[length]',
    ]);
    if (varintResult !== true) return [0, varint];
    buffers[0] = varint;

    // Combine
    const result = new Uint8Array(varint.length + innerLength);
    let offset = 0;
    for (const buffer of buffers) {
        result.set(buffer, offset);
        offset += buffer.length;
    }
    return [true, result];
};

// Enum
const createPbEnum = <const T extends readonly (readonly [string, number])[]>(
    field: T,
): EnumerationProtobufField<T> => {
    return {
        field,
        type: 'enum',
    };
};
const parsePbEnum = <T extends Readonly<EnumerationProtobufFieldData<string>>>(
    reader: ByteReader,
    enumField: EnumerationProtobufField<T>,
    path: string[],
):
    | [true, EnumerationProtobufFieldInfered<T>]
    | [-1, Error<'enum', 'varintInvalidValue'>]
    | [0, AnyError] => {
    const [valueResult, value] = parsePbVarintInternal(reader, [
        ...path,
        '[value]',
    ]);
    if (valueResult !== true) return [0, value];
    const result = enumField.field.find((entry) => entry[1] === value);
    if (result === undefined)
        return [-1, { path, reason: 'varintInvalidValue', type: 'enum' }];
    return [true, result[0] as EnumerationProtobufFieldInfered<T>];
};
const serializePbEnum = <T extends EnumerationProtobufFieldData<string>>(
    value: EnumerationProtobufFieldInfered<T>,
    enumField: EnumerationProtobufField<T>,
    path: string[],
):
    | [true, Uint8Array]
    | [-1, Error<'enum', 'varintInvalidValue'>]
    | [0, AnyError] => {
    const result = enumField.field.find((entry) => entry[0] === value);
    if (result === undefined)
        return [-1, { path, reason: 'varintInvalidValue', type: 'enum' }];
    const [varintResult, varint] = serializePbVarintInternal(result[1], [
        ...path,
        '[value]',
    ]);
    if (varintResult !== true) return [0, varint];
    return [true, varint];
};

// Buffer
const createPbBuffer = (): BufferProtobufField => {
    return {
        type: 'buffer',
    };
};
const parsePbBuffer = (
    reader: ByteReader,
    path: string[],
):
    | [true, BufferProtobufFieldInfered]
    | [-1, Error<'buffer', 'notEnoughData'>]
    | [0, AnyError] => {
    // Parse the varint
    const [varintResult, varint] = parsePbVarintInternal(reader, [
        ...path,
        '[length]',
    ]);
    if (varintResult !== true) return [0, varint];

    // Parse the root
    const buffer = reader.read(varint);
    if (buffer === null)
        return [-1, { path, reason: 'notEnoughData', type: 'buffer' }];
    return [true, buffer];
};
const serializePbBuffer = (
    value: Uint8Array,
    path: string[],
): [true, Uint8Array] | [0, AnyError] => {
    const [varintResult, varint] = serializePbVarintInternal(value.length, [
        ...path,
        '[length]',
    ]);
    if (varintResult !== true) return [0, varint];
    const result = new Uint8Array(varint.length + value.length);
    result.set(varint, 0);
    result.set(value, varint.length);
    return [true, result];
};

// String
const createPbString = (): StringProtobufField => {
    return {
        type: 'string',
    };
};
const parsePbString = (
    reader: ByteReader,
    path: string[],
):
    | [true, StringProtobufFieldInfered]
    | [-1, Error<'string', 'notEnoughData' | 'utf8DecodingError'>]
    | [0, AnyError] => {
    // Variable length
    const [varintResult, varint] = parsePbVarintInternal(reader, [
        ...path,
        '[strLength]',
    ]);
    if (varintResult !== true) return [0, varint];
    const data = reader.read(varint);
    if (data === null)
        return [-1, { path, reason: 'notEnoughData', type: 'string' }];
    try {
        return [true, new TextDecoder('utf-8', { fatal: true }).decode(data)];
    } catch {
        return [-1, { path, reason: 'utf8DecodingError', type: 'string' }];
    }
};
const serializePbString = (
    value: string,
    path: string[],
):
    | [true, Uint8Array]
    | [-1, Error<'string', 'varintInvalidValue' | 'utf8Error'>]
    | [0, AnyError] => {
    let data: Uint8Array;
    try {
        data = new TextEncoder().encode(value);
    } catch {
        return [-1, { path, reason: 'utf8Error', type: 'string' }];
    }
    const [varintResult, varint] = serializePbVarintInternal(data.length, [
        ...path,
        '[strLength]',
    ]);
    if (varintResult !== true) return [0, varint];
    const result = new Uint8Array(varint.length + data.length);
    result.set(varint, 0);
    result.set(data, varint.length);
    return [true, result];
};

// Varint
const createPbVarint = ({
    signed = false,
}: {
    signed?: boolean;
} = {}): VarintProtobufField => {
    return {
        signed,
        type: 'varint',
    };
};
const parsePbVarint = (
    reader: ByteReader,
    field: VarintProtobufField,
    path: string[],
):
    | [true, VarintProtobufFieldInfered]
    | [-1, Error<'varint', 'notEnoughData'>] => {
    let result = 0n;
    let shift = 0n;

    while (true) {
        const byteBuffer = reader.read(1);
        if (byteBuffer === null) {
            return [-1, { path, reason: 'notEnoughData', type: 'varint' }];
        }

        const byte = BigInt(byteBuffer[0]);
        result |= (byte & 0x7fn) << shift;

        if ((byte & 0x80n) === 0n) break;
        shift += 7n;
    }

    if (field.signed) {
        const unsigned = result;
        const decoded = (unsigned >> 1n) ^ -(unsigned & 1n);
        return [true, Number(decoded)];
    } else {
        return [true, Number(result)];
    }
};
const parsePbVarintInternal = (
    reader: ByteReader,
    path: string[],
):
    | [true, VarintProtobufFieldInfered]
    | [-1, Error<'varint', 'notEnoughData'>] => {
    return parsePbVarint(reader, createPbVarint({ signed: false }), path);
};
const serializePbVarint = (
    value: number,
    field: VarintProtobufField,
    path: string[],
): [true, Uint8Array] | [-1, Error<'varint', 'invalidValue'>] => {
    let valueData: bigint;
    if (field.signed) {
        valueData = BigInt((value << 1) ^ (value >> 31));
    } else {
        if (value < 0)
            return [-1, { path, reason: 'invalidValue', type: 'varint' }];
        valueData = BigInt(value);
    }

    const out: number[] = [];
    while (valueData >= 0x80n) {
        out.push(Number((valueData & 0x7fn) | 0x80n));
        valueData >>= 7n;
    }
    out.push(Number(valueData));
    return [true, new Uint8Array(out)];
};

const serializePbVarintInternal = (
    value: number,
    path: string[],
): [true, Uint8Array] | [-1, Error<'varint', 'invalidValue'>] => {
    return serializePbVarint(value, createPbVarint({ signed: false }), path);
};

// Boolean
const createBoolean = (): BooleanProtobufField => {
    return {
        type: 'boolean',
    };
};
const parsePbBoolean = (
    reader: ByteReader,
    path: string[],
):
    | [true, BooleanProtobufFieldInfered]
    | [-1, Error<'boolean', 'invalidValue'>]
    | [0, AnyError] => {
    const [valueResult, value] = parsePbVarintInternal(reader, path);
    if (valueResult !== true) return [0, value];
    if (value !== 0 && value !== 1)
        return [-1, { path, reason: 'invalidValue', type: 'boolean' }];
    return [true, value !== 0];
};
const serializePbBoolean = (
    value: BooleanProtobufFieldInfered,
    path: string[],
): [true, Uint8Array] | [0, AnyError] => {
    const [varintResult, varint] = serializePbVarintInternal(
        value ? 1 : 0,
        path,
    );
    if (varintResult !== true) return [0, varint];
    return [true, varint];
};

// Float
const createFloat = (): FloatProtobufField => {
    return {
        type: 'float',
    };
};
const parsePbFloat = (
    reader: ByteReader,
    path: string[],
):
    | [true, FloatProtobufFieldInfered]
    | [-1, Error<'float', 'notEnoughData'>] => {
    const bytes = reader.read(4);
    if (bytes === null)
        return [-1, { path, reason: 'notEnoughData', type: 'float' }];
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return [true, view.getFloat32(0, true)];
};
const serializePbFloat = (
    value: number,
    path: string[],
): [true, Uint8Array] | [-1, Error<'float', 'invalidValue'>] => {
    if (value < -3.4028234663852886e38 || value > 3.4028234663852886e38)
        return [-1, { path, reason: 'invalidValue', type: 'float' }];
    const view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, value, true);
    return [true, new Uint8Array(view.buffer)];
};

type EnumResult<T> = [true, T] | [0, AnyError] | [-1, AnyError];

// Implementation
const parsePbItem = <T extends ProtobufField>(
    reader: ByteReader,
    field: T,
    path: string[],
): EnumResult<ProtobufFieldInfered<T>> => {
    if (field.type === 'root')
        return parsePbRoot(reader, field, path) as EnumResult<
            ProtobufFieldInfered<T>
        >;
    if (field.type === 'packed')
        return parsePbPacked(reader, field, path) as EnumResult<
            ProtobufFieldInfered<T>
        >;
    if (field.type === 'array')
        return parsePbArray(reader, field, path) as EnumResult<
            ProtobufFieldInfered<T>
        >;
    if (field.type === 'enum')
        return parsePbEnum(reader, field, path) as EnumResult<
            ProtobufFieldInfered<T>
        >;
    if (field.type === 'buffer')
        return parsePbBuffer(reader, path) as EnumResult<
            ProtobufFieldInfered<T>
        >;
    if (field.type === 'string')
        return parsePbString(reader, path) as EnumResult<
            ProtobufFieldInfered<T>
        >;
    if (field.type === 'varint')
        return parsePbVarint(reader, field, path) as EnumResult<
            ProtobufFieldInfered<T>
        >;
    if (field.type === 'boolean')
        return parsePbBoolean(reader, path) as EnumResult<
            ProtobufFieldInfered<T>
        >;
    if (field.type === 'float')
        return parsePbFloat(reader, path) as EnumResult<
            ProtobufFieldInfered<T>
        >;
    return [0, { path, reason: 'unknownFieldType', type: 'root' }];
};
const serializePbItem = <T extends ProtobufField>(
    value: ProtobufFieldInfered<T>,
    field: T,
    path: string[],
): [true, Uint8Array] | [0, AnyError] => {
    let result: [true, Uint8Array] | [0, AnyError] | [-1, AnyError] | undefined;
    if (field.type === 'root')
        result = serializePbRoot(
            field,
            value as CollectionProtobufFieldInfered<CollectionProtobufFieldData>,
            path,
        );
    else if (field.type === 'packed')
        result = serializePbPacked(
            value as CollectionProtobufFieldInfered<CollectionProtobufFieldData>,
            field,
            path,
        );
    else if (field.type === 'array')
        result = serializePbArray(
            value as ArrayProtobufFieldInfered<never>,
            field,
            path,
        );
    else if (field.type === 'enum')
        result = serializePbEnum(
            value as EnumerationProtobufFieldInfered<
                EnumerationProtobufFieldData<string>
            >,
            field,
            path,
        );
    else if (field.type === 'buffer')
        result = serializePbBuffer(value as Uint8Array, path);
    else if (field.type === 'string')
        result = serializePbString(value as string, path);
    else if (field.type === 'varint')
        result = serializePbVarint(
            value as VarintProtobufFieldInfered,
            field,
            path,
        );
    else if (field.type === 'boolean')
        result = serializePbBoolean(value as BooleanProtobufFieldInfered, path);
    else if (field.type === 'float')
        result = serializePbFloat(value as number, path);
    if (result === undefined)
        return [0, { path, reason: 'unknownFieldType', type: 'root' }];
    if (result[0] !== true) return [0, result[1]];
    return result;
};

export namespace pb {
    export type PBType = ProtobufField;
    export type PBRootType<T extends CollectionProtobufFieldData> =
        RootProtobufField<T>;
    export type PBRootAnyType = RootProtobufField<CollectionProtobufFieldData>;
    export type PBPackedType<T extends CollectionProtobufFieldData> =
        PackedProtobufField<T>;
    export type PBPackedAnyType =
        PackedProtobufField<CollectionProtobufFieldData>;
    export type PBArrayType<T extends ProtobufField> = ArrayProtobufField<T>;
    export type PBArrayAnyType = ArrayProtobufField<ProtobufField>;
    export type PBBufferType = BufferProtobufField;
    export type PBStringType = StringProtobufField;
    export type PBVarintType = VarintProtobufField;
    export type PBFloatType = FloatProtobufField;

    export type infer<T extends ProtobufField> = ProtobufFieldInfered<T>;
    export const parse = <T extends ProtobufField>(
        bytes: Uint8Array,
        field: T,
    ): EnumResult<ProtobufFieldInfered<T>> =>
        parsePbItem(new ByteReader(bytes), field, []);
    export const serialize = <T extends ProtobufField>(
        value: ProtobufFieldInfered<T>,
        field: T,
    ): [true, Uint8Array] | [0, AnyError] => serializePbItem(value, field, []);
    export const root = createPbRoot;
    export const packed = createPbPacked;
    export const packedField = <
        Number extends number,
        Field extends ProtobufField,
        Optional extends boolean | undefined = undefined,
        Repeatable extends boolean | undefined = undefined,
    >(
        id: Number,
        field: Field,
        options: {
            optional?: Optional;
            repeatable?: Repeatable;
        } = {},
    ) => {
        type NormalizedOptional = Optional extends true ? true : false;
        type NormalizedRepeatable = Repeatable extends true ? true : false;

        return [
            id,
            field,
            {
                optional: (options.optional ?? false) as NormalizedOptional,
                repeatable: (options.repeatable ??
                    false) as NormalizedRepeatable,
            },
        ] as const;
    };
    export const array = createPbArray;
    export const enumeration = createPbEnum;
    export const buffer = createPbBuffer;
    export const string = createPbString;
    export const varint = createPbVarint;
    export const boolean = createBoolean;
    export const float = createFloat;
    export const embedded = <
        T extends RootProtobufField<CollectionProtobufFieldData>,
    >(
        field: T,
    ): PackedProtobufField<T['fields']> => createPbPacked(field.fields);
}
