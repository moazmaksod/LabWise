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
  lastName: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  trainingRecords?: TrainingRecord[];
  physicianInfo?: PhysicianInfo;
  avatar?: string; // Kept for UI continuity, may be moved later
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
