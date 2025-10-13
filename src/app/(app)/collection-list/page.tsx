
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, subDays } from 'date-fns';
import { Clock, CalendarIcon, ChevronLeft, ChevronRight, Beaker, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { ClientAppointment, ClientOrder } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import Link from 'next/link';


export default function CollectionListPage() {
    const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const { toast } = useToast();

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
    
    const getOrderStatusVariant = (status: ClientOrder['orderStatus']) => {
        switch (status) {
            case 'Complete': return 'default';
            case 'In Progress': return 'secondary';
            case 'Partially Collected': return 'outline';
            case 'Pending': return 'outline';
            case 'Cancelled': return 'destructive';
            default: return 'outline';
        }
    }

    const getCollectionStatus = (order?: ClientOrder): { text: string; variant: "default" | "secondary" | "destructive" | "outline" | null } => {
        if (!order || !order.samples || order.samples.length === 0) return { text: 'Pending', variant: 'outline' };

        const totalSamples = order.samples.length;
        const collectedSamples = order.samples.filter(s => s.status !== 'AwaitingCollection').length;

        if (collectedSamples === 0) {
            return { text: 'Awaiting Collection', variant: 'secondary' };
        }
        if (collectedSamples === totalSamples) {
            return { text: 'All Collected', variant: 'default' };
        }
        return { text: 'Partially Collected', variant: 'outline' };
    }
    
    const handleDateChange = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date);
        }
    }

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <div className='flex items-center justify-between'>
                    <div>
                        <CardTitle>Sample Collection List</CardTitle>
                        <CardDescription>Appointments for sample collection scheduled for {format(selectedDate, 'PPP')}.</CardDescription>
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
                                onSelect={handleDateChange}
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
                <div className="border rounded-lg">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center space-x-4 p-4 border-b">
                                <Skeleton className="h-10 w-24" />
                                <div className="space-y-2 flex-grow">
                                    <Skeleton className="h-6 w-1/2" />
                                    <Skeleton className="h-4 w-1/4" />
                                </div>
                                <Skeleton className="h-6 w-24 ml-auto" />
                            </div>
                        ))
                    ) : appointments.length > 0 ? (
                        appointments.map((appt) => {
                             const collectionStatus = getCollectionStatus(appt.orderInfo);
                            return (
                            <Link 
                                href={`/collection-schedule?id=${appt.id}`} 
                                key={appt.id}
                                className={cn(
                                    "block w-full p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer",
                                    (collectionStatus.text === 'All Collected') && 'opacity-60'
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 font-semibold text-lg min-w-[8rem]">
                                            <Clock className="h-5 w-5 text-muted-foreground" />
                                            <span>{format(new Date(appt.scheduledTime), 'p')}</span>
                                        </div>
                                        <div>
                                            <div className="font-bold text-xl">{appt.patientInfo?.firstName} {appt.patientInfo?.lastName}</div>
                                            <div className="text-sm text-muted-foreground">MRN: {appt.patientInfo?.mrn}</div>
                                        </div>
                                    </div>
                                    <Badge variant={collectionStatus.variant} className="text-base whitespace-nowrap">
                                        {collectionStatus.text}
                                    </Badge>
                                </div>
                                {appt.orderInfo?.samples && appt.orderInfo.samples.length > 0 && (
                                    <div className="mt-3 pl-[9.5rem] flex flex-wrap items-center gap-2">
                                        {appt.orderInfo.samples.map(sample => (
                                            <Badge key={sample.sampleId} variant="secondary" className="gap-1.5">
                                                <Beaker className="h-3 w-3" />
                                                {sample.specimenRequirements?.tubeType || 'Unknown Tube'}
                                            </Badge>
                                        ))}
                                        {appt.orderInfo.samples.some(s => s.specimenRequirements?.specialHandling) && (
                                            <Badge variant="destructive" className="gap-1.5">
                                                <AlertTriangle className="h-3 w-3" />
                                                Special Handling
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </Link>
                        )})
                    ) : (
                        <div className="text-center text-muted-foreground py-10 h-48 flex items-center justify-center">
                            No sample collections scheduled for this day.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
