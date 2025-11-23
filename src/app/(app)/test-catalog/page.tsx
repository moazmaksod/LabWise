
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlusCircle, MoreHorizontal, ShieldAlert, FlaskConical, Beaker, Clock, Filter, Search, Download } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import type { ClientTestCatalogItem } from '@/lib/types';


const testCatalogSchema = z.object({
  id: z.string().optional(),
  testCode: z.string().min(1, 'Test code is required'),
  name: z.string().min(1, 'Test name is required'),
  description: z.string().optional(),
  specimenRequirements: z.object({
    tubeType: z.string().min(1, 'Tube type is required'),
    minVolume: z.coerce.number().min(0, 'Volume must be positive'),
    units: z.string().default('mL'),
    specialHandling: z.string().optional(),
  }),
  turnaroundTime: z.object({
    value: z.coerce.number().min(1, "Turnaround time is required"),
    units: z.enum(['hours', 'days']),
  }),
  price: z.coerce.number().min(0, "Price must be positive"),
  isActive: z.boolean().default(true),
});

type TestFormValues = z.infer<typeof testCatalogSchema>;

export default function TestCatalogPage() {
  const [tests, setTests] = useState<ClientTestCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<ClientTestCatalogItem | null>(null);
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const form = useForm<TestFormValues>({
    resolver: zodResolver(testCatalogSchema),
    defaultValues: {
      testCode: '',
      name: '',
      description: '',
      specimenRequirements: {
        tubeType: 'Lavender Top',
        minVolume: 3,
        units: 'mL',
        specialHandling: 'Refrigerate',
      },
      turnaroundTime: {
        value: 24,
        units: 'hours',
      },
      price: 0,
      isActive: true,
    },
  });

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('labwise-token');
      const response = await fetch('/api/v1/test-catalog', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch tests');
      }
      const data = await response.json();
      setTests(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not fetch test catalog.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!userLoading && user?.role === 'manager') {
      fetchTests();
    }
  }, [user?.role, userLoading, fetchTests]);

  if (userLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-28" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (user?.role !== 'manager') {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to access this page.
        </AlertDescription>
      </Alert>
    );
  }

  const handleEdit = (test: ClientTestCatalogItem) => {
    setEditingTest(test);
    form.reset({
      id: test.id,
      testCode: test.testCode,
      name: test.name,
      description: test.description,
      specimenRequirements: test.specimenRequirements,
      turnaroundTime: test.turnaroundTime,
      price: test.price,
      isActive: test.isActive,
    });
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingTest(null);
    form.reset({
      id: undefined,
      testCode: '',
      name: '',
      description: '',
      specimenRequirements: { tubeType: 'Lavender Top', minVolume: 3, units: 'mL', specialHandling: '' },
      turnaroundTime: { value: 24, units: 'hours' },
      price: 0,
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const onSubmit = async (data: TestFormValues) => {
    const apiEndpoint = data.id ? `/api/v1/test-catalog` : '/api/v1/test-catalog';
    const method = data.id ? 'PUT' : 'POST';
    const token = localStorage.getItem('labwise-token');

    try {
      const response = await fetch(apiEndpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save test.');
      }

      toast({
        title: `Test ${data.id ? 'updated' : 'created'} successfully`,
      });
      setIsFormOpen(false);
      fetchTests(); // Refresh the list
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error saving test',
        description: error.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Catalog Management</h1>
          <p className="text-muted-foreground">Manage laboratory test catalog and reference ranges</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTest ? 'Edit Test' : 'Add New Test'}</DialogTitle>
              <DialogDescription>
                {editingTest ? 'Update the details for this test.' : 'Define a new test for the laboratory catalog.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="testCode" render={({ field }) => (<FormItem><FormLabel>Test Code</FormLabel><FormControl><Input placeholder="BMP" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Test Name</FormLabel><FormControl><Input placeholder="Basic Metabolic Panel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A group of 8 tests that measures..." {...field} /></FormControl><FormMessage /></FormItem>)} />

                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">Specimen Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="specimenRequirements.tubeType" render={({ field }) => (<FormItem><FormLabel>Tube Type</FormLabel><FormControl><Input placeholder="Green Top" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="specimenRequirements.minVolume" render={({ field }) => (<FormItem><FormLabel>Min. Volume</FormLabel><FormControl><Input type="number" placeholder="3" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="specimenRequirements.units" render={({ field }) => (<FormItem><FormLabel>Units</FormLabel><FormControl><Input placeholder="mL" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="turnaroundTime.value" render={({ field }) => (<FormItem><FormLabel>Turnaround Time</FormLabel><FormControl><Input type="number" placeholder="24" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="50.00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active Test</FormLabel>
                        <FormDescription>Can this test be ordered?</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Test</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tests by name, code, or category..." className="pl-10" />
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Test Catalog ({tests.length})
          </CardTitle>
          <CardDescription>Laboratory test catalog with pricing and specifications.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary hover:bg-secondary">
                  <TableHead>Test</TableHead>
                  <TableHead>Specimen</TableHead>
                  <TableHead className="hidden md:table-cell">TAT</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-12 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : tests.length > 0 ? (
                  tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <FlaskConical className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium">{test.name}</div>
                            <div className="text-sm text-muted-foreground">Code: {test.testCode}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{test.specimenRequirements.tubeType}</div>
                        <div className="text-sm text-muted-foreground">{test.specimenRequirements.minVolume}{test.specimenRequirements.units}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1"><Clock className="h-4 w-4 text-muted-foreground" /> {test.turnaroundTime.value}-{parseInt(test.turnaroundTime.value.toString()) + 2} {test.turnaroundTime.units}</div>
                      </TableCell>
                      <TableCell>
                        ${test.price.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={test.isActive ? 'bg-green-200/20 text-green-400 border-green-400/50' : 'bg-red-200/20 text-red-400 border-red-400/50'}>
                          {test.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(test)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Deactivate</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No tests found. Add a new test to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
