
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, FileText, Hash, Folder, Download, ArrowLeft, Loader2 } from "lucide-react";
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
  size?: number;
  sha?: string;
}

interface RepoMetadata {
  name: string;
  filesAnalyzed: number;
  estimatedTokens: number;
}

// Simple token estimation function (approximates GPT-4 tokenization)
const estimateTokens = (text: string): number => {
  // Rough estimation: 1 token ≈ 0.75 words or 4 characters
  // This is a simplified approximation
  const words = text.split(/\s+/).length;
  const characters = text.length;
  
  // Use the higher of word-based or character-based estimation
  const wordBasedTokens = Math.ceil(words * 1.3);
  const charBasedTokens = Math.ceil(characters / 4);
  
  return Math.max(wordBasedTokens, charBasedTokens);
};

export const DirectoryStructure = ({ repoFullName, onBack }: DirectoryStructureProps) => {
  const [structure, setStructure] = useState<string>("");
  const [metadata, setMetadata] = useState<RepoMetadata | null>(null);
  const [filesContent, setFilesContent] = useState<string>("");
  const [contentTokenCount, setContentTokenCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Automatically start the complete analysis when component mounts
    performCompleteAnalysis();
  }, [repoFullName]);

  const performCompleteAnalysis = async () => {
    try {
      const token = await getGitHubToken();
      if (!token) {
        throw new Error("No GitHub token available");
      }

      // Fetch all files and structure
      const allFiles = await fetchAllFiles(repoFullName, "", token);
      const structureText = generateDirectoryStructure(allFiles);
      const repoMetadata = await calculateRepoMetadata(allFiles, token);
      
      setStructure(structureText);
      setMetadata(repoMetadata);

      // Immediately fetch all files content
      const fileItems = allFiles.filter(file => file.type === 'file');
      
      let contentText = `Repository: ${repoFullName}\n\n`;
      
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
            
            contentText += `================================================\n`;
            contentText += `FILE: ${file.path}\n`;
            contentText += `================================================\n`;
            contentText += content;
            contentText += `\n\n`;
          }
        } catch (error) {
          console.warn(`Could not fetch content for file: ${file.path}`, error);
        }
      }

      setFilesContent(contentText);
      
      // Calculate tokens using our simple estimation function
      const tokens = estimateTokens(contentText);
      setContentTokenCount(tokens);

      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${fileItems.length} files and generated LLM ingest data`,
      });
      
    } catch (error) {
      console.error('Error performing complete analysis:', error);
      toast({
        title: "Error",
        description: "Failed to analyze repository",
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

  const calculateRepoMetadata = async (files: GitHubContent[], token: string): Promise<RepoMetadata> => {
    const fileItems = files.filter(file => file.type === 'file');
    let totalTokens = 0;

    // Sample a few files to estimate token count (to avoid hitting API limits)
    const sampleSize = Math.min(10, fileItems.length);
    const sampleFiles = fileItems.slice(0, sampleSize);

    for (const file of sampleFiles) {
      try {
        const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${file.path}`, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        if (response.ok) {
          const fileData = await response.json();
          if (fileData.content) {
            try {
              const content = atob(fileData.content.replace(/\n/g, ''));
              totalTokens += estimateTokens(content);
            } catch (decodeError) {
              // Skip binary files or files that can't be decoded
            }
          }
        }
      } catch (error) {
        console.warn(`Could not fetch content for file: ${file.path}`);
      }
    }

    // Estimate total tokens based on sample
    const avgTokensPerFile = sampleFiles.length > 0 ? totalTokens / sampleFiles.length : 0;
    const estimatedTotalTokens = Math.round(avgTokensPerFile * fileItems.length);

    return {
      name: repoFullName.split('/')[1],
      filesAnalyzed: fileItems.length,
      estimatedTokens: estimatedTotalTokens,
    };
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

  const copyToClipboard = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <Card className="w-full max-w-6xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyzing Repository & Generating LLM Ingest
          </CardTitle>
          <Button onClick={onBack} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">
                Analyzing repository structure and fetching all file contents...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Repository Analysis Complete
        </CardTitle>
        <div className="flex gap-2">
          <Button onClick={() => copyToClipboard(structure, "Directory structure")} variant="outline" className="gap-2">
            <Copy className="h-4 w-4" />
            Copy Structure
          </Button>
          <Button onClick={() => copyToClipboard(filesContent, "Complete LLM ingest")} variant="outline" className="gap-2">
            <Copy className="h-4 w-4" />
            Copy LLM Ingest
          </Button>
          <Button onClick={onBack} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Repository Metadata */}
        {metadata && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Folder className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-sm text-muted-foreground">Repository</div>
                <div className="font-medium">{metadata.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-sm text-muted-foreground">Files Analyzed</div>
                <div className="font-medium">{formatNumber(metadata.filesAnalyzed)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Hash className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-sm text-muted-foreground">Total Tokens</div>
                <div className="font-medium">{formatNumber(contentTokenCount)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Directory Structure */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Directory Structure</h3>
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto max-h-96">
              {structure}
            </pre>
          </div>
        </div>

        {/* Complete LLM Ingest Content */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Complete LLM Ingest Data</h3>
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto max-h-96 text-left">
              {filesContent}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
