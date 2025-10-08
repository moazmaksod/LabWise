

'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, redirect } from 'next/navigation';
import { Search, PlusCircle, Loader2, FileSearch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { ClientOrder } from '@/lib/types';
import { format } from 'date-fns';

function OrdersPageComponent() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ClientOrder[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  const fetchOrders = useCallback(async (query?: string) => {
      if (!token) return;
      setIsSearching(true);
      try {
          const url = query ? `/api/v1/orders?q=${query}` : '/api/v1/orders';
          const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
          if (!response.ok) throw new Error('Failed to fetch orders');
          const data = await response.json();
          setSearchResults(data);
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error', description: error.message });
      } finally {
          setIsSearching(false);
      }
  }, [token, toast]);

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if(token) {
        fetchOrders(searchTerm);
    }
  }, [token, searchTerm, fetchOrders]);
  

  const getStatusVariant = (status: string) => {
    switch (status) {
        case 'Complete': return 'default';
        case 'Pending': return 'secondary';
        case 'Partially Collected': return 'outline';
        case 'Cancelled': return 'destructive';
        default: return 'outline';
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>Search for an existing order or create a new one.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-grow">
               <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                  type="search"
                  placeholder="Search by Order ID, Patient Name, MRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
            </div>
            <Button asChild>
              <Link href="/order-entry">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Order
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order List</CardTitle>
          <CardDescription>{searchTerm ? `Showing results for "${searchTerm}"` : "Showing recent orders"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader><TableRow className="bg-secondary hover:bg-secondary"><TableHead>Order ID</TableHead><TableHead>Patient</TableHead><TableHead>Created</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Priority</TableHead></TableRow></TableHeader>
              <TableBody>
                {isSearching ? (Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))) 
                : searchResults.length > 0 ? (searchResults.map((order) => (
                    <TableRow key={order.id}>
                       <TableCell>
                          <Link href={`/order-entry?id=${order.id}`} className="font-mono cursor-pointer hover:underline text-primary">
                            {order.orderId}
                          </Link>
                      </TableCell>
                      <TableCell>
                        {order.patientInfo ? (
                          <>
                            <div className="font-medium">{order.patientInfo.firstName} {order.patientInfo.lastName}</div>
                            <div className="text-sm text-muted-foreground">{order.patientInfo.mrn}</div>
                          </>
                        ) : (
                          <div className="text-muted-foreground">Patient not found</div>
                        )}
                      </TableCell>
                       <TableCell>{format(new Date(order.createdAt), 'PPpp')}</TableCell>
                      <TableCell><Badge variant={getStatusVariant(order.orderStatus)}>{order.orderStatus}</Badge></TableCell>
                      <TableCell className="text-right"><Badge variant={order.priority === 'STAT' ? 'destructive' : 'outline'}>{order.priority}</Badge></TableCell>
                    </TableRow>))) 
                : (<TableRow><TableCell colSpan={5} className="h-24 text-center">{isSearching ? 'Searching...' : 'No orders found.'}</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default function OrdersPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[calc(100vh-8rem)] w-full" />}>
            <OrdersPageComponent />
        </Suspense>
    )
}
