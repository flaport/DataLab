"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileIcon, Trash2, Tag as TagIcon } from "lucide-react";

interface Tag {
    id: string;
    name: string;
    color: string;
}

interface Upload {
    id: string;
    original_filename: string;
    file_size: number;
    created_at: string;
    tags: Tag[];
}

interface FileCardProps {
    upload: Upload;
    onEditTags?: (upload: Upload) => void;
    onDelete?: (id: string) => void;
    highlightedFilename?: React.ReactNode;
}

export function FileCard({
    upload,
    onEditTags,
    onDelete,
    highlightedFilename,
}: FileCardProps) {
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    return (
        <Card className="p-4">
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
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {upload.tags.map((tag) => (
                            <Badge
                                key={tag.id}
                                style={{ backgroundColor: tag.color }}
                                className="text-white"
                            >
                                {tag.name}
                            </Badge>
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
