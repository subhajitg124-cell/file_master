import { z } from "zod";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

// ── Magic byte signatures ────────────────────────────────────────────────────

const MAGIC: Record<string, { offset: number; bytes: number[] }[]> = {
  "application/pdf": [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  "image/jpeg": [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  "image/png": [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }],
  "image/gif": [
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  "image/webp": [{ offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }],
  "video/mp4": [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }], // ftyp
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }, // ZIP (docx/xlsx/pptx)
  ],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
  ],
};

/**
 * Check whether a buffer's magic bytes match the claimed MIME type.
 * Returns true if the MIME type has no registered signature (text files, CSV, etc.)
 */
export function matchesMagicBytes(buffer: Buffer, mimetype: string): boolean {
  const signatures = MAGIC[mimetype];
  if (!signatures) return true; // No magic check for this type (e.g. text/*)

  return signatures.some(({ offset, bytes }) =>
    bytes.every((b, i) => buffer[offset + i] === b),
  );
}

// ── Zod schemas ──────────────────────────────────────────────────────────────

export const PDFFileSchema = z.object({
  mimetype: z.literal("application/pdf"),
  size: z.number().max(MAX_SIZE, "File exceeds 25 MB limit"),
});

export const ImageFileSchema = z.object({
  mimetype: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  size: z.number().max(MAX_SIZE, "File exceeds 25 MB limit"),
});

export const AnyFileSchema = z.object({
  mimetype: z.string().min(1),
  size: z.number().max(MAX_SIZE, "File exceeds 25 MB limit"),
});

export type ValidatedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

/**
 * Validate a multer file against a Zod schema AND magic bytes.
 * Throws a descriptive error string on failure.
 */
export function validateFile(
  file: Express.Multer.File,
  schema: typeof PDFFileSchema | typeof ImageFileSchema | typeof AnyFileSchema,
): ValidatedFile {
  const result = schema.safeParse({ mimetype: file.mimetype, size: file.size });

  if (!result.success) {
    const msg = result.error.issues.map((i: { message: string }) => i.message).join("; ");
    throw new Error(`Invalid file: ${msg}`);
  }

  if (!matchesMagicBytes(file.buffer, file.mimetype)) {
    throw new Error(
      `File content does not match declared type "${file.mimetype}". ` +
        "The file may be renamed or corrupted.",
    );
  }

  return {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer,
  };
}
