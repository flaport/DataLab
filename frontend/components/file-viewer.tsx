"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Search,
    FileText,
    Image as ImageIcon,
    AlertCircle,
    ZoomIn,
    ZoomOut,
    RotateCw,
} from "lucide-react";

interface FileViewerProps {
    fileId: string;
    filename: string;
    mimeType?: string | null;
    fileSize: number;
    showDownloadButton?: boolean;
}

interface TableData {
    headers: string[];
    rows: string[][];
    totalRows: number;
    totalColumns: number;
    fileType: string;
}

export function FileViewer({
    fileId,
    filename,
    mimeType,
    fileSize,
    showDownloadButton = true,
}: FileViewerProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [tableData, setTableData] = useState<TableData | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [imageScale, setImageScale] = useState(1);
    const [imageRotation, setImageRotation] = useState(0);

    const rowsPerPage = 50;

    // Determine file type from extension or MIME type
    const getFileType = () => {
        const extension = filename.toLowerCase().split(".").pop() || "";

        if (
            ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(extension)
        ) {
            return "image";
        }
        if (["csv"].includes(extension)) {
            return "csv";
        }
        if (["parquet"].includes(extension)) {
            return "parquet";
        }
        if (
            [
                "txt",
                "log",
                "md",
                "py",
                "js",
                "ts",
                "json",
                "xml",
                "html",
                "css",
            ].includes(extension)
        ) {
            return "text";
        }
        if (mimeType?.startsWith("image/")) {
            return "image";
        }
        if (mimeType === "text/csv") {
            return "csv";
        }
        if (mimeType?.startsWith("text/")) {
            return "text";
        }

        return "unsupported";
    };

    const fileType = getFileType();

    const fetchFileContent = async () => {
        if (fileType === "image") {
            // Images don't need content fetching, just display via URL
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (fileType === "csv" || fileType === "parquet") {
                // Use server-side table preview for data files
                await fetchTableData();
            } else {
                // For text files, still fetch content directly
                const response = await fetch(
                    `http://localhost:8080/api/uploads/${fileId}/download`,
                );
                if (!response.ok) {
                    throw new Error("Failed to fetch file content");
                }
                const content = await response.text();
                setFileContent(content);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    const fetchTableData = async () => {
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                page_size: rowsPerPage.toString(),
            });

            if (searchTerm) {
                params.append("search", searchTerm);
            }

            const response = await fetch(
                `http://localhost:8080/api/uploads/${fileId}/table-preview?${params}`,
            );

            if (!response.ok) {
                throw new Error("Failed to fetch table data");
            }

            const data = await response.json();
            setTableData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error occurred");
        }
    };

    // Server-side pagination means we don't need client-side filtering
    const getTotalPages = () => {
        if (!tableData) return 0;
        return Math.ceil(tableData.totalRows / rowsPerPage);
    };

    useEffect(() => {
        if (fileType !== "unsupported") {
            fetchFileContent();
        }
    }, [fileId, fileType]);

    // Refetch table data when page or search changes
    useEffect(() => {
        if (fileType === "csv" || fileType === "parquet") {
            fetchTableData();
        }
    }, [currentPage, searchTerm]);

    const downloadFile = () => {
        const link = document.createElement("a");
        link.href = `http://localhost:8080/api/uploads/${fileId}/download`;
        link.download = filename;
        link.click();
    };

    if (fileType === "unsupported") {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Content Preview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mb-4" />
                        <p className="text-lg font-medium mb-2">Preview not available</p>
                        <p className="text-sm mb-4">
                            File type "{filename.split(".").pop()}" is not supported for
                            preview
                        </p>
                        {showDownloadButton && (
                            <Button onClick={downloadFile}>
                                <Download className="mr-2 h-4 w-4" />
                                Download File
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Content Preview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-2">Loading content...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Content Preview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-destructive">
                        <AlertCircle className="h-12 w-12 mb-4" />
                        <p className="text-lg font-medium mb-2">Error loading file</p>
                        <p className="text-sm mb-4">{error}</p>
                        <Button variant="outline" onClick={fetchFileContent}>
                            Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Image Viewer
    if (fileType === "image") {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" />
                            Image Preview
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setImageScale(Math.max(0.25, imageScale - 0.25))}
                                disabled={imageScale <= 0.25}
                            >
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <Badge variant="outline">{Math.round(imageScale * 100)}%</Badge>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setImageScale(Math.min(4, imageScale + 0.25))}
                                disabled={imageScale >= 4}
                            >
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setImageRotation((imageRotation + 90) % 360)}
                            >
                                <RotateCw className="h-4 w-4" />
                            </Button>
                            {showDownloadButton && (
                                <Button variant="outline" size="sm" onClick={downloadFile}>
                                    <Download className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center overflow-auto">
                        <img
                            src={`http://localhost:8080/api/uploads/${fileId}/download`}
                            alt={filename}
                            className="max-w-full h-auto transition-transform duration-200"
                            style={{
                                transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                            }}
                            onError={() => setError("Failed to load image")}
                        />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // CSV/Parquet Viewer
    if ((fileType === "csv" || fileType === "parquet") && tableData) {
        const totalPages = getTotalPages();

        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {fileType === "parquet" ? "Parquet" : "CSV"} Data (
                            {tableData?.totalRows?.toLocaleString() || 0} rows,{" "}
                            {tableData?.totalColumns || 0} columns)
                        </div>
                        {showDownloadButton && (
                            <Button variant="outline" size="sm" onClick={downloadFile}>
                                <Download className="h-4 w-4" />
                                Download
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search in data..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(0); // Reset to first page when searching
                                }}
                                className="max-w-sm"
                            />
                            {searchTerm && (
                                <Badge variant="secondary">
                                    {tableData?.rows?.length || 0} of {tableData?.totalRows || 0}{" "}
                                    rows
                                </Badge>
                            )}
                        </div>

                        {/* Table */}
                        <div className="border rounded-md overflow-hidden">
                            <div className="overflow-x-auto max-h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-12 text-center">#</TableHead>
                                            {(tableData?.headers || []).map((header, index) => (
                                                <TableHead key={index} className="font-medium">
                                                    {header || `Column ${index + 1}`}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(tableData?.rows || []).map((row, rowIndex) => (
                                            <TableRow key={rowIndex}>
                                                <TableCell className="text-center text-muted-foreground text-sm">
                                                    {currentPage * rowsPerPage + rowIndex + 1}
                                                </TableCell>
                                                {row.map((cell, cellIndex) => (
                                                    <TableCell
                                                        key={cellIndex}
                                                        className="max-w-xs truncate"
                                                    >
                                                        {cell}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Showing {currentPage * rowsPerPage + 1} to{" "}
                                    {Math.min(
                                        (currentPage + 1) * rowsPerPage,
                                        tableData?.totalRows || 0,
                                    )}{" "}
                                    of {tableData?.totalRows || 0} rows
                                </p>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                        disabled={currentPage === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <span className="text-sm">
                                        Page {currentPage + 1} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
                                        }
                                        disabled={currentPage === totalPages - 1}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Text Viewer
    if (fileType === "text" && fileContent) {
        const lines = fileContent.split("\n");
        const isLargeFile = fileSize > 1024 * 1024; // 1MB threshold

        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Text Content ({lines.length.toLocaleString()} lines)
                        </div>
                        {showDownloadButton && (
                            <Button variant="outline" size="sm" onClick={downloadFile}>
                                <Download className="h-4 w-4" />
                                Download
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLargeFile && (
                        <div className="mb-4 p-3 bg-muted rounded-md">
                            <p className="text-sm text-muted-foreground">
                                <AlertCircle className="h-4 w-4 inline mr-1" />
                                Large file detected. Showing first 1000 lines for performance.
                            </p>
                        </div>
                    )}
                    <div className="border rounded-md">
                        <pre className="text-sm p-4 overflow-auto max-h-96 bg-muted/30">
                            <code>
                                {isLargeFile
                                    ? lines.slice(0, 1000).join("\n") + "\n\n... (truncated)"
                                    : fileContent}
                            </code>
                        </pre>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return null;
}
