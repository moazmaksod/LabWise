
'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Role, ClientUser } from '@/lib/types';
import { USERS } from '@/lib/constants';

interface UserContextType {
  user: ClientUser | null;
  loading: boolean;
  login: (role: Role) => Promise<void>;
  logout: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

const mockPasswords: Record<Role, string> = {
    receptionist: 'receptionist123',
    technician: 'technician123',
    manager: 'manager123',
    physician: 'physician123',
    patient: 'patient123'
}

const getMockEmailByRole = (role: Role): string => {
  const user = Object.values(USERS).find(u => u.role === role);
  return user ? user.email : 'emily.jones@labwise.com'; // Default to manager
}


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
            // Token is invalid or expired, so log out
            console.error('Failed to fetch user, logging out.');
            logout();
        }
    } catch (error) {
        console.error('Failed to fetch user', error);
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

  const login = useCallback(async (role: Role) => {
    setLoading(true);
    try {
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: getMockEmailByRole(role), password: 'anypassword' })
        });

        if (response.ok) {
            const { accessToken } = await response.json();
            localStorage.setItem('labwise-token', accessToken);
            await fetchUser(accessToken);
        } else {
            console.error('Login failed');
            setLoading(false);
        }
    } catch (error) {
        console.error('Login request failed', error);
        setLoading(false);
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
