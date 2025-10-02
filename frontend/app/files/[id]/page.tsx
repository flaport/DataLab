"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/tag-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  FileIcon,
  Calendar,
  HardDrive,
  Tag as TagIcon,
  BarChart3,
  FileText,
  Download,
} from "lucide-react";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface FileLineageInfo {
  source_filename: string;
  function_name: string;
  success: boolean;
}

interface Upload {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
  tags: Tag[];
  lineage?: FileLineageInfo;
}

export default function FileDashboard({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [file, setFile] = useState<Upload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFile();
  }, [params.id]);

  const fetchFile = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/uploads/${params.id}`,
      );
      if (response.ok) {
        const data = await response.json();
        setFile(data);
      } else if (response.status === 404) {
        router.push("/files");
      }
    } catch (error) {
      console.error("Failed to fetch file:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  if (!file) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/files")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Files
        </Button>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <FileIcon className="h-12 w-12 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {file.original_filename}
              </h1>
              <div className="flex flex-wrap gap-2">
                {file.tags.map((tag) => (
                  <TagBadge key={tag.id} tag={tag} />
                ))}
              </div>
            </div>
          </div>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Metadata Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* File Size */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">File Size</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(file.file_size)}
            </div>
            <p className="text-xs text-muted-foreground">
              {file.file_size.toLocaleString()} bytes
            </p>
          </CardContent>
        </Card>

        {/* Upload Date */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uploaded</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(file.created_at).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(file.created_at).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        {/* Tags Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tags</CardTitle>
            <TagIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{file.tags.length}</div>
            <p className="text-xs text-muted-foreground">
              {file.tags.length === 1 ? "tag applied" : "tags applied"}
            </p>
          </CardContent>
        </Card>

        {/* File Type */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">File Type</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {file.mime_type?.split("/")[1]?.toUpperCase() || "UNKNOWN"}
            </div>
            <p className="text-xs text-muted-foreground">
              {file.mime_type || "Unknown type"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detail Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Lineage Card (if file was generated) */}
        {file.lineage && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {file.lineage.success ? (
                  <span className="text-green-600">✓ Generated File</span>
                ) : (
                  <span className="text-red-600">✗ Error Log</span>
                )}
              </CardTitle>
              <CardDescription>
                This file was created by an automated function
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Source File:</span>
                <span className="text-sm text-muted-foreground">
                  {file.lineage.source_filename}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm font-medium">Function:</span>
                <span className="text-sm text-muted-foreground">
                  {file.lineage.function_name}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm font-medium">Status:</span>
                <span
                  className={`text-sm font-medium ${file.lineage.success ? "text-green-600" : "text-red-600"}`}
                >
                  {file.lineage.success ? "Success" : "Failed"}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* File Information */}
        <Card>
          <CardHeader>
            <CardTitle>File Information</CardTitle>
            <CardDescription>Basic metadata about this file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Filename:</span>
              <span className="text-sm text-muted-foreground">
                {file.original_filename}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm font-medium">Stored as:</span>
              <span className="text-sm text-muted-foreground font-mono text-xs">
                {file.filename}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm font-medium">Size:</span>
              <span className="text-sm text-muted-foreground">
                {formatFileSize(file.file_size)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm font-medium">MIME Type:</span>
              <span className="text-sm text-muted-foreground">
                {file.mime_type || "Unknown"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm font-medium">Upload Date:</span>
              <span className="text-sm text-muted-foreground">
                {formatDate(file.created_at)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* File Statistics (Placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
            <CardDescription>Analysis and metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Data Points:</span>
              </div>
              <span className="text-sm text-muted-foreground">Coming soon</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Rows:</span>
              </div>
              <span className="text-sm text-muted-foreground">Coming soon</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Columns:</span>
              </div>
              <span className="text-sm text-muted-foreground">Coming soon</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Preview (Placeholder) */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Content Preview</CardTitle>
          <CardDescription>File content will be displayed here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-slate-400">
            <p>Content preview coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
