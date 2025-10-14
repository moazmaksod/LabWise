

'use client';

import { Wrench, PlusCircle, MoreVertical, HardHat, FileText, Calendar, User, Loader2, ServerCrash } from 'lucide-react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useCallback } from 'react';
import type { ClientInstrument } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

const MOCK_INSTRUMENTS_OLD = [
    { id: 'INST-001', name: 'ARCHITECT c4000', model: 'Chemistry Analyzer', status: 'Online', lastCalibration: '2024-07-26', log: [
        { date: '2024-07-26', type: 'Calibration', user: 'D. Rodriguez', notes: 'Passed all levels.'},
        { date: '2024-07-20', type: 'Maintenance', user: 'D. Rodriguez', notes: 'Replaced sample probe.'},
    ] },
];

const maintenanceLogSchema = z.object({
  logType: z.enum(['Maintenance', 'Calibration', 'Repair', 'Error']),
  description: z.string().min(5, "Description must be at least 5 characters."),
});

type MaintenanceLogFormValues = z.infer<typeof maintenanceLogSchema>;


function MaintenanceLogForm({ instrumentId, onLogSaved }: { instrumentId: string, onLogSaved: () => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<MaintenanceLogFormValues>({
        resolver: zodResolver(maintenanceLogSchema),
        defaultValues: { logType: 'Maintenance', description: '' },
    });

    const onSubmit = async (data: MaintenanceLogFormValues) => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('labwise-token');
            const response = await fetch(`/api/v1/instruments/${instrumentId}/logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save log entry.');
            }
            toast({ title: 'Success', description: 'Maintenance log has been added.' });
            onLogSaved();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField control={form.control} name="logType" render={({ field }) => ( <FormItem><FormLabel>Log Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select log type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Maintenance">Maintenance</SelectItem><SelectItem value="Calibration">Calibration</SelectItem><SelectItem value="Repair">Repair</SelectItem><SelectItem value="Error">Error</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description / Notes</FormLabel><FormControl><Textarea placeholder="Describe the maintenance or error..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <DialogFooter className="pt-4">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Log Entry
                    </Button>
                 </DialogFooter>
            </form>
        </Form>
    )
}

export default function InstrumentsPage() {
  const [instruments, setInstruments] = useState<ClientInstrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstrument, setSelectedInstrument] = useState<ClientInstrument | null>(null);
  const { toast } = useToast();

  const fetchInstruments = useCallback(async () => {
    setLoading(true);
    try {
        const token = localStorage.getItem('labwise-token');
        const response = await fetch('/api/v1/instruments', {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch instruments.');
        const data = await response.json();
        setInstruments(data);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  const handleLogSaved = () => {
      setSelectedInstrument(null);
      fetchInstruments();
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instruments</h1>
          <p className="text-muted-foreground">Manage and view status of all laboratory instruments.</p>
        </div>
        <Button disabled>
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
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-12 w-full"/></TableCell></TableRow>)
                ) : instruments.length > 0 ? (
                    instruments.map((inst) => (
                        <TableRow key={inst.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedInstrument(inst)}>
                            <TableCell className="font-mono">{inst.instrumentId}</TableCell>
                            <TableCell>
                                <div className="font-medium hover:underline">{inst.name}</div>
                                <div className="text-sm text-muted-foreground">{inst.model}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={inst.status === 'Online' ? 'default' : inst.status === 'Maintenance' ? 'secondary' : 'destructive'} className={inst.status === 'Online' ? 'bg-green-500/20 text-green-300 border-green-500/50' : inst.status === 'Maintenance' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' : ''}>
                                    {inst.status}
                                </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(inst.lastCalibrationDate), 'PP')}</TableCell>
                            <TableCell className="text-right">
                               <Button variant="outline" size="sm">View Log</Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            <ServerCrash className="mx-auto h-8 w-8 text-muted-foreground" />
                            No instruments found.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
           </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedInstrument} onOpenChange={(open) => !open && setSelectedInstrument(null)}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>{selectedInstrument?.name} ({selectedInstrument?.instrumentId})</DialogTitle>
                <DialogDescription>{selectedInstrument?.model}</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="logbook">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="logbook">Maintenance Logbook</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                <TabsContent value="logbook" className="pt-4">
                     <Dialog>
                        <DialogTrigger asChild>
                            <div className="flex justify-end mb-4">
                                <Button><HardHat className="mr-2 h-4 w-4" />Log New Maintenance</Button>
                            </div>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader>
                                <DialogTitle>New Maintenance Log</DialogTitle>
                                <DialogDescription>Add a new log entry for {selectedInstrument?.name}.</DialogDescription>
                            </DialogHeader>
                            {selectedInstrument && <MaintenanceLogForm instrumentId={selectedInstrument.id} onLogSaved={handleLogSaved} />}
                        </DialogContent>
                     </Dialog>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                       {selectedInstrument?.maintenanceLogs && selectedInstrument.maintenanceLogs.length > 0 ? selectedInstrument.maintenanceLogs.map((entry, index) => (
                           <div key={index} className="p-4 border-b last:border-b-0">
                               <div className="flex justify-between items-start">
                                   <div>
                                        <p className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> {entry.logType}</p>
                                        <p className="text-sm text-muted-foreground pl-6">{entry.description}</p>
                                   </div>
                                   <div className="text-sm text-muted-foreground text-right">
                                        <p className="flex items-center gap-2 justify-end"><User className="h-4 w-4" />{entry.performedBy}</p>
                                        <p className="flex items-center gap-2 justify-end"><Calendar className="h-4 w-4" />{format(new Date(entry.timestamp), 'PPpp')}</p>
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
    </div>
  );
}
