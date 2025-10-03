"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TagBadge } from "@/components/tag-badge";
import { useToast } from "@/hooks/use-toast";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Tag {
    id: string;
    name: string;
    color: string;
}

interface Function {
    id: string;
    name: string;
    script_filename: string;
    enabled: boolean;
    function_type: string;
    created_at: string;
    input_tags: Tag[];
    output_tags: Tag[];
    script_content?: string;
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

export default function EditFunctionPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const { theme, systemTheme } = useTheme();
    const { toast } = useToast();
    const [mounted, setMounted] = useState(false);
    const [tags, setTags] = useState<Tag[]>([]);
    const [func, setFunc] = useState<Function | null>(null);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState("");
    const [scriptContent, setScriptContent] = useState(DEFAULT_SCRIPT);
    const [selectedInputTags, setSelectedInputTags] = useState<string[]>([]);
    const [selectedOutputTags, setSelectedOutputTags] = useState<string[]>([]);
    const [functionType, setFunctionType] = useState("transform");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [funcRes, tagsRes] = await Promise.all([
                fetch(`http://localhost:8080/api/functions/${id}`),
                fetch("http://localhost:8080/api/tags"),
            ]);

            if (funcRes.ok) {
                const funcData = await funcRes.json();
                setFunc(funcData);
                setName(funcData.name);
                setScriptContent(funcData.script_content || DEFAULT_SCRIPT);
                setSelectedInputTags(funcData.input_tags.map((t: Tag) => t.id));
                setSelectedOutputTags(funcData.output_tags.map((t: Tag) => t.id));
                setFunctionType(funcData.function_type || "transform");
            } else if (funcRes.status === 404) {
                router.push("/functions");
                return;
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
            const response = await fetch(
                `http://localhost:8080/api/functions/${id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        script_content: scriptContent,
                        input_tag_ids: selectedInputTags,
                        output_tag_ids: selectedOutputTags,
                        function_type: functionType,
                    }),
                },
            );

            if (response.ok) {
                router.push("/functions");
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

    const handleDelete = async () => {
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
                router.push("/functions");
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

    if (loading) {
        return (
            <div className="container mx-auto py-8 px-4">
                <p className="text-center">Loading...</p>
            </div>
        );
    }

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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Edit Function</h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Update the function script and tag configuration
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {func && (
                            <div className="flex items-center gap-2">
                                <Label>{func.enabled ? "Enabled" : "Disabled"}</Label>
                                <Switch
                                    checked={func.enabled}
                                    onCheckedChange={async (checked) => {
                                        try {
                                            const response = await fetch(
                                                `http://localhost:8080/api/functions/${id}`,
                                                {
                                                    method: "PUT",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ enabled: checked }),
                                                },
                                            );

                                            if (response.ok) {
                                                fetchData();
                                                toast({
                                                    title: checked
                                                        ? "Function enabled"
                                                        : "Function disabled",
                                                    description:
                                                        "The function has been updated successfully.",
                                                });
                                            } else if (response.status === 409) {
                                                toast({
                                                    variant: "destructive",
                                                    title: "Cannot enable function",
                                                    description:
                                                        "This would create a circular dependency. Disable conflicting functions first.",
                                                });
                                            } else {
                                                toast({
                                                    variant: "destructive",
                                                    title: "Failed to toggle function",
                                                    description: "Please try again.",
                                                });
                                            }
                                        } catch (error) {
                                            console.error("Failed to toggle:", error);
                                            toast({
                                                variant: "destructive",
                                                title: "Network error",
                                                description:
                                                    "Please check your connection and try again.",
                                            });
                                        }
                                    }}
                                />
                            </div>
                        )}
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete Function
                        </Button>
                    </div>
                </div>
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
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
