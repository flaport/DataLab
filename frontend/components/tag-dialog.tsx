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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Tag {
    id: string;
    name: string;
    color: string;
}

interface TagDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: "create" | "edit";
    tag?: Tag;
    colors: string[];
    onSuccess: () => void;
}

export function TagDialog({
    open,
    onOpenChange,
    mode,
    tag,
    colors,
    onSuccess,
}: TagDialogProps) {
    const [name, setName] = useState("");
    const [selectedColor, setSelectedColor] = useState(colors[0]);
    const [saving, setSaving] = useState(false);

    const isExtensionTag = tag?.name.startsWith(".");

    // Reset form when dialog opens/closes or tag changes
    useEffect(() => {
        if (open) {
            if (mode === "edit" && tag) {
                setName(tag.name);
                setSelectedColor(tag.color);
            } else {
                setName("");
                setSelectedColor(colors[0]);
            }
        }
    }, [open, mode, tag, colors]);

    const handleSave = async () => {
        if (!name.trim()) return;

        setSaving(true);
        try {
            const url =
                mode === "create"
                    ? "http://localhost:8080/api/tags"
                    : `http://localhost:8080/api/tags/${tag?.id}`;
            const method = mode === "create" ? "POST" : "PUT";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, color: selectedColor }),
            });

            if (response.ok) {
                onOpenChange(false);
                onSuccess();
            }
        } catch (error) {
            console.error(`Failed to ${mode} tag:`, error);
        } finally {
            setSaving(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {mode === "create" ? "Create New Tag" : "Edit Tag"}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "create"
                            ? "Add a new tag to organize your uploads"
                            : isExtensionTag
                                ? "Extension tags cannot be renamed, but you can change their color"
                                : "Update the tag name and color"}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="tag-name">Tag Name</Label>
                        <Input
                            id="tag-name"
                            placeholder="e.g., Important, Research, Draft"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyPress={handleKeyPress}
                            autoFocus
                            disabled={mode === "edit" && isExtensionTag}
                        />
                        {mode === "edit" && isExtensionTag && (
                            <p className="text-xs text-slate-500">
                                Extension tags are auto-generated from file types
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="grid grid-cols-8 gap-2">
                            {colors.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    className={`h-8 w-8 rounded-md transition-all ${selectedColor === color
                                        ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-slate-100"
                                        : ""
                                        }`}
                                    style={{ backgroundColor: color }}
                                    type="button"
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !name.trim()}>
                        {saving
                            ? "Saving..."
                            : mode === "create"
                                ? "Create Tag"
                                : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
