
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/context/user-context';
import { cn } from '@/lib/utils';
import {
    Calendar,
    Users,
    FilePlus,
    LayoutDashboard,
    TestTube,
    ClipboardList,
    Activity,
    Settings,
    FileText,
    BarChart3,
    Package,
    ShieldCheck,
    UserCog,
    LogOut,
    Microscope
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type NavItem = {
    title: string;
    href: string;
    icon: React.ReactNode;
};

const roleNavItems: Record<string, NavItem[]> = {
    receptionist: [
        { title: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
        { title: 'Patient Registration', href: '/patients/register', icon: <Users className="h-4 w-4" /> },
        { title: 'Order Entry', href: '/orders/entry', icon: <FilePlus className="h-4 w-4" /> },
        { title: 'Scheduling', href: '/scheduling', icon: <Calendar className="h-4 w-4" /> },
    ],
    technician: [
        { title: 'Worklist', href: '/dashboard', icon: <ClipboardList className="h-4 w-4" /> },
        { title: 'Accessioning', href: '/accessioning', icon: <TestTube className="h-4 w-4" /> },
        { title: 'Quality Control', href: '/qc', icon: <Activity className="h-4 w-4" /> },
        { title: 'Instruments', href: '/instruments', icon: <Microscope className="h-4 w-4" /> },
        { title: 'Inventory Search', href: '/inventory', icon: <Package className="h-4 w-4" /> },
    ],
    manager: [
        { title: 'KPI Dashboard', href: '/dashboard', icon: <BarChart3 className="h-4 w-4" /> },
        { title: 'User Management', href: '/users', icon: <UserCog className="h-4 w-4" /> },
        { title: 'Test Catalog', href: '/test-catalog', icon: <ClipboardList className="h-4 w-4" /> },
        { title: 'Inventory', href: '/inventory', icon: <Package className="h-4 w-4" /> },
        { title: 'Reports', href: '/reports', icon: <FileText className="h-4 w-4" /> },
        { title: 'Audit Trail', href: '/audit-logs', icon: <ShieldCheck className="h-4 w-4" /> },
    ],
    phlebotomist: [
        { title: 'Appointments', href: '/dashboard', icon: <Calendar className="h-4 w-4" /> }
    ]
    // Physician and Patient portals will have their own separate layouts/apps ideally,
    // but if they share this, we would add them here.
};

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useUser();

    if (!user) return null;

    const navItems = roleNavItems[user.role] || [];

    return (
        <div className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
            <div className="flex h-14 items-center border-b border-sidebar-border px-4">
                <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-sidebar-primary">
                    <div className="rounded-lg bg-sidebar-primary p-1">
                        <TestTube className="h-5 w-5 text-sidebar-primary-foreground" />
                    </div>
                    <span>LabWise</span>
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <nav className="grid gap-1 px-2">
                    {navItems.map((item, index) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={index}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                        : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                )}
                            >
                                {item.icon}
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="border-t border-sidebar-border p-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-primary font-bold">
                        {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{user.firstName} {user.lastName}</span>
                        <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                    </div>
                </div>
                <Button variant="outline" className="w-full justify-start" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                </Button>
            </div>
        </div>
    );
}
