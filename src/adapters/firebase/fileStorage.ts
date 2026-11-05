import { deleteObject, getBlob, getMetadata, listAll, ref, uploadBytes } from "firebase/storage";
import type { FileStorageService } from "../../services/interfaces";
import { getFirebaseStorage } from "./app";
import { explainFirebaseError } from "./errors";

const ROOT = "proofs";

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

export function createFirebaseFileStorage(): FileStorageService {
  const objectRef = (key: string) => ref(getFirebaseStorage(), `${ROOT}/${key}`);

  return {
    async put(key, blob, meta) {
      try {
        await uploadBytes(objectRef(key), blob, {
          contentType: meta.mimeType,
          customMetadata: { fileName: meta.fileName },
        });
        return key;
      } catch (error) {
        throw explainFirebaseError(error);
      }
    },

    async get(key) {
      try {
        return await getBlob(objectRef(key));
      } catch {
        return null;
      }
    },

    async getObjectUrl(key) {
      const blob = await this.get(key);
      return blob ? URL.createObjectURL(blob) : null;
    },

    async remove(key) {
      try {
        await deleteObject(objectRef(key));
      } catch {
        // Missing proofs should not block a void or a re-upload.
      }
    },

    async exportAll() {
      const listed = await listAll(ref(getFirebaseStorage(), ROOT));
      const out: Record<string, { mimeType: string; fileName: string; base64: string }> =
        {};
      for (const item of listed.items) {
        const key = item.name;
        const blob = await getBlob(item);
        const meta = await getMetadata(item);
        out[key] = {
          mimeType: meta.contentType || blob.type || "application/octet-stream",
          fileName: meta.customMetadata?.fileName || key,
          base64: await blobToBase64(blob),
        };
      }
      return out;
    },

    async importAll(files) {
      const folder = ref(getFirebaseStorage(), ROOT);
      const listed = await listAll(folder);
      await Promise.all(
        listed.items.map(async (item) => {
          try {
            await deleteObject(item);
          } catch {
            // Continue the restore if an old proof is already gone.
          }
        }),
      );
      for (const [key, meta] of Object.entries(files)) {
        await uploadBytes(objectRef(key), base64ToBlob(meta.base64, meta.mimeType), {
          contentType: meta.mimeType,
          customMetadata: { fileName: meta.fileName },
        });
      }
    },
  };
}
