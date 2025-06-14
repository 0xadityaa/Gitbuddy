
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Package, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DockerfileDisplayProps {
  repoFullName: string;
  onBack: () => void;
}

export const DockerfileDisplay = ({ repoFullName, onBack }: DockerfileDisplayProps) => {
  const [dockerFiles, setDockerFiles] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateDockerFiles = async () => {
    setLoading(true);
    try {
      const token = await getGitHubToken();
      if (!token) {
        throw new Error("No GitHub token available");
      }

      // Fetch all files content using the same logic as other components
      const allFiles = await fetchAllFiles(repoFullName, "", token);
      const fileItems = allFiles.filter(file => file.type === 'file');
      
      let repoContent = `Repository: ${repoFullName}\n\n`;
      
      for (const file of fileItems) {
        try {
          const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${file.path}`, {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          });
          
          if (response.ok) {
            const fileData = await response.json();
            let content = '';
            if (fileData.content) {
              try {
                content = atob(fileData.content.replace(/\n/g, ''));
              } catch (decodeError) {
                content = '[Binary file or encoding error]';
              }
            } else {
              content = '[Empty file or could not decode content]';
            }
            
            repoContent += `================================================\n`;
            repoContent += `FILE: ${file.path}\n`;
            repoContent += `================================================\n`;
            repoContent += content;
            repoContent += `\n\n`;
          }
        } catch (error) {
          console.warn(`Could not fetch content for file: ${file.path}`, error);
        }
      }

      // Generate Docker files using Gemini AI via Supabase Edge Function
      const generatedDockerFiles = await callGeminiForDockerFiles(repoContent, repoFullName);
      setDockerFiles(generatedDockerFiles);

      toast({
        title: "Success",
        description: "Docker files generated successfully using Gemini AI!",
      });
      
    } catch (error) {
      console.error('Error generating Docker files:', error);
      toast({
        title: "Error",
        description: "Failed to generate Docker files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getGitHubToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.provider_token;
  };

  const fetchAllFiles = async (repoFullName: string, path: string, token: string): Promise<any[]> => {
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${path}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const contents = await response.json();
    let allFiles: any[] = [];

    for (const item of contents) {
      allFiles.push(item);
      if (item.type === 'dir') {
        try {
          const subFiles = await fetchAllFiles(repoFullName, item.path, token);
          allFiles = allFiles.concat(subFiles);
        } catch (error) {
          console.warn(`Could not fetch contents of directory: ${item.path}`);
        }
      }
    }

    return allFiles;
  };

  const callGeminiForDockerFiles = async (repoContent: string, repoName: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('generate-dockerfile', {
      body: {
        repoContent,
        repoName,
      },
    });

    if (error) {
      throw new Error(`Supabase function error: ${error.message}`);
    }

    if (!data || !data.generatedDockerFiles) {
      throw new Error('No Docker files content received from AI');
    }

    return data.generatedDockerFiles;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(dockerFiles);
    toast({
      title: "Copied!",
      description: "Docker files copied to clipboard",
    });
  };

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Docker Files Generator (Powered by Gemini AI)
        </CardTitle>
        <div className="flex gap-2">
          {dockerFiles && (
            <Button onClick={copyToClipboard} variant="outline" className="gap-2">
              <Copy className="h-4 w-4" />
              Copy Docker Files
            </Button>
          )}
          <Button onClick={onBack} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!dockerFiles ? (
          <div className="text-center py-8">
            <Button onClick={generateDockerFiles} disabled={loading} className="gap-2">
              <Package className="h-4 w-4" />
              {loading ? "Generating Docker Files with Gemini AI..." : "Generate Docker Files with AI"}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              This will analyze all files in {repoFullName} and generate production-ready Dockerfile and docker-compose.yml using Google's Gemini AI
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Generated Docker Configuration</h3>
              <div className="bg-background p-4 rounded border max-h-96 overflow-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {dockerFiles}
                </pre>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
