

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { FileText, Loader2, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ClientOrder } from '@/lib/types';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';

export default function PatientDashboard() {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useUser();

  const fetchPatientOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('labwise-token');
      if (!token) throw new Error('Authentication token not found.');
      
      const response = await fetch('/api/v1/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch your lab reports.');
      }
      
      const data: ClientOrder[] = await response.json();
      const completedOrders = data.filter(order => order.orderStatus === 'Complete');
      setOrders(completedOrders);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    fetchPatientOrders();
  }, [fetchPatientOrders]);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <FileText className="h-7 w-7" />
            My Lab Reports
          </CardTitle>
          <CardDescription>
            View and download your available lab reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order) => (
                <Card key={order.id} className="bg-secondary/50">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="font-semibold">Lab Report</p>
                            <p className="text-sm text-muted-foreground">
                                Collected on {format(new Date(order.samples[0]?.collectionTimestamp || order.createdAt), 'PPP')}
                            </p>
                        </div>
                        <Button asChild>
                            <Link href={`/portal/report/${order.id}`}>
                                <BookOpen className="mr-2 h-4 w-4" />
                                View Report
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertTitle>No Reports Available</AlertTitle>
              <AlertDescription>
                You do not have any completed lab reports available at this time. Reports will appear here once they are finalized by the laboratory.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
