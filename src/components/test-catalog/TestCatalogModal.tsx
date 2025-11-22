
'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientTestCatalogItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define schema for nested objects first
const specimenSchema = z.object({
    tubeType: z.string().min(1, 'Tube type is required'),
    minVolume: z.coerce.number().min(0, 'Must be positive'),
    units: z.string().min(1, 'Units required'),
    specialHandling: z.string().optional(),
});

const tatSchema = z.object({
    value: z.coerce.number().min(0),
    units: z.enum(['hours', 'days']),
});

const referenceRangeSchema = z.object({
    ageMin: z.coerce.number().min(0),
    ageMax: z.coerce.number().min(0),
    gender: z.enum(['Male', 'Female', 'Any']),
    rangeLow: z.coerce.number(),
    rangeHigh: z.coerce.number(),
    units: z.string().min(1),
});

const testCatalogSchema = z.object({
    testCode: z.string().min(2, 'Code required'),
    name: z.string().min(2, 'Name required'),
    description: z.string().optional(),
    price: z.coerce.number().min(0),
    isPanel: z.boolean(),
    specimenRequirements: specimenSchema,
    turnaroundTime: tatSchema,
    referenceRanges: z.array(referenceRangeSchema),
    // Simple panel components for now (comma separated string in UI -> array in logic)
    panelComponentsStr: z.string().optional(),
});

type TestFormValues = z.infer<typeof testCatalogSchema>;

interface TestCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  testToEdit?: ClientTestCatalogItem;
  onSave: () => void;
}

export function TestCatalogModal({ isOpen, onClose, testToEdit, onSave }: TestCatalogModalProps) {
  const { toast } = useToast();
  const isEditing = !!testToEdit;

  const form = useForm<TestFormValues>({
    resolver: zodResolver(testCatalogSchema),
    defaultValues: {
      testCode: '',
      name: '',
      description: '',
      price: 0,
      isPanel: false,
      specimenRequirements: {
          tubeType: '',
          minVolume: 1,
          units: 'mL',
          specialHandling: '',
      },
      turnaroundTime: {
          value: 24,
          units: 'hours',
      },
      referenceRanges: [],
      panelComponentsStr: '',
    },
  });

  const { fields: rangeFields, append: appendRange, remove: removeRange } = useFieldArray({
      control: form.control,
      name: "referenceRanges",
  });

  useEffect(() => {
    if (isOpen) {
        if (testToEdit) {
            form.reset({
                testCode: testToEdit.testCode,
                name: testToEdit.name,
                description: testToEdit.description || '',
                price: testToEdit.price,
                isPanel: testToEdit.isPanel,
                specimenRequirements: testToEdit.specimenRequirements,
                turnaroundTime: testToEdit.turnaroundTime as any,
                referenceRanges: testToEdit.referenceRanges as any,
                panelComponentsStr: testToEdit.panelComponents?.join(', ') || '',
            });
        } else {
            form.reset({
                testCode: '',
                name: '',
                description: '',
                price: 0,
                isPanel: false,
                specimenRequirements: { tubeType: '', minVolume: 1, units: 'mL', specialHandling: '' },
                turnaroundTime: { value: 24, units: 'hours' },
                referenceRanges: [],
                panelComponentsStr: '',
            });
        }
    }
  }, [isOpen, testToEdit, form]);

  const onSubmit = async (data: TestFormValues) => {
    try {
        const token = localStorage.getItem('labwise-token');

        const url = isEditing ? `/api/v1/test-catalog/${testToEdit.id}` : '/api/v1/test-catalog';
        const method = isEditing ? 'PUT' : 'POST';

        // Transform panel string back to array
        const panelComponents = data.panelComponentsStr
            ? data.panelComponentsStr.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        const { panelComponentsStr, ...rest } = data;
        const body = {
            ...rest,
            panelComponents,
            ...(isEditing ? { id: testToEdit.id } : {})
        };

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            toast({ title: 'Success', description: `Test ${isEditing ? 'updated' : 'created'} successfully.` });
            onSave();
            onClose();
        } else {
            const errorData = await response.json();
            toast({ variant: 'destructive', title: 'Error', description: errorData.message || 'Failed to save test.' });
        }
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Test' : 'Add New Test'}</DialogTitle>
          <DialogDescription>
            Configure test details, specimen requirements, and reference ranges.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="testCode"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Test Code</FormLabel>
                    <FormControl>
                        <Input placeholder="CBC" {...field} disabled={isEditing} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Test Name</FormLabel>
                    <FormControl>
                        <Input placeholder="Complete Blood Count" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            {/* Specimen Info */}
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                <h3 className="font-medium text-sm">Specimen Requirements</h3>
                <div className="grid grid-cols-3 gap-4">
                     <FormField
                        control={form.control}
                        name="specimenRequirements.tubeType"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tube Type</FormLabel>
                            <FormControl>
                                <Input placeholder="Lavender" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="specimenRequirements.minVolume"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Min Vol</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="specimenRequirements.units"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Units</FormLabel>
                            <FormControl>
                                <Input placeholder="mL" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            {/* Ref Ranges */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">Reference Ranges</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendRange({
                        ageMin: 0, ageMax: 99, gender: 'Any', rangeLow: 0, rangeHigh: 10, units: 'mg/dL'
                    })}>
                        <Plus className="h-3 w-3 mr-1" /> Add Range
                    </Button>
                </div>

                {rangeFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2 border rounded p-2 bg-muted/10">
                         <FormField
                            control={form.control}
                            name={`referenceRanges.${index}.gender`}
                            render={({ field }) => (
                                <FormItem className="w-24">
                                <FormLabel className="text-xs">Gender</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger className="h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="Any">Any</SelectItem>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                                </FormItem>
                            )}
                        />
                        <div className="flex items-center gap-1">
                            <FormField
                                control={form.control}
                                name={`referenceRanges.${index}.rangeLow`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel className="text-xs">Low</FormLabel>
                                    <FormControl><Input className="h-8 w-16" type="number" {...field} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <span className="text-muted-foreground pb-2">-</span>
                            <FormField
                                control={form.control}
                                name={`referenceRanges.${index}.rangeHigh`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel className="text-xs">High</FormLabel>
                                    <FormControl><Input className="h-8 w-16" type="number" {...field} /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                         <FormField
                            control={form.control}
                            name={`referenceRanges.${index}.units`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs">Units</FormLabel>
                                <FormControl><Input className="h-8 w-16" {...field} /></FormControl>
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRange(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                 {rangeFields.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No reference ranges defined.</p>
                )}
            </div>

             {/* Panel Config */}
             <FormField
                control={form.control}
                name="isPanel"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                        <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>
                        Is this a Panel?
                        </FormLabel>
                        <FormDescription>
                        If checked, this test is a container for multiple other tests.
                        </FormDescription>
                    </div>
                    </FormItem>
                )}
                />

             {form.watch('isPanel') && (
                 <FormField
                 control={form.control}
                 name="panelComponentsStr"
                 render={({ field }) => (
                     <FormItem>
                     <FormLabel>Panel Components</FormLabel>
                     <FormControl>
                         <Input placeholder="CBC, BMP, TSH (Comma separated codes)" {...field} />
                     </FormControl>
                     <FormMessage />
                     </FormItem>
                 )}
                 />
             )}

            <div className="pt-4">
                <Button type="submit" className="w-full">{isEditing ? 'Save Changes' : 'Create Test'}</Button>
            </div>
          </form>
        </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
