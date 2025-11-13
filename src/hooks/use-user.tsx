
'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

const API_URL = 'https://espserver3.onrender.com';

// This payload reflects the structure of the JWT token from your server
interface UserPayload {
    userId: string;
    email: string;
    iat: number;
    exp: number;
    // We expect `isAdmin` to be in the token for immediate role-checking
    isAdmin?: boolean; 
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
        if (typeof window !== 'undefined' && !['/login', '/register', '/reset-password', '/'].includes(pathname)) {
           router.replace('/login');
        }
    }, [router, pathname]);

    const fetchUserProfile = useCallback(async (tokenToVerify: string) => {
        if (!tokenToVerify) {
            logout();
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/user/profile`, {
                headers: { 'Authorization': `Bearer ${tokenToVerify}` }
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Profile fetch failed with status ${response.status}: ${errorBody}`);
                throw new Error("Failed to fetch profile, token might be invalid.");
            }
            
            const profileData: UserProfile = await response.json();
            
            // Set all states together to avoid race conditions
            setUser(profileData);
            setIsAdmin(profileData.isAdmin);
            setToken(tokenToVerify);

        } catch (error) {
            console.error('Error during profile fetch:', error);
            logout(); // If any part fails, logout for safety
        }
    }, [logout]);
    
    const initializeAuth = useCallback(async () => {
        setIsLoading(true);
        const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        if (tokenFromStorage) {
            await fetchUserProfile(tokenFromStorage);
        } else {
            // If no token, no need to do anything, just stop loading
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
        
    }, [user, isLoading, pathname, router]);

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
                // After setting token, fetch profile to get full user data and role
                await fetchUserProfile(data.token);
                
                // fetchUserProfile sets isAdmin state, so we can now use it.
                const decoded: UserPayload = jwtDecode(data.token);
                const userIsAdmin = decoded.email === 'shohidmax@gmail.com'; // Fallback check
                
                // We fetch the profile again to be sure
                const profileResponse = await fetch(`${API_URL}/api/user/profile`, {
                    headers: { 'Authorization': `Bearer ${data.token}` }
                });
                const finalProfile: UserProfile = await profileResponse.json();

                router.replace(finalProfile.isAdmin ? '/dashboard/admin' : '/dashboard');

                return true;
            }
             throw new Error('No token received');
        } catch (error) {
            console.error('Login error:', error);
            // Ensure state is clean after a failed login
            logout();
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
