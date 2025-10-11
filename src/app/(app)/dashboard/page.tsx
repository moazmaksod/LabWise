
'use client';
import { useUser } from '@/hooks/use-user';
import ManagerDashboard from '@/components/dashboards/manager-dashboard';
import ReceptionistDashboard from '@/components/dashboards/receptionist-dashboard';
import TechnicianDashboard from '@/components/dashboards/technician-dashboard';
import CollectionListPage from '../collection-list/page';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!user) return null;

  // The Phlebotomist role will now show the Collection List page directly
  if (user.role === 'phlebotomist') {
    return <CollectionListPage />;
  }

  switch (user.role) {
    case 'manager':
      return <ManagerDashboard />;
    case 'receptionist':
      return <ReceptionistDashboard />;
    case 'technician':
      return <TechnicianDashboard />;
    default:
      return (
        <div className="flex h-[calc(100vh-10rem)] items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
                <h2 className="text-2xl font-bold">Welcome, {user.firstName}!</h2>
                <p className="text-muted-foreground">Your dashboard is under construction.</p>
            </div>
        </div>
      )
  }
}
