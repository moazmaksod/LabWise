
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Flame, Clock, CheckCircle, ArrowDown, ArrowUp, Search, Loader2, Thermometer } from 'lucide-react';
import type { OrderSample } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';

type WorklistItem = {
    sampleId: string;
    accessionNumber: string;
    patientName: string;
    patientMrn: string;
    tests: { name: string, testCode: string }[];
    status: OrderSample['status'];
    priority: 'STAT' | 'Routine';
    receivedTimestamp: string;
    dueTimestamp: string;
};

const statusStyles: Record<string, { row: string; badge: string }> = {
  STAT: {
    row: 'bg-red-900/40 border-l-4 border-red-500 hover:bg-red-900/60',
    badge: 'bg-red-500/20 text-red-200 border-red-500/50',
  },
  Overdue: {
    row: 'bg-yellow-900/40 border-l-4 border-yellow-500 hover:bg-yellow-900/60',
    badge: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/50',
  },
  Routine: {
    row: 'hover:bg-muted/50',
    badge: 'border-transparent bg-secondary text-secondary-foreground',
  },
  InLab: {
    row: '',
    badge: 'border-transparent bg-blue-500/20 text-blue-300 border-blue-400/50',
  },
  Testing: {
    row: '',
    badge: 'border-transparent bg-purple-500/20 text-purple-300 border-purple-400/50',
  },
  AwaitingVerification: {
    row: '',
    badge: 'border-transparent bg-orange-500/20 text-orange-300 border-orange-400/50',
  },
  Verified: {
    row: 'opacity-60',
    badge: 'border-transparent bg-green-500/20 text-green-300',
  },
};

const priorityIcons: Record<string, React.ReactNode> = {
    STAT: <Flame className="h-4 w-4" />,
    Overdue: <Clock className="h-4 w-4" />,
    Routine: <Thermometer className="h-4 w-4" />,
}

type SortKey = keyof WorklistItem | '';

export default function TechnicianDashboard() {
  const [worklist, setWorklist] = useState<WorklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [resultFilter, setResultFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: '', direction: 'ascending' });
  const { toast } = useToast();
  const [token, setToken] = useState<string|null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('labwise-token');
    if (storedToken) setToken(storedToken);
  }, []);

  const fetchWorklist = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
        const response = await fetch('/api/v1/worklist', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[DEBUG-FRONTEND] 3. Fetch failed. Status: ${response.status}. Body:`, errorBody);
            throw new Error(`Failed to fetch worklist. Server responded with status ${response.status}.`);
        }

        const data = await response.json();
        setWorklist(data);
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || "Could not fetch worklist."});
    } finally {
        setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
      if(token) fetchWorklist();
  }, [token, fetchWorklist]);

  const sortedAndFilteredSamples = useMemo(() => {
    let tempSamples = [...worklist];

    // Filter by search term
    if (searchTerm) {
        tempSamples = tempSamples.filter(sample =>
            sample.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sample.accessionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sample.tests.some(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }
    
    // Filter by Priority
    if (priorityFilter !== 'All') {
        tempSamples = tempSamples.filter(sample => {
            const isOverdue = new Date(sample.dueTimestamp) < new Date() && sample.status !== 'Verified';
            if (priorityFilter === 'STAT') return sample.priority === 'STAT';
            if (priorityFilter === 'Overdue') return isOverdue;
            if (priorityFilter === 'Routine') return sample.priority !== 'STAT' && !isOverdue;
            return true;
        });
    }

    // Filter by Result Status
    if (resultFilter !== 'All') {
        tempSamples = tempSamples.filter(sample => sample.status === resultFilter);
    }

    // Sort data
    if (sortConfig.key) {
        tempSamples.sort((a, b) => {
            const aVal = a[sortConfig.key as keyof WorklistItem];
            const bVal = b[sortConfig.key as keyof WorklistItem];
            if (aVal < bVal) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aVal > bVal) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }

    return tempSamples;
  }, [searchTerm, priorityFilter, resultFilter, sortConfig, worklist]);
  
  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
    }
    return null;
  };
  
  type HeaderKey = { label: string; key: SortKey; };
  const headers: HeaderKey[] = [
      { label: 'Accession #', key: 'accessionNumber' },
      { label: 'Patient', key: 'patientName' },
      { label: 'Test(s)', key: 'tests' },
      { label: 'Priority', key: 'priority' },
      { label: 'Sample Status', key: 'status' },
      { label: 'Received', key: 'receivedTimestamp' },
      { label: 'Due', key: 'dueTimestamp' },
  ];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Technician Worklist</CardTitle>
        <CardDescription>
          Real-time, prioritized list of samples for processing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-grow w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by name, accession, or test..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
            <div className="flex w-full md:w-auto items-center gap-2">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="flex-1 md:w-[150px]">
                        <SelectValue placeholder="Filter by priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Priorities</SelectItem>
                        <SelectItem value="STAT">STAT</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                        <SelectItem value="Routine">Routine</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={resultFilter} onValueChange={setResultFilter}>
                    <SelectTrigger className="flex-1 md:w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Statuses</SelectItem>
                        <SelectItem value="InLab">In Lab</SelectItem>
                        <SelectItem value="Testing">Testing</SelectItem>
                        <SelectItem value="AwaitingVerification">Awaiting Verification</SelectItem>
                        <SelectItem value="Verified">Verified</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary hover:bg-secondary">
                {headers.map(({label, key}) => (
                    <TableHead key={key}>
                        <Button variant="ghost" onClick={() => requestSort(key)} className="px-2 py-1 h-auto">
                            {label}
                            <span className="ml-2">{getSortIndicator(key)}</span>
                        </Button>
                    </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({length: 5}).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> <span>Loading worklist...</span></div></TableCell></TableRow>
                ))
              ) : sortedAndFilteredSamples.length > 0 ? (
                sortedAndFilteredSamples.map((sample) => {
                  const isOverdue = new Date(sample.dueTimestamp) < new Date() && sample.status !== 'Verified';
                  let priorityStatus;
                  if (sample.priority === 'STAT') {
                    priorityStatus = 'STAT';
                  } else if (isOverdue) {
                    priorityStatus = 'Overdue';
                  } else {
                    priorityStatus = 'Routine';
                  }

                  return (
                    <TableRow
                      key={sample.sampleId}
                      className={cn('cursor-pointer font-medium', (statusStyles as any)[priorityStatus]?.row, statusStyles.Verified.row)}
                      onClick={() => router.push(`/results/${sample.accessionNumber}`)}
                    >
                      <TableCell className="font-mono">{sample.accessionNumber}</TableCell>
                      <TableCell>
                        <div>{sample.patientName}</div>
                        <div className="text-sm text-muted-foreground">{`MRN: ${sample.patientMrn}`}</div>
                      </TableCell>
                      <TableCell>{sample.tests.map(t => t.name).join(', ')}</TableCell>
                      <TableCell>
                         <Badge variant="outline" className={cn('gap-1.5 font-semibold', (statusStyles as any)[priorityStatus]?.badge)}>
                           {priorityIcons[priorityStatus]}
                           {priorityStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                         <Badge variant="outline" className={cn('gap-1.5 font-semibold', (statusStyles as any)[sample.status]?.badge)}>
                          {sample.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(parseISO(sample.receivedTimestamp), 'p')}</TableCell>
                      <TableCell className={cn(isOverdue && 'text-yellow-400 font-semibold')}>
                        {format(parseISO(sample.dueTimestamp), 'p')}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow><TableCell colSpan={7} className="text-center h-24">No samples in the worklist match your criteria.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
