
// src/contexts/AuthContext.tsx
"use client";

import type { User } from '@/lib/types';
import { users } from '@/data/appRepository';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (username_input: string, password_input: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error reading user from localStorage", error);
      localStorage.removeItem('currentUser'); // Clear corrupted data
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username_input: string, password_input: string): Promise<boolean> => {
    const user = users.find(u => u.username === username_input && u.password === password_input);
    if (user) {
      const userToStore = { ...user };
      // DO NOT store password in localStorage in a real app
      // delete userToStore.password; 
      setCurrentUser(userToStore);
      localStorage.setItem('currentUser', JSON.stringify(userToStore));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    router.push('/login'); // Redirect to login after logout
  }, [router]);

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
