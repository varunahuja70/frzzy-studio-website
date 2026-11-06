import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifyMediaToken } from '@/lib/media-crypto';
import { getMediaEntry } from '@/lib/media-manifest';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    const payload = verifyMediaToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Forbidden: Invalid or expired media access token' },
        { status: 403 }
      );
    }

    // Hotlink protection: check Referer / Host when present
    const referer = req.headers.get('referer');
    const host = req.headers.get('host');
    if (referer && host && !referer.includes(host)) {
      return NextResponse.json(
        { error: 'Forbidden: Hotlink protection violation' },
        { status: 403 }
      );
    }

    const media = getMediaEntry(payload.slot);
    if (!media || !media.active) {
      return NextResponse.json(
        { error: 'Not Found: Media entry unavailable' },
        { status: 404 }
      );
    }

    // Resolve path securely inside public/
    const publicDir = path.resolve(process.cwd(), 'public');
    const fullPath = path.resolve(publicDir, media.filePath);

    // Prevent directory traversal attacks
    if (!fullPath.startsWith(publicDir)) {
      return NextResponse.json(
        { error: 'Forbidden: Path traversal detected' },
        { status: 403 }
      );
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'Not Found: Media file does not exist' },
        { status: 404 }
      );
    }

    const stat = fs.statSync(fullPath);
    const fileSize = stat.size;
    const rangeHeader = req.headers.get('range');

    const commonHeaders: Record<string, string> = {
      'Content-Type': media.mimeType,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=600, no-transform',
      'Cross-Origin-Resource-Policy': 'same-origin',
    };

    if (rangeHeader) {
      // Parse Range header (e.g. "bytes=0-1048575")
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || (parts[1] && end >= fileSize)) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(fullPath, { start, end });

      // Convert Node readable stream to Web ReadableStream
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new NextResponse(webStream as unknown as BodyInit, {
        status: 206,
        headers: {
          ...commonHeaders,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': chunkSize.toString(),
        },
      });
    }

    // Full file stream for normal requests
    const fileStream = fs.createReadStream(fullPath);
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(webStream as unknown as BodyInit, {
      status: 200,
      headers: {
        ...commonHeaders,
        'Content-Length': fileSize.toString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
