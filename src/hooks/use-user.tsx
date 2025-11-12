
'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { jwtDecode, type JwtPayload } from 'jwt-decode';

const API_URL = 'https://espserver3.onrender.com/api';

interface UserPayload extends JwtPayload {
  userId: string;
  email: string;
  name?: string;
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
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    }, []);

    const fetchUserProfile = useCallback(async (tokenToVerify: string) => {
        try {
            const decoded: UserPayload = jwtDecode(tokenToVerify);
            if (decoded.exp && decoded.exp * 1000 < Date.now()) {
                throw new Error("Token expired");
            }

            const isUserAdmin = decoded.isAdmin === true;

            const devicesResponse = await fetch(`${API_URL}/user/devices`, {
                headers: { 'Authorization': `Bearer ${tokenToVerify}` }
            });

            let devices: string[] = [];
            if (devicesResponse.ok) {
                const devicesData = await devicesResponse.json();
                if (Array.isArray(devicesData)) {
                  devices = devicesData.map((d: any) => d.uid);
                }
            } else {
                console.warn('Could not fetch user devices.');
            }
            
            const profile: UserProfile = {
                _id: decoded.userId,
                name: decoded.name || 'User',
                email: decoded.email,
                isAdmin: isUserAdmin,
                devices: devices,
                createdAt: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : new Date().toISOString(),
                photoURL: '' 
            };
            
            setUser(profile);
            setToken(tokenToVerify);
            setIsAdmin(isUserAdmin);

        } catch (error) {
            console.error('Profile fetch or token validation failed:', error);
            logout();
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
        
        // If user is NOT logged in and is on a protected page, redirect to login
        if (!user && !isAuthPage && !isHomePage) {
            router.replace('/login');
        }
    }, [user, isLoading, pathname, router]);

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
                const decoded: UserPayload = jwtDecode(data.token);
                const isUserAdmin = decoded.isAdmin === true;
                router.replace(isUserAdmin ? '/dashboard/admin' : '/dashboard');

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
