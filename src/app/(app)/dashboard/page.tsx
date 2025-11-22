
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/user-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, ArrowRight, Activity, Timer, AlertTriangle, ClipboardList } from 'lucide-react';
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

type KPIData = {
    avgTAT: number;
    rejectionRate: string;
    instrumentStatus: { _id: string, count: number }[];
    pendingOrders: number;
}

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [worklist, setWorklist] = useState<WorklistItem[]>([]);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorklist = async () => {
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
      }
  };

  const fetchKPIs = async () => {
      try {
          const token = localStorage.getItem('labwise-token');
          const res = await fetch('/api/v1/reports/kpi', {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              setKpiData(await res.json());
          }
      } catch (e) {
          console.error(e);
      }
  };

  useEffect(() => {
      const loadData = async () => {
          setLoading(true);
          if (user?.role === 'technician') {
              await fetchWorklist();
          } else if (user?.role === 'manager') {
              await Promise.all([fetchWorklist(), fetchKPIs()]);
          }
          setLoading(false);
      };
      if (user) loadData();
  }, [user]);

  if (!user) return null;
  if (user.role === 'receptionist') router.push('/patients/register');

  // --- MANAGER VIEW ---
  if (user.role === 'manager') {
      return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Operational Dashboard</h1>
                <Button onClick={() => window.location.reload()} variant="outline">Refresh Data</Button>
            </div>

            {/* KPI WIDGETS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Turnaround Time</CardTitle>
                        <Timer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiData?.avgTAT || 0} min</div>
                        <p className="text-xs text-muted-foreground">Last 7 Days</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sample Rejection Rate</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiData?.rejectionRate || 0}%</div>
                        <p className="text-xs text-muted-foreground">Target: &lt; 1%</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiData?.pendingOrders || 0}</div>
                        <p className="text-xs text-muted-foreground">Requiring Action</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Instrument Health</CardTitle>
                        <Activity className="h-4 w-4 text-success" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {kpiData?.instrumentStatus.find(s => s._id === 'Online')?.count || 0} / {kpiData?.instrumentStatus.reduce((a,b) => a + b.count, 0) || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Online / Total</p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-bold">Active Worklist Monitor</h2>
                <WorklistTable worklist={worklist} loading={loading} router={router} />
            </div>
        </div>
      );
  }

  // --- TECHNICIAN VIEW ---
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Technician Dashboard</h1>
            <p className="text-muted-foreground">Live Worklist • Prioritized by Urgency</p>
        </div>
        <Button onClick={fetchWorklist} variant="outline">Refresh List</Button>
      </div>
      <WorklistTable worklist={worklist} loading={loading} router={router} />
    </div>
  );
}

function WorklistTable({ worklist, loading, router }: { worklist: WorklistItem[], loading: boolean, router: any }) {
    return (
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
    );
}
