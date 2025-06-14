import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, FileText, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReadmeDisplayProps {
  repoFullName: string;
  onBack: () => void;
}

export const ReadmeDisplay = ({ repoFullName, onBack }: ReadmeDisplayProps) => {
  const [readme, setReadme] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Automatically start README generation when component mounts
    generateReadme();
  }, [repoFullName]);

  const generateReadme = async () => {
    try {
      const token = await getGitHubToken();
      if (!token) {
        throw new Error("No GitHub token available");
      }

      // Fetch all files content using the same logic as DirectoryStructure
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

      // Generate README using Gemini AI via Supabase Edge Function
      const generatedReadme = await callGeminiForReadme(repoContent, repoFullName);
      setReadme(generatedReadme);

      toast({
        title: "Success",
        description: "README generated successfully using Gemini AI!",
      });
      
    } catch (error) {
      console.error('Error generating README:', error);
      toast({
        title: "Error",
        description: "Failed to generate README",
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

  const callGeminiForReadme = async (repoContent: string, repoName: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('generate-readme', {
      body: {
        repoContent,
        repoName,
      },
    });

    if (error) {
      throw new Error(`Supabase function error: ${error.message}`);
    }

    if (!data || !data.generatedReadme) {
      throw new Error('No README content received from AI');
    }

    return data.generatedReadme;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(readme);
    toast({
      title: "Copied!",
      description: "README copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className="w-full">
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating README with Gemini AI
            </CardTitle>
            <Button onClick={onBack} variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">
                  Analyzing repository and generating comprehensive README using Google's Gemini AI...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generated README.md
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={copyToClipboard} variant="outline" size="sm" className="gap-2">
              <Copy className="h-4 w-4" />
              Copy README
            </Button>
            <Button onClick={onBack} variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 w-full">
          <div className="bg-muted p-6 rounded-lg w-full">
            <pre className="text-sm whitespace-pre-wrap font-mono overflow-auto max-h-[600px] w-full">
              {readme}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
