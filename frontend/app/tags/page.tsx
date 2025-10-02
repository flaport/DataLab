"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TagDialog } from "@/components/tag-dialog";
import { Plus, Trash2, Pencil } from "lucide-react";

interface Tag {
    id: string;
    name: string;
    color: string;
    created_at: string;
    usage_count?: number;
}

const COLORS = [
    "#ef4444", // red
    "#f97316", // orange
    "#f59e0b", // amber
    "#eab308", // yellow
    "#84cc16", // lime
    "#22c55e", // green
    "#10b981", // emerald
    "#14b8a6", // teal
    "#06b6d4", // cyan
    "#0ea5e9", // sky
    "#3b82f6", // blue
    "#6366f1", // indigo
    "#8b5cf6", // violet
    "#a855f7", // purple
    "#d946ef", // fuchsia
    "#ec4899", // pink
];

export default function TagsPage() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
    const [editingTag, setEditingTag] = useState<Tag | undefined>();

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            const [tagsRes, uploadsRes] = await Promise.all([
                fetch("http://localhost:8080/api/tags"),
                fetch("http://localhost:8080/api/uploads"),
            ]);

            if (tagsRes.ok && uploadsRes.ok) {
                const tagsData = await tagsRes.json();
                const uploadsData = await uploadsRes.json();

                // Calculate usage count for each tag
                const tagsWithUsage = tagsData.map((tag: Tag) => {
                    const usage_count = uploadsData.filter((upload: any) =>
                        upload.tags.some((t: any) => t.id === tag.id),
                    ).length;
                    return { ...tag, usage_count };
                });

                setTags(tagsWithUsage);
            }
        } catch (error) {
            console.error("Failed to fetch tags:", error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateDialog = () => {
        setDialogMode("create");
        setEditingTag(undefined);
        setDialogOpen(true);
    };

    const openEditDialog = (tag: Tag) => {
        setDialogMode("edit");
        setEditingTag(tag);
        setDialogOpen(true);
    };

    const deleteTag = async (id: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent triggering edit when clicking delete
        try {
            const response = await fetch(`http://localhost:8080/api/tags/${id}`, {
                method: "DELETE",
            });

            if (response.status === 409) {
                alert(
                    "Cannot delete this tag - it's still being used by uploaded files. Remove it from all files first.",
                );
                return;
            }

            if (response.ok) {
                fetchTags();
            }
        } catch (error) {
            console.error("Failed to delete tag:", error);
        }
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Tags</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Organize your uploads with tags
                    </p>
                </div>

                <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Tag
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <p className="text-slate-600 dark:text-slate-400">Loading tags...</p>
                </div>
            ) : tags.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        No tags yet. Create your first tag to get started!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {tags.map((tag) => {
                        const inUse = (tag.usage_count ?? 0) > 0;
                        return (
                            <div
                                key={tag.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => openEditDialog(tag)}
                            >
                                <div className="flex-1">
                                    <Badge
                                        style={{ backgroundColor: tag.color }}
                                        className="text-white"
                                    >
                                        {tag.name}
                                    </Badge>
                                    {inUse && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            Used by {tag.usage_count} file
                                            {tag.usage_count !== 1 ? "s" : ""}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openEditDialog(tag);
                                        }}
                                        className="h-8 w-8"
                                        title="Edit tag"
                                    >
                                        <Pencil className="h-4 w-4 text-blue-600" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => deleteTag(tag.id, e)}
                                        className="h-8 w-8"
                                        title={
                                            inUse ? "Cannot delete - tag is in use" : "Delete tag"
                                        }
                                        disabled={inUse}
                                    >
                                        <Trash2
                                            className={`h-4 w-4 ${inUse ? "text-slate-300" : "text-red-500"}`}
                                        />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <TagDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                mode={dialogMode}
                tag={editingTag}
                colors={COLORS}
                onSuccess={fetchTags}
            />
        </div>
    );
}
