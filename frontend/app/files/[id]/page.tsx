"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/tag-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
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
  Code,
  ArrowRight,
  Play,
} from "lucide-react";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface FileLineageInfo {
  source_upload_id: string;
  source_filename: string;
  function_id: string;
  function_name: string;
  success: boolean;
}

interface DerivedFile {
  output_upload_id: string;
  output_filename: string;
  function_id: string;
  function_name: string;
  success: boolean;
  created_at: string;
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

interface Function {
  id: string;
  name: string;
  enabled: boolean;
  input_tags: Tag[];
  output_tags: Tag[];
}

export default function FileDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = useState<Upload | null>(null);
  const [derivedFiles, setDerivedFiles] = useState<DerivedFile[]>([]);
  const [availableFunctions, setAvailableFunctions] = useState<Function[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFile();
    fetchDerivedFiles();
    fetchAvailableFunctions();
  }, [id]);

  const fetchFile = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/uploads/${id}`);
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

  const fetchDerivedFiles = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/uploads/${id}/derived`,
      );
      if (response.ok) {
        const data = await response.json();
        setDerivedFiles(data);
      }
    } catch (error) {
      console.error("Failed to fetch derived files:", error);
    }
  };

  const fetchAvailableFunctions = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/functions");
      if (response.ok) {
        const data = await response.json();
        setAvailableFunctions(data);
      }
    } catch (error) {
      console.error("Failed to fetch functions:", error);
    }
  };

  const triggerFunction = async (functionId: string, functionName: string) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/uploads/${id}/trigger/${functionId}`,
        { method: "POST" },
      );

      if (response.ok) {
        toast({
          title: "Function triggered",
          description: `${functionName} is now running on this file.`,
        });
        // Refresh derived files after a delay to show new outputs
        setTimeout(fetchDerivedFiles, 2000);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to trigger function",
          description: "Please try again.",
        });
      }
    } catch (error) {
      console.error("Failed to trigger function:", error);
      toast({
        variant: "destructive",
        title: "Network error",
        description: "Please check your connection.",
      });
    }
  };

  // Filter functions that can run on this file (have all required input tags)
  const applicableFunctions = file
    ? availableFunctions.filter((func) => {
      const fileTagIds = file.tags.map((t) => t.id);
      return func.input_tags.every((inputTag) =>
        fileTagIds.includes(inputTag.id),
      );
    })
    : [];

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
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Play className="mr-2 h-4 w-4" />
                  Run Function
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Available Functions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {applicableFunctions.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No applicable functions for this file
                  </div>
                ) : (
                  applicableFunctions.map((func) => (
                    <DropdownMenuItem
                      key={func.id}
                      onClick={() => triggerFunction(func.id, func.name)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{func.name}</span>
                        {!func.enabled && (
                          <span className="text-xs text-yellow-600 dark:text-yellow-500">
                            (auto-disabled)
                          </span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Lineage Banner (if file was generated) */}
      {file.lineage && (
        <div className="mb-4 p-3 border rounded-md bg-muted/50">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            {file.lineage.success ? (
              <span className="text-green-600 font-medium">
                ✓ Generated from
              </span>
            ) : (
              <span className="text-red-600 font-medium">✗ Error log from</span>
            )}
            <Button
              variant="link"
              className="p-0 h-auto font-medium text-sm"
              onClick={() =>
                router.push(`/files/${file.lineage!.source_upload_id}`)
              }
            >
              <FileIcon className="mr-1 h-4 w-4" />
              {file.lineage.source_filename}
            </Button>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Code className="h-4 w-4 text-muted-foreground" />
            <span>via</span>
            <Button
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={() =>
                router.push(`/functions/${file.lineage!.function_id}`)
              }
            >
              {file.lineage.function_name}
            </Button>
          </div>
        </div>
      )}

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

      {/* Derived Files (if any) */}
      {derivedFiles.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Derived Files</CardTitle>
            <CardDescription>
              Files created from this source file by automated functions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {derivedFiles.map((derived) => (
                <div
                  key={derived.output_upload_id}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() =>
                    router.push(`/files/${derived.output_upload_id}`)
                  }
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileIcon className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium">{derived.output_filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(derived.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {derived.success ? (
                      <span className="text-xs text-green-600">✓ Success</span>
                    ) : (
                      <span className="text-xs text-red-600">✗ Failed</span>
                    )}
                    <Button
                      variant="link"
                      className="p-0 h-auto text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/functions/${derived.function_id}`);
                      }}
                    >
                      <Code className="mr-1 h-3 w-3" />
                      {derived.function_name}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
