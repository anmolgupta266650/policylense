export type UserRole = 'student' | 'admin';
export type ApplicationStatus = 'pending' | 'verified' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  qualifications: string[];
  income: number;
  state: string;
  area: string;
  isVerified: boolean;
  bookmarks: string[]; // Array of scheme IDs
  createdAt: any;
}

export interface Scheme {
  id: string;
  title: string;
  description: string;
  category: string;
  eligibility: {
    minQualification: string;
    maxIncome: number;
    states: string[];
  };
  salary: string;
  deadline: any;
  createdAt: any;
}

export interface Application {
  id: string;
  userId: string;
  schemeId: string;
  status: ApplicationStatus;
  submittedAt: any;
  remarks: string;
  formData: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
}
