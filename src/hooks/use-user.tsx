'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);

      const isAuthPage = pathname === '/login' || pathname === '/register';
      const isDashboardPage = pathname.startsWith('/dashboard');

      if (user) {
        // If user is logged in and on an auth page, redirect to dashboard
        if (isAuthPage) {
          router.replace('/dashboard');
        }
      } else {
        // If user is not logged in and on a dashboard page, redirect to login
        if (isDashboardPage) {
          router.replace('/login');
        }
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  return { user, isLoading };
}
