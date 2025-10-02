"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

interface Tag {
    id: string;
    name: string;
    color: string;
    created_at: string;
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
    const [newTagName, setNewTagName] = useState("");
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            const response = await fetch("http://localhost:8080/api/tags");
            if (response.ok) {
                const data = await response.json();
                setTags(data);
            }
        } catch (error) {
            console.error("Failed to fetch tags:", error);
        } finally {
            setLoading(false);
        }
    };

    const createTag = async () => {
        if (!newTagName.trim()) return;

        try {
            const response = await fetch("http://localhost:8080/api/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newTagName, color: selectedColor }),
            });

            if (response.ok) {
                setNewTagName("");
                setSelectedColor(COLORS[0]);
                setDialogOpen(false);
                fetchTags();
            }
        } catch (error) {
            console.error("Failed to create tag:", error);
        }
    };

    const deleteTag = async (id: string) => {
        try {
            const response = await fetch(`http://localhost:8080/api/tags/${id}`, {
                method: "DELETE",
            });

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

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Tag
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Tag</DialogTitle>
                            <DialogDescription>
                                Add a new tag to organize your uploads
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Tag Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Important, Research, Draft"
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && createTag()}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Color</Label>
                                <div className="grid grid-cols-8 gap-2">
                                    {COLORS.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`h-8 w-8 rounded-md transition-all ${selectedColor === color
                                                    ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-slate-100"
                                                    : ""
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={createTag}>Create Tag</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                    {tags.map((tag) => (
                        <div
                            key={tag.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                        >
                            <Badge
                                style={{ backgroundColor: tag.color }}
                                className="text-white"
                            >
                                {tag.name}
                            </Badge>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteTag(tag.id)}
                                className="h-8 w-8"
                            >
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
