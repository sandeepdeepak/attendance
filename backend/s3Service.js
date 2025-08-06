// s3Service.js
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env file if not already loaded
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const envLines = envContent.split("\n");

    envLines.forEach((line) => {
      // Skip comments and empty lines
      if (line.startsWith("#") || !line.trim()) return;

      // Parse key=value pairs
      const [key, ...valueParts] = line.split("=");
      const value = valueParts.join("=").trim();

      if (key && value) {
        process.env[key.trim()] = value;
      }
    });
  }
} catch (error) {
  console.error("Error loading .env file:", error);
}

// Initialize S3 client
const region = process.env.AWS_REGION || "us-east-1";
const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Default bucket name
const BUCKET_NAME = process.env.S3_BUCKET_NAME || "gym-owner-logos";

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} fileName - The name to give the file in S3
 * @param {string} contentType - The MIME type of the file
 * @returns {Promise<string>} - The URL of the uploaded file
 */
async function uploadFileToS3(fileBuffer, fileName, contentType) {
  try {
    // Create a unique file name to avoid collisions
    const uniqueFileName = `${Date.now()}-${fileName}`;

    // Set up the S3 upload parameters
    const params = {
      Bucket: BUCKET_NAME,
      Key: uniqueFileName,
      Body: fileBuffer,
      ContentType: contentType,
      // ACL parameter removed as newer buckets have ACLs disabled by default
    };

    // Upload the file to S3
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Return the URL of the uploaded file
    // Use the virtual-hosted style URL format which is more widely compatible
    return `https://s3.${region}.amazonaws.com/${BUCKET_NAME}/${uniqueFileName}`;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
}

/**
 * Generate a pre-signed URL for an S3 object
 * @param {string} key - The key of the S3 object
 * @param {number} expiresIn - The number of seconds until the URL expires
 * @returns {Promise<string>} - The pre-signed URL
 */
async function getPresignedUrl(key, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    throw error;
  }
}

module.exports = {
  uploadFileToS3,
  getPresignedUrl,
};
