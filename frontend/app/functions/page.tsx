"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Code, ArrowRight, Pencil } from "lucide-react";

interface Tag {
    id: string;
    name: string;
    color: string;
}

interface Function {
    id: string;
    name: string;
    script_filename: string;
    created_at: string;
    input_tags: Tag[];
    output_tags: Tag[];
}

const DEFAULT_SCRIPT = `# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

import os

# Get the source file path from environment
source_path = os.environ["SOURCE_PATH"]
output_dir = os.environ["OUTPUT_DIR"]

# Process the file
# ...

# Write output files to output_dir
# Example: 
# with open(f"{output_dir}/result.txt", "w") as f:
#     f.write("processed data")
`;

export default function FunctionsPage() {
    const [functions, setFunctions] = useState<Function[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
    const [editingFunction, setEditingFunction] = useState<
        Function | undefined
    >();

    // Form state
    const [name, setName] = useState("");
    const [scriptContent, setScriptContent] = useState(DEFAULT_SCRIPT);
    const [selectedInputTags, setSelectedInputTags] = useState<string[]>([]);
    const [selectedOutputTags, setSelectedOutputTags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [functionsRes, tagsRes] = await Promise.all([
                fetch("http://localhost:8080/api/functions"),
                fetch("http://localhost:8080/api/tags"),
            ]);

            if (functionsRes.ok) {
                const data = await functionsRes.json();
                setFunctions(data);
            }
            if (tagsRes.ok) {
                const data = await tagsRes.json();
                setTags(data);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateDialog = () => {
        setDialogMode("create");
        setEditingFunction(undefined);
        setName("");
        setScriptContent(DEFAULT_SCRIPT);
        setSelectedInputTags([]);
        setSelectedOutputTags([]);
        setError(null);
        setDialogOpen(true);
    };

    const openEditDialog = async (func: Function) => {
        setDialogMode("edit");
        setEditingFunction(func);
        setName(func.name);
        setSelectedInputTags(func.input_tags.map((t) => t.id));
        setSelectedOutputTags(func.output_tags.map((t) => t.id));
        setError(null);

        // Fetch script content
        try {
            const response = await fetch(
                `http://localhost:8080/api/functions/${func.id}`,
            );
            if (response.ok) {
                const data = await response.json();
                // Use fetched script content or fall back to template
                setScriptContent(data.script_content || DEFAULT_SCRIPT);
            } else {
                setScriptContent(DEFAULT_SCRIPT);
            }
        } catch (error) {
            console.error("Failed to fetch function:", error);
            setScriptContent(DEFAULT_SCRIPT);
        }

        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setError("Function name is required");
            return;
        }
        if (selectedInputTags.length === 0) {
            setError("At least one input tag is required");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const url =
                dialogMode === "create"
                    ? "http://localhost:8080/api/functions"
                    : `http://localhost:8080/api/functions/${editingFunction?.id}`;
            const method = dialogMode === "create" ? "POST" : "PUT";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    script_content: scriptContent,
                    input_tag_ids: selectedInputTags,
                    output_tag_ids: selectedOutputTags,
                }),
            });

            if (response.ok) {
                setDialogOpen(false);
                fetchData();
            } else if (response.status === 409) {
                setError("A function with this name already exists");
            } else {
                setError("Failed to save function");
            }
        } catch (error) {
            console.error("Failed to save function:", error);
            setError("Network error");
        } finally {
            setSaving(false);
        }
    };

    const deleteFunction = async (id: string, event: React.MouseEvent) => {
        event.stopPropagation();

        if (!confirm("Are you sure you want to delete this function?")) {
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:8080/api/functions/${id}`,
                {
                    method: "DELETE",
                },
            );

            if (response.ok) {
                fetchData();
            }
        } catch (error) {
            console.error("Failed to delete function:", error);
        }
    };

    const toggleInputTag = (tagId: string) => {
        setSelectedInputTags((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId],
        );
    };

    const toggleOutputTag = (tagId: string) => {
        setSelectedOutputTags((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId],
        );
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Functions</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Automate file transformations with Python scripts
                    </p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Function
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <p className="text-slate-600 dark:text-slate-400">
                        Loading functions...
                    </p>
                </div>
            ) : functions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Code className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        No functions yet. Create your first function to automate file
                        processing!
                    </p>
                    <Button onClick={openCreateDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Function
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {functions.map((func) => (
                        <Card
                            key={func.id}
                            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => openEditDialog(func)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Code className="h-6 w-6 text-blue-600" />
                                        <h3 className="font-semibold text-lg">{func.name}</h3>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                Input:
                                            </span>
                                            <div className="flex flex-wrap gap-1">
                                                {func.input_tags.map((tag) => (
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
                                        <ArrowRight className="h-4 w-4 text-slate-400" />
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                Output:
                                            </span>
                                            <div className="flex flex-wrap gap-1">
                                                {func.output_tags.length > 0 ? (
                                                    func.output_tags.map((tag) => (
                                                        <Badge
                                                            key={tag.id}
                                                            style={{ backgroundColor: tag.color }}
                                                            className="text-white text-xs"
                                                        >
                                                            {tag.name}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">
                                                        No tags
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openEditDialog(func);
                                        }}
                                        title="Edit function"
                                    >
                                        <Pencil className="h-4 w-4 text-blue-600" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => deleteFunction(func.id, e)}
                                        title="Delete function"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Function Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {dialogMode === "create" ? "Create Function" : "Edit Function"}
                        </DialogTitle>
                        <DialogDescription>
                            {dialogMode === "create"
                                ? "Create a Python script to automatically process files"
                                : "Update the function script and tag configuration"}
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4 py-4">
                        {/* Function Name */}
                        <div className="space-y-2">
                            <Label htmlFor="function-name">Function Name</Label>
                            <Input
                                id="function-name"
                                placeholder="e.g., CSV to JSON Converter"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        {/* Input Tags */}
                        <div className="space-y-2">
                            <Label>Input Tags (required)</Label>
                            <p className="text-sm text-slate-500">
                                Function runs when files have ALL these tags
                            </p>
                            <div className="flex flex-wrap gap-2 p-4 border rounded-md min-h-[60px]">
                                {tags.length === 0 ? (
                                    <p className="text-sm text-slate-400">
                                        No tags available. Create tags first.
                                    </p>
                                ) : (
                                    tags.map((tag) => {
                                        const isSelected = selectedInputTags.includes(tag.id);
                                        return (
                                            <Badge
                                                key={tag.id}
                                                style={{
                                                    backgroundColor: isSelected
                                                        ? tag.color
                                                        : "transparent",
                                                    color: isSelected ? "white" : tag.color,
                                                    borderColor: tag.color,
                                                }}
                                                className="cursor-pointer border-2 transition-all hover:scale-105"
                                                onClick={() => toggleInputTag(tag.id)}
                                            >
                                                {tag.name}
                                            </Badge>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Output Tags */}
                        <div className="space-y-2">
                            <Label>Output Tags (optional)</Label>
                            <p className="text-sm text-slate-500">
                                Tags applied to output files (extension tags added
                                automatically)
                            </p>
                            <div className="flex flex-wrap gap-2 p-4 border rounded-md min-h-[60px]">
                                {tags.length === 0 ? (
                                    <p className="text-sm text-slate-400">
                                        No tags available. Create tags first.
                                    </p>
                                ) : (
                                    tags.map((tag) => {
                                        const isSelected = selectedOutputTags.includes(tag.id);
                                        return (
                                            <Badge
                                                key={tag.id}
                                                style={{
                                                    backgroundColor: isSelected
                                                        ? tag.color
                                                        : "transparent",
                                                    color: isSelected ? "white" : tag.color,
                                                    borderColor: tag.color,
                                                }}
                                                className="cursor-pointer border-2 transition-all hover:scale-105"
                                                onClick={() => toggleOutputTag(tag.id)}
                                            >
                                                {tag.name}
                                            </Badge>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Script Content */}
                        <div className="space-y-2">
                            <Label htmlFor="script-content">Python Script</Label>
                            <p className="text-sm text-slate-500">
                                Use PEP 723 inline metadata. Access source file via SOURCE_PATH
                                env var.
                            </p>
                            <Textarea
                                id="script-content"
                                value={scriptContent}
                                onChange={(e) => setScriptContent(e.target.value)}
                                className="font-mono text-sm min-h-[300px]"
                                placeholder={DEFAULT_SCRIPT}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={
                                saving || !name.trim() || selectedInputTags.length === 0
                            }
                        >
                            {saving
                                ? "Saving..."
                                : dialogMode === "create"
                                    ? "Create Function"
                                    : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
