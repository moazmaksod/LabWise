
'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, MoreHorizontal, ShieldAlert } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import type { ClientUser, Role } from '@/lib/types';


const userFormSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['receptionist', 'technician', 'manager', 'physician', 'patient']),
  password: z.string().optional(),
}).refine(data => {
    if (!data.id) { // Only require password for new users
        return data.password && data.password.length >= 8;
    }
    return true;
}, {
    message: "Password must be at least 8 characters for new users",
    path: ["password"],
});


type UserFormValues = z.infer<typeof userFormSchema>;

export default function UserManagementPage() {
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ClientUser | null>(null);
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'receptionist',
    },
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('labwise-token');
      const response = await fetch('/api/v1/users', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 403) {
           throw new Error('You do not have permission to view users.');
        }
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not fetch users.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading && user?.role === 'manager') {
      fetchUsers();
    }
  }, [user, userLoading]);

  if (userLoading) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-10 w-28" />
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-96" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        </div>
    )
  }

  if (user?.role !== 'manager') {
    // Redirect non-managers after a short delay so they can see the message
    setTimeout(() => {
        router.push('/dashboard');
    }, 3000);

    return (
        <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
                You do not have permission to access this page. You will be redirected to your dashboard.
            </AlertDescription>
        </Alert>
    );
  }

  const handleEdit = (user: ClientUser) => {
    setEditingUser(user);
    form.reset({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      password: '', // Clear password field for edits
    });
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingUser(null);
    form.reset({
        id: undefined,
        firstName: '',
        lastName: '',
        email: '',
        role: 'receptionist',
        password: '',
    });
    setIsFormOpen(true);
  };

  const onSubmit = async (data: UserFormValues) => {
    const apiEndpoint = data.id ? `/api/v1/users` : '/api/v1/users';
    const method = data.id ? 'PUT' : 'POST';
    const token = localStorage.getItem('labwise-token');

    // Don't send an empty password field on updates
    if (data.id && !data.password) {
        delete data.password;
    }

    try {
        const response = await fetch(apiEndpoint, {
            method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save user.');
        }

        toast({
            title: `User ${data.id ? 'updated' : 'created'} successfully`,
        });
        setIsFormOpen(false);
        fetchUsers(); // Refresh the list
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error saving user',
            description: error.message,
        });
    }
  };

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">User Management</h1>
             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button onClick={handleAddNew}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add User
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                        <DialogDescription>
                           {editingUser ? 'Update the details for this user.' : 'Fill in the details for the new user.'}
                        </DialogDescription>
                    </DialogHeader>
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                                                <SelectItem value="receptionist">Receptionist</SelectItem>
                                                <SelectItem value="technician">Technician</SelectItem>
                                                <SelectItem value="manager">Manager</SelectItem>
                                                 <SelectItem value="physician">Physician</SelectItem>
                                                <SelectItem value="patient">Patient</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {!editingUser && (
                                 <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                             <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                                <Button type="submit">Save</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>A list of all users in the LabWise system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary hover:bg-secondary">
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Created At</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={user.avatar} alt={user.firstName} />
                            <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{user.role}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={user.isActive ? 'secondary' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                       <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(user)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Deactivate</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    