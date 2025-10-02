
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Clock, PlusCircle, Search, Loader2, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { ClientAppointment, ClientPatient } from '@/lib/types';
import { ObjectId } from 'mongodb';

const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required.'),
  scheduledTime: z.string().min(1, 'Time is required.'),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

function NewAppointmentForm({ onSave, selectedDate }: { onSave: () => void, selectedDate: Date }) {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<ClientPatient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ClientPatient | null>(null);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { 
        patientId: '',
        scheduledTime: format(selectedDate, "yyyy-MM-dd'T'HH:mm"),
        notes: ''
    },
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
    form.setValue('patientId', patient.id, { shouldValidate: true });
  }
  
  const handleUnselectPatient = () => {
      setSelectedPatient(null);
      form.resetField('patientId');
      setPatientSearch('');
      setPatientResults([]);
  }

  const onSubmit = async (data: AppointmentFormValues) => {
    if (!token) return;
    console.log('DEBUG: Submitting form with data:', data);

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
        if (!response.ok) {
            const errorBody = await response.json();
            console.error('DEBUG: Failed to create appointment, server response:', errorBody);
            throw new Error(errorBody.message || 'Failed to create appointment');
        }
        toast({ title: 'Appointment Created', description: 'The new appointment has been added to the schedule.' });
        onSave();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {selectedPatient ? (
          <Card className="bg-secondary">
            <CardHeader className="py-3">
              <CardTitle className="text-lg">Selected Patient</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 flex justify-between items-center">
              <div>
                <p className="font-semibold">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                <p className="text-sm text-muted-foreground">MRN: {selectedPatient.mrn}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleUnselectPatient}>Change</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patient by name, MRN..."
                className="pl-10"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>
            <div className="mt-4 overflow-hidden rounded-md border max-h-60 overflow-y-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isSearching ? <TableRow><TableCell colSpan={2}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    : patientResults.length > 0 ? patientResults.map(patient => (
                      <TableRow key={patient.id}>
                        <TableCell>
                          <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                          <div className="text-sm text-muted-foreground">MRN: {patient.mrn}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => handleSelectPatient(patient)}>Select</Button>
                        </TableCell>
                      </TableRow>
                    ))
                    : <TableRow><TableCell colSpan={2} className="h-24 text-center">{patientSearch ? 'No patients found.' : 'Start typing to see results.'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <FormField control={form.control} name="patientId" render={({ field }) => (<FormItem className="hidden"><FormLabel>Patient ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />

        <FormField control={form.control} name="scheduledTime" render={({ field }) => (<FormItem><FormLabel>Scheduled Time</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes (optional)</FormLabel><FormControl><Input placeholder="e.g., Patient is nervous" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <DialogFooter>
          <Button type="submit" disabled={form.formState.isSubmitting || !selectedPatient}>
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
  const [token, setToken] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const fetchAppointments = useCallback(async (authToken: string, date: Date) => {
    setLoading(true);
    try {
      const dateString = format(date, 'yyyy-MM-dd');
      const response = await fetch(`/api/v1/appointments?date=${dateString}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('DEBUG: Failed to fetch appointments, server response:', errorBody);
        throw new Error('Failed to fetch appointments');
      }
      
      const data = await response.json();
      console.log('DEBUG: Fetched appointments:', data);
      setAppointments(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    if (storedToken) {
      setToken(storedToken);
    } else {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    if(token) {
        fetchAppointments(token, selectedDate);
    }
  }, [fetchAppointments, token, selectedDate]);


  const handleSave = () => {
    setIsFormOpen(false);
    if(token) {
        fetchAppointments(token, selectedDate);
    }
  }
  
  const getStatusVariant = (status: ClientAppointment['status']) => {
    switch (status) {
        case 'Completed': return 'secondary';
        case 'CheckedIn': return 'default';
        case 'NoShow': return 'destructive';
        case 'Scheduled': 
        default: return 'outline';
    }
  }

  const handleDateChange = (date: Date | undefined) => {
      if (date) {
          setSelectedDate(date);
      }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col space-y-2">
                    <CardTitle className="flex items-center gap-4">
                        Appointment Scheduling
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleDateChange(subDays(selectedDate, 1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[240px] justify-start text-left font-normal",
                                    !selectedDate && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(day) => handleDateChange(day)}
                                initialFocus
                                />
                            </PopoverContent>
                            </Popover>
                            <Button variant="outline" onClick={() => handleDateChange(new Date())}>Today</Button>
                            <Button variant="outline" size="icon" onClick={() => handleDateChange(addDays(selectedDate, 1))}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardTitle>
                    <CardDescription>
                        View the daily schedule or add a new appointment.
                    </CardDescription>
                </div>
                <div className="flex-shrink-0">
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                New Appointment
                            </Button>
                        </DialogTrigger>
                        <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
                            <DialogHeader>
                                <DialogTitle>Create New Appointment</DialogTitle>
                                <DialogDescription>Schedule a new phlebotomy appointment for a patient.</DialogDescription>
                            </DialogHeader>
                            <NewAppointmentForm onSave={handleSave} selectedDate={selectedDate} />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow className="bg-secondary hover:bg-secondary">
                        <TableHead className="w-[120px]">Time</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>MRN</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({length: 7}).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
                ) : appointments.length > 0 ? (
                  appointments.map((appt) => (
                    <TableRow key={appt.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(appt.scheduledTime), 'hh:mm a')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{appt.patientInfo?.firstName} {appt.patientInfo?.lastName || 'Walk-in'}</TableCell>
                      <TableCell className="text-muted-foreground">{appt.patientInfo?.mrn || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getStatusVariant(appt.status)}>
                          {appt.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            No appointments scheduled for this day.
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
