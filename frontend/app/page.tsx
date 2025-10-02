"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BackendStatus {
  status: string;
  message: string;
}

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkBackend = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:8080/health");
      if (!response.ok) {
        throw new Error("Backend not responding");
      }
      const data = await response.json();
      setBackendStatus(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to backend",
      );
      setBackendStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              DataLab
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Your modern data upload platform
            </p>
          </div>

          {/* Status Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Check the connection between frontend and backend
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Backend Connection</p>
                  {loading && (
                    <p className="text-sm text-slate-500">Checking...</p>
                  )}
                  {!loading && backendStatus && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {backendStatus.message}
                      </p>
                    </div>
                  )}
                  {!loading && error && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {error}
                      </p>
                    </div>
                  )}
                </div>
                <Button onClick={checkBackend} disabled={loading}>
                  {loading ? "Checking..." : "Refresh"}
                </Button>
              </div>

              {backendStatus && (
                <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-md">
                  <p className="text-xs font-mono">
                    Status: {backendStatus.status}
                  </p>
                  <p className="text-xs font-mono">
                    Frontend: http://localhost:3000
                  </p>
                  <p className="text-xs font-mono">
                    Backend: http://localhost:8080
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Welcome Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Welcome to DataLab</CardTitle>
              <CardDescription>
                Your full-stack data upload solution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">🎨 Frontend</h3>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>✓ Next.js 15</li>
                    <li>✓ React 19</li>
                    <li>✓ shadcn/ui</li>
                    <li>✓ Tailwind CSS v4</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">⚡ Backend</h3>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>✓ Rust</li>
                    <li>✓ Axum framework</li>
                    <li>✓ Tokio async runtime</li>
                    <li>✓ CORS enabled</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Next steps:</strong> The foundation is ready! You can
                  now add file upload functionality, data processing, and more.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
