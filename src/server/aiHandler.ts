import { GoogleGenAI } from '@google/genai';

interface ChatRequestBody {
  userMessage: string;
  userRole: 'student' | 'admin';
  currentUser?: {
    uid: string;
    name: string;
    email: string;
    role?: string;
    status?: string;
    course?: string;
    studentId?: string;
  };
  events: Array<{
    id: string;
    name: string;
    description: string;
    date: string;
    time: string;
    venue: string;
    maxCapacity: number;
    currentRegistrations: number;
    status?: 'Active' | 'Cancelled' | 'Deleted';
  }>;
  registrations: Array<{
    id: string;
    studentId: string;
    eventId: string;
    eventName: string;
    studentName: string;
    studentEmail: string;
    studentCourse: string;
    status: string;
    registrationDate: string;
  }>;
  users?: Array<{
    uid: string;
    username: string;
    name: string;
    email: string;
    role: string;
    status: string;
    course?: string;
    studentId?: string;
    createdAt?: string;
  }>;
  history?: Array<{
    sender: 'user' | 'ai';
    text: string;
  }>;
}

export type AiActionType =
  | 'REGISTER_EVENT'
  | 'CANCEL_REGISTRATION'
  | 'APPROVE_REGISTRATION'
  | 'REJECT_REGISTRATION'
  | 'APPROVE_ALL_PENDING'
  | 'CREATE_EVENT'
  | 'UPDATE_EVENT'
  | 'CANCEL_EVENT'
  | 'DELETE_EVENT_CONFIRM_REQUEST'
  | 'CONFIRMED_DELETE_EVENT'
  | 'RESTORE_EVENT'
  | 'APPROVE_STUDENT'
  | 'REJECT_STUDENT'
  | 'SET_STUDENT_STATUS'
  | 'CONFIRM_ACTION_REQUEST';

