
'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
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
    fetchUserProfile: (token: string) => Promise<UserProfile | null>; 
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const logout = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
        }
        setUser(null);
        setToken(null);
        setIsAdmin(false);
        setIsLoading(false); // Set loading to false after state is cleared
        router.replace('/login');
    }, [router]);

    const fetchUserProfile = useCallback(async (currentToken: string): Promise<UserProfile | null> => {
        try {
            const response = await fetch(`${API_URL}/api/user/profile`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Profile fetch failed with status ${response.status}: ${errorBody}`);
                throw new Error("Failed to fetch profile, token might be invalid.");
            }
            
            const profileData: UserProfile = await response.json();
            
            setUser(profileData);
            setIsAdmin(profileData.isAdmin);
            setToken(currentToken);

            return profileData;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            logout();
            return null;
        }
    }, [logout]);


    const initializeAuth = useCallback(async () => {
        const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        if (tokenFromStorage) {
            try {
                const decoded: JwtPayload = jwtDecode(tokenFromStorage);
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    // Token is valid, fetch full profile from backend
                    await fetchUserProfile(tokenFromStorage);
                }
            } catch (error) {
                console.error("Invalid token during initialization:", error);
                logout();
            }
        }
        setIsLoading(false);
    }, [logout, fetchUserProfile]);


    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);
    
    useEffect(() => {
        if (isLoading) return;

        const isAuthPage = ['/login', '/register', '/reset-password'].includes(pathname);
        
        if (!user && !isAuthPage) {
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
                if (typeof window !== 'undefined') {
                    localStorage.setItem('token', data.token);
                }
                // After getting token, fetch the full user profile
                const profile = await fetchUserProfile(data.token);
                
                setIsLoading(false);

                if (profile) {
                    router.replace(profile.isAdmin ? '/dashboard/admin' : '/dashboard');
                    return true;
                }
                return false;
            }

            throw new Error('No token received');
        } catch (error) {
            console.error('Login error:', error);
            logout();
            setIsLoading(false);
            return false;
        }
    };
    
    const value = { 
        user, 
        token, 
        isAdmin, 
        isLoading, 
        login, 
        logout, 
        // We pass a wrapper to avoid exposing the internal fetchUserProfile directly if it's not needed by components
        fetchUserProfile: (token: string) => fetchUserProfile(token),
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
