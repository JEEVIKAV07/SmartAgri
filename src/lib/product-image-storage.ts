import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const imageDirectory = path.join(process.cwd(), ".data", "product-images");
const filenamePattern = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
const contentTypes = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export type ProductImageExtension = keyof typeof contentTypes;

export async function saveProductImage(bytes: Uint8Array, extension: ProductImageExtension) {
  const filename = `${randomUUID()}.${extension}`;
  await mkdir(imageDirectory, { recursive: true });
  await writeFile(path.join(imageDirectory, filename), bytes, { flag: "wx" });
  return { filename, imageUrl: `/api/product-images/${filename}` };
}

export async function readProductImage(filename: string) {
  if (!filenamePattern.test(filename)) return null;

  try {
    const bytes = await readFile(path.join(imageDirectory, filename));
    const extension = filename.split(".").at(-1) as ProductImageExtension;
    return { bytes, contentType: contentTypes[extension] };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}