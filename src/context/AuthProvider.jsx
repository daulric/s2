"use client"

import { createContext, useState, useEffect, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState({
    user: null, 
    profile: null
  });

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
        
        
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Set up listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const temp_profile = JSON.parse(sessionStorage.getItem("profile_user"));

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
  const signIn = async ({ email, password }) => {
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
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
      setTimeout(() => {
        router.refresh();
      }, 100);
    }
  };

  const oauth = async (provider, redirectTo = "") => {
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
    } catch(e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  // Signup function
  const signUp = async ({ email, password }) => {
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
    } catch (error) {
      setError(error.message);
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
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Password reset function
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setError(error.message);
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

