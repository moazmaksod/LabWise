
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Search, Loader2, FileSearch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { ClientOrder } from '@/lib/types';
import { format } from 'date-fns';

export default function SearchOrdersPage() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    setToken(storedToken);
  }, []);

  useEffect(() => {
    // Initial fetch without search term to show recent orders
    const fetchRecentOrders = async () => {
        if (!token) return;
        setIsSearching(true);
        try {
            const response = await fetch('/api/v1/orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch recent orders');
            const data = await response.json();
            setSearchResults(data);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSearching(false);
        }
    };
    fetchRecentOrders();
  }, [token, toast]);

  useEffect(() => {
    if (!searchTerm.trim()) {
        // Optional: could re-fetch recent orders here if searchTerm is cleared,
        // or just leave the last search result. For now, we do nothing.
        return;
    }

    const searchDebounce = setTimeout(async () => {
      if (!token) return;
      setIsSearching(true);
      try {
        const response = await fetch(`/api/v1/orders?q=${searchTerm}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not perform order search.' });
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // Increased debounce for more complex search

    return () => clearTimeout(searchDebounce);
  }, [searchTerm, token, toast]);

  const getStatusVariant = (status: string) => {
    switch (status) {
        case 'Complete': return 'default';
        case 'Pending': return 'secondary';
        case 'Cancelled': return 'destructive';
        default: return 'outline';
    }
  }

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Search Orders</h1>
      <Card>
        <CardHeader>
          <CardTitle>Find an Order</CardTitle>
          <CardDescription>Search by Order ID, Patient Name, MRN, or Phone Number.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Start typing to search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-lg"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
          <CardDescription>
            {searchTerm ? `Showing results for "${searchTerm}"` : "Showing recent orders"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary hover:bg-secondary">
                  <TableHead>Order ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isSearching ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : searchResults.length > 0 ? (
                  searchResults.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-muted/80">
                      <TableCell className="font-mono">{order.orderId}</TableCell>
                      <TableCell>
                        <div className="font-medium">{order.patientInfo.firstName} {order.patientInfo.lastName}</div>
                        <div className="text-sm text-muted-foreground">{order.patientInfo.mrn}</div>
                      </TableCell>
                       <TableCell>{format(new Date(order.createdAt), 'PPpp')}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(order.orderStatus)}>{order.orderStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                         <Badge variant={order.priority === 'STAT' ? 'destructive' : 'outline'}>{order.priority}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                     {isSearching ? 'Searching...' : 'No orders found.'}
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
