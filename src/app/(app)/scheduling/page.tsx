
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Clock, PlusCircle, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { ClientAppointment, ClientPatient } from '@/lib/types';

const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required.'),
  scheduledTime: z.string().min(1, 'Time is required.'),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

function NewAppointmentForm({ onSave }: { onSave: () => void }) {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<ClientPatient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ClientPatient | null>(null);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { scheduledTime: format(new Date(), "yyyy-MM-dd'T'HH:mm") },
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!patientSearch.trim() || !token) {
        setPatientResults([]);
        return;
    }
    const searchDebounce = setTimeout(async () => {
        setIsSearching(true);
        try {
            const response = await fetch(`/api/v1/patients?q=${patientSearch}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Patient search failed');
            const data = await response.json();
            setPatientResults(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not search for patients.' });
        } finally {
            setIsSearching(false);
        }
    }, 300);
    return () => clearTimeout(searchDebounce);
  }, [patientSearch, token, toast]);

  const handleSelectPatient = (patient: ClientPatient) => {
    setSelectedPatient(patient);
    form.setValue('patientId', patient.id);
    setIsPopoverOpen(false);
  }

  const onSubmit = async (data: AppointmentFormValues) => {
    if (!token) return;
    try {
        const response = await fetch('/api/v1/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                ...data,
                scheduledTime: new Date(data.scheduledTime),
                durationMinutes: 15,
                status: 'Scheduled',
            }),
        });
        if (!response.ok) throw new Error('Failed to create appointment');
        toast({ title: 'Appointment Created', description: 'The new appointment has been added to the schedule.' });
        onSave();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="patientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Patient</FormLabel>
               <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                   <FormControl>
                      <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                        {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "Select patient"}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder="Search patient..." value={patientSearch} onValueChange={setPatientSearch} />
                        <CommandList>
                            {isSearching && <CommandEmpty>Searching...</CommandEmpty>}
                            {patientResults.length === 0 && !isSearching && <CommandEmpty>No patient found.</CommandEmpty>}
                            <CommandGroup>
                                {patientResults.map((patient) => (
                                    <CommandItem value={patient.id} key={patient.id} onSelect={() => handleSelectPatient(patient)}>
                                        {patient.firstName} {patient.lastName} (MRN: {patient.mrn})
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
        <FormField control={form.control} name="scheduledTime" render={({ field }) => (<FormItem><FormLabel>Scheduled Time</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes (optional)</FormLabel><FormControl><Input placeholder="e.g., Patient is nervous" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <DialogFooter>
          <Button type="submit" disabled={form.formState.isSubmitting}>
             {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             Create Appointment
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}


export default function SchedulingPage() {
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const fetchAppointments = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleSave = () => {
    setIsFormOpen(false);
    fetchAppointments();
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appointment Scheduling</h1>
            <p className="text-muted-foreground">Manage phlebotomy appointments and walk-ins for today.</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Appointment
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Appointment</DialogTitle>
                    <DialogDescription>Schedule a new phlebotomy appointment for a patient.</DialogDescription>
                </DialogHeader>
                <NewAppointmentForm onSave={handleSave} />
            </DialogContent>
          </Dialog>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Today's Appointments</CardTitle>
          <CardDescription>A list of scheduled, active, and completed appointments for today.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              Array.from({length: 7}).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : appointments.length > 0 ? (
              appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground md:text-base">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(appt.scheduledTime), 'hh:mm a')}</span>
                  </div>
                  <div className="flex-1 font-medium">{appt.patientInfo?.firstName} {appt.patientInfo?.lastName || 'Walk-in'}</div>
                  <div className="text-sm text-muted-foreground hidden md:block">
                      MRN: {appt.patientInfo?.mrn || 'N/A'}
                  </div>
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
                        'text-xs md:text-sm',
                        appt.status === 'Scheduled' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
                        appt.status === 'CheckedIn' && 'bg-accent text-accent-foreground',
                      )}
                    >
                      {appt.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
                <div className="flex h-48 items-center justify-center text-muted-foreground">
                    No appointments scheduled for today.
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
