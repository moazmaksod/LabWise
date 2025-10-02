
'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, ClipboardPlus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';
import type { ClientPatient } from '@/lib/types';


export default function ReceptionistDashboard() {
  const router = useRouter();

  return (
    <div className="space-y-8">
        <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight">Receptionist Dashboard</h1>
            <p className="text-lg text-muted-foreground">Your central hub for patient and order management.</p>
        </div>
         <div className="grid gap-8 md:grid-cols-2">
            <Card className="shadow-lg hover:shadow-primary/20 transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User className="h-6 w-6" /> Patient Management</CardTitle>
                    <CardDescription>Search, register, and update patient records.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full" asChild>
                        <Link href="/patient">Go to Patients</Link>
                    </Button>
                </CardContent>
            </Card>
            <Card className="shadow-lg hover:shadow-primary/20 transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ClipboardPlus className="h-6 w-6" /> Order Management</CardTitle>
                    <CardDescription>Create new orders for patients.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button className="w-full" asChild>
                        <Link href="/orders">Go to Orders</Link>
                    </Button>
                </CardContent>
            </Card>
         </div>
    </div>
  );
}
