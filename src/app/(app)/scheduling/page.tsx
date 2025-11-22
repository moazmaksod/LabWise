
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMinutes } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useToast } from '@/hooks/use-toast';
import { ClientAppointment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type CalendarEvent = {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource: ClientAppointment;
};

export default function SchedulingPage() {
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>(Views.DAY);
  const [date, setDate] = useState(new Date());

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
        const token = localStorage.getItem('labwise-token');
        const response = await fetch(`/api/v1/appointments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data: ClientAppointment[] = await response.json();
            const mappedEvents: CalendarEvent[] = data.map(appt => ({
                id: appt.id,
                title: `${appt.patientInfo?.firstName} ${appt.patientInfo?.lastName} (${appt.appointmentType})`,
                start: new Date(appt.scheduledTime),
                end: addMinutes(new Date(appt.scheduledTime), appt.durationMinutes),
                resource: appt
            }));
            setEvents(mappedEvents);
        }
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load schedule.' });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
      fetchAppointments();
  }, [fetchAppointments]);

  const eventStyleGetter = (event: CalendarEvent) => {
      let backgroundColor = '#3174ad';
      switch(event.resource.status) {
          case 'Scheduled': backgroundColor = '#3b82f6'; break; // blue
          case 'CheckedIn': backgroundColor = '#22c55e'; break; // green
          case 'Completed': backgroundColor = '#6b7280'; break; // gray
          case 'NoShow': backgroundColor = '#ef4444'; break; // red
      }
      return {
          style: {
              backgroundColor,
              borderRadius: '4px',
              opacity: 0.8,
              color: 'white',
              border: '0px',
              display: 'block'
          }
      };
  };

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">Phlebotomy Schedule</h1>
            {loading && <Loader2 className="animate-spin h-6 w-6 text-primary" />}
        </div>

        <Card className="flex-1 flex flex-col">
            <CardContent className="p-4 flex-1">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    view={view}
                    onView={setView}
                    date={date}
                    onNavigate={setDate}
                    eventPropGetter={eventStyleGetter}
                    min={new Date(2024, 1, 1, 7, 0)} // 7 AM
                    max={new Date(2024, 1, 1, 19, 0)} // 7 PM
                    step={15}
                    timeslots={4}
                />
            </CardContent>
        </Card>
    </div>
  );
}
