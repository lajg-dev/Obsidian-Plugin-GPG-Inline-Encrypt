import { readKey, readPrivateKey, decryptKey, createMessage, encrypt, readMessage, decrypt } from "openpgp";
import type { EncryptOptions, DecryptOptions } from "openpgp";
import { GpgEncryptSettings } from "./Settings";
import type { GpgResult } from "./gpg";

// In-memory passphrase cache (never persisted)
let cachedPassphrase: string | null = null;
let cacheExpiry = 0;

// Store a passphrase in memory for the given time-to-live (milliseconds)
export function setCachedPassphrase(passphrase: string, ttlMs: number): void {
  cachedPassphrase = passphrase;
  cacheExpiry = Date.now() + ttlMs;
}

// Get the cached passphrase if it has not expired
export function getCachedPassphrase(): string | null {
  if (cachedPassphrase && Date.now() < cacheExpiry) {
    return cachedPassphrase;
  }
  cachedPassphrase = null;
  cacheExpiry = 0;
  return null;
}

// Resolve a passphrase from the cache or from the persisted setting (if any)
export function getPassphrase(settings: GpgEncryptSettings): string | null {
  const cached = getCachedPassphrase();
  if (cached) return cached;
  if (settings.pgpPassphrase && settings.pgpPassphrase.trim() !== "") {
    return settings.pgpPassphrase;
  }
  return null;
}

// Browser-safe base64 helpers (Buffer is not available on mobile)
export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// Get the list of public keys from the armored public key in settings
export async function getListPublicKey(settings: GpgEncryptSettings): Promise<{ keyID: string; userID: string }[]> {
  try {
    if (!settings.pgpPublicKeyArmored || settings.pgpPublicKeyArmored.trim() === "") {
      return [];
    }
    const publicKey = await readKey({ armoredKey: settings.pgpPublicKeyArmored });
    const keyID = publicKey.getKeyID().toHex().toUpperCase();
    const keys: { keyID: string; userID: string }[] = [];
    for (const userID of publicKey.getUserIDs()) {
      keys.push({ keyID, userID });
    }
    return keys;
  } catch (ex) {
    console.error("Error reading public key:", ex);
    return [];
  }
}

// Read and (if needed) decrypt the private key from settings
async function decryptPrivateKey(settings: GpgEncryptSettings, passphrase: string | null) {
  let privateKey = await readPrivateKey({ armoredKey: settings.pgpPrivateKeyArmored });
  if (passphrase && passphrase.trim() !== "") {
    privateKey = await decryptKey({ privateKey, passphrase });
  }
  return privateKey;
}

// Encrypt plainText with the configured public key, optionally signing it
export async function gpgEncrypt(settings: GpgEncryptSettings, plainText: string, publicKeyIds: string[], signPublicKeyId: string, passphrase?: string | null): Promise<GpgResult> {
  try {
    if (publicKeyIds.length <= 0) {
      return { result: undefined, error: new Error("❌ Select at least one key") };
    }
    if (!settings.pgpPublicKeyArmored || settings.pgpPublicKeyArmored.trim() === "") {
      return { result: undefined, error: new Error("❌ No public key configured.") };
    }
    const publicKey = await readKey({ armoredKey: settings.pgpPublicKeyArmored });
    const encryptOptions: EncryptOptions & { format: "armored" } = {
      message: await createMessage({ text: plainText }),
      encryptionKeys: publicKey,
      format: "armored"
    };
    if (signPublicKeyId !== "0" && settings.pgpPrivateKeyArmored && settings.pgpPrivateKeyArmored.trim() !== "") {
      const pp = passphrase != null ? passphrase : getPassphrase(settings);
      encryptOptions.signingKeys = await decryptPrivateKey(settings, pp);
    }
    const encrypted = await encrypt(encryptOptions) as string;
    return { result: encrypted, error: undefined };
  } catch (ex: any) {
    return { result: undefined, error: new Error("❌ Encryption failed: " + (ex.message || ex)) };
  }
}

// Decrypt an armored message with the configured private key
export async function gpgDecrypt(settings: GpgEncryptSettings, encryptedText: string, passphrase?: string | null): Promise<GpgResult> {
  try {
    if (!settings.pgpPrivateKeyArmored || settings.pgpPrivateKeyArmored.trim() === "") {
      return { result: undefined, error: new Error("❌ No private key configured.") };
    }
    const pp = passphrase != null ? passphrase : getPassphrase(settings);
    const privateKey = await decryptPrivateKey(settings, pp);
    const message = await readMessage({ armoredMessage: encryptedText });
    const decryptOptions: DecryptOptions = {
      message,
      decryptionKeys: privateKey
    };
    // Add the public key for signature verification when available
    if (settings.pgpPublicKeyArmored && settings.pgpPublicKeyArmored.trim() !== "") {
      try {
        decryptOptions.verificationKeys = await readKey({ armoredKey: settings.pgpPublicKeyArmored });
      } catch (e) {
        // Ignore verification key errors; decryption can still proceed
      }
    }
    const decrypted = await decrypt(decryptOptions);
    const plainText = decrypted.data as unknown as string;
    // Surface signature status as non-fatal extra info (matches native convention)
    let extraInfo = "";
    if (decrypted.signatures && decrypted.signatures.length > 0) {
      try {
        await decrypted.signatures[0].verified;
        extraInfo = "✅ Signature verified";
      } catch (e) {
        extraInfo = "⚠️ Signature could not be verified";
      }
    }
    return { result: plainText, error: extraInfo ? new Error(extraInfo) : undefined };
  } catch (ex: any) {
    return { result: undefined, error: new Error("❌ Decryption failed: " + (ex.message || ex)) };
  }
}
