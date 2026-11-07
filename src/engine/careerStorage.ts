import { gzipSync, gunzipSync, strToU8, strFromU8 } from 'three/examples/jsm/libs/fflate.module.js';
import { serializeCareerSave } from './careerSerialization';

const ENCODING = 'gfm-gzip-base64-v1';
const MAX_JSON_BYTES = 32 * 1024 * 1024;
interface SaveMetadata { teamName: string; week: number; year: number; }
interface SaveEnvelope {
    encoding: typeof ENCODING;
    uncompressedBytes: number;
    payload: string;
    metadata: SaveMetadata | null;
}
function metadata(value: Record<string, unknown>): SaveMetadata | null {
    if (typeof value.currentWeek !== 'number' || !Number.isInteger(value.currentWeek) || value.currentWeek < 1) return null;
    const year = value.currentYear == null ? 1 : value.currentYear;
    if (typeof year !== 'number' || !Number.isInteger(year) || year < 1) return null;
    return { teamName: typeof value.userTeamName === 'string' && value.userTeamName ? value.userTeamName : 'Unemployed', week: value.currentWeek, year };
}
function toBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let start = 0; start < bytes.length; start += 0x8000) binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
    return btoa(binary);
}
function fromBase64(text: string): Uint8Array {
    const binary = atob(text);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
}
function parseEnvelope(raw: string): Record<string, any> {
    if (raw.length > MAX_JSON_BYTES * 2) throw new Error('Save exceeds the supported storage size.');
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Save is not a career record.');
    return value;
}

/** Keeps the historic save key, while storing a much smaller self-describing envelope. */
export function encodeCareerSave(value: Record<string, any>): string {
    const bytes = strToU8(serializeCareerSave(value));
    if (bytes.length > MAX_JSON_BYTES) throw new Error('Career exceeds the supported save size.');
    const envelope: SaveEnvelope = {
        encoding: ENCODING, uncompressedBytes: bytes.length,
        payload: toBase64(gzipSync(bytes, { level: 1 })), metadata: metadata(value),
    };
    return JSON.stringify(envelope);
}

/** Returns the original career object for the existing migration/validation path. */
export function decodeCareerSave(raw: string): Record<string, any> {
    const value = parseEnvelope(raw);
    if (!('encoding' in value)) return value; // Legacy plain JSON remains readable.
    if (value.encoding !== ENCODING) throw new Error('Unsupported save encoding.');
    if (!Number.isInteger(value.uncompressedBytes) || value.uncompressedBytes < 1 || value.uncompressedBytes > MAX_JSON_BYTES || typeof value.payload !== 'string') throw new Error('Invalid compressed save header.');
    const compressed = fromBase64(value.payload);
    if (compressed.length < 18 || compressed.length > MAX_JSON_BYTES || compressed[0] !== 0x1f || compressed[1] !== 0x8b) throw new Error('Invalid compressed save payload.');
    const declared = new DataView(compressed.buffer, compressed.byteOffset, compressed.byteLength).getUint32(compressed.byteLength - 4, true);
    if (declared !== value.uncompressedBytes) throw new Error('Compressed save size does not match its header.');
    const decoded = gunzipSync(compressed, { out: new Uint8Array(value.uncompressedBytes) });
    if (decoded.length !== value.uncompressedBytes) throw new Error('Compressed save is incomplete.');
    return parseEnvelope(strFromU8(decoded));
}

/** Homepage preview reads a tiny header rather than decompressing a full club world each render. */
export function readCareerSaveMetadata(raw: string): SaveMetadata | null {
    const value = parseEnvelope(raw);
    if (!('encoding' in value)) return metadata(value);
    if (value.encoding !== ENCODING || !value.metadata || typeof value.metadata !== 'object') return null;
    const preview = value.metadata;
    return metadata({ userTeamName: preview.teamName, currentWeek: preview.week, currentYear: preview.year });
}

/** A duplicate backup is useful, but its quota must never prevent loading the valid primary save. */
export function preserveCareerBackup(storage: Pick<Storage, 'setItem'>, raw: string): boolean {
    try { storage.setItem('gfm_save_v1_backup', raw); return true; }
    catch { return false; }
}
