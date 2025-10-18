
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

import { Boxes, Search, AlertTriangle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import type { ClientInventoryItem } from '@/lib/types';

export default function InventorySearchPage() {
  const [inventory, setInventory] = useState<ClientInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const filteredInventory = inventory.filter(item => 
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.partNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    fetchInventory();
  }, [fetchInventory]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="h-6 w-6" /> Inventory Search
              </CardTitle>
              <CardDescription>
                Search for laboratory reagents and consumables.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search items by name, lot, or part number..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
                  <TableHead>Expires</TableHead>
                  <TableHead>Vendor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredInventory.length > 0 ? (
                  filteredInventory.map((item) => {
                    const isLowStock = item.quantityOnHand < item.minStockLevel;
                    return (
                        <TableRow key={item.id} className={isLowStock ? "bg-yellow-900/40" : ""}>
                            <TableCell className="font-medium">{item.itemName}</TableCell>
                            <TableCell>{item.lotNumber}</TableCell>
                            <TableCell>
                                <Badge variant={isLowStock ? 'destructive' : 'secondary'}>
                                {isLowStock && <AlertTriangle className="mr-1 h-3 w-3" />} {item.quantityOnHand}
                                </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(item.expirationDate), 'MM/dd/yyyy')}</TableCell>
                            <TableCell>{item.vendor || 'N/A'}</TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No inventory items found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
