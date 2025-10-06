
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Clock, Beaker, Check, User, Microscope, AlertTriangle, ChevronDown, ChevronRight, Droplets } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { ClientAppointment, ClientOrder, OrderSample } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function PhlebotomistDashboard() {
    const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchAppointments = useCallback(async (authToken: string) => {
        setLoading(true);
        try {
            const dateString = format(new Date(), 'yyyy-MM-dd');
            const url = `/api/v1/appointments?date=${dateString}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) throw new Error('Failed to fetch collection list');
            
            const data = await response.json();
            // Filter for only appointments that need action
            setAppointments(data.filter((a: ClientAppointment) => a.status === 'Scheduled' || a.status === 'CheckedIn'));
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
            fetchAppointments(storedToken);
        } else {
            setLoading(false);
        }
    }, [fetchAppointments]);
    
    const handleConfirmCollection = async (appointmentId: string) => {
        if (!token) return;
        
        try {
            const response = await fetch(`/api/v1/appointments/${appointmentId}/collect`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to confirm collection');
            }

            toast({
                title: 'Collection Confirmed',
                description: 'The sample status has been updated.',
            });
            
            // Refresh the list after collection
            fetchAppointments(token);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Collection Failed', description: error.message });
        }
    };

    const getStatusVariant = (status: ClientAppointment['status']) => {
        switch (status) {
            case 'CheckedIn': return 'default';
            case 'Scheduled': 
            default: return 'outline';
        }
    };
    
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Phlebotomy Collection List</CardTitle>
                <CardDescription>Patients scheduled for sample collection today, {format(new Date(), 'PPP')}.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center space-x-4 p-4">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="space-y-2">
                                <Skeleton className="h-4 w-[250px]" />
                                <Skeleton className="h-4 w-[200px]" />
                                </div>
                            </div>
                        ))
                    ) : appointments.length > 0 ? (
                        appointments.map((appt) => (
                            <AccordionItem value={appt.id} key={appt.id}>
                                <AccordionTrigger className={cn("hover:no-underline", appt.status === 'CheckedIn' && 'bg-blue-900/40')}>
                                    <div className="flex justify-between items-center w-full pr-4">
                                        <div className="flex items-center gap-4">
                                             <div className="flex items-center gap-2 font-semibold text-lg">
                                                <Clock className="h-5 w-5 text-muted-foreground" />
                                                <span>{format(new Date(appt.scheduledTime), 'p')}</span>
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
                                    <div className="p-4">
                                    {appt.pendingOrders && appt.pendingOrders.length > 0 ? (
                                        appt.pendingOrders.map(order => (
                                            <div key={order.id} className="space-y-3">
                                                <h4 className="font-semibold text-lg">Order #{order.orderId}</h4>
                                                <div className="space-y-4">
                                                    {order.samples.map(sample => (
                                                        <Card key={sample.sampleId}>
                                                            <CardHeader className="pb-2 pt-4">
                                                                <CardTitle className="text-md flex items-center gap-2">
                                                                    <Droplets className="h-5 w-5 text-primary"/>
                                                                    {sample.specimenRequirements?.tubeType || 'Unknown Tube'}
                                                                </CardTitle>
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
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                                <div className="pt-2 text-right">
                                                    <Button size="sm" onClick={() => handleConfirmCollection(appt.id)}>
                                                        <Check className="mr-2 h-4 w-4" />
                                                        Confirm Collection for Order #{order.orderId}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-muted-foreground py-4">No pending orders awaiting collection for this patient.</div>
                                    )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                            No patients scheduled for collection at this time.
                        </div>
                    )}
                </Accordion>
            </CardContent>
        </Card>
    );
}
