
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Plus, Trash2, Calendar as CalendarIcon, Check, X, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useToast } from '@/hooks/use-toast';
import { ClientPatient, ClientTestCatalogItem, ClientUser } from '@/lib/types';
import { format, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/user-context';

// Mock ICD-10 Data (In a real app, this would be an API search)
const ICD10_CODES = [
    { code: "Z00.00", description: "Encounter for general adult medical exam w/o abnormal findings" },
    { code: "E11.9", description: "Type 2 diabetes mellitus without complications" },
    { code: "I10", description: "Essential (primary) hypertension" },
    { code: "E03.9", description: "Hypothyroidism, unspecified" },
    { code: "N18.9", description: "Chronic kidney disease, unspecified" },
    { code: "R73.09", description: "Other abnormal glucose" },
    { code: "D64.9", description: "Anemia, unspecified" },
    { code: "J01.90", description: "Acute sinusitis, unspecified" },
];

const orderSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  physicianId: z.string().min(1, 'Physician is required'),
  icd10Code: z.string().min(1, 'Diagnosis code is required'),
  priority: z.enum(['Routine', 'STAT']),
  clinicalJustification: z.string().optional(), // Required if STAT
  scheduledTime: z.string().min(1, 'Appointment time is required'),
  durationMinutes: z.string().default("15"),
  status: z.enum(['Scheduled', 'CheckedIn']).default('Scheduled'),
  notes: z.string().optional(),
}).refine((data) => {
    if (data.priority === 'STAT' && !data.clinicalJustification) {
        return false;
    }
    return true;
}, {
    message: "Justification is required for STAT orders",
    path: ["clinicalJustification"],
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function OrderEntryPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Data States
  const [patients, setPatients] = useState<ClientPatient[]>([]);
  const [physicians, setPhysicians] = useState<ClientUser[]>([]);
  const [testCatalog, setTestCatalog] = useState<ClientTestCatalogItem[]>([]);

  // Selection States
  const [selectedPatient, setSelectedPatient] = useState<ClientPatient | null>(null);
  const [selectedTests, setSelectedTests] = useState<ClientTestCatalogItem[]>([]);
  const [searchPatientQuery, setSearchPatientQuery] = useState('');
  const [openPatientCombo, setOpenPatientCombo] = useState(false);
  const [openTestCombo, setOpenTestCombo] = useState(false);
  const [openIcdCombo, setOpenIcdCombo] = useState(false);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      patientId: '',
      physicianId: '',
      icd10Code: '',
      priority: 'Routine',
      clinicalJustification: '',
      scheduledTime: format(addMinutes(new Date(), 30), "yyyy-MM-dd'T'HH:mm"), // Default to 30 mins from now
      durationMinutes: "15",
      status: 'Scheduled',
      notes: '',
    },
  });

  // Fetch initial data
  useEffect(() => {
      const fetchData = async () => {
        const token = localStorage.getItem('labwise-token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch Physicians (Users with role=physician)
        // Note: Our users API currently requires role=manager to see all users.
        // We added a special case in middleware for Receptionist to GET /users?role=physician.
        const physRes = await fetch('/api/v1/users?role=physician', { headers });
        if (physRes.ok) setPhysicians(await physRes.json());

        // Fetch Test Catalog
        const testRes = await fetch('/api/v1/test-catalog', { headers });
        if (testRes.ok) setTestCatalog(await testRes.json());
      };
      fetchData();
  }, []);

  // Search patients effect
  useEffect(() => {
      if (searchPatientQuery.length < 2) return;
      const timeoutId = setTimeout(async () => {
          const token = localStorage.getItem('labwise-token');
          const res = await fetch(`/api/v1/patients?q=${searchPatientQuery}`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) setPatients(await res.json());
      }, 300);
      return () => clearTimeout(timeoutId);
  }, [searchPatientQuery]);

  const handleAddTest = (test: ClientTestCatalogItem) => {
      if (!selectedTests.some(t => t.id === test.id)) {
          setSelectedTests([...selectedTests, test]);
      }
      setOpenTestCombo(false);
  };

  const handleRemoveTest = (testId: string) => {
      setSelectedTests(selectedTests.filter(t => t.id !== testId));
  };

  const onSubmit = async (data: OrderFormValues) => {
    if (selectedTests.length === 0) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please add at least one test to the order.' });
        return;
    }

    setLoading(true);
    try {
        const token = localStorage.getItem('labwise-token');
        const apiBody = {
            ...data,
            testIds: selectedTests.map(t => t.testCode), // Send test codes
            appointmentDetails: {
                scheduledTime: data.scheduledTime,
                durationMinutes: data.durationMinutes,
                status: data.status,
                notes: data.notes
            }
        };

        const response = await fetch('/api/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(apiBody)
        });

        if (response.ok) {
            const result = await response.json();
            toast({ title: 'Order Created', description: `Order ${result.orderId} created successfully.` });
            // Reset form
            form.reset();
            setSelectedTests([]);
            setSelectedPatient(null);
            setSearchPatientQuery('');
        } else {
            const errorData = await response.json();
            toast({ variant: 'destructive', title: 'Error', description: errorData.message || 'Failed to create order.' });
        }
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">New Test Order</h1>
          <p className="text-muted-foreground">Create a new requisition and schedule collection.</p>
        </div>
      </div>

      <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Patient & Physician Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">1. Patient & Provider</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <FormField
                            control={form.control}
                            name="patientId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Patient Search</FormLabel>
                                <Popover open={openPatientCombo} onOpenChange={setOpenPatientCombo}>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openPatientCombo}
                                        className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                        >
                                        {selectedPatient
                                            ? `${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.mrn})`
                                            : "Search patient by name or MRN..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0">
                                    <Command shouldFilter={false}>
                                        <CommandInput
                                            placeholder="Type to search..."
                                            value={searchPatientQuery}
                                            onValueChange={setSearchPatientQuery}
                                        />
                                        <CommandList>
                                            <CommandEmpty>No patient found.</CommandEmpty>
                                            <CommandGroup>
                                            {patients.map((patient) => (
                                                <CommandItem
                                                key={patient.id}
                                                value={patient.id}
                                                onSelect={() => {
                                                    form.setValue("patientId", patient.id);
                                                    setSelectedPatient(patient);
                                                    setOpenPatientCombo(false);
                                                }}
                                                >
                                                <Check
                                                    className={cn("mr-2 h-4 w-4", selectedPatient?.id === patient.id ? "opacity-100" : "opacity-0")}
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{patient.firstName} {patient.lastName}</span>
                                                    <span className="text-xs text-muted-foreground">MRN: {patient.mrn} | DOB: {format(new Date(patient.dateOfBirth), 'MM/dd/yyyy')}</span>
                                                </div>
                                                </CommandItem>
                                            ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="physicianId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Ordering Physician</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select physician" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {physicians.map((phys) => (
                                        <SelectItem key={phys.id} value={phys.id}>Dr. {phys.firstName} {phys.lastName}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">2. Clinical Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Priority</FormLabel>
                                <FormControl>
                                    <div className="flex gap-4">
                                        <div className={cn(
                                            "cursor-pointer rounded-md border-2 px-4 py-2 transition-all",
                                            field.value === 'Routine' ? "border-primary bg-primary/10" : "border-transparent bg-muted"
                                        )} onClick={() => field.onChange('Routine')}>
                                            <span className="font-bold">Routine</span>
                                        </div>
                                        <div className={cn(
                                            "cursor-pointer rounded-md border-2 px-4 py-2 transition-all",
                                            field.value === 'STAT' ? "border-destructive bg-destructive/10 text-destructive" : "border-transparent bg-muted"
                                        )} onClick={() => field.onChange('STAT')}>
                                            <span className="font-bold">STAT</span>
                                        </div>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        {form.watch('priority') === 'STAT' && (
                             <FormField
                             control={form.control}
                             name="clinicalJustification"
                             render={({ field }) => (
                                 <FormItem>
                                 <FormLabel className="text-destructive">STAT Justification (Required)</FormLabel>
                                 <FormControl>
                                     <Input placeholder="e.g., Patient in ER..." {...field} />
                                 </FormControl>
                                 <FormMessage />
                                 </FormItem>
                             )}
                         />
                        )}

                         <FormField
                            control={form.control}
                            name="icd10Code"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Diagnosis (ICD-10)</FormLabel>
                                <Popover open={openIcdCombo} onOpenChange={setOpenIcdCombo}>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openIcdCombo}
                                        className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                        >
                                        {field.value ? ICD10_CODES.find((code) => code.code === field.value)?.code + " - " + ICD10_CODES.find((code) => code.code === field.value)?.description.substring(0, 20) + "..." : "Select diagnosis..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search ICD-10 codes..." />
                                        <CommandList>
                                            <CommandEmpty>No code found.</CommandEmpty>
                                            <CommandGroup>
                                            {ICD10_CODES.map((code) => (
                                                <CommandItem
                                                key={code.code}
                                                value={code.code}
                                                onSelect={() => {
                                                    form.setValue("icd10Code", code.code);
                                                    setOpenIcdCombo(false);
                                                }}
                                                >
                                                <Check
                                                    className={cn("mr-2 h-4 w-4", field.value === code.code ? "opacity-100" : "opacity-0")}
                                                />
                                                 <div className="flex flex-col">
                                                    <span className="font-bold">{code.code}</span>
                                                    <span className="text-xs text-muted-foreground">{code.description}</span>
                                                </div>
                                                </CommandItem>
                                            ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Test Selection */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">3. Test Selection</CardTitle>
                     <Popover open={openTestCombo} onOpenChange={setOpenTestCombo}>
                        <PopoverTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Test
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="end">
                        <Command>
                            <CommandInput placeholder="Search tests..." />
                            <CommandList>
                                <CommandEmpty>No test found.</CommandEmpty>
                                <CommandGroup>
                                {testCatalog.map((test) => (
                                    <CommandItem
                                    key={test.id}
                                    value={test.name}
                                    onSelect={() => handleAddTest(test)}
                                    >
                                    <div className="flex flex-col w-full">
                                        <div className="flex justify-between">
                                            <span className="font-medium">{test.name}</span>
                                            <span className="text-xs font-mono bg-muted px-1 rounded">{test.testCode}</span>
                                        </div>
                                    </div>
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                        </PopoverContent>
                    </Popover>
                </CardHeader>
                <CardContent>
                    {selectedTests.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            No tests selected. Search and add tests above.
                        </div>
                    ) : (
                        <div className="space-y-2">
                             {selectedTests.map((test, idx) => (
                                 <div key={`${test.id}-${idx}`} className="flex items-center justify-between p-3 bg-muted/20 border rounded-md">
                                     <div className="flex items-center gap-3">
                                         <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                             {test.testCode}
                                         </div>
                                         <div>
                                             <div className="font-medium">{test.name}</div>
                                             <div className="text-xs text-muted-foreground">
                                                 {test.specimenRequirements.tubeType} Tube • {test.turnaroundTime.value} {test.turnaroundTime.units}
                                             </div>
                                         </div>
                                     </div>
                                     <Button variant="ghost" size="icon" onClick={() => handleRemoveTest(test.id)}>
                                         <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                     </Button>
                                 </div>
                             ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Scheduling */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">4. Appointment Scheduling</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-6">
                     <FormField
                        control={form.control}
                        name="scheduledTime"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Date & Time</FormLabel>
                            <FormControl>
                                <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="durationMinutes"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Duration (Minutes)</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="15">15 Minutes (Standard)</SelectItem>
                                    <SelectItem value="30">30 Minutes (Complex)</SelectItem>
                                    <SelectItem value="60">60 Minutes</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem className="col-span-2">
                            <FormLabel>Notes for Phlebotomist</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Patient prefers butterfly needle..." {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => form.reset()}>Clear Form</Button>
                <Button type="submit" size="lg" disabled={loading} className="min-w-[200px]">
                    {loading ? 'Submitting...' : 'Create Order'}
                </Button>
            </div>

          </form>
      </Form>
    </div>
  );
}
