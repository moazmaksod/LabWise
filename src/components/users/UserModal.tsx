
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientUser, Role } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const userSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['receptionist', 'technician', 'manager', 'phlebotomist', 'physician']),
  // Password is optional for edits, required for new users
  password: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: ClientUser;
  onSave: () => void;
}

export function UserModal({ isOpen, onClose, userToEdit, onSave }: UserModalProps) {
  const { toast } = useToast();
  const isEditing = !!userToEdit;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'receptionist',
      password: '',
    },
  });

  // Reset form when modal opens or userToEdit changes
  useEffect(() => {
    if (isOpen) {
        if (userToEdit) {
            form.reset({
                firstName: userToEdit.firstName,
                lastName: userToEdit.lastName,
                email: userToEdit.email,
                role: userToEdit.role as any,
                password: '', // Don't prefill password
            });
        } else {
            form.reset({
                firstName: '',
                lastName: '',
                email: '',
                role: 'receptionist',
                password: '',
            });
        }
    }
  }, [isOpen, userToEdit, form]);

  const onSubmit = async (data: UserFormValues) => {
    try {
        const token = localStorage.getItem('labwise-token');

        if (!isEditing && !data.password) {
            form.setError('password', { message: 'Password is required for new users' });
            return;
        }

        const url = isEditing ? `/api/v1/users/${userToEdit.id}` : '/api/v1/users';
        const method = isEditing ? 'PUT' : 'POST';

        const body = isEditing ? { ...data, id: userToEdit.id } : data;

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            toast({ title: 'Success', description: `User ${isEditing ? 'updated' : 'created'} successfully.` });
            onSave();
            onClose();
        } else {
            const errorData = await response.json();
            toast({ variant: 'destructive', title: 'Error', description: errorData.message || 'Failed to save user.' });
        }
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the user's details below." : "Create a new user account."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                        <Input placeholder="Jane" {...field} />
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
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="jane.doe@labwise.com" {...field} />
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
                      <SelectItem value="phlebotomist">Phlebotomist</SelectItem>
                      <SelectItem value="physician">Physician</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isEditing ? 'New Password (Optional)' : 'Password'}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{isEditing ? 'Save Changes' : 'Create User'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
