
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { ClientOrder } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { Form, FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';

export default function ResultEntryPage({ params }: { params: { accessionNumber: string } }) {
  const { accessionNumber } = params;
  const router = useRouter();
  const { toast } = useToast();
  const [order, setOrder] = useState<ClientOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
      defaultValues: {
          results: [] as { testCode: string; name: string; value: string; notes: string; units: string; range: string }[]
      }
  });

  useEffect(() => {
      const fetchOrder = async () => {
          const token = localStorage.getItem('labwise-token');
          // Search by accession number in the general search
          const res = await fetch(`/api/v1/orders?q=${accessionNumber}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              const orders: ClientOrder[] = await res.json();
              if (orders.length > 0) {
                  setOrder(orders[0]);

                  // Find the specific sample
                  const sample = orders[0].samples.find(s => s.accessionNumber === accessionNumber);
                  if (sample) {
                      form.reset({
                          results: sample.tests.map(t => ({
                              testCode: t.testCode,
                              name: t.name,
                              value: t.resultValue || '',
                              notes: t.notes || '',
                              units: t.resultUnits || '',
                              range: t.referenceRange || ''
                          }))
                      });
                  }
              }
          }
          setLoading(false);
      };
      fetchOrder();
  }, [accessionNumber, form]);

  const onSubmit = async (data: any) => {
      setSubmitting(true);
      try {
        const token = localStorage.getItem('labwise-token');
        const res = await fetch('/api/v1/results/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                accessionNumber,
                results: data.results.map((r: any) => ({
                    testCode: r.testCode,
                    value: r.value,
                    notes: r.notes
                }))
            })
        });

        if (res.ok) {
            toast({ title: "Success", description: "Results verified successfully." });
            router.push('/dashboard');
        } else {
            toast({ variant: "destructive", title: "Error", description: "Failed to verify results." });
        }
      } catch (e) {
        console.error(e);
      } finally {
          setSubmitting(false);
      }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!order) return <div className="p-8 text-center">Sample not found.</div>;

  const sample = order.samples.find(s => s.accessionNumber === accessionNumber);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
                <h1 className="text-2xl font-bold">Result Entry</h1>
                <p className="text-muted-foreground">Accession: {accessionNumber}</p>
            </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Patient</CardTitle></CardHeader>
                <CardContent className="text-lg font-bold">{order.patientInfo?.firstName} {order.patientInfo?.lastName}</CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">MRN</CardTitle></CardHeader>
                <CardContent className="text-lg font-mono">{order.patientInfo?.mrn}</CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sample Type</CardTitle></CardHeader>
                <CardContent className="text-lg">{sample?.sampleType}</CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader><CardTitle>Test Results</CardTitle></CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground mb-2 px-2">
                            <div className="col-span-4">Test Name</div>
                            <div className="col-span-3">Result</div>
                            <div className="col-span-2">Units</div>
                            <div className="col-span-3">Ref. Range</div>
                        </div>

                        {form.watch('results').map((field, index) => (
                            <div key={index} className="grid grid-cols-12 gap-4 items-start bg-muted/10 p-2 rounded">
                                <div className="col-span-4 pt-2">
                                    <div className="font-medium">{field.name}</div>
                                    <div className="text-xs text-muted-foreground">{field.testCode}</div>
                                </div>
                                <div className="col-span-3">
                                    <FormField
                                        control={form.control}
                                        name={`results.${index}.value`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input {...field} placeholder="Enter value" className="bg-background" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="col-span-2 pt-2 text-sm">{field.units}</div>
                                <div className="col-span-3 pt-2 text-sm">{field.range}</div>
                            </div>
                        ))}

                        <div className="flex justify-end pt-4">
                            <Button type="submit" size="lg" disabled={submitting}>
                                {submitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                                Verify Results
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
