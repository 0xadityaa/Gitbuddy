
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GitBranch, Lock, Unlock } from "lucide-react";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
}

export const RepoDropdown = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.provider_token) {
        toast({
          title: "No GitHub token",
          description: "Please sign in with GitHub to access repositories",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
        headers: {
          'Authorization': `token ${session.provider_token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const repos = await response.json();
      setRepositories(repos);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      toast({
        title: "Error",
        description: "Failed to fetch repositories from GitHub. Please try signing in again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRepoSelect = (repoFullName: string) => {
    setSelectedRepo(repoFullName);
    const repo = repositories.find(r => r.full_name === repoFullName);
    if (repo) {
      toast({
        title: "Repository selected",
        description: `Selected: ${repo.full_name}`,
      });
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-md">
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Loading repositories..." />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="w-full max-w-md">
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="No repositories found" />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <Select value={selectedRepo} onValueChange={handleRepoSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select a repository" />
        </SelectTrigger>
        <SelectContent>
          {repositories.map((repo) => (
            <SelectItem key={repo.id} value={repo.full_name}>
              <div className="flex items-center gap-2 w-full">
                <GitBranch className="h-4 w-4" />
                <span className="font-medium">{repo.name}</span>
                {repo.private ? (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Unlock className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              {repo.description && (
                <div className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
                  {repo.description}
                </div>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
