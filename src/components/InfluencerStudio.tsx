import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, User, Mic, Image as ImageIcon, FileText,
  Loader2, Download, RefreshCw, ChevronRight, Film
} from 'lucide-react';
import { apiFetch } from '../api';
import { spendCredits, refundCredits, drawFrame, type MotionPreset } from './ImageAnimator';
import { useAuth } from '../context/AuthContext';

interface InfluencerStudioProps {
  notify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  onOpenPricing?: () => void;
}

interface Character {
  id: string;
  name: string;
  region: string;
  gender: 'girls' | 'boys';
  file: string;
}

const CHARACTERS: Character[] = [
  // Girls (preset looks — cards show the cool name, region stays for prompt context only)
  { id: 'indian', name: 'Aanya', region: 'India', gender: 'girls', file: '/characters/girls/indian.jpg' },
  { id: 'chinese', name: 'Lina', region: 'China', gender: 'girls', file: '/characters/girls/chinese.jpg' },
  { id: 'japanese', name: 'Sakura', region: 'Japan', gender: 'girls', file: '/characters/girls/japanese.jpg' },
  { id: 'american', name: 'Aria', region: 'USA', gender: 'girls', file: '/characters/girls/american.jpg' },
  { id: 'french', name: 'Camille', region: 'France', gender: 'girls', file: '/characters/girls/french.jpg' },
  { id: 'german', name: 'Lena', region: 'Germany', gender: 'girls', file: '/characters/girls/german.jpg' },
  { id: 'british', name: 'Amelia', region: 'UK', gender: 'girls', file: '/characters/girls/british.jpg' },
  { id: 'spanish', name: 'Valentina', region: 'Spain', gender: 'girls', file: '/characters/girls/spanish.jpg' },
  { id: 'turkish', name: 'Selin', region: 'Turkey', gender: 'girls', file: '/characters/girls/turkish.jpg' },
  { id: 'egyptian', name: 'Nour', region: 'Egypt', gender: 'girls', file: '/characters/girls/egyptian.jpg' },
  { id: 'greek', name: 'Daphne', region: 'Greece', gender: 'girls', file: '/characters/girls/greek.jpg' },
  { id: 'mexican', name: 'Camila', region: 'Mexico', gender: 'girls', file: '/characters/girls/mexican.jpg' },
  { id: 'russian', name: 'Anastasia', region: 'Russia', gender: 'girls', file: '/characters/girls/russian.jpg' },
  { id: 'middleeastern', name: 'Yasmin', region: 'Middle East', gender: 'girls', file: '/characters/girls/middleeastern.jpg' },
  { id: 'african', name: 'Amara', region: 'Africa', gender: 'girls', file: '/characters/girls/african.jpg' },
  { id: 'asian', name: 'Hana', region: 'East Asia', gender: 'girls', file: '/characters/girls/asian.jpg' },
  { id: 'scandinavian', name: 'Freya', region: 'Scandinavia', gender: 'girls', file: '/characters/girls/scandinavian.jpg' },
  { id: 'latina', name: 'Isabella', region: 'Latin America', gender: 'girls', file: '/characters/girls/latina.jpg' },
  // Boys (preset looks)
  { id: 'indian', name: 'Arjun', region: 'India', gender: 'boys', file: '/characters/boys/indian.jpg' },
  { id: 'european', name: 'Luca', region: 'Italy', gender: 'boys', file: '/characters/boys/european.jpg' },
  { id: 'latin', name: 'Rafael', region: 'Brazil', gender: 'boys', file: '/characters/boys/latin.jpg' },
  { id: 'african', name: 'Chidi', region: 'Nigeria', gender: 'boys', file: '/characters/boys/african.jpg' },
  { id: 'asian', name: 'Junho', region: 'South Korea', gender: 'boys', file: '/characters/boys/asian.jpg' },
  { id: 'middleeastern', name: 'Khalid', region: 'UAE', gender: 'boys', file: '/characters/boys/middleeastern.jpg' },
  { id: 'chinese', name: 'Wei', region: 'China', gender: 'boys', file: '/characters/boys/chinese.jpg' },
  { id: 'japanese', name: 'Kenji', region: 'Japan', gender: 'boys', file: '/characters/boys/japanese.jpg' },
  { id: 'american', name: 'Ethan', region: 'USA', gender: 'boys', file: '/characters/boys/american.jpg' },
  { id: 'russian', name: 'Dmitri', region: 'Russia', gender: 'boys', file: '/characters/boys/russian.jpg' },
  // Daily forge characters (girls) — portraits from the daily AI forge
  { id: 'veera', name: 'Veera', region: 'India', gender: 'girls', file: '/characters/trained/veera.jpg' },
  { id: 'yuki', name: 'Yuki', region: 'Japan', gender: 'girls', file: '/characters/trained/yuki.jpg' },
  { id: 'elena', name: 'Elena', region: 'Europe', gender: 'girls', file: '/characters/daily/elena.jpg' },
  { id: 'anaya', name: 'Anaya', region: 'India', gender: 'girls', file: '/characters/daily/anaya.jpg' },
  { id: 'mina', name: 'Mina', region: 'South Korea', gender: 'girls', file: '/characters/daily/mina.jpg' },
  { id: 'sofia', name: 'Sofia', region: 'Europe', gender: 'girls', file: '/characters/trained/sofia.jpg' },
  { id: 'zara', name: 'Zara', region: 'Brazil', gender: 'girls', file: '/characters/daily/zara.jpg' },
  { id: 'ava', name: 'Ava', region: 'USA', gender: 'girls', file: '/characters/daily/ava.jpg' },
  { id: 'nia', name: 'Nia', region: 'East Africa', gender: 'girls', file: '/characters/daily/nia.jpg' },
  { id: 'layla', name: 'Layla', region: 'Middle East', gender: 'girls', file: '/characters/daily/layla.jpg' },
  { id: 'mali', name: 'Mali', region: 'Thailand', gender: 'girls', file: '/characters/daily/mali.jpg' },
  { id: 'elin', name: 'Elin', region: 'Sweden', gender: 'girls', file: '/characters/daily/elin.jpg' },
  // Daily forge characters (boys)
  { id: 'kofi', name: 'Kofi', region: 'Africa', gender: 'boys', file: '/characters/daily/kofi.jpg' },
  { id: 'omar', name: 'Omar', region: 'Middle East', gender: 'boys', file: '/characters/daily/omar.jpg' },
  { id: 'diego', name: 'Diego', region: 'Latin America', gender: 'boys', file: '/characters/daily/diego.jpg' },
];

