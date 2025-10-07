
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, PlusCircle, X, Loader2, FilePlus, TestTube, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import type { ClientPatient, ClientTestCatalogItem, ClientUser, ClientOrder } from '@/lib/types';
import { format, addHours } from 'date-fns';
import { calculateAge } from '@/lib/utils';

const orderFormSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1, 'A patient must be selected.'),
  physicianId: z.string().min(1, 'An ordering physician must be selected.'),
  icd10Code: z.string().min(3, 'A valid ICD-10 code is required.'),
  testIds: z.array(z.string()).min(1, 'At least one test must be added to the order.'),
  appointmentDateTime: z.string().min(1, 'An appointment time for sample collection is required.'),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

function OrderForm({ patient, onOrderSaved, editingOrder, onCancel }: { patient: ClientPatient; onOrderSaved: () => void; editingOrder?: ClientOrder | null, onCancel: () => void; }) {
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
      id: editingOrder?.id,
      patientId: patient.id,
      physicianId: editingOrder?.physicianId || '',
      icd10Code: editingOrder?.icd10Code || '',
      testIds: editingOrder?.samples.flatMap(s => s.tests.map(t => t.testCode)) || [],
      appointmentDateTime: editingOrder?.appointmentId ? format(new Date(editingOrder.createdAt), "yyyy-MM-dd'T'HH:mm") : format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    if (storedToken) setToken(storedToken);
  }, []);

  const fetchPhysicians = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/v1/users?role=physician', { headers: { 'Authorization': `Bearer ${token}` }});
      if (!response.ok) throw new Error('Failed to fetch physicians');
      const data = await response.json();
      setPhysicians(data);
    } catch (error) { toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch physician list.' }); }
  }, [token, toast]);

  const fetchInitialTests = useCallback(async (testCodes: string[]) => {
    if (!token || testCodes.length === 0) return;
    try {
        const response = await fetch(`/api/v1/test-catalog?codes=${testCodes.join(',')}`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (!response.ok) throw new Error('Failed to fetch initial tests');
        const tests = await response.json();
        setSelectedTests(tests);
    } catch (error) { console.error(error); toast({ variant: 'destructive', title: 'Error', description: 'Could not load existing tests for this order.' }); }
  }, [token, toast]);

  useEffect(() => {
    fetchPhysicians();
    if(editingOrder) fetchInitialTests(editingOrder.samples.flatMap(s => s.tests.map(t => t.testCode)));
  }, [token, editingOrder, fetchPhysicians, fetchInitialTests]);
  
  const handleTestPopoverOpenChange = useCallback(async (open: boolean) => {
    setIsTestPopoverOpen(open);
    if (open && !testSearchInput.trim() && token) {
        setIsTestSearching(true);
        try {
            const response = await fetch(`/api/v1/test-catalog`, { headers: { 'Authorization': `Bearer ${token}` }});
            if (!response.ok) throw new Error('Test fetch failed');
            const data = await response.json();
            setTestSearchResults(data);
        } catch (error) { toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch test list.' }); } finally { setIsTestSearching(false); }
    } else if (!open) { setTestSearchResults([]); }
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
        const response = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${token}` }});
        if (!response.ok) throw new Error('Test search failed');
        const data = await response.json();
        setTestSearchResults(data);
      } catch (error) { toast({ variant: 'destructive', title: 'Error', description: 'Could not search tests.' }); } finally { setIsTestSearching(false); }
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
            priority: 'Routine',
            testCodes: data.testIds,
            appointmentDetails: {
                scheduledTime: new Date(data.appointmentDateTime),
                durationMinutes: 15,
                status: 'Scheduled',
                appointmentType: 'Sample Collection'
            },
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
        toast({ title: `Order ${isEditing ? 'Updated' : 'Created'} Successfully`, description: `Order ID: ${result.orderId}. Collection appointment scheduled.` });
        onOrderSaved();
    } catch (error: any) { toast({ variant: 'destructive', title: `Order ${isEditing ? 'Update' : 'Creation'} Failed`, description: error.message }); }
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
                        <Input placeholder="Click or type to search for tests..." className="pl-10" value={testSearchInput} onChange={(e) => setTestSearchInput(e.target.value)} />
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
        <div className="space-y-4 rounded-lg border p-4 bg-secondary/50">
            <h3 className="font-semibold leading-none tracking-tight">Sample Collection Appointment</h3>
             <FormField control={form.control} name="appointmentDateTime" render={({ field }) => ( <FormItem><FormLabel>Scheduled Date & Time</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormDescription>A collection appointment must be scheduled for every order.</FormDescription><FormMessage /></FormItem> )} />
        </div>
        <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingOrder ? 'Save Changes' : 'Create Order & Schedule'}
            </Button>
        </div>
      </form>
    </Form>
  );
}

function OrderEntryPageComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId');
  const orderId = searchParams.get('id');

  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<ClientPatient[]>([]);
  const [isPatientSearching, setIsPatientSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ClientPatient | null>(null);
  const [editingOrder, setEditingOrder] = useState<ClientOrder | null>(null);
  const [pageIsLoading, setPageIsLoading] = useState(true);

  const isEditing = !!orderId;

  const fetchOrderAndPatient = useCallback(async (oId: string, authToken: string) => {
    try {
        const orderRes = await fetch(`/api/v1/orders/${oId}`, { headers: { 'Authorization': `Bearer ${authToken}` }});
        if (!orderRes.ok) throw new Error('Order not found.');
        const orderData: ClientOrder = await orderRes.json();
        setEditingOrder(orderData);
        
        const patientRes = await fetch(`/api/v1/patients/${orderData.patientId}`, { headers: { 'Authorization': `Bearer ${authToken}` }});
        if (!patientRes.ok) throw new Error('Patient for this order not found.');
        const patientData: ClientPatient = await patientRes.json();
        setSelectedPatient(patientData);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: `Could not load order: ${error.message}` });
        router.push('/orders');
    } finally {
        setPageIsLoading(false);
    }
  }, [toast, router]);

  const fetchPatientById = useCallback(async (pId: string, authToken: string) => {
    try {
      const response = await fetch(`/api/v1/patients/${pId}`, { headers: { 'Authorization': `Bearer ${authToken}` }});
      if (!response.ok) throw new Error(`Patient not found.`);
      const patientData = await response.json();
      setSelectedPatient(patientData);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Could not load patient: ${error.message}` });
    } finally {
        setPageIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token) {
        if (orderId) {
            fetchOrderAndPatient(orderId, token);
        } else if (patientId) {
            fetchPatientById(patientId, token);
        } else {
            setPageIsLoading(false);
        }
    }
  }, [token, orderId, patientId, fetchOrderAndPatient, fetchPatientById]);

  useEffect(() => {
    if (!patientSearchTerm.trim() || !token) {
        setPatientSearchResults([]);
        if(isPatientSearching) setIsPatientSearching(false);
        return;
    };
    setIsPatientSearching(true);
    const searchDebounce = setTimeout(async () => {
      try {
        const response = await fetch(`/api/v1/patients?q=${patientSearchTerm}`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setPatientSearchResults(data);
      } catch (error) { toast({ variant: 'destructive', title: 'Error', description: 'Could not perform patient search.' }); setPatientSearchResults([]); } finally { setIsPatientSearching(false); }
    }, 300);
    return () => clearTimeout(searchDebounce);
  }, [patientSearchTerm, token, toast]);
  
  const showPatientSearch = !isEditing && !selectedPatient;

  const handleOrderSaved = () => {
      router.push('/orders');
  }

  if (pageIsLoading) {
      return (
          <div className="space-y-4">
              <Skeleton className="h-10 w-48" />
              <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
          </div>
      )
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
        <Button variant="outline" onClick={() => router.push('/orders')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Order List
        </Button>

        <Card>
            <CardHeader>
                <CardTitle>{isEditing ? `Edit Order ${editingOrder?.orderId}` : 'Create New Order'}</CardTitle>
                <CardDescription>{selectedPatient ? `For ${selectedPatient.firstName} ${selectedPatient.lastName}` : "Search for a patient to begin."}</CardDescription>
            </CardHeader>
            <CardContent>
                {selectedPatient && (
                    <Card className="bg-secondary my-4">
                        <CardHeader className='py-4'><CardTitle className="text-lg">Patient Information</CardTitle></CardHeader>
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
                                    <TableCell><div className="font-medium">{patient.firstName} {patient.lastName}</div><div className="text-sm text-muted-foreground">MRN: {patient.mrn}</div></TableCell>
                                    <TableCell>{calculateAge(patient.dateOfBirth)}</TableCell>
                                    <TableCell className="text-right"><Button size="sm" onClick={() => setSelectedPatient(patient)}><FilePlus className="mr-2 h-4 w-4" />Select</Button></TableCell>
                                    </TableRow>))
                                : <TableRow><TableCell colSpan={3} className="h-24 text-center">{patientSearchTerm ? 'No patients found.' : 'Start typing to see results.'}</TableCell></TableRow>}
                            </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : selectedPatient ? (
                    <OrderForm patient={selectedPatient} onOrderSaved={handleOrderSaved} editingOrder={editingOrder} onCancel={() => router.push('/orders')} />
                ) : (
                    <div className="flex h-60 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}


export default function OrderEntryPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[calc(100vh-8rem)] w-full" />}>
            <OrderEntryPageComponent />
        </Suspense>
    )
}
