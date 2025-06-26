"use client"

import { createContext, useState, useEffect, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User, Provider, SupabaseClient  } from "@supabase/supabase-js"

type UserProfile = {
  id: string;
  username: string;
  avatar_url?: string;
};

type UserState = {
  user: User | null;
  profile: UserProfile | null;
};

type credentials = {
  email: string;
  password: string;
}

type AuthContextType = {
  user: UserState;
  loading: boolean;
  error: string | null;
  signIn: (credentials: credentials) => Promise<any>;
  signUp: (credentials: credentials) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  oauth: (provider: Provider, redirectTo?: string) => Promise<any>;
  supabase: SupabaseClient<any, string, any>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  return useContext(AuthContext) as AuthContextType;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {

  const [user, setUser] = useState<UserState>({ user: null, profile: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Get the current session on component mount
    const getInitialSession = async () => {
      try {
        setLoading(true);
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (session) {
          const session_user = session.user;

          const {data: profile_data} = await supabase.from("profiles").select().eq("id", session_user.id).single();

          if (!sessionStorage.getItem("profile_user")) {
            sessionStorage.setItem("profile_user", JSON.stringify(profile_data))
          }

          setUser(prev => {
            prev.user = session_user;
            prev.profile = profile_data;
            return prev;
          });
        } else {
          setUser(prev => {
            prev.profile = null;
            prev.user = null;
            return prev;
          })
        }
        
        
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Set up listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const temp_profile = JSON.parse(sessionStorage.getItem("profile_user") || "null");

        if (!temp_profile) {

          const fetchProfile = async () => {
            const { data: profile_data } = await supabase
              .from("profiles")
              .select()
              .eq("id", session.user.id)
              .single();
        
            sessionStorage.setItem("profile_user", JSON.stringify(profile_data));
        
            setUser(prev => ({
              ...prev,
              profile: profile_data
            }));
          };
        
          fetchProfile();
        }
        
        setUser(prev => ({
          ...prev,
          user: session.user,
          profile: temp_profile
        }));
        

      } else {
        setUser(prev => ({
          ...prev,
          user: null,
          profile: null
        }));
        
      }

      setLoading(false);
    });

    // Cleanup function
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Login function
  const signIn = async ({ email, password }: credentials) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
      setTimeout(() => {
        router.refresh();
      }, 100);
    }
  };

  const oauth = async (provider: Provider, redirectTo = "") => {
    if (!provider) {
      throw new Error("No Providers Mentioned");
    }
    
    try {
      setLoading(true);
  
      const formattedRedirectTo = redirectTo.startsWith('/') 
        ? redirectTo.substring(1) 
        : redirectTo;
      
      const redirectUrl = formattedRedirectTo 
        ? `${window.location.origin}/${formattedRedirectTo}`
        : window.location.origin;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUrl
        }
      });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch(e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  // Signup function
  const signUp = async ({ email, password }: credentials) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      setError(error.message || error);
      throw error;
    } finally {
      setLoading(false);
      setTimeout(() => {
        router.refresh();
      }, 100);
    }
  };

  // Signout function
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      router.refresh();
    } catch (error: any) {
      setError(error.message || error);
    } finally {
      setLoading(false);
    }
  };

  // Password reset function
  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      setError(error.message || error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Value object that will be provided to consumers of this context
  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    supabase,
    oauth
   };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}