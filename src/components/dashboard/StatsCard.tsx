import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
}

export function StatsCard({ title, value, description, icon }: StatsCardProps) {
  const formattedValue = typeof value === 'number' ? value.toLocaleString('pt-BR') : value;
  
  return (
    <Card className="bg-white/50 backdrop-blur-sm border border-[#0EA5E9]/20 shadow-lg hover:shadow-xl transition-all duration-200 hover:border-[#0EA5E9]/40">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-[#0EA5E9]">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold bg-gradient-to-r from-[#0EA5E9] to-blue-500 bg-clip-text text-transparent">
          {formattedValue}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}