
'use client';
import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, ClipboardPlus, PlusCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import PatientPage from '@/app/(app)/patient/page';
import OrdersPage from '@/app/(app)/orders/page';
import { Skeleton } from '@/components/ui/skeleton';


export default function ReceptionistDashboard() {
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  return (
    <div className="space-y-8">
        <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight">Receptionist Dashboard</h1>
            <p className="text-lg text-muted-foreground">Your central hub for patient and order management.</p>
        </div>
         <div className="grid gap-8 md:grid-cols-2">
            <Card className="shadow-lg hover:shadow-primary/20 transition-shadow flex flex-col">
                <CardHeader className="flex-grow">
                    <CardTitle className="flex items-center gap-2"><User className="h-6 w-6" /> Patient Management</CardTitle>
                    <CardDescription>Search, register, and update patient records.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Dialog open={isPatientDialogOpen} onOpenChange={setIsPatientDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Create Patient
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl min-h-[80vh]">
                             <Suspense fallback={<Skeleton className="h-full w-full" />}>
                               <PatientPage />
                             </Suspense>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
            <Card className="shadow-lg hover:shadow-primary/20 transition-shadow flex flex-col">
                <CardHeader className="flex-grow">
                    <CardTitle className="flex items-center gap-2"><ClipboardPlus className="h-6 w-6" /> Order Management</CardTitle>
                    <CardDescription>Create new orders for patients.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                         <DialogTrigger asChild>
                            <Button className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Create Order
                            </Button>
                         </DialogTrigger>
                         <DialogContent className="max-w-4xl min-h-[80vh]">
                            <Suspense fallback={<Skeleton className="h-full w-full" />}>
                               <OrdersPage />
                            </Suspense>
                         </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
         </div>
    </div>
  );
}
