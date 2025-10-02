"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TagBadge } from "@/components/tag-badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileCard } from "@/components/file-card";
import { UploadDialog } from "@/components/upload-dialog";
import { Search, X, ChevronLeft, ChevronRight, Upload } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface FileLineageInfo {
  source_upload_id: string;
  source_filename: string;
  function_id: string;
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

export default function DataPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [uploads, setUploads] = useState<Upload[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1"),
  );
  const [itemsPerPage, setItemsPerPage] = useState(
    parseInt(searchParams.get("per_page") || "100"),
  );

  // Tag editing
  const [editingUpload, setEditingUpload] = useState<Upload | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Upload
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Initialize selected tags from URL after tags are loaded
  useEffect(() => {
    const tagNamesFromUrl =
      searchParams.get("tags")?.split("~").filter(Boolean) || [];
    if (tagNamesFromUrl.length > 0 && tags.length > 0) {
      const tagIds = tags
        .filter((tag) => tagNamesFromUrl.includes(tag.name))
        .map((tag) => tag.id);
      setSelectedTags(tagIds);
    }
  }, [tags, searchParams]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (searchQuery) params.set("q", searchQuery);

    // Use tag names with ~ separator (URL-safe, no encoding needed)
    if (selectedTags.length > 0) {
      const tagNames = tags
        .filter((tag) => selectedTags.includes(tag.id))
        .map((tag) => tag.name)
        .join("~");
      if (tagNames) params.set("tags", tagNames);
    }

    if (currentPage !== 1) params.set("page", currentPage.toString());
    if (itemsPerPage !== 100) params.set("per_page", itemsPerPage.toString());

    const newUrl = params.toString() ? `?${params.toString()}` : "/files";
    router.replace(newUrl, { scroll: false });
  }, [searchQuery, selectedTags, currentPage, itemsPerPage, router, tags]);

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

  const deleteUpload = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/uploads/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to delete upload:", error);
    }
  };

  const openEditDialog = (upload: Upload) => {
    setEditingUpload(upload);
    setEditDialogOpen(true);
  };

  const toggleTagForUpload = async (tagId: string) => {
    if (!editingUpload) return;

    const hasTag = editingUpload.tags.some((t) => t.id === tagId);

    try {
      if (hasTag) {
        // Remove tag
        const response = await fetch(
          `http://localhost:8080/api/uploads/${editingUpload.id}/tags/${tagId}`,
          { method: "DELETE" },
        );
        if (response.ok) {
          setEditingUpload({
            ...editingUpload,
            tags: editingUpload.tags.filter((t) => t.id !== tagId),
          });
          fetchData();
        }
      } else {
        // Add tag
        const response = await fetch(
          `http://localhost:8080/api/uploads/${editingUpload.id}/tags`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([tagId]),
          },
        );
        if (response.ok) {
          const tag = tags.find((t) => t.id === tagId);
          if (tag) {
            setEditingUpload({
              ...editingUpload,
              tags: [...editingUpload.tags, tag],
            });
            fetchData();
          }
        }
      }
    } catch (error) {
      console.error("Failed to update tags:", error);
    }
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Files</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Browse and filter all uploaded files
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)} size="lg">
          <Upload className="mr-2 h-4 w-4" />
          Upload File
        </Button>
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
                {tags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    selected={selectedTags.includes(tag.id)}
                    onClick={() => toggleTag(tag.id)}
                  />
                ))}
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
        <div className="space-y-2">
          {paginatedUploads.map((upload) => (
            <FileCard
              key={upload.id}
              upload={upload}
              onEditTags={openEditDialog}
              onDelete={deleteUpload}
              highlightedFilename={highlightMatch(
                upload.original_filename,
                searchQuery,
              )}
              clickable={true}
            />
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

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        tags={tags}
        onSuccess={fetchData}
      />

      {/* Edit Tags Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
            <DialogDescription>
              {editingUpload?.original_filename}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {tags.length === 0 ? (
              <p className="text-center text-slate-600 dark:text-slate-400 py-8">
                No tags available. Create tags in the Tags page first.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium mb-3">
                  Click tags to add or remove them:
                </p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <TagBadge
                      key={tag.id}
                      tag={tag}
                      selected={editingUpload?.tags.some(
                        (t) => t.id === tag.id,
                      )}
                      onClick={() => toggleTagForUpload(tag.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
