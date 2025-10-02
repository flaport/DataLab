"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TagBadge } from "@/components/tag-badge";
import { FileIcon, Trash2, Tag as TagIcon } from "lucide-react";
import { useRouter } from "next/navigation";

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
  original_filename: string;
  file_size: number;
  created_at: string;
  tags: Tag[];
  lineage?: FileLineageInfo;
}

interface FileCardProps {
  upload: Upload;
  onEditTags?: (upload: Upload) => void;
  onDelete?: (id: string) => void;
  highlightedFilename?: React.ReactNode;
  clickable?: boolean;
}

export function FileCard({
  upload,
  onEditTags,
  onDelete,
  highlightedFilename,
  clickable = false,
}: FileCardProps) {
  const router = useRouter();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    if (clickable) {
      router.push(`/files/${upload.id}`);
    }
  };

  return (
    <Card
      className={`p-4 ${clickable ? "cursor-pointer hover:shadow-lg transition-shadow" : ""}`}
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <FileIcon className="h-8 w-8 text-blue-600" />
          <div className="flex-1">
            <p className="font-medium">
              {highlightedFilename || upload.original_filename}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {formatFileSize(upload.file_size)} •{" "}
              {new Date(upload.created_at).toLocaleDateString()}
            </p>
            {upload.lineage && (
              <p className="text-xs text-slate-500 mt-1">
                {upload.lineage.success ? "✓" : "✗"} From{" "}
                <span className="font-medium">
                  {upload.lineage.source_filename}
                </span>{" "}
                via {upload.lineage.function_name}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {upload.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        </div>
        {(onEditTags || onDelete) && (
          <div className="flex gap-2">
            {onEditTags && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEditTags(upload)}
                title="Manage tags"
              >
                <TagIcon className="h-4 w-4 text-blue-600" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(upload.id)}
                title="Delete upload"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
