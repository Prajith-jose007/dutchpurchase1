// src/app/api/invoices/[filename]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import mime from 'mime'; // Correct way to import for this library version

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;
  if (!filename) {
    return new NextResponse('Bad request: filename is required', { status: 400 });
  }
  
  try {
    const invoicesDir = path.join(process.cwd(), 'public', 'invoices');
    const filePath = path.join(invoicesDir, decodeURIComponent(filename));

    // Security: Ensure the path is within the intended directory
    if (!path.resolve(filePath).startsWith(path.resolve(invoicesDir))) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const fileBuffer = await fs.readFile(filePath);

    // Determine content type from file extension
    const contentType = mime.getType(filePath) || 'application/octet-stream';
    
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);


    return new NextResponse(fileBuffer, { status: 200, headers });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return new NextResponse('Invoice not found', { status: 404 });
    }
    console.error(`Failed to serve invoice ${filename}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
