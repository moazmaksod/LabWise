

'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, redirect } from 'next/navigation';
import { Search, PlusCircle, Loader2, FileSearch, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { ClientOrder } from '@/lib/types';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function OrdersPageComponent() {
  const { toast } = useToast();
  const { user } = useUser();
  const [token, setToken] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchResults, setSearchResults] = useState<ClientOrder[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  const fetchOrders = useCallback(async () => {
      if (!token) return;
      setIsSearching(true);
      try {
          const params = new URLSearchParams();
          if (searchTerm) params.append('q', searchTerm);
          if (statusFilter && statusFilter !== 'All') params.append('status', statusFilter);
          if (priorityFilter && priorityFilter !== 'All') params.append('priority', priorityFilter);

          const url = `/api/v1/orders?${params.toString()}`;
          const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
          if (!response.ok) throw new Error('Failed to fetch orders');
          const data = await response.json();
          setSearchResults(data);
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error', description: error.message });
      } finally {
          setIsSearching(false);
      }
  }, [token, toast, searchTerm, statusFilter, priorityFilter]);

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if(token) {
        const debounce = setTimeout(() => {
            fetchOrders();
        }, 300);
        return () => clearTimeout(debounce);
    }
  }, [token, searchTerm, statusFilter, priorityFilter, fetchOrders]);
  

  const getStatusVariant = (status: string) => {
    switch (status) {
        case 'Complete': return 'default';
        case 'In Progress': return 'secondary';
        case 'Partially Complete': return 'secondary';
        case 'Pending':
        case 'Partially Collected': 
             return 'outline';
        case 'Cancelled': return 'destructive';
        default: return 'outline';
    }
  }

  const canCreateOrder = user?.role === 'manager' || user?.role === 'receptionist' || user?.role === 'physician';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Orders</CardTitle>
              <CardDescription>Search, filter, and manage all patient orders.</CardDescription>
            </div>
             {canCreateOrder && (
                <Button asChild>
                  <Link href="/order-entry">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Order
                  </Link>
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
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
            <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                 <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Statuses</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Partially Collected">Partially Collected</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Partially Complete">Partially Complete</SelectItem>
                        <SelectItem value="Complete">Complete</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-full md:w-[150px]">
                        <SelectValue placeholder="Filter by priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Priorities</SelectItem>
                        <SelectItem value="STAT">STAT</SelectItem>
                        <SelectItem value="Routine">Routine</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order List</CardTitle>
          <CardDescription>
            {isSearching ? 'Applying filters...' : `Showing ${searchResults.length} results.`}
            </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader><TableRow className="bg-secondary hover:bg-secondary"><TableHead>Order ID</TableHead><TableHead>Patient</TableHead><TableHead>Created</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Priority</TableHead></TableRow></TableHeader>
              <TableBody>
                {isSearching ? (Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))) 
                : searchResults.length > 0 ? (searchResults.map((order) => {
                    const isPhysician = user?.role === 'physician';
                    const isReceptionist = user?.role === 'receptionist';
                    
                    let canEdit = user?.role === 'manager';
                    if (isPhysician && order.createdBy === user?.id) {
                        canEdit = true;
                    }
                    if (isReceptionist && ['Pending', 'Partially Collected'].includes(order.orderStatus)) {
                        canEdit = true;
                    }
                    
                    const orderIdCellContent = (
                        <span className={cn("font-mono", canEdit && "cursor-pointer hover:underline text-primary")}>
                            {order.orderId}
                        </span>
                    );
                    
                    return (
                        <TableRow key={order.id} className={cn(canEdit && "cursor-pointer hover:bg-muted/50")} onClick={() => canEdit && router.push(`/order-entry?id=${order.id}`)}>
                           <TableCell>
                                <Tooltip delayDuration={100}>
                                    <TooltipTrigger asChild>
                                        <div>{orderIdCellContent}</div>
                                    </TooltipTrigger>
                                    {isPhysician && !canEdit && (
                                    <TooltipContent>
                                        <p>This order was created by another user and cannot be edited.</p>
                                    </TooltipContent>
                                    )}
                                </Tooltip>
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
                        </TableRow>
                    );
                })) 
                : (<TableRow><TableCell colSpan={5} className="h-24 text-center">{isSearching ? 'Searching...' : 'No orders found matching your criteria.'}</TableCell></TableRow>)}
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
