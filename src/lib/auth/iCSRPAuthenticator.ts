import crypto from 'crypto';
import { TextEncoder } from 'util';

// ── Inline SRP implementation (Apple GSA mode, SHA-256, 2048-bit) ─────────────
// Previously provided by @foxt/js-srp (pure ESM). Inlined to remove the ESM
// dependency. All crypto operations use Node's built-in webcrypto (crypto.subtle).

/** 2048-bit MODP prime for SRP (RFC 5054 group 14 / Apple GSA). */
const SRP_N = BigInt(
    '0xac6bdb41324a9a9bf166de5e1389582faf72b6651987ee07fc3192943db56050a37329cbb4a099ed8193e0757767a13dd52312ab4b03310dcd7f48a9da04fd50e8083969edb767b0cf6095179a163ab3661a05fbd5faaae82918a9962f0b93b855f97993ec975eeaa80d740adbf4ff747359d041d5c33ea71d281e446b14773bca97b43a23fb801676bd207a436c6481f1d2b9078717461a5b9d32e688f87748544523b524b0d57d5ea77a2775d2ecfa032cfbdbf52fb3786160279004e57ae6af874e7303ce53299ccc041c7bc308d82a5698f3a8d0c38271ae35f8e9dbfbb694b5c803d89f7ae435de236d525f54759b65e372fcd68ef20fa7111f9e4aff73',
);
const SRP_G = 2n;
const SRP_N_BYTES = 256; // 2048-bit / 8

