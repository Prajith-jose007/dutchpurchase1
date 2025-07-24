// src/app/api/invoices/[filename]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getType } from 'mime';

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;
  if (!filename) {
    return new NextResponse('Bad request: filename is required', { status: 400 });
  }
  
  try {
    // Use path.resolve for a more robust path construction
    const invoicesDir = path.resolve(process.cwd(), 'public', 'invoices');
    const filePath = path.join(invoicesDir, decodeURIComponent(filename));

    // Security: Ensure the path is within the intended directory
    if (!path.resolve(filePath).startsWith(invoicesDir)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const fileBuffer = await fs.readFile(filePath);

    // Determine content type from file extension
    const contentType = getType(filePath) || 'application/octet-stream';
    
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    // Add Content-Disposition to give the browser more info on how to handle the file
    headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);


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
