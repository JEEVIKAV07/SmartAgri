import { readProductImage } from "@/lib/product-image-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  try {
    const image = await readProductImage(filename);
    if (!image) return Response.json({ error: "Product image not found." }, { status: 404 });

    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": image.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "Product image could not be loaded." }, { status: 500 });
  }
}