const NICHES = [
  'Lifestyle & Fashion',
  'AI & Technology',
  'Health & Wellness',
  'Travel & Culture',
  'Food & Cooking',
  'Fitness & Sports',
  'Music & Entertainment',
  'Education & Facts',
];

const LANGUAGES = [
  { code: 'hinglish', label: 'Hinglish (Hindi + English)' },
  { code: 'english', label: 'English' },
  { code: 'hindi', label: 'Hindi' },
];

// From Roshan's Prompt Pack PDF — human-like actions & expressions
const ACTIONS = [
  'Laughing while looking down at phone',
  'Mid-step walking toward camera, hair moving',
  'Tying shoelaces before a run',
  'Stirring coffee and glancing at camera',
  'Pointing at whiteboard while explaining',
  'Unboxing product with surprised smile',
  'Adjusting earphones, mid-conversation',
  'Holding up product to the lens',
  'Waving hello at camera',
  'Sitting cross-legged with laptop',
];

const EXPRESSIONS = [
  'Genuine smile (eyes crinkling)',
  'Curious head tilt, raised eyebrow',
  'Shy smile, looking away',
  'Excited surprise, mouth open',
  'Calm confident gaze',
  'Thoughtful, finger on chin',
  'Laugh with eyes closed',
];

const VIDEO_STYLES = [
  { id: 'talking', label: 'Talking Head', prompt: 'looks into the camera and speaks naturally, subtle head nods, blinks every 3-4 seconds, small eyebrow raises for emphasis, natural hand gestures at chest level, soft breathing in shoulders, handheld slight sway, vertical 9:16, realistic lip sync' },
  { id: 'walking', label: 'Walking / Lifestyle', prompt: 'walks toward the camera on a sunny street, hair and dress moving in breeze, smiles and glances sideways, handheld tracking shot, 24fps cinematic, natural motion blur, 9:16' },
  { id: 'product', label: 'Product Showcase', prompt: 'close-up hands picking up product, turning to show label, then looks at camera and smiles, soft studio light, slow push-in, crisp detail, 9:16' },
  { id: 'gym', label: 'Gym / Fitness', prompt: 'finishes a set, exhales, wipes sweat with towel, laughs at camera, handheld gym footage, realistic sweat sheen, 9:16' },
];

