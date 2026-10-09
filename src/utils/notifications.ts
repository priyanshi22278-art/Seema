import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { NotificationItem, UserProfile, RegistrationItem, EventItem } from '../types';

export async function dispatchEmailApi(payload: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  type?: string;
}): Promise<{ success: boolean; configured: boolean; error?: string; messageId?: string }> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      configured: false,
      error: err.message || 'Network request failed',
    };
  }
}

/**
 * Creates an in-app notification in Firestore and attempts real email delivery via server.
 */
export async function createNotification(
  data: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>
): Promise<NotificationItem> {
  const notifId = `NOTIF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const notif: NotificationItem = {
    id: notifId,
    ...data,
    read: false,
    createdAt: new Date().toISOString(),
    emailSent: false,
    emailStatus: 'not_configured',
  };

  try {
    const docRef = doc(db, 'notifications', notifId);
    await setDoc(docRef, notif);

    // If recipient email is provided, attempt backend email dispatch
    if (notif.recipientEmail) {
      dispatchEmailApi({
        to: notif.recipientEmail,
        subject: notif.title,
        text: notif.message,
        type: notif.type,
      }).then(async (emailResult) => {
        try {
          if (emailResult.success) {
            await updateDoc(docRef, {
              emailSent: true,
              emailStatus: 'sent',
            });
          } else if (emailResult.configured === false) {
            await updateDoc(docRef, {
              emailSent: false,
              emailStatus: 'not_configured',
              emailError: emailResult.error || 'Email service not configured on server',
            });
          } else {
            await updateDoc(docRef, {
              emailSent: false,
              emailStatus: 'failed',
              emailError: emailResult.error || 'Delivery failed',
            });
          }
        } catch (err) {
          console.warn('Failed to update notification email status:', err);
        }
      });
    }

    return notif;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${notifId}`);
    return notif;
  }
}

// 1. Notify student account approval / rejection
export async function notifyStudentAccountStatus(
  student: UserProfile,
  status: 'Active' | 'Rejected'
) {
  const isApproved = status === 'Active';
  const title = isApproved
    ? 'Student Account Approved! 🎉'
    : 'Student Account Application Update';
  const message = isApproved
    ? `Congratulations ${student.name}! Your CampusPulse student account (${student.studentId || student.email}) has been approved by the Administrator. You now have full access to explore upcoming events, register for workshops, and obtain digital event passes.`
    : `Hello ${student.name}, your student account request for CampusPulse could not be approved at this time. Please contact the campus event administration office if you believe this is in error.`;

  await createNotification({
    userId: student.uid,
    recipientEmail: student.email,
    recipientName: student.name,
    title,
    message,
    type: isApproved ? 'account_approved' : 'account_rejected',
  });
}

// 2. Notify event registration approval / rejection
export async function notifyRegistrationStatus(
  registration: RegistrationItem,
  event: EventItem | undefined,
  status: 'Approved' | 'Rejected'
) {
  const isApproved = status === 'Approved';
  const eventName = registration.eventName || event?.name || 'College Event';
  const eventDate = event ? `${event.date} at ${event.time}` : 'scheduled date';
  const eventVenue = event?.venue || 'Campus Venue';

  const title = isApproved
    ? `Registration Confirmed: ${eventName} 🎟️`
    : `Registration Declined: ${eventName}`;

  const message = isApproved
    ? `Dear ${registration.studentName}, your registration (${registration.id}) for "${eventName}" has been APPROVED! Your Digital Event Pass with QR code is now ready under "My Event Passes". Date: ${eventDate}, Venue: ${eventVenue}.`
    : `Dear ${registration.studentName}, your registration (${registration.id}) for "${eventName}" was rejected or could not be accommodated due to capacity limits.`;

  await createNotification({
    userId: registration.userId,
    recipientEmail: registration.studentEmail,
    recipientName: registration.studentName,
    title,
    message,
    type: isApproved ? 'registration_approved' : 'registration_rejected',
    relatedEventId: registration.eventId,
    relatedRegistrationId: registration.id,
  });
}

// 3. Notify students when event is cancelled or deleted
export async function notifyEventCancelledOrDeleted(
  event: EventItem,
  registrations: RegistrationItem[],
  action: 'Cancelled' | 'Deleted'
) {
  const isDeleted = action === 'Deleted';
  const eventName = event.name;

  const relevantRegistrations = registrations.filter((r) => r.eventId === event.id);

  for (const reg of relevantRegistrations) {
    const title = isDeleted
      ? `Event Cancelled & Removed: ${eventName}`
      : `Event Cancelled: ${eventName}`;

    const message = isDeleted
      ? `Notice: The event "${eventName}" (${event.date} at ${event.venue}) has been DELETED by the administration. All associated registrations (including your pass ${reg.id}) have been updated to "Event Deleted". We apologize for any inconvenience.`
      : `Notice: The event "${eventName}" (${event.date} at ${event.venue}) has been CANCELLED by the administration. Your registration (${reg.id}) has been updated to "Event Cancelled".`;

    await createNotification({
      userId: reg.userId,
      recipientEmail: reg.studentEmail,
      recipientName: reg.studentName,
      title,
      message,
      type: isDeleted ? 'event_deleted' : 'event_cancelled',
      relatedEventId: event.id,
      relatedRegistrationId: reg.id,
    });
  }
}
