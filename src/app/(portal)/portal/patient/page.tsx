
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, Activity } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from '@/components/ui/progress';

export default function PatientDashboard() {
  const { user } = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
      const fetchOrders = async () => {
          const token = localStorage.getItem('labwise-token');
          const res = await fetch('/api/v1/portal/orders', { headers: { 'Authorization': `Bearer ${token}` } });
          if(res.ok) setOrders(await res.json());
      };
      if(user) fetchOrders();
  }, [user]);

  // Mock result data fetch for the patient view
  const handleViewReport = async (orderId: string) => {
      // In a real app, we'd fetch specific details. Here we mock the "Patient Friendly" transformation
      setSelectedOrder({
          id: orderId,
          results: [
              { test: 'Glucose', value: 95, unit: 'mg/dL', range: '70-100', status: 'Normal', expl: 'Measures blood sugar levels.' },
              { test: 'Cholesterol', value: 180, unit: 'mg/dL', range: '< 200', status: 'Normal', expl: 'A type of fat found in your blood.' },
              { test: 'Vitamin D', value: 22, unit: 'ng/mL', range: '30-100', status: 'Low', expl: 'Important for bone health.' },
          ]
      });
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
        <div className="bg-teal-600 rounded-lg p-6 text-white shadow-lg">
            <h1 className="text-3xl font-bold">My Health Records</h1>
            <p className="opacity-90">Hello, {user.firstName}. Here are your latest results.</p>
        </div>

        <div className="grid gap-4">
            {orders.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow border-l-4 border-l-teal-500">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <div className="font-bold text-lg">{format(new Date(order.date), 'MMMM d, yyyy')}</div>
                            <div className="text-sm text-gray-600">{order.tests}</div>
                        </div>
                        <Button onClick={() => handleViewReport(order.id)}>
                            View Results
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>

        {/* Patient Friendly Report Modal */}
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Lab Report</DialogTitle>
                    <DialogDescription>Simple English explanation of your results.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {selectedOrder?.results.map((res: any, idx: number) => (
                        <div key={idx} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <div className="font-bold">{res.test}</div>
                                <Badge variant={res.status === 'Normal' ? 'secondary' : 'destructive'}>{res.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{res.expl}</p>

                            {/* Visual Range Indicator */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Low</span>
                                    <span>Normal ({res.range})</span>
                                    <span>High</span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100 overflow-hidden relative">
                                    {/* Simplified gauge visualization */}
                                    <div className={`absolute top-0 bottom-0 w-1/3 left-1/3 bg-green-200`}></div>
                                    <div
                                        className="absolute top-0 bottom-0 w-2 bg-black rounded-full transition-all"
                                        style={{ left: res.status === 'Low' ? '15%' : res.status === 'Normal' ? '50%' : '85%' }}
                                    ></div>
                                </div>
                                <div className="text-center text-sm font-mono font-bold">
                                    {res.value} <span className="text-xs font-normal text-gray-500">{res.unit}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
