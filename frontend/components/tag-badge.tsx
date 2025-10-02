import { Badge } from "@/components/ui/badge";

interface Tag {
    id: string;
    name: string;
    color: string;
}

interface TagBadgeProps {
    tag: Tag;
    selected?: boolean;
    onClick?: () => void;
    className?: string;
}

export function TagBadge({
    tag,
    selected = true,
    onClick,
    className = "",
}: TagBadgeProps) {
    const baseClasses = "h-6 px-2 text-xs"; // Fixed height and padding

    if (onClick) {
        // Interactive tag (selectable)
        return (
            <Badge
                style={{
                    backgroundColor: selected ? tag.color : "transparent",
                    color: selected ? "white" : tag.color,
                    borderColor: tag.color,
                }}
                className={`${baseClasses} cursor-pointer border-2 transition-all hover:scale-105 ${className}`}
                onClick={onClick}
            >
                {tag.name}
            </Badge>
        );
    }

    // Static tag (display only)
    return (
        <Badge
            style={{ backgroundColor: tag.color }}
            className={`${baseClasses} text-white ${className}`}
        >
            {tag.name}
        </Badge>
    );
}
