
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/user-context';
import { ClientUser } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Clock, CheckCircle2, Play, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Type for the worklist item as returned by the API
type WorklistItem = {
    orderId: string;
    priority: 'STAT' | 'Routine';
    patientName: string;
    mrn: string;
    accessionNumber: string;
    sampleType: string;
    status: string;
    tests: string;
    receivedAt: string;
};

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [worklist, setWorklist] = useState<WorklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      if (user?.role === 'technician' || user?.role === 'manager') {
          fetchWorklist();
      }
  }, [user]);

  const fetchWorklist = async () => {
      setLoading(true);
      try {
          const token = localStorage.getItem('labwise-token');
          const res = await fetch('/api/v1/worklist', {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              setWorklist(await res.json());
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  if (!user) return null;

  // Redirect non-technicians (except managers) to their own views if they land here
  if (user.role === 'receptionist') router.push('/patients/register');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Technician Dashboard</h1>
            <p className="text-muted-foreground">Live Worklist • Prioritized by Urgency</p>
        </div>
        <Button onClick={fetchWorklist} variant="outline">Refresh List</Button>
      </div>

      <div className="rounded-md border bg-card shadow-sm">
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead className="w-[100px]">Priority</TableHead>
                      <TableHead>Accession #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Tests</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Wait Time</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {loading ? (
                      <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading worklist...</TableCell></TableRow>
                  ) : worklist.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No active samples in the queue.</TableCell></TableRow>
                  ) : (
                      worklist.map((item) => (
                          <TableRow
                            key={item.accessionNumber}
                            className={item.priority === 'STAT' ? 'bg-destructive/5 hover:bg-destructive/10' : ''}
                          >
                              <TableCell>
                                  {item.priority === 'STAT' ? (
                                      <Badge variant="destructive" className="animate-pulse"><AlertCircle className="w-3 h-3 mr-1"/> STAT</Badge>
                                  ) : (
                                      <Badge variant="secondary">Routine</Badge>
                                  )}
                              </TableCell>
                              <TableCell className="font-mono font-medium">{item.accessionNumber}</TableCell>
                              <TableCell>
                                  <div>{item.patientName}</div>
                                  <div className="text-xs text-muted-foreground">{item.mrn}</div>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate" title={item.tests}>{item.tests}</TableCell>
                              <TableCell>
                                  <Badge variant="outline">{item.status}</Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                  {formatDistanceToNow(new Date(item.receivedAt))}
                              </TableCell>
                              <TableCell className="text-right">
                                  <Button size="sm" onClick={() => router.push(`/results/${item.accessionNumber}`)}>
                                      {item.status === 'InLab' ? 'Start Test' : 'Enter Results'} <ArrowRight className="ml-2 h-3 w-3" />
                                  </Button>
                              </TableCell>
                          </TableRow>
                      ))
                  )}
              </TableBody>
          </Table>
      </div>
    </div>
  );
}
