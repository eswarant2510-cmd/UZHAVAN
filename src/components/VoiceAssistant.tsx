import { useEffect, useRef, useState, type FormEvent } from "react"
import { processVoiceQuery, type UserRole, type VoiceLanguage, type VoiceState } from "../services/voiceAssistant"

interface VoiceAssistantProps {
  role: UserRole
  currentLotId?: string
  currentOrderId?: string
}

const LANG_LABELS: Record<VoiceLanguage, string> = {
  ta: "தமிழ்",
  mr: "मराठी",
  en: "English",
}

const LANG_BCP: Record<VoiceLanguage, string> = {
  ta: "ta-IN",
  mr: "mr-IN",
  en: "en-IN",
}

function getRecognitionLanguage(language: VoiceLanguage) {
  if (language === "en") {
    return "en-US"
  }

  return LANG_BCP[language]
}

export default function VoiceAssistant({ role, currentLotId, currentOrderId }: VoiceAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [language, setLanguage] = useState<VoiceLanguage>(() => {
    const saved = localStorage.getItem("uzhavan_voice_lang")
    return saved === "ta" || saved === "mr" || saved === "en" ? saved : "en"
  })
  const [state, setState] = useState<VoiceState>("READY")
  const [typedInput, setTypedInput] = useState("")
  const [recognizedText, setRecognizedText] = useState("")
  const [responseText, setResponseText] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [speechSupported, setSpeechSupported] = useState(false)
  const [speechSynthesisSupported, setSpeechSynthesisSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  const isFarmer = role === "farmer"
  const accent = isFarmer ? "#2e7d3a" : "#1d4ed8"
  const accentLight = isFarmer ? "#edf9f0" : "#eff6ff"

  useEffect(() => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSpeechSupported(Boolean(SpeechRecognitionCtor))
    setSpeechSynthesisSupported(Boolean(window.speechSynthesis))

    if (!SpeechRecognitionCtor) {
      setErrorMsg("Voice input is unavailable on this device. You can type instead.")
      setState("ERROR")
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.lang = getRecognitionLanguage(language)

    recognition.onstart = () => {
      setState("LISTENING")
      setErrorMsg("")
    }

    recognition.onend = () => {
      setState((current) => (current === "LISTENING" ? "READY" : current))
    }

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript ?? "")
        .join(" ")
        .trim()

      if (!transcript) {
        return
      }

      setRecognizedText(transcript)
      void submitText(transcript)
    }

    recognition.onerror = (event: any) => {
      const message =
        event.error === "not-allowed"
          ? "Microphone permission denied. Please allow access or type your question."
          : event.error === "no-speech"
            ? "No speech detected. Please try again."
            : "Voice input is unavailable on this device. You can type instead."

      setErrorMsg(message)
      setState("ERROR")
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop?.()
    }
  }, [language])

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  async function submitText(text: string) {
    const trimmed = text.trim()
    if (!trimmed) {
      return
    }

    setState("PROCESSING")
    setTypedInput(trimmed)
    setRecognizedText(trimmed)
    setErrorMsg("")

    const result = await processVoiceQuery(trimmed, language, role, currentLotId, currentOrderId)
    setResponseText(result.textResponse)

    if (window.speechSynthesis && result.speakResponse) {
      setState("SPEAKING")
      const utterance = new SpeechSynthesisUtterance(result.speakResponse)
      utterance.lang = LANG_BCP[language]
      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find((voice) => voice.lang.toLowerCase().startsWith(LANG_BCP[language].slice(0, 2)))
      if (preferred) {
        utterance.voice = preferred
      }
      utterance.onend = () => setState("READY")
      utterance.onerror = () => setState("READY")
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
      return
    }

    setState("READY")
  }

  function handleTypedSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!typedInput.trim()) {
      return
    }

    void submitText(typedInput)
    setTypedInput("")
  }

  async function startListening() {
    if (!speechSupported || !recognitionRef.current) {
      setErrorMsg("Voice input is unavailable on this device. You can type instead.")
      setState("ERROR")
      return
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true })
      }

      recognitionRef.current.lang = getRecognitionLanguage(language)
      recognitionRef.current.start()
    } catch {
      setErrorMsg("Microphone permission was blocked. Please allow access and try again, or type your question instead.")
      setState("ERROR")
    }
  }

  function speakLastResponse() {
    if (!responseText || !window.speechSynthesis) {
      return
    }

    const utterance = new SpeechSynthesisUtterance(responseText)
    utterance.lang = LANG_BCP[language]
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find((voice) => voice.lang.toLowerCase().startsWith(LANG_BCP[language].slice(0, 2)))
    if (preferred) {
      utterance.voice = preferred
    }
    utterance.onend = () => setState("READY")
    utterance.onerror = () => setState("READY")
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    setState("SPEAKING")
  }

  function changeLanguage(nextLanguage: VoiceLanguage) {
    setLanguage(nextLanguage)
    localStorage.setItem("uzhavan_voice_lang", nextLanguage)
    setErrorMsg("")
    setState("READY")
    window.speechSynthesis?.cancel()
  }

  return (
    <>
      <button
        id="voice-assistant-fab"
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full px-5 py-3.5 text-sm font-black text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        style={{ background: `linear-gradient(135deg, ${accent} 0%, ${isFarmer ? "#1a8c2c" : "#2563eb"} 100%)` }}
      >
        <span className="text-lg">🎙️</span>
        <span>ASK UZHAVAN</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ background: accentLight }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-sm" style={{ background: accent }}>
                  🎙️
                </div>
                <div>
                  <div className="text-sm font-extrabold tracking-wide text-slate-800">UZHAVAN VOICE ASSISTANT</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
                    {isFarmer ? "FARMER" : "BUYER"} · {LANG_LABELS[language]}
                  </div>
                </div>
              </div>

              <button type="button" onClick={() => setIsOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-500 shadow-sm hover:bg-slate-100">
                ✕
              </button>
            </div>

            <div className="border-b bg-slate-50 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Language:</span>
                {(["ta", "mr", "en"] as VoiceLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => changeLanguage(lang)}
                    className="rounded-lg border px-3 py-1 text-[11px] font-bold transition"
                    style={
                      language === lang
                        ? { background: accent, color: "white", borderColor: accent }
                        : { background: "white", color: "#374151", borderColor: "#e5e7eb" }
                    }
                  >
                    {LANG_LABELS[lang]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 p-4">
              {recognizedText && (
                <div className="rounded-2xl bg-slate-100 p-3 text-xs font-semibold text-slate-700">
                  <div className="mb-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Recognized text</div>
                  <p>{recognizedText}</p>
                </div>
              )}

              {state === "LISTENING" && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-center text-xs font-black uppercase tracking-widest text-red-600">
                  LISTENING
                </div>
              )}

              {state === "PROCESSING" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                  PROCESSING
                </div>
              )}

              {state === "SPEAKING" && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center text-xs font-black uppercase tracking-widest text-emerald-700">
                  SPEAKING
                </div>
              )}

              {state === "ERROR" && errorMsg && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                  {errorMsg}
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <div className="mb-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Response</div>
                <p>{responseText || "Your response will appear here."}</p>
              </div>

              {!speechSupported && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-center text-[10px] font-semibold text-amber-700">
                  Voice input is unavailable on this device. You can type instead.
                </div>
              )}
            </div>

            <div className="space-y-3 border-t bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startListening}
                  className="flex-1 rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:opacity-95"
                  style={{ background: accent }}
                >
                  🎙️ Microphone
                </button>
                {responseText && (
                  <button
                    type="button"
                    onClick={speakLastResponse}
                    className="rounded-xl px-3 py-2.5 text-xs font-black text-white shadow-sm transition hover:opacity-95"
                    style={{ background: accent }}
                  >
                    🔊 Replay
                  </button>
                )}
              </div>

              <form onSubmit={handleTypedSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={typedInput}
                  onChange={(event) => setTypedInput(event.target.value)}
                  placeholder="Type your question here"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2"
                  style={{ boxShadow: "0 0 0 0 rgba(0,0,0,0)" }}
                />
                <button
                  type="submit"
                  disabled={!typedInput.trim()}
                  className="rounded-xl px-3 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: accent }}
                >
                  Submit
                </button>
              </form>

              {!speechSynthesisSupported && (
                <div className="text-center text-[10px] italic text-slate-400">
                  Speech output is unavailable on this device, but the text response still works.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}