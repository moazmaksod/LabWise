
'use client';

import { Wrench, PlusCircle, MoreVertical } from 'lucide-react';
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


const MOCK_INSTRUMENTS = [
    { id: 'INST-001', name: 'ARCHITECT c4000', model: 'Chemistry Analyzer', status: 'Online', lastCalibration: '2024-07-26' },
    { id: 'INST-002', name: 'Sysmex XN-1000', model: 'Hematology Analyzer', status: 'Online', lastCalibration: '2024-07-25' },
    { id: 'INST-003', name: 'ACL TOP 550', model: 'Coagulation Analyzer', status: 'Maintenance', lastCalibration: '2024-07-20' },
    { id: 'INST-004', name: 'VITEK 2 Compact', model: 'Microbiology Analyzer', status: 'Offline', lastCalibration: '2024-07-22' },
]

export default function InstrumentsPage() {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instruments</h1>
          <p className="text-muted-foreground">Manage and view status of all laboratory instruments.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Instrument
        </Button>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Instrument List</CardTitle>
          <CardDescription>A list of all instruments currently in the laboratory.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary hover:bg-secondary">
                  <TableHead>Instrument ID</TableHead>
                  <TableHead>Name & Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Calibration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_INSTRUMENTS.map((inst) => (
                    <TableRow key={inst.id}>
                        <TableCell className="font-mono">{inst.id}</TableCell>
                        <TableCell>
                            <div className="font-medium">{inst.name}</div>
                            <div className="text-sm text-muted-foreground">{inst.model}</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={inst.status === 'Online' ? 'default' : inst.status === 'Maintenance' ? 'secondary' : 'destructive'} className={inst.status === 'Online' ? 'bg-green-500/20 text-green-300 border-green-500/50' : inst.status === 'Maintenance' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' : ''}>
                                {inst.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{inst.lastCalibration}</TableCell>
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
