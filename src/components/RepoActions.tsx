
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, FileText, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RepoActionsProps {
  selectedRepo: string;
  onAction: (action: string) => void;
}

export const RepoActions = ({ selectedRepo, onAction }: RepoActionsProps) => {
  const { toast } = useToast();

  const handleAction = (actionType: string, actionName: string) => {
    toast({
      title: `${actionName} Started`,
      description: `Processing ${selectedRepo}...`,
    });
    onAction(actionType);
  };

  const actions = [
    {
      id: "llm-ingest",
      title: "Create LLM Ingest",
      description: "Process repository files for LLM training and analysis",
      icon: Brain,
      variant: "default" as const,
    },
    {
      id: "generate-readme",
      title: "Generate README",
      description: "Automatically create comprehensive documentation",
      icon: FileText,
      variant: "outline" as const,
    },
    {
      id: "generate-dockerfile",
      title: "Generate Dockerfile",
      description: "Create optimized Docker configuration for deployment",
      icon: Package,
      variant: "outline" as const,
    },
  ];

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Repository Actions
        </CardTitle>
        <CardDescription>
          Choose an action to perform on <span className="font-medium">{selectedRepo}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant={action.variant}
              className="w-full justify-start h-auto p-4"
              onClick={() => handleAction(action.id, action.title)}
            >
              <div className="flex items-start gap-3 text-left">
                <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {action.description}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
};
