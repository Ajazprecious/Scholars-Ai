import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { learningApi } from '@/api/client';
import { Brain, ChevronLeft, Loader2, BookOpen, Lightbulb, Globe, ChevronRight, Volume2, VolumeX, MessageCircle, X, Send, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MermaidDiagram from '@/components/MermaidDiagram';

export default function SectionLesson() {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const [section, setSection] = useState(null);
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  // Audio
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef(null);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const realtimePcRef = useRef(null);
  const realtimeAudioRef = useRef(null);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [speechVoice, setSpeechVoice] = useState('nova');
  const [speechSpeed, setSpeechSpeed] = useState('1');
  const [speakReplies, setSpeakReplies] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const sec = await learningApi.section(sectionId);
        setSection(sec);
        if (sec) {
          setDocument({ id: sec.document_id, title: sec.document_title });
          const conversation = await learningApi.conversation(sectionId); setConversationId(conversation.conversationId); setChatMessages(conversation.messages || []);
          if (!sec.simplified_summary) { setGenerating(true); const generated = await learningApi.generateLesson(sectionId); setSection(generated); }
        }
      } catch (error) { setPageError(error.message || 'Unable to load this lesson.'); }
      finally { setGenerating(false); setLoading(false); }
    };
    load();
  }, [sectionId]);

  const generateContent = async () => {
    setGenerating(true);
    try { const result = await learningApi.generateLesson(sectionId); setSection(result); }
    finally { setGenerating(false); }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => { if (section?.id) learningApi.saveProgress(section.id, { tab: activeTab }).catch(() => {}); }, [section?.id, activeTab]);
  useEffect(() => () => { if (realtimePcRef.current) { realtimePcRef.current.getSenders().forEach(sender => sender.track?.stop()); realtimePcRef.current.close(); } }, []);

  const getActiveContent = () => {
    if (activeTab === 'summary') return section?.simplified_summary;
    if (activeTab === 'concepts') return section?.key_concepts;
    if (activeTab === 'related') return section?.related_materials;
    return '';
  };

  const handlePlayAudio = async () => {
    if (audioUrl) {
      if (audioPlaying) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
      return;
    }

    const text = getActiveContent();
    if (!text) return;
    setAudioLoading(true);

    const truncated = text.substring(0, 4500);
    let url;
    try { url = await learningApi.speech(truncated, speechVoice, Number(speechSpeed)); } catch (error) { setAudioLoading(false); setChatMessages(m => [...m, { role: 'ai', content: `Audio generation is unavailable: ${error.message}` }]); return; }
    setAudioLoading(false);
    setAudioUrl(url);
    // audioRef is always mounted now, play after state update
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    }, 50);
  };

  // Reset audio when tab changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setAudioPlaying(false);
    setAudioUrl(null);
  }, [activeTab, speechVoice, speechSpeed]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    const newMessages = [...chatMessages, { role: 'user', content: userMsg }];
    setChatMessages(newMessages);
    setChatLoading(true);

    try {
      const result = await learningApi.chat({ sectionId, message: userMsg, conversationId });
      setConversationId(result.conversationId);
      setChatMessages([...newMessages, { role: 'ai', content: result.reply }]);
      if (speakReplies) { try { const replyAudio = await learningApi.speech(result.reply, speechVoice, Number(speechSpeed)); setAudioUrl(replyAudio); setTimeout(() => { if (audioRef.current) { audioRef.current.src = replyAudio; audioRef.current.play(); } }, 50); } catch { /* Keep the text reply available if speech generation fails. */ } }
    } catch (error) { setChatMessages([...newMessages, { role: 'ai', content: `I couldn't respond just now: ${error.message}` }]); }
    finally { setChatLoading(false); }
  };

  const toggleRealtimeVoice = async () => {
    if (realtimePcRef.current) { realtimePcRef.current.getSenders().forEach(sender => sender.track?.stop()); realtimePcRef.current.close(); realtimePcRef.current = null; setRealtimeActive(false); return; }
    try {
      const session = await learningApi.realtimeSession(sectionId, 'alloy');
      const ephemeralKey = session.client_secret?.value;
      if (!ephemeralKey) throw new Error('The voice provider did not return a temporary session key.');
      const pc = new RTCPeerConnection(); realtimePcRef.current = pc;
      pc.ontrack = event => { if (realtimeAudioRef.current) realtimeAudioRef.current.srcObject = event.streams[0]; };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      pc.createDataChannel('oai-events');
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      const model = session.model || 'gpt-4o-realtime-preview';
      const response = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`, { method: 'POST', headers: { Authorization: `Bearer ${ephemeralKey}`, 'Content-Type': 'application/sdp' }, body: offer.sdp });
      if (!response.ok) throw new Error('Could not connect the realtime voice session.');
      await pc.setRemoteDescription({ type: 'answer', sdp: await response.text() });
      setRealtimeActive(true);
    } catch (error) { realtimePcRef.current?.close(); realtimePcRef.current = null; setRealtimeActive(false); setChatMessages(m => [...m, { role: 'ai', content: `Realtime voice is unavailable: ${error.message}` }]); }
  };

  const startVoiceQuestion = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setChatMessages(m => [...m, { role: 'ai', content: 'Voice input is not supported in this browser. Please use Chrome or type your question.' }]); return; }
    const recognition = new SpeechRecognition(); recognition.lang = 'en-NG'; recognition.interimResults = false;
    recognition.onstart = () => setVoiceListening(true); recognition.onend = () => setVoiceListening(false);
    recognition.onerror = () => setVoiceListening(false);
    recognition.onresult = e => { const spoken = e.results[0][0].transcript; setChatInput(spoken); };
    recognition.start();
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (pageError) return <div className="min-h-screen flex items-center justify-center p-6"><div className="max-w-md text-center"><h2 className="text-xl font-bold mb-2">Lesson unavailable</h2><p role="alert" className="text-sm text-muted-foreground mb-5">{pageError}</p><Button onClick={()=>window.location.reload()}>Try again</Button></div></div>;

  const tabs = [
    { id: 'summary', label: 'Lesson', icon: BookOpen },
    { id: 'concepts', label: 'Key Concepts', icon: Lightbulb },
    { id: 'related', label: 'Related Topics', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Always-mounted audio element */}
      <audio ref={realtimeAudioRef} autoPlay />
      <audio
        ref={audioRef}
        src={audioUrl || ''}
        onEnded={() => setAudioPlaying(false)}
        onPause={() => setAudioPlaying(false)}
        onPlay={() => setAudioPlaying(true)}
      />

      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link to={`/document/${section?.document_id}`} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-primary hidden sm:block">AJAZ AI</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setChatOpen(true)}
            className="gap-1.5 text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:block">Ask AJAZ</span>
          </Button>
          <Button
            onClick={() => navigate(`/quiz/${sectionId}/easy`)}
            disabled={generating || !section?.simplified_summary}
            className="bg-primary hover:bg-primary/90 gap-2 text-sm"
          >
            Start Quiz
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground font-medium mb-1">{document?.title}</p>
          <h1 className="text-2xl font-bold text-foreground">{section?.heading_title}</h1>
        </div>

        {generating ? (
          <div className="bg-white rounded-2xl border border-border p-16 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">AJAZ AI is preparing your lesson</h3>
            <p className="text-sm text-muted-foreground">Simplifying the content, finding key concepts, and preparing exam tips just for you...</p>
          </div>
        ) : (
          <>
            {/* Tab navigation */}
            <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:block">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content card */}
            <div className="bg-white rounded-2xl border border-border p-8">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  {activeTab === 'summary' && <><BookOpen className="w-5 h-5 text-primary" /><h2 className="font-semibold text-foreground">AJAZ Explains</h2><span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Professor Mode</span></>}
                  {activeTab === 'concepts' && <><Lightbulb className="w-5 h-5 text-amber-500" /><h2 className="font-semibold text-foreground">Key Concepts</h2></>}
                  {activeTab === 'related' && <><Globe className="w-5 h-5 text-blue-500" /><h2 className="font-semibold text-foreground">Related Materials</h2></>}
                </div>
                {/* Audio controls */}
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor="speech-voice">Tutor voice</label>
                  <select id="speech-voice" value={speechVoice} onChange={e=>setSpeechVoice(e.target.value)} className="text-xs border border-border rounded-md p-1.5 bg-white"><option value="nova">Nova</option><option value="alloy">Alloy</option><option value="echo">Echo</option><option value="fable">Fable</option><option value="onyx">Onyx</option><option value="shimmer">Shimmer</option></select>
                  <label className="sr-only" htmlFor="speech-speed">Speech speed</label>
                  <select id="speech-speed" value={speechSpeed} onChange={e=>setSpeechSpeed(e.target.value)} className="text-xs border border-border rounded-md p-1.5 bg-white"><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select>
                </div>
                <button
                  onClick={handlePlayAudio}
                  disabled={audioLoading || !getActiveContent()}
                  className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    audioPlaying
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                  }`}
                >
                  {audioLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : audioPlaying ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  <span className="hidden sm:block">{audioLoading ? 'Generating...' : audioPlaying ? 'Stop' : 'Listen'}</span>
                </button>
              </div>

              <div className="prose prose-slate max-w-none text-foreground leading-relaxed whitespace-pre-wrap text-[15px]">
                {getActiveContent()}
              </div>
              {(activeTab === 'summary' || activeTab === 'concepts') && section?.diagram_mermaid && <MermaidDiagram definition={section.diagram_mermaid} />}

              {/* Diagrams — show on Lesson and Key Concepts tabs */}
              {(activeTab === 'summary' || activeTab === 'concepts') && section?.diagram_urls?.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Image className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Visual Diagrams</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {section.diagram_urls.map((url, i) => (
                      <div key={i} className="rounded-xl border border-border overflow-hidden bg-muted/30">
                        <img src={url} alt={`Diagram ${i + 1} for ${section.heading_title}`} className="w-full h-auto object-contain" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Floating audio player bar */}
            {(audioUrl || audioLoading) && (
              <div className="mt-6 bg-primary rounded-2xl p-4 flex items-center gap-4 text-primary-foreground shadow-lg">
                <button
                  onClick={handlePlayAudio}
                  disabled={audioLoading}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors shrink-0"
                >
                  {audioLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : audioPlaying ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {audioLoading ? 'Generating audio...' : audioPlaying ? 'Now playing' : 'Audio ready'}
                  </p>
                  <p className="text-xs opacity-70 truncate">{section?.heading_title}</p>
                </div>
                <button
                  onClick={() => {
                    audioRef.current?.pause();
                    setAudioPlaying(false);
                    setAudioUrl(null);
                  }}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="mt-6 p-5 bg-primary/5 border border-primary/20 rounded-xl">
              <p className="text-sm text-primary font-medium mb-1">Ready to test your knowledge?</p>
              <p className="text-sm text-muted-foreground mb-3">Start with foundational questions, then tackle advanced exam-standard ones.</p>
              <Button
                onClick={() => navigate(`/quiz/${sectionId}/easy`)}
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                Start Easy Quiz
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </main>

      {/* Chat panel */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-6 bg-black/30">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:w-[420px] flex flex-col" style={{ height: '560px', maxHeight: '90vh' }}>
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Ask AJAZ AI</p>
                  <p className="text-xs text-muted-foreground">{section?.heading_title}</p><label className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><input type="checkbox" checked={speakReplies} onChange={e=>setSpeakReplies(e.target.checked)} /> Speak replies</label>
                </div>
              </div>
              <button onClick={startVoiceQuestion} aria-label="Dictate a question" className="text-muted-foreground hover:text-foreground mr-3">{voiceListening ? 'Listening…' : '🎙️'}</button><button onClick={toggleRealtimeVoice} aria-pressed={realtimeActive} aria-label={realtimeActive ? 'End realtime voice conversation' : 'Start realtime voice conversation'} className="text-muted-foreground hover:text-foreground mr-3">{realtimeActive ? 'End voice' : 'Live voice'}</button><button onClick={() => setChatOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <Brain className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Ask me anything about this section.<br />I'm here to help you understand!</p>
                  <div className="mt-4 space-y-2">
                    {['Can you explain this in simpler terms?', 'What are the most important points?', 'Give me an example of this in real life'].map(q => (
                      <button key={q} onClick={() => setChatInput(q)} className="block w-full text-left text-xs bg-muted hover:bg-muted/70 rounded-lg px-3 py-2 text-foreground transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Ask anything about this section..."
                  className="flex-1 text-sm border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary bg-background"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground disabled:opacity-50 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}