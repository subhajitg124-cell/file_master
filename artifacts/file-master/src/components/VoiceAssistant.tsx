/**
 * Voice Assistant Component - Multi-language (English, Hindi, Bengali)
 * Provides voice-guided interactions and audio feedback
 */

import React, { useState, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

interface VoiceAssistantProps {
  language?: "en" | "hi" | "bn";
  onCommandDetected?: (command: string) => void;
}

export function VoiceAssistant({
  language = "en",
  onCommandDetected,
}: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    if (!recognitionRef.current) {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error("Speech Recognition not supported in this browser");
        return false;
      }
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.language = getLanguageCode(language);

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setTranscript("");
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          finalTranscript += event.results[i][0].transcript;
        }
        setTranscript(finalTranscript);
        if (event.results[0].isFinal) {
          onCommandDetected?.(finalTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    return true;
  };

  // Start listening
  const startListening = () => {
    if (initializeSpeechRecognition()) {
      recognitionRef.current?.start();
    }
  };

  // Stop listening
  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  // Text to speech
  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Text-to-Speech not supported");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLanguageCode(language);
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const getLanguageCode = (lang: string) => {
    switch (lang) {
      case "hi":
        return "hi-IN";
      case "bn":
        return "bn-IN";
      default:
        return "en-US";
    }
  };

  const getLanguageName = () => {
    switch (language) {
      case "hi":
        return "हिंदी";
      case "bn":
        return "বাঙালি";
      default:
        return "English";
    }
  };

  const getPlaceholderText = () => {
    switch (language) {
      case "hi":
        return "अपनी फ़ाइल अपलोड करें या कम्प्रेस करें";
      case "bn":
        return "আপনার ফাইল আপলোড করুন বা সংকুচিত করুন";
      default:
        return "Upload your file or compress document";
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-4 space-y-3">
      {/* Language Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-900">
            Voice Assistant - {getLanguageName()}
          </span>
        </div>
      </div>

      {/* Voice Input Section */}
      <div className="bg-white rounded-lg p-4 space-y-3">
        {/* Placeholder/Hint */}
        <p className="text-sm text-gray-600">{getPlaceholderText()}</p>

        {/* Transcript Display */}
        {transcript && (
          <div className="bg-purple-50 rounded p-3 border border-purple-200">
            <p className="text-xs font-semibold text-purple-900 mb-1">You said:</p>
            <p className="text-sm text-purple-800 italic">{transcript}</p>
          </div>
        )}

        {/* Microphone Controls */}
        <div className="flex gap-2">
          {!isListening ? (
            <button
              onClick={startListening}
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              <Mic className="w-4 h-4" />
              Tap to Speak
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 animate-pulse"
            >
              <MicOff className="w-4 h-4" />
              Stop Listening...
            </button>
          )}

          {/* Test Speaker */}
          <button
            onClick={() => speak("Document uploaded successfully")}
            disabled={isSpeaking}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
            title="Test audio feedback"
          >
            {isSpeaking ? (
              <VolumeX className="w-4 h-4 animate-pulse" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Accessibility Note */}
        <p className="text-xs text-gray-500">
          🎙️ Voice input makes document processing easier and more accessible
        </p>
      </div>
    </div>
  );
}

/**
 * Voice Command Button - Compact version
 */
interface VoiceCommandButtonProps {
  language?: "en" | "hi" | "bn";
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
      recognitionRef.current.language =
        language === "hi" ? "hi-IN" : language === "bn" ? "bn-IN" : "en-US";

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
      className="p-2 hover:bg-purple-100 disabled:bg-purple-200 rounded-lg transition"
      title="Voice input"
    >
      {isListening ? (
        <Mic className="w-5 h-5 text-purple-600 animate-pulse" />
      ) : (
        <Mic className="w-5 h-5 text-gray-500" />
      )}
    </button>
  );
}