function srpBytesFromBigint(n: bigint): Uint8Array {
    let hex = n.toString(16);
    if (hex.length % 2) {
        hex = `0${hex}`;
    }
    const result = new Uint8Array(hex.length / 2);
    for (let i = 0; i < result.length; i++) {
        result[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return result;
}

function srpBigintFromBytes(bytes: Uint8Array): bigint {
    let n = 0n;
    for (const b of bytes) {
        n = (n << 8n) + BigInt(b);
    }
    return n;
}

function srpPadToLen(value: bigint, targetLen: number): Uint8Array {
    const raw = srpBytesFromBigint(value);
    if (raw.length >= targetLen) {
        return raw;
    }
    const padded = new Uint8Array(targetLen);
    padded.set(raw, targetLen - raw.length);
    return padded;
}

function srpConcat(...arrays: Uint8Array[]): Uint8Array {
    let total = 0;
    for (const a of arrays) {
        total += a.length;
    }
    const result = new Uint8Array(total);
    let offset = 0;
    for (const a of arrays) {
        result.set(a, offset);
        offset += a.length;
    }
    return result;
}

function srpXor(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
        result[i] = a[i] ^ b[i];
    }
    return result;
}

function srpToHex(bytes: Uint8Array): string {
    return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function srpSha256(data: Uint8Array | ArrayBuffer): Promise<Uint8Array> {
    const buf = data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(data);
    return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', buf));
}

async function srpSha256BigInt(data: Uint8Array): Promise<bigint> {
    return srpBigintFromBytes(await srpSha256(data));
}

function srpModPow(base: bigint, exp: bigint, mod: bigint): bigint {
    if (mod === 1n) {
        return 0n;
    }
    base = ((base % mod) + mod) % mod;
    let result = 1n;
    for (; exp > 0n; exp >>= 1n) {
        if (exp & 1n) {
            result = (result * base) % mod;
        }
        base = (base * base) % mod;
    }
    return result;
}

// ─────────────────────────────────────────────────────────────────────────────

export type SRPProtocol = 's2k' | 's2k_fo';

export interface ServerSRPInitRequest {
    a: string;
    accountName: string;
    protocols: SRPProtocol[];
}
export interface ServerSRPInitResponse {
    iteration: number;
    salt: string;
    protocol: 's2k' | 's2k_fo';
    b: string;
    c: string;
}
export interface ServerSRPCompleteRequest {
    accountName: string;
    c: string;
    m1: string;
    m2: string;
    rememberMe: boolean;
    trustTokens: string[];
}

const stringToU8Array = (str: string): Uint8Array => new TextEncoder().encode(str);
const base64ToU8Array = (str: string): Uint8Array => Uint8Array.from(Buffer.from(str, 'base64'));

export class GSASRPAuthenticator {
    constructor(private username: string) {}

    private clienta?: bigint;
    private clientA?: bigint;

    private async derivePassword(
        protocol: 's2k' | 's2k_fo',
        password: string,
        salt: Uint8Array,
        iterations: number,
    ): Promise<Uint8Array> {
        let passHash = await srpSha256(stringToU8Array(password));
        if (protocol === 's2k_fo') {
            passHash = stringToU8Array(srpToHex(passHash));
        }

        const imported = await globalThis.crypto.subtle.importKey(
            'raw',
            Buffer.from(passHash),
            { name: 'PBKDF2' },
            false,
            ['deriveBits'],
        );
        const derived = await globalThis.crypto.subtle.deriveBits(
            { name: 'PBKDF2', hash: { name: 'SHA-256' }, iterations, salt: Buffer.from(salt) },
            imported,
            256,
        );
        return new Uint8Array(derived);
    }

    async getInit(): Promise<ServerSRPInitRequest> {
        if (this.clientA !== undefined) {
            throw new Error('Already initialized');
        }
        this.clienta = srpBigintFromBytes(crypto.randomBytes(SRP_N_BYTES));
        this.clientA = srpModPow(SRP_G, this.clienta, SRP_N);
        const a = Buffer.from(srpBytesFromBigint(this.clientA)).toString('base64');
        return { a, protocols: ['s2k', 's2k_fo'], accountName: this.username };
    }

    async getComplete(
        password: string,
        serverData: ServerSRPInitResponse,
    ): Promise<Pick<ServerSRPCompleteRequest, 'm1' | 'm2' | 'c' | 'accountName'>> {
        if (this.clientA === undefined || this.clienta === undefined) {
            throw new Error('Not initialized');
        }
        if (serverData.protocol !== 's2k' && serverData.protocol !== 's2k_fo') {
            throw new Error(`Unsupported protocol ${serverData.protocol as string}`);
        }

        const salt = base64ToU8Array(serverData.salt);
        const serverPubBytes = base64ToU8Array(serverData.b);
        const B = srpBigintFromBytes(serverPubBytes);

        // k = sha256(N_bytes || pad(g, N_BYTES)) as bigint
        const k = await srpSha256BigInt(srpConcat(srpBytesFromBigint(SRP_N), srpPadToLen(SRP_G, SRP_N_BYTES)));

        // u = sha256(pad(A, N_BYTES) || pad(B, N_BYTES)) as bigint
        const u = await srpSha256BigInt(srpConcat(srpPadToLen(this.clientA, SRP_N_BYTES), srpPadToLen(B, SRP_N_BYTES)));

        // Derive password using PBKDF2
        const p = await this.derivePassword(serverData.protocol, password, salt, serverData.iteration);

        // x = sha256(salt || sha256(":" || derived_password)) as bigint
        // (Apple GSA mode: identity bytes are empty, so inner hash is of ":" || p)
        const x = await srpSha256BigInt(srpConcat(salt, await srpSha256(srpConcat(new Uint8Array([58]), p))));

        // S = (B - k*g^x)^(a + u*x) mod N
        const base = B - srpModPow(SRP_G, x, SRP_N) * k; // may be negative; modPow normalises
        const S = srpModPow(base, this.clienta + u * x, SRP_N);

        // K = sha256(S_bytes)
        const K = await srpSha256(srpBytesFromBigint(S));

        // M1 = sha256(XOR(sha256(N_bytes), sha256(pad(g,N))) || sha256(username) || salt || A_bytes || B_bytes || K)
        const M1 = await srpSha256(
            srpConcat(
                srpXor(await srpSha256(srpBytesFromBigint(SRP_N)), await srpSha256(srpPadToLen(SRP_G, SRP_N_BYTES))),
                await srpSha256(stringToU8Array(this.username)),
                salt,
                srpBytesFromBigint(this.clientA),
                srpBytesFromBigint(B),
                K,
            ),
        );

        // M2 = sha256(A_bytes || M1 || K)
        const M2 = await srpSha256(srpConcat(srpBytesFromBigint(this.clientA), M1, K));

        return {
            accountName: this.username,
            m1: Buffer.from(M1).toString('base64'),
            m2: Buffer.from(M2).toString('base64'),
            c: serverData.c,
        };
    }
}