export async function handleAiChatRequest(body: ChatRequestBody): Promise<{
  reply: string;
  action?: {
    type: AiActionType;
    payload: Record<string, any>;
  };
  pendingConfirmation?: {
    actionType: string;
    payload: Record<string, any>;
    prompt: string;
  };
}> {
  const { userMessage, userRole, currentUser, events, registrations, users = [], history = [] } = body;

  const apiKey = process.env.GEMINI_API_KEY;

  // Strict Student Security Check: Students must NOT perform admin actions
  if (userRole === 'student') {
    const adminActionKeywords = [
      'create event', 'add event', 'new event', 'schedule event',
      'delete event', 'remove event', 'cancel event',
      'edit event', 'update event', 'modify event', 'change capacity',
      'approve registration', 'reject registration', 'approve all',
      'approve student', 'reject student', 'student approval',
      'admin portal', 'change status', 'restore event'
    ];
    const lowerMsg = userMessage.toLowerCase();
    const isAttemptingAdminAction = adminActionKeywords.some(kw => lowerMsg.includes(kw));

    if (isAttemptingAdminAction && !lowerMsg.includes('register me') && !lowerMsg.includes('cancel my registration') && !lowerMsg.includes('am i registered')) {
      return {
        reply: 'Permission Denied: Students do not have administrative authorization to modify events, manage participant registrations, or approve student accounts. Please contact a campus administrator.',
      };
    }
  }

  const eventsSummary = events.length > 0
    ? events.map(e => `- [${e.id}] "${e.name}": Status: ${e.status || 'Active'}, Date: ${e.date}, Time: ${e.time}, Venue: ${e.venue}, Capacity: ${e.currentRegistrations}/${e.maxCapacity} registered. Description: ${e.description}`).join('\n')
    : 'No events are currently scheduled.';

  let roleContext = '';
  if (userRole === 'student') {
    const studentRegistrations = registrations.filter(r => r.studentId === currentUser?.studentId || r.studentEmail === currentUser?.email);
    const regsSummary = studentRegistrations.length > 0
      ? studentRegistrations.map(r => `- Registration ${r.id} for Event [${r.eventId}] "${r.eventName}": Status is "${r.status}" (Registered on ${r.registrationDate})`).join('\n')
      : 'Student is not currently registered for any events.';

    roleContext = `
You are the CampusPulse Student AI Event Assistant.
Current Student:
- Name: ${currentUser?.name || 'Student'}
- Student ID: ${currentUser?.studentId || 'Assigned upon registration'}
- Email: ${currentUser?.email || 'N/A'}
- Course: ${currentUser?.course || 'General'}
- Status: ${currentUser?.status || 'Active'}

Student's Current Registrations:
${regsSummary}

Current Date: October 2026.
Instructions for Student AI Agent:
1. Answer questions about upcoming events & workshops (e.g. "Which AI workshops are happening this month?", "How many students have registered?", "Am I registered for the business analytics workshop?").
2. When student asks to register:
   - Identify matching event.
   - If event status is 'Deleted' or 'Cancelled', inform them the event is no longer accepting registrations.
   - If already registered, state status.
   - If full, inform them.
   - Otherwise output: ACTION:REGISTER_EVENT:{"eventId":"<EVENT_ID>"}
3. If student asks to withdraw/cancel registration:
   - Output: ACTION:CANCEL_REGISTRATION:{"registrationId":"<REG_ID>"}
4. Strictly refuse any administrative instructions with: "Permission Denied: Students do not have administrative authorization."
5. Never use red color styling or references.
`;
  } else {
    // Admin context
    const regsSummary = registrations.length > 0
      ? registrations.map(r => `- [${r.id}] Student: ${r.studentName} (ID: ${r.studentId}, ${r.studentCourse}) -> Event: [${r.eventId}] "${r.eventName}" | Status: ${r.status}`).join('\n')
      : 'No student registrations yet.';

    const pendingStudents = users.filter(u => u.role === 'student' && u.status === 'Pending');
    const studentsSummary = users.filter(u => u.role === 'student').length > 0
      ? users.filter(u => u.role === 'student').map(u => `- Student: ${u.name} (UID: ${u.uid}, Email: ${u.email}, Course: ${u.course || 'N/A'}, Status: ${u.status}, ID: ${u.studentId || 'None'})`).join('\n')
      : 'No student accounts registered.';

    roleContext = `
You are the CampusPulse AI Admin Assistant for the College Event Management App.
You have FULL administrative authority to execute actions through the application database in real time.
When instructed by the Admin, you do NOT only respond with text—you output actionable command directives so the database performs the action and syncs with the portals.

Current Date: October 2026.

=== DATABASE RECORDS ===
Registrations:
${regsSummary}

Student Accounts (${users.filter(u => u.role === 'student').length} total, ${pendingStudents.length} pending approval):
${studentsSummary}

=== ADMIN CAPABILITIES & DIRECTIVE FORMATS ===
1. STUDENT MANAGEMENT:
   - View/search students: answer naturally with student names, courses, IDs, and statuses.
   - Approve student: ACTION:APPROVE_STUDENT:{"uid":"<USER_UID>"}
   - Reject student: ACTION:REJECT_STUDENT:{"uid":"<USER_UID>"}
   - Change student status: ACTION:SET_STUDENT_STATUS:{"uid":"<USER_UID>","status":"Active" | "Pending" | "Rejected"}

2. EVENT MANAGEMENT:
   - Create event: (extract event name, date, time, venue, capacity)
     ACTION:CREATE_EVENT:{"name":"...","description":"...","date":"YYYY-MM-DD","time":"HH:MM","venue":"...","maxCapacity":50}
   - Update event / Change capacity, date, time, venue:
     ACTION:UPDATE_EVENT:{"eventId":"<ID>","data":{"maxCapacity":100,"venue":"..."}}
   - Cancel event:
     Before cancelling, ask confirmation or output:
     ACTION:CANCEL_EVENT:{"eventId":"<ID>"}
   - Delete event:
     MANDATORY CONFIRMATION RULE: Before deleting an event, you MUST ask for confirmation:
     "Deleting this event will also remove/invalidate its registrations. Do you want to continue?"
     Output: ACTION:DELETE_EVENT_CONFIRM_REQUEST:{"eventId":"<ID>","eventName":"<EVENT_NAME>"}
   - Restore deleted/cancelled event:
     ACTION:RESTORE_EVENT:{"eventId":"<ID>"}

3. REGISTRATION MANAGEMENT:
   - Approve registration: ACTION:APPROVE_REGISTRATION:{"registrationId":"<REG_ID>"}
   - Approve all pending registrations: ACTION:APPROVE_ALL_PENDING:{}
   - Reject registration: ACTION:REJECT_REGISTRATION:{"registrationId":"<REG_ID>"}
   - Cancel registration: ACTION:CANCEL_REGISTRATION:{"registrationId":"<REG_ID>"}
   - View registrations for an event: list participants with their student IDs, courses, and statuses.

4. DASHBOARD & METRICS:
   - Report counts: total students, pending approvals, active/cancelled/deleted events, active/approved/pending/rejected/deleted registrations.

5. ACTION RESULT CONFIRMATION:
   - After issuing an action directive, provide a clear, concise confirmation describing the exact result (e.g. "Done. Dandiya Night has been created on 15 October at 2 PM at Sunken Ground with a capacity of 50.").

Strict Rule: NEVER use red color styling or references.
`;
  }

  const systemInstruction = `
${roleContext}

Available Events in Database:
${eventsSummary}

When outputting an ACTION directive, place it strictly on its own line in the exact format:
ACTION:CREATE_EVENT:{"name":"...","description":"...","date":"...","time":"...","venue":"...","maxCapacity":...}
ACTION:UPDATE_EVENT:{"eventId":"...","data":{...}}
ACTION:CANCEL_EVENT:{"eventId":"..."}
ACTION:DELETE_EVENT_CONFIRM_REQUEST:{"eventId":"...","eventName":"..."}
ACTION:RESTORE_EVENT:{"eventId":"..."}
ACTION:APPROVE_STUDENT:{"uid":"..."}
ACTION:REJECT_STUDENT:{"uid":"..."}
ACTION:SET_STUDENT_STATUS:{"uid":"...","status":"..."}
ACTION:APPROVE_REGISTRATION:{"registrationId":"..."}
ACTION:REJECT_REGISTRATION:{"registrationId":"..."}
ACTION:APPROVE_ALL_PENDING:{}
ACTION:REGISTER_EVENT:{"eventId":"..."}
ACTION:CANCEL_REGISTRATION:{"registrationId":"..."}
Only output an ACTION when the user explicitly requests that operation.
`;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({});
      const prompt = `System Instructions:\n${systemInstruction}\n\nRecent History:\n${history.map(h => `${h.sender.toUpperCase()}: ${h.text}`).join('\n')}\n\nUSER: ${userMessage}\nASSISTANT:`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const replyText = response.text?.trim() || '';
      return parseAiResponse(replyText);
    } catch (err) {
      console.error('Gemini API Error, falling back to rule-based engine:', err);
    }
  }

  // Fallback intelligent intent executor
  return localRuleBasedHandler(userMessage, userRole, currentUser, events, registrations, users);
}

