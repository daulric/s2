'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useRef, startTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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

const excludedPatterns: RegExp[] = [
  /^\/auth\/.*/,
  /^\/admin\/.*/,
  /^\/api\/.*/,
  /^\/(login|signup|forgot-password|reset-password)$/
];

const isExcludedPage = (path: string): boolean => {
  return excludedPatterns.some(pattern => pattern.test(path));
};

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [previousPage, setPreviousPage] = useState<string>('/');
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    if (isExcludedPage(pathname)) return;

    startTransition(() => {
      setPreviousPage(prev => {
        if (prev === '/' || prev === pathname) return pathname;
        return prev;
      });

      setNavigationHistory(prev => {
        const lastEntry = prev[prev.length - 1];
        if (lastEntry !== pathname) {
          return [...prev, pathname].slice(-10);
        }
        return prev;
      });
    });
  }, [pathname]);

  const goToPreviousPage = (): void => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    if (previousPage && previousPage !== currentPath && !isExcludedPage(previousPage)) {
      router.push(previousPage);
    } else {
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

export const usePreviousPage = (): string => {
  const { previousPage } = useNavigation();
  return previousPage;
};
