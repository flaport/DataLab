"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/tag-badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Tag {
    id: string;
    name: string;
    color: string;
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

export default function NewFunctionPage() {
    const router = useRouter();
    const { theme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [tags, setTags] = useState<Tag[]>([]);
    const [name, setName] = useState("");
    const [scriptContent, setScriptContent] = useState(DEFAULT_SCRIPT);
    const [selectedInputTags, setSelectedInputTags] = useState<string[]>([]);
    const [selectedOutputTags, setSelectedOutputTags] = useState<string[]>([]);
    const [functionType, setFunctionType] = useState("transform");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
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
        }
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
            const response = await fetch("http://localhost:8080/api/functions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    script_content: scriptContent,
                    input_tag_ids: selectedInputTags,
                    output_tag_ids: selectedOutputTags,
                    function_type: functionType,
                }),
            });

            if (response.ok) {
                router.push("/functions");
            } else if (response.status === 409) {
                setError("A function with this name already exists");
            } else {
                setError("Failed to create function");
            }
        } catch (error) {
            console.error("Failed to create function:", error);
            setError("Network error");
        } finally {
            setSaving(false);
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
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="mb-8">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/functions")}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Functions
                </Button>
                <h1 className="text-3xl font-bold">Create Function</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Create a Python script to automatically process files
                </p>
            </div>

            {error && (
                <div className="mb-6 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
            )}

            <div className="space-y-6">
                {/* Configuration Card - Name and Tags in one row */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle>Configuration</CardTitle>
                        <CardDescription>
                            Define the function name and tag filters
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Function Name */}
                            <div className="space-y-2">
                                <Label>Function Name *</Label>
                                <Input
                                    placeholder="e.g., CSV to JSON Converter"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            {/* Function Type */}
                            <div className="space-y-2">
                                <Label>Function Type *</Label>
                                <Select value={functionType} onValueChange={setFunctionType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select function type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="transform">
                                            Transform - Changes data content
                                        </SelectItem>
                                        <SelectItem value="convert">
                                            Convert - Changes file format only
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-500">
                                    Transform functions show output visualizations, convert
                                    functions don't
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Input Tags */}
                            <div className="space-y-2">
                                <Label>Input Tags *</Label>
                                <p className="text-xs text-slate-500">
                                    Runs when files have ALL these tags
                                </p>
                                <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[48px]">
                                    {tags.length === 0 ? (
                                        <p className="text-sm text-slate-400">No tags available</p>
                                    ) : (
                                        tags.map((tag) => (
                                            <TagBadge
                                                key={tag.id}
                                                tag={tag}
                                                selected={selectedInputTags.includes(tag.id)}
                                                onClick={() => toggleInputTag(tag.id)}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Output Tags */}
                            <div className="space-y-2">
                                <Label>Output Tags</Label>
                                <p className="text-xs text-slate-500">
                                    Applied to outputs (+ extension tags)
                                </p>
                                <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[48px]">
                                    {tags.length === 0 ? (
                                        <p className="text-sm text-slate-400">No tags available</p>
                                    ) : (
                                        tags.map((tag) => (
                                            <TagBadge
                                                key={tag.id}
                                                tag={tag}
                                                selected={selectedOutputTags.includes(tag.id)}
                                                onClick={() => toggleOutputTag(tag.id)}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Script Content */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle>Python Script</CardTitle>
                        <CardDescription>
                            Use PEP 723 inline metadata. Access source file via SOURCE_PATH
                            env var.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="border rounded-md overflow-hidden">
                            {mounted && (
                                <Editor
                                    height="400px"
                                    defaultLanguage="python"
                                    value={scriptContent}
                                    onChange={(value) => setScriptContent(value || "")}
                                    theme={
                                        (theme === "system" ? systemTheme : theme) === "dark"
                                            ? "vs-dark"
                                            : "light"
                                    }
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 13,
                                        lineNumbers: "on",
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                        tabSize: 4,
                                    }}
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={() => router.push("/functions")}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !name.trim() || selectedInputTags.length === 0}
                    >
                        {saving ? "Creating..." : "Create Function"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
