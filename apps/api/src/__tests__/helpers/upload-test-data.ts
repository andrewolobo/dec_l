/**
 * Upload Test Helpers
 * Helper functions for creating mock files and buffers for upload tests
 */

/**
 * Create a mock Express.Multer.File object
 */
export function createMockFile(
  overrides?: Partial<Express.Multer.File>
): Express.Multer.File {
  return {
    fieldname: "image",
    originalname: "test-image.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: 1024 * 100, // 100KB
    buffer: createMockJpegBuffer(),
    destination: "",
    filename: "",
    path: "",
    stream: {} as any,
    ...overrides,
  };
}

/**
 * Create a minimal valid JPEG buffer
 * JPEG magic numbers: FF D8 FF
 */
export function createMockJpegBuffer(): Buffer {
  const jpegHeader = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, // JPEG magic numbers + APP0
    0x00, 0x10, // APP0 length
    0x4a, 0x46, 0x49, 0x46, 0x00, // JFIF identifier
    0x01, 0x01, // JFIF version
    0x00, // Density units
    0x00, 0x01, // X density
    0x00, 0x01, // Y density
    0x00, 0x00, // Thumbnail dimensions
  ]);

  // Add some fake image data
  const fakeData = Buffer.alloc(100, 0xff);

  // JPEG end marker
  const jpegEnd = Buffer.from([0xff, 0xd9]);

  return Buffer.concat([jpegHeader, fakeData, jpegEnd]);
}

/**
 * Create a minimal valid PNG buffer
 * PNG magic numbers: 89 50 4E 47 0D 0A 1A 0A
 */
export function createMockPngBuffer(): Buffer {
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, // PNG signature
    0x0d, 0x0a, 0x1a, 0x0a, // PNG signature continued
    0x00, 0x00, 0x00, 0x0d, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR chunk type
    0x00, 0x00, 0x00, 0x01, // Width: 1
    0x00, 0x00, 0x00, 0x01, // Height: 1
    0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, etc.
  ]);

  // Add some fake data and IEND chunk
  const fakeData = Buffer.alloc(50, 0x00);
  const iendChunk = Buffer.from([
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4e, 0x44, // IEND chunk type
    0xae, 0x42, 0x60, 0x82, // IEND CRC
  ]);

  return Buffer.concat([pngHeader, fakeData, iendChunk]);
}

/**
 * Create a minimal valid WebP buffer
 * WebP magic: RIFF....WEBP
 */
export function createMockWebpBuffer(): Buffer {
  const webpHeader = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x64, 0x00, 0x00, 0x00, // File size (100 bytes)
    0x57, 0x45, 0x42, 0x50, // WEBP
    0x56, 0x50, 0x38, 0x4c, // VP8L chunk
    0x58, 0x00, 0x00, 0x00, // Chunk size
  ]);

  // Add some fake data
  const fakeData = Buffer.alloc(100, 0x00);

  return Buffer.concat([webpHeader, fakeData]);
}

/**
 * Create an invalid file buffer (doesn't match any image format)
 */
export function createInvalidFileBuffer(): Buffer {
  return Buffer.from("This is not a valid image file");
}

/**
 * Create a large file buffer exceeding size limit
 */
export function createLargeFileBuffer(sizeInMB: number = 6): Buffer {
  return Buffer.alloc(sizeInMB * 1024 * 1024, 0xff);
}

/**
 * Create multiple mock files for batch upload testing
 */
export function createMockFiles(count: number): Express.Multer.File[] {
  return Array.from({ length: count }, (_, i) =>
    createMockFile({
      originalname: `test-image-${i + 1}.jpg`,
      size: 1024 * (50 + i * 10), // Varying sizes
    })
  );
}
