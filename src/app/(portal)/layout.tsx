
'use client';

import Link from 'next/link';
import { useUser } from '@/context/user-context';
import { Button } from '@/components/ui/button';
import { LogOut, Stethoscope, User } from 'lucide-react';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useUser();

  if (!user) return null; // Protected by middleware/redirect in page usually

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <div className="bg-primary rounded-lg p-1">
                    {user.role === 'physician' ? <Stethoscope className="h-6 w-6 text-primary-foreground" /> : <User className="h-6 w-6 text-primary-foreground" />}
                  </div>
                  <span className="font-bold text-xl text-primary">LabWise Portal</span>
              </div>

              <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                      <div className="font-medium text-sm">{user.firstName} {user.lastName}</div>
                      <div className="text-xs text-muted-foreground capitalize">{user.role === 'physician' ? 'Provider' : 'Patient'}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={logout}>
                      <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </Button>
              </div>
          </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
      </main>
    </div>
  );
}
