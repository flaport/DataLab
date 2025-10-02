"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FileIcon, Search, X, ChevronLeft, ChevronRight } from "lucide-react";

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

export default function DataPage() {
    const [uploads, setUploads] = useState<Upload[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(100);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [uploadsRes, tagsRes] = await Promise.all([
                fetch("http://localhost:8080/api/uploads"),
                fetch("http://localhost:8080/api/tags"),
            ]);

            if (uploadsRes.ok) {
                const uploadsData = await uploadsRes.json();
                setUploads(uploadsData);
            }
            if (tagsRes.ok) {
                const tagsData = await tagsRes.json();
                setTags(tagsData);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Fuzzy search function (simple case-insensitive substring match)
    const fuzzyMatch = (text: string, query: string): boolean => {
        if (!query) return true;
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        return lowerText.includes(lowerQuery);
    };

    // Filter uploads
    const filteredUploads = useMemo(() => {
        return uploads.filter((upload) => {
            // Filename filter
            if (searchQuery && !fuzzyMatch(upload.original_filename, searchQuery)) {
                return false;
            }

            // Tag filter (upload must have ALL selected tags)
            if (selectedTags.length > 0) {
                const uploadTagIds = upload.tags.map((t) => t.id);
                const hasAllTags = selectedTags.every((tagId) =>
                    uploadTagIds.includes(tagId),
                );
                if (!hasAllTags) {
                    return false;
                }
            }

            return true;
        });
    }, [uploads, searchQuery, selectedTags]);

    // Pagination
    const totalPages = Math.ceil(filteredUploads.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUploads = filteredUploads.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedTags, itemsPerPage]);

    const toggleTag = (tagId: string) => {
        setSelectedTags((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId],
        );
    };

    const clearFilters = () => {
        setSearchQuery("");
        setSelectedTags([]);
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

    // Highlight matching substring in filename
    const highlightMatch = (text: string, query: string) => {
        if (!query) return text;

        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);

        if (index === -1) return text;

        return (
            <>
                {text.substring(0, index)}
                <mark className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
                    {text.substring(index, index + query.length)}
                </mark>
                {text.substring(index + query.length)}
            </>
        );
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Data</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Browse and filter all uploaded files
                </p>
            </div>

            {/* Filters */}
            <Card className="p-6 mb-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Filters</h2>
                        {(searchQuery || selectedTags.length > 0) && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                                <X className="h-4 w-4 mr-2" />
                                Clear Filters
                            </Button>
                        )}
                    </div>

                    {/* Filename Search */}
                    <div className="space-y-2">
                        <Label htmlFor="search">Search Filename</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="search"
                                placeholder="Type to search files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Tag Filter */}
                    {tags.length > 0 && (
                        <div className="space-y-2">
                            <Label>Filter by Tags</Label>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => {
                                    const isSelected = selectedTags.includes(tag.id);
                                    return (
                                        <div key={tag.id} className="flex items-center gap-2">
                                            <Badge
                                                style={{
                                                    backgroundColor: isSelected
                                                        ? tag.color
                                                        : "transparent",
                                                    color: isSelected ? "white" : tag.color,
                                                    borderColor: tag.color,
                                                }}
                                                className="cursor-pointer border-2 transition-all hover:scale-105"
                                                onClick={() => toggleTag(tag.id)}
                                            >
                                                {tag.name}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                            {selectedTags.length > 0 && (
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Showing files with ALL selected tags
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            {/* Results Summary */}
            <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredUploads.length)}{" "}
                    of {filteredUploads.length} files
                    {filteredUploads.length !== uploads.length && (
                        <span className="ml-1">(filtered from {uploads.length} total)</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="per-page" className="text-sm">
                        Per page:
                    </Label>
                    <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => setItemsPerPage(Number(value))}
                    >
                        <SelectTrigger id="per-page" className="w-24">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="250">250</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Data Table */}
            {loading ? (
                <div className="text-center py-12">
                    <p className="text-slate-600 dark:text-slate-400">Loading files...</p>
                </div>
            ) : paginatedUploads.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-slate-600 dark:text-slate-400">
                        {filteredUploads.length === 0 && uploads.length > 0
                            ? "No files match your filters"
                            : "No files uploaded yet"}
                    </p>
                </div>
            ) : (
                <div className="space-y-1.5">
                    {paginatedUploads.map((upload) => (
                        <Card
                            key={upload.id}
                            className="p-3 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-3">
                                <FileIcon className="h-8 w-8 text-blue-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-3 flex-wrap">
                                        <h3 className="font-medium">
                                            {highlightMatch(upload.original_filename, searchQuery)}
                                        </h3>
                                        <span className="text-sm text-slate-500 whitespace-nowrap">
                                            {formatFileSize(upload.file_size)} •{" "}
                                            {formatDate(upload.created_at)}
                                        </span>
                                        {upload.tags.length > 0 &&
                                            upload.tags.map((tag) => (
                                                <Badge
                                                    key={tag.id}
                                                    style={{ backgroundColor: tag.color }}
                                                    className="text-white text-xs"
                                                >
                                                    {tag.name}
                                                </Badge>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }

                            return (
                                <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(pageNum)}
                                    className="w-10"
                                >
                                    {pageNum}
                                </Button>
                            );
                        })}
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                            <>
                                <span className="px-2">...</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(totalPages)}
                                    className="w-10"
                                >
                                    {totalPages}
                                </Button>
                            </>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
