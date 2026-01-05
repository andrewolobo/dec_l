import { BlobServiceClient } from "@azure/storage-blob";

export const azureConfig = {
  // Blob Storage Configuration
  blobStorageAccount: "declutterimg",
  containerName: "images",
  baseUrl: process.env.BLOB_URL || "",
  sasToken: process.env.SAS_TOKEN || "",
  storageAccountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || "",

  // SAS Token Configuration for Dynamic Generation
  sas: {
    defaultExpiryMinutes: 60,      // Standard API responses (1 hour)
    shortExpiryMinutes: 15,        // Sensitive content (15 minutes)
    longExpiryMinutes: 1440,       // Special cases (24 hours)
  },

  // Upload Configuration
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB (matches frontend)
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: ["jpg", "jpeg", "png", "webp"],

    // Retry configuration for transient failures
    maxRetries: 3,
    retryDelayMs: [0, 1000, 2000, 4000], // Exponential backoff

    // Batch upload configuration
    maxFilesPerBatch: 10,

    // Cleanup configuration
    enableAutoCleanup: true,
    orphanedBlobCleanupAgeMs: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Initialize Blob Service Client
  createBlobServiceClient: () => {
    const blobUrl = `https://${azureConfig.blobStorageAccount}.blob.core.windows.net`;
    return new BlobServiceClient(`${blobUrl}?${azureConfig.sasToken}`);
  },

  // Get container client
  getContainerClient: () => {
    const blobServiceClient = azureConfig.createBlobServiceClient();
    return blobServiceClient.getContainerClient(azureConfig.containerName);
  },
};
