
'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function QCPage() {
  const [data, setData] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
      const fetchQC = async () => {
          const token = localStorage.getItem('labwise-token');
          const res = await fetch('/api/v1/qc-logs', { headers: { 'Authorization': `Bearer ${token}` } });
          if(res.ok) {
              const logs = await res.json();
              // Format for chart
              const chartData = logs.map((log: any) => ({
                  date: format(new Date(log.runTimestamp), 'MM/dd HH:mm'),
                  value: log.resultValue,
                  mean: log.mean || 100, // Mock mean
                  sd: log.sd || 5 // Mock SD
              })).reverse();
              setData(chartData);
          }
      };
      fetchQC();
  }, []);

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary">Quality Control</h1>

        <Card>
            <CardHeader><CardTitle>Levey-Jennings Chart (Glucose Level 1)</CardTitle></CardHeader>
            <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
                        <Tooltip />
                        <Legend />
                        <ReferenceLine y={100} label="Mean" stroke="green" />
                        <ReferenceLine y={110} label="+2SD" stroke="red" strokeDasharray="3 3" />
                        <ReferenceLine y={90} label="-2SD" stroke="red" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    </div>
  );
}
