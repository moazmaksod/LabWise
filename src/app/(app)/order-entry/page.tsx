
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, PlusCircle, X, Loader2, User, ShieldAlert, FilePlus } from 'lucide-react';
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
import type { ClientPatient, ClientTestCatalogItem, ClientUser } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const orderFormSchema = z.object({
  patientId: z.string().min(1, 'A patient must be selected.'),
  physicianId: z.string().min(1, 'A physician must be selected.'),
  icd10Code: z.string().min(1, 'ICD-10 code is required.'),
  priority: z.enum(['Routine', 'STAT']),
  samples: z.array(z.object({
    sampleType: z.string(),
    testCodes: z.array(z.string())
  })).min(1, 'At least one test must be added.'),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

export default function OrderEntryPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  // Patient Search State
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<ClientPatient[]>([]);
  const [isPatientSearching, setIsPatientSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ClientPatient | null>(null);

  // Test Search State
  const [testSearchTerm, setTestSearchTerm] = useState('');
  const [testSearchResults, setTestSearchResults] = useState<ClientTestCatalogItem[]>([]);
  const [isTestSearching, setIsTestSearching] = useState(false);
  
  // Physician Search State
  const [physicians, setPhysicians] = useState<ClientUser[]>([]);
  
  const [addedTests, setAddedTests] = useState<ClientTestCatalogItem[]>([]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      patientId: '',
      physicianId: '',
      icd10Code: '',
      priority: 'Routine',
      samples: [],
    },
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    setToken(storedToken);
    
    async function fetchPhysicians() {
        if (!storedToken) return;
        try {
            const res = await fetch('/api/v1/users', { headers: { 'Authorization': `Bearer ${storedToken}` }});
            const allUsers: ClientUser[] = await res.json();
            setPhysicians(allUsers.filter(u => u.role === 'physician'));
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch physicians.' });
        }
    }
    fetchPhysicians();

  }, [toast]);

  useEffect(() => {
    if (selectedPatient) {
      form.setValue('patientId', selectedPatient.id);
    }
  }, [selectedPatient, form]);

  useEffect(() => {
    const samplesMap = new Map<string, string[]>();
    addedTests.forEach(test => {
        const sampleType = test.specimenRequirements.tubeType;
        if (!samplesMap.has(sampleType)) {
            samplesMap.set(sampleType, []);
        }
        samplesMap.get(sampleType)!.push(test.testCode);
    });

    const samplesForForm = Array.from(samplesMap.entries()).map(([sampleType, testCodes]) => ({
        sampleType,
        testCodes,
    }));
    form.setValue('samples', samplesForForm);
  }, [addedTests, form]);


  const handlePatientSearch = async () => {
    if (!patientSearchTerm || !token) return;
    setIsPatientSearching(true);
    setSelectedPatient(null);
    form.reset();
    try {
      const response = await fetch(`/api/v1/patients?q=${patientSearchTerm}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Search failed');
      const data: ClientPatient[] = await response.json();
      setPatientSearchResults(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not perform patient search.' });
    } finally {
      setIsPatientSearching(false);
    }
  };

  const handleTestSearch = async (query: string) => {
    setTestSearchTerm(query);
    if (!query || !token) {
        setTestSearchResults([]);
        return;
    };
    setIsTestSearching(true);
    try {
        const response = await fetch(`/api/v1/test-catalog?q=${query}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Test search failed');
        const data = await response.json();
        setTestSearchResults(data);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not perform test search.' });
    } finally {
        setIsTestSearching(false);
    }
  }

  const addTestToOrder = (test: ClientTestCatalogItem) => {
    if (!addedTests.find(t => t.testCode === test.testCode)) {
        setAddedTests([...addedTests, test]);
    }
    setTestSearchTerm('');
    setTestSearchResults([]);
  }

  const removeTestFromOrder = (testCode: string) => {
    setAddedTests(addedTests.filter(t => t.testCode !== testCode));
  }

  const onSubmit = async (data: OrderFormValues) => {
    if (!token) return;
    try {
        const response = await fetch('/api/v1/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create order.');
        }

        const newOrder = await response.json();
        toast({ title: `Order created successfully`, description: `Order ID: ${newOrder.orderId}` });
        
        // Reset state
        form.reset();
        setSelectedPatient(null);
        setPatientSearchTerm('');
        setPatientSearchResults([]);
        setAddedTests([]);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error creating order', description: error.message });
    }
  };

  if (userLoading) return <Skeleton className="h-96 w-full" />;

  // Redirect non-authorized users
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
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Find Patient</CardTitle>
            <CardDescription>Search for the patient to create an order for.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="search"
                placeholder="Search by Name, MRN, Phone..."
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
                    <TableHead>Action</TableHead>
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
                        <TableCell>
                          <Button size="sm" onClick={() => setSelectedPatient(patient)}>
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <div className='flex justify-between items-start'>
                        <div>
                            <CardTitle>New Order for {selectedPatient.firstName} {selectedPatient.lastName}</CardTitle>
                            <CardDescription>MRN: {selectedPatient.mrn} | DOB: {format(new Date(selectedPatient.dateOfBirth), 'MM/dd/yyyy')}</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>Change Patient</Button>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="physicianId" render={({ field }) => (
                         <FormItem>
                            <FormLabel>Ordering Physician</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                            {field.value ? `Dr. ${physicians.find((p) => p.id === field.value)?.lastName}, ${physicians.find((p) => p.id === field.value)?.firstName}` : "Select Physician"}
                                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                     <Command>
                                        <CommandInput placeholder="Search physicians..." />
                                        <CommandEmpty>No physician found.</CommandEmpty>
                                        <CommandList>
                                            <CommandGroup>
                                            {physicians.map((p) => (
                                                <CommandItem value={`${p.firstName} ${p.lastName}`} key={p.id} onSelect={() => form.setValue("physicianId", p.id)}>
                                                   Dr. {p.firstName} {p.lastName}
                                                </CommandItem>
                                            ))}
                                            </CommandGroup>
                                        </CommandList>
                                     </Command>
                                </PopoverContent>
                            </Popover>
                             <FormMessage />
                         </FormItem>
                    )} />

                    <FormField control={form.control} name="icd10Code" render={({ field }) => (
                        <FormItem>
                            <FormLabel>ICD-10 Diagnosis Code</FormLabel>
                            <FormControl><Input placeholder="e.g., E11.9" {...field} /></FormControl>
                             <FormMessage />
                        </FormItem>
                    )} />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Step 2: Add Tests</CardTitle>
                </CardHeader>
                <CardContent>
                     <Command className="overflow-visible">
                        <CommandInput 
                            placeholder="Search for a test to add..."
                            value={testSearchTerm}
                            onValueChange={handleTestSearch}
                            disabled={!selectedPatient}
                        />
                         <CommandList className="relative">
                            {isTestSearching && <CommandItem disabled>Searching...</CommandItem>}
                            {testSearchResults.length > 0 && (
                                <div className="absolute top-full mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md z-20">
                                  <CommandGroup>
                                    {testSearchResults.map(test => (
                                        <CommandItem key={test.id} onSelect={() => addTestToOrder(test)} value={test.name}>
                                            <span>{test.name} ({test.testCode})</span>
                                        </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </div>
                            )}
                         </CommandList>
                    </Command>

                     <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium">Selected Tests</h4>
                        {addedTests.length > 0 ? (
                             <div className="space-y-2 rounded-md border p-2">
                                {addedTests.map((test, index) => (
                                    <div key={test.id} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50">
                                        <div>
                                            <p className="font-medium">{test.name}</p>
                                            <p className="text-xs text-muted-foreground">{test.testCode} - requires {test.specimenRequirements.tubeType}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => removeTestFromOrder(test.testCode)}><X className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-sm text-muted-foreground py-4">No tests added yet.</div>
                        )}
                         {form.formState.errors.samples && <p className="text-sm font-medium text-destructive">{form.formState.errors.samples.message}</p>}
                    </div>
                </CardContent>
             </Card>

            <div className="flex justify-end gap-4">
                <Button variant="ghost" onClick={() => { setSelectedPatient(null); setAddedTests([]); }}>Cancel</Button>
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

    