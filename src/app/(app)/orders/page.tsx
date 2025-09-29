
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, PlusCircle, X, Loader2, User, ShieldAlert, FilePlus, TestTube, FileSearch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import type { ClientPatient, ClientTestCatalogItem, ClientUser, ClientOrder } from '@/lib/types';
import { format } from 'date-fns';

const orderFormSchema = z.object({
  patientId: z.string().min(1, 'A patient must be selected.'),
  physicianId: z.string().min(1, 'An ordering physician must be selected.'),
  icd10Code: z.string().min(3, 'A valid ICD-10 code is required.'),
  testIds: z.array(z.string()).min(1, 'At least one test must be added to the order.'),
  sampleType: z.string().default('Whole Blood'), // Default value, can be enhanced later
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

function NewOrderForm({ patient, onOrderCreated }: { patient: ClientPatient, onOrderCreated: () => void }) {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  const [isTestPopoverOpen, setIsTestPopoverOpen] = useState(false);
  const [physicians, setPhysicians] = useState<ClientUser[]>([]);
  const [testSearchInput, setTestSearchInput] = useState('');
  const [testSearchResults, setTestSearchResults] = useState<ClientTestCatalogItem[]>([]);
  const [isTestSearching, setIsTestSearching] = useState(false);
  const [selectedTests, setSelectedTests] = useState<ClientTestCatalogItem[]>([]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      patientId: patient.id,
      physicianId: '',
      icd10Code: '',
      testIds: [],
    },
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    if (storedToken) setToken(storedToken);
  }, []);

  const fetchPhysicians = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/v1/users?role=physician', {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch physicians');
      const data = await response.json();
      setPhysicians(data);
    } catch (error) {
       toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch physician list.' });
    }
  }, [token, toast]);

  useEffect(() => {
    fetchPhysicians();
  }, [token, fetchPhysicians]);
  
  const handleTestPopoverOpenChange = useCallback(async (open: boolean) => {
    setIsTestPopoverOpen(open);
    if (open && !testSearchInput.trim() && token) {
        setIsTestSearching(true);
        try {
            const response = await fetch(`/api/v1/test-catalog`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Test fetch failed');
            const data = await response.json();
            setTestSearchResults(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch test list.' });
        } finally {
            setIsTestSearching(false);
        }
    } else if (!open) {
        setTestSearchResults([]);
    }
  }, [testSearchInput, token, toast]);

  const handleSelectTest = (test: ClientTestCatalogItem) => {
    if (!selectedTests.find(t => t.id === test.id)) {
      const newSelectedTests = [...selectedTests, test];
      setSelectedTests(newSelectedTests);
      form.setValue('testIds', newSelectedTests.map(t => t.testCode));
    }
    setTestSearchInput('');
    setTestSearchResults([]);
    setIsTestPopoverOpen(false);
  };

  const handleRemoveTest = (testId: string) => {
    const newSelectedTests = selectedTests.filter(t => t.id !== testId);
    setSelectedTests(newSelectedTests);
    form.setValue('testIds', newSelectedTests.map(t => t.testCode));
  };
  
  useEffect(() => {
    if (!isTestPopoverOpen) return;

    const search = setTimeout(async () => {
      if (!token || !testSearchInput.trim()) return;
      setIsTestSearching(true);
      try {
        const endpoint = `/api/v1/test-catalog?q=${testSearchInput}`;
        const response = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Test search failed');
        const data = await response.json();
        setTestSearchResults(data);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not search tests.' });
      } finally {
        setIsTestSearching(false);
      }
    }, 300);

    return () => clearTimeout(search);
  }, [testSearchInput, token, toast, isTestPopoverOpen]);
  
  const onSubmit = async (data: OrderFormValues) => {
    if (!token) return;
    try {
        const payload = {
            patientId: data.patientId,
            physicianId: data.physicianId,
            icd10Code: data.icd10Code,
            priority: 'Routine',
            samples: [{ sampleType: data.sampleType, testCodes: data.testIds }]
        };
        
        const response = await fetch('/api/v1/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create order.');
        }
        
        const newOrder = await response.json();
        toast({ title: "Order Created Successfully", description: `Order ID: ${newOrder.orderId}` });
        onOrderCreated();

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Order Creation Failed', description: error.message });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="physicianId" render={({ field }) => ( <FormItem><FormLabel>Ordering Physician</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a physician" /></SelectTrigger></FormControl><SelectContent>{physicians.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="icd10Code" render={({ field }) => ( <FormItem><FormLabel>ICD-10 Diagnosis Code</FormLabel><FormControl><Input placeholder="e.g., R53.83" {...field} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <div className="space-y-2">
            <FormLabel>Add Tests</FormLabel>
            <Popover open={isTestPopoverOpen} onOpenChange={handleTestPopoverOpenChange}>
                <PopoverTrigger asChild>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Click or type to search for tests..." 
                            className="pl-10" 
                            value={testSearchInput} 
                            onChange={(e) => setTestSearchInput(e.target.value)} 
                        />
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                     <Command><CommandList>{isTestSearching && <CommandEmpty>Searching...</CommandEmpty>}{!isTestSearching && testSearchResults.length === 0 && <CommandEmpty>No tests found.</CommandEmpty>}<CommandGroup>{testSearchResults.map((test) => (<CommandItem key={test.id} value={test.name} onSelect={() => handleSelectTest(test)}><TestTube className="mr-2 h-4 w-4" /><span>{test.name} ({test.testCode})</span></CommandItem>))}</CommandGroup></CommandList></Command>
                </PopoverContent>
            </Popover>
        </div>
        <div className="space-y-2">
            <FormLabel>Selected Tests</FormLabel>
            {selectedTests.length > 0 ? ( <div className="flex flex-wrap gap-2">{selectedTests.map(test => (<Badge key={test.id} variant="secondary" className="text-base py-1 pl-3 pr-1">{test.name}<button type="button" onClick={() => handleRemoveTest(test.id)} className="ml-2 rounded-full p-0.5 hover:bg-destructive/20 text-destructive"><X className="h-3 w-3" /></button></Badge>))}</div>) : (<div className="text-sm text-muted-foreground">No tests added yet.</div>)}
            <FormField control={form.control} name="testIds" render={({ field }) => ( <FormItem><FormMessage /></FormItem>)} />
        </div>
        <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Order
            </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

function NewOrderDialogContent({ onOrderCreated }: { onOrderCreated: () => void }) {
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<ClientPatient[]>([]);
  const [isPatientSearching, setIsPatientSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ClientPatient | null>(null);
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    const patientIdFromUrl = searchParams.get('patientId');
    if (patientIdFromUrl && token) {
      const fetchPatient = async () => {
        setIsPatientSearching(true);
        try {
          const response = await fetch(`/api/v1/patients/${patientIdFromUrl}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Patient not found');
          const patientData = await response.json();
          setSelectedPatient(patientData);
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load patient from URL.' });
        } finally {
          setIsPatientSearching(false);
          // Use router.replace to clean up the URL without adding to history
          router.replace('/orders', { scroll: false });
        }
      };
      fetchPatient();
    }
  }, [searchParams, token, toast, router]);

  useEffect(() => {
    if (!patientSearchTerm.trim() || !token) {
        setPatientSearchResults([]);
        if(isPatientSearching) setIsPatientSearching(false);
        return;
    };
    
    setIsPatientSearching(true);
    const searchDebounce = setTimeout(async () => {
      try {
        const response = await fetch(`/api/v1/patients?q=${patientSearchTerm}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setPatientSearchResults(data);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not perform patient search.' });
        setPatientSearchResults([]);
      } finally {
        setIsPatientSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchDebounce);
  }, [patientSearchTerm, token, toast]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Order</DialogTitle>
        <DialogDescription>
          {selectedPatient 
            ? `Fill out order details for ${selectedPatient.firstName} ${selectedPatient.lastName}`
            : "Search for a patient to begin creating a new order."
          }
        </DialogDescription>
      </DialogHeader>
      
      {!selectedPatient ? (
        <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Start typing to search for a patient..." value={patientSearchTerm} onChange={(e) => setPatientSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <div className="mt-4 overflow-hidden rounded-md border max-h-60 overflow-y-auto">
              <Table><TableHeader><TableRow className="bg-secondary hover:bg-secondary"><TableHead>Patient</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isPatientSearching ? <TableRow><TableCell colSpan={2}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  : patientSearchResults.length > 0 ? patientSearchResults.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell>
                          <div>{patient.firstName} {patient.lastName}</div>
                          <div className="text-sm text-muted-foreground">{patient.mrn}</div>
                        </TableCell>
                        <TableCell className="text-right"><Button size="sm" onClick={() => setSelectedPatient(patient)}><FilePlus className="mr-2 h-4 w-4" />Select</Button></TableCell>
                      </TableRow>))
                  : <TableRow><TableCell colSpan={2} className="h-24 text-center">{patientSearchTerm ? 'No patients found.' : 'Start typing to see results.'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
        </div>
      ) : (
        <NewOrderForm patient={selectedPatient} onOrderCreated={onOrderCreated} />
      )}
    </>
  );
}

function OrdersPageComponent() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ClientOrder[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false);
  
  const searchParams = useSearchParams();

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
    if(token && !searchTerm) {
        fetchOrders();
    }
  }, [token, searchTerm, fetchOrders]);

  useEffect(() => {
    if (searchParams.get('patientId')) {
      setIsNewOrderDialogOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const searchDebounce = setTimeout(() => {
        if(searchTerm) fetchOrders(searchTerm);
    }, 500);

    return () => clearTimeout(searchDebounce);
  }, [searchTerm, fetchOrders]);
  
  const getStatusVariant = (status: string) => {
    switch (status) {
        case 'Complete': return 'default';
        case 'Pending': return 'secondary';
        case 'Cancelled': return 'destructive';
        default: return 'outline';
    }
  }

  const handleOrderCreated = () => {
    setIsNewOrderDialogOpen(false);
    setSearchTerm('');
    fetchOrders(); 
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <Dialog open={isNewOrderDialogOpen} onOpenChange={setIsNewOrderDialogOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" />New Order</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <NewOrderDialogContent onOrderCreated={handleOrderCreated} />
              </Suspense>
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Find an Order</CardTitle>
          <CardDescription>Search by Order ID, Patient Name, or MRN.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Start typing to search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 text-lg" />
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
                    <TableRow key={order.id} className="cursor-pointer hover:bg-muted/80">
                      <TableCell className="font-mono">{order.orderId}</TableCell>
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