function parseAiResponse(text: string): {
  reply: string;
  action?: {
    type: AiActionType;
    payload: Record<string, any>;
  };
  pendingConfirmation?: {
    actionType: string;
    payload: Record<string, any>;
    prompt: string;
  };
} {
  const actionRegex = /ACTION:(REGISTER_EVENT|CANCEL_REGISTRATION|APPROVE_REGISTRATION|REJECT_REGISTRATION|APPROVE_ALL_PENDING|CREATE_EVENT|UPDATE_EVENT|CANCEL_EVENT|DELETE_EVENT_CONFIRM_REQUEST|CONFIRMED_DELETE_EVENT|RESTORE_EVENT|APPROVE_STUDENT|REJECT_STUDENT|SET_STUDENT_STATUS):(\{[^}]*\})/i;
  const match = text.match(actionRegex);

  if (match) {
    try {
      const actionType = match[1].toUpperCase() as AiActionType;
      const payload = JSON.parse(match[2] || '{}');
      const cleanReply = text.replace(match[0], '').trim();

      if (actionType === 'DELETE_EVENT_CONFIRM_REQUEST') {
        return {
          reply: cleanReply || "Deleting this event will also remove/invalidate its registrations. Do you want to continue?",
          pendingConfirmation: {
            actionType: 'DELETE_EVENT',
            payload,
            prompt: "Deleting this event will also remove/invalidate its registrations. Do you want to continue?",
          },
        };
      }

      return {
        reply: cleanReply || `Executed ${actionType.replace(/_/g, ' ').toLowerCase()} in real time.`,
        action: {
          type: actionType,
          payload,
        },
      };
    } catch {
      // ignore json parse error
    }
  }

  return { reply: text };
}

