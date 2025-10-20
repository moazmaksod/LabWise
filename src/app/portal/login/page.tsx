
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Beaker, Loader2, User, FileText } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import type { Role } from '@/lib/types';
import { useEffect } from 'react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function PortalLoginPage() {
  const { login, user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (!loading && user) {
        // If a user is already logged in, redirect them.
        // Internal users go to the main dashboard, external users to their portal dashboard.
        if (['manager', 'receptionist', 'technician', 'phlebotomist'].includes(user.role)) {
            router.push('/dashboard');
        } else {
            router.push('/portal/dashboard');
        }
    }
  }, [user, loading, router]);


  const handleQuickLogin = (role: Role) => {
    if (role === 'physician') {
        form.setValue('email', 'msmith@clinic.com');
        form.setValue('password', 'password123');
    } else if (role === 'patient') {
        form.setValue('email', 'johndoe@email.com');
        form.setValue('password', 'password123');
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    const success = await login(data.email, data.password);
    if (success) {
      router.push('/dashboard'); // useUser hook will redirect them appropriately from there
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

  if (loading || user) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
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
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 12L2 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-4xl font-bold font-headline">LabWise Portal</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Secure access for Physicians and Patients.
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
                      <Input type="email" placeholder="your.email@example.com" {...field} />
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
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Sign In'}
              </Button>
            </form>
          </Form>
           <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><Separator /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Quick Login (For Demo)</span>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => handleQuickLogin('physician')}>
                        <User className="mr-2 h-4 w-4" /> Physician
                    </Button>
                     <Button variant="outline" onClick={() => handleQuickLogin('patient')}>
                        <FileText className="mr-2 h-4 w-4" /> Patient
                    </Button>
                </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
