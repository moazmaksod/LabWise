

import type { LucideIcon } from 'lucide-react';
import { 
  UserPlus, 
  FilePlus, 
  CalendarDays, 
  ClipboardList, 
  LayoutDashboard, 
  Beaker, 
  ShieldCheck, 
  Wrench, 
  Search, 
  AreaChart, 
  BarChart, 
  Boxes, 
  FileCheck, 
  Users, 
  ClipboardCopy,
  FlaskConical,
  FileSearch,
  ClipboardPlus,
  Droplets,
} from 'lucide-react';
import type { Role, ClientUser, Sample } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const now = new Date();

export const USERS: Record<string, Omit<ClientUser, 'id'>> = {
  'user-rec-01': {
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'sarah.chen@labwise.com',
    role: 'receptionist',
    avatar: PlaceHolderImages.find(img => img.id === 'receptionist-avatar')?.imageUrl || '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  'user-tech-01': {
    firstName: 'David',
    lastName: 'Rodriguez',
    email: 'david.r@labwise.com',
    role: 'technician',
    avatar: PlaceHolderImages.find(img => img.id === 'technician-avatar')?.imageUrl || '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  'user-mgr-01': {
    firstName: 'Emily',
    lastName: 'Jones',
    email: 'emily.jones@labwise.com',
    role: 'manager',
    avatar: PlaceHolderImages.find(img => img.id === 'manager-avatar')?.imageUrl || '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  'user-phy-01': {
    firstName: 'Dr. Michael',
    lastName: 'Smith',
    email: 'msmith@clinic.com',
    role: 'physician',
    avatar: PlaceHolderImages.find(img => img.id === 'physician-avatar')?.imageUrl || '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  'user-pat-01': {
    firstName: 'John',
    lastName: 'Doe',
    email: 'johndoe@email.com',
    role: 'patient',
    avatar: PlaceHolderImages.find(img => img.id === 'patient-avatar')?.imageUrl || '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  'user-phleb-01': {
    firstName: 'Charles',
    lastName: 'Brown',
    email: 'charles.b@labwise.com',
    role: 'phlebotomist',
    avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }
};


type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  receptionist: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/patient-management', label: 'Patients', icon: Users },
    { href: '/orders', label: 'Orders', icon: ClipboardPlus },
    { href: '/scheduling', label: 'Consultations', icon: CalendarDays },
    { href: '/collection-list', label: 'Collection List', icon: Droplets },
  ],
  technician: [
    { href: '/dashboard', label: 'Worklist', icon: ClipboardList },
    { href: '/accessioning', label: 'Accessioning', icon: Beaker },
    { href: '/quality-control', label: 'Quality Control', icon: ShieldCheck },
    { href: '/instruments', label: 'Instruments', icon: Wrench },
    { href: '/inventory-search', label: 'Inventory Search', icon: Search },
  ],
  manager: [
    { href: '/dashboard', label: 'KPI Dashboard', icon: AreaChart },
    { href: '/user-management', label: 'User Management', icon: Users },
    { href: '/patient-management', label: 'Patients', icon: Users },
    { href: '/orders', label: 'Orders', icon: ClipboardPlus },
    { href: '/test-catalog', label: 'Test Catalog', icon: FlaskConical },
    { href: '/reports', label: 'Reports & Analytics', icon: BarChart },
    { href: '/inventory', label: 'Inventory Mgmt', icon: Boxes },
    { href: '/quality-assurance', label: 'Quality Assurance', icon: FileCheck },
    { href: '/audit-trail', label: 'Audit Trail', icon: ClipboardCopy },
  ],
  phlebotomist: [
    { href: '/dashboard', label: 'Collection List', icon: Droplets },
  ],
  physician: [],
  patient: [],
};


export const MOCK_WORKLIST_SAMPLES: Sample[] = [
  { id: 'ACC-001', patientName: 'Robert Johnson', patientId: 'P00123', test: 'CBC, BMP', status: 'STAT', received: '08:05 AM', due: '09:05 AM' },
  { id: 'ACC-002', patientName: 'Maria Garcia', patientId: 'P00456', test: 'TSH', status: 'Overdue', received: '07:30 AM', due: '08:30 AM' },
  { id: 'ACC-003', patientName: 'James White', patientId: 'P00789', test: 'Lipid Panel', status: 'Routine', received: '08:15 AM', due: '12:15 PM' },
  { id: 'ACC-004', patientName: 'Patricia Martinez', patientId: 'P00112', test: 'HgbA1c', status: 'Routine', received: '08:20 AM', due: '12:20 PM' },
  { id: 'ACC-005', patientName: 'Linda Harris', patientId: 'P00334', test: 'PT/INR', status: 'Complete', received: '08:00 AM', due: '09:00 AM' },
  { id: 'ACC-006', patientName: 'Michael Brown', patientId: 'P00556', test: 'CMP', status: 'Routine', received: '08:30 AM', due: '12:30 PM' },
  { id: 'ACC-007', patientName: 'Barbara Wilson', patientId: 'P00778', test: 'PSA', status: 'Routine', received: '08:45 AM', due: '12:45 PM' },
];

export const MOCK_APPOINTMENTS = [
  { time: '09:00 AM', patient: 'John Smith', status: 'Completed' },
  { time: '09:15 AM', patient: 'Jane Doe', status: 'Completed' },
  { time: '09:30 AM', patient: 'Peter Jones', status: 'Arrived/Checked-in' },
  { time: '09:45 AM', patient: 'Mary Williams', status: 'Scheduled' },
  { time: '10:00 AM', patient: 'David Taylor', status: 'Scheduled' },
  { time: '10:15 AM', patient: 'Susan Miller', status: 'Scheduled' },
  { time: '10:30 AM', patient: 'Walk-in Slot', status: 'Open' },
];

export const MOCK_TAT_DATA = [
  { hour: '08:00', STAT: 25, Routine: 120 },
  { hour: '09:00', STAT: 28, Routine: 125 },
  { hour: '10:00', STAT: 22, Routine: 118 },
  { hour: '11:00', STAT: 35, Routine: 130 },
  { hour: '12:00', STAT: 30, Routine: 122 },
  { hour: '13:00', STAT: 27, Routine: 128 },
];

export const MOCK_REJECTION_DATA = [
  { reason: 'Hemolysis', count: 40 },
  { reason: 'QNS', count: 30 },
  { reason: 'Mislabeled', count: 15 },
  { reason: 'Improper Container', count: 10 },
  { reason: 'Other', count: 5 },
];
