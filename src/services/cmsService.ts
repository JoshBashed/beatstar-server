import { createService } from '@/models/baseService.ts';
import { pb } from '@/models/flamingoProtobufTypes.ts';

export const cmsService = createService(
    pb.root({
        appVersion: [2, pb.string(), { optional: false, repeatable: false }],
        authenticationTicket: [
            6,
            pb.string(),
            { optional: false, repeatable: false },
        ],
        id: [1, pb.varint(), { optional: false, repeatable: false }],
        timestamp: [3, pb.varint(), { optional: false, repeatable: false }],
        unknown1: [4, pb.string(), { optional: false, repeatable: false }],
        versions: [
            5,
            pb.packed({
                data: [
                    4,
                    pb.packed({
                        versions: [
                            1,
                            pb.packed({
                                locale: [
                                    7,
                                    pb.string(),
                                    { optional: true, repeatable: false },
                                ],
                                localHash: [
                                    3,
                                    pb.string(),
                                    { optional: true, repeatable: false },
                                ],
                                localVersion: [
                                    2,
                                    pb.string(),
                                    { optional: true, repeatable: false },
                                ],
                                name: [
                                    1,
                                    pb.string(),
                                    { optional: false, repeatable: false },
                                ],
                            }),
                            { optional: false, repeatable: true },
                        ],
                    }),
                    { optional: false, repeatable: false },
                ],
                unknown0: [
                    1,
                    pb.varint(),
                    { optional: true, repeatable: false },
                ],
                unknown1: [
                    2,
                    pb.string(),
                    { optional: true, repeatable: false },
                ],
                unknown2: [
                    3,
                    pb.varint(),
                    { optional: true, repeatable: false },
                ],
            }),
            { optional: false, repeatable: false },
        ],
    }),
    pb.root({
        id: [1, pb.varint(), { optional: false, repeatable: false }],
        timestamp: [2, pb.varint(), { optional: false, repeatable: false }],
        unknown4: [4, pb.string(), { optional: true, repeatable: false }],
        versions: [
            5,
            pb.packed({
                data: [
                    5,
                    pb.packed({
                        versions: [
                            1,
                            pb.packed({
                                hash: [
                                    3,
                                    pb.string(),
                                    { optional: false, repeatable: false },
                                ],
                                name: [
                                    1,
                                    pb.string(),
                                    { optional: false, repeatable: false },
                                ],
                                url: [
                                    5,
                                    pb.string(),
                                    { optional: false, repeatable: false },
                                ],
                                version: [
                                    2,
                                    pb.string(),
                                    { optional: false, repeatable: false },
                                ],
                            }),
                            { optional: false, repeatable: true },
                        ],
                    }),
                    { optional: false, repeatable: false },
                ],
                unknown0: [
                    1,
                    pb.varint(),
                    { optional: true, repeatable: false },
                ],
                // unknown1: [
                //     2,
                //     pb.string(),
                //     { optional: true, repeatable: false },
                // ],
                unknown2: [
                    3,
                    pb.varint(),
                    { optional: true, repeatable: false },
                ],
                // unknown3: [
                //     4,
                //     pb.string(),
                //     { optional: true, repeatable: false },
                // ],
            }),
            { optional: false, repeatable: false },
        ],
    }),
    {},
    async (_) => {
        return {
            id: 1,
            timestamp: Date.now(),
            unknown4: '',
            versions: {
                data: {
                    versions: [
                        {
                            hash: '9d56f7fe710fec8a52de1bcac83cde7d',
                            name: 'GameConfig',
                            url: 'https://cms.flamingo.newbirds.net/prod/cms/GameConfig/active/36.1.0.46.gz?Expires=1843141841&Signature=BohUQwgcasxljRH7aVTJNffTYUeSAJgu-Uh~1KzZLBfTVbjvS0jrbGuPuv09wH-YAuD~ot9RI0bjJhUfopksvQwc9MYFz1tMmzF74cGQVmZO0fOz3Uokr67bmne0h53Ayj-m9kuk8hr6vsWlTa2y6OsCn9ek6Lk5sugPJleAOkaMxwM-YhF55n2WXGidAjEYNX06txzX~dQ6AfK8zGyISncKx52JMv6ZrkT5hxPtHKSA5EEvae~lQUlTTKVsuQs7I281kcvIaPpzBo2LL2yvxJGjQI9uyTl30X8d~y9E8Wjg0mNWbgmv8SX9UpTPlm~Z2oSUKr4sNLt~tW1EMb7cqA__&Key-Pair-Id=KEVQ470BMQ31S',
                            version: '36.1.0.46',
                        },
                        {
                            hash: '935ab354099652e73b030e062de775c7',
                            name: 'LangConfig',
                            url: 'https://cms.flamingo.newbirds.net/prod/cms/LangConfig/active/36.1.0.46%2Ben.gz?Expires=1843141841&Signature=jkQ031fSmhSiIyN204DV1t-R0jPzymDyHxvdVnH9XjW~o-lhRu1YGisotexd0cVTk3Oe7bB8LSvQ2ixurLdkI2Dxbt2EZ94NKGzuKgikcx-coCK5vcCU48RsmXaWI4cEqisOMgNI5UY-s~6XiA7sbvPxijmxopDmvrSy7PT2hzqSlO-oELo8eV8JbxTRYqZzjWRREN6RjmPOK9JsRIAM4d2Gj-e5Pr1F1UBZuC2MWGjvYc2GQAgdcCaYJ2xBj8VrE22EZr1AowIeEXdOPmyspVsbFW6y59i67s~XKZMwHwhCw~BU0xOZxpcGFOW3BbVFNABIZcaorlPHtVFM2jti2Q__&Key-Pair-Id=KEVQ470BMQ31S',
                            version: '36.1.0.46+en',
                        },
                        {
                            hash: 'af708e8c903e9b3179907a166cee7677',
                            name: 'AssetsPatchConfig',
                            url: 'https://cms.flamingo.newbirds.net/prod/cms/AssetsPatchConfig/active/36.1.0.9484.gz?Expires=1841937514&Signature=ZTcDgAw6x-A1bdoz6BXvtUSTL55DExx8cEJuTeBDB9LtDvTvtI8tFHmAaikyO72dYzjVqa~XIu4wvIzROh78j-6aJ8FPeX~JVd-0oikPNlDWvfuxgYPG6GuwD0F7GFOpFj7bO6JJGcFYDeV7lANF1sLdL1RIX8orqJMnE6ixyqPmTePmXENb4rF~a8csoczYjlRImng43M56QgG8v0qTLsFyNCRBM0KBUGZVfAOiU3U89ezGOdgubPBXmVWccIFKt8Yj5dlSKEfAEnRz19I9iE3K0GiRS-creN069qiyxd-6PVJP-HVHnFwWkNCFKtPDhQki0BCB8JjuHjf731D1eA__&Key-Pair-Id=KEVQ470BMQ31S',
                            version: '36.1.0.9484',
                        },
                        {
                            hash: '91954c7226905514eb15becbc1eba8e6',
                            name: 'AudioConfig',
                            url: 'https://cms.flamingo.newbirds.net/prod/cms/AudioConfig/active/36.1.0.46.gz?Expires=1843141841&Signature=hkQjLmSIi4Sw4fCGfc9jQoPOPCjgTLGTHKZzDx8OQPtdlWa7DUFBhZbyF9RK1zkLwxgPkDSDcw43QbaiSdzDvDANeg5UFteegpjowzP43XQGfYKfrEL~AOd14Wno8cc24WeIb0HDPTQ819rr44OaUES9c5pEl7SNOmkdvJGLld-Cl2MZpQXB4fI~szGfsNvde306XSSMtLugk4dYE05zg3zoZRyiH159CZB5jqLLlnCa1UYYcQJv8km6K0~8oPNa0jV-QC8KuyE496BHyTgxqGPCELOJig9NpgQTalNDCjJR~KQx7MEHkYOD3YWHxpeCz9Y3a6bTfS6jqRb8icoL1w__&Key-Pair-Id=KEVQ470BMQ31S',
                            version: '36.1.0.46',
                        },
                        {
                            hash: '5a6b9805ec0514ca014639a4eaaf437b',
                            name: 'ScalingConfig',
                            url: 'https://cms.flamingo.newbirds.net/prod/cms/ScalingConfig/active/36.1.0.46.gz?Expires=1843141841&Signature=gebai-dPxsEB875Dd7hYTp2fBHswgzfKlCSwZD34QKXN7Noqxo~4paH-GiyTNvWod19K4ecK81ty0JKSq0KgkCxvwVZGGKtBvV2Uiizg01j-AUcf5SmY20zIo0sKXQoyLRRobOuxKnm1zEZRSlzkGPpuYMhOU3fkW7yJazHgTt5lPxVnvQBEPlCFdf8Q1N3vWSqKNWkwYFExLX6EZ8YHmTTsAf1znPV5QqvKwj68tfxVPfJF5GQ82OCvkm7BHktbS884pVQQocbVxVLBxvcyTMTxGQZjn0KgXro6a-vD29MWUvJroL44JlVhVVPkAocrxkBSuv5u9UqdUPiQdU4yUg__&Key-Pair-Id=KEVQ470BMQ31S',
                            version: '36.1.0.46',
                        },
                        {
                            hash: 'b9eb9fed0baf8d6635aaeeb9137b400f',
                            name: 'NotificationConfig',
                            url: 'https://cms.flamingo.newbirds.net/prod/cms/NotificationConfig/active/36.1.0.46.gz?Expires=1843141841&Signature=T04-uj90c7fCK1J7WGAcx7FG0t1xVY~Zp9x03sib9LE3Aawec~Ripw5Uh4jglLiC5QCUqwXK3pCEhpqirnbDWo6h8ePXLYKCw9HmtAV3KVnLpPZsMTXn65xzzaYRZ~To41pv4COv0lACpcDynX5eOOzgRH4NPp7Ay4kapG80VbDwDudNBF9WbvhoMH~RhbvLPOowzU1ykArIzMN7DXezcgY4Tsdnk4iQXKPJl7suehPsS5UYwQa16HCEY1wc4iAdlYyjxfqRrGFCQFEckVKK6WJsi182dKsxeKPHb3Btm9jPtMFyHMwWCUy4~NXkspeKlxvGSdAGa94JlZ5z5hqFgA__&Key-Pair-Id=KEVQ470BMQ31S',
                            version: '36.1.0.46',
                        },
                        {
                            hash: 'e1d7bd166736e98a4a4a6ed07dcc680f',
                            name: 'FontFallbackConfig',
                            url: 'https://cms.flamingo.newbirds.net/prod/cms/FontFallbackConfig/active/36.1.0.46.gz?Expires=1843141841&Signature=LaR3W-JjkYcI6ylEfO1yEKsaNantHRBhJskGp6NTEomjmviUBHQO-8-9cLeqzxkKYIXv7p3ciT28izO0Ecu~MVDwkhvVzI59X-x9lZaE7A5b3VjgXGeY-pSzF5EcWxjErIfyY~AV1dPf27neJqyrAZgYTfGN7LYhuPiOoD07djLhwJJlAK0Foc8sC-hbPimnzJteHQgkcKcYJhnak3ghP1HulZkpJKrf2My89RZellGMrvc~JhcJ~xnzf1cEWpEeBgkcaNmNazqz6vagVAg8CjEDGRNjeXEDRWfhbFVe8S~JCv8Y~lcqB0CFJB3SUmdszywLsjXXunSL2nd7GyHjpA__&Key-Pair-Id=KEVQ470BMQ31S',
                            version: '36.1.0.46',
                        },
                        {
                            hash: 'd1af79f62348da0a22d38bebb464677c',
                            name: 'MusicKitConfig',
                            url: 'https://cms.flamingo.newbirds.net/prod/cms/MusicKitConfig/active/36.1.0.46.gz?Expires=1843141841&Signature=Y9NFvP7o1YyQjrGihpBlED91QF9sCOUNzeb~9AJOH3lgXthAnFhpI~PBu98f08L4mAZhC7ubwRNwU2MpsehlACYsB~UuQPkV5mIFb5xkjd39DtL9Oe-MuXXAOF3CH7YwxoF9jSXeXspSIoQRgkQriruoT61UJGBeFHywP-oVHqie2YppxwOdwg~MPwdpiEyyu2mB0OBZ-Mwje72gNtwp6LFcFT6VpCM87MT0P2pCsDS~BgZyFYKZGbarNw66lxYdfd0Rwj6DwxrjmdCGpCUfakDjnUM~rcUEwEopZTGiBPBLdzW5tSN1wyAdrCwaIFxx5MujQR1EqXxpg1eTp1u~Ng__&Key-Pair-Id=KEVQ470BMQ31S',
                            version: '36.1.0.46',
                        },
                    ],
                },
                unknown0: 1,
                unknown2: 1,
            },
        };
    },
);
