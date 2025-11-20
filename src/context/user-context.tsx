
'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Role, ClientUser } from '@/lib/types';
import { USERS } from '@/lib/constants';

interface UserContextType {
  user: ClientUser | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (token: string) => {
    setLoading(true);
    try {
        const response = await fetch('/api/v1/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            const userData: ClientUser = await response.json();
            setUser(userData);
        } else {
            const errorBody = await response.text();
            console.error('Failed to fetch user, logging out. Status:', response.status, 'Body:', errorBody);
            logout();
        }
    } catch (error) {
        console.error('Exception during fetchUser', error);
        logout();
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('labwise-token');
    if (token) {
        fetchUser(token);
    } else {
        setLoading(false);
    }
  }, [fetchUser]);

  const login = useCallback(async (email: string, password?: string) => {
    setLoading(true);
    try {
        // Determine which login endpoint to use
        const isInternalUser = email.endsWith('@labwise.com');
        const apiEndpoint = isInternalUser ? '/api/v1/auth/login' : '/api/v1/portal/auth/login';

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password: password || 'anypassword' })
        });

        if (response.ok) {
            const { accessToken } = await response.json();
            localStorage.setItem('labwise-token', accessToken);
            await fetchUser(accessToken);
            return true;
        } else {
            console.error('Login failed');
            setLoading(false);
            return false;
        }
    } catch (error) {
        console.error('Login request failed', error);
        setLoading(false);
        return false;
    }
  }, [fetchUser]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('labwise-token');
    setLoading(false);
  }, []);

  const value = { user, loading, login, logout };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
