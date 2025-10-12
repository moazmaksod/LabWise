
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2, Info, CheckCircle, AlertTriangle, CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, addDays } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { ClientOrder, OrderSample } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';

function AccessioningPageComponent() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundOrders, setFoundOrders] = useState<ClientOrder[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    if (storedToken) setToken(storedToken);
  }, []);

  const fetchCollectedOrders = useCallback(async (date: Date, authToken: string) => {
    setIsSearching(true);
    setFoundOrders([]);
    try {
        const dateString = format(date, 'yyyy-MM-dd');
        const response = await fetch(`/api/v1/orders?collectedDate=${dateString}&sampleStatus=Collected`, { headers: { 'Authorization': `Bearer ${authToken}` }});
        if (!response.ok) {
            throw new Error('Failed to fetch orders waiting for accession.');
        }
        const data = await response.json();
        setFoundOrders(data);
        if (data.length === 0) {
           toast({ title: 'No Orders Found', description: `No collected samples waiting for accession on ${format(date, 'PPP')}.` });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSearching(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (token && !orderSearchTerm) {
      fetchCollectedOrders(selectedDate, token);
    }
  }, [token, selectedDate, fetchCollectedOrders, orderSearchTerm]);

  const handleSearch = useCallback(async () => {
    if (!orderSearchTerm.trim() || !token) {
        if (!orderSearchTerm.trim()) {
            // If search is cleared, fetch default list for the date
            fetchCollectedOrders(selectedDate, token);
        }
        return;
    };
    setIsSearching(true);
    setFoundOrders([]);
    try {
        const response = await fetch(`/api/v1/orders?q=${orderSearchTerm}`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Order search failed.');
        }
        const data = await response.json();
        setFoundOrders(data);
        if (data.length === 0) {
            toast({ variant: 'destructive', title: 'Not Found', description: 'No order found with that ID or patient info.' });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSearching(false);
    }
  }, [orderSearchTerm, token, toast, fetchCollectedOrders, selectedDate]);

  const handleAccessionSample = useCallback(async (orderId: string, sampleId: string) => {
    if (!token) return;

    try {
        const response = await fetch('/api/v1/samples/accession', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({ orderId, sampleId }),
        });
        
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.message || 'Failed to accession sample.');
        
        toast({ title: 'Success', description: `Sample ${resData.accessionNumber} accessioned.` });
        
        // Refresh order data by locally updating the state
        setFoundOrders(prevOrders => prevOrders.map(order => {
            if (order.id !== orderId) return order;
            
            const newSamples = order.samples.map(s => {
                if (s.sampleId === sampleId) {
                    return { ...s, status: 'InLab' as const, accessionNumber: resData.accessionNumber, receivedTimestamp: new Date().toISOString() };
                }
                return s;
            });
            return { ...order, samples: newSamples };
        }));

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Accession Failed', description: error.message });
    }
  }, [token, toast]);

  const getStatusVariant = (status: OrderSample['status']) => {
    switch (status) {
        case 'InLab': return 'default';
        case 'Collected': return 'secondary';
        case 'AwaitingCollection': return 'outline';
        case 'Rejected': return 'destructive';
        default: return 'outline';
    }
  };
  
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
        setSelectedDate(date);
    }
  }
  
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
        <Card>
            <CardHeader>
                <CardTitle>Sample Accessioning</CardTitle>
                <CardDescription>Search for an order or view collected samples waiting to be received into the lab.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Enter Order ID, Patient Name/MRN to override list..."
                            value={orderSearchTerm}
                            onChange={(e) => setOrderSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="pl-10"
                        />
                    </div>
                     <div className="flex items-center gap-2 justify-between">
                         <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleDateChange(subDays(selectedDate, 1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[180px] justify-start text-left font-normal",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" onPointerDownOutside={(e) => e.preventDefault()}>
                                    <Calendar mode="single" selected={selectedDate} onSelect={handleDateChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <Button variant="outline" onClick={() => handleDateChange(new Date())}>Today</Button>
                             <Button variant="outline" size="icon" onClick={() => handleDateChange(addDays(selectedDate, 1))}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                         </div>
                        <Button onClick={handleSearch} disabled={isSearching || !orderSearchTerm}>
                            {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Search
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        {isSearching && <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>}
        
        {!isSearching && foundOrders.length === 0 && (
            <div className="text-center text-muted-foreground py-16">
                <p className="text-lg">No orders found.</p>
                <p>{orderSearchTerm ? `No results for "${orderSearchTerm}".` : `No samples waiting for accession on ${format(selectedDate, 'PPP')}.`}</p>
            </div>
        )}

        {!isSearching && foundOrders.map(order => (
             <Card key={order.id}>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Order Details: {order.orderId}</CardTitle>
                            <CardDescription>
                                Patient: {order.patientInfo?.firstName} {order.patientInfo?.lastName} (MRN: {order.patientInfo?.mrn})
                            </CardDescription>
                        </div>
                         <Badge variant={order.priority === 'STAT' ? 'destructive' : 'outline'} className="text-base">{order.priority}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {order.samples.map(sample => (
                        <Card key={sample.sampleId} className={cn("bg-secondary/50", sample.status === 'InLab' && 'bg-green-900/20')}>
                             <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <CardTitle className="text-lg">{sample.sampleType}</CardTitle>
                                <Badge variant={getStatusVariant(sample.status)}>{sample.status}</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="font-semibold">Tests:</p>
                                        <ul className="list-disc list-inside text-muted-foreground">
                                            {sample.tests.map(t => <li key={t.testCode}>{t.name}</li>)}
                                        </ul>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {sample.status === 'InLab' ? (
                                            <>
                                                <div className="text-sm text-right">
                                                    <p className='font-semibold'>{sample.accessionNumber}</p>
                                                    <p className='text-muted-foreground'>{format(new Date(sample.receivedTimestamp!), 'PPpp')}</p>
                                                </div>
                                                <Button variant="ghost" disabled className="text-green-400">
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Accessioned
                                                </Button>
                                            </>
                                        ) : sample.status === 'Collected' ? (
                                            <>
                                                {sample.collectionTimestamp && (
                                                    <div className="text-sm text-muted-foreground">
                                                        <p>Collected:</p>
                                                        <p>{format(new Date(sample.collectionTimestamp), 'PPpp')}</p>
                                                    </div>
                                                )}
                                                <Button onClick={() => handleAccessionSample(order.id, sample.sampleId)}>
                                                    <Check className="mr-2 h-4 w-4" />
                                                    Receive & Accession
                                                </Button>
                                            </>
                                        ) : (
                                            <Button variant="outline" disabled>
                                                <AlertTriangle className="mr-2 h-4 w-4" />
                                                Cannot Accession
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </CardContent>
             </Card>
        ))}
    </div>
  );
}

export default function AccessioningPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[calc(100vh-8rem)] w-full" />}>
            <AccessioningPageComponent />
        </Suspense>
    )
}
