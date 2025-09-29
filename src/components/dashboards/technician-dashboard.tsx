'use client';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { MOCK_WORKLIST_SAMPLES } from '@/lib/constants';
import { Flame, Clock, CheckCircle } from 'lucide-react';
import type { Sample } from '@/lib/types';

const statusStyles: Record<Sample['status'], string> = {
  STAT: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 hover:bg-red-200/80',
  Overdue: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 hover:bg-amber-200/80',
  Routine: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 hover:bg-blue-200/80',
  Complete: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 hover:bg-green-200/80',
};

const statusIcons: Record<Sample['status'], React.ReactNode> = {
    STAT: <Flame className="h-4 w-4" />,
    Overdue: <Clock className="h-4 w-4" />,
    Routine: null,
    Complete: <CheckCircle className="h-4 w-4" />,
}

export default function TechnicianDashboard() {
  const sortedSamples = [...MOCK_WORKLIST_SAMPLES].sort((a, b) => {
    const statusOrder = { STAT: 1, Overdue: 2, Routine: 3, Complete: 4 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Technician Worklist</CardTitle>
        <CardDescription>
          Real-time, prioritized list of samples for processing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary hover:bg-secondary">
                <TableHead>Accession #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Test(s)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSamples.map((sample) => (
                <TableRow
                  key={sample.id}
                  className={cn('cursor-pointer', statusStyles[sample.status].split(' ')[0])}
                >
                  <TableCell className="font-medium">{sample.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{sample.patientName}</div>
                    <div className="text-sm text-muted-foreground">{`ID: ${sample.patientId}`}</div>
                  </TableCell>
                  <TableCell>{sample.test}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('gap-1 border-transparent font-semibold', statusStyles[sample.status])}>
                      {statusIcons[sample.status]}
                      {sample.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{sample.received}</TableCell>
                  <TableCell>{sample.due}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
