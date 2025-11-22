
'use client';

import { useState } from 'react';
import { Search, Plus, UserPlus, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useUser } from '@/context/user-context';
import { useToast } from '@/hooks/use-toast';
import { ClientPatient } from '@/lib/types';
import { PatientRegistrationForm } from '@/components/patients/PatientRegistrationForm';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';

export default function PatientRegistrationPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<ClientPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const token = localStorage.getItem('labwise-token');
      const response = await fetch(`/api/v1/patients?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to search patients.' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleSearch();
      }
  }

  const openRegistration = () => {
      setIsRegistrationOpen(true);
  }

  const handleRegistrationSuccess = (newPatient: ClientPatient) => {
      setIsRegistrationOpen(false);
      setPatients([newPatient]); // Show the newly created patient
      setHasSearched(true);
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pt-8">
      <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-primary">Patient Registration</h1>
          <p className="text-lg text-muted-foreground">Search for an existing patient or register a new one.</p>
      </div>

      <Card className="border-2 border-primary/10 shadow-lg">
        <CardHeader>
            <CardTitle className="text-xl">Find Patient</CardTitle>
            <CardDescription>Search by MRN, Name, or Phone Number</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                        className="pl-10 h-11 text-lg"
                        placeholder="e.g., P000123, John Doe, 555-0123"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                <Button size="lg" className="h-11 px-8" onClick={handleSearch} disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </Button>
            </div>
        </CardContent>
      </Card>

      {hasSearched && (
          <div className="space-y-4 animate-accordion-down">
              <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Search Results</h2>
                  <Button variant="outline" onClick={openRegistration}>
                      <UserPlus className="mr-2 h-4 w-4" /> Create New Patient
                  </Button>
              </div>

              <div className="rounded-md border bg-card shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>MRN</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>DOB</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {patients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    No patients found matching "{searchQuery}".
                                    <br />
                                    <Button variant="link" onClick={openRegistration} className="mt-2">
                                        Click here to register a new patient.
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : (
                            patients.map((patient) => (
                                <TableRow key={patient.id}>
                                    <TableCell className="font-mono font-medium text-primary">{patient.mrn}</TableCell>
                                    <TableCell className="font-medium">{patient.firstName} {patient.lastName}</TableCell>
                                    <TableCell>{format(new Date(patient.dateOfBirth), 'MMM d, yyyy')}</TableCell>
                                    <TableCell>{patient.contactInfo.phone}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="secondary" size="sm">Select</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
              </div>
          </div>
      )}

      <Dialog open={isRegistrationOpen} onOpenChange={setIsRegistrationOpen}>
        <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                New Patient Registration
            </DialogTitle>
            <DialogDescription>
                Enter the patient's details manually or scan their ID card.
            </DialogDescription>
            </DialogHeader>

            <PatientRegistrationForm onSuccess={handleRegistrationSuccess} />

        </DialogContent>
       </Dialog>
    </div>
  );
}
