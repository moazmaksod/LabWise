

'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, PlusCircle, X, Loader2, FilePlus, TestTube, FileSearch, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
import { calculateAge } from '@/lib/utils';

const orderFormSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1, 'A patient must be selected.'),
  physicianId: z.string().min(1, 'An ordering physician must be selected.'),
  icd10Code: z.string().min(3, 'A valid ICD-10 code is required.'),
  testIds: z.array(z.string()).min(1, 'At least one test must be added to the order.'),
  sampleType: z.string().default('Whole Blood'), // Default value, can be enhanced later
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

function OrderForm({
  patient,
  onOrderSaved,
  editingOrder,
}: {
  patient: ClientPatient;
  onOrderSaved: () => void;
  editingOrder?: ClientOrder | null;
}) {
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
      id: editingOrder?.id || undefined,
      patientId: patient.id,
      physicianId: editingOrder?.physicianId || '',
      icd10Code: editingOrder?.icd10Code || '',
      testIds: editingOrder?.samples[0]?.tests.map(t => t.testCode) || [],
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

  const fetchInitialTests = useCallback(async (testCodes: string[]) => {
      if (!token || testCodes.length === 0) return;
      try {
          const response = await fetch(`/api/v1/test-catalog?codes=${testCodes.join(',')}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Failed to fetch initial tests');
          const tests = await response.json();
          setSelectedTests(tests);
      } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load existing tests for this order.' });
      }
  }, [token, toast]);

  useEffect(() => {
    fetchPhysicians();
    if(editingOrder) {
        fetchInitialTests(editingOrder.samples[0].tests.map(t => t.testCode));
    }
  }, [token, editingOrder, fetchPhysicians, fetchInitialTests]);
  
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
    if (!selectedTests.find(t => t.testCode === test.testCode)) {
      const newSelectedTests = [...selectedTests, test];
      setSelectedTests(newSelectedTests);
      form.setValue('testIds', newSelectedTests.map(t => t.testCode));
    }
    setTestSearchInput('');
    setTestSearchResults([]);
    setIsTestPopoverOpen(false);
  };

  const handleRemoveTest = (testCode: string) => {
    const newSelectedTests = selectedTests.filter(t => t.testCode !== testCode);
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
    const isEditing = !!data.id;
    
    try {
        const payload = {
            id: data.id,
            patientId: data.patientId,
            physicianId: data.physicianId,
            icd10Code: data.icd10Code,
            priority: 'Routine', // This could be a form field in the future
            samples: [{ sampleType: data.sampleType, testCodes: data.testIds }]
        };
        
        const response = await fetch(isEditing ? `/api/v1/orders/${data.id}` : '/api/v1/orders', {
            method: isEditing ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'create'} order.`);
        }
        
        const result = await response.json();
        toast({ title: `Order ${isEditing ? 'Updated' : 'Created'} Successfully`, description: `Order ID: ${result.orderId}` });
        onOrderSaved();

    } catch (error: any) {
        toast({ variant: 'destructive', title: `Order ${isEditing ? 'Update' : 'Creation'} Failed`, description: error.message });
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
            {selectedTests.length > 0 ? ( <div className="flex flex-wrap gap-2">{selectedTests.map(test => (<Badge key={test.testCode} variant="secondary" className="text-base py-1 pl-3 pr-1">{test.name}<button type="button" onClick={() => handleRemoveTest(test.testCode)} className="ml-2 rounded-full p-0.5 hover:bg-destructive/20 text-destructive"><X className="h-3 w-3" /></button></Badge>))}</div>) : (<div className="text-sm text-muted-foreground">No tests added yet.</div>)}
            <FormField control={form.control} name="testIds" render={({ field }) => ( <FormItem><FormMessage /></FormItem>)} />
        </div>
        <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingOrder ? 'Save Changes' : 'Create Order'}
            </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function OrderDialogContent({ onOrderSaved, editingOrder }: { onOrderSaved: () => void, editingOrder?: ClientOrder | null }) {
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<ClientPatient[]>([]);
  const [isPatientSearching, setIsPatientSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ClientPatient | null>(null);
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const isEditing = !!editingOrder;
  const dialogTitle = isEditing ? `Edit Order ${editingOrder.orderId}` : 'Create New Order';
  const dialogDescription = isEditing
    ? `Modify details for this order.`
    : (selectedPatient 
        ? `Fill out order details for ${selectedPatient.firstName} ${selectedPatient.lastName}`
        : "Search for a patient to begin creating a new order."
      );


  const fetchPatientById = useCallback(async (patientId: string) => {
    if (!token) return;
    setIsPatientSearching(true);
    try {
      const response = await fetch(`/api/v1/patients/${patientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorBody = await response.text();
        console.error("DEBUG: Failed to fetch patient. Status:", response.status, "Body:", errorBody);
        throw new Error(`Patient not found. Status: ${response.status}`);
      }
      const patientData = await response.json();
      setSelectedPatient(patientData);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Could not load patient: ${error.message}` });
    } finally {
      setIsPatientSearching(false);
    }
  }, [token, toast]);

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    const patientIdFromUrl = searchParams.get('patientId');
    if (isEditing && editingOrder?.patientId) {
        fetchPatientById(editingOrder.patientId);
    } else if (!isEditing && patientIdFromUrl && token && !selectedPatient) {
        fetchPatientById(patientIdFromUrl);
        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('patientId');
        router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  }, [searchParams, token, isEditing, editingOrder, selectedPatient, router, fetchPatientById]);

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
  
  const showPatientSearch = !isEditing && !selectedPatient;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogDescription>{dialogDescription}</DialogDescription>
      </DialogHeader>
      
      {selectedPatient && (
         <Card className="bg-secondary my-4">
            <CardHeader className='py-4'>
                <CardTitle className="text-lg">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-xl">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                        <p className="text-muted-foreground">MRN: {selectedPatient.mrn}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold text-xl">{calculateAge(selectedPatient.dateOfBirth)} years</p>
                        <p className="text-muted-foreground">DOB: {format(new Date(selectedPatient.dateOfBirth), 'MM/dd/yyyy')}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
      )}

      {showPatientSearch ? (
        <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Start typing to search for a patient..." value={patientSearchTerm} onChange={(e) => setPatientSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <div className="mt-4 overflow-hidden rounded-md border max-h-60 overflow-y-auto">
              <Table><TableHeader><TableRow className="bg-secondary hover:bg-secondary"><TableHead>Patient</TableHead><TableHead>Age</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isPatientSearching ? <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  : patientSearchResults.length > 0 ? patientSearchResults.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell>
                          <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                          <div className="text-sm text-muted-foreground">MRN: {patient.mrn}</div>
                        </TableCell>
                        <TableCell>{calculateAge(patient.dateOfBirth)}</TableCell>
                        <TableCell className="text-right"><Button size="sm" onClick={() => setSelectedPatient(patient)}><FilePlus className="mr-2 h-4 w-4" />Select</Button></TableCell>
                      </TableRow>))
                  : <TableRow><TableCell colSpan={3} className="h-24 text-center">{patientSearchTerm ? 'No patients found.' : 'Start typing to see results.'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
        </div>
      ) : selectedPatient ? (
        <OrderForm patient={selectedPatient} onOrderSaved={onOrderSaved} editingOrder={editingOrder} />
      ) : (
        <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
      }
    </>
  );
}

