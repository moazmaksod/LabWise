
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ClipboardList, FileText, Loader2, AlertTriangle, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { ClientOrder } from '@/lib/types';
import Link from 'next/link';

export default function PhysicianDashboard() {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [criticalAlerts, setCriticalAlerts] = useState<ClientOrder[]>([]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('labwise-token');
      if (!token) throw new Error('Authentication token not found.');
      const response = await fetch('/api/v1/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch patient orders.');
      const data: ClientOrder[] = await response.json();
      setOrders(data);
      
      // Simulate finding critical alerts
      const alerts = data.filter(order => 
        order.samples.some(sample => 
          sample.tests.some(test => test.isCritical)
        )
      );
      setCriticalAlerts(alerts);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  const getStatusVariant = (status: string) => {
    switch (status) {
        case 'Complete': return 'default';
        case 'In Progress': return 'secondary';
        case 'Partially Complete': return 'secondary';
        case 'Pending':
        case 'Partially Collected': 
        case 'AwaitingCollection':
             return 'outline';
        case 'Cancelled': return 'destructive';
        default: return 'outline';
    }
  }

  const dismissAlert = (orderId: string) => {
    setCriticalAlerts(alerts => alerts.filter(alert => alert.id !== orderId));
    toast({ title: 'Alert Acknowledged', description: `Critical alert for order ${orders.find(o=>o.id === orderId)?.orderId} has been dismissed.`});
  }

  return (
    <div className="space-y-6">
        {criticalAlerts.length > 0 && (
            <Alert variant="destructive" className="shadow-lg">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="font-bold text-lg">Action Required: Critical Value Alerts</AlertTitle>
                <AlertDescription>
                    <div className="space-y-2 mt-2">
                        {criticalAlerts.map(alert => (
                             <div key={alert.id} className="flex items-center justify-between p-2 rounded-md bg-destructive/20">
                                <div>
                                    <p>
                                        <span className="font-semibold">{alert.patientInfo?.firstName} {alert.patientInfo?.lastName}</span> (Order: {alert.orderId}) has a critical lab value.
                                    </p>
                                    <Button variant="link" asChild className="p-0 h-auto text-destructive-foreground">
                                       <Link href={`/portal/report/${alert.id}`}>View Results</Link>
                                    </Button>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => dismissAlert(alert.id)}>
                                    <X className="h-4 w-4"/>
                                </Button>
                            </div>
                        ))}
                    </div>
                </AlertDescription>
            </Alert>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              My Patient Orders
            </CardTitle>
            <CardDescription>
              Real-time status of all your pending and completed patient orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary hover:bg-secondary">
                    <TableHead>Patient</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : orders.length > 0 ? (
                    orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-medium">{order.patientInfo?.firstName} {order.patientInfo?.lastName}</div>
                          <div className="text-sm text-muted-foreground">MRN: {order.patientInfo?.mrn}</div>
                        </TableCell>
                        <TableCell className="font-mono">{order.orderId}</TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(order.orderStatus)}>{order.orderStatus}</Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant={order.priority === 'STAT' ? 'destructive' : 'outline'}>{order.priority}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(order.createdAt), 'PP')}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild disabled={order.orderStatus !== 'Complete'}>
                            <Link href={`/portal/report/${order.id}`}>
                                <FileText className="mr-2 h-4 w-4"/>
                                View Report
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No orders found.
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
