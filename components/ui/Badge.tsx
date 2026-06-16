import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "free" | "paid" | "sen" | "default";
  className?: string;
}

const variants = {
  free: "bg-green-100 text-green-700",
  paid: "bg-orange-100 text-orange-700",
  sen: "bg-blue-100 text-blue-700",
  default: "bg-gray-100 text-gray-700",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
