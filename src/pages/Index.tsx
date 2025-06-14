
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthButton } from "@/components/AuthButton";
import { RepoDropdown } from "@/components/RepoDropdown";
import { UserProfile } from "@/components/UserProfile";
import { User } from "@supabase/supabase-js";

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">GitBuddy</h1>
          <AuthButton />
        </div>

        {/* Main Content */}
        {user ? (
          <div className="space-y-8">
            {/* User Profile Section */}
            <div className="bg-card rounded-lg p-6 border">
              <h2 className="text-xl font-semibold mb-4">Welcome back!</h2>
              <UserProfile />
            </div>

            {/* Repository Selection Section */}
            <div className="bg-card rounded-lg p-6 border">
              <h2 className="text-xl font-semibold mb-4">Select a Repository</h2>
              <p className="text-muted-foreground mb-4">
                Choose from your GitHub repositories to get started
              </p>
              <RepoDropdown />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-4">Welcome to GitBuddy</h2>
              <p className="text-muted-foreground mb-8">
                Sign in with your GitHub account to access your repositories and get started.
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
