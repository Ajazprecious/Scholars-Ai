import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '@/api/client';
import AuthLayout from '@/components/AuthLayout';
import { Mail, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your email address...');
  useEffect(() => {
    let active = true;
    if (!token) { setStatus('error'); setMessage('This verification link is incomplete.'); return; }
    authApi.verifyEmail(token).then((result) => {
      if (active) { setStatus('success'); setMessage(result.message || 'Your email has been verified.'); }
    }).catch((error) => {
      if (active) { setStatus('error'); setMessage(error.message || 'This verification link is invalid or expired.'); }
    });
    return () => { active = false; };
  }, [token]);
  const Icon = status === 'success' ? CheckCircle2 : status === 'error' ? AlertTriangle : Mail;
  return <AuthLayout icon={Icon} title={status === 'success' ? 'Email verified' : status === 'error' ? 'Verification failed' : 'Verifying email'} subtitle={message}>
    {status === 'loading' && <div className="flex justify-center"><Loader2 className="animate-spin" /></div>}
    {status === 'success' && <Button asChild className="w-full"><Link to="/login">Continue to log in</Link></Button>}
    {status === 'error' && <Button asChild className="w-full"><Link to="/register">Back to registration</Link></Button>}
  </AuthLayout>;
}
