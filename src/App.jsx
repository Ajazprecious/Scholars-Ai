import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import PageNotFound from '@/lib/PageNotFound';
import Dashboard from '@/pages/Dashboard';
import DocumentView from '@/pages/DocumentView';
import SectionLesson from '@/pages/SectionLesson';
import QuizPage from '@/pages/QuizPage';
import SectionResults from '@/pages/SectionResults';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import VerifyEmail from '@/pages/VerifyEmail';

function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/document/:docId" element={<DocumentView />} />
      <Route path="/section/:sectionId" element={<SectionLesson />} />
      <Route path="/quiz/:sectionId/:difficulty" element={<QuizPage />} />
      <Route path="/section/:sectionId/results" element={<SectionResults />} />
    </Route>
    <Route path="*" element={<PageNotFound />} />
  </Routes>;
}

export default function App() {
  return <AuthProvider><QueryClientProvider client={queryClientInstance}><Router><AppRoutes /></Router><Toaster /></QueryClientProvider></AuthProvider>;
}
