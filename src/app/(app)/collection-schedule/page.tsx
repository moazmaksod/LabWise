

'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, addMinutes } from 'date-fns';
import { Clock, Check, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { ClientAppointment, OrderSample } from '@/lib/types';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';

function CollectionDetailPageComponent() {
    const { user } = useUser();
    const [appointment, setAppointment] = useState<ClientAppointment | null>(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const appointmentId = searchParams.get('id');

    const [collectingSampleId, setCollectingSampleId] = useState<string | null>(null);

    const fetchAppointment = useCallback(async (authToken: string, id: string) => {
        setLoading(true);
        try {
            const url = `/api/v1/appointments/${id}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error('Failed to fetch appointment details. Server responded with status ' + response.status);
            }
            
            const data = await response.json();
            setAppointment(data);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            router.push('/dashboard'); // Redirect if appointment can't be loaded
        } finally {
            setLoading(false);
        }
    }, [toast, router]);

    useEffect(() => {
        const storedToken = localStorage.getItem('labwise-token');
        if (storedToken) {
            setToken(storedToken);
        } else {
            setLoading(false);
            router.push('/');
        }
    }, [router]);
    
    useEffect(() => {
        if(token && appointmentId) {
            fetchAppointment(token, appointmentId);
        } else if (!appointmentId) {
            toast({ variant: 'destructive', title: 'Error', description: 'No appointment ID provided.' });
            router.push('/dashboard');
        }
    }, [token, appointmentId, fetchAppointment, toast, router]);

    const handleConfirmCollection = async (sampleId: string) => {
        if (!token || !appointment) return;
        setCollectingSampleId(sampleId);
        try {
            const response = await fetch(`/api/v1/appointments/${appointment.id}/collect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ sampleId }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to confirm collection');
            }
            toast({ title: 'Collection Confirmed', description: 'Sample status has been updated to Collected.' });
            
            setAppointment(prev => {
                if (!prev || !prev.orderInfo) return prev;
                const newSamples = prev.orderInfo.samples.map(s => 
                    s.sampleId === sampleId ? { ...s, status: 'Collected', collectionTimestamp: new Date().toISOString() } : s
                );
                const allCollected = newSamples.every(s => s.status !== 'AwaitingCollection');
                return {
                    ...prev,
                    orderInfo: {
                        ...prev.orderInfo,
                        samples: newSamples,
                        orderStatus: allCollected ? 'Pending' : 'Partially Collected'
                    }
                };
            });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Collection Failed', description: error.message });
        } finally {
            setCollectingSampleId(null);
        }
    };
    
    const getSampleStatusVariant = (status: OrderSample['status']) => {
        switch (status) {
            case 'Collected': return 'default';
            case 'InLab': return 'secondary';
            case 'AwaitingCollection':
            default: return 'outline';
        }
    }

    if (loading || !appointment) {
        return (
            <div className="space-y-4 max-w-4xl mx-auto">
                 <Skeleton className="h-10 w-32" />
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </CardContent>
                 </Card>
            </div>
        )
    }

    return (
        <div className="space-y-4 max-w-4xl mx-auto">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to List
            </Button>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl">Sample Collection</CardTitle>
                            <CardDescription>
                                {appointment.patientInfo?.firstName} {appointment.patientInfo?.lastName} (MRN: {appointment.patientInfo?.mrn})
                            </CardDescription>
                        </div>
                        <div className="text-right">
                             <div className="flex items-center gap-2 font-semibold text-lg">
                                <Clock className="h-5 w-5 text-muted-foreground" />
                                <span>{format(new Date(appointment.scheduledTime), 'p')} - {format(addMinutes(new Date(appointment.scheduledTime), appointment.durationMinutes), 'p')}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">{format(new Date(appointment.scheduledTime), 'PPP')}</div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {appointment.orderInfo ? (
                        appointment.orderInfo.samples.map(sample => (
                            <Card key={sample.sampleId} className="bg-secondary/50">
                                <CardHeader className="flex flex-row items-center justify-between pb-4 pt-4">
                                    <CardTitle className="text-lg">
                                        {sample.specimenRequirements?.tubeType || 'Unknown Tube'}
                                    </CardTitle>
                                    <Badge variant={getSampleStatusVariant(sample.status)}>
                                        {sample.status}
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    <p className="font-semibold">Tests:</p>
                                    <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
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
                                        {user?.role === 'phlebotomist' && sample.status === 'AwaitingCollection' && (
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleConfirmCollection(sample.sampleId)}
                                                disabled={!!collectingSampleId}
                                            >
                                                {collectingSampleId === sample.sampleId ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Check className="mr-2 h-4 w-4" />
                                                )}
                                                Confirm Collection
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                            Order details not found for this appointment.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function CollectionDetailPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[calc(100vh-8rem)] w-full" />}>
            <CollectionDetailPageComponent />
        </Suspense>
    )
}
