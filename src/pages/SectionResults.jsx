import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { learningApi } from '@/api/client';
import { Brain, ChevronLeft, GraduationCap, Globe, Star, ChevronRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SectionResults() {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const [section, setSection] = useState(null);
  const [document, setDocument] = useState(null);
  const [allSections, setAllSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const sec = await learningApi.section(sectionId);
      setSection(sec);
      if (sec) {
        const detail = await learningApi.document(sec.document_id);
        setDocument(detail.document);
        setAllSections(detail.sections);
      }
      setLoading(false);
    };
    load();
  }, [sectionId]);

  const nextSection = () => {
    const idx = allSections.findIndex(s => s.id === sectionId);
    if (idx >= 0 && idx < allSections.length - 1) {
      navigate(`/section/${allSections[idx + 1].id}`);
    } else {
      navigate(`/document/${section?.document_id}`);
    }
  };

  const hasNext = () => {
    const idx = allSections.findIndex(s => s.id === sectionId);
    return idx >= 0 && idx < allSections.length - 1;
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to={`/document/${section?.document_id}`} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-primary hidden sm:block">AJAZ AI</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Completion Banner */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 text-white mb-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-90" />
          <h1 className="text-2xl font-bold mb-1">Section Completed!</h1>
          <p className="opacity-80 text-sm">{section?.heading_title}</p>
        </div>

        {/* Exam Tips */}
        <div className="bg-white rounded-2xl border border-border p-7 mb-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Exam Tips</h2>
              <p className="text-xs text-muted-foreground">What your examiner is looking for</p>
            </div>
          </div>
          <div className="prose prose-slate max-w-none text-foreground leading-relaxed whitespace-pre-wrap text-[15px]">
            {section?.exam_tips || 'Exam tips not available for this section.'}
          </div>
        </div>

        {/* Real World Context */}
        <div className="bg-white rounded-2xl border border-border p-7 mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Real-World Applications</h2>
              <p className="text-xs text-muted-foreground">How this knowledge is used in the real world</p>
            </div>
          </div>
          <div className="prose prose-slate max-w-none text-foreground leading-relaxed whitespace-pre-wrap text-[15px]">
            {section?.real_world_context || 'Real-world context not available for this section.'}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(`/document/${section?.document_id}`)} className="flex-1">
            Back to Document
          </Button>
          <Button onClick={nextSection} className="flex-1 bg-primary hover:bg-primary/90 gap-2">
            {hasNext() ? (
              <>Next Section <ChevronRight className="w-4 h-4" /></>
            ) : (
              <>Finish Document <Star className="w-4 h-4" /></>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}