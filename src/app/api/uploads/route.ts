import { requireRole } from "@/lib/auth";
import { saveProductImage } from "@/lib/product-image-storage";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const imageFormats = [
  {
    contentType: "image/jpeg",
    extension: "jpg",
    matches: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    contentType: "image/png",
    extension: "png",
    matches: (bytes: Uint8Array) => bytes.subarray(0, 8).join(",") === "137,80,78,71,13,10,26,10",
  },
  {
    contentType: "image/webp",
    extension: "webp",
    matches: (bytes: Uint8Array) =>
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50,
  },
] as const;

export async function POST(request: Request) {
  const { response } = await requireRole("FARMER");
  if (response) return response;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMAGE_SIZE + 64 * 1024) {
    return Response.json({ error: "Choose an image smaller than 5 MB." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Upload a valid product image." }, { status: 400 });
  }

  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return Response.json({ error: "Select a product image to upload." }, { status: 400 });
  }
  if (image.size > MAX_IMAGE_SIZE) {
    return Response.json({ error: "Choose an image smaller than 5 MB." }, { status: 413 });
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  const format = imageFormats.find(({ contentType, matches }) =>
    image.type === contentType && matches(bytes),
  );
  if (!format) {
    return Response.json({ error: "Use a valid JPEG, PNG, or WebP image." }, { status: 415 });
  }

  try {
    const savedImage = await saveProductImage(bytes, format.extension);
    return Response.json({ imageUrl: savedImage.imageUrl }, { status: 201 });
  } catch {
    return Response.json({ error: "The product image could not be saved. Try again." }, { status: 500 });
  }
}
