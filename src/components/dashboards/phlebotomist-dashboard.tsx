'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Clock, Beaker, Check, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { ClientAppointment } from '@/lib/types';
import { cn } from '@/lib/utils';

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
            // Filter for only scheduled appointments
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
    
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Phlebotomy Collection List</CardTitle>
                <CardDescription>Patients scheduled for sample collection today, {format(new Date(), 'PPP')}.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-hidden rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-secondary hover:bg-secondary">
                                <TableHead>Time</TableHead>
                                <TableHead>Patient</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={4}><Skeleton className="h-12 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : appointments.length > 0 ? (
                                appointments.map((appt) => (
                                    <TableRow key={appt.id} className={cn(appt.status === 'CheckedIn' && 'bg-blue-900/40')}>
                                        <TableCell>
                                            <div className="flex items-center gap-2 font-medium">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <span>{format(new Date(appt.scheduledTime), 'p')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{appt.patientInfo?.firstName} {appt.patientInfo?.lastName}</div>
                                            <div className="text-sm text-muted-foreground">MRN: {appt.patientInfo?.mrn}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={appt.status === 'CheckedIn' ? 'default' : 'outline'}>{appt.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => handleConfirmCollection(appt.id)}>
                                                <Beaker className="mr-2 h-4 w-4" />
                                                Collect Sample
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No patients scheduled for collection at this time.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
