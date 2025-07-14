
// src/app/(app)/admin/users/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { addUserAction, getUsersAction } from '@/lib/actions';
import type { User, UserRole } from '@/lib/types';
import { branches } from '@/data/appRepository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';

const userSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  branchId: z.string().nonempty("Please select a branch."),
  role: z.enum(['admin', 'purchase', 'employee']), // Explicitly define roles here
});

type UserFormData = z.infer<typeof userSchema>;

export default function UserManagementPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      username: '',
      password: '',
      branchId: '',
      role: 'employee',
    },
  });

  useEffect(() => {
    // Protect the route for admin/superadmin only
    if (currentUser && !['admin', 'superadmin'].includes(currentUser.role)) {
      toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
      router.push('/');
      return;
    }

    const fetchUsers = async () => {
      try {
        const userList = await getUsersAction();
        setUsers(userList);
      } catch (error) {
        toast({ title: "Error", description: "Failed to fetch users.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser, router]);

  const onSubmit = async (data: UserFormData) => {
    const result = await addUserAction(data);
    if (result.success) {
      toast({ title: "User Created", description: `User ${data.username} has been successfully created.` });
      form.reset();
      // Refetch users to update the list
      const userList = await getUsersAction();
      setUsers(userList);
    } else {
      toast({ title: "Error", description: result.error || "Could not create user.", variant: "destructive" });
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Icons.Dashboard className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading User Management...</p>
      </div>
    );
  }
  
  if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role)) {
    return null; // Render nothing while redirecting
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-headline tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Add new users and manage existing ones.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle>Add New User</CardTitle>
            <CardDescription>Create a new user account and assign a role.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl><Input placeholder="johndoe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map(branch => (
                            <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="purchase">Purchase</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.Add className="mr-2 h-4 w-4" />
                  )}
                  Create User
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Existing Users</CardTitle>
            <CardDescription>List of all users in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{branches.find(b => b.id === user.branchId)?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' || user.role === 'superadmin' ? 'default' : 'secondary'} className="capitalize">{user.role}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
