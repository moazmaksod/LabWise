
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

import { Boxes, PlusCircle, MoreHorizontal, Search, Download, AlertTriangle, ShieldAlert } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import type { ClientInventoryItem, Role } from '@/lib/types';

const inventoryItemSchema = z.object({
  id: z.string().optional(),
  itemName: z.string().min(1, 'Item name is required.'),
  lotNumber: z.string().min(1, 'Lot number is required.'),
  expirationDate: z.string().min(1, 'Expiration date is required.'),
  quantityOnHand: z.coerce.number().int().min(0, 'Quantity must be non-negative.'),
  minStockLevel: z.coerce.number().int().min(0, 'Minimum stock must be non-negative.'),
  vendor: z.string().optional(),
  partNumber: z.string().optional(),
});

type InventoryFormValues = z.infer<typeof inventoryItemSchema>;

const InventoryForm = ({
  onSave,
  editingItem,
}: {
  onSave: () => void;
  editingItem: ClientInventoryItem | null;
}) => {
  const { toast } = useToast();
  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: editingItem
      ? { ...editingItem, expirationDate: format(new Date(editingItem.expirationDate), 'yyyy-MM-dd') }
      : {
          itemName: '',
          lotNumber: '',
          expirationDate: '',
          quantityOnHand: 0,
          minStockLevel: 10,
          vendor: '',
          partNumber: '',
        },
  });

  const onSubmit = async (data: InventoryFormValues) => {
    const token = localStorage.getItem('labwise-token');
    const isEditing = !!data.id;
    const apiEndpoint = isEditing ? `/api/v1/inventory/${data.id}` : '/api/v1/inventory';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save inventory item.');
      }

      toast({
        title: `Item ${isEditing ? 'updated' : 'added'} successfully`,
        description: `${data.itemName} (${data.lotNumber}) has been saved.`,
      });
      onSave();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="itemName" render={({ field }) => ( <FormItem><FormLabel>Item Name</FormLabel><FormControl><Input placeholder="Glucose Reagent Kit" {...field} /></FormControl><FormMessage /></FormItem> )} />
          <FormField control={form.control} name="lotNumber" render={({ field }) => ( <FormItem><FormLabel>Lot Number</FormLabel><FormControl><Input placeholder="GRK-12345" {...field} /></FormControl><FormMessage /></FormItem> )} />
          <FormField control={form.control} name="expirationDate" render={({ field }) => ( <FormItem><FormLabel>Expiration Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
          <FormField control={form.control} name="quantityOnHand" render={({ field }) => ( <FormItem><FormLabel>Quantity On Hand</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
          <FormField control={form.control} name="minStockLevel" render={({ field }) => ( <FormItem><FormLabel>Minimum Stock Level</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
          <FormField control={form.control} name="vendor" render={({ field }) => ( <FormItem><FormLabel>Vendor (Optional)</FormLabel><FormControl><Input placeholder="Roche Diagnostics" {...field} /></FormControl><FormMessage /></FormItem> )} />
          <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem className="sm:col-span-2"><FormLabel>Part Number (Optional)</FormLabel><FormControl><Input placeholder="P/N 04404483190" {...field} /></FormControl><FormMessage /></FormItem> )} />
        </div>
        <DialogFooter className="pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : 'Save Item'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<ClientInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClientInventoryItem | null>(null);
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('labwise-token');
    if (!token) return;
    try {
      const response = await fetch('/api/v1/inventory', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch inventory.');
      const data = await response.json();
      setInventory(data);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!userLoading) {
      fetchInventory();
    }
  }, [userLoading, fetchInventory]);

  const handleOpenDialog = (item: ClientInventoryItem | null = null) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleSave = () => {
    setIsFormOpen(false);
    fetchInventory();
  };

  if (userLoading) {
    return <Skeleton className="h-[500px] w-full" />;
  }
  
  const hasAccess = user?.role === 'manager' || user?.role === 'technician';

  if (!hasAccess) {
    return (
        <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
                You do not have permission to access this page.
            </AlertDescription>
        </Alert>
    );
  }

  const isManager = user?.role === 'manager';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="h-6 w-6" /> Inventory Management
              </CardTitle>
              <CardDescription>
                Manage laboratory reagents and consumables.
              </CardDescription>
            </div>
            {isManager && (
              <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search items by name, lot, or part number..." className="pl-10" />
            </div>
             <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary hover:bg-secondary">
                  <TableHead>Item Name</TableHead>
                  <TableHead>Lot #</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : inventory.length > 0 ? (
                  inventory.map((item) => {
                    const isLowStock = item.quantityOnHand < item.minStockLevel;
                    return (
                        <TableRow key={item.id} className={isLowStock ? "bg-yellow-900/40 hover:bg-yellow-900/60" : ""}>
                            <TableCell className="font-medium">{item.itemName}</TableCell>
                            <TableCell>{item.lotNumber}</TableCell>
                            <TableCell>
                                <Badge variant={isLowStock ? 'destructive' : 'secondary'}>
                                {isLowStock && <AlertTriangle className="mr-1 h-3 w-3" />} {item.quantityOnHand}
                                </Badge>
                            </TableCell>
                            <TableCell>{item.minStockLevel}</TableCell>
                            <TableCell>{format(new Date(item.expirationDate), 'MM/dd/yyyy')}</TableCell>
                            <TableCell className="text-right">
                                {isManager ? (
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                ) : (
                                    <span className="text-xs text-muted-foreground">View Only</span>
                                )}
                            </TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No inventory items found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {isManager && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Inventory Item'}</DialogTitle>
                <DialogDescription>
                  {editingItem ? `Updating details for ${editingItem.itemName}.` : 'Add a new reagent or consumable to the inventory.'}
                </DialogDescription>
              </DialogHeader>
              <InventoryForm onSave={handleSave} editingItem={editingItem} />
            </DialogContent>
          </Dialog>
      )}
    </div>
  );
}
