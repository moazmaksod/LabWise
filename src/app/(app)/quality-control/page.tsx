
'use client';

import { ShieldCheck, LineChart, PlusCircle, Wrench, Search, MoreVertical, Thermometer } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const MOCK_QC_RUNS = [
  { id: 'QC-001', instrument: 'ARCHITECT c4000', test: 'Glucose', status: 'Pass', time: '8:05 AM' },
  { id: 'QC-002', instrument: 'Sysmex XN-1000', test: 'CBC', status: 'Pass', time: '8:01 AM' },
  { id: 'QC-003', instrument: 'ARCHITECT c4000', test: 'Potassium', status: 'Fail', time: '7:55 AM' },
  { id: 'QC-004', instrument: 'ACL TOP 550', test: 'PT/INR', status: 'Pass', time: '7:50 AM' },
];

export default function QualityControlPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quality Control</h1>
          <p className="text-muted-foreground">Monitor and document QC runs for all instruments.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Log New QC Run
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Levey-Jennings Chart (Glucose - ARCHITECT c4000)</CardTitle>
          <CardDescription>Visual representation of instrument performance over time.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="h-64 flex items-center justify-center bg-secondary/50 rounded-lg">
                <div className="text-center text-muted-foreground">
                    <LineChart className="h-12 w-12" />
                    <p>Levey-Jennings chart will be displayed here.</p>
                </div>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent QC Runs</CardTitle>
          <CardDescription>A log of the most recent quality control runs.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary hover:bg-secondary">
                  <TableHead>Run ID</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_QC_RUNS.map((run) => (
                    <TableRow key={run.id}>
                        <TableCell className="font-mono">{run.id}</TableCell>
                        <TableCell>{run.instrument}</TableCell>
                        <TableCell>{run.test}</TableCell>
                        <TableCell>
                            <Badge variant={run.status === 'Pass' ? 'default' : 'destructive'} className={run.status === 'Pass' ? 'bg-green-500/20 text-green-300 border-green-500/50' : ''}>
                                {run.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{run.time}</TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button>
                        </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
