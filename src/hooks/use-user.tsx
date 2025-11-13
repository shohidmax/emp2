
'use client';

import { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

const API_URL = 'https://espserver3.onrender.com';

interface JwtPayload {
    userId: string;
    email: string;
    name?: string;
    iat: number;
    exp: number;
}

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

// Define the admin email here. This should ideally come from an environment variable.
const ADMIN_EMAIL = 'shohidmax@gmail.com';


export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
        setIsAdmin(false);
        setIsLoading(false); // Make sure loading is false after logout
        if (typeof window !== 'undefined' && !['/login', '/register', '/reset-password', '/'].includes(pathname)) {
           router.replace('/login');
        }
    }, [router, pathname]);


    const setupUserFromToken = useCallback((tokenToVerify: string) => {
        try {
            const decoded: JwtPayload = jwtDecode(tokenToVerify);
            if (decoded.exp * 1000 < Date.now()) {
                logout();
                return;
            }

            const userIsAdmin = decoded.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

            // Create a partial user profile from the token.
            // The full profile with devices etc. can be fetched elsewhere if needed.
            const profile: UserProfile = {
                _id: decoded.userId,
                email: decoded.email,
                name: decoded.name || 'User',
                isAdmin: userIsAdmin,
                devices: [], // Fetched separately on device pages
                createdAt: new Date(decoded.iat * 1000).toISOString(),
            };

            setUser(profile);
            setToken(tokenToVerify);
            setIsAdmin(userIsAdmin);

        } catch (error) {
            console.error('Error setting up user from token:', error);
            logout();
        }
    }, [logout]);


    const initializeAuth = useCallback(async () => {
        const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        if (tokenFromStorage) {
            setupUserFromToken(tokenFromStorage);
        }
        setIsLoading(false);
    }, [setupUserFromToken]);

    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);
    
    useEffect(() => {
        if (isLoading) return;

        const isAuthPage = ['/login', '/register', '/reset-password'].includes(pathname);
        const isHomePage = pathname === '/';
        
        if (!user && !isAuthPage && !isHomePage) {
            router.replace('/login');
        } else if (user && isAuthPage) {
            router.replace(isAdmin ? '/dashboard/admin' : '/dashboard');
        }
        
    }, [user, isAdmin, isLoading, pathname, router]);

    const login = async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/user/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.message || 'Login failed');
            }
            
            const data = await response.json();
            if (data.token) {
                localStorage.setItem('token', data.token);
                setupUserFromToken(data.token);
                
                // Manually determine where to redirect after login
                const decoded: JwtPayload = jwtDecode(data.token);
                const userIsAdmin = decoded.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                router.replace(userIsAdmin ? '/dashboard/admin' : '/dashboard');

                return true;
            }
             throw new Error('No token received');
        } catch (error) {
            console.error('Login error:', error);
            logout();
            return false;
        } finally {
            setIsLoading(false);
        }
    };
    
    // This function is now a dummy function, but kept for compatibility.
    // In a real scenario, it would fetch devices or other non-auth data.
    const fetchUserProfile = async () => {
       console.log("Fetching additional profile data if needed...");
       // No-op, as main profile data is now derived from token.
       return Promise.resolve();
    }
    
    const value = { 
        user, 
        token, 
        isAdmin, 
        isLoading, 
        login, 
        logout, 
        fetchUserProfile
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
