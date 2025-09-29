export type Role = 'receptionist' | 'technician' | 'manager' | 'physician' | 'patient';

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  avatar: string;
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
