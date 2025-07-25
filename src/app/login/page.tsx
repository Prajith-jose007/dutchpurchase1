// src/app/login/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { toast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth is not loading and a user is found, it means a session exists.
    // Redirect them to the main page. This prevents a logged-in user from seeing the login page.
    if (!authLoading && currentUser) {
      router.push('/ordering'); 
    }
  }, [currentUser, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const success = await login(username, password);

    if (success) {
      toast({ title: "Login Successful", description: "Welcome back!"});
      // The login function in AuthContext now handles the redirection.
    } else {
      toast({ title: "Login Failed", description: "Invalid username or password.", variant: "destructive" });
      setIsLoggingIn(false);
    }
  };

  // While checking auth state, or if a user is already logged in and being redirected.
  if (authLoading || currentUser) {
     return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Icons.Dashboard className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Render the login form only when we are sure there is no logged-in user.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-1 text-center p-6 items-center">
          <Image src="/logo.png" alt="Dutch Oriental Logo" width={200} height={50} />
          <CardTitle className="text-2xl !mt-4">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to log in</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoggingIn}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoggingIn}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.Login className="mr-2 h-4 w-4" /> 
              )}
              {isLoggingIn ? 'Logging in...' : 'Login'}
            </Button>
          </CardFooter>
        </form>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Dutch Oriental. All rights reserved.
      </footer>
    </div>
  );
}
