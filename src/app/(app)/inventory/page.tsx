
'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type InventoryItem = {
    id: string;
    itemName: string;
    lotNumber: string;
    expirationDate: string;
    quantityOnHand: number;
    minStockLevel: number;
};

export default function InventoryPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
      itemName: '', lotNumber: '', expirationDate: '', quantityOnHand: 0, minStockLevel: 10
  });

  const fetchInventory = async () => {
      setLoading(true);
      try {
          const token = localStorage.getItem('labwise-token');
          const res = await fetch('/api/v1/inventory', { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) setItems(await res.json());
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => { fetchInventory(); }, []);

  const handleCreate = async () => {
      try {
          const token = localStorage.getItem('labwise-token');
          const res = await fetch('/api/v1/inventory', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(newItem)
          });
          if (res.ok) {
              toast({ title: 'Success', description: 'Item added.' });
              setIsModalOpen(false);
              fetchInventory();
          }
      } catch (e) {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to add item.' });
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-primary">Inventory Management</h1>
            <Button onClick={() => setIsModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
        </div>

        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Lot Number</TableHead>
                        <TableHead>Expiration</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.itemName}</TableCell>
                            <TableCell className="font-mono">{item.lotNumber}</TableCell>
                            <TableCell>{format(new Date(item.expirationDate), 'MM/dd/yyyy')}</TableCell>
                            <TableCell>{item.quantityOnHand}</TableCell>
                            <TableCell>
                                {item.quantityOnHand <= item.minStockLevel ? (
                                    <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1"/> Low Stock</Badge>
                                ) : (
                                    <Badge variant="secondary" className="bg-success/10 text-success"><Package className="w-3 h-3 mr-1"/> In Stock</Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Name</Label>
                        <Input className="col-span-3" value={newItem.itemName} onChange={e => setNewItem({...newItem, itemName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Lot #</Label>
                        <Input className="col-span-3" value={newItem.lotNumber} onChange={e => setNewItem({...newItem, lotNumber: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Expiry</Label>
                        <Input type="date" className="col-span-3" value={newItem.expirationDate} onChange={e => setNewItem({...newItem, expirationDate: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Qty</Label>
                        <Input type="number" className="col-span-3" value={newItem.quantityOnHand} onChange={e => setNewItem({...newItem, quantityOnHand: parseInt(e.target.value)})} />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Min Stock</Label>
                        <Input type="number" className="col-span-3" value={newItem.minStockLevel} onChange={e => setNewItem({...newItem, minStockLevel: parseInt(e.target.value)})} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreate}>Save Item</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
