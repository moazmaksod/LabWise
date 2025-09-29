import type { ObjectId } from 'mongodb';

export type Role = 'receptionist' | 'technician' | 'manager' | 'physician' | 'patient';

export type TrainingRecord = {
  documentName: string;
  completionDate: Date;
  expiryDate: Date;
  uploadedFileUrl: string;
};

export type PhysicianInfo = {
  npiNumber: string;
  clinicName: string;
  contactPhone: string;
};

export type User = {
  _id: ObjectId;
  firstName: string;
  lastName:string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  trainingRecords?: TrainingRecord[];
  physicianInfo?: PhysicianInfo;
  avatar?: string;
};

// This is a client-safe version of the User object
export type ClientUser = Omit<User, 'passwordHash' | '_id'> & {
  id: string;
};

export type Sample = {
  id: string;
  patientName: string;
  patientId: string;
  test: string;
  status: 'STAT' | 'Overdue' | 'Routine' | 'Complete';
  received: string;
  due: string;
};

// --- Sprint 1 Additions ---

export type SpecimenRequirements = {
  tubeType: string;
  minVolume: number;
  units: string;
  specialHandling: string;
};

export type ReferenceRange = {
  ageMin: number;
  ageMax: number;
  gender: 'Male' | 'Female' | 'Any';
  rangeLow: number;
  rangeHigh: number;
  units: string;
};

export type ReflexRule = {
  condition: {
    testCode: string;
    operator: 'gt' | 'lt' | 'eq';
    value: number;
  };
  action: {
    addTestCode: string;
  };
};

export type TestCatalogItem = {
  _id: ObjectId;
  testCode: string;
  name: string;
  description: string;
  specimenRequirements: SpecimenRequirements;
  turnaroundTime: {
    value: number;
    units: 'hours' | 'days';
  };
  price: number; // Using number for simplicity; Decimal128 in production
  isPanel: boolean;
  panelComponents: string[];
  referenceRanges: ReferenceRange[];
  reflexRules: ReflexRule[];
  isActive: boolean;
};

export type ClientTestCatalogItem = Omit<TestCatalogItem, '_id'> & {
  id: string;
};

// --- Sprint 2 Additions ---
export type Patient = {
    _id: ObjectId;
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    contactInfo: {
        phone: string;
        email?: string;
        address: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
        };
    };
    insuranceInfo?: {
        providerName: string;
        policyNumber: string;
        groupNumber?: string;
        isPrimary: boolean;
    }[];
    createdAt: Date;
    updatedAt: Date;
};

export type ClientPatient = Omit<Patient, '_id'> & {
    id: string;
};
