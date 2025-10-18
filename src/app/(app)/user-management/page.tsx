
'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, MoreHorizontal, ShieldAlert, Users, Filter, Search, Download, Mail, FileUp, Calendar, Trash2 } from 'lucide-react';
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
  DropdownMenuSeparator,
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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';
import { format } from 'date-fns';


const userFormSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['receptionist', 'technician', 'manager', 'physician', 'patient', 'phlebotomist']),
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

  const roleBadgeStyles: Record<Role, string> = {
    manager: 'bg-red-200/20 text-red-400 border-red-400/50',
    technician: 'bg-green-200/20 text-green-400 border-green-400/50',
    receptionist: 'bg-yellow-200/20 text-yellow-400 border-yellow-400/50',
    physician: 'bg-blue-200/20 text-blue-400 border-blue-400/50',
    patient: 'bg-gray-200/20 text-gray-400 border-gray-400/50',
    phlebotomist: 'bg-purple-200/20 text-purple-400 border-purple-400/50',
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filters & Search
                </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search users by name or email..." className="pl-10" />
                </div>
                <Select>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="technician">Technician</SelectItem>
                        <SelectItem value="receptionist">Receptionist</SelectItem>
                        <SelectItem value="physician">Physician</SelectItem>
                        <SelectItem value="patient">Patient</SelectItem>
                        <SelectItem value="phlebotomist">Phlebotomist</SelectItem>
                    </SelectContent>
                </Select>
                <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </CardContent>
        </Card>
      
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        System Users ({users.length})
                    </CardTitle>
                    <CardDescription>Manage user accounts, roles, and training records.</CardDescription>
                </div>
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
                                <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                 <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="john.doe@email.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                 <FormField control={form.control} name="role" render={({ field }) => ( <FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl><SelectContent><SelectItem value="receptionist">Receptionist</SelectItem><SelectItem value="technician">Technician</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="physician">Physician</SelectItem><SelectItem value="patient">Patient</SelectItem><SelectItem value="phlebotomist">Phlebotomist</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                {!editingUser && ( <FormField control={form.control} name="password" render={({ field }) => ( <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} /> )}
                                 <DialogFooter>
                                    <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                                    <Button type="submit">Save</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border-b">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-grow">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                    </div>
                ))
            ) : (
                users.map((user) => (
                    <AccordionItem value={user.id} key={user.id}>
                        <AccordionTrigger className="hover:no-underline px-4">
                            <div className="flex items-center gap-4 text-left w-full">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar} alt={user.firstName} />
                                    <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1 flex-grow">
                                    <div className="font-medium">{user.firstName} {user.lastName}</div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Mail className="h-3 w-3" />
                                        <span>{user.email}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant="outline" className={cn("capitalize", roleBadgeStyles[user.role])}>
                                      {user.role}
                                    </Badge>
                                    <Badge variant="outline" className={cn(user.isActive ? 'text-green-400 bg-green-900/40 border-green-400/50' : 'text-red-400 bg-red-900/40 border-red-400/50')}>
                                      {user.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="bg-muted/30">
                            <div className="p-4 space-y-4">
                                <h4 className="font-semibold">Training & Competency Records</h4>
                                {user.trainingRecords && user.trainingRecords.length > 0 ? (
                                    <div className="space-y-2">
                                        {user.trainingRecords.map((record, index) => (
                                            <div key={index} className="flex justify-between items-center text-sm p-2 rounded-md bg-background/50">
                                                <span>{record.documentName}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4 text-muted-foreground" /> Expires: {format(new Date(record.expiryDate), 'MM/dd/yyyy')}</span>
                                                    <Button variant="ghost" size="sm">View</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">No training records found.</p>
                                )}
                                <div className="pt-4 border-t border-border/50 flex justify-between items-center">
                                    <Button variant="outline" size="sm">
                                        <FileUp className="mr-2 h-4 w-4" />
                                        Upload Document
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="ghost">
                                          <MoreHorizontal className="h-4 w-4" />
                                          <span className="sr-only">Toggle menu</span>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleEdit(user)}>Edit User</DropdownMenuItem>
                                        <DropdownMenuItem>Deactivate User</DropdownMenuItem>
                                         <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-400">Delete User</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))
            )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
