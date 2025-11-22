
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Power, Wrench } from 'lucide-react';

export default function InstrumentsPage() {
  const [instruments, setInstruments] = useState<any[]>([]);

  useEffect(() => {
      const fetchInst = async () => {
          const token = localStorage.getItem('labwise-token');
          const res = await fetch('/api/v1/instruments', { headers: { 'Authorization': `Bearer ${token}` } });
          if(res.ok) setInstruments(await res.json());
      };
      fetchInst();
  }, []);

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary">Instrument Status</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instruments.map((inst) => (
                <Card key={inst.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{inst.name}</CardTitle>
                        {inst.status === 'Online' ? <Activity className="h-4 w-4 text-success" /> : <Wrench className="h-4 w-4 text-warning" />}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{inst.model}</div>
                        <p className="text-xs text-muted-foreground mb-2">{inst.instrumentId}</p>
                        <Badge variant={inst.status === 'Online' ? 'default' : 'secondary'}>{inst.status}</Badge>
                    </CardContent>
                </Card>
            ))}
             {instruments.length === 0 && <p>No instruments loaded. Run seeder.</p>}
        </div>
    </div>
  );
}
