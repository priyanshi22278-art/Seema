import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  where,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  UserProfile,
  EventItem,
  RegistrationItem,
  UserRole,
  UserStatus,
  RegistrationStatus,
  NotificationItem,
  AttendanceItem,
  CertificateItem,
  CertificateType,
} from '../types';
import {
  notifyStudentAccountStatus,
  notifyRegistrationStatus,
  notifyEventCancelledOrDeleted,
  createNotification,
} from '../utils/notifications';

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

interface AppContextType {
  currentUser: UserProfile | null;
  userRole: UserRole;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  events: EventItem[];
  registrations: RegistrationItem[];
  users: UserProfile[];
  notifications: NotificationItem[];
  attendance: AttendanceItem[];
  certificates: CertificateItem[];
  emailServiceConfigured: boolean;
  loading: boolean;
  login: (username: string, password?: string, role?: UserRole) => Promise<boolean>;
  loginWithGoogle: (expectedRole?: UserRole) => Promise<UserProfile | null>;
  signup: (data: {
    username: string;
    password?: string;
    name: string;
    email: string;
    role: UserRole;
    course?: string;
  }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  createEvent: (data: Omit<EventItem, 'currentRegistrations'>) => Promise<void>;
  updateEvent: (id: string, data: Partial<EventItem>) => Promise<void>;
  cancelEvent: (id: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  restoreEvent: (id: string) => Promise<void>;
  approveStudent: (uid: string) => Promise<void>;
  rejectStudent: (uid: string) => Promise<void>;
  setStudentStatus: (uid: string, status: UserStatus) => Promise<void>;
  registerForEvent: (
    eventId: string,
    studentData: { name: string; email: string; course: string; studentId?: string }
  ) => Promise<{ registrationId: string; studentId: string }>;
  updateRegistrationStatus: (registrationId: string, status: RegistrationStatus) => Promise<void>;
  deleteRegistration: (registrationId: string) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  recordAttendance: (data: {
    eventId: string;
    registrationId: string;
    studentId?: string;
    studentName?: string;
    studentEmail?: string;
    status: 'Present' | 'Absent';
  }) => Promise<{ success: boolean; message: string; record?: AttendanceItem }>;
  generateCertificates: (
    eventId: string,
    certificateType: CertificateType,
    recipientStudentIds?: string[]
  ) => Promise<{ success: boolean; count: number; certificates: CertificateItem[] }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('campuspulse_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [userRole, setUserRole] = useState<UserRole>(currentUser?.role || 'student');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('campuspulse_theme');
    if (saved) return saved === 'dark';
    return true;
  });
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [emailServiceConfigured, setEmailServiceConfigured] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Check email configuration
  useEffect(() => {
    fetch('/api/email-status')
      .then((res) => res.json())
      .then((data) => setEmailServiceConfigured(Boolean(data.configured)))
      .catch(() => setEmailServiceConfigured(false));
  }, []);

  // Sync theme
  useEffect(() => {
    localStorage.setItem('campuspulse_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Save current user to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('campuspulse_user', JSON.stringify(currentUser));
      setUserRole(currentUser.role);
    } else {
      localStorage.removeItem('campuspulse_user');
    }
  }, [currentUser]);

  // Real-time synchronization of current user document so student approval/rejection updates instantly!
  useEffect(() => {
    if (!currentUser?.uid) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsub = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const liveData = docSnap.data() as UserProfile;
        setCurrentUser((prev) => {
          if (!prev) return liveData;
          if (prev.status !== liveData.status || prev.role !== liveData.role || prev.name !== liveData.name) {
            return { ...prev, ...liveData };
          }
          return prev;
        });
      }
    });

