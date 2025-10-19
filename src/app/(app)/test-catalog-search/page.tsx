
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Search, FlaskConical, Beaker, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClientTestCatalogItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function TestCatalogSearchPage() {
  const [tests, setTests] = useState<ClientTestCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchTests = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('labwise-token');
      if (!token) throw new Error('Authentication required.');
      
      const url = query ? `/api/v1/test-catalog?q=${query}` : '/api/v1/test-catalog';
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch test catalog.');
      const data = await response.json();
      setTests(data);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const debounce = setTimeout(() => {
        fetchTests(searchTerm);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, fetchTests]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Online Test Catalog</CardTitle>
          <CardDescription>
            Search for tests to view descriptions, specimen requirements, and turnaround times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by test name or code..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
        ) : tests.length > 0 ? (
          tests.map((test) => (
            <Card key={test.id} className="shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{test.name}</CardTitle>
                    <Badge variant="outline" className="font-mono">{test.testCode}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{test.description || 'No description available.'}</p>
                <div className="text-sm space-y-2 pt-2 border-t">
                    <div className="flex items-center gap-2">
                        <Beaker className="h-4 w-4 text-primary" />
                        <strong>Specimen:</strong> {test.specimenRequirements.tubeType} ({test.specimenRequirements.minVolume}{test.specimenRequirements.units})
                    </div>
                     <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <strong>Turnaround:</strong> ~{test.turnaroundTime.value} {test.turnaroundTime.units}
                    </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="md:col-span-2 text-center text-muted-foreground py-16">
            <FlaskConical className="mx-auto h-12 w-12" />
            <p className="mt-4">No tests found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
