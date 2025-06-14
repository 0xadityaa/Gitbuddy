
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DirectoryStructureProps {
  repoFullName: string;
  onBack: () => void;
}

interface GitHubContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url?: string;
}

export const DirectoryStructure = ({ repoFullName, onBack }: DirectoryStructureProps) => {
  const [structure, setStructure] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchDirectoryStructure = async () => {
    setLoading(true);
    try {
      const token = await getGitHubToken();
      if (!token) {
        throw new Error("No GitHub token available");
      }

      const allFiles = await fetchAllFiles(repoFullName, "", token);
      const structureText = generateDirectoryStructure(allFiles);
      setStructure(structureText);
    } catch (error) {
      console.error('Error fetching directory structure:', error);
      toast({
        title: "Error",
        description: "Failed to fetch directory structure",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getGitHubToken = async () => {
    const { data: { session } } = await import("@/integrations/supabase/client").then(m => m.supabase.auth.getSession());
    return session?.provider_token;
  };

  const fetchAllFiles = async (repoFullName: string, path: string, token: string): Promise<GitHubContent[]> => {
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${path}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const contents: GitHubContent[] = await response.json();
    let allFiles: GitHubContent[] = [];

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

  const generateDirectoryStructure = (files: GitHubContent[]): string => {
    const sortedFiles = files.sort((a, b) => {
      // Sort directories first, then files
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1;
      }
      return a.path.localeCompare(b.path);
    });

    let structure = `Directory structure:\n└── ${repoFullName.split('/')[1]}/\n`;
    
    sortedFiles.forEach((file, index) => {
      const depth = file.path.split('/').length - 1;
      const isLast = index === sortedFiles.length - 1;
      const prefix = '    '.repeat(depth) + (isLast ? '└── ' : '├── ');
      const name = file.name + (file.type === 'dir' ? '/' : '');
      structure += `${prefix}${name}\n`;
    });

    return structure;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(structure);
    toast({
      title: "Copied!",
      description: "Directory structure copied to clipboard",
    });
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Directory Structure</CardTitle>
        <div className="flex gap-2">
          {structure && (
            <Button onClick={copyToClipboard} variant="outline" className="gap-2">
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          )}
          <Button onClick={onBack} variant="outline">
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!structure ? (
          <div className="text-center py-8">
            <Button onClick={fetchDirectoryStructure} disabled={loading}>
              {loading ? "Fetching Directory Structure..." : "Fetch Directory Structure"}
            </Button>
          </div>
        ) : (
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto max-h-96">
              {structure}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
