// Stats Card de ravikatiyar162 (21st.dev), con "hint" en lugar de variación porcentual.
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  icon?: React.ReactNode;
  hint?: string;
  tone?: "default" | "positive" | "warning";
  className?: string;
}

export function StatsCard({ title, value, icon, hint, tone = "default", className }: StatsCardProps) {
  return (
    <Card className={cn("w-full gap-1", className)} size="sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-bold tabular-nums text-foreground",
            tone === "positive" && "text-emerald-600",
            tone === "warning" && "text-amber-700",
          )}
        >
          {value}
        </div>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
