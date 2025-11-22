
'use client';

import { useState, useEffect, useRef } from 'react';
import { ScanBarcode, ArrowRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ClientOrder, ClientPatient } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function AccessioningPage() {
  const { toast } = useToast();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [activeOrder, setActiveOrder] = useState<ClientOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    setLoading(true);
    try {
        const token = localStorage.getItem('labwise-token');
        // We are searching orders by "Order ID" which is simulated as the barcode on the requisition
        const res = await fetch(`/api/v1/orders?q=${barcodeInput}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const orders: ClientOrder[] = await res.json();
            if (orders.length > 0) {
                setActiveOrder(orders[0]);
                toast({ title: "Order Found", description: `Loaded requisition ${orders[0].orderId}` });
                setBarcodeInput('');
            } else {
                toast({ variant: "destructive", title: "Not Found", description: "No order found with that ID." });
            }
        }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const handleAccession = async (sampleIndex: number) => {
      if (!activeOrder) return;

      try {
          const token = localStorage.getItem('labwise-token');
          const res = await fetch('/api/v1/samples/accession', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ orderId: activeOrder.id, sampleIndex })
          });

          if (res.ok) {
              const data = await res.json();
              toast({ title: "Sample Accessioned", description: `Assigned ID: ${data.accessionNumber}` });

              // Refresh order data locally
              const updatedSamples = [...activeOrder.samples];
              updatedSamples[sampleIndex] = {
                  ...updatedSamples[sampleIndex],
                  status: 'InLab',
                  accessionNumber: data.accessionNumber,
                  receivedTimestamp: data.receivedTimestamp
              };
              setActiveOrder({ ...activeOrder, samples: updatedSamples });

          } else {
              const err = await res.json();
              toast({ variant: "destructive", title: "Error", description: err.message });
          }
      } catch (error) {
          toast({ variant: "destructive", title: "Error", description: "Failed to accession sample." });
      }
  };

  // Auto-focus input on load
  useEffect(() => {
      inputRef.current?.focus();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Sample Accessioning</h1>
          <p className="text-muted-foreground">Scan requisition barcode to receive samples.</p>
      </div>

      <Card className="border-2 border-primary/20 shadow-md">
          <CardContent className="pt-6">
              <form onSubmit={handleScan} className="flex gap-4">
                  <div className="relative flex-1">
                      <ScanBarcode className="absolute left-3 top-3 h-6 w-6 text-muted-foreground" />
                      <Input
                        ref={inputRef}
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        placeholder="Scan Order ID (e.g. ORD-2024-000001)"
                        className="pl-12 h-12 text-lg font-mono"
                        autoComplete="off"
                      />
                  </div>
                  <Button type="submit" size="lg" className="h-12 px-8" disabled={loading}>
                      {loading ? 'Searching...' : 'Lookup'}
                  </Button>
              </form>
          </CardContent>
      </Card>

      {activeOrder && (
          <div className="space-y-6 animate-accordion-down">
              {/* Patient Header */}
              <div className="bg-card border rounded-lg p-6 shadow-sm flex justify-between items-center">
                  <div>
                      <h2 className="text-2xl font-bold">{activeOrder.patientInfo?.firstName} {activeOrder.patientInfo?.lastName}</h2>
                      <div className="flex gap-4 mt-1 text-muted-foreground">
                          <span>MRN: <span className="font-mono text-foreground">{activeOrder.patientInfo?.mrn}</span></span>
                          <span>DOB: {format(new Date(activeOrder.patientInfo!.dateOfBirth), 'MM/dd/yyyy')}</span>
                      </div>
                  </div>
                  <div className="text-right">
                      <div className="text-sm text-muted-foreground">Order Priority</div>
                      {activeOrder.priority === 'STAT' ? (
                          <Badge variant="destructive" className="text-lg px-3 py-1">STAT</Badge>
                      ) : (
                          <Badge variant="outline" className="text-lg px-3 py-1">Routine</Badge>
                      )}
                  </div>
              </div>

              {/* Samples List */}
              <div className="grid gap-4">
                  {activeOrder.samples.map((sample, index) => (
                      <Card key={index} className={`border-l-4 ${sample.status === 'InLab' ? 'border-l-success' : 'border-l-primary'}`}>
                          <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <CardTitle className="flex items-center gap-2">
                                          {sample.sampleType} Sample
                                          {sample.status === 'InLab' && <Badge className="bg-success hover:bg-success"><CheckCircle2 className="w-3 h-3 mr-1"/> Received</Badge>}
                                      </CardTitle>
                                      <CardDescription>
                                          {sample.tests.map(t => t.name).join(', ')}
                                      </CardDescription>
                                  </div>
                                  {sample.status === 'InLab' ? (
                                      <div className="text-right">
                                          <div className="text-sm font-bold text-success">{sample.accessionNumber}</div>
                                          <div className="text-xs text-muted-foreground">{format(new Date(sample.receivedTimestamp!), 'HH:mm:ss')}</div>
                                      </div>
                                  ) : (
                                    <Button onClick={() => handleAccession(index)}>
                                        <ArrowRight className="mr-2 h-4 w-4" /> Receive Sample
                                    </Button>
                                  )}
                              </div>
                          </CardHeader>
                      </Card>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
}
