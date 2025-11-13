
'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { jwtDecode, type JwtPayload } from 'jwt-decode';

const API_URL = 'https://espserver3.onrender.com';

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

interface DecodedToken extends JwtPayload {
    userId: string;
    email: string;
    name?: string;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    
    // This is a fallback if the env variable is not set. 
    // Your server-side code is the source of truth, but this helps the client-side logic.
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'shohidmax@gmail.com';

    const logout = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
        }
        setUser(null);
        setToken(null);
        setIsAdmin(false);
        // Ensure redirection only happens if not already on a public page
        if (!['/login', '/register', '/'].includes(pathname)) {
            router.replace('/login');
        }
    }, [router, pathname]);


    const createUserProfileFromToken = (decodedToken: DecodedToken, existingProfile?: UserProfile): UserProfile => {
        const userIsAdmin = decodedToken.email === ADMIN_EMAIL;
        return {
            _id: decodedToken.userId,
            email: decodedToken.email,
            name: decodedToken.name || existingProfile?.name || decodedToken.email.split('@')[0],
            isAdmin: userIsAdmin,
            devices: existingProfile?.devices || [], 
            createdAt: existingProfile?.createdAt || new Date( (decodedToken.iat || 0) * 1000).toISOString(),
            photoURL: existingProfile?.photoURL,
            address: existingProfile?.address,
            mobile: existingProfile?.mobile,
        };
    };

    const initializeAuth = useCallback(async () => {
        setIsLoading(true);
        const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        if (tokenFromStorage) {
            try {
                const decoded: DecodedToken = jwtDecode(tokenFromStorage);
                if (decoded.exp && decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    // Create a profile directly from the token, avoiding the failed API call
                    const profile = createUserProfileFromToken(decoded);
                    setUser(profile);
                    setToken(tokenFromStorage);
                    setIsAdmin(profile.isAdmin);
                }
            } catch (error) {
                console.error("Token processing failed during initialization:", error);
                logout();
            }
        }
        setIsLoading(false);
    }, [logout, ADMIN_EMAIL]);


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
                const decoded: DecodedToken = jwtDecode(data.token);
                const profile = createUserProfileFromToken(decoded);
                
                setUser(profile);
                setToken(data.token);
                setIsAdmin(profile.isAdmin);
                
                router.replace(profile.isAdmin ? '/dashboard/admin' : '/dashboard');
                return true;
            }

            throw new Error('Login process failed: No token received.');
        } catch (error) {
            console.error('Login error:', error);
            logout();
            return false;
        } finally {
            setIsLoading(false);
        }
    };
    
    const fetchUserProfile = async () => {
      // This function is now a placeholder to satisfy component dependencies,
      // but the core logic is handled by decoding the token.
      // We can add a real fetch here if we solve the 404 issue, but for now, this works.
      if (token && !user) {
         try {
            const decoded: DecodedToken = jwtDecode(token);
            const profile = createUserProfileFromToken(decoded);
            setUser(profile);
            setIsAdmin(profile.isAdmin);
         } catch (e) {
            console.error("Failed to decode token on fetchUserProfile", e);
            logout();
         }
      }
    };
    
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
