
'use client';

import { ShieldCheck, LineChart, PlusCircle, Wrench, Search, MoreVertical, Thermometer, Loader2 } from 'lucide-react';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';


const MOCK_QC_RUNS = [
  { id: 'QC-001', instrument: 'ARCHITECT c4000', test: 'Glucose', status: 'Pass', time: '8:05 AM' },
  { id: 'QC-002', instrument: 'Sysmex XN-1000', test: 'CBC', status: 'Pass', time: '8:01 AM' },
  { id: 'QC-003', instrument: 'ARCHITECT c4000', test: 'Potassium', status: 'Fail', time: '7:55 AM' },
  { id: 'QC-004', instrument: 'ACL TOP 550', test: 'PT/INR', status: 'Pass', time: '7:50 AM' },
];

const MOCK_INSTRUMENTS = [
    { id: 'INST-001', name: 'ARCHITECT c4000' },
    { id: 'INST-002', name: 'Sysmex XN-1000' },
    { id: 'INST-003', name: 'ACL TOP 550' },
    { id: 'INST-004', name: 'VITEK 2 Compact' },
];

const MOCK_TESTS = [
    { id: 'TEST-001', name: 'Glucose' },
    { id: 'TEST-002', name: 'CBC' },
    { id: 'TEST-003', name: 'Potassium' },
    { id: 'TEST-004', name: 'PT/INR' },
];

const qcFormSchema = z.object({
  instrumentId: z.string().min(1, "Instrument is required."),
  testCode: z.string().min(1, "Test is required."),
  qcMaterialLot: z.string().min(1, "QC lot number is required."),
  resultValue: z.coerce.number(),
});

type QcFormValues = z.infer<typeof qcFormSchema>;

export default function QualityControlPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<QcFormValues>({
    resolver: zodResolver(qcFormSchema),
    defaultValues: {
      instrumentId: '',
      testCode: '',
      qcMaterialLot: '',
    },
  });

  const onSubmit = async (data: QcFormValues) => {
    // Simulate API call
    form.formState.isSubmitting = true;
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
        title: "QC Run Logged",
        description: `Result ${data.resultValue} for ${data.testCode} on ${data.instrumentId} has been saved.`
    });
    form.reset();
    setIsFormOpen(false);
    form.formState.isSubmitting = false;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quality Control</h1>
          <p className="text-muted-foreground">Monitor and document QC runs for all instruments.</p>
        </div>
         <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Log New QC Run
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log New QC Run</DialogTitle>
                    <DialogDescription>Enter the details for the new quality control run.</DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="instrumentId" render={({ field }) => ( <FormItem><FormLabel>Instrument</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select an instrument" /></SelectTrigger></FormControl><SelectContent>{MOCK_INSTRUMENTS.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="testCode" render={({ field }) => ( <FormItem><FormLabel>Test</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a test" /></SelectTrigger></FormControl><SelectContent>{MOCK_TESTS.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="qcMaterialLot" render={({ field }) => ( <FormItem><FormLabel>QC Material Lot #</FormLabel><FormControl><Input placeholder="QC-LOT-12345" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="resultValue" render={({ field }) => ( <FormItem><FormLabel>Result Value</FormLabel><FormControl><Input type="number" step="any" placeholder="102.5" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Run
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
         </Dialog>
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
