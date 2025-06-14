
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, FileText, Package, ArrowRight } from "lucide-react";
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
      description: "Process repository files for LLM training and comprehensive analysis",
      icon: Brain,
      color: "bg-blue-500",
      lightColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      id: "generate-readme",
      title: "Generate README",
      description: "Automatically create comprehensive documentation using AI",
      icon: FileText,
      color: "bg-green-500",
      lightColor: "bg-green-50 text-green-700 border-green-200",
    },
    {
      id: "generate-dockerfile",
      title: "Generate Dockerfile",
      description: "Create production-ready Docker configuration for deployment",
      icon: Package,
      color: "bg-purple-500",
      lightColor: "bg-purple-50 text-purple-700 border-purple-200",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl">Choose Your Action</CardTitle>
          <CardDescription className="text-base">
            Select what you'd like to do with{" "}
            <span className="font-medium text-foreground">{selectedRepo}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Card 
                  key={action.id}
                  className="transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer border-2 hover:border-primary/20"
                  onClick={() => handleAction(action.id, action.title)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 rounded-xl ${action.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">{action.title}</h3>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
