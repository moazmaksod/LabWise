
'use client';
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { MOCK_REJECTION_DATA, MOCK_STAFF_WORKLOAD_DATA, MOCK_TAT_DATA } from '@/lib/constants';
import type { ClientInstrument } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { Server, Wrench, CircleOff } from 'lucide-react';

const tatChartConfig = {
  STAT: {
    label: 'STAT (min)',
    color: 'hsl(var(--chart-2))',
  },
  Routine: {
    label: 'Routine (min)',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const rejectionChartConfig = {
  count: {
    label: 'Count',
  },
  Hemolysis: {
    label: 'Hemolysis',
    color: 'hsl(var(--chart-1))',
  },
  QNS: {
    label: 'QNS',
    color: 'hsl(var(--chart-2))',
  },
  Mislabeled: {
    label: 'Mislabeled',
    color: 'hsl(var(--chart-3))',
  },
  'Improper-Container': { // CSS-friendly key
    label: 'Improper Container',
    color: 'hsl(var(--chart-4))',
  },
  Other: {
    label: 'Other',
    color: 'hsl(var(--chart-5))',
  },
} satisfies ChartConfig;

const workloadChartConfig = {
  samples: {
    label: "Samples",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const statusConfig = {
  Online: { icon: Server, color: 'text-green-400' },
  Maintenance: { icon: Wrench, color: 'text-yellow-400' },
  Offline: { icon: CircleOff, color: 'text-red-500' },
};

function InstrumentStatusWidget() {
  const [instruments, setInstruments] = useState<ClientInstrument[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInstruments = async () => {
      try {
        const token = localStorage.getItem('labwise-token');
        const response = await fetch('/api/v1/instruments', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch instruments.');
        const data = await response.json();
        setInstruments(data);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } finally {
        setLoading(false);
      }
    };
    fetchInstruments();
  }, [toast]);
  
  if (loading) {
      return (
          <Card>
            <CardHeader>
                <CardTitle>Instrument Status</CardTitle>
                <CardDescription>Live status of all analyzers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
               <Skeleton className="h-6 w-full" />
               <Skeleton className="h-6 w-full" />
               <Skeleton className="h-6 w-full" />
               <Skeleton className="h-6 w-full" />
            </CardContent>
          </Card>
      )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Instrument Status</CardTitle>
        <CardDescription>Live status of all analyzers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {instruments.map((inst) => {
            const Icon = statusConfig[inst.status]?.icon || Server;
            const colorClass = statusConfig[inst.status]?.color || 'text-muted-foreground';
            return (
                <div key={inst.id} className="flex items-center justify-between">
                    <span className="font-medium">{inst.name}</span>
                    <div className={cn("flex items-center gap-2 text-sm font-semibold", colorClass)}>
                       <Icon className="h-4 w-4" />
                       <span>{inst.status}</span>
                    </div>
                </div>
            );
        })}
      </CardContent>
    </Card>
  );
}


export default function ManagerDashboard() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <InstrumentStatusWidget />
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Staff Workload</CardTitle>
            <CardDescription>Samples pending per tech</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={workloadChartConfig} className="h-[120px] w-full">
              <BarChart accessibilityLayer data={MOCK_STAFF_WORKLOAD_DATA} margin={{ top: 0, right: 0, left: -25, bottom: -10 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} tick={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Bar dataKey="samples" fill="var(--color-samples)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>STAT TAT (avg)</CardTitle>
            <CardDescription>Past 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">28 min</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Rejection Rate</CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">2.1%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Average Turnaround Time (TAT)</CardTitle>
            <CardDescription>Hourly average for STAT vs. Routine</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={tatChartConfig} className="h-[250px] w-full">
              <LineChart data={MOCK_TAT_DATA} margin={{ left: -10, right: 10 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  dataKey="Routine"
                  type="monotone"
                  stroke="var(--color-Routine)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  dataKey="STAT"
                  type="monotone"
                  stroke="var(--color-STAT)"
                  strokeWidth={2}
                  dot={false}
                />
                 <ChartLegend content={<ChartLegendContent />} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Sample Rejection Reasons</CardTitle>
            <CardDescription>Breakdown of rejected samples this month</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={rejectionChartConfig} className="h-[250px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="reason" hideLabel />} />
                <Pie data={MOCK_REJECTION_DATA} dataKey="count" nameKey="reason" innerRadius={60} strokeWidth={5}>
                  {MOCK_REJECTION_DATA.map((entry) => (
                      <Cell key={entry.reason} fill={`var(--color-${entry.reason.replace(/\s/g, '-')})`} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="reason" />} className="-translate-y-2 flex-wrap gap-2" />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
