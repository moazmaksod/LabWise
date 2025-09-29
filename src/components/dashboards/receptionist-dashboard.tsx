'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MOCK_APPOINTMENTS } from '@/lib/constants';
import { SmartDataEntry } from '../smart-data-entry';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

export default function ReceptionistDashboard() {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="h-full shadow-lg">
          <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
            <CardDescription>
              Manage phlebotomy appointments and walk-ins.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {MOCK_APPOINTMENTS.map((appt, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{appt.time}</span>
                  </div>
                  <div className="flex-1 font-medium">{appt.patient}</div>
                  <div>
                    <Badge
                      variant={
                        appt.status === 'Completed'
                          ? 'secondary'
                          : appt.status === 'Arrived/Checked-in'
                          ? 'default'
                          : appt.status === 'Open'
                          ? 'outline'
                          : 'default'
                      }
                      className={cn(
                        appt.status === 'Scheduled' && 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                        appt.status === 'Arrived/Checked-in' && 'bg-accent text-accent-foreground',
                      )}
                    >
                      {appt.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <SmartDataEntry />
      </div>
    </div>
  );
}
