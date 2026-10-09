import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { handleAiChatRequest } from './src/server/aiHandler.ts';
import { sendEmailNotification, isEmailServiceConfigured } from './src/server/emailService.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API route for AI Assistant
app.post('/api/ai-chat', async (req, res) => {
  try {
    const result = await handleAiChatRequest(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// API routes for Real Email Service
app.get('/api/email-status', (_req, res) => {
  res.json({
    configured: isEmailServiceConfigured(),
    host: process.env.SMTP_HOST || null,
  });
});

app.post('/api/send-email', async (req, res) => {
  try {
    const result = await sendEmailNotification(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Email API Error:', error);
    res.status(500).json({
      success: false,
      configured: false,
      error: error.message || 'Email delivery failed',
    });
  }
});

// Serve static frontend in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
