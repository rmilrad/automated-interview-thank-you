import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FAST = 'claude-haiku-4-5-20251001';
const SMART = 'claude-sonnet-4-6';

function extractJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in model output: ' + text.slice(0, 200));
  return JSON.parse(match[0]) as T;
}

export type Classification = {
  isInterview: boolean;
  company: string | null;
  role: string | null;
  confidence: number;
};

export async function classifyEmail(subject: string, from: string, snippet: string): Promise<Classification> {
  const res = await client.messages.create({
    model: FAST,
    max_tokens: 300,
    system:
      'You classify whether an email is part of a job-interview / recruiting process for the recipient (a candidate). ' +
      'Reply ONLY with JSON: {"isInterview": boolean, "company": string|null, "role": string|null, "confidence": number between 0 and 1}. ' +
      'Marketing job-board blasts, newsletters, and "apply to 1000 jobs" spam are NOT interviews (isInterview=false).',
    messages: [
      {
        role: 'user',
        content: `From: ${from}\nSubject: ${subject}\nSnippet: ${snippet}`,
      },
    ],
  });
  const text = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('');
  return extractJson<Classification>(text);
}

export async function summarizeThread(subject: string, messages: string[]): Promise<string> {
  const res = await client.messages.create({
    model: FAST,
    max_tokens: 400,
    system:
      'Summarize this interview-related email thread in 2-3 sentences for the candidate. ' +
      'Focus on: who they spoke with, the role/company, current stage, and any next steps or action items.',
    messages: [{ role: 'user', content: `Subject: ${subject}\n\n${messages.join('\n---\n')}` }],
  });
  return res.content.map((c) => (c.type === 'text' ? c.text : '')).join('').trim();
}

export type ThankYou = {
  emailSubject: string;
  emailText: string;
  cardMessage: string;
};

export async function draftThankYou(opts: {
  company: string;
  role: string | null;
  recipientName: string | null;
  interviewTitle: string;
  senderName: string;
}): Promise<ThankYou> {
  const res = await client.messages.create({
    model: SMART,
    max_tokens: 700,
    system:
      'You write warm, concise, professional post-interview thank-you notes. ' +
      'Return ONLY JSON: {"emailSubject": string, "emailText": string, "cardMessage": string}. ' +
      'emailText: 2 short paragraphs thanking them for their time, referencing the role/company, expressing interest in next steps. ' +
      'cardMessage: 1-2 sentences for a digital thank-you card (more visual, slightly warmer). ' +
      'Do not invent specific details that were not provided. Keep it genuine, not effusive.',
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          company: opts.company,
          role: opts.role,
          recipientName: opts.recipientName,
          interviewTitle: opts.interviewTitle,
          senderName: opts.senderName,
        }),
      },
    ],
  });
  const text = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('');
  return extractJson<ThankYou>(text);
}
