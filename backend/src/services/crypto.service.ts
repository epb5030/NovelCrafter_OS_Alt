import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export class CryptoService {
  private static masterKey: Buffer | null = null;

  /**
   * Initializes or retrieves the 256-bit master encryption key
   */
  private static getMasterKey(): Buffer {
    if (this.masterKey) return this.masterKey;

    // 1. Check environment variable
    const envSecret = process.env.ENCRYPTION_SECRET;
    if (envSecret) {
      this.masterKey = crypto.createHash('sha256').update(envSecret).digest();
      return this.masterKey;
    }

    // 2. Persistent machine key file inside data directory
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const keyFilePath = path.join(dataDir, '.secret_key');
    if (fs.existsSync(keyFilePath)) {
      const hexKey = fs.readFileSync(keyFilePath, 'utf-8').trim();
      this.masterKey = Buffer.from(hexKey, 'hex');
    } else {
      const newKey = crypto.randomBytes(32);
      fs.writeFileSync(keyFilePath, newKey.toString('hex'), { encoding: 'utf-8', mode: 0o600 });
      this.masterKey = newKey;
    }

    return this.masterKey;
  }

  /**
   * Encrypts plain text using AES-256-GCM
   */
  public static encrypt(text: string): string {
    if (!text) return '';
    if (text.startsWith('enc:v1:')) return text; // Already encrypted

    const key = this.getMasterKey();
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `enc:v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts encrypted cipher text (or returns plain text if unencrypted)
   */
  public static decrypt(cipherText: string): string {
    if (!cipherText || !cipherText.startsWith('enc:v1:')) {
      return cipherText; // Return plain text legacy value as-is
    }

    try {
      const parts = cipherText.split(':');
      if (parts.length !== 5) return cipherText;

      const iv = Buffer.from(parts[2], 'hex');
      const authTag = Buffer.from(parts[3], 'hex');
      const encryptedText = parts[4];
      const key = this.getMasterKey();

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedText, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');
      return decrypted;
    } catch (err) {
      console.error('Failed to decrypt setting value:', err);
      return '';
    }
  }
}
