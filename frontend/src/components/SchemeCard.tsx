import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Shield, Clock } from "lucide-react";

interface SchemeCardProps {
  name: string;
  amc: string;
  category: string;
  categoryLabel: string;
  highlights: string[];
  onAsk: (query: string) => void;
}

const CATEGORY_ICONS: Record<string, typeof TrendingUp> = {
  "large-cap": TrendingUp,
  "flexi-cap": Shield,
  "elss": Clock,
};

const CATEGORY_COLORS: Record<string, string> = {
  "large-cap": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "flexi-cap": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "elss": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export function SchemeCard({
  name,
  amc,
  category,
  categoryLabel,
  highlights,
  onAsk,
}: SchemeCardProps) {
  const Icon = CATEGORY_ICONS[category] || TrendingUp;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-default">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">{name}</p>
              <p className="text-xs text-muted-foreground">{amc}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-xs shrink-0 ${CATEGORY_COLORS[category] || ""}`}
          >
            {categoryLabel}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {highlights.map((q, i) => (
            <button
              key={i}
              onClick={() => onAsk(q)}
              className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-muted transition-colors duration-200 text-left text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
