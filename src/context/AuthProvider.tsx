"use client"

import { createContext, useEffect, useContext, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User, Provider, SupabaseClient  } from "@supabase/supabase-js"
import { useSignal, useSignals } from '@preact/signals-react/runtime';
import { useNavigation } from './NavigationProvider';

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
  token?: string;
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
  const navigate = useNavigation();

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        loading.value = true;

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          const session_user = session.user;
          let profile_data;

          // Fetch profile
          const { data, error: fetchError } = await supabase
            .from("profiles")
            .select()
            .eq("id", session_user.id)
            .single();

          if (fetchError && fetchError.code === "PGRST116") {
            // Profile doesn't exist yet – insert it
            const { data: newProfile, error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: session_user.id,
                username: session_user.user_metadata?.full_name || (session_user.email ? session_user.email.split("@")[0] : "unknown"),
                avatar_url: session_user.user_metadata?.avatar_url || null,
                description: null,
                is_verified: false
              })
              .select()
              .single();

            if (insertError) throw insertError;

            profile_data = newProfile;
          } else {
            profile_data = data;
          }

          sessionStorage.setItem("profile_user", JSON.stringify(profile_data));

          user.value = {
            ...user.value,
            user: session_user,
            profile: profile_data
          };
        } else {
          user.value = {
            ...user.value,
            user: null,
            profile: null
          };
        }
      } catch (error: any) {
        errorState.value = error.message;
      } finally {
        loading.value = false;
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const fetchOrCreateProfile = async () => {
        const user_id = session?.user?.id;
        if (!user_id) return;

        let profile_data;

        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select()
          .eq("id", user_id)
          .single();

        if (fetchError && fetchError.code === "PGRST116") {
          // New user, insert profile
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: user_id,
              username: session.user.user_metadata?.full_name || (session.user.email ? session.user.email.split("@")[0] : "unknown"),
              avatar_url: session.user.user_metadata?.avatar_url || null,
              description: null,
              is_verified: false
            })
            .select()
            .single();

          if (insertError) {
            console.log("Failed to insert profile:", insertError.message);
            return;
          }

          profile_data = newProfile;
        } else {
          profile_data = data;
        }

        sessionStorage.setItem("profile_user", JSON.stringify(profile_data));

        user.value = {
          ...user.value,
          user: session.user,
          profile: profile_data
        };
      };

      if (session) {
        fetchOrCreateProfile();
      } else {
        user.value = {
          ...user.value,
          user: null,
          profile: null
        };
      }

      loading.value = false;
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Login function
  const signIn = async ({ email, password, token }: credentials) => {
    try {
      loading.value = true;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { 
          captchaToken: token ? token : "",
          //redirectTo: `${globalThis.location.origin}/${navigate.previousPage || ''}`
        }
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
        router.push(navigate.previousPage);
      }, 100);
    }
  };

  const oauth = async (provider: Provider, redirectTo = "") => {
    if (!provider) {
      throw new Error("No Providers Mentioned");
    }
    
    try {
      loading.value = true; 
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${globalThis.location.origin}/${navigate.previousPage || ''}`,
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
  const signUp = async ({ email, password, token }: credentials) => {
    try {
      loading.value = true;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { captchaToken: token ? token : "" }
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
        redirectTo: `${globalThis.location.origin}/reset-password`
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