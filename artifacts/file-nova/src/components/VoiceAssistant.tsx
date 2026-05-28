/**
 * Voice Assistant Component - Multi-language (English, Hindi, Bengali)
 * Provides voice-guided interactions with command routing
 */

import React, { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Volume2, VolumeX, Globe2, Zap } from "lucide-react";
import { toast } from "sonner";

type VoiceLang = "en" | "hi" | "bn";

interface ParsedCommand {
  action: string;
  target: string;
  raw: string;
}

interface VoiceAssistantProps {
  onCommand?: (action: string, target: string) => void;
}

const LANG_LABELS: Record<VoiceLang, string> = {
  en: "English",
  hi: "हिन्दी",
  bn: "বাংলা",
};

const LANG_CODES: Record<VoiceLang, string> = {
  en: "en-US",
  hi: "hi-IN",
  bn: "bn-IN",
};

const PLACEHOLDERS: Record<VoiceLang, string> = {
  en: 'Try saying: "compress PDF" or "merge documents"',
  hi: 'बोलें: "PDF compress करो" या "documents merge करो"',
  bn: 'বলুন: "PDF সংকুচিত করো" বা "ছবি রিসাইজ করো"',
};

// ── Command patterns per language ──────────────────────────────────────────────
const COMMAND_MAP: Record<VoiceLang, Array<{ pattern: RegExp; action: string; target: string }>> = {
  en: [
    { pattern: /compress\s*(pdf|image|photo|video|document|file)?/i, action: "compress", target: "pdf" },
    { pattern: /merge\s*(pdf|document|file)?s?/i, action: "merge", target: "pdf" },
    { pattern: /resize\s*(image|photo|picture)?/i, action: "resize", target: "image" },
    { pattern: /ocr|extract\s*text|scan\s*text/i, action: "ocr", target: "pdf" },
    { pattern: /convert\s*(image|photo)?\s*to\s*pdf/i, action: "convert", target: "pdf" },
    { pattern: /split\s*(pdf|document)?/i, action: "split", target: "pdf" },
    { pattern: /watermark/i, action: "watermark", target: "pdf" },
    { pattern: /enhance|improve\s*(image|photo)?/i, action: "enhance", target: "image" },
    { pattern: /upload|open\s*file/i, action: "upload", target: "file" },
    { pattern: /aadhaar|aadhar|mask/i, action: "aadhaar-mask", target: "document" },
    { pattern: /share|whatsapp/i, action: "share", target: "whatsapp" },
  ],
  hi: [
    { pattern: /compress|कंप्रेस|छोटा\s*कर/i, action: "compress", target: "pdf" },
    { pattern: /merge|मर्ज|जोड़/i, action: "merge", target: "pdf" },
    { pattern: /resize|रिसाइज|साइज\s*बदल/i, action: "resize", target: "image" },
    { pattern: /ocr|टेक्स्ट\s*निकाल|स्कैन/i, action: "ocr", target: "pdf" },
    { pattern: /convert|कनवर्ट|बदल/i, action: "convert", target: "pdf" },
    { pattern: /split|विभाजित|अलग\s*कर/i, action: "split", target: "pdf" },
    { pattern: /upload|अपलोड|फ़ाइल\s*खोल/i, action: "upload", target: "file" },
    { pattern: /आधार|मास्क/i, action: "aadhaar-mask", target: "document" },
    { pattern: /share|शेयर|whatsapp/i, action: "share", target: "whatsapp" },
  ],
  bn: [
    { pattern: /compress|সংকুচিত|কম্প্রেস|ছোট\s*কর/i, action: "compress", target: "pdf" },
    { pattern: /merge|মার্জ|যুক্ত\s*কর/i, action: "merge", target: "pdf" },
    { pattern: /resize|রিসাইজ|আকার\s*বদল/i, action: "resize", target: "image" },
    { pattern: /ocr|টেক্সট\s*বের\s*কর|স্ক্যান/i, action: "ocr", target: "pdf" },
    { pattern: /convert|রূপান্তর/i, action: "convert", target: "pdf" },
    { pattern: /split|ভাগ\s*কর/i, action: "split", target: "pdf" },
    { pattern: /upload|আপলোড|ফাইল\s*খোল/i, action: "upload", target: "file" },
    { pattern: /আধার|মাস্ক/i, action: "aadhaar-mask", target: "document" },
    { pattern: /share|শেয়ার|whatsapp/i, action: "share", target: "whatsapp" },
  ],
};

function parseVoiceCommand(transcript: string, language: VoiceLang): ParsedCommand | null {
  const patterns = COMMAND_MAP[language] || COMMAND_MAP.en;
  for (const { pattern, action, target } of patterns) {
    if (pattern.test(transcript)) {
      // Try to detect target from transcript
      let detectedTarget = target;
      if (/pdf/i.test(transcript)) detectedTarget = "pdf";
      else if (/image|photo|picture|ছবি|फोटो|तस्वीर/i.test(transcript)) detectedTarget = "image";
      else if (/video|ভিডিও|वीडियो/i.test(transcript)) detectedTarget = "video";
      else if (/document|doc|ডকুমেন্ট|दस्तावेज/i.test(transcript)) detectedTarget = "document";
      return { action, target: detectedTarget, raw: transcript };
    }
  }
  return null;
}

