import { Link, useLocation } from 'react-router-dom';
export default function PageNotFound() {
  const location = useLocation();
  return <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50"><div className="max-w-md w-full text-center space-y-5"><h1 className="text-7xl font-light text-slate-300">404</h1><h2 className="text-2xl font-medium text-slate-800">Page Not Found</h2><p className="text-slate-600">The page <strong>{location.pathname}</strong> could not be found.</p><Link className="inline-flex px-4 py-2 rounded-lg bg-white border" to="/">Go to dashboard</Link></div></main>;
}
