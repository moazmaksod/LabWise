
'use client';

import { useState, useEffect } from 'react';
import { Search, ShieldCheck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filterAction, setFilterAction] = useState('All');

  const fetchLogs = async () => {
      const token = localStorage.getItem('labwise-token');
      const res = await fetch(`/api/v1/audit-logs?action=${filterAction}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if(res.ok) setLogs(await res.json());
  };

  useEffect(() => { fetchLogs(); }, [filterAction]);

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <ShieldCheck className="h-8 w-8" /> Audit Trail
        </h1>

        <div className="flex gap-4">
            <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by Action" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Actions</SelectItem>
                    <SelectItem value="USER_LOGIN">User Login</SelectItem>
                    <SelectItem value="PATIENT_CREATE">Patient Created</SelectItem>
                    <SelectItem value="ORDER_CREATE">Order Created</SelectItem>
                    <SelectItem value="RESULTS_VERIFIED">Results Verified</SelectItem>
                </SelectContent>
            </Select>
            <Button onClick={fetchLogs}>Refresh Logs</Button>
        </div>

        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>IP Address</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.map((log) => (
                        <TableRow key={log.id}>
                            <TableCell className="font-mono text-xs">{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                            <TableCell>
                                <div className="font-medium">{log.user.name}</div>
                                <div className="text-xs text-muted-foreground capitalize">{log.user.role}</div>
                            </TableCell>
                            <TableCell><BadgeAction action={log.action} /></TableCell>
                            <TableCell className="max-w-[300px] truncate text-sm" title={JSON.stringify(log.details)}>
                                {log.details.message || JSON.stringify(log.details)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{log.ipAddress}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </div>
  );
}

function BadgeAction({ action }: { action: string }) {
    let color = 'bg-gray-100 text-gray-800';
    if (action.includes('CREATE')) color = 'bg-green-100 text-green-800';
    if (action.includes('LOGIN')) color = 'bg-blue-100 text-blue-800';
    if (action.includes('VERIFIED')) color = 'bg-purple-100 text-purple-800';

    return (
        <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>
            {action}
        </span>
    );
}
