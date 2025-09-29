
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, PlusCircle, X, Loader2, User, ShieldAlert, FilePlus, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import type { ClientPatient, ClientTestCatalogItem, ClientUser } from '@/lib/types';
import { format } from 'date-fns';

const orderFormSchema = z.object({
  patientId: z.string().min(1, 'A patient must be selected.'),
  physicianId: z.string().min(1, 'An ordering physician must be selected.'),
  icd10Code: z.string().min(3, 'A valid ICD-10 code is required.'),
  testIds: z.array(z.string()).min(1, 'At least one test must be added to the order.'),
  sampleType: z.string().default('Whole Blood'), // Default value, can be enhanced later
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

export default function OrderEntryPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  // Workflow State
  const [selectedPatient, setSelectedPatient] = useState<ClientPatient | null>(null);

  // Patient Search State
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<ClientPatient[]>([]);
  const [isPatientSearching, setIsPatientSearching] = useState(false);

  // Order Form State
  const [physicians, setPhysicians] = useState<ClientUser[]>([]);
  const [testSearchInput, setTestSearchInput] = useState('');
  const [testSearchResults, setTestSearchResults] = useState<ClientTestCatalogItem[]>([]);
  const [isTestSearching, setIsTestSearching] = useState(false);
  const [selectedTests, setSelectedTests] = useState<ClientTestCatalogItem[]>([]);
  
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      patientId: '',
      physicianId: '',
      icd10Code: '',
      testIds: [],
    },
  });

  useEffect(() => {
    // Component mounts, try to get the token.
    const storedToken = localStorage.getItem('labwise-token');
    if (storedToken) {
      setToken(storedToken);
    } else {
      // Handle case where token is not available.
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'Could not find user session.' });
    }
  }, [toast]);
  
  const handleSelectPatient = (patient: ClientPatient) => {
    setSelectedPatient(patient);
    form.setValue('patientId', patient.id);
  };

  // --- Patient Search ---
  const handlePatientSearch = async () => {
    if (!patientSearchTerm.trim() || !token) {
        setPatientSearchResults([]);
        return;
    };
    setIsPatientSearching(true);
    try {
      const response = await fetch(`/api/v1/patients?q=${patientSearchTerm}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Search failed');
      const data: ClientPatient[] = await response.json();
      setPatientSearchResults(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not perform patient search.' });
      setPatientSearchResults([]);
    } finally {
      setIsPatientSearching(false);
    }
  };

  // --- Order Form Data Fetching ---
  const fetchPhysicians = useCallback(async () => {
    if (!token) return;
    try {
      // CORRECTED: Added ?role=physician to filter results
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
    if(selectedPatient && token) { // Ensure token exists before fetching
        fetchPhysicians();
    }
  }, [selectedPatient, token, fetchPhysicians]);

  // --- Test Search ---
  useEffect(() => {
    if (!testSearchInput.trim() || !token) {
        setTestSearchResults([]);
        return;
    }
    
    const search = setTimeout(async () => {
      setIsTestSearching(true);
      try {
        const response = await fetch(`/api/v1/test-catalog?q=${testSearchInput}`, {
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
    }, 300); // Debounce search

    return () => clearTimeout(search);
  }, [testSearchInput, token, toast]);

  const handleSelectTest = (test: ClientTestCatalogItem) => {
    if (!selectedTests.find(t => t.id === test.id)) {
      const newSelectedTests = [...selectedTests, test];
      setSelectedTests(newSelectedTests);
      form.setValue('testIds', newSelectedTests.map(t => t.testCode));
    }
    setTestSearchInput('');
    setTestSearchResults([]);
  };

  const handleRemoveTest = (testId: string) => {
    const newSelectedTests = selectedTests.filter(t => t.id !== testId);
    setSelectedTests(newSelectedTests);
    form.setValue('testIds', newSelectedTests.map(t => t.testCode));
  };
  
  // --- Form Submission ---
  const onSubmit = async (data: OrderFormValues) => {
    if (!token) return;
    try {
        const payload = {
            patientId: data.patientId,
            physicianId: data.physicianId,
            icd10Code: data.icd10Code,
            priority: 'Routine', // Defaulting for now
            samples: [ // Grouping all tests into one sample for now
                {
                    sampleType: data.sampleType,
                    testCodes: data.testIds
                }
            ]
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

        // Reset state for next order
        setSelectedPatient(null);
        setPatientSearchTerm('');
        setPatientSearchResults([]);
        setSelectedTests([]);
        form.reset();

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Order Creation Failed', description: error.message });
    }
  };

  const resetToPatientSearch = () => {
    setSelectedPatient(null);
    setSelectedTests([]);
    form.reset();
  };

  if (userLoading) return <Skeleton className="h-96 w-full" />;

  if (!userLoading && user && !['receptionist', 'manager', 'physician'].includes(user.role)) {
    router.push('/dashboard');
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>You do not have permission to access this page.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Order Entry</h1>

      {!selectedPatient ? (
        // STEP 1: PATIENT SEARCH
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Find Patient</CardTitle>
            <CardDescription>Search for the patient by Name, MRN, or Phone Number to create an order.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="search"
                placeholder="Search..."
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePatientSearch()}
                className="flex-grow"
              />
              <Button onClick={handlePatientSearch} disabled={isPatientSearching}>
                {isPatientSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Search
              </Button>
            </div>
            <div className="mt-4 overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary hover:bg-secondary">
                    <TableHead>Patient</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPatientSearching ? (
                    Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                  ) : patientSearchResults.length > 0 ? (
                    patientSearchResults.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">{patient.firstName} {patient.lastName}</TableCell>
                        <TableCell>{patient.mrn}</TableCell>
                        <TableCell>{format(new Date(patient.dateOfBirth), 'MM/dd/yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => handleSelectPatient(patient)}>
                            <FilePlus className="mr-2 h-4 w-4" />
                            Create Order
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center">No patients found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        // STEP 2: ORDER FORM
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <div className='flex justify-between items-start'>
                        <div>
                            <CardTitle>Step 2: Create Order for {selectedPatient.firstName} {selectedPatient.lastName}</CardTitle>
                            <CardDescription>MRN: {selectedPatient.mrn} | DOB: {format(new Date(selectedPatient.dateOfBirth), 'MM/dd/yyyy')}</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={resetToPatientSearch}>Change Patient</Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="physicianId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Ordering Physician</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a physician" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {physicians.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.firstName} {p.lastName}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="icd10Code"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>ICD-10 Diagnosis Code</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., R53.83" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="space-y-2">
                        <FormLabel>Add Tests</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Search for tests to add..." 
                                        className="pl-10"
                                        value={testSearchInput}
                                        onChange={(e) => setTestSearchInput(e.target.value)}
                                    />
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                 <Command>
                                    <CommandList>
                                        {isTestSearching && <CommandEmpty>Searching...</CommandEmpty>}
                                        {!isTestSearching && testSearchResults.length === 0 && testSearchInput.length > 1 && <CommandEmpty>No tests found.</CommandEmpty>}
                                        <CommandGroup>
                                            {testSearchResults.map((test) => (
                                                <CommandItem
                                                key={test.id}
                                                value={test.name}
                                                onSelect={() => handleSelectTest(test)}
                                                >
                                                <TestTube className="mr-2 h-4 w-4" />
                                                <span>{test.name} ({test.testCode})</span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <FormLabel>Selected Tests</FormLabel>
                        {selectedTests.length > 0 ? (
                             <div className="flex flex-wrap gap-2">
                                {selectedTests.map(test => (
                                     <Badge key={test.id} variant="secondary" className="text-base py-1 pl-3 pr-1">
                                        {test.name}
                                        <button onClick={() => handleRemoveTest(test.id)} className="ml-2 rounded-full p-0.5 hover:bg-destructive/20 text-destructive">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                             </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">No tests added yet.</div>
                        )}
                        <FormField control={form.control} name="testIds" render={({ field }) => ( <FormItem><FormMessage /></FormItem>)} />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button type="button" variant="ghost" onClick={resetToPatientSearch}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Order
                </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
