const password = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '';
const saltHex = process.env.NEXT_PUBLIC_ENCRYPTION_SALT || '';
const ivHex = process.env.NEXT_PUBLIC_ENCRYPTION_IV || '';

function hexToString(hex: string) {
  return Buffer.from(hex, 'hex').toString('utf8');
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(
    hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  );
}

function strToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function uint8ArrayToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function deriveKey(): Promise<CryptoKey> {
  if (!password || !saltHex) throw new Error('Missing password or salt');

  const saltString = hexToString(saltHex);
  const saltBytes = strToUint8Array(saltString);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    strToUint8Array(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 1000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

  return key;
}

// Helper function to check if encryption should be skipped
const shouldSkipEncryption = () => {
  // PRIMARY: Next.js public environment variable (GUARANTEED to work)
  if (process.env.NEXT_PUBLIC_ENCRYPTION_DISABLED === 'true') {
    return true;
  }

  return false;
};

export async function encrypt(text: string): Promise<string> {
  // Use the guaranteed check
  if (shouldSkipEncryption()) {
    return text;
  }

  try {
    const iv = hexToBytes(ivHex);
    const key = await deriveKey();
    const encodedText = strToUint8Array(text);

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: 128,
      },
      key,
      encodedText,
    );

    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const ciphertextHex = uint8ArrayToHex(encryptedBytes);
    return `${ivHex}:${ciphertextHex}`;
  } catch (error) {
    throw error;
  }
}

export async function decrypt(ciphertext: string): Promise<string> {
  // Use the guaranteed check
  if (shouldSkipEncryption()) {
    return ciphertext;
  }

  try {
    const [ivHexPart, encryptedHex] = ciphertext.split(':');
    const iv = hexToBytes(ivHexPart);
    const encryptedBytes = hexToBytes(encryptedHex);

    const key = await deriveKey();

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: 128,
      },
      key,
      encryptedBytes,
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    throw error;
  }
}
