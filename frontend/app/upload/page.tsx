"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Upload as UploadIcon, X, FileIcon, Trash2 } from "lucide-react";

interface Tag {
    id: string;
    name: string;
    color: string;
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
}

export default function UploadPage() {
    const [uploads, setUploads] = useState<Upload[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        fetchUploads();
        fetchTags();
    }, []);

    const fetchUploads = async () => {
        try {
            const response = await fetch("http://localhost:8080/api/uploads");
            if (response.ok) {
                const data = await response.json();
                setUploads(data);
            }
        } catch (error) {
            console.error("Failed to fetch uploads:", error);
        }
    };

    const fetchTags = async () => {
        try {
            const response = await fetch("http://localhost:8080/api/tags");
            if (response.ok) {
                const data = await response.json();
                setTags(data);
            }
        } catch (error) {
            console.error("Failed to fetch tags:", error);
        }
    };

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
                fetchUploads();
            }
        } catch (error) {
            console.error("Failed to upload file:", error);
        } finally {
            setUploading(false);
        }
    };

    const deleteUpload = async (id: string) => {
        try {
            const response = await fetch(`http://localhost:8080/api/uploads/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                fetchUploads();
            }
        } catch (error) {
            console.error("Failed to delete upload:", error);
        }
    };

    const toggleTag = (tagId: string) => {
        setSelectedTags((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId],
        );
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Upload</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Upload and manage your data files
                </p>
            </div>

            {/* Upload Area */}
            <Card className="p-8 mb-8">
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
                                            <Badge
                                                key={tag.id}
                                                style={{
                                                    backgroundColor: selectedTags.includes(tag.id)
                                                        ? tag.color
                                                        : "transparent",
                                                    color: selectedTags.includes(tag.id)
                                                        ? "white"
                                                        : tag.color,
                                                    borderColor: tag.color,
                                                }}
                                                className="cursor-pointer border-2"
                                                onClick={() => toggleTag(tag.id)}
                                            >
                                                {tag.name}
                                            </Badge>
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
                                <p className="text-lg font-medium mb-2">Drop your file here</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                    or click to browse
                                </p>
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <label htmlFor="file-upload">
                                    <Button asChild>
                                        <span>Select File</span>
                                    </Button>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Uploads List */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Recent Uploads</h2>
                {uploads.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <p className="text-slate-600 dark:text-slate-400">
                            No uploads yet. Upload your first file to get started!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {uploads.map((upload) => (
                            <Card key={upload.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <FileIcon className="h-8 w-8 text-blue-600" />
                                        <div className="flex-1">
                                            <p className="font-medium">{upload.original_filename}</p>
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
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteUpload(upload.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
