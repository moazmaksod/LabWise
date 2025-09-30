
'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlusCircle, Loader2, UploadCloud, FilePlus, User, FileSearch, Search, X, TestTube } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, calculateAge } from '@/lib/utils';
import { Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '../ui/skeleton';
import type { ClientPatient, ClientOrder, ClientTestCatalogItem, ClientUser } from '@/lib/types';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const patientSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  contactInfo: z.object({
    phone: z.string().min(1, 'Phone number is required'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    address: z.object({
      street: z.string().min(1, 'Street address is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      zipCode: z.string().min(1, 'Zip code is required'),
      country: z.string().default('USA'),
    }),
  }),
  insuranceInfo: z.object({
    providerName: z.string().optional(),
    policyNumber: z.string().optional(),
  }).optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

const MOCK_FIRST_NAMES = ['Olivia', 'Liam', 'Emma', 'Noah', 'Amelia', 'Oliver', 'Ava', 'Elijah'];
const MOCK_LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const MOCK_STREETS = ['Maple St', 'Oak Ave', 'Pine Ln', 'Cedar Blvd', 'Elm Ct', 'Birch Rd'];
const MOCK_CITIES = ['Springfield', 'Fairview', 'Riverside', 'Greenwood', 'Oakville'];
const MOCK_STATES = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH'];

const getRandomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const getRandomZip = () => String(Math.floor(10000 + Math.random() * 90000));
const getRandomPhone = () => `(${Math.floor(200 + Math.random() * 800)}) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`;
const getRandomDateOfBirth = () => {
    const year = Math.floor(1950 + Math.random() * 55);
    const month = String(Math.floor(1 + Math.random() * 12)).padStart(2, '0');
    const day = String(Math.floor(1 + Math.random() * 28)).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const getRandomPolicyNumber = () => `ID${String(Math.random()).substring(2, 12)}`;


function PatientRegistrationDialog({ open, onOpenChange, onPatientCreated }: { open: boolean, onOpenChange: (open: boolean) => void, onPatientCreated: (patient: ClientPatient) => void }) {
  const { toast } = useToast();
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrFileName, setOcrFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      contactInfo: { phone: '', email: '', address: { street: '', city: '', state: '', zipCode: '', country: 'USA' } },
      insuranceInfo: { providerName: 'Mock Insurance', policyNumber: '' },
    },
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    setToken(storedToken);
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    setOcrFileName(file.name);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const fName = getRandomItem(MOCK_FIRST_NAMES);
    const lName = getRandomItem(MOCK_LAST_NAMES);

    form.setValue('firstName', fName);
    form.setValue('lastName', lName);
    form.setValue('contactInfo.address.street', `${Math.floor(100 + Math.random() * 900)} ${getRandomItem(MOCK_STREETS)}`);
    form.setValue('contactInfo.address.city', getRandomItem(MOCK_CITIES));
    form.setValue('contactInfo.address.state', getRandomItem(MOCK_STATES));
    form.setValue('contactInfo.address.zipCode', getRandomZip());
    form.setValue('contactInfo.phone', getRandomPhone());
    form.setValue('contactInfo.email', `${fName.toLowerCase()}.${lName.toLowerCase()}@example.com`);
    form.setValue('dateOfBirth', getRandomDateOfBirth());
    form.setValue('insuranceInfo.policyNumber', getRandomPolicyNumber());

    toast({ title: 'Simulation Successful', description: 'Patient data has been populated with random values.' });
    
    setIsOcrLoading(false);
  };

  const savePatient = async (data: PatientFormValues): Promise<ClientPatient | null> => {
    if (!token) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You are not logged in.' });
      return null;
    }
  
    try {
      const response = await fetch('/api/v1/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...data, dateOfBirth: new Date(data.dateOfBirth) })
      });
  
      if (response.status === 409) {
        throw new Error('A patient with this MRN already exists. Please search for them instead.');
      }
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save patient.');
      }
  
      toast({ title: 'Patient created successfully' });
      
      const savedPatientData = await response.json();
      form.reset();
      onOpenChange(false);
      onPatientCreated(savedPatientData);
      return savedPatientData;
  
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error saving patient', description: error.message });
      return null;
    }
  }

  const handleFormSubmit = async (data: PatientFormValues, createOrder?: boolean) => {
    setIsSubmitting(true);
    const savedPatient = await savePatient(data);
    
    if (savedPatient && createOrder) {
      router.push(`/orders?patientId=${savedPatient.id}`);
    }
    setIsSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
            <DialogTitle>Create New Patient</DialogTitle>
            <DialogDescription>Fill out the form below to register a new patient. The MRN will be generated automatically.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => handleFormSubmit(data))} className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[75vh] overflow-y-auto pr-6">
            <div className="md:col-span-2 space-y-4">
                <div className="relative flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card text-center hover:border-primary">
                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                        {isOcrLoading ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processing...</span> : ocrFileName ? <span className="font-medium text-foreground">{ocrFileName}</span> : 'Scan ID / Insurance Card (Simulated)'}
                    </p>
                    <Input id="file-upload" type="file" className="absolute h-full w-full opacity-0" onChange={handleFileChange} disabled={isOcrLoading} accept="image/*,.pdf"/>
                </div>
            </div>
            <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="dateOfBirth" render={({ field }) => ( <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" placeholder="YYYY-MM-DD" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="contactInfo.phone" render={({ field }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="(555) 123-4567" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="contactInfo.email" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Email Address</FormLabel><FormControl><Input placeholder="john.doe@email.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="contactInfo.address.street" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Street Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="contactInfo.address.city" render={({ field }) => ( <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Anytown" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="contactInfo.address.state" render={({ field }) => ( <FormItem><FormLabel>State</FormLabel><FormControl><Input placeholder="CA" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="contactInfo.address.zipCode" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Zip Code</FormLabel><FormControl><Input placeholder="12345" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="insuranceInfo.policyNumber" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Insurance Policy #</FormLabel><FormControl><Input placeholder="XZ987654321" {...field} /></FormControl><FormMessage /></FormItem>)} />

            <DialogFooter className="md:col-span-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Patient
                </Button>
                <Button type="button" onClick={form.handleSubmit((data) => handleFormSubmit(data, true))} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save and Create Order
                </Button>
            </DialogFooter>
        </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


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
      id: editingOrder?.id,
      patientId: patient.id,
      physicianId: editingOrder?.physicianId,
      icd10Code: editingOrder?.icd10Code,
      testIds: editingOrder?.samples[0].tests.map(t => t.testCode),
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

function OrderDialogContent({ onOrderSaved, editingOrder, initialPatientId }: { onOrderSaved: () => void, editingOrder?: ClientOrder | null, initialPatientId?: string | null }) {
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
    if (isEditing && editingOrder?.patientId) {
        fetchPatientById(editingOrder.patientId);
    } else if (!isEditing && initialPatientId && token && !selectedPatient) {
        fetchPatientById(initialPatientId);
    }
  }, [initialPatientId, token, isEditing, editingOrder, selectedPatient, fetchPatientById]);

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



export default function ReceptionistDashboard() {
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('labwise-token');
        if (!token) throw new Error("Authentication token not found.");
        
        const response = await fetch('/api/v1/appointments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch appointments');
        
        const data = await response.json();
        setAppointments(data);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [toast]);
  
  const handlePatientCreated = (patient: ClientPatient) => {
     router.push(`/patient-registration`);
  }

  const handleOrderSaved = () => {
      setIsOrderFormOpen(false);
      // We can add a refresh of some data here if needed in the future
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="h-full shadow-lg">
          <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
            <CardDescription>
              Manage phlebotomy appointments and walk-ins.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? Array.from({length: 7}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              : appointments.map((appt, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(appt.scheduledTime), 'hh:mm a')}</span>
                  </div>
                  <div className="flex-1 font-medium">{appt.patientInfo?.firstName} {appt.patientInfo?.lastName || 'Walk-in'}</div>
                  <div>
                    <Badge
                      variant={
                        appt.status === 'Completed'
                          ? 'secondary'
                          : appt.status === 'CheckedIn'
                          ? 'default'
                          : appt.status === 'NoShow'
                          ? 'destructive'
                          : 'outline'
                      }
                      className={cn(
                        appt.status === 'Scheduled' && 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                        appt.status === 'CheckedIn' && 'bg-accent text-accent-foreground',
                      )}
                    >
                      {appt.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
         <Card className="h-full shadow-lg flex flex-col">
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                Use quick actions for common tasks.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-center gap-4">
                 <Button className="w-full h-24 text-lg" onClick={() => setIsPatientFormOpen(true)}>
                    <User className="mr-4 h-8 w-8"/> New Patient
                </Button>
                <Dialog open={isOrderFormOpen} onOpenChange={setIsOrderFormOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full h-24 text-lg" variant="outline">
                             <FileSearch className="mr-4 h-8 w-8"/> New Order
                        </Button>
                    </DialogTrigger>
                     <DialogContent className="max-w-4xl">
                        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                            <OrderDialogContent onOrderSaved={handleOrderSaved} />
                        </Suspense>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
        <PatientRegistrationDialog open={isPatientFormOpen} onOpenChange={setIsPatientFormOpen} onPatientCreated={handlePatientCreated} />
      </div>
    </div>
  );
}
