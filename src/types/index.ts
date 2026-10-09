export type UserRole = 'student' | 'admin';
export type UserStatus = 'Pending' | 'Active' | 'Rejected';
export type EventStatus = 'Active' | 'Cancelled' | 'Deleted';
export type RegistrationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Event Cancelled' | 'Event Deleted';

export interface UserProfile {
  uid: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  course?: string;
  studentId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EventItem {
  id: string; // Event ID e.g. EVT-101
  name: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  venue: string;
  maxCapacity: number;
  currentRegistrations: number;
  status?: EventStatus; // 'Active' | 'Cancelled'
  imageUrl?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegistrationItem {
  id: string; // Registration ID e.g. REG-54321
  studentId: string; // Student ID e.g. STU-94021
  eventId: string; // Event ID e.g. EVT-101
  eventName: string;
  studentName: string;
  studentEmail: string;
  studentCourse: string;
  userId: string;
  registrationDate: string;
  status: RegistrationStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  actionSummary?: string;
  pendingConfirmation?: {
    actionType: string;
    payload: Record<string, any>;
    prompt: string;
  };
}

export type NotificationType =
  | 'account_approved'
  | 'account_rejected'
  | 'registration_approved'
  | 'registration_rejected'
  | 'event_cancelled'
  | 'event_deleted'
  | 'system';

export interface NotificationItem {
  id: string; // e.g. NOTIF-10924
  userId: string; // recipient uid or 'admin' or 'all'
  recipientEmail?: string;
  recipientName?: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  relatedEventId?: string;
  relatedRegistrationId?: string;
  emailSent?: boolean;
  emailStatus?: 'sent' | 'not_configured' | 'failed';
  emailError?: string;
}

export interface AttendanceItem {
  id: string; // e.g. ATT-94021
  eventId: string;
  eventName: string;
  registrationId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: 'Present' | 'Absent';
  checkInTime?: string; // ISO string
  markedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CertificateType = 'Participation' | 'Volunteer' | 'Excellence' | 'Coordinator' | 'Winner';

export interface CertificateItem {
  id: string; // e.g. CERT-2026-84729
  eventId: string;
  eventName: string;
  eventDate: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  userId: string;
  collegeName: string;
  certificateType: CertificateType;
  issueDate: string;
  issuedBy: string;
  qrVerificationCode?: string;
  createdAt: string;
}

