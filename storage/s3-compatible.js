// S3-compatible storage driver (AWS S3, Cloudflare R2, MinIO, Backblaze B2, etc.)
// Requires @aws-sdk/client-s3 package

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Get S3 configuration from environment variables
const S3_CONFIG = {
  endpoint: process.env.S3_ENDPOINT || '',
  region: process.env.S3_REGION || 'us-east-1',
  accessKeyId: process.env.S3_ACCESS_KEY || '',
  secretAccessKey: process.env.S3_SECRET_KEY || '',
  bucket: process.env.S3_BUCKET || ''
};

// Validate S3 configuration
if (!S3_CONFIG.endpoint || !S3_CONFIG.bucket) {
  throw new Error('S3 endpoint and bucket are required for S3 storage');
}

// Create S3 client
const client = new S3Client({
  endpoint: S3_CONFIG.endpoint,
  region: S3_CONFIG.region,
  credentials: {
    accessKeyId: S3_CONFIG.accessKeyId,
    secretAccessKey: S3_CONFIG.secretAccessKey
  }
});

module.exports = {
  // Put file to S3 (returns storage key)
  async put(storageKey, fileBuffer) {
    await PutObjectCommand.send({
      Client: client,
      Bucket: S3_CONFIG.bucket,
      Key: storageKey,
      Body: fileBuffer,
      ContentType: fileBuffer.type
    });
    return storageKey;
  },
  
  // Get file from S3 (returns Buffer)
  async get(storageKey) {
    return GetObjectCommand.send({
      Client: client,
      Bucket: S3_CONFIG.bucket,
      Key: storageKey
    }).then(response => response.Body);
  },
  
  // Get file URL for browser (signed URL or public URL)
  url(storageKey) {
    // For signed URLs, use the S3 URL directly
    return `https://${S3_CONFIG.bucket}.${S3_CONFIG.endpoint}${storageKey}`;
  },
  
  // Delete file from S3
  async delete(storageKey) {
    await DeleteObjectCommand.send({
      Client: client,
      Bucket: S3_CONFIG.bucket,
      Key: storageKey
    });
  }
};
