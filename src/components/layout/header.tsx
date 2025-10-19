'use client';

import {
  Bell,
  Search,
  User,
  Users,
  Beaker,
  AreaChart,
  LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useUser } from '@/hooks/use-user';
import type { Role } from '@/lib/types';
import { USERS } from '@/lib/constants';

export function AppHeader() {
  const { user, login, logout } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSwitchPersona = (role: Role) => {
    login(role);
  };
  
  if (!user) return null;

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <h1 className="text-xl font-semibold hidden md:block">
          {
            {
              manager: 'Manager Dashboard',
              receptionist: 'Receptionist Dashboard',
              technician: 'Technician Worklist',
            }[user.role]
          }
        </h1>
      </div>

      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <form className="ml-auto flex-1 sm:flex-initial">
          <div className="relative">
            <Search className="absolute left-2.5 rtl:right-2.5 rtl:left-auto top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search patient, sample, or order..."
              className="pl-8 rtl:pr-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
            />
          </div>
        </form>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                <AvatarFallback>
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{`${user.firstName} ${user.lastName}`}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Switch Persona</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleSwitchPersona('receptionist')} disabled={user.role === 'receptionist'}>
                <User className="mr-2 h-4 w-4" />
                <span>Receptionist</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSwitchPersona('technician')} disabled={user.role === 'technician'}>
                <Beaker className="mr-2 h-4 w-4" />
                <span>Technician</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSwitchPersona('manager')} disabled={user.role === 'manager'}>
                <AreaChart className="mr-2 h-4 w-4" />
                <span>Manager</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
