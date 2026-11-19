import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { learningApi } from '@/api/client';
import { Brain, ChevronLeft, Loader2, CheckCircle, XCircle, ChevronRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function QuizPage() {
  const { sectionId, difficulty } = useParams();
  const navigate = useNavigate();
  const [section, setSection] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [review, setReview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const sec = await learningApi.section(sectionId); setSection(sec);
        try { const existing = await learningApi.quiz(sectionId, difficulty); setQuiz(existing); }
        catch { setGenerating(true); const generated = await learningApi.generateQuiz(sectionId, difficulty); setQuiz(generated); }
      } catch (error) { setPageError(error.message || 'Unable to prepare this assessment.'); }
      finally { setGenerating(false); setLoading(false); }
    };
    load();
  }, [sectionId, difficulty]);

  const generateQuiz = async () => {
    setGenerating(true);
    try { const generated = await learningApi.generateQuiz(sectionId, difficulty); setQuiz(generated); }
    finally { setGenerating(false); }
  };

  const handleSelect = (opt) => {
    if (revealed) return;
    setSelected(opt);
  };

  const handleReveal = () => { if (selected) setRevealed(true); };

  const handleNext = async () => {
    const newAnswers = [...answers, { question_index: currentQ, selected_answer: selected }];
    setAnswers(newAnswers);
    if (currentQ + 1 >= quiz.questions.length) {
      try {
        const result = await learningApi.submitQuiz(quiz.id, newAnswers);
        setScore(result.correct);
        setReview(result.review || []);
        setFinished(true);
      } catch (error) { window.alert(error.message || 'Unable to submit your assessment.'); }
    } else { setCurrentQ(currentQ + 1); setSelected(null); setRevealed(false); setReview(null); }
  };

  if (loading || generating) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {difficulty === 'advanced' ? 'Building Exam-Standard Questions' : 'Preparing Your Quiz'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {difficulty === 'advanced'
            ? 'AJAZ AI is crafting high-level theory, application, and analysis questions to match university exam standards. This takes about 20–30 seconds — worth the wait!'
            : 'AJAZ AI is crafting questions that cover every part of the section. Just a moment...'}
        </p>
        <div className="flex justify-center gap-1.5 mt-6">
          {[0,1,2,3].map(i => (
            <div key={i} className="w-2 h-2 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        {difficulty === 'advanced' && (
          <p className="text-xs text-muted-foreground/60 mt-5">Advanced quiz includes scenario-based, comparison & analysis questions</p>
        )}
      </div>
    </div>
  );

  if (pageError) return <div className="min-h-screen flex items-center justify-center p-6"><div className="max-w-md text-center"><h2 className="text-xl font-bold mb-2">Assessment unavailable</h2><p role="alert" className="text-sm text-muted-foreground mb-5">{pageError}</p><Button onClick={()=>window.location.reload()}>Try again</Button></div></div>;

  if (!quiz || quiz.questions?.length === 0) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">No questions available.</p>
    </div>
  );

  if (finished) {
    const total = quiz.questions.length;
    const pct = Math.round((score / total) * 100);
    const passed = pct >= 60;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" aria-live="polite">
        <div className="bg-white rounded-2xl border border-border p-10 max-w-md w-full text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${passed ? 'bg-green-50' : 'bg-red-50'}`}>
            {passed ? <Trophy className="w-10 h-10 text-green-600" /> : <XCircle className="w-10 h-10 text-red-500" />}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1">
            {passed ? 'Well done!' : 'Keep going!'}
          </h2>
          <p className="text-muted-foreground mb-4">{difficulty === 'easy' ? 'Easy' : 'Advanced'} Quiz Result</p>
          <div className="text-5xl font-bold text-foreground mb-1">{pct}%</div>
          <p className="text-muted-foreground mb-6">{score} out of {total} correct</p>
          <div className="text-left space-y-3 mb-6 max-h-72 overflow-y-auto" aria-label="Assessment answer review">{review.map((item,index)=><div key={index} className="border border-border rounded-lg p-3"><p className="text-xs font-semibold mb-1">Question {index+1} · {item.is_correct?'Correct':'Incorrect'}</p><p className="text-xs text-muted-foreground mb-1">Your answer: {item.selected_answer || 'Not answered'} · Correct answer: {item.correct_answer}</p><p className="text-sm">{item.explanation}</p></div>)}</div>

          <div className="flex flex-col gap-3">
            {passed && difficulty === 'easy' && (
              <Button onClick={() => navigate(`/quiz/${sectionId}/advanced`)} className="bg-primary hover:bg-primary/90 gap-2">
                Take Advanced Quiz
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
            {passed && difficulty === 'advanced' && (
              <Button onClick={() => navigate(`/section/${sectionId}/results`)} className="bg-primary hover:bg-primary/90 gap-2">
                See Exam Tips & Real World
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
            {!passed && (
              <Button onClick={() => { setCurrentQ(0); setAnswers([]); setSelected(null); setRevealed(false); setFinished(false); }} className="bg-primary hover:bg-primary/90">
                Retry Quiz
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/section/${sectionId}`)}>
              Back to Lesson
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const q = quiz.questions[currentQ];
  const progress = Math.round(((currentQ) / quiz.questions.length) * 100);
  const isCorrect = revealed && review?.isCorrect;
  const isWrong = revealed && !review?.isCorrect;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to={`/section/${sectionId}`} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-primary">{difficulty === 'easy' ? 'Easy Quiz' : 'Advanced Quiz'}</span>
          </div>
          <span className="text-sm text-muted-foreground">{currentQ + 1} / {quiz.questions.length}</span>
        </div>
        <div className="max-w-2xl mx-auto px-6 pb-3">
          <Progress value={progress} className="h-1" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-border p-8 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${difficulty === 'easy' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
              {difficulty === 'easy' ? 'Easy' : 'Advanced'} • Q{currentQ + 1}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-foreground leading-relaxed">{q.question}</h2>
        </div>

        <div className="space-y-3 mb-6" role="group" aria-label="Answer options">
          {q.options?.map((opt, i) => {
            const letter = ['A', 'B', 'C', 'D'][i];
            const isSelected = selected === opt || selected === letter;
            const isThisCorrect = false;
            const isThisWrong = false;

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(opt)} aria-pressed={isSelected}
                disabled={revealed}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 ${
                  isThisCorrect ? 'border-green-400 bg-green-50' :
                  isThisWrong ? 'border-red-400 bg-red-50' :
                  isSelected ? 'border-primary bg-primary/5' :
                  'border-border bg-white hover:border-primary/40 hover:bg-muted/30'
                }`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                  isThisCorrect ? 'bg-green-100 text-green-700' :
                  isThisWrong ? 'bg-red-100 text-red-700' :
                  isSelected ? 'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {letter}
                </span>
                <span className={`text-sm font-medium ${
                  isThisCorrect ? 'text-green-800' : isThisWrong ? 'text-red-800' : 'text-foreground'
                }`}>
                  {opt}
                </span>
                {isThisCorrect && <CheckCircle className="w-5 h-5 text-green-600 ml-auto shrink-0" />}
                {isThisWrong && <XCircle className="w-5 h-5 text-red-500 ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>

        {revealed && <p className="text-sm text-muted-foreground mb-5" role="status">Answer recorded. Your score and explanations will appear after you submit the quiz.</p>}

        <div className="flex justify-end">
          {!revealed ? (
            <Button onClick={handleReveal} disabled={!selected || checking} className="bg-primary hover:bg-primary/90 px-8">
              {checking ? 'Checking…' : 'Check Answer'}
            </Button>
          ) : (
            <Button onClick={handleNext} className="bg-primary hover:bg-primary/90 gap-2 px-8">
              {currentQ + 1 >= quiz.questions.length ? 'See Results' : 'Next Question'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}