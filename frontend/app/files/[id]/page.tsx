"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/tag-badge";
import { FileViewer } from "@/components/file-viewer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  function_type: string;
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
  const [allFunctions, setAllFunctions] = useState<Function[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDerivedFilesModal, setShowDerivedFilesModal] = useState(false);

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
        setAllFunctions(data);
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

  // Helper function to determine if a file can be visualized
  const isVisualizableFile = (filename: string) => {
    const extension = filename.toLowerCase().split(".").pop() || "";
    const visualizableExtensions = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "svg",
      "bmp", // images
      "csv",
      "parquet", // data
      "txt",
      "log",
      "md",
      "py",
      "js",
      "ts",
      "json",
      "xml",
      "html",
      "css", // text
    ];
    return visualizableExtensions.includes(extension);
  };

  // Helper function to download a file
  const downloadFile = (fileId: string, filename: string) => {
    const link = document.createElement("a");
    link.href = `http://localhost:8080/api/uploads/${fileId}/download`;
    link.download = filename;
    link.click();
  };

  // Helper function to check if a derived file should be visualized
  const shouldVisualizeDerivation = (derived: DerivedFile) => {
    if (!derived.success) return false;
    if (!isVisualizableFile(derived.output_filename)) return false;

    // Find the function that created this derived file
    const func = allFunctions.find((f) => f.id === derived.function_id);
    if (!func) return false;

    // Only visualize if it's a transformation function (not format conversion)
    return func.function_type === "transform";
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
              <div className="flex flex-wrap gap-2 mb-3">
                {file.tags.map((tag) => (
                  <TagBadge key={tag.id} tag={tag} />
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <HardDrive className="h-4 w-4" />
                  <span>{formatFileSize(file.file_size)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(file.created_at)}</span>
                </div>
                {derivedFiles.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => setShowDerivedFilesModal(true)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    {derivedFiles.length} derived file
                    {derivedFiles.length !== 1 ? "s" : ""}
                  </Button>
                )}
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
            <Button
              onClick={() => downloadFile(file.id, file.original_filename)}
            >
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

      {/* Content Preview (first card if file can be visualized) */}
      {isVisualizableFile(file.original_filename) && (
        <div className="mb-8">
          <FileViewer
            fileId={file.id}
            filename={file.original_filename}
            mimeType={file.mime_type}
            fileSize={file.file_size}
            showDownloadButton={false}
          />
        </div>
      )}

      {/* Derived File Visualizations */}
      {derivedFiles
        .filter((derived) => shouldVisualizeDerivation(derived))
        .map((derived) => {
          return (
            <div key={`viz-${derived.output_upload_id}`} className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">
                  {derived.output_filename}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  Generated by {derived.function_name}
                </Badge>
              </div>
              <FileViewer
                fileId={derived.output_upload_id}
                filename={derived.output_filename}
                mimeType={null}
                fileSize={0} // We don't have size info for derived files
                showDownloadButton={false}
              />
            </div>
          );
        })}

      {/* Derived Files Modal */}
      <Dialog
        open={showDerivedFilesModal}
        onOpenChange={setShowDerivedFilesModal}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Derived Files</DialogTitle>
            <DialogDescription>
              Files created from this source file by automated functions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Derived Files List */}
            <div className="space-y-2">
              {derivedFiles.map((derived) => (
                <div
                  key={derived.output_upload_id}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setShowDerivedFilesModal(false);
                    router.push(`/files/${derived.output_upload_id}`);
                  }}
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
                        setShowDerivedFilesModal(false);
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
