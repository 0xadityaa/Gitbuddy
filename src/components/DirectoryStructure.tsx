import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, FileText, Hash, Folder, Download } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
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
      const repoMetadata = await calculateRepoMetadata(allFiles, token);
      
      setStructure(structureText);
      setMetadata(repoMetadata);
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

  const fetchAllFilesContent = async () => {
    setContentLoading(true);
    try {
      const token = await getGitHubToken();
      if (!token) {
        throw new Error("No GitHub token available");
      }

      const allFiles = await fetchAllFiles(repoFullName, "", token);
      const fileItems = allFiles.filter(file => file.type === 'file');
      
      let contentText = `Repository: ${repoFullName}\n\n`;
      
      for (const file of fileItems) {
        try {
          // Use GitHub API to fetch file content instead of raw URLs
          const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${file.path}`, {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          });
          
          if (response.ok) {
            const fileData = await response.json();
            // GitHub API returns content as base64 encoded
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
            
            // Add file separator and content
            contentText += `================================================\n`;
            contentText += `FILE: ${file.path}\n`;
            contentText += `================================================\n`;
            contentText += content;
            contentText += `\n\n`;
          } else {
            // Add placeholder for failed files
            contentText += `================================================\n`;
            contentText += `FILE: ${file.path}\n`;
            contentText += `================================================\n`;
            contentText += `[Error: Could not fetch file content - ${response.status}]\n\n`;
          }
        } catch (error) {
          console.warn(`Could not fetch content for file: ${file.path}`, error);
          // Add placeholder for failed files
          contentText += `================================================\n`;
          contentText += `FILE: ${file.path}\n`;
          contentText += `================================================\n`;
          contentText += `[Error: Could not fetch file content]\n\n`;
        }
      }

      setFilesContent(contentText);
      
      // Calculate tokens using our simple estimation function
      const tokens = estimateTokens(contentText);
      setContentTokenCount(tokens);

      toast({
        title: "Success",
        description: `Fetched content from ${fileItems.length} files`,
      });
      
    } catch (error) {
      console.error('Error fetching files content:', error);
      toast({
        title: "Error",
        description: "Failed to fetch files content",
        variant: "destructive",
      });
    } finally {
      setContentLoading(false);
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

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Repository Analysis</CardTitle>
        <div className="flex gap-2">
          {structure && (
            <Button onClick={() => copyToClipboard(structure, "Directory structure")} variant="outline" className="gap-2">
              <Copy className="h-4 w-4" />
              Copy Structure
            </Button>
          )}
          <Button onClick={onBack} variant="outline">
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!structure ? (
          <div className="text-center py-8">
            <Button onClick={fetchDirectoryStructure} disabled={loading}>
              {loading ? "Analyzing Repository..." : "Analyze Repository"}
            </Button>
          </div>
        ) : (
          <>
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
                    <div className="text-sm text-muted-foreground">Estimated Tokens</div>
                    <div className="font-medium">{formatNumber(metadata.estimatedTokens)}</div>
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

            {/* Files Content Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Files Content</h3>
                <div className="flex gap-2">
                  {!filesContent ? (
                    <Button 
                      onClick={fetchAllFilesContent} 
                      disabled={contentLoading}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {contentLoading ? "Fetching Content..." : "Fetch All Files Content"}
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => copyToClipboard(filesContent, "Files content")} 
                      variant="outline" 
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  )}
                </div>
              </div>

              {filesContent && (
                <>
                  {/* Content Token Count */}
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <Hash className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="text-sm text-muted-foreground">Total Tokens (estimated)</div>
                      <div className="font-medium text-blue-700 dark:text-blue-300">
                        {formatNumber(contentTokenCount)}
                      </div>
                    </div>
                  </div>

                  {/* Content Display */}
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto max-h-96 text-left">
                      {filesContent}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
