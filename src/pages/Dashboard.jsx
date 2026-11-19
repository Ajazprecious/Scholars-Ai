import { useState, useEffect } from 'react';
import { learningApi } from '@/api/client';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Clock, CheckCircle, FileText, TrendingUp, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import UploadModal from '@/components/UploadModal';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [history, setHistory] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');

  const fetchDocuments = async () => {
    setLoading(true);
    try { const [docs, recent] = await Promise.all([learningApi.documents(), learningApi.history()]); setDocuments(docs); setHistory(recent); setLoadError(''); } catch (error) { setLoadError(error.message || 'Unable to load your study materials.'); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const totalCompleted = documents.filter(d => Number(d.completion_percentage) === 100).length;
  const inProgress = documents.filter(d => Number(d.completion_percentage) > 0 && Number(d.completion_percentage) < 100).length;
  const subjects = [...new Set(documents.map(d => d.subject).filter(Boolean))].sort();
  const visibleDocuments = selectedSubject === 'all' ? documents : documents.filter(d => d.subject === selectedSubject);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-primary tracking-tight">AJAZ AI</span>
          </div>
          <Button onClick={() => setShowUpload(true)} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" />
            Upload Document
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-1">Your Study Dashboard</h1>
          <p className="text-muted-foreground">Upload your notes and let AJAZ AI teach you, step by step.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {[
            { label: 'Total Documents', value: documents.length, icon: FileText, color: 'text-blue-600 bg-blue-50' },
            { label: 'Completed', value: totalCompleted, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
            { label: 'In Progress', value: inProgress, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-border p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent learning activity */}
        {history.length > 0 && <section className="mb-10" aria-labelledby="recent-activity-title"><h2 id="recent-activity-title" className="text-lg font-semibold text-foreground mb-4">Recent Learning Activity</h2><div className="bg-white rounded-2xl border border-border divide-y divide-border">{history.slice(0,5).map(item=><div key={item.id} className="p-4 flex items-center justify-between gap-4"><div className="min-w-0"><p className="font-medium text-sm truncate">{item.document_title} · {item.heading_title}</p><p className="text-xs text-muted-foreground mt-1">{item.difficulty==='easy'?'Easy':'Advanced'} assessment · {item.created_at?format(new Date(item.created_at),'MMM d, yyyy'):''}</p></div><span className={`text-xs font-semibold rounded-full px-2.5 py-1 shrink-0 ${item.passed?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700'}`}>{Math.round((Number(item.score)/Math.max(1,Number(item.total_questions)))*100)}% · {item.passed?'Passed':'Retry'}</span></div>)}</div></section>}

        {/* Documents */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap"><h2 className="text-lg font-semibold text-foreground">Your Documents</h2>{subjects.length>0&&<label className="text-sm text-muted-foreground flex items-center gap-2">Subject <select value={selectedSubject} onChange={e=>setSelectedSubject(e.target.value)} className="border border-border rounded-lg bg-white px-3 py-2 text-foreground"><option value="all">All subjects</option>{subjects.map(subject=><option key={subject} value={subject}>{subject}</option>)}</select></label>}</div>
          {loadError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{loadError} <button className="underline ml-2" onClick={fetchDocuments}>Try again</button></div> : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-border p-6 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-6" />
                  <div className="h-2 bg-muted rounded w-full" />
                </div>
              ))}
            </div>
          ) : visibleDocuments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-border p-16 text-center">
              <BookOpen className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Upload your lecture notes, textbook chapters, or any study material to get started.</p>
              <Button onClick={() => setShowUpload(true)} className="bg-primary hover:bg-primary/90 gap-2">
                <Plus className="w-4 h-4" />
                Upload Your First Document
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleDocuments.map(doc => (
                <Link key={doc.id} to={`/document/${doc.id}`} className="group bg-white rounded-2xl border border-border p-6 hover:shadow-md hover:border-primary/30 transition-all duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      doc.status === 'ready' ? 'bg-green-50 text-green-700' :
                      doc.status === 'processing' ? 'bg-amber-50 text-amber-700' :
                      doc.status === 'error' ? 'bg-red-50 text-red-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {doc.status === 'ready' ? 'Ready' : doc.status === 'processing' ? 'Processing...' : doc.status === 'error' ? 'Error' : 'Uploading'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2">{doc.title}</h3>
                  {doc.subject && <p className="text-xs text-muted-foreground mb-3">{doc.subject}</p>}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span>{doc.sections_completed || 0}/{doc.total_sections || 0} sections</span>
                      <span>{Math.round(doc.completion_percentage || 0)}%</span>
                    </div>
                    <Progress value={doc.completion_percentage || 0} className="h-1.5" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {(doc.created_at || doc.created_date) ? format(new Date(doc.created_at || doc.created_date), 'MMM d, yyyy') : 'Just uploaded'}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={(documentId) => { setShowUpload(false); fetchDocuments(); navigate(`/document/${documentId}`); }}
        />
      )}
    </div>
  );
}