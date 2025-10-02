

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
  specialHandling?: string;
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
  description?: string;
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

// --- Sprint 3 Additions ---
export type OrderTest = {
    testCode: string; // Snapshotted
    name: string;     // Snapshotted
    status: 'Pending' | 'In Progress' | 'AwaitingVerification' | 'Verified' | 'Cancelled';
    resultValue?: any;
    resultUnits?: string; // Snapshotted
    referenceRange?: string; // Snapshotted
    isAbnormal?: boolean;
    isCritical?: boolean;
    flags?: string[];
    notes?: string;
    verifiedBy?: ObjectId;
    verifiedAt?: Date;
}

export type OrderSample = {
    sampleId: ObjectId; // Internally generated ID for this sample instance
    sampleType: string; // Snapshotted from test catalog specimen requirements
    collectionTimestamp?: Date;
    receivedTimestamp?: Date;
    status: 'AwaitingCollection' | 'InLab' | 'Testing' | 'AwaitingVerification' | 'Verified' | 'Archived' | 'Rejected';
    tests: OrderTest[];
}

export type Order = {
    _id: ObjectId;
    orderId: string; // Human-readable ID, e.g., ORD-2025-00001
    patientId: ObjectId;
    physicianId: ObjectId;
    icd10Code: string;
    orderStatus: 'Pending' | 'Partially Complete' | 'Complete' | 'Cancelled';
    priority: 'Routine' | 'STAT';
    samples: OrderSample[];
    createdAt: Date;
    createdBy: ObjectId;
    updatedAt: Date;
}

export type ClientOrder = Omit<Order, '_id' | 'patientId' | 'physicianId' | 'createdBy' | 'samples'> & {
    id: string;
    patientId: string;
    physicianId: string;
    createdBy: string;
    samples: (Omit<OrderSample, 'sampleId'> & { sampleId: string })[];
    patientInfo?: ClientPatient; // Added for aggregation results
}

export type Appointment = {
    _id: ObjectId;
    patientId: ObjectId;
    scheduledTime: Date;
    durationMinutes: number;
    status: 'Scheduled' | 'CheckedIn' | 'Completed' | 'NoShow';
    notes?: string;
};

export type ClientAppointment = Omit<Appointment, '_id' | 'patientId'> & {
    id: string;
    patientId: string;
    patientInfo?: Partial<ClientPatient>;
};
