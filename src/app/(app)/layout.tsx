
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
import { getPendingOrdersCountAction } from '@/lib/actions';
import { Badge } from '@/components/ui/badge';
import { InnerAppProviders } from './providers';
import Image from 'next/image';
import { useIsMobile } from '@/hooks/use-mobile';

const navItems = [
  { href: "/ordering", label: "Order Items", icon: Icons.Order, roles: ['superadmin', 'admin', 'employee'] },
  { href: "/orders", label: "Order History", icon: Icons.ClipboardList, roles: ['superadmin', 'admin', 'purchase', 'employee'] },
  { href: "/purchase/notifications", label: "PO Notifications", icon: Icons.Bell, roles: ['superadmin', 'admin', 'purchase'] },
  { href: "/inventory", label: "Inventory", icon: Icons.Inventory, roles: ['superadmin', 'admin', 'purchase', 'employee'] },
  { href: "/admin/users", label: "User Management", icon: Icons.Admin, roles: ['superadmin', 'admin'] },
  { href: "/admin/inventory", label: "Inventory Mgt.", icon: Icons.Archive, roles: ['superadmin', 'admin'] },
  { href: "/admin/reports", label: "Reports", icon: Icons.Reports, roles: ['superadmin', 'admin', 'purchase'] },
];

const getInitials = (name: string | undefined) => {
  if (!name) return 'U'; // Default for User
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase();
};

function InnerAppLayout({ children }: { children: ReactNode }) {
  const { currentUser, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // If authentication is done loading and there is still no user, redirect to login.
    if (!isLoading && !currentUser) {
      router.push('/login');
    }
  }, [isLoading, currentUser, router]);

  useEffect(() => {
    if (currentUser && ['purchase', 'admin', 'superadmin'].includes(currentUser.role)) {
      getPendingOrdersCountAction().then(setPendingOrdersCount);
    }
  }, [currentUser, pathname]); // Re-fetch on path change to keep it fresh

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
              <div className="group-data-[collapsible=icon]:hidden">
                <Image src="/logo.png" alt="Dutch Oriental Logo" width={180} height={45} />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                {accessibleNavItems.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton 
                      asChild 
                      className="w-full justify-start relative"
                      tooltip={item.label}
                      isActive={pathname === item.href}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                         {item.label === "PO Notifications" && pendingOrdersCount > 0 && (
                          <Badge className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 p-0 flex items-center justify-center group-data-[collapsible=icon]:hidden">
                            {pendingOrdersCount}
                          </Badge>
                        )}
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
              <div className="flex items-center gap-4 md:hidden">
                {isClient && isMobile && (
                  <SidebarTrigger>
                    <Image src="/menu.png" alt="Menu" width={24} height={24} />
                  </SidebarTrigger>
                )}
                <Image src="/logo.png" alt="Dutch Oriental Logo" width={140} height={35} />
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


export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <InnerAppProviders>
      <InnerAppLayout>{children}</InnerAppLayout>
    </InnerAppProviders>
  )
}
