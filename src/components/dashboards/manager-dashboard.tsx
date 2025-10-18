'use client';
import { useState, useEffect, useCallback } from 'react';
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
import type { ClientInstrument } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { Server, Wrench, CircleOff, Loader2, ServerCrash, AlertTriangle } from 'lucide-react';

/**
 * Chart Color Palette Definition
 * These variables define the actual color values for charts across the application.
 * They are mapped to specific data points within component files (e.g., manager-dashboard.tsx).
 * The actual color values are defined in `src/app/globals.css`.
 */
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
  'Improper Container': {
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

type KpiData = {
    averageTat: { stat: number; routine: number };
    rejectionRate: number;
    instrumentUptime: number;
    staffWorkload: number;
    tatHistory: { hour: string; Routine: number; STAT: number }[];
    rejectionReasons: { reason: string; count: number }[];
    workloadDistribution: { name: string; samples: number }[];
}

function InstrumentStatusWidget() {
  const [instruments, setInstruments] = useState<ClientInstrument[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    const fetchInstruments = async () => {
      try {
        const token = localStorage.getItem('labwise-token');
        const response = await fetch('/api/v1/instruments', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch instruments.');
        const data = await response.json();
        if (isMounted) {
          setInstruments(data);
        }
      } catch (error: any) {
         if (isMounted) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
         }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchInstruments();

    return () => { isMounted = false; };
  }, [toast]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Instrument Status</CardTitle>
        <CardDescription>Live status of all analyzers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
             <div className="space-y-3">
               <Skeleton className="h-6 w-full" />
               <Skeleton className="h-6 w-full" />
               <Skeleton className="h-6 w-full" />
             </div>
        ) : instruments.length > 0 ? (
            instruments.map((inst) => {
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
            })
        ) : (
            <div className="text-sm text-muted-foreground text-center flex flex-col items-center justify-center h-full py-4">
                <ServerCrash className="h-8 w-8 mb-2" />
                No instruments found.
            </div>
        )}
      </CardContent>
    </Card>
  );
}


export default function ManagerDashboard() {
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchKpiData = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    }
    let isMounted = true;
    try {
      const token = localStorage.getItem('labwise-token');
      const response = await fetch('/api/v1/reports/kpi', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch KPI data.');
      const data = await response.json();
      if (isMounted) {
        setKpiData(data);
      }
    } catch (error: any) {
      if (isMounted) {
        toast({ variant: 'destructive', title: 'Dashboard Error', description: error.message });
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
    return () => { isMounted = false; }
  }, [toast]);

  useEffect(() => {
    fetchKpiData(true); // Initial fetch
    const interval = setInterval(() => fetchKpiData(false), 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchKpiData]);
  
  function getRejectionColor(reason: string): string {
    const configKey = reason as keyof typeof rejectionChartConfig;
    if (rejectionChartConfig[configKey] && 'color' in rejectionChartConfig[configKey]) {
      return rejectionChartConfig[configKey].color as string;
    }
    return 'hsl(var(--muted))';
  }

  const rejectionChartData = kpiData?.rejectionReasons.map(item => ({
    name: item.reason,
    count: item.count,
    fill: getRejectionColor(item.reason),
  })) || [];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!kpiData) {
    return (
        <Card className="shadow-lg col-span-full">
             <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle/> Data Load Failed
                </CardTitle>
             </CardHeader>
            <CardContent className="text-center text-muted-foreground">
                <p>Failed to load essential KPI data for the dashboard.</p>
                <p>Please try refreshing the page or contact support.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>STAT TAT (avg)</CardTitle>
            <CardDescription>Past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{kpiData?.averageTat.stat || 0} min</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Routine TAT (avg)</CardTitle>
            <CardDescription>Past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{kpiData?.averageTat.routine || 0} min</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Rejection Rate</CardTitle>
            <CardDescription>Past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{kpiData?.rejectionRate || 0}%</p>
          </CardContent>
        </Card>
         <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Instrument Uptime</CardTitle>
            <CardDescription>Live Status</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{kpiData?.instrumentUptime || 100}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Average Turnaround Time (TAT)</CardTitle>
            <CardDescription>Hourly average for STAT vs. Routine</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ChartContainer config={tatChartConfig} className="h-[250px] min-w-[400px]">
              <LineChart data={kpiData.tatHistory} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="Routine" type="monotone" stroke={tatChartConfig.Routine.color} strokeWidth={2} dot={false} />
                  <Line dataKey="STAT" type="monotone" stroke={tatChartConfig.STAT.color} strokeWidth={2} dot={false} />
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
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <Pie data={rejectionChartData} dataKey="count" nameKey="name" innerRadius={60} strokeWidth={5}>
                {rejectionChartData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="name" />} className="-translate-y-2 flex-wrap gap-2 justify-center" />
            </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <InstrumentStatusWidget />
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Staff Workload</CardTitle>
            <CardDescription>Samples pending per tech</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ChartContainer config={workloadChartConfig} className="h-[120px] min-w-[300px]">
            <BarChart accessibilityLayer data={kpiData.workloadDistribution} margin={{ top: 0, right: 0, left: -25, bottom: -10 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} tick={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                <Bar dataKey="samples" fill="var(--color-samples)" radius={4} />
            </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
