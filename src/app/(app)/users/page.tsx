
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, Shield, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUser } from '@/context/user-context';
import { useToast } from '@/hooks/use-toast';
import { ClientUser } from '@/lib/types';
import { UserModal } from '@/components/users/UserModal';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';

export default function UsersPage() {
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ClientUser | undefined>(undefined);

  // Delete Confirmation State
  const [userToDelete, setUserToDelete] = useState<ClientUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('labwise-token');
      const response = await fetch('/api/v1/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch users.' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser?.role === 'manager') {
        fetchUsers();
    }
  }, [currentUser, fetchUsers]);

  const handleCreateUser = () => {
    setSelectedUser(undefined);
    setIsModalOpen(true);
  };

  const handleEditUser = (user: ClientUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (user: ClientUser) => {
      setUserToDelete(user);
  }

  const confirmDelete = async () => {
      if (!userToDelete) return;

      try {
        const token = localStorage.getItem('labwise-token');
        const response = await fetch(`/api/v1/users/${userToDelete.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            toast({ title: 'Success', description: 'User deactivated successfully.' });
            fetchUsers();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to deactivate user.' });
        }
      } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
      } finally {
          setUserToDelete(null);
      }
  }

  const filteredUsers = users.filter(u =>
    u.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (currentUser?.role !== 'manager') {
      return <div className="p-8 text-center text-muted-foreground">Access Denied. Manager role required.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage system access and roles.</p>
        </div>
        <Button onClick={handleCreateUser}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">Loading users...</TableCell>
                </TableRow>
            ) : filteredUsers.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">No users found.</TableCell>
                </TableRow>
            ) : (
                filteredUsers.map((user) => (
                <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                        <Badge variant="outline" className="capitalize">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                        {user.isActive ? (
                            <Badge className="bg-success hover:bg-success/80 text-success-foreground">Active</Badge>
                        ) : (
                            <Badge variant="destructive">Inactive</Badge>
                        )}
                    </TableCell>
                    <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                        <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(user)}>
                            {user.isActive ? <Ban className="h-4 w-4 text-destructive" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                        </Button>
                    </div>
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userToEdit={selectedUser}
        onSave={fetchUsers}
      />

      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Confirm Deactivation</DialogTitle>
            <DialogDescription>
                Are you sure you want to deactivate <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong>?
                They will no longer be able to log in.
            </DialogDescription>
            </DialogHeader>
            <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Deactivate</Button>
            </DialogFooter>
        </DialogContent>
       </Dialog>
    </div>
  );
}
