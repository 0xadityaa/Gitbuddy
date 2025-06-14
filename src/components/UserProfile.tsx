
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  github_username: string | null;
  avatar_url: string | null;
  name: string | null;
}

export const UserProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      setProfile(data);
    }
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage src={profile.avatar_url || undefined} />
        <AvatarFallback>
          {profile.name?.charAt(0) || profile.github_username?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="font-medium">{profile.name || profile.github_username}</p>
        {profile.github_username && (
          <p className="text-sm text-muted-foreground">@{profile.github_username}</p>
        )}
      </div>
    </div>
  );
};
