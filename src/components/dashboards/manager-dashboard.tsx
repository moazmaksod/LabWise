'use client';
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
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { MOCK_REJECTION_DATA, MOCK_TAT_DATA } from '@/lib/constants';
import { IntelligentReporting } from '../intelligent-reporting';

const tatChartConfig = {
  STAT: {
    label: 'STAT (min)',
    color: 'hsl(var(--chart-1))',
  },
  Routine: {
    label: 'Routine (min)',
    color: 'hsl(var(--chart-2))',
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

export default function ManagerDashboard() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder cards for other KPIs */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Instrument Uptime</CardTitle>
            <CardDescription>Past 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">99.2%</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Staff Workload</CardTitle>
            <CardDescription>Samples pending per tech</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">8.4</p>
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
              <LineChart data={MOCK_TAT_DATA}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  dataKey="STAT"
                  type="monotone"
                  stroke="var(--color-STAT)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  dataKey="Routine"
                  type="monotone"
                  stroke="var(--color-Routine)"
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
                      <Bar key={entry.reason} dataKey="count" fill={`var(--color-${entry.reason.replace(/\s/g, '-')})`} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="reason" />} className="-translate-y-2 flex-wrap gap-2" />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      <div>
        <IntelligentReporting />
      </div>
    </div>
  );
}
