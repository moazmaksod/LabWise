'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { PlusCircle, Loader2, UploadCloud, FilePlus, User } from 'lucide-react';
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

export default function ReceptionistDashboard() {
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
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
     // After creating a patient from the dashboard, you might want to navigate
     // to the full patient registration page to see them in the list,
     // or directly to the order page.
     router.push(`/patient-registration`);
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
            <CardContent className="flex-grow flex flex-col justify-center">
                 <Button className="w-full h-24 text-lg" onClick={() => setIsPatientFormOpen(true)}>
                    <User className="mr-4 h-8 w-8"/> New Patient
                </Button>
            </CardContent>
        </Card>
        <PatientRegistrationDialog open={isPatientFormOpen} onOpenChange={setIsPatientFormOpen} onPatientCreated={handlePatientCreated} />
      </div>
    </div>
  );
}
