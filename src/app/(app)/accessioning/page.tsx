
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { ClientOrder, OrderSample } from '@/lib/types';
import { format } from 'date-fns';

function AccessioningPageComponent() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundOrder, setFoundOrder] = useState<ClientOrder | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    if (storedToken) setToken(storedToken);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!orderSearchTerm.trim() || !token) return;
    setIsSearching(true);
    setFoundOrder(null);
    try {
        const response = await fetch(`/api/v1/orders?q=${orderSearchTerm}`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Order search failed.');
        }
        const data = await response.json();
        if (data.length > 0) {
            setFoundOrder(data[0]); // Assume the first result is the most relevant
        } else {
            toast({ variant: 'destructive', title: 'Not Found', description: 'No order found with that ID or patient info.' });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSearching(false);
    }
  }, [orderSearchTerm, token, toast]);

  const handleAccessionSample = useCallback(async (sampleId: string) => {
    if (!foundOrder || !token) return;

    try {
        const response = await fetch('/api/v1/samples/accession', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({ orderId: foundOrder.id, sampleId }),
        });
        
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.message || 'Failed to accession sample.');
        
        toast({ title: 'Success', description: `Sample ${resData.accessionNumber} accessioned.` });
        
        // Refresh order data
        setFoundOrder(prevOrder => {
            if (!prevOrder) return null;
            const newSamples = prevOrder.samples.map(s => {
                if (s.sampleId === sampleId) {
                    return { ...s, status: 'InLab', accessionNumber: resData.accessionNumber, receivedTimestamp: new Date() };
                }
                return s;
            });
            return { ...prevOrder, samples: newSamples };
        });

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Accession Failed', description: error.message });
    }
  }, [foundOrder, token, toast]);

  const getStatusVariant = (status: OrderSample['status']) => {
    switch (status) {
        case 'InLab': return 'default';
        case 'Collected': return 'secondary';
        case 'AwaitingCollection': return 'outline';
        case 'Rejected': return 'destructive';
        default: return 'outline';
    }
  };
  
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
        <Card>
            <CardHeader>
                <CardTitle>Sample Accessioning</CardTitle>
                <CardDescription>Scan or enter an Order ID to receive samples into the lab.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Enter Order ID (e.g., ORD-2024-00001)"
                            value={orderSearchTerm}
                            onChange={(e) => setOrderSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="pl-10"
                        />
                    </div>
                    <Button onClick={handleSearch} disabled={isSearching}>
                        {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Search
                    </Button>
                </div>
            </CardContent>
        </Card>
        
        {isSearching && <Skeleton className="h-64 w-full" />}
        
        {foundOrder && (
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Order Details: {foundOrder.orderId}</CardTitle>
                            <CardDescription>
                                Patient: {foundOrder.patientInfo?.firstName} {foundOrder.patientInfo?.lastName} (MRN: {foundOrder.patientInfo?.mrn})
                            </CardDescription>
                        </div>
                         <Badge variant={foundOrder.priority === 'STAT' ? 'destructive' : 'outline'} className="text-base">{foundOrder.priority}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {foundOrder.samples.map(sample => (
                        <Card key={sample.sampleId} className="bg-secondary/50">
                             <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <CardTitle className="text-lg">{sample.sampleType}</CardTitle>
                                <Badge variant={getStatusVariant(sample.status)}>{sample.status}</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="font-semibold">Tests:</p>
                                        <ul className="list-disc list-inside text-muted-foreground">
                                            {sample.tests.map(t => <li key={t.testCode}>{t.name}</li>)}
                                        </ul>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {sample.collectionTimestamp && (
                                            <div className="text-sm text-muted-foreground">
                                                <p>Collected:</p>
                                                <p>{format(new Date(sample.collectionTimestamp), 'PPpp')}</p>
                                            </div>
                                        )}
                                        <Button
                                          onClick={() => handleAccessionSample(sample.sampleId)}
                                          disabled={sample.status !== 'Collected'}
                                        >
                                          {sample.status === 'InLab' ? (
                                            <>
                                              <CheckCircle className="mr-2 h-4 w-4" />
                                              Accessioned
                                            </>
                                          ) : sample.status === 'Collected' ? (
                                            'Receive & Accession'
                                          ) : (
                                            <>
                                              <AlertTriangle className="mr-2 h-4 w-4" />
                                              Cannot Accession
                                            </>
                                          )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </CardContent>
             </Card>
        )}
    </div>
  );
}

export default function AccessioningPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[calc(100vh-8rem)] w-full" />}>
            <AccessioningPageComponent />
        </Suspense>
    )
}
