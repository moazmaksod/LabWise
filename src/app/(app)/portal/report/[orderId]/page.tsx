
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, User, FlaskConical, Download } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { ClientOrder, OrderTest } from '@/lib/types';
import { calculateAge } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

function getResultPosition(value: number, range: string | undefined): number {
    if (!range) return -1;
    const parts = range.split('-').map(p => parseFloat(p.trim()));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return -1;
    
    const [low, high] = parts;
    if (value < low) return 0;
    if (value > high) return 100;

    const totalRange = high - low;
    if (totalRange <= 0) return 50;

    const position = ((value - low) / totalRange) * 100;
    return Math.max(0, Math.min(100, position));
}

function ReportResultBar({ value, range }: { value: number, range?: string }) {
    const position = getResultPosition(value, range);
    if (position === -1) return null;

    let indicatorColor = 'bg-green-500';
    if (position === 0 || position === 100) {
        indicatorColor = 'bg-red-500';
    }

    return (
        <div className="w-full pt-2">
            <div className="relative h-2 w-full rounded-full bg-muted">
                {/* Normal Range Bar */}
                <div className="absolute h-full w-full rounded-full bg-green-500/30"></div>
                {/* Indicator */}
                <div 
                    className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${indicatorColor}`}
                    style={{ left: `${position}%` }}
                />
            </div>
             <div className="relative mt-1 flex justify-between text-xs text-muted-foreground">
                <span>{range?.split('-')[0]}</span>
                <span>{range?.split('-')[1]}</span>
            </div>
        </div>
    );
}

function PatientReportPageComponent() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const { user } = useUser();

  const [order, setOrder] = useState<ClientOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrderDetails = useCallback(async (id: string) => {
    setLoading(true);
    try {
        const token = localStorage.getItem('labwise-token');
        if (!token) throw new Error('Authentication failed.');
        const response = await fetch(`/api/v1/orders/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.status === 403) throw new Error("You don't have permission to view this report.");
        if (!response.ok) throw new Error(`Report not found or error loading.`);
        
        const data: ClientOrder = await response.json();
        
        if (user?.role === 'patient' && data.patientInfo?.userId?.toString() !== user.id) {
             throw new Error("This report does not belong to you.");
        }

        setOrder(data);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error Loading Report', description: error.message });
        router.push('/dashboard');
    } finally {
        setLoading(false);
    }
  }, [toast, router, user]);

  useEffect(() => {
    if (orderId) {
        fetchOrderDetails(orderId);
    }
  }, [orderId, fetchOrderDetails]);
  
  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-32" />
        <Card><CardHeader><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!order || !order.patientInfo) {
    return (
        <Alert variant="destructive">
            <AlertTitle>Report Not Found</AlertTitle>
            <AlertDescription>The requested report could not be loaded. It may not exist or you may not have permission to view it.</AlertDescription>
        </Alert>
    );
  }

  const allTests = order.samples.flatMap(s => s.tests.filter(t => t.status === 'Verified'));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
            <div className="flex justify-between items-start">
                 <div>
                    <CardTitle className="text-2xl">Lab Report</CardTitle>
                    <CardDescription>Order ID: {order.orderId}</CardDescription>
                 </div>
                 <Button variant="secondary"><Download className="mr-2 h-4 w-4" /> Download Official Report (PDF)</Button>
            </div>
        </CardHeader>
        <CardContent>
            <Card className="bg-secondary mb-6">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div className="flex items-center gap-4">
                        <User className="h-8 w-8 text-muted-foreground"/>
                        <div>
                            <CardTitle>{order.patientInfo.firstName} {order.patientInfo.lastName}</CardTitle>
                            <CardDescription>MRN: {order.patientInfo.mrn} | Age: {calculateAge(order.patientInfo.dateOfBirth)}</CardDescription>
                        </div>
                    </div>
                     <div className="text-right text-sm">
                        <p className="font-semibold">Collection Date</p>
                        <p className="text-muted-foreground">{format(new Date(order.samples[0]?.collectionTimestamp || order.createdAt), 'PPP')}</p>
                     </div>
                </CardHeader>
            </Card>

            <div className="space-y-4">
                {allTests.map(test => (
                    <Card key={test.testCode}>
                        <CardHeader>
                            <CardTitle className="text-lg">{test.name}</CardTitle>
                            <CardDescription>{test.patientFriendlyExplanation || 'A standard laboratory test.'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between">
                                <div className="text-4xl font-bold">
                                    {test.resultValue}
                                    <span className="ml-2 text-lg font-normal text-muted-foreground">{test.resultUnits}</span>
                                </div>
                                <div>
                                    <p className="text-sm text-right font-medium">Reference Range</p>
                                    <p className="text-sm text-right text-muted-foreground">{test.referenceRange}</p>
                                </div>
                            </div>
                            <ReportResultBar value={parseFloat(test.resultValue)} range={test.referenceRange} />
                        </CardContent>
                    </Card>
                ))}
            </div>

        </CardContent>
      </Card>
    </div>
  );
}


export default function PatientReportPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[calc(100vh-8rem)] w-full" />}>
            <PatientReportPageComponent />
        </Suspense>
    )
}
