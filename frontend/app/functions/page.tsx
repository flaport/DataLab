"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TagBadge } from "@/components/tag-badge";
import { Plus, Code, ArrowRight, Pencil } from "lucide-react";

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
    const router = useRouter();
    const [functions, setFunctions] = useState<Function[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFunctions();
    }, []);

    const fetchFunctions = async () => {
        try {
            const response = await fetch("http://localhost:8080/api/functions");
            if (response.ok) {
                const data = await response.json();
                setFunctions(data);
            }
        } catch (error) {
            console.error("Failed to fetch functions:", error);
        } finally {
            setLoading(false);
        }
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
                <Button onClick={() => router.push("/functions/new")}>
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
                    <Button onClick={() => router.push("/functions/new")}>
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
                            onClick={() => router.push(`/functions/${func.id}`)}
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
                                                    <TagBadge key={tag.id} tag={tag} />
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
                                                        <TagBadge key={tag.id} tag={tag} />
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
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/functions/${func.id}`);
                                    }}
                                    className="h-8 w-8"
                                    title="Edit function"
                                >
                                    <Pencil className="h-4 w-4 text-blue-600" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
