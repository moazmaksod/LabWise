'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UploadCloud, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { handleSmartDataEntry } from '@/app/actions';

const formSchema = z.object({
  patientName: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function SmartDataEntry() {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientName: '',
      address: '',
      dateOfBirth: '',
      insurancePolicyNumber: '',
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const photoDataUri = reader.result as string;
      const result = await handleSmartDataEntry({ photoDataUri });
      
      if ('error' in result) {
        toast({
          variant: 'destructive',
          title: 'Extraction Failed',
          description: result.error,
        });
      } else {
        form.reset(result);
        toast({
          title: 'Extraction Successful',
          description: 'Patient data has been populated from the document.',
        });
      }
      setIsLoading(false);
    };
    reader.onerror = () => {
      toast({
        variant: 'destructive',
        title: 'File Read Error',
        description: 'Could not read the selected file.',
      });
      setIsLoading(false);
    };
  };

  const onSubmit = (data: FormData) => {
    console.log('Saving patient data:', data);
    toast({
      title: 'Patient Saved',
      description: 'The new patient record has been created.',
    });
    form.reset();
    setFileName('');
  };

  return (
    <Card className="h-full shadow-lg">
      <CardHeader>
        <CardTitle>Smart Data Entry</CardTitle>
        <CardDescription>
          Upload a document to auto-fill patient information using AI.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="relative flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center hover:border-primary">
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                  </span>
                ) : fileName ? (
                  <span className="font-medium text-foreground">{fileName}</span>
                ) : (
                  'Click or drag file to upload'
                )}
              </p>
              <Input
                id="file-upload"
                type="file"
                className="absolute h-full w-full opacity-0"
                onChange={handleFileChange}
                disabled={isLoading}
                accept="image/*,.pdf"
              />
            </div>
            <FormField
              control={form.control}
              name="patientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input placeholder="YYYY-MM-DD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 123 Main St, Anytown, USA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="insurancePolicyNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance Policy #</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., XZ987654321" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              Save Patient
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