    return () => unsub();
  }, [currentUser?.uid]);

  // Sync auth state if signed in with Google
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setCurrentUser(data);
            setUserRole(data.role);
          }
        } catch (err) {
          console.warn('Could not restore Firebase user doc:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to Events, Registrations, and Users in real-time
  useEffect(() => {
    setLoading(true);

    // 1. Subscribe to events
    const eventsRef = collection(db, 'events');
    const unsubEvents = onSnapshot(
      eventsRef,
      (snapshot) => {
        const items: EventItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...(docSnap.data() as EventItem), id: docSnap.id });
        });
        // Sort by date upcoming
        items.sort((a, b) => a.date.localeCompare(b.date));
        setEvents(items);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'events');
        setLoading(false);
      }
    );

    // 2. Subscribe to registrations
    const regRef = collection(db, 'registrations');
    const unsubRegs = onSnapshot(
      regRef,
      (snapshot) => {
        const items: RegistrationItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...(docSnap.data() as RegistrationItem), id: docSnap.id });
        });
        // Sort newest first
        items.sort((a, b) => (b.registrationDate || '').localeCompare(a.registrationDate || ''));
        setRegistrations(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'registrations');
      }
    );

    // 3. Subscribe to users (for Student Approval Requests & Participant tracking)
    const usersRef = collection(db, 'users');
    const unsubUsers = onSnapshot(
      usersRef,
      (snapshot) => {
        const userItems: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          userItems.push({ ...(docSnap.data() as UserProfile), uid: docSnap.id });
        });
        // Sort newest first
        userItems.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setUsers(userItems);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    );

    // 4. Subscribe to notifications
    const notifRef = collection(db, 'notifications');
    const unsubNotifs = onSnapshot(
      notifRef,
      (snapshot) => {
        const items: NotificationItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...(docSnap.data() as NotificationItem), id: docSnap.id });
        });
        items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setNotifications(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );

    // 5. Subscribe to attendance
    const attRef = collection(db, 'attendance');
    const unsubAtt = onSnapshot(
      attRef,
      (snapshot) => {
        const items: AttendanceItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...(docSnap.data() as AttendanceItem), id: docSnap.id });
        });
        items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setAttendance(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'attendance');
      }
    );

    // 6. Subscribe to certificates
    const certRef = collection(db, 'certificates');
    const unsubCerts = onSnapshot(
      certRef,
      (snapshot) => {
        const items: CertificateItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...(docSnap.data() as CertificateItem), id: docSnap.id });
        });
        items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setCertificates(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'certificates');
      }
    );

    return () => {
      unsubEvents();
      unsubRegs();
      unsubUsers();
      unsubNotifs();
      unsubAtt();
      unsubCerts();
    };
  }, []);

  // Google Sign-In
  const loginWithGoogle = async (expectedRole: UserRole = 'student'): Promise<UserProfile | null> => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const isAdminEmail = user.email?.toLowerCase() === 'priyanshi22278@gmail.com';
      const role: UserRole = isAdminEmail ? 'admin' : expectedRole;

      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const existingProfile = userSnap.data() as UserProfile;
        setCurrentUser(existingProfile);
        setUserRole(existingProfile.role);
        return existingProfile;
      }

      // New users: Students are 'Pending' by default; Admins are 'Active'
      const initialStatus: UserStatus = role === 'admin' ? 'Active' : 'Pending';

      const newProfile: UserProfile = {
        uid: user.uid,
        username: (user.email?.split('@')[0] || `user_${Date.now()}`).toLowerCase(),
        name: user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        role,
        status: initialStatus,
        createdAt: new Date().toISOString(),
      };
      if (role === 'student') {
        newProfile.studentId = `STU-${Math.floor(100000 + Math.random() * 900000)}`;
        newProfile.course = 'Computer Science & AI';
      }

      await setDoc(userDocRef, stripUndefined(newProfile));
      if (role === 'admin') {
        await setDoc(doc(db, 'admins', user.uid), { active: true, email: user.email });
      }

      setCurrentUser(newProfile);
      setUserRole(role);
      return newProfile;
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      throw err;
    }
  };

  // Username/Password Login handler
  const login = async (username: string, _password?: string, expectedRole?: UserRole): Promise<boolean> => {
    const cleanUsername = username.trim().toLowerCase();

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', cleanUsername));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const userData = snap.docs[0].data() as UserProfile;
        setCurrentUser(userData);
        setUserRole(userData.role);
        return true;
      }

      // If user doesn't exist yet in database, create account
      const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const isRoleAdmin = cleanUsername.includes('admin') || expectedRole === 'admin';
      const role: UserRole = isRoleAdmin ? 'admin' : 'student';
      const initialStatus: UserStatus = role === 'admin' ? 'Active' : 'Pending';

      const newProfile: UserProfile = {
        uid,
        username: cleanUsername,
        name: username.charAt(0).toUpperCase() + username.slice(1),
        email: cleanUsername.includes('@')
          ? cleanUsername
          : isRoleAdmin
          ? 'priyanshi22278@gmail.com'
          : `${cleanUsername}@university.edu`,
        role,
        status: initialStatus,
        createdAt: new Date().toISOString(),
      };
      if (role === 'student') {
        newProfile.studentId = `STU-${Math.floor(100000 + Math.random() * 900000)}`;
        newProfile.course = 'Computer Science & AI';
      }

      await setDoc(doc(db, 'users', uid), stripUndefined(newProfile));
      if (role === 'admin') {
        await setDoc(doc(db, 'admins', uid), { active: true, email: newProfile.email });
      }

      setCurrentUser(newProfile);
      setUserRole(role);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
      return false;
    }
  };

  // Signup handler
  const signup = async (data: {
    username: string;
    password?: string;
    name: string;
    email: string;
    role: UserRole;
    course?: string;
  }): Promise<UserProfile> => {
    const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const initialStatus: UserStatus = data.role === 'admin' ? 'Active' : 'Pending';

    const profile: UserProfile = {
      uid,
      username: data.username.trim().toLowerCase(),
      name: data.name.trim(),
      email: data.email.trim(),
      role: data.role,
      status: initialStatus,
      createdAt: new Date().toISOString(),
    };
    if (data.role === 'student') {
      profile.studentId = `STU-${Math.floor(100000 + Math.random() * 900000)}`;
      if (data.course && data.course.trim()) {
        profile.course = data.course.trim();
      } else {
        profile.course = 'General';
      }
    }

    try {
      await setDoc(doc(db, 'users', uid), stripUndefined(profile));
      if (data.role === 'admin') {
        await setDoc(doc(db, 'admins', uid), { active: true, email: data.email });
      }
      setCurrentUser(profile);
      setUserRole(profile.role);
      return profile;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${uid}`);
      throw error;
    }
  };

  // Student Account Approval by Admin
  const approveStudent = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        status: 'Active',
        updatedAt: new Date().toISOString(),
      });
      const stu = users.find((u) => u.uid === uid);
      if (stu) {
        notifyStudentAccountStatus({ ...stu, status: 'Active' }, 'Active');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  // Student Account Rejection by Admin
  const rejectStudent = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        status: 'Rejected',
        updatedAt: new Date().toISOString(),
      });
      const stu = users.find((u) => u.uid === uid);
      if (stu) {
        notifyStudentAccountStatus({ ...stu, status: 'Rejected' }, 'Rejected');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  // Set Student Approval Status
  const setStudentStatus = async (uid: string, status: UserStatus) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        status,
        updatedAt: new Date().toISOString(),
      });
      const stu = users.find((u) => u.uid === uid);
      if (stu && (status === 'Active' || status === 'Rejected')) {
        notifyStudentAccountStatus({ ...stu, status }, status);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
    setCurrentUser(null);
    localStorage.removeItem('campuspulse_user');
  };

  // Add an Event
  const createEvent = async (data: Omit<EventItem, 'currentRegistrations'>) => {
    const eventId = data.id.trim().toUpperCase() || `EVT-${Math.floor(100 + Math.random() * 900)}`;
    const newEvent: EventItem = {
      ...data,
      id: eventId,
      currentRegistrations: 0,
      status: 'Active',
      createdBy: currentUser?.name || 'Admin',
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'events', eventId), stripUndefined(newEvent));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `events/${eventId}`);
    }
  };

  // Update Event
  const updateEvent = async (id: string, data: Partial<EventItem>) => {
    try {
      await updateDoc(doc(db, 'events', id), stripUndefined({
        ...data,
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `events/${id}`);
    }
  };

  // Cancel Event: Keeps event record but sets status to 'Cancelled', stops new registrations, and marks registrations 'Event Cancelled'
  const cancelEvent = async (id: string) => {
    try {
      const batch = writeBatch(db);

      // 1. Update event status to 'Cancelled'
      const eventRef = doc(db, 'events', id);
      batch.update(eventRef, {
        status: 'Cancelled',
        updatedAt: new Date().toISOString(),
      });

      // 2. Mark all existing registrations for this event as 'Event Cancelled'
      const matchingRegs = registrations.filter((r) => r.eventId === id);
      for (const reg of matchingRegs) {
        const regRef = doc(db, 'registrations', reg.id);
        batch.update(regRef, {
          status: 'Event Cancelled',
          updatedAt: new Date().toISOString(),
        });
      }

      await batch.commit();

      // Trigger notifications & emails for registered students
      const targetEvent = events.find((e) => e.id === id);
      if (targetEvent) {
        notifyEventCancelledOrDeleted(targetEvent, matchingRegs, 'Cancelled');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `events/${id}`);
    }
  };

  // Delete Event: Marks event as 'Deleted', sets active registration count to 0, and updates all related registrations to 'Event Deleted'
  const deleteEvent = async (id: string) => {
    try {
      const batch = writeBatch(db);

      // 1. Mark event document as Deleted and set active count to 0
      const eventRef = doc(db, 'events', id);
      batch.update(eventRef, {
        status: 'Deleted',
        currentRegistrations: 0,
        updatedAt: new Date().toISOString(),
      });

      // 2. Mark all related registrations as 'Event Deleted'
      const matchingRegs = registrations.filter((r) => r.eventId === id);
      for (const reg of matchingRegs) {
        const regRef = doc(db, 'registrations', reg.id);
        batch.update(regRef, {
          status: 'Event Deleted',
          updatedAt: new Date().toISOString(),
        });
      }

      await batch.commit();

      // Trigger notifications & emails for registered students
      const targetEvent = events.find((e) => e.id === id);
      if (targetEvent) {
        notifyEventCancelledOrDeleted(targetEvent, matchingRegs, 'Deleted');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `events/${id}`);
    }
  };

  // Restore Event: Restores a deleted or archived event back to Active
  const restoreEvent = async (id: string) => {
    try {
      const eventRef = doc(db, 'events', id);
      await updateDoc(eventRef, {
        status: 'Active',
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `events/${id}`);
    }
  };

  // Register for Event
  const registerForEvent = async (
    eventId: string,
    studentData: { name: string; email: string; course: string; studentId?: string }
  ): Promise<{ registrationId: string; studentId: string }> => {
    const regId = `REG-${Math.floor(10000 + Math.random() * 90000)}`;
    const assignedStudentId = studentData.studentId || currentUser?.studentId || `STU-${Math.floor(100000 + Math.random() * 900000)}`;

    const targetEvent = events.find((e) => e.id === eventId);
    if (!targetEvent) {
      throw new Error('Event not found.');
    }

    if (targetEvent.status === 'Cancelled') {
      throw new Error('This event has been cancelled and is no longer accepting registrations.');
    }

    if (targetEvent.status === 'Deleted') {
      throw new Error('This event has been deleted and is no longer accepting registrations.');
    }

    const eventName = targetEvent.name;

    const registration: RegistrationItem = {
      id: regId,
      studentId: assignedStudentId,
      eventId,
      eventName,
      studentName: studentData.name.trim(),
      studentEmail: studentData.email.trim(),
      studentCourse: studentData.course.trim(),
      userId: currentUser?.uid || auth.currentUser?.uid || `guest_${Date.now()}`,
      registrationDate: new Date().toISOString(),
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    try {
      // Use transaction to safely increment registration count
      await runTransaction(db, async (transaction) => {
        const eventRef = doc(db, 'events', eventId);
        const eventDoc = await transaction.get(eventRef);

        let currentCount = 0;
        if (eventDoc.exists()) {
          const eData = eventDoc.data() as EventItem;
          if (eData.status === 'Cancelled' || eData.status === 'Deleted') {
            throw new Error('This event is not accepting registrations.');
          }
          currentCount = eData.currentRegistrations || 0;
          transaction.update(eventRef, {
            currentRegistrations: currentCount + 1,
            updatedAt: new Date().toISOString(),
          });
        }

        const regDocRef = doc(db, 'registrations', regId);
        transaction.set(regDocRef, stripUndefined(registration));
      });

      // Update current user profile if studentId or course changed
      if (currentUser && (!currentUser.studentId || currentUser.studentId !== assignedStudentId || currentUser.course !== studentData.course)) {
        const updated = {
          ...currentUser,
          name: studentData.name,
          email: studentData.email,
          studentId: assignedStudentId,
          course: studentData.course,
        };
        setCurrentUser(updated);
        try {
          await updateDoc(doc(db, 'users', currentUser.uid), stripUndefined({
            name: studentData.name,
            email: studentData.email,
            studentId: assignedStudentId,
            course: studentData.course,
          }));
        } catch (err) {
          console.warn('Could not update user doc:', err);
        }
      }

      return { registrationId: regId, studentId: assignedStudentId };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `registrations/${regId}`);
      throw error;
    }
  };

  // Update Registration Status
  const updateRegistrationStatus = async (
    registrationId: string,
    status: RegistrationStatus
  ) => {
    try {
      await updateDoc(doc(db, 'registrations', registrationId), {
        status,
        updatedAt: new Date().toISOString(),
      });

      const reg = registrations.find((r) => r.id === registrationId);
      if (reg && (status === 'Approved' || status === 'Rejected')) {
        const evt = events.find((e) => e.id === reg.eventId);
        notifyRegistrationStatus({ ...reg, status }, evt, status);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `registrations/${registrationId}`);
    }
  };

  // Delete Registration
  const deleteRegistration = async (registrationId: string) => {
    try {
      const reg = registrations.find((r) => r.id === registrationId);
      if (reg) {
        const eventRef = doc(db, 'events', reg.eventId);
        const eventObj = events.find((e) => e.id === reg.eventId);
        if (eventObj && eventObj.currentRegistrations > 0) {
          await updateDoc(eventRef, {
            currentRegistrations: Math.max(0, eventObj.currentRegistrations - 1),
          });
        }
      }
      await deleteDoc(doc(db, 'registrations', registrationId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `registrations/${registrationId}`);
    }
  };

  // Notification read actions
  const markNotificationAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), {
        read: true,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const batch = writeBatch(db);
      const unread = notifications.filter(
        (n) => !n.read && (currentUser?.role === 'admin' || n.userId === currentUser?.uid || n.userId === 'all')
      );
      for (const n of unread) {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      }
      await batch.commit();
    } catch (error) {
      console.warn('Failed to mark all notifications as read:', error);
    }
  };

  // QR-based Attendance Recording with Validation & Duplicate Check-in Prevention
  const recordAttendance = async (data: {
    eventId: string;
    registrationId: string;
    studentId?: string;
    studentName?: string;
    studentEmail?: string;
    status: 'Present' | 'Absent';
  }): Promise<{ success: boolean; message: string; record?: AttendanceItem }> => {
    const targetEvent = events.find((e) => e.id === data.eventId);
    if (!targetEvent) {
      return { success: false, message: `Event not found (ID: ${data.eventId}).` };
    }
    if (targetEvent.status === 'Cancelled' || targetEvent.status === 'Deleted') {
      return { success: false, message: `Event is ${targetEvent.status}. Attendance is disabled.` };
    }

    const reg = registrations.find((r) => r.id === data.registrationId);
    if (!reg) {
      return { success: false, message: `Registration ID "${data.registrationId}" not found in database.` };
    }
    if (reg.eventId !== data.eventId) {
      return {
        success: false,
        message: `Registration ID "${reg.id}" is for "${reg.eventName}" (${reg.eventId}), not "${targetEvent.name}".`,
      };
    }
    if (reg.status !== 'Approved') {
      return {
        success: false,
        message: `Student registration is "${reg.status}". Only Approved registrations can check in.`,
      };
    }

    // Check for duplicate check-in
    const existing = attendance.find(
      (a) =>
        a.eventId === data.eventId &&
        (a.registrationId === data.registrationId || (a.studentId && a.studentId === reg.studentId)) &&
        a.status === 'Present'
    );

    if (existing && data.status === 'Present') {
      const timeStr = existing.checkInTime
        ? new Date(existing.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'earlier';
      return {
        success: false,
        message: `Duplicate check-in prevented: ${existing.studentName} is ALREADY marked Present (Checked in at ${timeStr}).`,
        record: existing,
      };
    }

    const attId = existing?.id || `ATT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const record: AttendanceItem = {
      id: attId,
      eventId: data.eventId,
      eventName: targetEvent.name,
      registrationId: reg.id,
      studentId: reg.studentId,
      studentName: reg.studentName,
      studentEmail: reg.studentEmail,
      status: data.status,
      checkInTime: data.status === 'Present' ? new Date().toISOString() : undefined,
      markedBy: currentUser?.name || 'Authorized Staff',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'attendance', attId), stripUndefined(record));
      return {
        success: true,
        message: `Attendance confirmed: Marked ${reg.studentName} as ${data.status} for ${targetEvent.name}.`,
        record,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendance/${attId}`);
      return { success: false, message: 'Database error saving attendance.' };
    }
  };

  // Generate Certificates for Students who Attended Completed Event
  const generateCertificates = async (
    eventId: string,
    certificateType: CertificateType,
    recipientStudentIds?: string[]
  ): Promise<{ success: boolean; count: number; certificates: CertificateItem[] }> => {
    const targetEvent = events.find((e) => e.id === eventId);
    if (!targetEvent) {
      throw new Error('Event not found.');
    }

    // Gather eligible attendees: Students marked 'Present'
    const eventAttendance = attendance.filter((a) => a.eventId === eventId && a.status === 'Present');
    let eligibleStudents: Array<{
      studentId: string;
      studentName: string;
      studentEmail: string;
      userId: string;
      registrationId: string;
    }> = [];

    if (eventAttendance.length > 0) {
      eligibleStudents = eventAttendance
        .filter((a) => !recipientStudentIds || recipientStudentIds.includes(a.studentId))
        .map((a) => {
          const reg = registrations.find((r) => r.id === a.registrationId);
          return {
            studentId: a.studentId,
            studentName: a.studentName,
            studentEmail: a.studentEmail,
            userId: reg?.userId || a.studentId,
            registrationId: a.registrationId,
          };
        });
    } else {
      // Fallback: If attendance wasn't taken with QR scanner, eligible are Approved registrations
      const approvedRegs = registrations.filter((r) => r.eventId === eventId && r.status === 'Approved');
      eligibleStudents = approvedRegs
        .filter((r) => !recipientStudentIds || recipientStudentIds.includes(r.studentId))
        .map((r) => ({
          studentId: r.studentId,
          studentName: r.studentName,
          studentEmail: r.studentEmail,
          userId: r.userId,
          registrationId: r.id,
        }));
    }

    if (eligibleStudents.length === 0) {
      return { success: false, count: 0, certificates: [] };
    }

    const generated: CertificateItem[] = [];
    const batch = writeBatch(db);

    for (const stu of eligibleStudents) {
      // Deterministic yet unique ID per student per event
      const safeEventId = targetEvent.id.replace(/[^A-Za-z0-9]/g, '');
      const safeRegId = stu.registrationId.replace(/[^A-Za-z0-9]/g, '');
      const certId = `CERT-${safeEventId}-${safeRegId}`;

      const cert: CertificateItem = {
        id: certId,
        eventId: targetEvent.id,
        eventName: targetEvent.name,
        eventDate: targetEvent.date,
        studentId: stu.studentId,
        studentName: stu.studentName,
        studentEmail: stu.studentEmail,
        userId: stu.userId,
        collegeName: 'CampusPulse Institute of Higher Education',
        certificateType,
        issueDate: new Date().toISOString().split('T')[0],
        issuedBy: currentUser?.name || 'Dean of Student Affairs',
        qrVerificationCode: `${certId}|${targetEvent.id}|${stu.studentId}`,
        createdAt: new Date().toISOString(),
      };

      batch.set(doc(db, 'certificates', certId), stripUndefined(cert));
      generated.push(cert);

      // In-app notification to student
      createNotification({
        userId: stu.userId,
        recipientEmail: stu.studentEmail,
        recipientName: stu.studentName,
        title: `Official Certificate Issued: ${targetEvent.name} 🎓`,
        message: `Congratulations ${stu.studentName}! Your official Certificate of ${certificateType} for "${targetEvent.name}" has been issued. View and download it anytime under "My Certificates".`,
        type: 'system',
        relatedEventId: targetEvent.id,
        relatedRegistrationId: stu.registrationId,
      });
    }

    try {
      await batch.commit();
      return { success: true, count: generated.length, certificates: generated };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'certificates');
      throw error;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        userRole,
        isDarkMode,
        setIsDarkMode,
        events,
        registrations,
        users,
        notifications,
        attendance,
        certificates,
        emailServiceConfigured,
        loading,
        login,
        loginWithGoogle,
        signup,
        logout,
        createEvent,
        updateEvent,
        cancelEvent,
        deleteEvent,
        restoreEvent,
        approveStudent,
        rejectStudent,
        setStudentStatus,
        registerForEvent,
        updateRegistrationStatus,
        deleteRegistration,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        recordAttendance,
        generateCertificates,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
