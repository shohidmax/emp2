
'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// We are not using jwt-decode anymore as we rely on the API for profile info.

const API_URL = 'https://espserver3.onrender.com/api';

export interface UserProfile {
    _id: string;
    name: string;
    email: string;
    devices: string[];
    createdAt: string;
    isAdmin: boolean;
    photoURL?: string; 
}

interface UserContextType {
    user: UserProfile | null;
    token: string | null;
    isAdmin: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    fetchUserProfile: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
        setIsAdmin(false);
        if (typeof window !== 'undefined') {
            router.replace('/login');
        }
    }, [router]);

    const fetchUserProfile = useCallback(async (tokenToVerify: string) => {
        try {
            const response = await fetch(`${API_URL}/user/profile`, {
                headers: { 'Authorization': `Bearer ${tokenToVerify}` }
            });

            if (!response.ok) {
                // If the profile fetch fails (e.g., token expired), log out.
                throw new Error("Failed to fetch profile, token might be invalid.");
            }
            
            const profileData: UserProfile = await response.json();

            setUser(profileData);
            setToken(tokenToVerify);
            setIsAdmin(profileData.isAdmin === true);

        } catch (error) {
            console.error('Profile fetch failed:', error);
            logout(); // Critical: Log out user if token is invalid or API fails
        }
    }, [logout]);
    
    const initializeAuth = useCallback(async () => {
        setIsLoading(true);
        const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        if (tokenFromStorage) {
            await fetchUserProfile(tokenFromStorage);
        }
        setIsLoading(false);
    }, [fetchUserProfile]);


    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);
    
     useEffect(() => {
        if (isLoading) return;

        const isAuthPage = ['/login', '/register', '/reset-password'].includes(pathname);
        const isHomePage = pathname === '/';
        
        if (!user && !isAuthPage && !isHomePage) {
            router.replace('/login');
        }

        // If user is logged in and on an auth page, redirect to their dashboard
        if (user && isAuthPage) {
            router.replace(isAdmin ? '/dashboard/admin' : '/dashboard');
        }

    }, [user, isAdmin, isLoading, pathname, router]);

    const login = async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/user/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) throw new Error('Login failed');
            
            const data = await response.json();
            if (data.token) {
                localStorage.setItem('token', data.token);
                await fetchUserProfile(data.token);

                // After fetching profile, manually redirect based on admin status
                // We read isAdmin directly from the fetched profile, not the state,
                // as state update might be asynchronous.
                const profileResponse = await fetch(`${API_URL}/user/profile`, {
                    headers: { 'Authorization': `Bearer ${data.token}` }
                });
                const profile: UserProfile = await profileResponse.json();

                router.replace(profile.isAdmin ? '/dashboard/admin' : '/dashboard');

                return true;
            }
             throw new Error('No token received');
        } catch (error) {
            console.error('Login error:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };
    
    const value = { 
        user, 
        token, 
        isAdmin, 
        isLoading, 
        login, 
        logout, 
        fetchUserProfile: () => {
            const currentToken = localStorage.getItem('token');
            if (currentToken) {
                return fetchUserProfile(currentToken);
            }
            return Promise.resolve();
        }
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
