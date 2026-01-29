'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Types
interface NavigationContextType {
  previousPage: string;
  navigationHistory: string[];
  goToPreviousPage: () => void;
  goBack: (steps?: number) => void;
  canGoBack: (steps?: number) => boolean;
  isExcludedPage: (path: string) => boolean;
}

interface NavigationProviderProps {
  children: ReactNode;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Configuration for excluded routes
const excludedPatterns: RegExp[] = [
  /^\/auth\/.*/, // matches /auth/* (login, signup, etc.)
  /^\/admin\/.*/, // matches /admin/*
  /^\/api\/.*/, // matches /api/*
  /^\/(login|signup|forgot-password|reset-password)$/ // exact matches for root auth pages
];

const isExcludedPage = (path: string): boolean => {
  return excludedPatterns.some(pattern => pattern.test(path));
};

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [previousPage, setPreviousPage] = useState<string>('/');
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  // Track pathname changes
  useEffect(() => {
    // Don't track excluded pages
    if (!isExcludedPage(pathname)) {
      // Update previous page with the last valid page
      setPreviousPage(prev => {
        // If this is the first valid page or same as current, keep as is
        if (prev === '/' || prev === pathname) {
          return pathname;
        }
        // Otherwise, this becomes the new previous page
        return prev;
      });

      // Update navigation history
      setNavigationHistory(prev => {
        const lastEntry = prev[prev.length - 1];
        if (lastEntry !== pathname) {
          const newHistory = [...prev, pathname];
          return newHistory.slice(-10); // Keep only last 10 pages
        }
        return prev;
      });
    }
  }, [pathname]);

  // Initialize on mount
  useEffect(() => {
    if (!isExcludedPage(pathname)) {
      setNavigationHistory([pathname]);
      setPreviousPage(pathname);
    }
  }, [pathname]); // Run only on mount

  const goToPreviousPage = (): void => {
    if (previousPage && previousPage !== pathname && !isExcludedPage(previousPage)) {
      router.push(previousPage);
    } else {
      // Fallback to home if no valid previous page
      router.push('/');
    }
  };

  const goBack = (steps: number = 1): void => {
    const targetIndex = navigationHistory.length - 1 - steps;
    if (targetIndex >= 0 && navigationHistory[targetIndex]) {
      const targetPage = navigationHistory[targetIndex];
      if (!isExcludedPage(targetPage)) {
        router.push(targetPage);
      } else {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  };

  const canGoBack = (steps: number = 1): boolean => {
    const targetIndex = navigationHistory.length - 1 - steps;
    const targetPage = navigationHistory[targetIndex];
    return targetIndex >= 0 && Boolean(targetPage) && !isExcludedPage(targetPage);
  };

  const value: NavigationContextType = {
    previousPage,
    navigationHistory,
    goToPreviousPage,
    goBack,
    canGoBack,
    isExcludedPage
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

// Convenience hook for just getting previous page
export const usePreviousPage = (): string => {
  const { previousPage } = useNavigation();
  return previousPage;
};