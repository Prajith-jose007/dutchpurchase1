
// src/app/api/invoices/[filename]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import mime from 'mime';

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const { filename } = params;
  if (!filename) {
    return new NextResponse('Bad request: filename is required', { status: 400 });
  }
  
  try {
    // URL-decode the filename to handle spaces and special characters correctly.
    const decodedFilename = decodeURIComponent(filename);
    const invoicesDir = path.join(process.cwd(), 'public', 'invoices');
    const filePath = path.join(invoicesDir, decodedFilename);

    // Security: Ensure the resolved path is still within the intended directory.
    if (!path.resolve(filePath).startsWith(path.resolve(invoicesDir))) {
      return new NextResponse('Forbidden: Access to this file is not allowed.', { status: 403 });
    }

    const fileBuffer = await fs.readFile(filePath);

    // Determine content type from file extension using the correctly imported function.
    const contentType = mime.getType(filePath) || 'application/octet-stream';
    
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    // Use the decoded filename for the Content-Disposition header.
    headers.set('Content-Disposition', `inline; filename="${decodedFilename}"`);

    return new NextResponse(fileBuffer, { status: 200, headers });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error(`Invoice not found at path: ${path.join(process.cwd(), 'public', 'invoices', decodeURIComponent(filename))}`);
      return new NextResponse('Invoice not found', { status: 404 });
    }
    console.error(`Failed to serve invoice ${filename}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

    