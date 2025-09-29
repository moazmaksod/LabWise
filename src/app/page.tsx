'use client';

import { useRouter } from 'next/navigation';
import { AreaChart, Beaker, User } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/hooks/use-user';
import type { Role } from '@/lib/types';

export default function LoginPage() {
  const { login } = useUser();
  const router = useRouter();

  const handleLogin = (role: Role) => {
    login(role);
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary p-3">
              <svg
                className="h-8 w-8 text-primary-foreground"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L2 7V17L12 22L22 17V7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 12L2 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 12V22"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"

                  strokeLinejoin="round"
                />
                <path
                  d="M12 12L22 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 4.5L7 9.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <CardTitle className="text-4xl font-bold font-headline">Welcome to LabWise</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            The next-generation Laboratory Information Management System.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <h3 className="mb-6 text-center text-xl font-semibold text-foreground">Select a Persona to Continue</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <PersonaCard
              icon={<User className="h-10 w-10" />}
              title="Receptionist"
              description="Manage patient intake, registration, and scheduling."
              onClick={() => handleLogin('receptionist')}
            />
            <PersonaCard
              icon={<Beaker className="h-10 w-10" />}
              title="Lab Technician"
              description="Process samples, run tests, and manage the analytical workflow."
              onClick={() => handleLogin('technician')}
            />
            <PersonaCard
              icon={<AreaChart className="h-10 w-10" />}
              title="Lab Manager"
              description="Oversee operations, manage inventory, and ensure compliance."
              onClick={() => handleLogin('manager')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PersonaCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <div
      className="group cursor-pointer rounded-xl border-2 border-border bg-card p-6 text-center transition-all duration-300 hover:border-primary hover:shadow-xl hover:-translate-y-2"
      onClick={onClick}
    >
      <div className="mb-4 flex justify-center text-primary transition-colors group-hover:text-accent">
        {icon}
      </div>
      <h4 className="mb-2 text-2xl font-bold font-headline text-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
