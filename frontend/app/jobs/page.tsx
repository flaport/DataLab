"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2,
    XCircle,
    Clock,
    Play,
    FileIcon,
    Code,
    ArrowRight,
} from "lucide-react";

interface Job {
    id: string;
    upload_id: string;
    function_id: string;
    status: string;
    error_message: string | null;
    output_upload_ids: string[];
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
    upload_filename?: string;
    function_name?: string;
}

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJobs();
        // Refresh every 2 seconds to show live updates
        const interval = setInterval(fetchJobs, 2000);
        return () => clearInterval(interval);
    }, []);

    const fetchJobs = async () => {
        try {
            const response = await fetch("http://localhost:8080/api/jobs");
            if (response.ok) {
                const data = await response.json();
                setJobs(data);
            }
        } catch (error) {
            console.error("Failed to fetch jobs:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "SUBMITTED":
                return (
                    <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                    >
                        <Clock className="mr-1 h-3 w-3" />
                        Submitted
                    </Badge>
                );
            case "RUNNING":
                return (
                    <Badge
                        variant="outline"
                        className="bg-yellow-50 text-yellow-700 border-yellow-200"
                    >
                        <Play className="mr-1 h-3 w-3" />
                        Running
                    </Badge>
                );
            case "SUCCESS":
                return (
                    <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                    >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Success
                    </Badge>
                );
            case "FAILED":
                return (
                    <Badge
                        variant="outline"
                        className="bg-red-50 text-red-700 border-red-200"
                    >
                        <XCircle className="mr-1 h-3 w-3" />
                        Failed
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatDuration = (started: string | null, completed: string | null) => {
        if (!started) return "-";
        if (!completed) {
            const start = new Date(started).getTime();
            const now = Date.now();
            const seconds = Math.floor((now - start) / 1000);
            return `${seconds}s (running)`;
        }
        const start = new Date(started).getTime();
        const end = new Date(completed).getTime();
        const seconds = Math.floor((end - start) / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m ${seconds % 60}s`;
    };

    const getStatusCounts = () => {
        return {
            submitted: jobs.filter((j) => j.status === "SUBMITTED").length,
            running: jobs.filter((j) => j.status === "RUNNING").length,
            success: jobs.filter((j) => j.status === "SUCCESS").length,
            failed: jobs.filter((j) => j.status === "FAILED").length,
        };
    };

    const counts = getStatusCounts();

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Jobs</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Monitor function execution status
                </p>
            </div>

            {/* Status Summary */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Submitted</p>
                            <p className="text-2xl font-bold">{counts.submitted}</p>
                        </div>
                        <Clock className="h-8 w-8 text-blue-500" />
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Running</p>
                            <p className="text-2xl font-bold">{counts.running}</p>
                        </div>
                        <Play className="h-8 w-8 text-yellow-500" />
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Successful</p>
                            <p className="text-2xl font-bold">{counts.success}</p>
                        </div>
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Failed</p>
                            <p className="text-2xl font-bold">{counts.failed}</p>
                        </div>
                        <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                </Card>
            </div>

            {/* Jobs List */}
            {loading ? (
                <div className="text-center py-12">
                    <p className="text-slate-600 dark:text-slate-400">Loading jobs...</p>
                </div>
            ) : jobs.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-slate-600 dark:text-slate-400">
                        No jobs yet. Functions will run automatically when files match their
                        input tags.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {jobs.map((job) => (
                        <Card key={job.id} className="p-4">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 mt-1">
                                    {getStatusBadge(job.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <FileIcon className="h-4 w-4 text-blue-600" />
                                        <span className="font-medium">
                                            {job.upload_filename || "Unknown file"}
                                        </span>
                                        <ArrowRight className="h-4 w-4 text-slate-400" />
                                        <Code className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm text-slate-600">
                                            {job.function_name || "Unknown function"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-600">
                                        <span>
                                            Created: {new Date(job.created_at).toLocaleString()}
                                        </span>
                                        {job.started_at && (
                                            <span>
                                                Duration:{" "}
                                                {formatDuration(job.started_at, job.completed_at)}
                                            </span>
                                        )}
                                        {job.output_upload_ids.length > 0 && (
                                            <span>
                                                Outputs: {job.output_upload_ids.length} file
                                                {job.output_upload_ids.length !== 1 ? "s" : ""}
                                            </span>
                                        )}
                                    </div>
                                    {job.error_message && (
                                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-sm">
                                            <p className="text-red-800 dark:text-red-200 font-mono text-xs">
                                                {job.error_message}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