const ACTION_LABELS: Record<string, string> = {
  compress: "📦 Compress",
  merge: "🔗 Merge",
  resize: "📐 Resize",
  ocr: "🔍 OCR Extract",
  convert: "🔄 Convert",
  split: "✂️ Split",
  watermark: "💧 Watermark",
  enhance: "✨ Enhance",
  upload: "📤 Upload",
  "aadhaar-mask": "🛡️ Aadhaar Mask",
  share: "📱 WhatsApp Share",
};

export function VoiceAssistant({ onCommand }: VoiceAssistantProps) {
  const [language, setLanguage] = useState<VoiceLang>("en");
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState<ParsedCommand | null>(null);
  const recognitionRef = useRef<any>(null);

  const initializeSpeechRecognition = useCallback(() => {
    // Always recreate to update language
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech Recognition not supported in this browser");
      return false;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.language = LANG_CODES[language];
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setLastCommand(null);
    };

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setTranscript(finalTranscript);

      // Parse command
      const parsed = parseVoiceCommand(finalTranscript, language);
      if (parsed) {
        setLastCommand(parsed);
        onCommand?.(parsed.action, parsed.target);
        toast.success(`Voice command: ${parsed.action} → ${parsed.target}`);
        speak(
          language === "hi"
            ? `${parsed.action} शुरू हो रहा है`
            : language === "bn"
              ? `${parsed.action} শুরু হচ্ছে`
              : `Starting ${parsed.action} for ${parsed.target}`
        );
      } else {
        toast.info("Command not recognized. Try again.");
      }
    };

    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onerror = () => setIsListening(false);

    return true;
  }, [language, onCommand]);

  const startListening = () => {
    if (initializeSpeechRecognition()) {
      recognitionRef.current?.start();
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_CODES[language];
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-premium">
      {/* Header + Language Selector */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Globe2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Voice Assistant
            </p>
            <p className="text-sm font-black text-foreground">{LANG_LABELS[language]}</p>
          </div>
        </div>

        {/* Language tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-background/60 p-1">
          {(["en", "hi", "bn"] as VoiceLang[]).map((code) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                language === code
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {LANG_LABELS[code]}
            </button>
          ))}
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground leading-5">{PLACEHOLDERS[language]}</p>

      {/* Transcript */}
      {transcript && (
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <p className="text-[11px] font-bold text-muted-foreground mb-1">You said:</p>
          <p className="text-sm text-foreground italic">{transcript}</p>
        </div>
      )}

      {/* Detected command badge */}
      {lastCommand && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 animate-fade-up">
          <Zap className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-primary uppercase tracking-wide">
              Command detected
            </p>
            <p className="text-sm font-black text-foreground">
              {ACTION_LABELS[lastCommand.action] || lastCommand.action} → {lastCommand.target}
            </p>
          </div>
        </div>
      )}

      {/* Microphone Controls */}
      <div className="flex gap-2">
        {!isListening ? (
          <button
            id="voice-start-btn"
            onClick={startListening}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-black py-3 text-sm transition hover:opacity-90 shadow-glow-sm"
          >
            <Mic className="h-4 w-4" />
            Tap to Speak
          </button>
        ) : (
          <button
            id="voice-stop-btn"
            onClick={stopListening}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-destructive text-destructive-foreground font-black py-3 text-sm transition animate-pulse"
          >
            <MicOff className="h-4 w-4" />
            Listening…
          </button>
        )}

        <button
          id="voice-test-speaker"
          onClick={() =>
            speak(
              language === "hi"
                ? "FileNova तैयार है"
                : language === "bn"
                  ? "FileNova প্রস্তুত"
                  : "FileNova is ready"
            )
          }
          disabled={isSpeaking}
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-50 transition"
          title="Test speaker"
        >
          {isSpeaking ? (
            <VolumeX className="h-4 w-4 animate-pulse" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        🎙️ Voice commands work in English, Hindi & Bengali
      </p>
    </div>
  );
}

/**
 * Voice Command Button - Compact version
 */
interface VoiceCommandButtonProps {
  language?: VoiceLang;
  onCommand?: (text: string) => void;
}

export function VoiceCommandButton({
  language = "en",
  onCommand,
}: VoiceCommandButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech Recognition not supported");
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.language = LANG_CODES[language];
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        onCommand?.(transcript);
      };
    }

    recognitionRef.current.start();
  };

  return (
    <button
      onClick={startListening}
      disabled={isListening}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-primary disabled:text-primary disabled:animate-pulse transition"
      title="Voice input"
    >
      <Mic className={`h-4 w-4 ${isListening ? "text-primary" : ""}`} />
    </button>
  );
}