function OrdersPageComponent() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ClientOrder[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ClientOrder | null>(null);
  
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
    if(token) {
        fetchOrders(searchTerm);
    }
  }, [token, searchTerm, fetchOrders]);
  
  useEffect(() => {
    if (searchParams.get('patientId') && !isOrderDialogOpen) {
      handleOpenDialog();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const getStatusVariant = (status: string) => {
    switch (status) {
        case 'Complete': return 'default';
        case 'Pending': return 'secondary';
        case 'Cancelled': return 'destructive';
        default: return 'outline';
    }
  }

  const handleOpenDialog = (order: ClientOrder | null = null) => {
    setEditingOrder(order);
    setIsOrderDialogOpen(true);
  }

  const handleOrderSaved = () => {
    setIsOrderDialogOpen(false);
    setEditingOrder(null);
    setSearchTerm(''); // Clear search to show the latest list including the new/edited one
    fetchOrders(); // We could just pass empty string to fetchOrders, but this is clearer
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <Dialog open={isOrderDialogOpen} onOpenChange={(isOpen) => {
          setIsOrderDialogOpen(isOpen);
          if (!isOpen) setEditingOrder(null);
        }}>
            <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" />New Order</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <OrderDialogContent onOrderSaved={handleOrderSaved} editingOrder={editingOrder} />
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
            <Input type="search" placeholder="Search by Order ID, Patient Name, MRN..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 text-lg" />
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
                          <div
                            onClick={() => handleOpenDialog(order)}
                            className="font-mono cursor-pointer hover:underline text-primary"
                          >
                            {order.orderId}
                          </div>
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

    
