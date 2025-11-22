
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, FlaskConical } from 'lucide-react';
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
import { ClientTestCatalogItem } from '@/lib/types';
import { TestCatalogModal } from '@/components/test-catalog/TestCatalogModal';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function TestCatalogPage() {
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [tests, setTests] = useState<ClientTestCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<ClientTestCatalogItem | undefined>(undefined);
  const [testToDelete, setTestToDelete] = useState<ClientTestCatalogItem | null>(null);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('labwise-token');
      const response = await fetch('/api/v1/test-catalog', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTests(data);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch test catalog.' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Anyone can view, but only manager can edit (enforced by API and UI buttons)
    fetchTests();
  }, [fetchTests]);

  const handleCreateTest = () => {
    setSelectedTest(undefined);
    setIsModalOpen(true);
  };

  const handleEditTest = (test: ClientTestCatalogItem) => {
    setSelectedTest(test);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (test: ClientTestCatalogItem) => {
      setTestToDelete(test);
  }

  const confirmDelete = async () => {
      if (!testToDelete) return;

      try {
        const token = localStorage.getItem('labwise-token');
        const response = await fetch(`/api/v1/test-catalog/${testToDelete.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            toast({ title: 'Success', description: 'Test deactivated successfully.' });
            fetchTests();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to deactivate test.' });
        }
      } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
      } finally {
          setTestToDelete(null);
      }
  }

  const filteredTests = tests.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.testCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isManager = currentUser?.role === 'manager';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Catalog</h1>
          <p className="text-muted-foreground">Manage available tests, panels, and reference ranges.</p>
        </div>
        {isManager && (
            <Button onClick={handleCreateTest}>
            <Plus className="mr-2 h-4 w-4" /> Add Test
            </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by test name or code..."
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
              <TableHead className="w-[100px]">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Specimen</TableHead>
              <TableHead>TAT</TableHead>
              <TableHead>Type</TableHead>
              {isManager && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow>
                    <TableCell colSpan={isManager ? 6 : 5} className="h-24 text-center">Loading tests...</TableCell>
                </TableRow>
            ) : filteredTests.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={isManager ? 6 : 5} className="h-24 text-center">No tests found.</TableCell>
                </TableRow>
            ) : (
                filteredTests.map((test) => (
                <TableRow key={test.id}>
                    <TableCell className="font-mono font-medium">{test.testCode}</TableCell>
                    <TableCell>{test.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                        {test.specimenRequirements.minVolume} {test.specimenRequirements.units} {test.specimenRequirements.tubeType}
                    </TableCell>
                    <TableCell>{test.turnaroundTime.value} {test.turnaroundTime.units}</TableCell>
                    <TableCell>
                        {test.isPanel ? (
                             <Badge variant="secondary">Panel</Badge>
                        ) : (
                             <Badge variant="outline">Test</Badge>
                        )}
                    </TableCell>
                    {isManager && (
                        <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditTest(test)}>
                            <Pencil className="h-4 w-4" />
                            </Button>
                             <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(test)}>
                                {test.isActive ? <Ban className="h-4 w-4 text-destructive" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                            </Button>
                        </div>
                        </TableCell>
                    )}
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>

      <TestCatalogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        testToEdit={selectedTest}
        onSave={fetchTests}
      />

       <Dialog open={!!testToDelete} onOpenChange={(open) => !open && setTestToDelete(null)}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Confirm Deactivation</DialogTitle>
            <DialogDescription>
                Are you sure you want to deactivate <strong>{testToDelete?.name}</strong>?
                It will no longer be orderable.
            </DialogDescription>
            </DialogHeader>
            <DialogFooter>
            <Button variant="outline" onClick={() => setTestToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Deactivate</Button>
            </DialogFooter>
        </DialogContent>
       </Dialog>
    </div>
  );
}
