import sharp from 'sharp'

/** Anthropic rejects base64 image sources larger than 5 MiB (decoded). */
const ANTHROPIC_IMAGE_MAX_BYTES = 5 * 1024 * 1024
const TARGET_MAX_BYTES = ANTHROPIC_IMAGE_MAX_BYTES - 64 * 1024

/**
 * Downscale and re-encode as JPEG so decoded size stays under Anthropic's limit.
 * Used before Storage upload and again when building Claude messages (older uploads).
 */
export async function fitImageForAnthropic(input: Buffer): Promise<Buffer> {
  let edge = 2560
  let quality = 85

  for (let attempt = 0; attempt < 24; attempt++) {
    const buf = await sharp(input, { failOn: 'none' })
      .rotate()
      .resize({
        width: edge,
        height: edge,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:2:0' })
      .toBuffer()

    if (buf.length <= TARGET_MAX_BYTES) {
      return buf
    }

    if (quality > 52) {
      quality -= 7
    } else {
      edge = Math.max(640, Math.floor(edge * 0.78))
      quality = 82
    }
  }

  throw Object.assign(
    new Error('Could not shrink this photo enough. Try a smaller image or lower resolution.'),
    { status: 400 },
  )
}
