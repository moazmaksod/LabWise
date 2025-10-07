

'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, PlusCircle, UploadCloud, Loader2, User, ShieldAlert, FilePlus, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { handleSmartDataEntry } from '@/app/actions';
import type { ClientPatient } from '@/lib/types';
import { format } from 'date-fns';
import { cn, calculateAge } from '@/lib/utils';

const patientSchema = z.object({
  id: z.string().optional(),
  // MRN is no longer part of the form validation
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

function PatientPageComponent() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ClientPatient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrFileName, setOcrFileName] = useState('');
  const [editingPatient, setEditingPatient] = useState<ClientPatient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingEligibility, setIsVerifyingEligibility] = useState(false);
  
  const searchParams = useSearchParams();

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

  const fetchPatients = useCallback(async (query: string) => {
    if (!token) return;
    setIsSearching(true);
    try {
        const url = query ? `/api/v1/patients?q=${query}` : '/api/v1/patients';
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setSearchResults(data);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not perform patient search.' });
        setSearchResults([]);
    } finally {
        setIsSearching(false);
    }
  }, [token, toast]);

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token) {
        if (searchParams.get('new')) {
            handleAddNew();
        }
        fetchPatients(searchTerm);
    }
  }, [token, fetchPatients, searchTerm, searchParams]);
  

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    setOcrFileName(file.name);

    // Simulate a network delay for the OCR process
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

  const handleVerifyEligibility = async () => {
    const policyNumber = form.getValues('insuranceInfo.policyNumber');
    if (!policyNumber) {
        toast({
            variant: 'destructive',
            title: 'Missing Policy Number',
            description: 'Please enter an insurance policy number to verify.',
        });
        return;
    }
    setIsVerifyingEligibility(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1200));
    toast({
        title: 'Insurance Eligibility Verified',
        description: `Policy #${policyNumber} is Active. Co-pay: $${(Math.random() * 50).toFixed(2)}`,
    });
    setIsVerifyingEligibility(false);
  };

  const handleAddNew = () => {
    setEditingPatient(null);
    form.reset({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      contactInfo: { phone: '', email: '', address: { street: '', city: '', state: '', zipCode: '', country: 'USA' } },
      insuranceInfo: { providerName: 'Mock Insurance', policyNumber: '' },
    });
    setIsFormOpen(true);
    // Clean up URL if it was opened via query param
    const newUrl = new URL(window.location.href);
    if (newUrl.searchParams.has('new')) {
      newUrl.searchParams.delete('new');
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  };

  const handleEdit = (patient: ClientPatient) => {
    setEditingPatient(patient);
    form.reset({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: format(new Date(patient.dateOfBirth), 'yyyy-MM-dd'),
      contactInfo: patient.contactInfo,
      insuranceInfo: patient.insuranceInfo?.[0]
    });
    setIsFormOpen(true);
  };

  const savePatient = async (data: PatientFormValues): Promise<ClientPatient | null> => {
    if (!token) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You are not logged in.' });
      return null;
    }
  
    const isEditing = !!data.id;
    const apiEndpoint = isEditing ? '/api/v1/patients' : '/api/v1/patients';
    const method = isEditing ? 'PUT' : 'POST';
  
    try {
      const response = await fetch(apiEndpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...data, dateOfBirth: new Date(data.dateOfBirth) })
      });
  
      if (response.status === 409 && !isEditing) {
        throw new Error('A patient with this MRN already exists. Please search for them instead.');
      }
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save patient.');
      }
  
      toast({ title: `Patient ${isEditing ? 'updated' : 'created'} successfully` });
      
      const savedPatientData = await response.json();

      setIsFormOpen(false);
      form.reset();
  
      // Trigger a new search to refresh the list
      fetchPatients(data.lastName);

      return isEditing ? { ...data, id: data.id! } as ClientPatient : savedPatientData;
  
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error saving patient', description: error.message });
      return null;
    }
  }

  const handleFormSubmit = async (data: PatientFormValues, createOrder?: boolean) => {
    setIsSubmitting(true);
    const savedPatient = await savePatient(data);
    
    if (savedPatient && createOrder) {
      router.push(`/orders?patientId=${savedPatient.id}&new=true`);
    }
    setIsSubmitting(false);
  }

  if (userLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (user?.role !== 'receptionist' && user?.role !== 'manager') {
    setTimeout(() => router.push('/dashboard'), 3000);
    return (
        <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
                You do not have permission to access this page. You will be redirected.
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Patients</CardTitle>
          <CardDescription>Search for an existing patient or create a new record.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-grow">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                  type="search"
                  placeholder="Start typing to search by Name, MRN, Phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={handleAddNew}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Patient
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                 <DialogHeader>
                    <DialogTitle>{editingPatient ? 'Edit Patient' : 'Create New Patient'}</DialogTitle>
                    <DialogDescription>{editingPatient ? `Updating information for ${editingPatient.firstName} ${editingPatient.lastName}` : 'Fill out the form below to register a new patient. The MRN will be generated automatically.'}</DialogDescription>
                 </DialogHeader>
                 <Form {...form}>
                 <form onSubmit={form.handleSubmit((data) => handleFormSubmit(data))} className="max-h-[70vh] overflow-y-auto pr-6 space-y-6 py-4">
                    {!editingPatient && (
                      <div className="md:col-span-2 space-y-4">
                          <div className="relative flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card text-center hover:border-primary">
                            <UploadCloud className="h-8 w-8 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">
                              {isOcrLoading ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processing...</span> : ocrFileName ? <span className="font-medium text-foreground">{ocrFileName}</span> : 'Scan ID / Insurance Card (Simulated)'}
                            </p>
                            <Input id="file-upload" type="file" className="absolute h-full w-full opacity-0" onChange={handleFileChange} disabled={isOcrLoading} accept="image/*,.pdf"/>
                          </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="dateOfBirth" render={({ field }) => ( <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" placeholder="YYYY-MM-DD" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="contactInfo.phone" render={({ field }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="(555) 123-4567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="contactInfo.email" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Email Address</FormLabel><FormControl><Input placeholder="john.doe@email.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="contactInfo.address.street" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Street Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="contactInfo.address.city" render={({ field }) => ( <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Anytown" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="contactInfo.address.state" render={({ field }) => ( <FormItem><FormLabel>State</FormLabel><FormControl><Input placeholder="CA" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="contactInfo.address.zipCode" render={({ field }) => ( <FormItem><FormLabel>Zip Code</FormLabel><FormControl><Input placeholder="12345" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        
                        <div className="md:col-span-2">
                            <FormLabel>Insurance Policy #</FormLabel>
                            <div className="flex items-center gap-2">
                                <FormField control={form.control} name="insuranceInfo.policyNumber" render={({ field }) => ( <FormItem className="flex-grow"><FormControl><Input placeholder="XZ987654321" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                 <Button type="button" variant="outline" onClick={handleVerifyEligibility} disabled={isVerifyingEligibility}>
                                    {isVerifyingEligibility ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                    <span className="ml-2">Verify Eligibility</span>
                                 </Button>
                            </div>
                        </div>
                    </div>


                    <DialogFooter className="md:col-span-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingPatient ? 'Save Changes' : 'Save Patient'}
                        </Button>
                         {!editingPatient && (
                            <Button type="button" onClick={form.handleSubmit((data) => handleFormSubmit(data, true))} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save and Create Order
                            </Button>
                        )}
                    </DialogFooter>
                 </form>
                 </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {searchTerm ? 'Search Results' : 'Recent Patients'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary hover:bg-secondary">
                  <TableHead>Patient</TableHead>
                  <TableHead>MRN</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                  searchResults.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div
                          className="group flex cursor-pointer items-center gap-3"
                          onClick={() => handleEdit(patient)}
                        >
                           <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><User className="h-5 w-5 text-muted-foreground" /></div>
                           <div className="font-medium group-hover:underline">{patient.firstName} {patient.lastName}</div>
                        </div>
                      </TableCell>
                      <TableCell>{patient.mrn}</TableCell>
                      <TableCell>{calculateAge(patient.dateOfBirth)}</TableCell>
                      <TableCell>{patient.contactInfo.phone}</TableCell>
                      <TableCell className="text-right">
                         <Button asChild size="sm">
                            <Link href={`/orders?patientId=${patient.id}&new=true`}>
                                <FilePlus className="mr-2 h-4 w-4" />
                                Create Order
                            </Link>
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                     {searchTerm ? 'No patients found.' : 'No recent patients found.'}
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

export default function PatientPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[calc(100vh-8rem)] w-full" />}>
            <PatientPageComponent />
        </Suspense>
    )
}
    
