"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Upload, Tags, Database } from "lucide-react";

const navigation = [
    { name: "Upload", href: "/upload", icon: Upload },
    { name: "Data", href: "/data", icon: Database },
    { name: "Tags", href: "/tags", icon: Tags },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-screen w-64 flex-col border-r bg-slate-50 dark:bg-slate-900">
            {/* Logo */}
            <div className="flex h-16 items-center border-b px-6">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
                        <span className="text-sm font-bold text-white">DL</span>
                    </div>
                    <span className="text-xl font-semibold">DataLab</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
