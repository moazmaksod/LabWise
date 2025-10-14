
'use client';

import { Wrench, PlusCircle, MoreVertical, HardHat, FileText, Calendar, User } from 'lucide-react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const MOCK_INSTRUMENTS = [
    { id: 'INST-001', name: 'ARCHITECT c4000', model: 'Chemistry Analyzer', status: 'Online', lastCalibration: '2024-07-26', log: [
        { date: '2024-07-26', type: 'Calibration', user: 'D. Rodriguez', notes: 'Passed all levels.'},
        { date: '2024-07-20', type: 'Maintenance', user: 'D. Rodriguez', notes: 'Replaced sample probe.'},
    ] },
    { id: 'INST-002', name: 'Sysmex XN-1000', model: 'Hematology Analyzer', status: 'Online', lastCalibration: '2024-07-25', log: [] },
    { id: 'INST-003', name: 'ACL TOP 550', model: 'Coagulation Analyzer', status: 'Maintenance', lastCalibration: '2024-07-20', log: [
        { date: '2024-07-28', type: 'Maintenance', user: 'D. Rodriguez', notes: 'Currently servicing cuvette reader.'},
    ] },
    { id: 'INST-004', name: 'VITEK 2 Compact', model: 'Microbiology Analyzer', status: 'Offline', lastCalibration: '2024-07-22', log: [
        { date: '2024-07-27', type: 'Error', user: 'System', notes: 'Failed to initialize card reader. Code: E-501.'},
    ] },
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
                    <Dialog key={inst.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="font-mono">{inst.id}</TableCell>
                            <TableCell>
                                <DialogTrigger asChild>
                                    <div className="font-medium hover:underline">{inst.name}</div>
                                </DialogTrigger>
                                <div className="text-sm text-muted-foreground">{inst.model}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={inst.status === 'Online' ? 'default' : inst.status === 'Maintenance' ? 'secondary' : 'destructive'} className={inst.status === 'Online' ? 'bg-green-500/20 text-green-300 border-green-500/50' : inst.status === 'Maintenance' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' : ''}>
                                    {inst.status}
                                </Badge>
                            </TableCell>
                            <TableCell>{inst.lastCalibration}</TableCell>
                            <TableCell className="text-right">
                               <DialogTrigger asChild>
                                   <Button variant="outline" size="sm">View Log</Button>
                               </DialogTrigger>
                            </TableCell>
                        </TableRow>
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>{inst.name} ({inst.id})</DialogTitle>
                                <DialogDescription>{inst.model}</DialogDescription>
                            </DialogHeader>
                            <Tabs defaultValue="logbook">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="logbook">Maintenance Logbook</TabsTrigger>
                                    <TabsTrigger value="details">Details</TabsTrigger>
                                </TabsList>
                                <TabsContent value="logbook" className="pt-4">
                                     <div className="flex justify-end mb-4">
                                        <Button><HardHat className="mr-2 h-4 w-4" />Log New Maintenance</Button>
                                    </div>
                                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                                       {inst.log.length > 0 ? inst.log.map((entry, index) => (
                                           <div key={index} className="p-4 border-b last:border-b-0">
                                               <div className="flex justify-between items-start">
                                                   <div>
                                                        <p className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> {entry.type}</p>
                                                        <p className="text-sm text-muted-foreground pl-6">{entry.notes}</p>
                                                   </div>
                                                   <div className="text-sm text-muted-foreground text-right">
                                                        <p className="flex items-center gap-2 justify-end"><User className="h-4 w-4" />{entry.user}</p>
                                                        <p className="flex items-center gap-2 justify-end"><Calendar className="h-4 w-4" />{entry.date}</p>
                                                   </div>
                                               </div>
                                           </div>
                                       )) : (
                                           <div className="text-center text-muted-foreground py-16">No log entries for this instrument.</div>
                                       )}
                                    </div>
                                </TabsContent>
                                <TabsContent value="details" className="pt-4">
                                    <p>Details about instrument settings, configurations, and specifications would be displayed here.</p>
                                </TabsContent>
                            </Tabs>
                        </DialogContent>
                    </Dialog>
                ))}
              </TableBody>
            </Table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
