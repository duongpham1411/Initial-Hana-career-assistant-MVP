import { useEffect, useMemo, useRef, useState } from "react";

const VOICE_RECOGNITION_LANG = "en-US";
const POSITION_STORAGE_KEY = "hana_floating_position";
const isDevelopment = import.meta.env.DEV;

const OPENING_LINES = [
  "Hi, I'm Hana. What career question are we solving today?",
  "Ready when you are. Ask me about CV, interview, or a role.",
  "Want to practice an answer together?",
  "Tell me what you are preparing for, and I will help you think it through.",
  "I am here. Ask me by voice when you are ready.",
];

function shortenText(text = "", maxLength = 150) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trim()}...` : normalized;
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function getRecognitionErrorMessage(error) {
  const messages = {
    "no-speech": "I did not catch that. Try again.",
    "audio-capture": "No microphone detected.",
    "not-allowed": "Microphone permission is blocked.",
    network: "Voice recognition network error. Try again.",
    aborted: "Voice input stopped.",
    unsupported: "Voice input is not supported in this browser. Please use Chrome or Edge.",
  };

  return messages[error] || "Voice input had a problem. Try again.";
}

function debugVoiceLog(...args) {
  if (isDevelopment) {
    console.log("[Hana voice]", ...args);
  }
}

function findVoice() {
  if (!window.speechSynthesis) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => /female|woman|samantha|victoria|zira|aria|jenny|susan/i.test(voice.name)) ||
    voices.find((voice) => voice.lang?.toLowerCase().startsWith("en")) ||
    voices[0] ||
    null
  );
}

function getDefaultPosition() {
  if (typeof window === "undefined") {
    return { x: 24, y: 520 };
  }

  const saved = localStorage.getItem(POSITION_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
        return {
          x: Math.min(Math.max(parsed.x, 12), window.innerWidth - 78),
          y: Math.min(Math.max(parsed.y, 12), window.innerHeight - 78),
        };
      }
    } catch {
      localStorage.removeItem(POSITION_STORAGE_KEY);
    }
  }

  return { x: 24, y: Math.max(window.innerHeight - 96, 120) };
}

function clampPosition(position) {
  return {
    x: Math.min(Math.max(position.x, 12), window.innerWidth - 78),
    y: Math.min(Math.max(position.y, 12), window.innerHeight - 78),
  };
}

function ThinkingDots() {
  return (
    <span className="thinking-dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function SpeakingBars() {
  return (
    <span className="speaking-bars" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function getGreeting() {
  return OPENING_LINES[Math.floor(Math.random() * OPENING_LINES.length)];
}

export default function FloatingHanaAssistant({ latestAssistantMessage, onSendMessage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(getDefaultPosition);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1200 : window.innerWidth,
    height: typeof window === "undefined" ? 800 : window.innerHeight,
  }));
  const [greeting, setGreeting] = useState(getGreeting);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [spokenPreview, setSpokenPreview] = useState("");
  const recognitionRef = useRef(null);
  const recognitionSessionRef = useRef(0);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const hasSubmittedTranscriptRef = useRef(false);
  const manualAbortRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  const dragRef = useRef({
    active: false,
    dragged: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const visualState = useMemo(() => {
    if (hasError) {
      return "error";
    }
    if (isListening) {
      return "listening";
    }
    if (isSending) {
      return "thinking";
    }
    if (isSpeaking) {
      return "speaking";
    }
    return "idle";
  }, [hasError, isListening, isSending, isSpeaking]);

  const statusText = {
    idle: "Ready",
    listening: "Listening...",
    thinking: "Thinking...",
    speaking: "Speaking...",
    error: "Try again",
  }[visualState];

  const bubbleText = {
    idle: greeting,
    listening: interimTranscript
      ? `I heard: "${shortenText(interimTranscript, 110)}"`
      : "I am listening. Speak naturally.",
    thinking: "I am sending that to Career Chat",
    speaking: shortenText(spokenPreview || latestAssistantMessage, 130) || "I am reading the latest answer aloud.",
    error: errorMessage || "Voice mode needs attention. You can still use the main chat.",
  }[visualState];

  const popoverClassName = [
    "floating-hana-popover",
    position.x > viewport.width - 390 ? "align-right" : "",
    position.y < 390 ? "open-down" : "open-up",
  ]
    .filter(Boolean)
    .join(" ");

  function resetRecognitionBuffer() {
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    hasSubmittedTranscriptRef.current = false;
    setInterimTranscript("");
  }

  function stopSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }

  function speakText(text, errorText = "I could not play the voice response.") {
    if (!isOpenRef.current || !window.speechSynthesis || !text) {
      return;
    }

    window.speechSynthesis.cancel();
    const textToSpeak = shortenText(text, 520);
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const voice = findVoice();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setHasError(true);
      setErrorMessage(errorText);
    };
    setSpokenPreview(textToSpeak);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function stopListening() {
    if (recognitionRef.current) {
      manualAbortRef.current = true;
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      try {
        recognitionRef.current.abort();
      } catch {
        // Speech recognition may already be closed when cleanup runs.
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }

  function closeAssistant() {
    isOpenRef.current = false;
    setIsOpen(false);
    stopListening();
    stopSpeaking();
    setHasError(false);
    setErrorMessage("");
    resetRecognitionBuffer();
  }

  function openAssistant() {
    const nextGreeting = getGreeting();
    isOpenRef.current = true;
    setGreeting(nextGreeting);
    setIsOpen(true);
    setHasError(false);
    setErrorMessage("");
    resetRecognitionBuffer();
    window.setTimeout(() => {
      if (isOpenRef.current) {
        speakText(nextGreeting, "I could not play Hana's greeting.");
      }
    }, 120);
  }

  function speakReply(reply) {
    speakText(reply);
  }

  async function sendTranscript(transcript) {
    if (!isOpenRef.current) {
      return;
    }

    setHasError(false);
    setErrorMessage("");
    setInterimTranscript("");
    setIsSending(true);

    try {
      debugVoiceLog("sending final transcript", transcript);
      const reply = await onSendMessage(transcript);
      setIsSending(false);
      speakReply(reply);
    } catch {
      setIsSending(false);
      setHasError(true);
      setErrorMessage("Career Chat could not receive the voice message. Try again.");
    }
  }

  function submitTranscriptOnce(transcript, sessionId) {
    const normalizedTranscript = transcript.replace(/\s+/g, " ").trim();
    if (
      !normalizedTranscript ||
      !isOpenRef.current ||
      hasSubmittedTranscriptRef.current ||
      sessionId !== recognitionSessionRef.current
    ) {
      return;
    }

    hasSubmittedTranscriptRef.current = true;
    setIsListening(false);
    sendTranscript(normalizedTranscript);
  }

  function startListening() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setHasError(true);
      setErrorMessage(getRecognitionErrorMessage("unsupported"));
      return;
    }

    stopSpeaking();
    stopListening();
    resetRecognitionBuffer();
    manualAbortRef.current = false;
    recognitionSessionRef.current += 1;
    const sessionId = recognitionSessionRef.current;

    const recognition = new SpeechRecognition();
    recognition.lang = VOICE_RECOGNITION_LANG;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      debugVoiceLog("recognition started");
      setHasError(false);
      setErrorMessage("");
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      if (interimText.trim()) {
        interimTranscriptRef.current = interimText.trim();
        setInterimTranscript(interimTranscriptRef.current);
        debugVoiceLog("interim transcript", interimTranscriptRef.current);
      }

      if (finalText.trim()) {
        finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalText}`.trim();
        debugVoiceLog("final transcript", finalTranscriptRef.current);
        submitTranscriptOnce(finalTranscriptRef.current, sessionId);
      }
    };

    recognition.onerror = (event) => {
      debugVoiceLog("recognition error", event.error);
      recognitionRef.current = null;
      setIsListening(false);

      if (event.error === "aborted" && manualAbortRef.current) {
        setHasError(false);
        setErrorMessage("");
        resetRecognitionBuffer();
        return;
      }

      setHasError(true);
      setErrorMessage(getRecognitionErrorMessage(event.error));
    };

    recognition.onend = () => {
      debugVoiceLog("recognition ended");
      recognitionRef.current = null;
      setIsListening(false);

      if (manualAbortRef.current || hasSubmittedTranscriptRef.current || sessionId !== recognitionSessionRef.current) {
        return;
      }

      const fallbackTranscript = finalTranscriptRef.current || interimTranscriptRef.current;
      if (fallbackTranscript.trim()) {
        submitTranscriptOnce(fallbackTranscript, sessionId);
        return;
      }

      setHasError(true);
      setErrorMessage(getRecognitionErrorMessage("no-speech"));
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setHasError(true);
      setErrorMessage("Voice recognition could not start. Try again.");
    }
  }

  function handleTalk() {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    startListening();
  }

  function handlePointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    dragRef.current = {
      active: true,
      dragged: false,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!dragRef.current.active) {
      return;
    }

    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 5) {
      dragRef.current.dragged = true;
    }

    setPosition(
      clampPosition({
        x: dragRef.current.originX + deltaX,
        y: dragRef.current.originY + deltaY,
      })
    );
  }

  function handlePointerUp(event) {
    if (!dragRef.current.active) {
      return;
    }

    const wasDragged = dragRef.current.dragged;
    const finalPosition = clampPosition({
      x: dragRef.current.originX + event.clientX - dragRef.current.startX,
      y: dragRef.current.originY + event.clientY - dragRef.current.startY,
    });
    dragRef.current.active = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture can already be released by the browser.
    }

    setPosition(finalPosition);
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(finalPosition));

    if (!wasDragged) {
      if (isOpen) {
        closeAssistant();
      } else {
        openAssistant();
      }
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) {
        closeAssistant();
      } else {
        openAssistant();
      }
    }
  }

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (!isOpen) {
      stopListening();
      stopSpeaking();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleResize() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setPosition((currentPosition) => clampPosition(currentPosition));
    }

    function handleEscape(event) {
      if (event.key === "Escape" && isOpenRef.current) {
        closeAssistant();
      }
    }

    window.addEventListener("resize", handleResize);
    document.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("keydown", handleEscape);
      stopListening();
      stopSpeaking();
    };
  }, []);

  return (
    <div className="floating-hana-root" style={{ left: position.x, top: position.y }}>
      {isOpen && (
        <section className={popoverClassName} data-state={visualState} aria-label="Hana voice assistant">
          <header className="floating-hana-header">
            <div>
              <strong>Hana</strong>
              <span>{statusText}</span>
            </div>
            <button aria-label="Close Hana" className="floating-hana-close" type="button" onClick={closeAssistant}>
              x
            </button>
          </header>

          <div className="floating-hana-stage" aria-hidden="true">
            <img alt="" src="/assets/hana-mascot.png" />
            {visualState === "speaking" && <SpeakingBars />}
          </div>

          <div className="floating-hana-bubble" aria-live="polite">
            <p>{bubbleText}</p>
            {visualState === "thinking" && <ThinkingDots />}
          </div>

          <button
            aria-label={isSpeaking ? "Stop speaking" : isListening ? "Stop voice input" : "Start voice input"}
            className={`floating-hana-talk ${isListening ? "listening" : ""} ${isSpeaking ? "speaking" : ""}`}
            disabled={isSending && !isSpeaking}
            type="button"
            onClick={handleTalk}
          >
            <span>{isSpeaking || isListening ? "Stop" : "Mic"}</span>
            {isSpeaking ? "Stop" : isListening ? "Listening" : isSending ? "Thinking" : hasError ? "Retry" : "Talk"}
          </button>
        </section>
      )}

      <button
        aria-label={isOpen ? "Close Hana voice assistant" : "Open Hana voice assistant"}
        className={`floating-hana-button ${isOpen ? "open" : ""}`}
        type="button"
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerCancel={handlePointerUp}
        onPointerUp={handlePointerUp}
      >
        <img alt="" src="/assets/hana-icon.png" />
      </button>
    </div>
  );
}
