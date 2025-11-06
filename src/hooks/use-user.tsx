
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
        // Force a full reload to clear all state and redirect to login
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    }, []);

    const fetchUserProfile = useCallback(async (currentToken: string): Promise<boolean> => {
        try {
            const decoded: UserPayload = jwtDecode(currentToken);
            if (decoded.exp && decoded.exp * 1000 < Date.now()) {
                throw new Error("Token expired");
            }
            
            const isUserAdmin = decoded.isAdmin === true;
            
            // Fetch devices separately as it seems to be the reliable endpoint
            const devicesResponse = await fetch(`${API_URL}/user/devices`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });

            let devices: string[] = [];
            if (devicesResponse.ok) {
                const devicesData = await devicesResponse.json();
                // Assuming the endpoint returns an array of device objects with a 'uid' property
                if (Array.isArray(devicesData)) {
                  devices = devicesData.map((d: any) => d.uid);
                }
            } else {
                console.warn('Could not fetch user devices, proceeding without them.');
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
            setToken(currentToken);
            setIsAdmin(isUserAdmin);
            return true;

        } catch (error) {
            console.error('Profile fetch or token validation failed:', error);
            logout();
            return false;
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
        
        if (user) {
            // If user is logged in
            if (isAuthPage || isHomePage) {
                router.replace(isAdmin ? '/dashboard/admin' : '/dashboard');
            }
        } else {
            // If user is not logged in
            if (!isAuthPage && !isHomePage) {
                 router.replace('/login');
            }
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

            if (!response.ok) {
                throw new Error('Login failed');
            }
            
            const data = await response.json();
            if (data.token) {
                localStorage.setItem('token', data.token);
                // After setting token, fetch profile which will handle state updates and redirection
                const success = await fetchUserProfile(data.token);
                setIsLoading(false); // Set loading to false after profile is fetched
                return success;
            }
             throw new Error('No token received');
        } catch (error) {
            console.error('Login error:', error);
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
        fetchUserProfile: () => initializeAuth() // Reruns the whole auth initialization
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
