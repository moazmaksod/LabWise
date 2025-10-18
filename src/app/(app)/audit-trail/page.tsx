
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { FileSearch, Search, Loader2, User, Clock, HardDrive, ShieldAlert, FileText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ClientAuditLog } from '@/lib/types';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<ClientAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const fetchAuditLogs = useCallback(async (query: string) => {
    if (!query) {
      setLogs([]);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('labwise-token');
      const response = await fetch(`/api/v1/audit-logs?entityId=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch audit logs.');
      const data = await response.json();
      setLogs(data);
      if (data.length === 0) {
        toast({
          variant: 'default',
          title: 'No Logs Found',
          description: `No audit trail found for query: "${query}"`,
        });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleSearch = () => {
    fetchAuditLogs(searchTerm);
  };
  
  if (userLoading) return <Skeleton className="h-96 w-full" />;

  if (user?.role !== 'manager') {
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
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>
            Search for an Accession Number or Patient MRN to view its complete, end-to-end audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter Accession # or Patient MRN..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : logs.length > 0 ? (
            logs.map(log => (
                <Card key={log.id} className="bg-secondary/50">
                    <CardHeader className="p-4 flex flex-row items-center justify-between">
                       <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background"><FileText className="h-5 w-5" /></div>
                            <div>
                                <CardTitle className="text-base">{log.action.replace(/_/g, ' ')}</CardTitle>
                                <CardDescription>{log.details.message}</CardDescription>
                            </div>
                       </div>
                       <div className="text-right text-xs text-muted-foreground">
                            <p className="flex items-center gap-1 justify-end"><Clock className="h-3 w-3" /> {format(new Date(log.timestamp), 'PPpp')}</p>
                            <p className="flex items-center gap-1 justify-end"><User className="h-3 w-3" /> {log.user.name}</p>
                       </div>
                    </CardHeader>
                </Card>
            ))
        ) : (
             <div className="text-center text-muted-foreground py-16">
                <p>Please enter a valid Accession # or Patient MRN to begin.</p>
            </div>
        )}
      </div>
    </div>
  );
}
