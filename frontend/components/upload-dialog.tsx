"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/tag-badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Upload as UploadIcon, X, FileIcon } from "lucide-react";

interface Tag {
    id: string;
    name: string;
    color: string;
}

interface UploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tags: Tag[];
    onSuccess: () => void;
}

export function UploadDialog({
    open,
    onOpenChange,
    tags,
    onSuccess,
}: UploadDialogProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const toggleTag = (tagId: string) => {
        setSelectedTags((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId],
        );
    };

    const uploadFile = async () => {
        if (!selectedFile) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("tags", JSON.stringify(selectedTags));

        try {
            const response = await fetch("http://localhost:8080/api/uploads", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                setSelectedFile(null);
                setSelectedTags([]);
                onOpenChange(false);
                onSuccess();
            }
        } catch (error) {
            console.error("Failed to upload file:", error);
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            // Reset state when closing
            setSelectedFile(null);
            setSelectedTags([]);
            setDragActive(false);
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Upload File</DialogTitle>
                    <DialogDescription>
                        Upload a file and optionally tag it for organization
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${dragActive
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                                : "border-slate-300 dark:border-slate-700"
                            }`}
                    >
                        {selectedFile ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center gap-3">
                                    <FileIcon className="h-8 w-8 text-blue-600" />
                                    <div className="text-left">
                                        <p className="font-medium">{selectedFile.name}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            {formatFileSize(selectedFile.size)}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSelectedFile(null)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                {tags.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-left">Add Tags:</p>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {tags.map((tag) => (
                                                <TagBadge
                                                    key={tag.id}
                                                    tag={tag}
                                                    selected={selectedTags.includes(tag.id)}
                                                    onClick={() => toggleTag(tag.id)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Button onClick={uploadFile} disabled={uploading} size="lg">
                                    {uploading ? "Uploading..." : "Upload File"}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <div>
                                    <p className="text-lg font-medium mb-2">
                                        Drop your file here
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                        or click to browse
                                    </p>
                                    <input
                                        type="file"
                                        id="file-upload-dialog"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                    <label htmlFor="file-upload-dialog">
                                        <Button asChild>
                                            <span>Select File</span>
                                        </Button>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