const NICHE_PACKS: Record<string, string> = {
  'Fitness & Sports': 'athletic build, light sweat sheen, messy ponytail with flyaways, black sports set, gym mirror selfie, iPhone photo style',
  'Lifestyle & Fashion': 'linen co-ord set, market street walk, iced coffee in hand, wind in hair, 35mm film look, candid laugh',
  'Travel & Culture': 'flowy dress, hilltop sunset, hair blowing, looking back over shoulder, backpack on shoulder, natural color grading',
  'AI & Technology': 'desk with dual monitors, hoodie, headphones around neck, soft RGB glow, coffee mug, mid-explanation expression',
  'Food & Cooking': 'holding latte in cozy cafe, warm tones, steam rising, bokeh lights, soft smile, real wooden table',
  'Education & Facts': 'studying at desk at night, desk lamp glow, notes and highlighters, focused expression, laptop open, cozy room',
};

// Ready-made 15-sec script templates (from Roshan's approved Bhupinder package)
const SCRIPT_TEMPLATES = [
  {
    name: 'Bhupinder Style (Energy Tip)',
    hook: 'Ruko! Ye trick 99% log nahi jaante!',
    script: 'Hey guys! Main hun [NAME]! Aaj ek secret batata hun — roz subah 5 minute ye karo, aur tumhari energy double ho jayegi! Try karo aur comment mein batao kaisa laga!',
  },
  {
    name: 'Myth vs Truth',
    hook: 'Ye myth hai ya sach? Aaj pata chalega!',
    script: 'Okay wait, nobody told me this about [TOPIC]. [pause] I wasted months doing it the hard way. Here is the trick that changed everything... [short tip]. Try it today and tell me in the comments if it worked, okay?',
  },
  {
    name: '3 Tips Format',
    hook: '3 tips jo tumhari life badal denge!',
    script: 'Hey everyone! Aaj main aapko [TOPIC] ke baare mein 3 simple tips bataungi. Pehla—[tip one]. Doosra—[tip two]. Aur teesra—[tip three]. Save kar lo, next video mein iska practical example dikhayenge!',
  },
];

type Step = 'character' | 'niche' | 'script' | 'voice' | 'video';

