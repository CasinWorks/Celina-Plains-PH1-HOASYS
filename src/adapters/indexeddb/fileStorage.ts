import type { FileStorageService } from "../../services/interfaces";
import { getDb, type HoaDatabase } from "./db";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export function createIndexedDbFileStorage(
  db: HoaDatabase = getDb(),
): FileStorageService {
  return {
    async put(key, blob, meta) {
      await db.files.put({
        key,
        blob,
        fileName: meta.fileName,
        mimeType: meta.mimeType,
        createdAt: new Date().toISOString(),
      });
      return key;
    },

    async get(key) {
      const row = await db.files.get(key);
      return row?.blob ?? null;
    },

    async getObjectUrl(key) {
      const blob = await this.get(key);
      return blob ? URL.createObjectURL(blob) : null;
    },

    async remove(key) {
      await db.files.delete(key);
    },

    async exportAll() {
      const rows = await db.files.toArray();
      const out: Record<
        string,
        { mimeType: string; fileName: string; base64: string }
      > = {};
      for (const row of rows) {
        out[row.key] = {
          mimeType: row.mimeType,
          fileName: row.fileName,
          base64: await blobToBase64(row.blob),
        };
      }
      return out;
    },

    async importAll(files) {
      await db.files.clear();
      for (const [key, meta] of Object.entries(files)) {
        await db.files.put({
          key,
          blob: base64ToBlob(meta.base64, meta.mimeType),
          fileName: meta.fileName,
          mimeType: meta.mimeType,
          createdAt: new Date().toISOString(),
        });
      }
    },
  };
}
