'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Role, User } from '@/lib/types';
import { USERS } from '@/lib/constants';

interface UserContextType {
  user: User | null;
  loading: boolean;
  login: (role: Role) => void;
  logout: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedRole = localStorage.getItem('labwise-role') as Role | null;
      if (storedRole && USERS[storedRole]) {
        setUser(USERS[storedRole]);
      }
    } catch (error) {
      // localStorage is not available
      console.error("Could not access localStorage. User state will not be persisted.");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback((role: Role) => {
    if (USERS[role]) {
      setUser(USERS[role]);
      try {
        localStorage.setItem('labwise-role', role);
      } catch (error) {
        console.error("Could not access localStorage. User state will not be persisted.");
      }
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem('labwise-role');
    } catch (error) {
      console.error("Could not access localStorage.");
    }
  }, []);

  const value = { user, loading, login, logout };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
