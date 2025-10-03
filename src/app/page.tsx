'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AreaChart, Beaker, Loader2, User } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { USERS } from '@/lib/constants';
import type { Role } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLoginAs = (role: Role) => {
    const user = Object.values(USERS).find((u) => u.role === role);
    if (user) {
      form.setValue('email', user.email);
      form.setValue('password', 'password123'); // Use a placeholder password
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    const success = await login(data.email, data.password);
    if (success) {
      router.push('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid email or password. Please try again.',
      });
      form.setError('password', {
        type: 'manual',
        message: 'Invalid email or password.',
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
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
                <path d="M12 12L2 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 12V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 4.5L7 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-4xl font-bold font-headline">Welcome to LabWise</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Sign in to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@email.com" {...field} />
                    </FormControl>
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
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading || form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Sign In'}
              </Button>
            </form>
          </Form>

          <div className="mt-6">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        Or login as
                    </span>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => handleLoginAs('receptionist')}>
                    <User className="mr-2 h-4 w-4" />
                    Receptionist
                </Button>
                 <Button variant="outline" onClick={() => handleLoginAs('technician')}>
                    <Beaker className="mr-2 h-4 w-4" />
                    Technician
                </Button>
                 <Button variant="outline" onClick={() => handleLoginAs('manager')}>
                    <AreaChart className="mr-2 h-4 w-4" />
                    Manager
                </Button>
                <Button variant="outline" onClick={() => handleLoginAs('phlebotomist')}>
                    <Beaker className="mr-2 h-4 w-4" />
                    Phlebotomist
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
