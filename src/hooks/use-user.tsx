
'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { jwtDecode, type JwtPayload } from 'jwt-decode';

const API_URL = 'https://esp-web-server2.onrender.com';

interface DecodedToken extends JwtPayload {
    userId: string;
    email: string;
    name?: string; // name might not be in the token, but we can handle that
}


export interface UserProfile {
    _id: string;
    name: string;
    email: string;
    devices: string[];
    createdAt: string;
    isAdmin: boolean;
    photoURL?: string; 
    address?: string;
    mobile?: string;
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
        setIsLoading(false); // Ensure loading is false after logout
        if (!['/login', '/register', '/'].includes(pathname)) {
            router.replace('/login');
        }
    }, [router, pathname]);

    const processToken = useCallback((authToken: string) => {
        try {
            const decoded: DecodedToken = jwtDecode(authToken);
            if (decoded.exp && decoded.exp * 1000 < Date.now()) {
                logout();
                return;
            }

            const userIsAdmin = decoded.email.toLowerCase() === 'shohidmax@gmail.com';
            
            // Create a UserProfile object directly from the token
            const profile: UserProfile = {
                _id: decoded.userId,
                email: decoded.email,
                name: decoded.name || decoded.email.split('@')[0], // Fallback for name
                isAdmin: userIsAdmin,
                // These fields are not in the token and will be fetched separately if needed
                devices: user?.devices || [],
                createdAt: user?.createdAt || new Date().toISOString(),
                address: user?.address,
                mobile: user?.mobile,
            };

            setUser(profile);
            setIsAdmin(userIsAdmin);
            setToken(authToken);

        } catch (error) {
            console.error("Token processing failed:", error);
            logout();
        }
    }, [logout, user]);


    const initializeAuth = useCallback(async () => {
        setIsLoading(true);
        const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        if (tokenFromStorage) {
            processToken(tokenFromStorage);
        }
        setIsLoading(false);
    }, [processToken]);


    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);
    
    useEffect(() => {
        if (isLoading) return;

        const isAuthPage = ['/login', '/register', '/reset-password'].includes(pathname);
        const isPublicPage = isAuthPage || pathname === '/';
        
        if (!user && !isPublicPage) {
            router.replace('/login');
        } else if (user && isAuthPage) {
             router.replace(user.isAdmin ? '/dashboard/admin' : '/dashboard');
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
                if (typeof window !== 'undefined') {
                    localStorage.setItem('token', data.token);
                }
                processToken(data.token);
                return true;
            }

            throw new Error('Login process failed: No token received.');
        } catch (error: any) {
            console.error('Login error:', error);
            logout();
            throw error; // Re-throw the error so the form can catch it
        } finally {
            setIsLoading(false);
        }
    };
    
    // This function will now fetch the full profile from the server if needed,
    // but the core auth flow no longer depends on it.
    const fetchUserProfile = async () => {
        const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!currentToken) return;

        try {
            const response = await fetch(`${API_URL}/api/user/profile`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
             if (!response.ok) {
                // We will not log out here, as the token might still be valid
                console.warn("Could not fetch full profile, but user is still logged in.", response.status);
                return;
            }
            const fullProfile: UserProfile = await response.json();
            setUser(fullProfile); // Update the state with the full profile
            setIsAdmin(fullProfile.isAdmin);

        } catch (error) {
             console.warn("Error fetching full user profile:", error);
        }
    }
    
    const value = { 
        user, 
        token, 
        isAdmin, 
        isLoading, 
        login, 
        logout, 
        fetchUserProfile,
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
