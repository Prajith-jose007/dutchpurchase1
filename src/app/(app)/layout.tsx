
"use client"; 

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/AuthContext';
import { ChangePasswordDialog } from '@/components/ui/change-password-dialog';

const navItems = [
  { href: "/ordering", label: "Order Items", icon: Icons.Order, roles: ['superadmin', 'admin', 'employee'] },
  { href: "/purchase/notifications", label: "PO Notifications", icon: Icons.Bell, roles: ['superadmin', 'admin', 'purchase'] },
  { href: "/inventory", label: "Inventory", icon: Icons.Inventory, roles: ['superadmin', 'admin', 'purchase', 'employee'] },
  { href: "/invoices/upload", label: "Upload Invoices", icon: Icons.UploadCloud, roles: ['superadmin', 'admin', 'purchase'] },
  { href: "/admin/users", label: "User Management", icon: Icons.Admin, roles: ['superadmin', 'admin'] },
  { href: "/admin/reports", label: "Reports", icon: Icons.Reports, roles: ['superadmin', 'admin'] },
];

const getInitials = (name: string | undefined) => {
  if (!name) return 'U'; // Default for User
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase();
};


export default function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  useEffect(() => {
    // If authentication is done loading and there is still no user, redirect to login.
    if (!isLoading && !currentUser) {
      router.push('/login');
    }
  }, [isLoading, currentUser, router]);

  // Show a loading screen while the authentication state is being determined.
  if (isLoading || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Icons.Dashboard className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading application...</p>
      </div>
    );
  }
  
  const accessibleNavItems = navItems.filter(item => currentUser.role && item.roles.includes(currentUser.role));


  return (
      <>
        <SidebarProvider defaultOpen>
          <Sidebar>
            <SidebarHeader className="p-4 text-center">
              <h1 className="font-headline text-2xl font-bold text-primary-foreground group-data-[collapsible=icon]:hidden">Dutch Oriental</h1>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                 {/* Dashboard Link */}
                <SidebarMenuItem>
                    <SidebarMenuButton 
                        asChild 
                        className="w-full justify-start"
                        tooltip="Dashboard"
                        isActive={pathname === '/'}
                    >
                        <Link href="/">
                            <Icons.Dashboard className="h-5 w-5" />
                            <span>Dashboard</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                {accessibleNavItems.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton 
                      asChild 
                      className="w-full justify-start"
                      tooltip={item.label}
                      isActive={pathname.startsWith(item.href)}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-4 mt-auto border-t border-sidebar-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 w-full justify-start p-2 group-data-[collapsible=icon]:justify-center">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="user avatar" />
                      <AvatarFallback>{getInitials(currentUser?.name)}</AvatarFallback>
                    </Avatar>
                    <div className="group-data-[collapsible=icon]:hidden text-left">
                      <p className="text-sm font-medium truncate">{currentUser?.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground capitalize truncate">{currentUser?.role || 'Role'}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setIsPasswordDialogOpen(true)}>
                    <Icons.Settings className="mr-2 h-4 w-4" />
                    <span>Change Password</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Icons.User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
                    <Icons.Logout className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
              <div className="flex items-center gap-2 md:hidden">
                <SidebarTrigger>
                   <Icons.Menu className="h-6 w-6" />
                </SidebarTrigger>
                <span className="font-semibold">Menu</span>
              </div>
              <div className="hidden md:block font-headline text-2xl">
                {currentUser ? `Welcome, ${currentUser.name.split(' ')[0]}!` : 'Welcome!'}
              </div>
              <div className="flex items-center gap-4">
                {/* Theme Toggle or other actions */}
              </div>
            </header>
            <main className="flex-1 overflow-auto p-4 md:p-6">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
        
        {currentUser && (
            <ChangePasswordDialog
                isOpen={isPasswordDialogOpen}
                onOpenChange={setIsPasswordDialogOpen}
                userId={currentUser.id}
            />
        )}
      </>
  );
}
