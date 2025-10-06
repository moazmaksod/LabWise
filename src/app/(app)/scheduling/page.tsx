
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Clock, PlusCircle, Search, Loader2, CalendarIcon, ChevronLeft, ChevronRight, Edit, Trash2, Droplets, AlertTriangle } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


const appointmentSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1, 'Patient is required.'),
  scheduledTime: z.string().min(1, 'Time is required.'),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

function AppointmentForm({ onSave, selectedDate, editingAppointment, onDelete }: { onSave: () => void, selectedDate: Date, editingAppointment: ClientAppointment | null, onDelete: (appointmentId: string) => void }) {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<ClientPatient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ClientPatient | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);


  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      id: undefined,
      patientId: '',
      scheduledTime: format(selectedDate, "yyyy-MM-dd'T'09:00"),
      notes: '',
    }
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    if(editingAppointment && editingAppointment.patientInfo) {
      setSelectedPatient(editingAppointment.patientInfo as ClientPatient);
      const resetValues = {
        id: editingAppointment.id,
        patientId: editingAppointment.patientId,
        scheduledTime: format(new Date(editingAppointment.scheduledTime), "yyyy-MM-dd'T'HH:mm"),
        notes: editingAppointment.notes || ''
      };
      form.reset(resetValues);
    } else {
      setSelectedPatient(null);
      const resetValues = {
        id: undefined,
        patientId: '',
        scheduledTime: format(selectedDate, "yyyy-M-dd'T'09:00"),
        notes: ''
      };
      form.reset(resetValues);
    }
  }, [editingAppointment, selectedDate, form]);

  useEffect(() => {
    if (!patientSearch.trim() || !token || (editingAppointment && selectedPatient)) {
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
  }, [patientSearch, token, toast, editingAppointment, selectedPatient]);

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
    const isEditing = !!data.id;
    
    const apiEndpoint = isEditing ? `/api/v1/appointments/${data.id}` : '/api/v1/appointments';
    const method = isEditing ? 'PUT' : 'POST';

    try {
        const response = await fetch(apiEndpoint, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                ...data,
                scheduledTime: new Date(data.scheduledTime),
                durationMinutes: 15,
                status: editingAppointment?.status || 'Scheduled', // Preserve status on edit
            }),
        });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.message || `Failed to ${isEditing ? 'update' : 'create'} appointment`);
        }
        toast({ title: `Appointment ${isEditing ? 'Updated' : 'Created'}`, description: 'The schedule has been updated.' });
        onSave();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  const handleDelete = () => {
    if (editingAppointment) {
        onDelete(editingAppointment.id);
    }
    setIsDeleteDialogOpen(false);
  }

  return (
    <>
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
                {!editingAppointment && <Button variant="outline" size="sm" onClick={handleUnselectPatient}>Change</Button>}
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
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Patient is nervous" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }
          />
          <DialogFooter className="sm:justify-between">
            {editingAppointment && (
                <Button type="button" variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </Button>
            )}
            <div className="flex gap-2">
                <Button type="submit" disabled={form.formState.isSubmitting || !selectedPatient}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingAppointment ? 'Save Changes' : 'Create Appointment'}
                </Button>
            </div>
          </DialogFooter>
        </form>
      </Form>
      {editingAppointment && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the appointment for {selectedPatient?.firstName} {selectedPatient?.lastName} at {format(new Date(editingAppointment.scheduledTime), 'p')}. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}

