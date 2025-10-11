
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, subDays, addMinutes, parse } from 'date-fns';
import { Clock, Beaker, Check, User, Microscope, AlertTriangle, ChevronDown, ChevronRight, Droplets, CalendarIcon, ChevronLeft, Edit, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { ClientAppointment, ClientOrder, OrderSample } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSearchParams } from 'next/navigation';

function EditAppointmentDialog({ appointment, isOpen, onOpenChange, onSave }: { appointment: ClientAppointment | null, isOpen: boolean, onOpenChange: (open: boolean) => void, onSave: () => void }) {
    const { toast } = useToast();
    const [token, setToken] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [selectedTime, setSelectedTime] = useState('');

    useEffect(() => {
        const storedToken = localStorage.getItem('labwise-token');
        if (storedToken) setToken(storedToken);
    }, []);

    useEffect(() => {
        if (appointment) {
            const scheduled = new Date(appointment.scheduledTime);
            setSelectedDate(scheduled);
            setSelectedTime(format(scheduled, "HH:mm"));
        }
    }, [appointment]);
    
    const handleSave = async () => {
        if (!appointment || !token || !selectedDate || !selectedTime) {
            toast({ variant: 'destructive', title: 'Incomplete Information', description: 'Please select a date and time.' });
            return;
        }

        try {
            const [hours, minutes] = selectedTime.split(':');
            const newScheduledDate = new Date(selectedDate);
            newScheduledDate.setHours(parseInt(hours, 10));
            newScheduledDate.setMinutes(parseInt(minutes, 10));
            
            const response = await fetch(`/api/v1/appointments/${appointment.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    patientId: appointment.patientId,
                    scheduledTime: newScheduledDate.toISOString(),
                    notes: appointment.notes,
                    appointmentType: appointment.appointmentType,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update appointment');
            }
            toast({ title: 'Appointment Updated', description: 'The schedule has been successfully updated.' });
            onSave();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        }
    };


    if (!appointment) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reschedule Collection Appointment</DialogTitle>
                    <DialogDescription>
                        Select a new date and time for {appointment.patientInfo?.firstName} {appointment.patientInfo?.lastName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="date" className="text-right pt-2">Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "col-span-3 justify-start text-left font-normal",
                                    !selectedDate && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="time" className="text-right">Time</Label>
                        <Input
                            id="time"
                            type="time"
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function CollectionSchedulePage() {
    const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const { toast } = useToast();
    const [editingAppointment, setEditingAppointment] = useState<ClientAppointment | null>(null);
    const [collectingSampleId, setCollectingSampleId] = useState<string | null>(null);

    const searchParams = useSearchParams();
    const initialDate = searchParams.get('date') ? new Date(searchParams.get('date') + 'T00:00:00') : new Date();
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
    const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

    const fetchAppointments = useCallback(async (authToken: string, date: Date) => {
        setLoading(true);
        try {
            const dateString = format(date, 'yyyy-MM-dd');
            const url = `/api/v1/appointments?date=${dateString}&type=Sample Collection`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) throw new Error('Failed to fetch collection list');
            
            const data = await response.json();
            setAppointments(data);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
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
    }, [token, selectedDate, fetchAppointments]);

    useEffect(() => {
        if (loading) return; // Wait for data to load
        const hash = window.location.hash.substring(1);
        if (hash) {
            const element = itemRefs.current.get(hash);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.focus();
                }, 100); // Small delay to ensure rendering
            }
        }
    }, [loading]);
    
    const handleConfirmCollection = async (appointmentId: string, sampleId: string) => {
        if (!token) return;
        setCollectingSampleId(sampleId);
        try {
            const response = await fetch(`/api/v1/appointments/${appointmentId}/collect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ sampleId }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to confirm collection');
            }
            toast({ title: 'Collection Confirmed', description: 'Sample status has been updated to Collected.' });
            
            // Optimistically update UI
            setAppointments(prev => prev.map(appt => {
                if (appt.id === appointmentId && appt.orderInfo) {
                    const newSamples = appt.orderInfo.samples.map(s => s.sampleId === sampleId ? { ...s, status: 'Collected' } : s);
                    
                    const allSamplesCollected = newSamples.every(s => s.status !== 'AwaitingCollection');
                    const someSamplesCollected = newSamples.some(s => s.status === 'Collected' || s.status === 'InLab');

                    let newOrderStatus: ClientOrder['orderStatus'] = appt.orderInfo.orderStatus;
                    if (allSamplesCollected) {
                        newOrderStatus = 'Pending';
                    } else if (someSamplesCollected) {
                        newOrderStatus = 'Partially Collected';
                    }

                    return { ...appt, orderInfo: { ...appt.orderInfo, samples: newSamples, orderStatus: newOrderStatus } };
                }
                return appt;
            }));

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Collection Failed', description: error.message });
        } finally {
            setCollectingSampleId(null);
        }
    };
    
    const getOrderStatusVariant = (status: ClientOrder['orderStatus']) => {
        switch (status) {
            case 'Complete': return 'default';
            case 'Pending': return 'secondary';
            case 'Partially Collected': return 'outline';
            case 'Cancelled': return 'destructive';
            default: return 'outline';
        }
    }

    const getSampleStatusVariant = (status: OrderSample['status']) => {
        switch (status) {
            case 'Collected': return 'default';
            case 'InLab': return 'secondary';
            case 'AwaitingCollection':
            default: return 'outline';
        }
    }


    const handleDateChange = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date);
        }
    }
    
    const handleEditAppointment = (appointment: ClientAppointment) => {
        setEditingAppointment(appointment);
    };

    const handleSave = () => {
        setEditingAppointment(null);
        if(token) fetchAppointments(token, selectedDate);
    }
    
    return (
        <>
        <Card className="shadow-lg">
            <CardHeader>
                <div className='flex items-center justify-between'>
                    <div>
                        <CardTitle>Sample Collection Schedule</CardTitle>
                        <CardDescription>View and manage scheduled sample collections.</CardDescription>
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
                <div className="w-full space-y-2">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <Card key={i} className="p-4">
                                <Skeleton className="h-24 w-full" />
                            </Card>
                        ))
                    ) : appointments.length > 0 ? (
                        appointments.map((appt) => (
                            <div 
                                key={appt.id} 
                                id={appt.id} 
                                ref={(el) => itemRefs.current.set(appt.id, el)} 
                                tabIndex={-1} 
                                className="outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-lg"
                            >
                                <Accordion type="single" collapsible defaultValue={window.location.hash.substring(1) === appt.id ? appt.id : undefined}>
                                    <AccordionItem value={appt.id}>
                                        <AccordionTrigger className={cn("hover:no-underline px-4 rounded-t-lg bg-card", appt.status === 'Completed' && 'bg-secondary/50 opacity-70')}>
                                            <div className="flex justify-between items-center w-full">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2 font-semibold text-lg">
                                                        <Clock className="h-5 w-5 text-muted-foreground" />
                                                        <span>{format(new Date(appt.scheduledTime), 'p')} - {format(addMinutes(new Date(appt.scheduledTime), appt.durationMinutes), 'p')}</span>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-xl">{appt.patientInfo?.firstName} {appt.patientInfo?.lastName}</div>
                                                        <div className="text-sm text-muted-foreground">MRN: {appt.patientInfo?.mrn}</div>
                                                        {appt.orderInfo?.orderId && (
                                                            <div className="text-sm text-muted-foreground font-mono">Order: {appt.orderInfo.orderId}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                {appt.orderInfo?.orderStatus && appt.orderInfo?.orderStatus !== 'Pending' && (
                                                    <Badge variant={getOrderStatusVariant(appt.orderInfo.orderStatus)} className="text-base">{appt.orderInfo.orderStatus}</Badge>
                                                )}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="bg-muted/30 rounded-b-lg">
                                            <div className="p-4 space-y-4">
                                                {appt.orderInfo ? (
                                                    <div className="space-y-3">
                                                        <div className="space-y-4">
                                                            {appt.orderInfo.samples.map(sample => (
                                                                <Card key={sample.sampleId}>
                                                                    <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
                                                                        <CardTitle className="text-md flex items-center gap-2">
                                                                            <Droplets className="h-5 w-5 text-primary"/>
                                                                            {sample.specimenRequirements?.tubeType || 'Unknown Tube'}
                                                                        </CardTitle>
                                                                        <Badge variant={getSampleStatusVariant(sample.status)}>
                                                                            {sample.status}
                                                                        </Badge>
                                                                    </CardHeader>
                                                                    <CardContent>
                                                                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                                                            {sample.tests.map(test => (
                                                                                <li key={test.testCode}>{test.name}</li>
                                                                            ))}
                                                                        </ul>
                                                                        {sample.specimenRequirements?.specialHandling && (
                                                                            <div className="mt-3 flex items-center gap-2 text-yellow-400">
                                                                                <AlertTriangle className="h-4 w-4"/>
                                                                                <span className="font-semibold">Special Handling:</span>
                                                                                <span>{sample.specimenRequirements.specialHandling}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="mt-4 flex justify-end">
                                                                            <Button 
                                                                                size="sm" 
                                                                                onClick={() => handleConfirmCollection(appt.id, sample.sampleId)}
                                                                                disabled={sample.status !== 'AwaitingCollection' || !!collectingSampleId}
                                                                            >
                                                                                {collectingSampleId === sample.sampleId ? (
                                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                                ) : (
                                                                                    <Check className="mr-2 h-4 w-4" />
                                                                                )}
                                                                                {sample.status === 'AwaitingCollection' ? 'Confirm Collection' : 'Collected'}
                                                                            </Button>
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center text-muted-foreground py-4">Order details not found for this appointment.</div>
                                                )}
                                                <div className="pt-4 border-t border-border/50 flex justify-end">
                                                    <Button variant="outline" size="sm" onClick={() => handleEditAppointment(appt)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Reschedule
                                                    </Button>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                             </div>
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground py-10 h-48 flex items-center justify-center border rounded-lg">
                            No sample collections scheduled for this day.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
        <EditAppointmentDialog 
            appointment={editingAppointment} 
            isOpen={!!editingAppointment}
            onOpenChange={(isOpen) => !isOpen && setEditingAppointment(null)}
            onSave={handleSave}
        />
        </>
    );
}

