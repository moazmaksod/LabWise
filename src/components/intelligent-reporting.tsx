'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Wand2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { handleGenerateReport } from '@/app/actions';

const formSchema = z.object({
  patientId: z.string().min(1, { message: 'Patient ID is required.' }),
  reportType: z.string().min(1, { message: 'Report type is required.' }),
  customInstructions: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function IntelligentReporting() {
  const [isLoading, setIsLoading] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: 'P00123',
      reportType: 'Comprehensive',
      customInstructions: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setReportContent('');
    const result = await handleGenerateReport(data);

    if ('error' in result) {
      toast({
        variant: 'destructive',
        title: 'Report Generation Failed',
        description: result.error,
      });
    } else {
      setReportContent(result.reportContent);
      toast({
        title: 'Report Generated',
        description: 'AI-driven report has been successfully created.',
      });
    }
    setIsLoading(false);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Intelligent Reporting</CardTitle>
        <CardDescription>
          Generate customizable reports with AI-driven interpretations based on patient historical data.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8 md:grid-cols-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., P00123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reportType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a report type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Comprehensive">Comprehensive</SelectItem>
                      <SelectItem value="Summary">Summary</SelectItem>
                      <SelectItem value="Trend Analysis">Trend Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Focus on lipid panel trends over the last 5 years."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </form>
        </Form>
        <div className="rounded-lg border bg-secondary/50 p-4">
          <h4 className="mb-4 text-lg font-semibold">Generated Report</h4>
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                <p className="mt-2">AI is generating the report...</p>
              </div>
            </div>
          ) : reportContent ? (
            <pre className="whitespace-pre-wrap rounded-md bg-background p-4 font-code text-sm">
              {reportContent}
            </pre>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p>Your generated report will appear here.</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