export default function SchedulingPage() {
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAppointment, setEditingAppointment] = useState<ClientAppointment | null>(null);


  const fetchAppointments = useCallback(async (authToken: string, date: Date, query?: string) => {
    setLoading(true);
    try {
      const dateString = format(date, 'yyyy-MM-dd');
      const url = query
        ? `/api/v1/appointments?date=${dateString}&q=${query}`
        : `/api/v1/appointments?date=${dateString}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      
      const data = await response.json();
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
        const debounce = setTimeout(() => {
            fetchAppointments(token, selectedDate, searchTerm);
        }, 300);
        return () => clearTimeout(debounce);
    }
  }, [fetchAppointments, token, selectedDate, searchTerm]);


  const handleSave = () => {
    setIsFormOpen(false);
    if(token) {
        fetchAppointments(token, selectedDate, searchTerm);
    }
  }

  const handleDelete = async (appointmentId: string) => {
    if (!token) return;
    try {
        const response = await fetch(`/api/v1/appointments/${appointmentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.message || 'Failed to delete appointment');
        }
        toast({ title: 'Appointment Deleted', description: 'The appointment has been removed from the schedule.' });
        handleSave(); // Close dialog and refresh list
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
    }
  };

  const handleOpenDialog = (appointment: ClientAppointment | null = null) => {
    setEditingAppointment(appointment);
    setIsFormOpen(true);
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
          <div className='flex items-center justify-between'>
              <div>
                  <CardTitle>Appointment Scheduling</CardTitle>
                  <CardDescription>View the daily schedule or add a new appointment.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleDateChange(subDays(selectedDate, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button
                          variant={"outline"}
                          className={cn(
                              "w-[180px] justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                          )}
                          >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" onPointerDownOutside={(e) => e.preventDefault()}>
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
              <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                      type="search"
                      placeholder="Search by patient name or MRN..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                  />
              </div>
              <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
                setIsFormOpen(isOpen);
                if (!isOpen) setEditingAppointment(null);
              }}>
                  <DialogTrigger asChild>
                      <Button variant="outline" onClick={() => handleOpenDialog()}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          New Appointment
                      </Button>
                  </DialogTrigger>
                  <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
                      <DialogHeader>
                          <DialogTitle>{editingAppointment ? 'Edit Appointment' : 'Create New Appointment'}</DialogTitle>
                          <DialogDescription>
                            {editingAppointment 
                                ? `Update details for the appointment at ${format(new Date(editingAppointment.scheduledTime), 'p')}.`
                                : "Schedule a new phlebotomy appointment for a patient."}
                          </DialogDescription>
                      </DialogHeader>
                      <AppointmentForm onSave={handleSave} selectedDate={selectedDate} editingAppointment={editingAppointment} onDelete={handleDelete} />
                  </DialogContent>
              </Dialog>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>
                Appointments for {format(selectedDate, "PPP")}
            </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Accordion type="single" collapsible className="w-full">
              {loading ? (
                  Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border-b">
                          <Skeleton className="h-10 w-24" />
                          <Skeleton className="h-6 w-48" />
                          <Skeleton className="h-6 w-24 ml-auto" />
                      </div>
                  ))
              ) : appointments.length > 0 ? (
                  appointments.map((appt) => (
                      <AccordionItem value={appt.id} key={appt.id}>
                          <AccordionTrigger className="hover:no-underline px-4">
                              <div className="flex justify-between items-center w-full">
                                  <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2 font-medium text-lg">
                                          <Clock className="h-5 w-5 text-muted-foreground" />
                                          <span>{format(new Date(appt.scheduledTime), 'hh:mm a')}</span>
                                      </div>
                                      <div>
                                          <div className="font-bold text-xl">{appt.patientInfo?.firstName} {appt.patientInfo?.lastName}</div>
                                          <div className="text-sm text-muted-foreground">MRN: {appt.patientInfo?.mrn}</div>
                                      </div>
                                  </div>
                                  <Badge variant={getStatusVariant(appt.status)} className="text-base">{appt.status}</Badge>
                              </div>
                          </AccordionTrigger>
                          <AccordionContent className="bg-muted/30">
                              <div className="p-4 space-y-4">
                                {(appt.pendingOrders && appt.pendingOrders.length > 0) ? (
                                    appt.pendingOrders.map(order => (
                                        <div key={order.id} className="space-y-2">
                                            <h4 className="font-semibold">Order #{order.orderId}</h4>
                                            {order.samples.map(sample => (
                                              <div key={sample.sampleId} className="pl-4">
                                                <p className="flex items-center gap-2 font-medium">
                                                  <Droplets className="h-4 w-4 text-primary"/> 
                                                  {sample.specimenSummary?.tubeType || 'N/A'}
                                                </p>
                                                <ul className="list-disc list-inside pl-6 text-sm text-muted-foreground">
                                                    {sample.tests.map(test => <li key={test.testCode}>{test.name}</li>)}
                                                </ul>
                                                {sample.specimenSummary?.specialHandling && (
                                                  <p className="flex items-center gap-2 mt-1 text-sm text-amber-500">
                                                    <AlertTriangle className="h-4 w-4"/>
                                                    {sample.specimenSummary.specialHandling}
                                                  </p>
                                                )}
                                              </div>
                                            ))}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-sm">No pending orders for this appointment.</p>
                                )}
                                <div className="pt-4 border-t border-border/50 flex justify-end">
                                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(appt)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Appointment
                                    </Button>
                                </div>
                              </div>
                          </AccordionContent>
                      </AccordionItem>
                  ))
              ) : (
                  <div className="h-24 text-center text-muted-foreground flex items-center justify-center">
                      No appointments found for this day.
                  </div>
              )}
            </Accordion>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
