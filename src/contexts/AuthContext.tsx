
// src/contexts/AuthContext.tsx
"use client";

import type { User } from '@/lib/types';
import { users } from '@/data/appRepository';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/actions'; // Import the new server action

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
    const fetchUser = async () => {
      try {
        const storedUserId = localStorage.getItem('currentUserId');
        if (storedUserId) {
          const user = await getUser(storedUserId); // Fetch user from server action
          setCurrentUser(user || null);
        }
      } catch (error) {
        console.error("Error reading user from localStorage", error);
        localStorage.removeItem('currentUserId'); // Clear corrupted data
      }
      setIsLoading(false);
    };
    
    fetchUser();
  }, []);

  const login = useCallback(async (username_input: string, password_input: string): Promise<boolean> => {
    const user = users.find(u => u.username === username_input && u.password === password_input);
    if (user) {
      const userToStore = { ...user };
      setCurrentUser(userToStore);
      localStorage.setItem('currentUserId', userToStore.id);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('currentUserId');
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
