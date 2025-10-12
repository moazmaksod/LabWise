
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

const statusStyles: Record<Sample['status'], { row: string; badge: string }> = {
  STAT: {
    row: 'bg-red-900/40 border-l-4 border-red-500 hover:bg-red-900/60',
    badge: 'bg-red-500/20 text-red-100 border-red-500/50',
  },
  Overdue: {
    row: 'bg-yellow-900/40 border-l-4 border-yellow-500 hover:bg-yellow-900/60',
    badge: 'bg-yellow-500/20 text-yellow-100 border-yellow-500/50',
  },
  Routine: {
    row: 'hover:bg-muted/50', // Default hover
    badge: 'border-transparent bg-secondary text-secondary-foreground',
  },
  Complete: {
    row: 'opacity-60 hover:bg-muted/50',
    badge: 'border-transparent bg-green-500/20 text-green-200',
  },
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
                  className={cn('cursor-pointer font-medium', statusStyles[sample.status].row)}
                >
                  <TableCell className="font-mono">{sample.id}</TableCell>
                  <TableCell>
                    <div>{sample.patientName}</div>
                    <div className="text-sm text-muted-foreground">{`ID: ${sample.patientId}`}</div>
                  </TableCell>
                  <TableCell>{sample.test}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('gap-1.5 font-semibold', statusStyles[sample.status].badge)}>
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
