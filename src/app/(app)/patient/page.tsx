

'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, PlusCircle, Loader2, User, ShieldAlert, FilePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClientPatient } from '@/lib/types';
import { calculateAge } from '@/lib/utils';

function PatientManagementPageComponent() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ClientPatient[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchPatients = useCallback(async (query: string) => {
    if (!token) return;
    setIsSearching(true);
    try {
        const url = query ? `/api/v1/patients?q=${query}` : '/api/v1/patients';
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setSearchResults(data);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not perform patient search.' });
        setSearchResults([]);
    } finally {
        setIsSearching(false);
    }
  }, [token, toast]);

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token) {
        fetchPatients(searchTerm);
    }
  }, [token, fetchPatients, searchTerm]);
  
  if (userLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (user?.role !== 'receptionist' && user?.role !== 'manager' && user?.role !== 'phlebotomist') {
    setTimeout(() => router.push('/dashboard'), 3000);
    return (
        <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
                You do not have permission to access this page. You will be redirected.
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Patients</CardTitle>
          <CardDescription>Search for an existing patient or create a new record.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-grow">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                  type="search"
                  placeholder="Start typing to search by Name, MRN, Phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
            </div>
            <Button asChild>
                <Link href="/patient-registration">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Patient
                </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {searchTerm ? 'Search Results' : 'Recent Patients'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary hover:bg-secondary">
                  <TableHead>Patient</TableHead>
                  <TableHead>MRN</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isSearching ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : searchResults.length > 0 ? (
                  searchResults.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                         <Link href={`/patient-registration?id=${patient.id}`} className="group flex cursor-pointer items-center gap-3">
                           <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><User className="h-5 w-5 text-muted-foreground" /></div>
                           <div className="font-medium group-hover:underline">{patient.firstName} {patient.lastName}</div>
                        </Link>
                      </TableCell>
                      <TableCell>{patient.mrn}</TableCell>
                      <TableCell>{calculateAge(patient.dateOfBirth)}</TableCell>
                      <TableCell>{patient.contactInfo.phone}</TableCell>
                      <TableCell className="text-right">
                         <Button asChild size="sm">
                            <Link href={`/order-entry?patientId=${patient.id}`}>
                                <FilePlus className="mr-2 h-4 w-4" />
                                Create Order
                            </Link>
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                     {searchTerm ? 'No patients found.' : 'No recent patients found.'}
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

export default function PatientManagementPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[calc(100vh-8rem)] w-full" />}>
            <PatientManagementPageComponent />
        </Suspense>
    )
}
    
