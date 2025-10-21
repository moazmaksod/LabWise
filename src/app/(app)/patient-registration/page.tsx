
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UploadCloud, Loader2, ShieldAlert, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClientPatient } from '@/lib/types';
import { format } from 'date-fns';

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

function PatientRegistrationPageComponent() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrFileName, setOcrFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingEligibility, setIsVerifyingEligibility] = useState(false);
  const [pageIsLoading, setPageIsLoading] = useState(true);

  const searchParams = useSearchParams();
  const patientId = searchParams.get('id');

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: '', lastName: '', dateOfBirth: '',
      contactInfo: { phone: '', email: '', address: { street: '', city: '', state: '', zipCode: '', country: 'USA' } },
      insuranceInfo: { providerName: 'Mock Insurance', policyNumber: '' },
    },
  });

  const isEditing = !!patientId;

  const fetchPatient = useCallback(async (id: string, authToken: string) => {
    try {
        const response = await fetch(`/api/v1/patients/${id}`, { headers: { 'Authorization': `Bearer ${authToken}` }});
        if (!response.ok) throw new Error('Failed to fetch patient data.');
        const patientData: ClientPatient = await response.json();
        form.reset({
            id: patientData.id,
            firstName: patientData.firstName,
            lastName: patientData.lastName,
            dateOfBirth: format(new Date(patientData.dateOfBirth), 'yyyy-MM-dd'),
            contactInfo: patientData.contactInfo,
            insuranceInfo: patientData.insuranceInfo?.[0]
        });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
        router.push('/patient-management');
    } finally {
        setPageIsLoading(false);
    }
  }, [form, toast, router]);

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    if (storedToken) {
        setToken(storedToken);
        if (patientId) {
            fetchPatient(patientId, storedToken);
        } else {
            setPageIsLoading(false);
        }
    }
  }, [patientId, fetchPatient]);
  

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsOcrLoading(true);
    setOcrFileName(file.name);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate OCR
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
        toast({ variant: 'destructive', title: 'Missing Policy Number', description: 'Please enter an insurance policy number to verify.' });
        return;
    }
    setIsVerifyingEligibility(true);
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API call
    toast({ title: 'Insurance Eligibility Verified', description: `Policy #${policyNumber} is Active. Co-pay: $${(Math.random() * 50).toFixed(2)}` });
    setIsVerifyingEligibility(false);
  };

  const savePatient = async (data: PatientFormValues): Promise<ClientPatient | null> => {
    if (!token) return null;
    const apiEndpoint = isEditing ? `/api/v1/patients` : '/api/v1/patients';
    const method = isEditing ? 'PUT' : 'POST';
  
    try {
      const response = await fetch(apiEndpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...data, dateOfBirth: new Date(data.dateOfBirth) })
      });
      if (response.status === 409 && !isEditing) throw new Error('A patient with this MRN already exists.');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save patient.');
      }
      const savedPatientData = await response.json();
      return isEditing ? { ...data, id: data.id! } as ClientPatient : savedPatientData;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error saving patient', description: error.message });
      return null;
    }
  }

  const handleFormSubmit = async (data: PatientFormValues, createOrder?: boolean) => {
    setIsSubmitting(true);
    const savedPatient = await savePatient(data);
    if (savedPatient) {
        toast({ 
            title: `Patient ${isEditing ? 'Updated' : 'Created'}`,
            description: `Record for ${savedPatient.firstName} ${savedPatient.lastName} (MRN: ${savedPatient.mrn}) has been saved.`
        });
        if (createOrder) {
            router.push(`/order-entry?patientId=${savedPatient.id}`);
        } else {
            router.push('/patient-management');
        }
    }
    setIsSubmitting(false);
  }

  if (userLoading || pageIsLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (user?.role !== 'receptionist' && user?.role !== 'manager' && user?.role !== 'physician') {
    setTimeout(() => router.push('/dashboard'), 3000);
    return (
        <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>You do not have permission to access this page. You will be redirected.</AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
        <Button variant="outline" onClick={() => router.push('/patient-management')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Patient List
        </Button>
        <Card>
            <CardHeader>
                <CardTitle>{isEditing ? 'Edit Patient' : 'Create New Patient'}</CardTitle>
                <CardDescription>{isEditing ? `Updating information for ${form.getValues('firstName')} ${form.getValues('lastName')}` : 'Fill out the form below to register a new patient. The MRN will be generated automatically.'}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                 <form onSubmit={form.handleSubmit((data) => handleFormSubmit(data))} className="space-y-6">
                    {!isEditing && (
                      <div className="space-y-4">
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
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => router.push('/patient-management')}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? 'Save Changes' : 'Save Patient'}
                        </Button>
                         {!isEditing && (
                            <Button type="button" onClick={form.handleSubmit((data) => handleFormSubmit(data, true))} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save and Create Order
                            </Button>
                        )}
                    </div>
                 </form>
                 </Form>
            </CardContent>
        </Card>
    </div>
  );
}


export default function PatientRegistrationPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[calc(100vh-8rem)] w-full" />}>
            <PatientRegistrationPageComponent />
        </Suspense>
    )
}
