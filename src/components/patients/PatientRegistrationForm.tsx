
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScanLine, Loader2, CreditCard, User, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { ClientPatient } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

const patientSchema = z.object({
  firstName: z.string().min(2, 'Required'),
  lastName: z.string().min(2, 'Required'),
  dateOfBirth: z.string().refine((date) => new Date(date).toString() !== 'Invalid Date', {
    message: "A valid date is required.",
  }),
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']),
  phone: z.string().min(10, 'Valid phone number required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.object({
      street: z.string().min(5, 'Required'),
      city: z.string().min(2, 'Required'),
      state: z.string().min(2, 'Required'),
      zipCode: z.string().min(5, 'Required'),
      country: z.string().default('USA'),
  }),
  insuranceProvider: z.string().min(2, 'Required'),
  policyNumber: z.string().min(5, 'Required'),
});

type PatientFormValues = z.infer<typeof patientSchema>;

export function PatientRegistrationForm({ onSuccess }: { onSuccess: (patient: ClientPatient) => void }) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [verifyingEligibility, setVerifyingEligibility] = useState(false);
  const [eligibilityStatus, setEligibilityStatus] = useState<'None' | 'Verified'>('None');

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'Prefer not to say',
      phone: '',
      email: '',
      address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'USA',
      },
      insuranceProvider: '',
      policyNumber: '',
    },
  });

  const simulateScan = () => {
      setIsScanning(true);
      setTimeout(() => {
          form.reset({
              firstName: 'Alice',
              lastName: 'Wonderland',
              dateOfBirth: '1990-05-15',
              gender: 'Female',
              phone: '555-0199',
              email: 'alice@example.com',
              address: {
                  street: '123 Rabbit Hole Ln',
                  city: 'Wonderland',
                  state: 'NY',
                  zipCode: '10001',
                  country: 'USA'
              },
              insuranceProvider: 'Blue Cross',
              policyNumber: 'BCBS-99887766',
          });
          setIsScanning(false);
          toast({
              title: "Scan Complete",
              description: "Patient data extracted successfully from ID card.",
          });
      }, 1500);
  };

  const handleVerifyEligibility = async () => {
      const provider = form.getValues('insuranceProvider');
      const policy = form.getValues('policyNumber');

      if (!provider || !policy) {
          toast({ variant: 'destructive', title: 'Missing Info', description: 'Please enter provider and policy number.' });
          return;
      }

      setVerifyingEligibility(true);
      try {
          const token = localStorage.getItem('labwise-token');
          const res = await fetch('/api/v1/verify-eligibility', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ patientId: 'temp', policyNumber: policy })
          });

          if (res.ok) {
              // Simulate async polling delay
              setTimeout(() => {
                  setVerifyingEligibility(false);
                  setEligibilityStatus('Verified');
                  toast({ title: 'Eligibility Confirmed', description: 'Active Coverage. Copay: $25.00' });
              }, 2000);
          }
      } catch (e) {
          setVerifyingEligibility(false);
      }
  };

  const onSubmit = async (data: PatientFormValues) => {
    try {
        const token = localStorage.getItem('labwise-token');

        const apiBody = {
            firstName: data.firstName,
            lastName: data.lastName,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            contactInfo: {
                phone: data.phone,
                email: data.email || undefined,
                address: data.address
            },
            insuranceInfo: [
                {
                    providerName: data.insuranceProvider,
                    policyNumber: data.policyNumber,
                    isPrimary: true
                }
            ]
        };

        const response = await fetch('/api/v1/patients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(apiBody)
        });

        if (response.ok) {
            const newPatient = await response.json();
            toast({ title: 'Success', description: `Patient registered with MRN: ${newPatient.mrn}` });
            onSuccess(newPatient);
        } else {
            const errorData = await response.json();
            toast({ variant: 'destructive', title: 'Error', description: errorData.message || 'Failed to register patient.' });
        }
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-center pb-4">
            <Button
                type="button"
                size="lg"
                className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all hover:scale-105"
                onClick={simulateScan}
                disabled={isScanning}
            >
                {isScanning ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ScanLine className="mr-2 h-5 w-5" />}
                {isScanning ? 'Scanning...' : 'Scan ID / Insurance Card'}
            </Button>
        </div>

        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                    Or enter details manually
                </span>
            </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Demographics Section */}
            <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2 text-primary"><User className="h-4 w-4" /> Demographics</h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                        <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                        <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                        <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="gender" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                                <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                </div>
            </div>

            <Separator />

            {/* Contact Section */}
            <div className="space-y-3">
                 <h3 className="font-medium text-sm text-muted-foreground">Contact Info</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="address.street" render={({ field }) => (
                    <FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="address.city" render={({ field }) => (
                        <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="address.state" render={({ field }) => (
                        <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="address.zipCode" render={({ field }) => (
                        <FormItem><FormLabel>Zip</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
            </div>

            <Separator />

            {/* Insurance Section */}
            <div className="space-y-3">
                 <div className="flex items-center justify-between">
                    <h3 className="font-medium flex items-center gap-2 text-primary"><CreditCard className="h-4 w-4" /> Insurance</h3>
                    {eligibilityStatus === 'Verified' ? (
                        <Badge className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1" /> Active Coverage</Badge>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleVerifyEligibility}
                            disabled={verifyingEligibility}
                        >
                            {verifyingEligibility ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Verify Eligibility
                        </Button>
                    )}
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="insuranceProvider" render={({ field }) => (
                        <FormItem><FormLabel>Provider</FormLabel><FormControl><Input placeholder="e.g. Aetna" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="policyNumber" render={({ field }) => (
                        <FormItem><FormLabel>Policy #</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
            </div>

            <Button type="submit" className="w-full h-11 text-lg mt-6">Create Patient Record</Button>
          </form>
        </Form>
    </div>
  );
}