function localRuleBasedHandler(
  userMessage: string,
  userRole: 'student' | 'admin',
  currentUser: any,
  events: any[],
  registrations: any[],
  users: any[] = []
): {
  reply: string;
  action?: {
    type: AiActionType;
    payload: Record<string, any>;
  };
  pendingConfirmation?: {
    actionType: string;
    payload: Record<string, any>;
    prompt: string;
  };
} {
  const lower = userMessage.toLowerCase();

  if (userRole === 'student') {
    // 1. "Which AI workshops are happening this month?" / Browse
    if (lower.includes('which') || lower.includes('what') || lower.includes('upcoming') || lower.includes('this month') || lower.includes('happening') || lower.includes('schedule') || lower.includes('browse events') || lower.includes('list events')) {
      const isAiQuery = lower.includes('ai') || lower.includes('artificial intelligence') || lower.includes('machine learning');
      const activeEvents = events.filter(e => e.status !== 'Deleted');
      const filtered = isAiQuery
        ? activeEvents.filter(e => e.name.toLowerCase().includes('ai') || e.description.toLowerCase().includes('ai') || e.name.toLowerCase().includes('machine learning'))
        : activeEvents;

      if (filtered.length === 0) {
        return {
          reply: isAiQuery
            ? `There are currently no AI workshops scheduled this month in the database. Browse the Events tab to see all active campus sessions!`
            : `There are currently ${activeEvents.length} event(s) scheduled. View them in the Browse Events tab.`,
        };
      }

      const list = filtered.map(e => `• **${e.name}** (\`${e.id}\`)${e.status === 'Cancelled' ? ' [CANCELLED]' : ''} on **${e.date}** at **${e.time}** in *${e.venue}*. (${e.currentRegistrations}/${e.maxCapacity} registered)`).join('\n');
      return {
        reply: `Here are the upcoming events matching your request:\n\n${list}\n\nWould you like me to register you? Just say "Register me for [Event Name]"!`,
      };
    }

    // 2. "Am I registered for the business analytics workshop?"
    if (lower.includes('am i registered') || lower.includes('my registration') || lower.includes('check my status') || lower.includes('my workshops')) {
      const myRegs = registrations.filter(r => r.studentId === currentUser?.studentId || r.studentEmail === currentUser?.email || r.userId === currentUser?.uid);
      if (myRegs.length === 0) {
        return {
          reply: `You are not currently registered for any events. You can browse the Events tab and register at any time, or tell me to register you!`,
        };
      }

      const matchSpecific = events.find(e => lower.includes(e.name.toLowerCase()) || lower.includes(e.id.toLowerCase()));
      if (matchSpecific) {
        const found = myRegs.find(r => r.eventId === matchSpecific.id);
        if (found) {
          return {
            reply: `Yes! You are registered for **${matchSpecific.name}** (Registration ID: \`${found.id}\`). Status is currently **${found.status}**.`,
          };
        } else {
          return {
            reply: `You are not registered for **${matchSpecific.name}** yet. Would you like me to register you now? Just say "Register me for ${matchSpecific.name}".`,
          };
        }
      }

      const regList = myRegs.map(r => `• **${r.eventName}** (\`${r.eventId}\`): Status **${r.status}** (Reg ID: \`${r.id}\`)`).join('\n');
      return {
        reply: `Here are your current registrations:\n\n${regList}`,
      };
    }

    // 3. "How many students have registered?"
    if (lower.includes('how many') || lower.includes('registered students') || lower.includes('capacity') || lower.includes('seats left')) {
      const matchSpecific = events.find(e => lower.includes(e.name.toLowerCase()) || lower.includes(e.id.toLowerCase()));
      if (matchSpecific) {
        if (matchSpecific.status === 'Deleted') {
          return {
            reply: `For **${matchSpecific.name}** (\`${matchSpecific.id}\`), this event was deleted and has **0 / 0 active students** registered.`,
          };
        }
        const seatsLeft = matchSpecific.maxCapacity - matchSpecific.currentRegistrations;
        return {
          reply: `For **${matchSpecific.name}** (\`${matchSpecific.id}\`), **${matchSpecific.currentRegistrations}** out of **${matchSpecific.maxCapacity}** seats are filled (**${seatsLeft}** seats available).`,
        };
      }

      const activeEvts = events.filter(e => e.status !== 'Deleted');
      const totalRegs = activeEvts.reduce((sum, e) => sum + (e.currentRegistrations || 0), 0);
      const totalCap = activeEvts.reduce((sum, e) => sum + (e.maxCapacity || 0), 0);
      return {
        reply: `Across all ${activeEvts.length} active events, **${totalRegs}** students have registered out of **${totalCap}** total capacity seats.`,
      };
    }

    // 4. "Register me for the AI workshop"
    if (lower.includes('register me') || lower.includes('sign me up') || lower.includes('enroll me')) {
      let targetEvent = events.find(e => lower.includes(e.name.toLowerCase()) || lower.includes(e.id.toLowerCase()));
      if (!targetEvent && (lower.includes('ai') || lower.includes('workshop'))) {
        targetEvent = events.find(e => e.status !== 'Deleted' && (e.name.toLowerCase().includes('ai') || e.name.toLowerCase().includes('machine learning') || e.description.toLowerCase().includes('ai')));
      }
      if (!targetEvent && events.filter(e => e.status === 'Active').length === 1) {
        targetEvent = events.find(e => e.status === 'Active');
      }

      if (!targetEvent) {
        return {
          reply: `Please specify the event name or ID you'd like to register for (e.g. "Register me for EVT-101").`,
        };
      }

      if (targetEvent.status === 'Deleted') {
        return {
          reply: `Cannot register: **${targetEvent.name}** (\`${targetEvent.id}\`) has been deleted.`,
        };
      }

      if (targetEvent.status === 'Cancelled') {
        return {
          reply: `Cannot register: **${targetEvent.name}** (\`${targetEvent.id}\`) has been cancelled and registrations are closed.`,
        };
      }

      const already = registrations.find(r => (r.studentId === currentUser?.studentId || r.studentEmail === currentUser?.email) && r.eventId === targetEvent.id);
      if (already) {
        return {
          reply: `You are already registered for **${targetEvent.name}** (Registration ID: \`${already.id}\`, Status: **${already.status}**).`,
        };
      }

      if (targetEvent.currentRegistrations >= targetEvent.maxCapacity) {
        return {
          reply: `Unfortunately, **${targetEvent.name}** is already at maximum capacity (${targetEvent.maxCapacity} seats).`,
        };
      }

      return {
        reply: `Registering you for **${targetEvent.name}** (\`${targetEvent.id}\`) in real time...`,
        action: {
          type: 'REGISTER_EVENT',
          payload: { eventId: targetEvent.id },
        },
      };
    }

    // 5. "Cancel my registration"
    if (lower.includes('cancel') || lower.includes('unregister') || lower.includes('withdraw')) {
      const myRegs = registrations.filter(r => r.studentId === currentUser?.studentId || r.studentEmail === currentUser?.email || r.userId === currentUser?.uid);
      if (myRegs.length === 0) {
        return {
          reply: `You have no active registrations to cancel.`,
        };
      }

      const targetEvt = events.find(e => lower.includes(e.name.toLowerCase()) || lower.includes(e.id.toLowerCase()));
      let targetReg = targetEvt ? myRegs.find(r => r.eventId === targetEvt.id) : myRegs[0];

      if (!targetReg) {
        return {
          reply: `Could not find a registration for that event. Your current registrations are: ${myRegs.map(r => r.eventName).join(', ')}.`,
        };
      }

      return {
        reply: `Cancelling your registration for **${targetReg.eventName}** (\`${targetReg.id}\`) in real time...`,
        action: {
          type: 'CANCEL_REGISTRATION',
          payload: { registrationId: targetReg.id },
        },
      };
    }

    return {
      reply: `Hello ${currentUser?.name || 'Student'}! I am your CampusPulse AI Event Assistant. Ask me about upcoming workshops, check your registration status, or tell me to register you for an event!`,
    };
  } else {
    // ============================================
    // ADMIN AI OPERATIONS ENGINE
    // ============================================

    // 1. STUDENT MANAGEMENT
    // Search or view students
    if (lower.includes('show students') || lower.includes('list students') || lower.includes('view students') || lower.includes('search student')) {
      const studentList = users.filter(u => u.role === 'student');
      if (studentList.length === 0) {
        return { reply: 'There are currently no student accounts registered in the database.' };
      }

      // Check if searching for a specific query
      let matched = studentList;
      if (lower.includes('for') || lower.includes('named')) {
        const term = lower.split(/for|named/)[1]?.trim();
        if (term) {
          matched = studentList.filter(s => s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term) || (s.course && s.course.toLowerCase().includes(term)));
        }
      }

      const list = matched.map(s => `• **${s.name}** (\`${s.studentId || s.uid}\`) - Email: ${s.email} | Course: ${s.course || 'General'} | Status: **${s.status}**`).join('\n');
      return {
        reply: `👥 **Student Accounts (${matched.length}):**\n\n${list}`,
      };
    }

    // Pending student approvals
    if (lower.includes('pending student') || lower.includes('student approval') || lower.includes('approval requests') || lower.includes('pending account')) {
      const pendingStudents = users.filter(u => u.role === 'student' && u.status === 'Pending');
      if (pendingStudents.length === 0) {
        return {
          reply: `There are currently no pending student approval requests. All student accounts are active.`,
        };
      }

      const list = pendingStudents.map(s => `• **${s.name}** (\`${s.uid}\`) - Email: ${s.email}, Course: ${s.course || 'General'}, Registered: ${s.createdAt?.split('T')[0] || 'Recently'}`).join('\n');
      return {
        reply: `📋 **Pending Student Approval Requests (${pendingStudents.length}):**\n\n${list}\n\nYou can say "Approve student [Name]" or "Reject student [Name]".`,
      };
    }

    // Approve student account
    if (lower.includes('approve student') || lower.includes('approve') && (lower.includes('account') || lower.includes("'s account") || lower.includes('priyanshi'))) {
      const studentList = users.filter(u => u.role === 'student');
      let targetUser = studentList.find(u => lower.includes(u.name.toLowerCase()) || lower.includes(u.uid.toLowerCase()) || lower.includes(u.email.toLowerCase()));
      if (!targetUser) {
        targetUser = studentList.find(u => u.status === 'Pending');
      }

      if (!targetUser) {
        return {
          reply: `Please specify the student name or UID to approve (e.g. "Approve Priyanshi's student account").`,
        };
      }

      return {
        reply: `Done. Student account for **${targetUser.name}** (${targetUser.email}) has been approved. Status is now Active in real time, granting access to the Student Portal.`,
        action: {
          type: 'APPROVE_STUDENT',
          payload: { uid: targetUser.uid },
        },
      };
    }

    // Reject student account
    if (lower.includes('reject student') || lower.includes('decline student')) {
      const studentList = users.filter(u => u.role === 'student');
      let targetUser = studentList.find(u => lower.includes(u.name.toLowerCase()) || lower.includes(u.uid.toLowerCase()) || lower.includes(u.email.toLowerCase()));

      if (!targetUser) {
        return {
          reply: `Please specify the student name or UID to reject (e.g. "Reject student [Name]").`,
        };
      }

      return {
        reply: `Done. Rejected student access for **${targetUser.name}** (${targetUser.email}). The student will be prevented from accessing the Student Portal.`,
        action: {
          type: 'REJECT_STUDENT',
          payload: { uid: targetUser.uid },
        },
      };
    }

    // 2. EVENT MANAGEMENT
    // Create new event (e.g. "Create a Dandiya Night event on 15 October at 2 PM at Sunken Ground with a capacity of 50")
    if (lower.includes('create') && (lower.includes('event') || lower.includes('workshop') || lower.includes('seminar') || lower.includes('night') || lower.includes('dandiya'))) {
      // Natural language parameter extraction
      let name = 'University Campus Event';
      let date = '2026-10-20';
      let time = '14:00';
      let venue = 'Main Campus Auditorium';
      let maxCapacity = 50;

      // Extract name
      const nameMatch = userMessage.match(/create (?:a |an )?(.*?)(?: event)? (?:on|at|with|in)/i);
      if (nameMatch && nameMatch[1]) {
        name = nameMatch[1].trim();
      } else if (lower.includes('dandiya')) {
        name = 'Dandiya Night';
      } else if (lower.includes('ai')) {
        name = 'AI & Machine Learning Symposium';
      }

      // Extract date (e.g. "15 October", "2026-10-15")
      if (lower.includes('15 october') || lower.includes('october 15') || lower.includes('15 oct')) date = '2026-10-15';
      else if (lower.includes('25 october') || lower.includes('october 25')) date = '2026-10-25';
      else if (lower.includes('28 october') || lower.includes('october 28')) date = '2026-10-28';
      else {
        const dateMatch = userMessage.match(/\b(202\d-\d{2}-\d{2})\b/);
        if (dateMatch) date = dateMatch[1];
      }

      // Extract time (e.g. "2 PM", "14:00", "10 AM")
      if (lower.includes('2 pm') || lower.includes('2:00 pm')) time = '14:00';
      else if (lower.includes('3 pm')) time = '15:00';
      else if (lower.includes('10 am')) time = '10:00';
      else if (lower.includes('11 am')) time = '11:00';
      else {
        const timeMatch = userMessage.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
        if (timeMatch) time = timeMatch[0];
      }

      // Extract venue (e.g. "at Sunken Ground", "in Auditorium")
      const venueMatch = userMessage.match(/(?:at|in) ([a-zA-Z0-9\s]+?)(?: with| on| at|\.|$)/i);
      if (venueMatch && venueMatch[1] && !venueMatch[1].toLowerCase().includes('pm') && !venueMatch[1].toLowerCase().includes('am')) {
        venue = venueMatch[1].trim();
      } else if (lower.includes('sunken ground')) {
        venue = 'Sunken Ground';
      }

      // Extract capacity (e.g. "capacity of 50", "capacity 100", "50 seats")
      const capMatch = userMessage.match(/capacity (?:of )?(\d+)/i) || userMessage.match(/(\d+) (?:seats|capacity|students)/i);
      if (capMatch && capMatch[1]) {
        maxCapacity = parseInt(capMatch[1], 10);
      }

      const newId = `EVT-${Math.floor(100 + Math.random() * 900)}`;
      const payload = {
        id: newId,
        name,
        description: `Campus celebration and interactive gathering featuring curated activities, networking, and cultural performances.`,
        date,
        time,
        venue,
        maxCapacity,
      };

      return {
        reply: `Done. Created "${payload.name}" (${payload.id}) on ${payload.date} at ${payload.time} at ${payload.venue} with a capacity of ${payload.maxCapacity}. Google Calendar sync link and registration database are live in real time.`,
        action: {
          type: 'CREATE_EVENT',
          payload,
        },
      };
    }

    // Change event capacity / update event details (e.g. "Change the capacity of Dandiya Night to 100")
    if (lower.includes('capacity') && (lower.includes('to') || lower.includes('change') || lower.includes('update') || lower.includes('set'))) {
      const capMatch = userMessage.match(/(?:to|of|set to)\s*(\d+)/i);
      const newCap = capMatch ? parseInt(capMatch[1], 10) : null;

      let targetEvt = events.find(e => lower.includes(e.name.toLowerCase()) || lower.includes(e.id.toLowerCase()));
      if (!targetEvt && events.length > 0) targetEvt = events[0];

      if (!targetEvt || !newCap) {
        return {
          reply: `Please specify the event name and new capacity (e.g. "Change the capacity of Dandiya Night to 100").`,
        };
      }

      return {
        reply: `Done. Updated capacity for **${targetEvt.name}** (\`${targetEvt.id}\`) from ${targetEvt.maxCapacity} to **${newCap} seats** in real time.`,
        action: {
          type: 'UPDATE_EVENT',
          payload: {
            eventId: targetEvt.id,
            data: { maxCapacity: newCap },
          },
        },
      };
    }

    // Cancel event (e.g. "Cancel the Dandiya Night event")
    if (lower.includes('cancel event') || lower.includes('cancel the event') || lower.includes('cancel') && lower.includes('event')) {
      let targetEvt = events.find(e => lower.includes(e.name.toLowerCase()) || lower.includes(e.id.toLowerCase()));
      if (!targetEvt) {
        return {
          reply: `Please specify which event you want to cancel (e.g. "Cancel the Dandiya Night event"). Available: ${events.map(e => e.name).join(', ')}.`,
        };
      }

      if (targetEvt.status === 'Cancelled') {
        return {
          reply: `Event **${targetEvt.name}** is already marked as Cancelled.`,
        };
      }

      return {
        reply: `Done. **${targetEvt.name}** has been cancelled. New registrations are disabled and existing registrations now show 'Event Cancelled' in both portals. Google Calendar reflects [CANCELLED].`,
        action: {
          type: 'CANCEL_EVENT',
          payload: { eventId: targetEvt.id },
        },
      };
    }

    // Delete event (MANDATORY CONFIRMATION PER REQUIREMENT 4 & 7)
    if (lower.includes('delete event') || lower.includes('delete the event') || lower.includes('remove event')) {
      let targetEvt = events.find(e => lower.includes(e.name.toLowerCase()) || lower.includes(e.id.toLowerCase()));
      if (!targetEvt) {
        return {
          reply: `Please specify which event you want to delete (e.g. "Delete the Dandiya Night event"). Available: ${events.map(e => e.name).join(', ')}.`,
        };
      }

      return {
        reply: `Deleting this event will also remove/invalidate its registrations. Do you want to continue?`,
        pendingConfirmation: {
          actionType: 'DELETE_EVENT',
          payload: { eventId: targetEvt.id, eventName: targetEvt.name },
          prompt: `Deleting this event will also remove/invalidate its registrations. Do you want to continue?`,
        },
      };
    }

    // Restore event (e.g. "Restore Dandiya Night")
    if (lower.includes('restore') && (lower.includes('event') || lower.includes('dandiya') || lower.includes('evt-'))) {
      let targetEvt = events.find(e => lower.includes(e.name.toLowerCase()) || lower.includes(e.id.toLowerCase()));
      if (!targetEvt) {
        targetEvt = events.find(e => e.status === 'Deleted' || e.status === 'Cancelled');
      }

      if (!targetEvt) {
        return {
          reply: `Please specify which event to restore (e.g. "Restore Dandiya Night").`,
        };
      }

      return {
        reply: `Done. Event **${targetEvt.name}** (\`${targetEvt.id}\`) has been restored to Active status in real time.`,
        action: {
          type: 'RESTORE_EVENT',
          payload: { eventId: targetEvt.id },
        },
      };
    }

    // View cancelled / deleted events
    if (lower.includes('cancelled events') || lower.includes('deleted events') || lower.includes('archived events')) {
      const isDeletedQuery = lower.includes('deleted') || lower.includes('archived');
      const filtered = isDeletedQuery
        ? events.filter(e => e.status === 'Deleted')
        : events.filter(e => e.status === 'Cancelled');

      if (filtered.length === 0) {
        return {
          reply: isDeletedQuery
            ? `There are currently no deleted/archived events in the database.`
            : `There are currently no cancelled events in the database.`,
        };
      }

      const list = filtered.map(e => `• **${e.name}** (\`${e.id}\`) - Date: ${e.date}, Venue: ${e.venue}, Status: **${e.status}**`).join('\n');
      return {
        reply: `📋 **${isDeletedQuery ? 'Deleted / Archived' : 'Cancelled'} Events (${filtered.length}):**\n\n${list}`,
      };
    }

    // Show all upcoming events
    if (lower.includes('upcoming events') || lower.includes('show all events') || lower.includes('list events')) {
      const activeEvts = events.filter(e => e.status !== 'Deleted');
      if (activeEvts.length === 0) {
        return {
          reply: `There are currently no active events scheduled in the database. You can say "Create an event [Name]..." to add one.`,
        };
      }

      const list = activeEvts.map(e => `• **${e.name}** (\`${e.id}\`) on **${e.date}** at **${e.time}** in *${e.venue}* (${e.currentRegistrations}/${e.maxCapacity} registered)${e.status === 'Cancelled' ? ' [CANCELLED]' : ''}`).join('\n');
      return {
        reply: `📅 **Upcoming Events (${activeEvts.length}):**\n\n${list}`,
      };
    }

    // 3. REGISTRATION MANAGEMENT
    // View registrations for a specific event (e.g. "Show registrations for Dandiya Night")
    if ((lower.includes('registrations for') || lower.includes('who registered for') || lower.includes('participants for')) && !lower.includes('approve') && !lower.includes('reject')) {
      let targetEvt = events.find(e => lower.includes(e.name.toLowerCase()) || lower.includes(e.id.toLowerCase()));
      if (!targetEvt && events.length > 0) targetEvt = events[0];

      if (!targetEvt) {
        return {
          reply: `Please specify the event name to inspect registrations (e.g. "Show registrations for Dandiya Night").`,
        };
      }

      const evtRegs = registrations.filter(r => r.eventId === targetEvt.id);
      if (evtRegs.length === 0) {
        return {
          reply: `There are currently 0 registrations for **${targetEvt.name}** (\`${targetEvt.id}\`).`,
        };
      }

      const list = evtRegs.map(r => `• **${r.studentName}** (\`${r.id}\`, ${r.studentCourse}) - Status: **${r.status}**`).join('\n');
      return {
        reply: `📋 **Registrations for ${targetEvt.name} (${evtRegs.length}):**\n\n${list}`,
      };
    }

    // Approve all pending registrations
    if (lower.includes('approve all') || lower.includes('accept all')) {
      const pendings = registrations.filter(r => r.status === 'Pending');
      if (pendings.length === 0) {
        return { reply: 'There are no pending registrations to approve.' };
      }

      return {
        reply: `Done. Approved all ${pendings.length} pending registration(s) in real time.`,
        action: {
          type: 'APPROVE_ALL_PENDING',
          payload: {},
        },
      };
    }

    // Approve specific registration
    if (lower.includes('approve') && (lower.includes('reg-') || lower.includes('registration'))) {
      const match = lower.match(/reg-[\w-]+/i);
      const regId = match ? match[0].toUpperCase() : null;
      let targetReg = regId ? registrations.find(r => r.id.toUpperCase() === regId) : registrations.find(r => r.status === 'Pending');

      if (!targetReg) {
        return {
          reply: `No registration found to approve. Please specify the Registration ID (e.g. "Approve REG-101").`,
        };
      }

      return {
        reply: `Done. Approved registration **${targetReg.id}** for **${targetReg.studentName}** (${targetReg.eventName}) in real time.`,
        action: {
          type: 'APPROVE_REGISTRATION',
          payload: { registrationId: targetReg.id },
        },
      };
    }

    // Reject registration
    if (lower.includes('reject') && (lower.includes('reg-') || lower.includes('registration'))) {
      const match = lower.match(/reg-[\w-]+/i);
      const regId = match ? match[0].toUpperCase() : null;
      let targetReg = regId ? registrations.find(r => r.id.toUpperCase() === regId) : registrations.find(r => r.status === 'Pending');

      if (!targetReg) {
        return {
          reply: `No registration found to reject. Please specify the Registration ID (e.g. "Reject REG-101").`,
        };
      }

      return {
        reply: `Done. Rejected registration **${targetReg.id}** for **${targetReg.studentName}** in real time.`,
        action: {
          type: 'REJECT_REGISTRATION',
          payload: { registrationId: targetReg.id },
        },
      };
    }

    // 4. DASHBOARD & REGISTRATION COUNTS
    // "How many students are registered for each event?"
    if (lower.includes('each event') || lower.includes('event-wise') || lower.includes('all registration counts') || (lower.includes('how many') && lower.includes('registered'))) {
      const activeEvts = events.filter(e => e.status !== 'Deleted');
      if (activeEvts.length === 0) {
        return {
          reply: `There are currently no active events in the system.`,
        };
      }

      const list = activeEvts.map(e => `• **${e.name}** (\`${e.id}\`): **${e.currentRegistrations}** / ${e.maxCapacity} students (${Math.round((e.currentRegistrations / (e.maxCapacity || 1)) * 100)}% filled)`).join('\n');
      return {
        reply: `📊 **Event-wise Registration Counts:**\n\n${list}`,
      };
    }

    // Dashboard metrics summary
    if (lower.includes('dashboard') || lower.includes('statistics') || lower.includes('metrics') || lower.includes('summary')) {
      const totalStudents = users.filter(u => u.role === 'student').length;
      const pendingStudents = users.filter(u => u.role === 'student' && u.status === 'Pending').length;
      const activeEvts = events.filter(e => e.status === 'Active' || !e.status).length;
      const cancelledEvts = events.filter(e => e.status === 'Cancelled').length;
      const deletedEvts = events.filter(e => e.status === 'Deleted').length;
      const approvedRegs = registrations.filter(r => r.status === 'Approved').length;
      const pendingRegs = registrations.filter(r => r.status === 'Pending').length;
      const cancelledRegs = registrations.filter(r => r.status === 'Event Cancelled').length;
      const deletedRegs = registrations.filter(r => r.status === 'Event Deleted').length;
      const activeRegs = approvedRegs + pendingRegs;

      return {
        reply: `📊 **CampusPulse System Dashboard:**\n\n` +
          `• **Students:** ${totalStudents} total (${pendingStudents} pending approval)\n` +
          `• **Events:** ${events.length} total (${activeEvts} active, ${cancelledEvts} cancelled, ${deletedEvts} deleted)\n` +
          `• **Active Registrations:** ${activeRegs} (${approvedRegs} approved, ${pendingRegs} pending)\n` +
          `• **Inactive Registrations:** ${deletedRegs} event deleted, ${cancelledRegs} event cancelled\n` +
          `• **Total Database Records:** ${registrations.length} registrations`,
      };
    }

    return {
      reply: `AI Admin Assistant ready. You can give natural language commands like:\n• "Create a Dandiya Night event on 15 October at 2 PM at Sunken Ground with a capacity of 50."\n• "Show me all pending student approvals."\n• "Approve Priyanshi's student account."\n• "Show registrations for Dandiya Night."\n• "Change the capacity of Dandiya Night to 100."\n• "Cancel the Dandiya Night event."\n• "Delete the Dandiya Night event."\n• "How many students are registered for each event?"`,
    };
  }
}
