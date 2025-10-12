
'use client';

import { useState, useMemo } from 'react';
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
import { cn } from '@/lib/utils';
import { MOCK_WORKLIST_SAMPLES } from '@/lib/constants';
import { Flame, Clock, CheckCircle, ArrowDown, ArrowUp, Search } from 'lucide-react';
import type { Sample } from '@/lib/types';

const statusStyles: Record<Sample['status'], { row: string; badge: string }> = {
  STAT: {
    row: 'bg-red-900/40 border-l-4 border-red-500 hover:bg-red-900/60',
    badge: 'bg-red-500/20 text-red-100 border-red-500/50',
  },
  Overdue: {
    row: 'bg-yellow-900/40 border-l-4 border-yellow-500 hover:bg-yellow-900/60',
    badge: 'bg-yellow-500/20 text-yellow-100 border-yellow-500/50',
  },
  Routine: {
    row: 'hover:bg-muted/50', // Default hover
    badge: 'border-transparent bg-secondary text-secondary-foreground',
  },
  Complete: {
    row: 'opacity-60 hover:bg-muted/50',
    badge: 'border-transparent bg-green-500/20 text-green-200',
  },
};

const statusIcons: Record<Sample['status'], React.ReactNode> = {
    STAT: <Flame className="h-4 w-4" />,
    Overdue: <Clock className="h-4 w-4" />,
    Routine: null,
    Complete: <CheckCircle className="h-4 w-4" />,
}

type SortKey = keyof Sample | '';

export default function TechnicianDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: '', direction: 'ascending' });

  const sortedAndFilteredSamples = useMemo(() => {
    let filterableSamples = [...MOCK_WORKLIST_SAMPLES];

    // Filter by search term
    if (searchTerm) {
        filterableSamples = filterableSamples.filter(sample =>
            sample.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sample.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sample.test.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    // Filter by status
    if (statusFilter !== 'All') {
        filterableSamples = filterableSamples.filter(sample => sample.status === statusFilter);
    }

    // Sort data
    if (sortConfig.key) {
        filterableSamples.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    } else {
         // Default sort
        const statusOrder = { STAT: 1, Overdue: 2, Routine: 3, Complete: 4 };
        filterableSamples.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    }

    return filterableSamples;
  }, [searchTerm, statusFilter, sortConfig]);
  
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
  
  type HeaderKey = { label: string, key: SortKey };
  const headers: HeaderKey[] = [
      { label: 'Accession #', key: 'id' },
      { label: 'Patient', key: 'patientName' },
      { label: 'Test(s)', key: 'test' },
      { label: 'Status', key: 'status' },
      { label: 'Received', key: 'received' },
      { label: 'Due', key: 'due' },
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
        <div className="flex items-center gap-4">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by name, accession, or test..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="STAT">STAT</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                    <SelectItem value="Routine">Routine</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                </SelectContent>
            </Select>
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
              {sortedAndFilteredSamples.map((sample) => (
                <TableRow
                  key={sample.id}
                  className={cn('cursor-pointer font-medium', statusStyles[sample.status].row)}
                >
                  <TableCell className="font-mono">{sample.id}</TableCell>
                  <TableCell>
                    <div>{sample.patientName}</div>
                    <div className="text-sm text-muted-foreground">{`ID: ${sample.patientId}`}</div>
                  </TableCell>
                  <TableCell>{sample.test}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('gap-1.5 font-semibold', statusStyles[sample.status].badge)}>
                      {statusIcons[sample.status]}
                      {sample.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{sample.received}</TableCell>
                  <TableCell>{sample.due}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
