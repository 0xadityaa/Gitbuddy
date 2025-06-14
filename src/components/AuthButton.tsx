
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Github, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const AuthButton = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_IN') {
          toast({
            title: "Welcome!",
            description: "Successfully signed in with GitHub",
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [toast]);

  const signInWithGithub = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'repo read:user user:email',
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('GitHub OAuth error:', error);
        toast({
          title: "Authentication Error",
          description: error.message.includes('Provider not found') 
            ? "GitHub authentication is not properly configured. Please check your Supabase settings."
            : error.message,
          variant: "destructive",
        });
      }

      // The redirect happens automatically if successful
      // No need to handle data here as the user will be redirected
    } catch (error: any) {
      console.error('GitHub sign-in error:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to GitHub. Please check your internet connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signed out",
          description: "You have been signed out successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  if (user) {
    return (
      <Button onClick={signOut} variant="outline" className="gap-2">
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    );
  }

  return (
    <Button onClick={signInWithGithub} disabled={loading} className="gap-2">
      <Github className="h-4 w-4" />
      {loading ? "Connecting..." : "Sign in with GitHub"}
    </Button>
  );
};
