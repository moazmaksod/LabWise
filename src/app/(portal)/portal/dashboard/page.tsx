
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function PhysicianDashboard() {
  const { user } = useUser();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
      const fetchOrders = async () => {
          const token = localStorage.getItem('labwise-token');
          const res = await fetch('/api/v1/portal/orders', { headers: { 'Authorization': `Bearer ${token}` } });
          if(res.ok) setOrders(await res.json());
      };
      if(user) fetchOrders();
  }, [user]);

  if (!user) return null;

  return (
    <div className="space-y-6">
        <div className="bg-blue-600 rounded-lg p-6 text-white shadow-lg">
            <h1 className="text-3xl font-bold">Physician Portal</h1>
            <p className="opacity-90">Welcome, {user.firstName}. You have {orders.filter(o => o.status === 'Complete').length} reports ready.</p>
        </div>

        <div className="grid gap-4">
            <h2 className="text-xl font-bold text-gray-800">Recent Orders</h2>
            {orders.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{order.patientName}</span>
                                <span className="text-sm text-muted-foreground">({order.orderId})</span>
                            </div>
                            <div className="text-sm text-gray-600">
                                Ordered: {format(new Date(order.date), 'MMM d, yyyy')} • {order.tests}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {order.status === 'Complete' ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Final Report</Badge>
                            ) : (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">In Progress</Badge>
                            )}
                            <Button variant="outline" size="sm">
                                <FileText className="w-4 h-4 mr-2" /> View
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
            {orders.length === 0 && <div className="text-center p-8 text-muted-foreground">No recent orders found.</div>}
        </div>
    </div>
  );
}
