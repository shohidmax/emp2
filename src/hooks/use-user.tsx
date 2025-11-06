
'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

const API_URL = 'https://espserver3.onrender.com/api/user';

interface UserPayload {
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
        window.location.href = '/login';
    }, []);

    const verifyTokenAndSetUser = useCallback(async (tokenToVerify: string | null) => {
        if (!tokenToVerify) {
            setUser(null);
            setToken(null);
            setIsAdmin(false);
            setIsLoading(false);
            return;
        }

        try {
            const decoded: UserPayload = jwtDecode(tokenToVerify);
            if (decoded.exp * 1000 < Date.now()) {
                throw new Error("Token expired");
            }
            
            const profileResponse = await fetch(`${API_URL}/profile`, {
                headers: { 'Authorization': `Bearer ${tokenToVerify}` }
            });

            if (!profileResponse.ok) {
                throw new Error("Failed to fetch user profile");
            }

            const fullProfile: UserProfile = await profileResponse.json();
            setUser(fullProfile);
            setToken(tokenToVerify);
            setIsAdmin(fullProfile.isAdmin);

        } catch (error) {
            console.error('Token verification failed:', error);
            localStorage.removeItem('token');
            setUser(null);
            setToken(null);
            setIsAdmin(false);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const fetchUserProfile = useCallback(async () => {
        const currentToken = localStorage.getItem('token');
        await verifyTokenAndSetUser(currentToken);
    }, [verifyTokenAndSetUser]);

    useEffect(() => {
        const tokenFromStorage = localStorage.getItem('token');
        verifyTokenAndSetUser(tokenFromStorage);
    }, [verifyTokenAndSetUser]);
    
    useEffect(() => {
        if (isLoading) return;

        const isAuthPage = ['/login', '/register', '/reset-password'].includes(pathname);
        const isHomePage = pathname === '/';
        const isProtectedPage = pathname.startsWith('/dashboard');

        if (!user && isProtectedPage) {
            router.replace('/login');
        } else if (user && (isAuthPage || isHomePage)) {
            router.replace('/dashboard');
        }
    }, [user, isLoading, pathname, router]);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (data.success && data.token) {
                localStorage.setItem('token', data.token);
                await verifyTokenAndSetUser(data.token);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };
    
    const value = { user, token, isAdmin, isLoading, login, logout, fetchUserProfile };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
