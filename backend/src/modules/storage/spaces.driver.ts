import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  StorageClass,
  StorageDriver,
  assertSafeStorageKey,
} from './storage-driver.interface';
import { getSpacesConfig } from '../../config/storage.config';

/**
 * DigitalOcean Spaces (S3-compatible) storage.
 *
 * For platforms with NO persistent volume — DO App Platform in particular,
 * where the container filesystem is wiped on every deploy. Without this, an
 * App Platform deploy silently destroys every KYC document on release.
 *
 * THE SECURITY-CRITICAL PART: public and secure objects get different ACLs.
 * Public objects are written `public-read` so the CDN can serve them straight
 * to browsers. Secure objects are written with NO ACL, so they inherit the
 * bucket's private default and are unreachable without signed credentials —
 * they come back only through the authenticated `/files/secure/:filename`
 * endpoint, which streams them via `get()` after decrypting. If you ever find
 * yourself adding `ACL: 'public-read'` to the secure path, stop: that publishes
 * payslips and bank statements to anyone holding the URL.
 *
 * Note the encryption boundary sits ABOVE this class. Secure bytes arrive
 * already AES-256-GCM encrypted by FilesService, so Spaces only ever holds
 * ciphertext for sensitive documents — a bucket misconfiguration leaks
 * unreadable blobs rather than documents.
 */
@Injectable()
export class SpacesStorageDriver implements StorageDriver {
  readonly name = 'spaces';
  private readonly logger = new Logger(SpacesStorageDriver.name);
  private client?: S3Client;

  private get cfg() {
    return getSpacesConfig();
  }

  /** Lazy so a filesystem-configured boot never needs Spaces credentials. */
  private s3(): S3Client {
    if (!this.client) {
      const { bucket, accessKeyId, secretAccessKey, region, endpoint } = this.cfg;
      if (!bucket || !accessKeyId || !secretAccessKey) {
        // Fail loudly. Object storage that silently does nothing looks like a
        // working upload right up until someone needs the file back.
        throw new ServiceUnavailableException(
          'Object storage is not configured (SPACES_BUCKET / SPACES_KEY / SPACES_SECRET missing).',
        );
      }
      this.client = new S3Client({
        region,
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        // Spaces uses path-style addressing for most SDK operations.
        forcePathStyle: false,
      });
    }
    return this.client;
  }

  private fullKey(key: string, storageClass: StorageClass): string {
    assertSafeStorageKey(key);
    const { publicPrefix, securePrefix } = this.cfg;
    return `${storageClass === 'secure' ? securePrefix : publicPrefix}/${key}`;
  }

  async put(
    key: string,
    body: Buffer,
    opts: { storageClass: StorageClass; contentType?: string },
  ): Promise<string> {
    const isSecure = opts.storageClass === 'secure';
    await this.s3().send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: this.fullKey(key, opts.storageClass),
        Body: body,
        ContentType: opts.contentType,
        // PUBLIC ONLY. Secure objects deliberately carry no ACL so they stay
        // private — see the class doc before changing this line.
        ...(isSecure ? {} : { ACL: 'public-read' as const }),
        ...(isSecure ? { CacheControl: 'private, no-store' } : {}),
      }),
    );

    // Secure objects keep the app-relative URL on BOTH drivers so the auth
    // endpoint stays the only way in and existing DB rows keep resolving.
    return isSecure
      ? `/files/secure/${key}`
      : `${this.cfg.publicBaseUrl}/${this.cfg.publicPrefix}/${key}`;
  }

  async get(key: string, storageClass: StorageClass): Promise<Buffer> {
    try {
      const res = await this.s3().send(
        new GetObjectCommand({
          Bucket: this.cfg.bucket,
          Key: this.fullKey(key, storageClass),
        }),
      );
      const bytes = await res.Body?.transformToByteArray();
      if (!bytes) throw new NotFoundException('File not found');
      return Buffer.from(bytes);
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      const name = (e as any)?.name;
      if (name === 'NoSuchKey' || name === 'NotFound') {
        throw new NotFoundException('File not found');
      }
      this.logger.error(`Spaces get failed for ${key}: ${(e as Error).message}`);
      throw new ServiceUnavailableException('Storage read failed');
    }
  }

  async delete(key: string, storageClass: StorageClass): Promise<void> {
    try {
      await this.s3().send(
        new DeleteObjectCommand({
          Bucket: this.cfg.bucket,
          Key: this.fullKey(key, storageClass),
        }),
      );
    } catch (e) {
      // Best-effort, matching the filesystem driver: account erasure and the
      // orphan sweeps must keep going past one bad object.
      this.logger.warn(`Spaces delete failed for ${key}: ${(e as Error).message}`);
    }
  }

  async exists(key: string, storageClass: StorageClass): Promise<boolean> {
    try {
      await this.s3().send(
        new HeadObjectCommand({
          Bucket: this.cfg.bucket,
          Key: this.fullKey(key, storageClass),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Paginated — a bucket can hold far more than one ListObjectsV2 page. */
  async list(storageClass: StorageClass): Promise<string[]> {
    const prefix =
      storageClass === 'secure' ? this.cfg.securePrefix : this.cfg.publicPrefix;
    const out: string[] = [];
    let token: string | undefined;
    do {
      const res = await this.s3().send(
        new ListObjectsV2Command({
          Bucket: this.cfg.bucket,
          Prefix: `${prefix}/`,
          ContinuationToken: token,
        }),
      );
      for (const o of res.Contents ?? []) {
        if (o.Key) out.push(o.Key.slice(prefix.length + 1));
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return out;
  }
}
