
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Beaker, CheckCircle, Clock, FileWarning, FlaskConical, Loader2, Save, User, AlertTriangle } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { ClientOrder, ClientPatient, OrderSample, OrderTest } from '@/lib/types';
import { calculateAge } from '@/lib/utils';
import { cn } from '@/lib/utils';

const resultSchema = z.object({
    value: z.string().min(1, "Result value is required."),
    notes: z.string().optional(),
    testCode: z.string(),
});

const verificationSchema = z.object({
    results: z.array(resultSchema),
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

function ResultEntryPageComponent() {
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const accessionNumber = params.accessionNumber as string;

    const [order, setOrder] = useState<ClientOrder | null>(null);
    const [patient, setPatient] = useState<ClientPatient | null>(null);
    const [sample, setSample] = useState<ClientOrder['samples'][number] | null>(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const [deltaCheckModalOpen, setDeltaCheckModalOpen] = useState(false);
    const [deltaCheckTest, setDeltaCheckTest] = useState<OrderTest | null>(null);


    const form = useForm<VerificationFormValues>({
        resolver: zodResolver(verificationSchema),
        defaultValues: {
            results: [],
        },
    });

    const { fields, replace } = useFieldArray({
        control: form.control,
        name: "results",
    });

    const fetchSampleDetails = useCallback(async (accNum: string, authToken: string) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/orders?q=${accNum}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) throw new Error(`Order with accession number ${accNum} not found.`);

            const orders: ClientOrder[] = await response.json();
            if (orders.length === 0) throw new Error(`No order found for accession number ${accNum}.`);

            const targetOrder = orders[0];
            setOrder(targetOrder);
            setPatient(targetOrder.patientInfo || null);

            const targetSample = targetOrder.samples.find(s => s.accessionNumber === accNum);
            if (!targetSample) throw new Error('Sample not found within the order.');

            setSample(targetSample);

            // Initialize form with existing data
            const initialResults = targetSample.tests.map(test => ({
                testCode: test.testCode,
                value: test.resultValue || '',
                notes: test.notes || '',
            }));
            replace(initialResults);

            // Check for delta check on load
            const testWithDelta = targetSample.tests.find(t => t.flags?.includes('DELTA_CHECK_FAILED') && t.status !== 'Verified');
            if (testWithDelta) {
                setDeltaCheckTest(testWithDelta);
                setDeltaCheckModalOpen(true);
            }

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Loading Sample', description: error.message });
            router.push('/dashboard');
        } finally {
            setLoading(false);
        }
    }, [toast, router, replace]);

    useEffect(() => {
        const storedToken = localStorage.getItem('labwise-token');
        if (storedToken) setToken(storedToken);
        else router.push('/');
    }, [router]);

    useEffect(() => {
        if (token && accessionNumber) {
            fetchSampleDetails(accessionNumber, token);
        }
    }, [token, accessionNumber, fetchSampleDetails]);

    const onSubmit = async (data: VerificationFormValues) => {
        if (!token) return;
        try {
            const response = await fetch('/api/v1/results/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ accessionNumber, results: data.results }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to submit results.');
            }
            toast({ title: 'Results Submitted', description: 'Results have been saved and processed.' });
            router.push('/dashboard');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        }
    };

    const getTestStatusVariant = (status?: OrderTest['status']) => {
        switch (status) {
            case 'Verified': return 'default';
            case 'AwaitingVerification': return 'destructive';
            default: return 'outline';
        }
    };

    if (loading) {
        return <div className="space-y-4 max-w-5xl mx-auto"><Skeleton className="h-10 w-32" /><Skeleton className="h-96 w-full" /></div>
    }

    if (!order || !patient || !sample) {
        return <div className="text-center text-muted-foreground">Sample data could not be loaded.</div>
    }

    const isFullyVerified = sample.status === 'Verified';

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Worklist
            </Button>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">Result Entry & Verification</CardTitle>
                            <CardDescription>Accession #: <span className="font-mono font-semibold">{sample.accessionNumber}</span></CardDescription>
                        </div>
                        <Badge variant={order.priority === 'STAT' ? 'destructive' : 'secondary'} className="text-base">{order.priority}</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <Card className="bg-secondary mb-6">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <div className="flex items-center gap-4">
                                <User className="h-8 w-8 text-muted-foreground" />
                                <div>
                                    <CardTitle>{patient.firstName} {patient.lastName}</CardTitle>
                                    <CardDescription>MRN: {patient.mrn} | Age: {calculateAge(patient.dateOfBirth)}</CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-muted-foreground" /> <span>{sample.sampleType}</span></div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        Received: {sample.receivedTimestamp
                                            ? format(
                                                typeof sample.receivedTimestamp === 'string'
                                                    ? parseISO(sample.receivedTimestamp)
                                                    : new Date(sample.receivedTimestamp),
                                                'p'
                                            )
                                            : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {fields.map((field, index) => {
                                const test = sample.tests[index];
                                const hasDeltaFlag = test.flags?.includes('DELTA_CHECK_FAILED');
                                const isVerified = test.status === 'Verified';
                                return (
                                    <Card key={field.id} className={cn(hasDeltaFlag && !isVerified && "border-yellow-500/50 bg-yellow-900/20")}>
                                        <CardHeader className="flex flex-row justify-between items-start pb-4">
                                            <div>
                                                <CardTitle className="text-lg">{test.name}</CardTitle>
                                                <CardDescription>Test Code: {test.testCode}</CardDescription>
                                            </div>
                                            <Badge variant={getTestStatusVariant(test.status)}>{test.status}</Badge>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {hasDeltaFlag && !isVerified && (
                                                <Alert variant="destructive" className="bg-yellow-600/10 border-yellow-500/60 text-yellow-200 [&>svg]:text-yellow-400">
                                                    <FileWarning className="h-4 w-4" />
                                                    <AlertTitle>Delta Check Failed</AlertTitle>
                                                    <AlertDescription>
                                                        This result is significantly different from the previous result. Please verify and document before proceeding.
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                                                <FormField
                                                    control={form.control}
                                                    name={`results.${index}.value`}
                                                    render={({ field }) => (
                                                        <FormItem className="md:col-span-2">
                                                            <FormLabel>Result Value</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Input placeholder="Enter result..." {...field} disabled={isVerified} />
                                                                    {test.resultUnits && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{test.resultUnits}</span>}
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`results.${index}.notes`}
                                                    render={({ field }) => (
                                                        <FormItem className="md:col-span-3">
                                                            <FormLabel>Notes</FormLabel>
                                                            <FormControl>
                                                                <Textarea placeholder="Add any relevant notes..." {...field} disabled={isVerified} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={form.formState.isSubmitting || isFullyVerified}>
                                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isFullyVerified ? <><CheckCircle className="mr-2 h-4 w-4" /> Fully Verified</> : <><Save className="mr-2 h-4 w-4" /> Save & Verify Results</>}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Dialog open={deltaCheckModalOpen} onOpenChange={setDeltaCheckModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-yellow-400">
                            <FileWarning /> Delta Check Failure
                        </DialogTitle>
                        <DialogDescription>
                            The result for **{deltaCheckTest?.name}** is significantly different from the patient&apos;s previous result.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 my-4">
                        <div className="text-center p-4 rounded-lg bg-secondary">
                            <p className="text-sm text-muted-foreground">Previous Result</p>
                            <p className="text-2xl font-bold">4.1 <span className="text-base text-muted-foreground">{deltaCheckTest?.resultUnits}</span></p>
                            <p className="text-xs text-muted-foreground">Yesterday</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-yellow-900/50 border border-yellow-500/50">
                            <p className="text-sm text-yellow-400">Current Result</p>
                            <p className="text-2xl font-bold text-yellow-300">7.0 <span className="text-base text-muted-foreground">{deltaCheckTest?.resultUnits}</span></p>
                            <p className="text-xs text-muted-foreground">Now</p>
                        </div>
                    </div>
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Action Required</AlertTitle>
                        <AlertDescription>
                            Please investigate for potential pre-analytical errors (e.g., IV contamination) or instrument issues before releasing this result. Document your findings in the notes section.
                        </AlertDescription>
                    </Alert>
                    <div className="flex justify-end pt-4">
                        <Button onClick={() => setDeltaCheckModalOpen(false)}>Acknowledge & Continue</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function ResultEntryPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[calc(100vh-8rem)] w-full" />}>
            <ResultEntryPageComponent />
        </Suspense>
    )
}
