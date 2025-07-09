"use client"

import { createContext, useEffect, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User, Provider, SupabaseClient  } from "@supabase/supabase-js"
import { useSignal, useSignals } from '@preact/signals-react/runtime';

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
  useSignals();
  const user = useSignal<UserState>({ user: null, profile: null });
  const loading = useSignal<boolean>(true);
  const errorState = useSignal<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Get the current session on component mount
    const getInitialSession = async () => {
      try {
        loading.value = true;
        
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

          user.value = {
            ...user.value,
            user: session_user,
            profile: profile_data
          }
        } else {
          user.value = {
            ...user.value,
            user: null,
            profile: null
          }
        }
        
        
      } catch (error: any) {
        errorState.value = error.message;
      } finally {
        loading.value = false;
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

            user.value = {
              ...user.value,
              profile: profile_data
            }
          };
        
          fetchProfile();
        }
        
        user.value = {
          ...user.value,
          user: session.user,
          profile: temp_profile
        }
        

      } else {
        user.value = {
          ...user.value,
          user: null,
          profile: null
        }
        
      }

      loading.value = false;
    });

    // Cleanup function
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Login function
  const signIn = async ({ email, password }: credentials) => {
    try {
      loading.value = true;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      errorState.value = error.message || error;
      throw error;
    } finally {
      loading.value = false;
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
      loading.value = true;
  
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
      errorState.value = e.message || e;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  // Signup function
  const signUp = async ({ email, password }: credentials) => {
    try {
      loading.value = true;

      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      errorState.value = error.message || error;
      throw error;
    } finally {
      loading.value = false;
      setTimeout(() => {
        router.refresh();
      }, 100);
    }
  };

  // Signout function
  const signOut = async () => {
    try {
      loading.value = true;

      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      router.refresh();
    } catch (error: any) {
      errorState.value = error.message || error;
    } finally {
      loading.value = false;
    }
  };

  // Password reset function
  const resetPassword = async (email: string) => {
    try {
      loading.value = true;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      errorState.value = error.message || error;
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // Value object that will be provided to consumers of this context
  const value = {
    user: user.value,
    loading: loading.value,
    error: errorState.value,
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