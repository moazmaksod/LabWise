
'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ClientAppointment } from '@/lib/types';

export default function SchedulingPage() {
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('labwise-token');
        if (!token) throw new Error("Authentication token not found.");
        
        const response = await fetch('/api/v1/appointments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch appointments');
        
        const data = await response.json();
        setAppointments(data);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [toast]);

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appointment Scheduling</h1>
            <p className="text-muted-foreground">Manage phlebotomy appointments and walk-ins for today.</p>
          </div>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Today's Appointments</CardTitle>
          <CardDescription>A list of scheduled, active, and completed appointments for today.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              Array.from({length: 7}).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : appointments.length > 0 ? (
              appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground md:text-base">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(appt.scheduledTime), 'hh:mm a')}</span>
                  </div>
                  <div className="flex-1 font-medium">{appt.patientInfo?.firstName} {appt.patientInfo?.lastName || 'Walk-in'}</div>
                  <div className="text-sm text-muted-foreground hidden md:block">
                      MRN: {appt.patientInfo?.mrn || 'N/A'}
                  </div>
                  <div>
                    <Badge
                      variant={
                        appt.status === 'Completed'
                          ? 'secondary'
                          : appt.status === 'CheckedIn'
                          ? 'default'
                          : appt.status === 'NoShow'
                          ? 'destructive'
                          : 'outline'
                      }
                      className={cn(
                        'text-xs md:text-sm',
                        appt.status === 'Scheduled' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
                        appt.status === 'CheckedIn' && 'bg-accent text-accent-foreground',
                      )}
                    >
                      {appt.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
                <div className="flex h-48 items-center justify-center text-muted-foreground">
                    No appointments scheduled for today.
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
