
// src/app/(app)/admin/users/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { addUserAction, getUsersAction, updateUserAction, deleteUserAction } from '@/lib/actions';
import type { User, UserRole } from '@/lib/types';
import { branches } from '@/data/appRepository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const addUserSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  branchIds: z.array(z.string()).nonempty({ message: "Please select at least one branch." }),
  role: z.enum(['admin', 'purchase', 'employee']),
});

const editUserSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  branchIds: z.array(z.string()).nonempty({ message: "Please select at least one branch." }),
  role: z.enum(['admin', 'purchase', 'employee']),
  password: z.string().min(6, "New password must be at least 6 characters.").optional().or(z.literal('')),
});

type AddUserFormData = z.infer<typeof addUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

const branchOptions = branches.map(b => ({ value: b.id, label: b.name }));

export default function UserManagementPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const addUserForm = useForm<AddUserFormData>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { name: '', username: '', password: '', branchIds: [], role: 'employee' },
  });

  const editUserForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: '', branchIds: [], role: 'employee', password: '' },
  });

  const fetchUsers = async () => {
    try {
      const userList = await getUsersAction();
      setUsers(userList);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch users.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (currentUser && !['admin', 'superadmin'].includes(currentUser.role)) {
      toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
      router.push('/');
      return;
    }

    if (currentUser) {
      fetchUsers().finally(() => setIsLoading(false));
    }
  }, [currentUser, router]);

  useEffect(() => {
    if (selectedUser) {
      editUserForm.reset({
        name: selectedUser.name,
        branchIds: selectedUser.branchIds,
        role: selectedUser.role as 'admin' | 'purchase' | 'employee',
        password: '',
      });
    }
  }, [selectedUser, editUserForm]);

  const onAddUserSubmit = async (data: AddUserFormData) => {
    const result = await addUserAction(data);
    if (result.success) {
      toast({ title: "User Created", description: `User ${data.username} has been successfully created.` });
      addUserForm.reset();
      await fetchUsers();
    } else {
      toast({ title: "Error", description: result.error || "Could not create user.", variant: "destructive" });
    }
  };

  const onEditUserSubmit = async (data: EditUserFormData) => {
    if (!selectedUser) return;
    const result = await updateUserAction(selectedUser.id, data);
    if (result.success) {
      toast({ title: "User Updated", description: "User details have been updated." });
      setIsEditDialogOpen(false);
      await fetchUsers();
    } else {
      toast({ title: "Error", description: result.error || "Could not update user.", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const result = await deleteUserAction(userId);
    if (result.success) {
      toast({ title: "User Deleted", description: "The user has been removed." });
      await fetchUsers();
    } else {
      toast({ title: "Error", description: result.error || "Could not delete user.", variant: "destructive" });
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
    return null;
  }

  return (
    <>
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
              <Form {...addUserForm}>
                <form onSubmit={addUserForm.handleSubmit(onAddUserSubmit)} className="space-y-4">
                  <FormField control={addUserForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={addUserForm.control} name="username" render={({ field }) => (<FormItem><FormLabel>Username</FormLabel><FormControl><Input placeholder="johndoe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={addUserForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={addUserForm.control} name="branchIds" render={({ field }) => (<FormItem><FormLabel>Branches</FormLabel><FormControl><MultiSelect placeholder="Select branches..." options={branchOptions} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={addUserForm.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl><SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="purchase">Purchase</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                  <Button type="submit" className="w-full" disabled={addUserForm.formState.isSubmitting}>
                    {addUserForm.formState.isSubmitting ? (<Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" />) : (<Icons.Add className="mr-2 h-4 w-4" />)}
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
                      <TableHead>Branches</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.branchIds.map(branchId => {
                                const branch = branches.find(b => b.id === branchId);
                                return branch ? <Badge key={branchId} variant="secondary">{branch.name}</Badge> : null;
                            })}
                           </div>
                        </TableCell>
                        <TableCell><Badge variant={user.role === 'admin' || user.role === 'superadmin' ? 'default' : 'secondary'} className="capitalize">{user.role}</Badge></TableCell>
                        <TableCell className="text-right">
                          {currentUser?.id !== user.id && (
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Icons.Settings className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsEditDialogOpen(true); }}><Icons.User className="mr-2 h-4 w-4" /> Edit User</DropdownMenuItem>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Icons.Delete className="mr-2 h-4 w-4" /> Delete User</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete the user <span className="font-semibold">{user.username}</span>. This action cannot be undone.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          )}
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {selectedUser?.username}</DialogTitle>
            <DialogDescription>Change user details and set a new password if needed.</DialogDescription>
          </DialogHeader>
          <Form {...editUserForm}>
            <form onSubmit={editUserForm.handleSubmit(onEditUserSubmit)} className="space-y-4 pt-4">
              <FormField control={editUserForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={editUserForm.control} name="branchIds" render={({ field }) => (<FormItem><FormLabel>Branches</FormLabel><FormControl><MultiSelect placeholder="Select branches..." options={branchOptions} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={editUserForm.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="purchase">Purchase</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={editUserForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>New Password (optional)</FormLabel><FormControl><Input type="password" placeholder="Enter new password" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                <Button type="submit" disabled={editUserForm.formState.isSubmitting}>
                   {editUserForm.formState.isSubmitting ? (<Icons.Dashboard className="mr-2 h-4 w-4 animate-spin" />) : (<Icons.Success className="mr-2 h-4 w-4" />)}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
