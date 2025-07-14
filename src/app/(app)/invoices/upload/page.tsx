
// src/app/(app)/invoices/upload/page.tsx
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { toast } from '@/hooks/use-toast';
import { uploadInvoicesAction } from '@/lib/actions';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function InvoiceUploadPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Protect the route
    if (currentUser && !['purchase', 'admin', 'superadmin'].includes(currentUser.role)) {
      toast({ title: "Access Denied", description: "You don't have permission to upload invoices.", variant: "destructive" });
      router.push('/');
    }
  }, [currentUser, router]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    multiple: true,
  });

  const removeFile = (fileName: string) => {
    setFiles(files.filter(file => file.name !== fileName));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({ title: "No files selected", description: "Please select files to upload.", variant: "destructive" });
      return;
    }
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "Please log in again.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('invoices', file);
    });
    formData.append('userId', currentUser.id);

    try {
      const result = await uploadInvoicesAction(formData);
      if (result.success) {
        toast({ title: "Upload Successful", description: `${result.fileCount} invoices have been submitted.` });
        setFiles([]);
      } else {
        toast({ title: "Upload Failed", description: result.error || "An unknown error occurred.", variant: "destructive" });
      }
    } catch (error) {
       toast({ title: "Upload Error", description: "Could not connect to the server.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  if (!currentUser || !['purchase', 'admin', 'superadmin'].includes(currentUser.role)) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-lg">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-headline tracking-tight">Upload Invoices</h1>
        <p className="text-muted-foreground">Submit invoices for processing by the purchase department.</p>
      </header>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Invoice Submission</CardTitle>
          <CardDescription>Drag & drop files here or click to select files.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/70'}`}>
            <input {...getInputProps()} />
            <Icons.Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
            {isDragActive ? (
              <p className="font-semibold text-primary">Drop the files here ...</p>
            ) : (
              <p className="text-muted-foreground">Drag 'n' drop some files here, or click to select files</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">Supported formats: PDF, JPG, JPEG, PNG</p>
          </div>

          {files.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-2">Selected Files ({files.length})</h3>
              <Separator className="mb-4" />
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {files.map(file => (
                  <div key={file.name + file.lastModified} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Icons.File className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium truncate max-w-xs">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                     <Badge variant="outline" className="hidden sm:inline-flex">{file.type}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => removeFile(file.name)} disabled={isUploading}>
                      <Icons.Delete className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={handleUpload} disabled={isUploading || files.length === 0} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {isUploading ? (
                <>
                  <Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Icons.UploadCloud className="mr-2 h-4 w-4" />
                  Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Add necessary icons if they don't exist
Icons.Upload = Icons.Upload || Icons.UploadCloud;
Icons.File = Icons.File || Icons.FileText;
