import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { emailTemplate } from '../_shared/email-template.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });

    const { to, subject, content, cta, emailType, metadata, retryLogId } = await req.json();

    let recipient = to;
    let mailSubject = subject;
    let mailContent = content;
    let mailCta = cta;
    let type = emailType || 'notification';

    if (retryLogId) {
      const { data: log } = await supabase.from('email_logs').select('*').eq('id', retryLogId).single();
      if (!log) return Response.json({ error: 'Log not found' }, { status: 404, headers: corsHeaders });
      recipient = log.recipient_email;
      mailSubject = log.subject;
      // We assume body_html already has the template applied if it's coming from a log
      // But for simplicity in this function, we expect the raw content if not retry
    }

    const htmlBody = retryLogId ? mailContent : emailTemplate(mailContent, mailCta);

    if (!RESEND_API_KEY) {
       await supabase.rpc('log_email_message', {
        p_recipient_email: recipient,
        p_subject: mailSubject,
        p_body_html: htmlBody,
        p_email_type: type,
        p_status: 'failed',
        p_error_message: 'RESEND_API_KEY not configured'
      });
      return Response.json({ error: 'Email provider not configured' }, { status: 500, headers: corsHeaders });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Icons <notifications@theicons.co.ke>', // Replace with verified domain
        to: [recipient],
        subject: mailSubject,
        html: htmlBody,
      }),
    });

    const resData = await res.json();

    if (res.ok) {
      if (retryLogId) {
         await supabase.from('email_logs').update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            provider_message_id: resData.id,
            error_message: null
         }).eq('id', retryLogId);
      } else {
        await supabase.rpc('log_email_message', {
            p_recipient_email: recipient,
            p_subject: mailSubject,
            p_body_html: htmlBody,
            p_email_type: type,
            p_status: 'sent',
            p_provider_message_id: resData.id,
            p_metadata: metadata || {}
        });
      }

      return Response.json({ success: true, id: resData.id }, { headers: corsHeaders });
    } else {
      const errorMsg = resData.message || 'Failed to send email';
      if (!retryLogId) {
        await supabase.rpc('log_email_message', {
            p_recipient_email: recipient,
            p_subject: mailSubject,
            p_body_html: htmlBody,
            p_email_type: type,
            p_status: 'failed',
            p_error_message: errorMsg,
            p_metadata: metadata || {}
        });
      } else {
        await supabase.from('email_logs').update({
            status: 'failed',
            error_message: errorMsg
         }).eq('id', retryLogId);
      }
      return Response.json({ error: errorMsg }, { status: 400, headers: corsHeaders });
    }

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
});
