
'use client';
import InventoryPage from '../inventory/page';

// This page is a simple redirect/alias for the main inventory page
// to satisfy the navigation requirements for the Technician role.
export default function InventorySearchPageAlias() {
    return <InventoryPage />;
}
