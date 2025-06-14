
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthButton } from "@/components/AuthButton";
import { RepoDropdown } from "@/components/RepoDropdown";
import { UserProfile } from "@/components/UserProfile";
import { User } from "@supabase/supabase-js";
import { Github, Sparkles } from "lucide-react";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Github className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">GitBuddy</h1>
            <span className="text-xs bg-accent px-2 py-1 rounded-full text-accent-foreground font-medium">
              AI-Powered
            </span>
          </div>
          <AuthButton />
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        {user ? (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Welcome Section */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Welcome back
              </div>
              <UserProfile />
            </div>

            {/* Main Content Card */}
            <div className="bg-card rounded-xl border shadow-sm p-8">
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-semibold">Repository Workspace</h2>
                  <p className="text-muted-foreground">
                    Select a repository to analyze, generate documentation, or create Docker configurations
                  </p>
                </div>
                
                <div className="flex justify-center">
                  <div className="w-full max-w-md">
                    <RepoDropdown />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center space-y-8">
            {/* Hero Section */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                AI-Powered Repository Analysis
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Transform Your
                <span className="text-primary"> GitHub </span>
                Repositories
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed">
                Generate comprehensive documentation, Dockerfiles, and analyze your codebase 
                with the power of AI. Get started in seconds.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 my-12">
              <div className="bg-card rounded-lg p-6 border text-center space-y-3">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                  <Github className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Repository Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Deep analysis of your codebase structure and dependencies
                </p>
              </div>
              
              <div className="bg-card rounded-lg p-6 border text-center space-y-3">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">AI Documentation</h3>
                <p className="text-sm text-muted-foreground">
                  Generate comprehensive READMEs with AI assistance
                </p>
              </div>
              
              <div className="bg-card rounded-lg p-6 border text-center space-y-3">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                  <div className="h-6 w-6 bg-primary rounded text-primary-foreground text-xs flex items-center justify-center font-bold">
                    D
                  </div>
                </div>
                <h3 className="font-semibold">Docker Generation</h3>
                <p className="text-sm text-muted-foreground">
                  Create production-ready Docker configurations automatically
                </p>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-card rounded-xl border p-8 space-y-4">
              <h2 className="text-2xl font-semibold">Get Started</h2>
              <p className="text-muted-foreground">
                Sign in with your GitHub account to access your repositories and start generating AI-powered documentation.
              </p>
              <AuthButton />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
