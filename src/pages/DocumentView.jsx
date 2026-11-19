import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { learningApi } from '@/api/client';
import { Brain, ChevronLeft, ChevronRight, BookOpen, CheckCircle, Lock, Clock, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function DocumentView() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [sections, setSections] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [detail, atts] = await Promise.all([learningApi.document(docId), learningApi.attempts(docId)]);
      setDocument(detail.document);
      setSections(detail.sections);
      setAttempts(atts);
      setLoading(false);
    };
    load();
  }, [docId]);

  const getSectionStatus = (sec) => {
    const secAttempts = attempts.filter(a => a.section_id === sec.id);
    const hasEasy = secAttempts.some(a => a.difficulty === 'easy' && a.passed);
    const hasAdvanced = secAttempts.some(a => a.difficulty === 'advanced' && a.passed);
    if (hasEasy && hasAdvanced) return 'completed';
    if (secAttempts.length > 0 || sec.status === 'generated') return 'in_progress';
    return 'locked';
  };

  const isUnlocked = () => true;

  const deleteDocument = async () => {
    if (!window.confirm('Delete this study material and its lessons and quiz history? This cannot be undone.')) return;
    setDeleting(true);
    try { await learningApi.deleteDocument(docId); navigate('/'); }
    catch (error) { window.alert(error.message || 'Unable to delete this document.'); setDeleting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );

  const completedCount = sections.filter(s => getSectionStatus(s) === 'completed').length;
  const progress = sections.length ? Math.round((completedCount / sections.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-primary text-lg hidden sm:block">AJAZ AI</span>
          </div>
          <div className="text-sm text-muted-foreground">{completedCount}/{sections.length} sections</div>
          <button type="button" onClick={deleteDocument} disabled={deleting} className="ml-3 inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 disabled:opacity-50" aria-label="Delete this study material"><Trash2 className="w-4 h-4" />{deleting?'Deleting…':'Delete'}</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{document?.title}</h1>
              {document?.subject && <p className="text-muted-foreground text-sm mt-0.5">{document.subject}</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-foreground">Course Completion</span>
              <span className="text-muted-foreground">{completedCount} of {sections.length} sections mastered</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">A section is mastered when you pass both the Easy and Advanced quizzes.</p>
          </div>
        </div>

        <h2 className="font-semibold text-foreground mb-4">Study Sections</h2>

        <div className="space-y-3">
          {sections.map((sec, i) => {
            const status = getSectionStatus(sec);
            const unlocked = isUnlocked(i);
            return (
              <button
                type="button"
                key={sec.id}
                aria-label={`Open section ${i + 1}: ${sec.heading_title}`}
                onClick={() => unlocked && navigate(`/section/${sec.id}`)}
                className={`bg-white rounded-xl border p-5 flex items-center gap-4 transition-all duration-200 ${
                  unlocked ? 'border-border hover:border-primary/40 hover:shadow-sm cursor-pointer group' : 'border-border opacity-60 cursor-not-allowed'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  status === 'completed' ? 'bg-green-50' :
                  status === 'in_progress' ? 'bg-amber-50' :
                  'bg-muted'
                }`}>
                  {status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : unlocked ? (
                    <BookOpen className={`w-5 h-5 ${status === 'in_progress' ? 'text-amber-600' : 'text-muted-foreground'}`} />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Section {i + 1}</span>
                    {status === 'in_progress' && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">In Progress</span>
                    )}
                    {status === 'completed' && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">Completed</span>
                    )}
                  </div>
                  <h3 className={`font-semibold text-foreground mt-0.5 ${unlocked ? 'group-hover:text-primary transition-colors' : ''}`}>
                    {sec.heading_title}
                  </h3>
                </div>

                {unlocked && (
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {sections.length === 0 && document?.status === 'processing' && (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-foreground">AJAZ AI is processing your document</p>
            <p className="text-sm text-muted-foreground mt-1">This usually takes a minute. Refresh to check.</p>
          </div>
        )}
      </main>
    </div>
  );
}