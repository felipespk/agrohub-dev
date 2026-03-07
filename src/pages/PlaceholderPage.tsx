import { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function PlaceholderPage({ title, description, icon: Icon }: Props) {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Icon className="h-6 w-6 text-primary" />
          <h1 className="page-title">{title}</h1>
        </div>
        <p className="page-subtitle">{description}</p>
      </div>
      <div className="form-section flex flex-col items-center justify-center py-20 text-center">
        <Icon className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <p className="text-lg font-display font-semibold text-muted-foreground">Em desenvolvimento</p>
        <p className="text-sm text-muted-foreground mt-1">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  );
}
