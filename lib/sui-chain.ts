/**
 * Read-only Sui chain access for the permissions dashboard.
 *
 * MemWal's data plane (analyze/remember/recall) goes through the relayer.
 * The *account* itself — owner, delegate keys, active flag — lives onchain
 * as a `MemWalAccount` Move object on Sui. This module fetches that object
 * directly via Sui gRPC so participants can see what's on-chain without
 * touching the relayer.
 *
 * Uses the gRPC client (`SuiGrpcClient`) — JSON-RPC is deprecated per
 * the canonical Sui 2.0 migration guide at
 * https://sdk.mystenlabs.com/sui/migrations/sui-2.0/json-rpc-migration.
 *
 * No wallet involved here. We're just reading public state by object ID.
 */

import { SuiGrpcClient } from "@mysten/sui/grpc";

export type SuiNetwork = "testnet" | "mainnet";

/**
 * Infer which Sui network to query from the configured MemWal relayer URL.
 * Staging relayer → testnet. Production relayer → mainnet.
 */
export function getSuiNetwork(): SuiNetwork {
    const serverUrl = process.env.MEMWAL_SERVER_URL ?? "";
    return serverUrl.includes("staging") ? "testnet" : "mainnet";
}

/**
 * Per-network gRPC-Web endpoints for Sui fullnodes.
 * Source: https://sdk.mystenlabs.com/sui/migrations/sui-2.0/json-rpc-migration
 * (port :443 is what the canonical migration example uses).
 */
const GRPC_ENDPOINTS: Record<SuiNetwork, string> = {
    testnet: "https://fullnode.testnet.sui.io:443",
    mainnet: "https://fullnode.mainnet.sui.io:443",
};

let cachedClient: SuiGrpcClient | null = null;

function getSuiClient(): SuiGrpcClient {
    if (cachedClient) return cachedClient;
    const network = getSuiNetwork();
    cachedClient = new SuiGrpcClient({
        network,
        baseUrl: GRPC_ENDPOINTS[network],
    });
    return cachedClient;
}

export interface DelegateKeyInfo {
    /** Ed25519 public key as hex (no 0x prefix) */
    publicKey: string;
    /** Sui address derived from the Ed25519 public key */
    suiAddress: string;
    /** Human-readable label set when the key was added */
    label: string;
    /** Epoch ms */
    createdAt: number;
}

export interface AccountInfo {
    accountId: string;
    owner: string;
    active: boolean;
    /** Epoch ms */
    createdAt: number;
    delegateKeys: DelegateKeyInfo[];
    network: SuiNetwork;
}

function normalizeBytes(input: unknown): number[] {
    if (input instanceof Uint8Array) return Array.from(input);
    if (Array.isArray(input)) return input as number[];
    // Some Sui RPC responses return vector<u8> as a base64 string.
    if (typeof input === "string") {
        try {
            const bin = Buffer.from(input, "base64");
            return Array.from(bin);
        } catch {
            return [];
        }
    }
    return [];
}

function bytesToHex(bytes: number[]): string {
    return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface MoveFields {
    owner: string;
    active: boolean;
    created_at: string | number;
    delegate_keys: Array<{
        fields?: {
            public_key: number[] | string | Uint8Array;
            sui_address: string;
            label: string;
            created_at: string | number;
        };
        public_key?: number[] | string | Uint8Array;
        sui_address?: string;
        label?: string;
        created_at?: string | number;
    }>;
}

/**
 * Fetch a MemWalAccount object by ID and parse its fields.
 *
 * Asks the Sui fullnode for the object's JSON-rendered Move struct content.
 * The exact field shapes can vary between API implementations (BCS is the
 * stable contract), so we accept several encodings for `vector<u8>` in
 * `normalizeBytes`.
 *
 * Returns parsed `AccountInfo`. Throws if the object can't be found or
 * isn't a Move object.
 */
export async function fetchAccountInfo(accountId: string): Promise<AccountInfo> {
    const client = getSuiClient();
    const network = getSuiNetwork();

    const { object } = await client.getObject({
        objectId: accountId,
        include: { json: true },
    });

    if (!object?.json) {
        throw new Error(
            `MemWalAccount ${accountId} not found on ${network} (or has no JSON content)`,
        );
    }

    const fields = object.json as unknown as MoveFields;

    const delegateKeys: DelegateKeyInfo[] = (fields.delegate_keys ?? []).map((entry) => {
        const f = entry.fields ?? entry;
        const pkBytes = normalizeBytes(f.public_key);
        return {
            publicKey: bytesToHex(pkBytes),
            suiAddress: String(f.sui_address ?? ""),
            label: String(f.label ?? ""),
            createdAt: Number(f.created_at ?? 0),
        };
    });

    return {
        accountId,
        owner: fields.owner,
        active: !!fields.active,
        createdAt: Number(fields.created_at ?? 0),
        delegateKeys,
        network,
    };
}
