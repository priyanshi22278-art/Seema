import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bot,
  Send,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  Ban,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { ChatMessage } from '../types';

export const AiAssistant: React.FC = () => {
  const {
    currentUser,
    userRole,
    events,
    registrations,
    users,
    registerForEvent,
    updateRegistrationStatus,
    deleteRegistration,
    createEvent,
    updateEvent,
    cancelEvent,
    deleteEvent,
    restoreEvent,
    approveStudent,
    rejectStudent,
    setStudentStatus,
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePendingConfirmation, setActivePendingConfirmation] = useState<{
    actionType: string;
    payload: Record<string, any>;
    prompt: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize role-specific welcome message
  useEffect(() => {
    if (messages.length === 0) {
      if (userRole === 'student') {
        setMessages([
          {
            id: 'welcome-stu',
            sender: 'ai',
            text: `Hello ${currentUser?.name || 'there'}! I'm your CampusPulse Event AI Assistant. Ask me anything about upcoming workshops, your registration status, or say "Register me for [Workshop Name]"!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        setMessages([
          {
            id: 'welcome-adm',
            sender: 'ai',
            text: `Welcome Administrator ${currentUser?.name || ''}. I'm connected to the live Firestore database. I can create, edit, cancel or delete events, manage student approval requests, and approve or reject registrations in real time.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    }
  }, [userRole, currentUser]);

  // Auto scroll
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, activePendingConfirmation]);

  // Confirm permanent deletion handler
  const handleConfirmDeleteEvent = async (payload: { eventId: string; eventName?: string }) => {
    try {
      await deleteEvent(payload.eventId);
      setActivePendingConfirmation(null);

      const confirmMsg: ChatMessage = {
        id: `ai-deleted-${Date.now()}`,
        sender: 'ai',
        text: `Confirmed: Event ${payload.eventId} (${payload.eventName || 'Event'}) has been marked as Deleted. All related registrations have automatically changed to 'Event Deleted' status, active registration count set to 0, and all portals and dashboard have been updated in real time.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionSummary: `Event ${payload.eventId} marked Deleted & registrations invalidated (active count: 0)`,
      };
      setMessages((prev) => [...prev, confirmMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: `Error deleting event: ${err.message || 'Operation failed'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const handleCancelPendingConfirmation = () => {
    setActivePendingConfirmation(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `ai-abort-${Date.now()}`,
        sender: 'ai',
        text: 'Event deletion was cancelled. The event and all related student registrations have been preserved intact.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSend = async (messageText?: string) => {
    const queryText = (messageText || input).trim();
    if (!queryText || loading) return;

    // Handle text-based confirmation if pending
    if (activePendingConfirmation) {
      const lower = queryText.toLowerCase();
      if (lower === 'yes' || lower === 'confirm' || lower === 'continue' || lower === 'delete' || lower === 'proceed') {
        setInput('');
        await handleConfirmDeleteEvent(activePendingConfirmation.payload as any);
        return;
      } else if (lower === 'no' || lower === 'cancel' || lower === 'stop') {
        setInput('');
        handleCancelPendingConfirmation();
        return;
      }
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: queryText,
          userRole,
          currentUser,
          events,
          registrations,
          users,
          history: messages.slice(-4).map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
        }),
      });

      const data = await response.json();
      let actionSummary = '';

      // Check if response requires delete confirmation
      if (data.pendingConfirmation) {
        setActivePendingConfirmation(data.pendingConfirmation);
      }

      // Execute AI action if instructed and authorized
      if (data.action) {
        const actionType = data.action.type;
        const payload = data.action.payload || {};

        // Security Enforcement: Students cannot execute admin actions
        const adminActions = [
          'CREATE_EVENT',
          'UPDATE_EVENT',
          'CANCEL_EVENT',
          'DELETE_EVENT_CONFIRM_REQUEST',
          'CONFIRMED_DELETE_EVENT',
          'RESTORE_EVENT',
          'APPROVE_REGISTRATION',
          'REJECT_REGISTRATION',
          'APPROVE_ALL_PENDING',
          'APPROVE_STUDENT',
          'REJECT_STUDENT',
          'SET_STUDENT_STATUS',
          'UPDATE_EVENT_STATUS',
        ];

        if (userRole === 'student' && adminActions.includes(actionType)) {
          actionSummary = 'Action blocked: Admin privileges required';
        } else {
          switch (actionType) {
            case 'REGISTER_EVENT': {
              if (payload.eventId) {
                const targetEvt = events.find((e) => e.id === payload.eventId);
                if (targetEvt) {
                  const result = await registerForEvent(targetEvt.id, {
                    name: currentUser?.name || 'Student',
                    email: currentUser?.email || 'student@university.edu',
                    course: currentUser?.course || 'General',
                    studentId: currentUser?.studentId,
                  });
                  actionSummary = `Auto-registered for ${targetEvt.name} (Reg: ${result.registrationId}, Student: ${result.studentId})`;
                }
              }
              break;
            }

            case 'CANCEL_REGISTRATION': {
              if (payload.registrationId) {
                await deleteRegistration(payload.registrationId);
                actionSummary = `Withdrew registration ${payload.registrationId} in real time`;
              }
              break;
            }

            case 'APPROVE_REGISTRATION': {
              if (payload.registrationId) {
                await updateRegistrationStatus(payload.registrationId, 'Approved');
                actionSummary = `Approved Registration ${payload.registrationId}`;
              }
              break;
            }

            case 'REJECT_REGISTRATION': {
              if (payload.registrationId) {
                await updateRegistrationStatus(payload.registrationId, 'Rejected');
                actionSummary = `Rejected Registration ${payload.registrationId}`;
              }
              break;
            }

            case 'APPROVE_ALL_PENDING': {
              const pendings = registrations.filter((r) => r.status === 'Pending');
              for (const reg of pendings) {
                await updateRegistrationStatus(reg.id, 'Approved');
              }
              actionSummary = `Approved all ${pendings.length} pending registration(s)`;
              break;
            }

            case 'CREATE_EVENT': {
              if (payload.name) {
                await createEvent(payload);
                actionSummary = `Created Event "${payload.name}" in real time`;
              }
              break;
            }

            case 'UPDATE_EVENT': {
              if (payload.eventId && payload.data) {
                await updateEvent(payload.eventId, payload.data);
                actionSummary = `Updated Event ${payload.eventId} in real time`;
              }
              break;
            }

            case 'CANCEL_EVENT': {
              if (payload.eventId) {
                await cancelEvent(payload.eventId);
                actionSummary = `Cancelled Event ${payload.eventId} & updated related registrations in real time`;
              }
              break;
            }

            case 'DELETE_EVENT_CONFIRM_REQUEST': {
              // Ask for confirmation per Requirement 4
              setActivePendingConfirmation({
                actionType: 'DELETE_EVENT',
                payload,
                prompt: 'Deleting this event will also remove/invalidate its registrations. Do you want to continue?',
              });
              break;
            }

            case 'CONFIRMED_DELETE_EVENT': {
              if (payload.eventId) {
                await deleteEvent(payload.eventId);
                actionSummary = `Marked Event ${payload.eventId} Deleted & invalidated related registrations (active count: 0)`;
              }
              break;
            }

            case 'RESTORE_EVENT': {
              if (payload.eventId) {
                await restoreEvent(payload.eventId);
                actionSummary = `Restored Event ${payload.eventId} to Active status`;
              }
              break;
            }

            case 'APPROVE_STUDENT': {
              if (payload.uid) {
                await approveStudent(payload.uid);
                const targetStu = users.find((u) => u.uid === payload.uid);
                actionSummary = `Approved student account ${targetStu?.name || payload.uid} (Active)`;
              }
              break;
            }

            case 'REJECT_STUDENT': {
              if (payload.uid) {
                await rejectStudent(payload.uid);
                const targetStu = users.find((u) => u.uid === payload.uid);
                actionSummary = `Rejected student account ${targetStu?.name || payload.uid}`;
              }
              break;
            }

            case 'SET_STUDENT_STATUS': {
              if (payload.uid && payload.status) {
                await setStudentStatus(payload.uid, payload.status);
                actionSummary = `Updated student status to ${payload.status}`;
              }
              break;
            }

            default:
              break;
          }
        }
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.reply || "I've processed your request.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionSummary,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: 'I encountered an issue processing your request. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const studentQuickPrompts = [
    'Which AI workshops are happening this month?',
    'Am I registered for the business analytics workshop?',
    'How many students have registered?',
    'Register me for the AI workshop.',
    'Cancel my registration',
  ];

  const adminQuickPrompts = [
    'How many registrations are for this event?',
    'Show pending student approval requests',
    'Approve all pending registrations',
    'Create an AI workshop event',
    'Cancel an event',
    'Delete an event',
  ];

  const quickPrompts = userRole === 'student' ? studentQuickPrompts : adminQuickPrompts;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center space-x-2.5 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-blue-600 animate-pulse" />
        </div>
        <span className="font-semibold text-sm">
          {userRole === 'student' ? 'AI Event Assistant' : 'Admin AI Agent'}
        </span>
        <Sparkles className="w-4 h-4 text-blue-200 group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden ${
        isMinimized ? 'w-80 h-16' : 'w-96 sm:w-[440px] h-[600px] max-h-[85vh]'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3.5 bg-blue-600 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-blue-700 rounded-lg">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
              <span>{userRole === 'student' ? 'CampusPulse Student AI' : 'Operations AI Agent'}</span>
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            </h3>
            <span className="text-[11px] text-blue-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Real-time Firestore Connected
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-blue-700/60 rounded text-blue-100 hover:text-white transition-colors"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-blue-700/60 rounded text-blue-100 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-bl-xs shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  {msg.actionSummary && (
                    <div className="mt-2 pt-2 border-t border-blue-100 dark:border-slate-700 flex items-center space-x-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{msg.actionSummary}</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* INTERACTIVE DELETE CONFIRMATION CARD (Requirement 4) */}
            {activePendingConfirmation && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 space-y-2.5 animate-in fade-in zoom-in-95">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold leading-snug">
                      {activePendingConfirmation.prompt}
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                      Event ID: <strong className="font-mono">{activePendingConfirmation.payload?.eventId}</strong>
                      {activePendingConfirmation.payload?.eventName && ` (${activePendingConfirmation.payload.eventName})`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => handleConfirmDeleteEvent(activePendingConfirmation.payload as any)}
                    className="flex-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Continue & Delete</span>
                  </button>
                  <button
                    onClick={handleCancelPendingConfirmation}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 p-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                <span>AI is searching campus records...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <HelpCircle className="w-3 h-3 text-blue-500" />
              <span>Suggested Inquiries</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 transition-colors text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  activePendingConfirmation
                    ? 'Type "yes" to confirm deletion or "cancel"...'
                    : userRole === 'student'
                    ? 'Ask about events or say "Register me for..."'
                    : 'Query registrations, approve/reject, create/cancel event...'
                }
                className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
