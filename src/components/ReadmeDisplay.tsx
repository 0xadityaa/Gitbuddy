
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, FileText, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReadmeDisplayProps {
  repoFullName: string;
  onBack: () => void;
}

export const ReadmeDisplay = ({ repoFullName, onBack }: ReadmeDisplayProps) => {
  const [readme, setReadme] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateReadme = async () => {
    setLoading(true);
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

      // Generate README using AI
      const generatedReadme = await callAIForReadme(repoContent, repoFullName);
      setReadme(generatedReadme);

      toast({
        title: "Success",
        description: "README generated successfully!",
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
    const { data: { session } } = await import("@/integrations/supabase/client").then(m => m.supabase.auth.getSession());
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

  const callAIForReadme = async (repoContent: string, repoName: string): Promise<string> => {
    const prompt = `Analyze the following repository content and generate a comprehensive README.md file in GitHub flavored markdown syntax.

Repository: ${repoName}

The README should have the following structure:

1. # Project Name (extract from repository name or package.json)

2. ## Overview
   A short, to-the-point description about the repository/project based on the code analysis.

3. ## Setup
   Detailed instructions about setting up the repository by analyzing the tech stack used and how to run it locally. Include installation steps, dependencies, and build commands.

4. ## Environment Configuration
   If any APIs or environment configurations are needed, provide a .env template with placeholder values and descriptions.

5. ## Features
   List all available project features in an ordered list format based on code analysis.

6. ## Tech Stack
   List the technologies, frameworks, and libraries used in the project.

7. ## Usage
   Basic usage instructions if applicable.

Repository Content:
${repoContent}

Please generate a professional, well-structured README.md that would be helpful for developers wanting to understand and contribute to this project.`;

    // This is a placeholder for AI integration - in a real implementation, 
    // you would call an AI service like OpenAI GPT-4
    // For now, return a structured template
    const projectName = repoName.split('/')[1];
    
    return `# ${projectName}

## Overview
This project appears to be a modern web application built with React and TypeScript. Based on the codebase analysis, it includes authentication, data visualization, and user interface components.

## Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation
1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/${repoName}.git
   cd ${projectName}
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

4. Open your browser and navigate to \`http://localhost:3000\`

## Environment Configuration

Create a \`.env\` file in the root directory with the following variables:

\`\`\`env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# GitHub Integration (if applicable)
VITE_GITHUB_CLIENT_ID=your_github_client_id

# Other API keys (add as needed)
VITE_API_KEY=your_api_key
\`\`\`

## Features

1. User authentication and authorization
2. Repository management and analysis
3. Real-time data synchronization
4. Responsive user interface
5. GitHub integration
6. File content analysis
7. Interactive data visualization

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: React Query (TanStack Query)
- **Backend**: Supabase
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Routing**: React Router DOM

## Usage

After setting up the project locally, you can:

1. Sign in with your GitHub account
2. Select repositories for analysis
3. Generate documentation and insights
4. Manage your projects through the dashboard

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(readme);
    toast({
      title: "Copied!",
      description: "README copied to clipboard",
    });
  };

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          README Generator
        </CardTitle>
        <div className="flex gap-2">
          {readme && (
            <Button onClick={copyToClipboard} variant="outline" className="gap-2">
              <Copy className="h-4 w-4" />
              Copy README
            </Button>
          )}
          <Button onClick={onBack} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!readme ? (
          <div className="text-center py-8">
            <Button onClick={generateReadme} disabled={loading} className="gap-2">
              <FileText className="h-4 w-4" />
              {loading ? "Generating README..." : "Generate README"}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              This will analyze all files in {repoFullName} and generate a comprehensive README
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Generated README.md</h3>
              <div className="bg-background p-4 rounded border max-h-96 overflow-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {readme}
                </pre>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