export function InfluencerStudio({ notify }: InfluencerStudioProps) {
  const { user, refreshCredits } = useAuth();
  const [step, setStep] = useState<Step>('character');
  const [gender, setGender] = useState<'girls' | 'boys'>('girls');
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [influencerName, setInfluencerName] = useState('');
  const [niche, setNiche] = useState(NICHES[0]);
  const [language, setLanguage] = useState('hinglish');
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState('');
  const [generating, setGenerating] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [videoPrompts, setVideoPrompts] = useState<string[]>([]);
  const [studioVideoUrl, setStudioVideoUrl] = useState<string | null>(null);
  const [renderingVideo, setRenderingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRafRef = useRef(0);
  const [generatingVideos, setGeneratingVideos] = useState(false);
  const [selectedAction, setSelectedAction] = useState(ACTIONS[0]);
  const [selectedExpression, setSelectedExpression] = useState(EXPRESSIONS[0]);
  const [videoStyle, setVideoStyle] = useState(VIDEO_STYLES[0].id);

  const filtered = CHARACTERS.filter(c => c.gender === gender);

  const generateScript = async () => {
    if (!selectedChar || !topic.trim()) {
      notify('error', 'Pehle character aur topic select karo!');
      return;
    }
    setGenerating(true);
    try {
      const prompt = `Write a short, engaging social media video script (30-45 seconds, 60-90 words) for an AI influencer named ${influencerName || selectedChar.name} from ${selectedChar.region}. Niche: ${niche}. Topic: ${topic}. Language: ${language === 'hinglish' ? 'Hinglish (mix of Hindi and English, natural conversational)' : language}. Style: Hook in first line, conversational, energetic, ends with a call-to-action. No medical claims, no financial advice.`;
      const res = await apiFetch('/api/enhance-prompt', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      const scriptText = (data.enhancedPrompt || data.enhanced || data.text || '').trim();
      if (!res.ok || !scriptText) {
        notify('error', 'Script generate nahi hua: ' + (data.error || 'server se khaali jawab aaya'));
        return;
      }
      setScript(scriptText);
      setStep('script');
      notify('success', 'Script taiyaar hai!');
    } catch (e: any) {
      notify('error', 'Script generate nahi hua: ' + (e.message || 'error'));
    } finally {
      setGenerating(false);
    }
  };

  const generateVideoPrompts = async () => {
    if (!selectedChar) {
      notify('error', 'Pehle character select karo!');
      return;
    }
    setGeneratingVideos(true);
    try {
      const style = VIDEO_STYLES.find(v => v.id === videoStyle) || VIDEO_STYLES[0];
      const nichePack = NICHE_PACKS[niche] || '';
      const charName = influencerName || selectedChar.name;
      const prompt = `Generate 5 fresh short video motion prompts (one line each, numbered 1-5) for AI influencer "${charName}" from ${selectedChar.region}, niche: ${niche}. Character action: ${selectedAction}. Expression: ${selectedExpression}. Video style: ${style.label} — ${style.prompt}. ${nichePack ? 'Visual style: ' + nichePack + '.' : ''} Each prompt: describe the motion naturally, human-like, 5-6 seconds, vertical 9:16, photorealistic, natural skin texture with visible pores (NOT airbrushed/plastic), candid iPhone photo feel. Varied settings, no repetition.`;
      const res = await apiFetch('/api/enhance-prompt', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      const text = (data.enhancedPrompt || data.enhanced || data.text || '').trim();
      const lines = text.split('\n').filter((l: string) => l.trim().length > 0).slice(0, 5);
      if (!res.ok || lines.length === 0) {
        notify('error', 'Prompts generate nahi hue: ' + (data.error || 'server se khaali jawab aaya'));
        return;
      }
      setVideoPrompts(lines);
      setStep('video');
      notify('success', 'Video prompts taiyaar!');
    } catch (e: any) {
      notify('error', 'Prompts generate nahi hue: ' + (e.message || 'error'));
    } finally {
      setGeneratingVideos(false);
    }
  };

  // Draw the first frame as a preview whenever the video step opens.
  useEffect(() => {
    if (step !== 'video' || !selectedChar) return;
    const canvas = videoCanvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (ctx) drawFrame(ctx, img, 0, 'zoom-in', 720, 1280);
    };
    img.src = selectedChar.file;
  }, [step, selectedChar]);

  // Make an actual video: animate the character photo in the browser (5 credits).
  const renderStudioVideo = async () => {
    if (!selectedChar || renderingVideo) return;
    const canvas = videoCanvasRef.current;
    if (!canvas) {
      notify('error', 'Video panel ready nahi hai — page refresh karke try karo.');
      return;
    }
    setRenderingVideo(true);
    setVideoProgress(0);
    setStudioVideoUrl(null);
    const paid = await spendCredits('animate-video', 0, notify, onOpenPricing);
    if (!paid) {
      setRenderingVideo(false);
      return;
    }
    refreshCredits().catch(() => {});
    try {
      const img = new Image();
      img.src = selectedChar.file;
      await img.decode();
      const W = 720, H = 1280, DURATION = 5000;
      const motionMap: Record<string, MotionPreset> = {
        talking: 'zoom-in', walking: 'pan-right', product: 'zoom-out', gym: 'pan-left',
      };
      const motion = motionMap[videoStyle] || 'zoom-in';
      const ctx = canvas.getContext('2d')!;
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        setStudioVideoUrl(URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })));
        setRenderingVideo(false);
        setVideoProgress(0);
        notify('success', 'Video taiyaar hai! (5 credits lage)');
      };
      recorder.start(250);
      const start = performance.now();
      const stepFrame = (now: number) => {
        const t = Math.min((now - start) / DURATION, 1);
        drawFrame(ctx, img, t, motion, W, H);
        setVideoProgress(t);
        if (t < 1) videoRafRef.current = requestAnimationFrame(stepFrame);
        else recorder.stop();
      };
      videoRafRef.current = requestAnimationFrame(stepFrame);
    } catch (err: any) {
      setRenderingVideo(false);
      notify('error', 'Video nahi ban paya: ' + (err.message || 'browser error'));
      refundCredits('animate-video', 0, notify).catch(() => {});
    }
  };

  const generateVoice = async () => {
    if (!script.trim()) {
      notify('error', 'Pehle script banao!');
      return;
    }
    setGeneratingVoice(true);
    try {
      const res = await apiFetch('/api/generate/audio', {
        method: 'POST',
        body: JSON.stringify({ prompt: script.slice(0, 500), type: 'speech', voice: 'studio_female' }),
      });
      const data = await res.json();
      if (data.audioUrl || data.url) {
        setVoiceUrl(data.audioUrl || data.url);
        notify('success', 'Voiceover taiyaar!');
      } else {
        notify('error', 'Voice generate nahi hui');
      }
    } catch (e: any) {
      notify('error', 'Voice error: ' + (e.message || 'error'));
    } finally {
      setGeneratingVoice(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 bg-[#10131A] border border-white/10 rounded-3xl text-gray-100">
      <div className="text-center">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="text-purple-500" /> AI Influencer Studio
        </h1>
        <p className="text-gray-400 mt-1">Apna AI influencer banao — character, script, voice, sab kuch!</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
        {(['character', 'niche', 'script', 'voice', 'video'] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <span className={`px-3 py-1 rounded-full ${step === s ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-300'}`}>
              {['Character', 'Niche', 'Script', 'Voice', 'Video'][i]}
            </span>
            {i < 4 && <ChevronRight size={16} className="text-gray-400" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Character */}
      {step === 'character' && (
        <div className="space-y-4">
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => { setGender('girls'); setSelectedChar(null); }}
              className={`px-6 py-2 rounded-full font-medium ${gender === 'girls' ? 'bg-pink-600 text-white' : 'bg-white/10'}`}
            >👧 Girls</button>
            <button
              onClick={() => { setGender('boys'); setSelectedChar(null); }}
              className={`px-6 py-2 rounded-full font-medium ${gender === 'boys' ? 'bg-blue-600 text-white' : 'bg-white/10'}`}
            >👦 Boys</button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {filtered.map(c => (
              <button
                key={`${c.gender}-${c.id}`}
                onClick={() => setSelectedChar(c)}
                className={`rounded-xl overflow-hidden border-2 transition ${selectedChar?.file === c.file ? 'border-purple-600 ring-2 ring-purple-300' : 'border-transparent'}`}
              >
                <img src={c.file} alt={c.name} className="w-full aspect-[3/4] object-cover" />
                <div className="text-xs py-1 bg-white/10 font-medium">{c.name}</div>
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            <input
              value={influencerName}
              onChange={e => setInfluencerName(e.target.value)}
              placeholder="Influencer ka naam (jaise: Elena)"
              className="px-4 py-2 border rounded-full w-64 text-center"
            />
            <button
              disabled={!selectedChar}
              onClick={() => setStep('niche')}
              className="px-6 py-2 bg-purple-600 text-white rounded-full font-medium disabled:opacity-40 flex items-center gap-2"
            ><User size={16} /> Next <ChevronRight size={16} /></button>
          </div>

          {/* Human-like Action & Expression (from Prompt Pack) */}
          {selectedChar && (
            <div className="max-w-lg mx-auto space-y-3 bg-purple-500/10 rounded-2xl p-4">
              <h3 className="font-semibold text-center text-sm">🤸 Human-like Action & Expression</h3>
              <div>
                <label className="text-xs font-medium text-gray-300">Action (kya kar raha hai?)</label>
                <select
                  value={selectedAction}
                  onChange={e => setSelectedAction(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-white/15 rounded-xl text-sm bg-white/5 text-gray-100 placeholder-gray-500"
                >
                  {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-300">Expression (chehre par kya?)</label>
                <select
                  value={selectedExpression}
                  onChange={e => setSelectedExpression(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-white/15 rounded-xl text-sm bg-white/5 text-gray-100 placeholder-gray-500"
                >
                  {EXPRESSIONS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-300">Video Style</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {VIDEO_STYLES.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setVideoStyle(v.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium ${videoStyle === v.id ? 'bg-purple-600 text-white' : 'bg-white/10 border-white/20'}`}
                    >{v.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Niche */}
      {step === 'niche' && (
        <div className="space-y-4 max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-center">Niche aur Language chuno</h2>
          <div className="grid grid-cols-2 gap-2">
            {NICHES.map(n => (
              <button
                key={n}
                onClick={() => setNiche(n)}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${niche === n ? 'bg-purple-600 text-white' : 'bg-white/10'}`}
              >{n}</button>
            ))}
          </div>
          <div className="flex gap-2 justify-center">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`px-4 py-2 rounded-full text-sm ${language === l.code ? 'bg-purple-600 text-white' : 'bg-white/10'}`}
              >{l.label}</button>
            ))}
          </div>
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Topic likho (jaise: 5 AI tools for students)"
            className="w-full px-4 py-3 border border-white/15 rounded-xl bg-white/5 text-gray-100 placeholder-gray-500"
          />
          <div className="flex gap-2 justify-center">
            <button onClick={() => setStep('character')} className="px-6 py-2 bg-white/10 rounded-full">Back</button>
            <button
              disabled={generating || !topic.trim()}
              onClick={generateScript}
              className="px-6 py-2 bg-purple-600 text-white rounded-full font-medium disabled:opacity-40 flex items-center gap-2"
            >{generating ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />} Script Banao</button>
          </div>
        </div>
      )}

      {/* Step 3: Script */}
      {step === 'script' && (
        <div className="space-y-4 max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-center">Tumhara Script</h2>
          {selectedChar && (
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
              <img src={selectedChar.file} alt="" className="w-12 h-12 rounded-full object-cover" />
              <div>
                <div className="font-semibold">{influencerName || selectedChar.name}</div>
                <div className="text-xs text-gray-400">{niche} • {selectedChar.region}</div>
              </div>
            </div>
          )}
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 border border-white/15 rounded-xl bg-white/5 text-gray-100 placeholder-gray-500"
            placeholder="Script yahan ayega..."
          />
          {/* Ready-made templates */}
          <div className="bg-purple-500/10 rounded-xl p-3">
            <div className="text-xs font-semibold text-gray-300 mb-2">📝 Ready Templates (tap to use):</div>
            <div className="flex gap-2 flex-wrap">
              {SCRIPT_TEMPLATES.map(t => (
                <button
                  key={t.name}
                  onClick={() => {
                    const name = influencerName || selectedChar?.name || 'Star';
                    setScript(`HOOK: ${t.hook}\n\n${t.script.replace('[NAME]', name)}`);
                    notify('success', t.name + ' template lagaya!');
                  }}
                  className="px-3 py-1.5 bg-white/10 border border-purple-300/30 rounded-full text-xs font-medium hover:bg-purple-500/100/20"
                >{t.name}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={() => setStep('niche')} className="px-6 py-2 bg-white/10 rounded-full">Back</button>
            <button
              onClick={generateScript}
              disabled={generating}
              className="px-4 py-2 bg-white/10 rounded-full flex items-center gap-2"
            ><RefreshCw size={16} /> Dobara</button>
            <button
              onClick={() => setStep('voice')}
              className="px-6 py-2 bg-purple-600 text-white rounded-full font-medium flex items-center gap-2"
            ><Mic size={16} /> Voice Banao</button>
          </div>
        </div>
      )}

      {/* Step 4: Voice */}
      {step === 'voice' && (
        <div className="space-y-4 max-w-lg mx-auto text-center">
          <h2 className="text-lg font-semibold">Voiceover</h2>
          <p className="text-sm text-gray-400">Script ka voiceover generate karo</p>
          <button
            onClick={generateVoice}
            disabled={generatingVoice}
            className="px-6 py-3 bg-purple-600 text-white rounded-full font-medium disabled:opacity-40 flex items-center gap-2 mx-auto"
          >{generatingVoice ? <Loader2 className="animate-spin" size={16} /> : <Mic size={16} />} Voice Generate Karo</button>
          {voiceUrl && (
            <div className="space-y-2">
              <audio controls src={voiceUrl} className="w-full" />
              <a href={voiceUrl} download className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm">
                <Download size={16} /> Download MP3
              </a>
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <button onClick={() => setStep('script')} className="px-6 py-2 bg-white/10 rounded-full">Back</button>
            <button
              onClick={generateVideoPrompts}
              disabled={generatingVideos}
              className="px-6 py-2 bg-purple-600 text-white rounded-full font-medium disabled:opacity-40 flex items-center gap-2"
            >{generatingVideos ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />} Video Prompts</button>
          </div>
        </div>
      )}

      {/* Step 5: Video Prompts */}
      {step === 'video' && (
        <div className="space-y-4 max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-center">Video Prompts</h2>
          <p className="text-sm text-gray-400 text-center">AI image animation ke liye 5 fresh prompts</p>
          {videoPrompts.length === 0 ? (
            <div className="text-center">
              <button
                onClick={generateVideoPrompts}
                disabled={generatingVideos}
                className="px-6 py-3 bg-purple-600 text-white rounded-full font-medium disabled:opacity-40 flex items-center gap-2 mx-auto"
              >{generatingVideos ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />} Prompts Generate Karo</button>
            </div>
          ) : (
            <div className="space-y-2">
              {videoPrompts.map((p, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3 text-sm flex gap-2">
                  <span className="font-bold text-purple-600 shrink-0">{i + 1}.</span>
                  <span>{p.replace(/^\d+[\.\)]\s*/, '')}</span>
                </div>
              ))}
              <button
                onClick={generateVideoPrompts}
                disabled={generatingVideos}
                className="px-4 py-2 bg-white/10 rounded-full text-sm flex items-center gap-2 mx-auto"
              ><RefreshCw size={14} /> Naye Prompts</button>
            </div>
          )}
          <div className="text-center">
            <button onClick={() => setStep('voice')} className="px-6 py-2 bg-white/10 rounded-full">Back</button>
          </div>
        </div>
      )}

      {/* Make the actual video from the character photo */}
      {step === 'video' && selectedChar && (
        <div className="max-w-lg mx-auto space-y-3 bg-white/5 rounded-2xl p-4">
          <h3 className="font-semibold text-center">🎬 Video Banao — Character Photo Se</h3>
          <p className="text-xs text-gray-400 text-center">
            Tumhare chune hue style ({VIDEO_STYLES.find(v => v.id === videoStyle)?.label}) me photo animate hoke
            5-second ka vertical video banega. (5 credits)
          </p>
          <canvas ref={videoCanvasRef} width={720} height={1280} className="w-48 mx-auto rounded-xl bg-black" />
          {renderingVideo ? (
            <div className="text-center text-sm text-gray-300">Video ban raha hai… {Math.round(videoProgress * 100)}%</div>
          ) : studioVideoUrl ? (
            <div className="space-y-2 text-center">
              <video controls src={studioVideoUrl} className="w-48 mx-auto rounded-xl" />
              <a
                href={studioVideoUrl}
                download="kanthi-influencer-video.webm"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium"
              ><Download size={16} /> Video Download Karo</a>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={renderStudioVideo}
                className="px-6 py-3 bg-purple-600 text-white rounded-full font-medium flex items-center gap-2 mx-auto"
              ><Film size={16} /> Video Banao (5 credits)</button>
            </div>
          )}
        </div>
      )}

      {/* Pro Tips from Top AI Influencers */}
      <div className="max-w-lg mx-auto bg-gradient-to-r from-purple-500/20 to-pink-500/10 rounded-2xl p-4 space-y-2">
        <h3 className="font-semibold flex items-center gap-2"><Sparkles size={16} className="text-purple-600" /> Pro Tips (from Top AI Influencers)</h3>
        <ul className="text-sm text-gray-200 space-y-1">
          <li>✅ <b>Consistency:</b> Keep the same face and the same look in every post</li>
          <li>✅ <b>AI Disclosure:</b> Writing "AI influencer" in your bio is mandatory (Instagram rule)</li>
          <li>✅ <b>Pick one niche:</b> Fashion, fitness, or gaming — pick one and focus on it</li>
          <li>✅ <b>Post daily:</b> Top influencers post every day</li>
          <li>⚠️ <b>Followers are not money:</b> it takes ~400K followers to reach ~$5K/month — be patient</li>
        </ul>
      </div>

      {/* Realism Guide - Beat the Competition */}
      <div className="max-w-lg mx-auto bg-gradient-to-r from-blue-500/20 to-cyan-500/10 rounded-2xl p-4 space-y-2">
        <h3 className="font-semibold flex items-center gap-2">🎬 Realism Guide (Beat the Competition!)</h3>
        <div className="text-sm text-gray-200 space-y-2">
          <div>
            <b>🗣️ Perfect the Lip Sync:</b>
            <ul className="ml-4 mt-1 space-y-0.5">
              <li>• Voice speed: 165-175 words/min (energetic, for short-form)</li>
              <li>• Cut pauses longer than 0.15s — dead air kills retention</li>
              <li>• Add light background sound (room tone) — it hides the synthetic silence</li>
            </ul>
          </div>
          <div>
            <b>📸 Rules to Look Realistic:</b>
            <ul className="ml-4 mt-1 space-y-0.5">
              <li>• Use the same character photo every time (face lock)</li>
              <li>• Natural skin texture — don't over-smooth or airbrush</li>
              <li>• Phone-photo style: casual framing — imperfect looks real</li>
              <li>• Max 1-2 actions in one clip — don't over-describe</li>
            </ul>
          </div>
          <div>
            <b>❌ Common Mistakes (Avoid These!):</b>
            <ul className="ml-4 mt-1 space-y-0.5">
              <li>• The face changing in every post (#1 killer)</li>
              <li>• Posting without a hook (the first 3 seconds matter most)</li>
              <li>• Flat script — say it out loud first, then write it</li>
            </ul>
          </div>
        </div>
      </div>

      {!user && (
        <p className="text-center text-sm text-gray-400">Login karo taaki tumhare creations save ho sakein!</p>
      )}
    </div>
  );
}
