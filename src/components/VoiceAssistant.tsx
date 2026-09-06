import { useEffect, useRef, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import {
  processVoiceQuery,
  type UserRole,
  type VoiceLanguage,
  type VoiceState,
} from "../services/voiceAssistant"

// Web Speech API Ambient Type Declarations
interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  lang: string
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null
  onerror: (
    (this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void
  ) | null
  onresult: (
    (this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void
  ) | null
  start(): void
  stop(): void
  abort(): void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

interface VoiceAssistantProps {
  role: UserRole
  currentLotId?: string
  currentOrderId?: string
}

const LANG_LABELS: Record<VoiceLanguage, string> = {
  ta: "தமிழ்",
  hi: "हिन्दी",
  mr: "மராத்தி",
  en: "English",
}

const LANG_BCP: Record<VoiceLanguage, string[]> = {
  ta: ["ta-IN", "ta"],
  en: ["en-IN", "en-US", "en-GB", "en"],
  mr: ["mr-IN", "mr"],
  hi: ["hi-IN", "hi"],
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return win.SpeechRecognition || win.webkitSpeechRecognition || null
}

async function checkPermissionStatus(): Promise<
  "granted" | "denied" | "prompt" | "unknown"
> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unknown"
  }
  try {
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    })
    return status.state
  } catch {
    return "unknown"
  }
}

async function requestMicrophoneAccess(): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return true
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    // IMMEDIATELY RELEASE STREAM TRACKS TO PREVENT EXCLUSIVE HARDWARE LOCKS
    stream.getTracks().forEach((track) => track.stop())
    return true
  } catch (err) {
    console.warn("Microphone access denied or failed:", err)
    return false
  }
}

export default function VoiceAssistant({
  role,
  currentLotId,
  currentOrderId,
}: VoiceAssistantProps) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [language, setLanguage] = useState<VoiceLanguage>(() => {
    const saved = localStorage.getItem("uzhavan_voice_lang")
    return saved === "ta" || saved === "mr" || saved === "hi" || saved === "en"
      ? saved
      : "en"
  })
  const [state, setState] = useState<VoiceState>("READY")
  const [isListening, setIsListening] = useState(false)
  const [typedInput, setTypedInput] = useState("")
  const [recognizedText, setRecognizedText] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [liveTranscript, setLiveTranscript] = useState("")
  const [responseText, setResponseText] = useState("")
  const [actionUrl, setActionUrl] = useState<string | undefined>()
  const [actionLabel, setActionLabel] = useState<string | undefined>()
  const [errorMsg, setErrorMsg] = useState("")
  const [micPermission, setMicPermission] = useState<
    "granted" | "denied" | "prompt" | "unknown"
  >("unknown")
  const [speechSupported, setSpeechSupported] = useState(false)
  const [speechSynthesisSupported, setSpeechSynthesisSupported] =
    useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const shouldListenRef = useRef<boolean>(false)
  const isMountedRef = useRef<boolean>(true)
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isOpenRef = useRef<boolean>(isOpen)

  const isFarmer = role === "farmer"
  const accent = isFarmer ? "#2e7d3a" : "#1d4ed8"
  const accentLight = isFarmer ? "#edf9f0" : "#eff6ff"

  useEffect(() => {
    const handleCustomOpen = () => setIsOpen(true)
    window.addEventListener("open-uzhavan-voice", handleCustomOpen)
    return () => {
      window.removeEventListener("open-uzhavan-voice", handleCustomOpen)
    }
  }, [])

  useEffect(() => {
    isOpenRef.current = isOpen
    if (!isOpen && shouldListenRef.current) {
      stopListening()
    }
  }, [isOpen])

  useEffect(() => {
    isMountedRef.current = true
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor()
    setSpeechSupported(Boolean(SpeechRecognitionCtor))
    setSpeechSynthesisSupported(
      typeof window !== "undefined" && Boolean(window.speechSynthesis)
    )

    void checkPermissionStatus().then(setMicPermission)

    if (!SpeechRecognitionCtor) {
      setErrorMsg(
        "Voice input is unavailable on this browser/device. You can type your question instead."
      )
      return () => {
        isMountedRef.current = false
      }
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.lang = LANG_BCP[language][0]

    recognition.onstart = () => {
      if (!isMountedRef.current) return
      setIsListening(true)
      setState("LISTENING")
      setErrorMsg("")
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!isMountedRef.current) return

      let currentFinal = ""
      let currentInterim = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        const transcriptText = res[0]?.transcript ?? ""
        if (res.isFinal) {
          currentFinal += transcriptText + " "
        } else {
          currentInterim += transcriptText + " "
        }
      }

      if (currentFinal.trim()) {
        const fullFinal = (liveTranscript + " " + currentFinal).trim()
        setLiveTranscript(fullFinal)
        setRecognizedText(fullFinal)
        setInterimTranscript("")
        void submitText(fullFinal)
      } else if (currentInterim.trim()) {
        setInterimTranscript(currentInterim.trim())
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!isMountedRef.current) return

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        shouldListenRef.current = false
        setMicPermission("denied")
        setErrorMsg(
          "Microphone permission was denied. Please allow microphone access in browser settings or type below."
        )
        setState("ERROR")
        setIsListening(false)
        return
      }

      if (event.error === "no-speech" || event.error === "aborted") {
        // Transient error during continuous listening — will auto-restart via onend
        return
      }

      if (event.error === "network") {
        setErrorMsg("Network error occurred during voice recognition.")
        setState("ERROR")
        return
      }

      setErrorMsg("Speech recognition issue detected. You can type instead.")
      setState("ERROR")
    }

    recognition.onend = () => {
      if (!isMountedRef.current) return
      setIsListening(false)

      // AUTO RESTART LOOP FOR CONTINUOUS LISTENING
      if (shouldListenRef.current && isOpenRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
        restartTimerRef.current = setTimeout(() => {
          if (
            shouldListenRef.current &&
            isOpenRef.current &&
            isMountedRef.current
          ) {
            try {
              recognition.start()
            } catch (err) {
              console.warn("Auto-restart start failed:", err)
            }
          }
        }, 250)
      } else {
        setState((curr) => (curr === "LISTENING" ? "READY" : curr))
      }
    }

    recognitionRef.current = recognition

    return () => {
      isMountedRef.current = false
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
      try {
        recognition.stop()
      } catch {}
    }
  }, [language])

  // Speech Synthesis Voice Loading (Async support for Chrome Mobile)
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return

    const loadVoices = () => {
      const avail = window.speechSynthesis.getVoices()
      setVoices(avail)
    }

    loadVoices()
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }

    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  function getPreferredVoice(
    lang: VoiceLanguage,
    availableVoices: SpeechSynthesisVoice[]
  ): SpeechSynthesisVoice | null {
    if (!availableVoices.length) return null
    const targets = LANG_BCP[lang]

    for (const tag of targets) {
      const match = availableVoices.find(
        (v) => v.lang.toLowerCase().replace("_", "-") === tag.toLowerCase()
      )
      if (match) return match
    }

    const prefix = lang === "ta" ? "ta" : lang === "hi" ? "hi" : lang === "mr" ? "mr" : "en"
    return (
      availableVoices.find((v) =>
        v.lang.toLowerCase().startsWith(prefix)
      ) || null
    )
  }

  function stopListening() {
    shouldListenRef.current = false
    setIsListening(false)
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    setState("READY")
  }

  async function toggleListening() {
    if (!speechSupported || !recognitionRef.current) {
      setErrorMsg(
        "Voice input is unavailable on this device. You can type instead."
      )
      setState("ERROR")
      return
    }

    if (shouldListenRef.current) {
      stopListening()
    } else {
      setErrorMsg("")
      const granted = await requestMicrophoneAccess()
      if (!granted) {
        setMicPermission("denied")
        setErrorMsg(
          "Microphone permission was blocked. Please grant permission in browser settings."
        )
        setState("ERROR")
        return
      }

      setMicPermission("granted")
      shouldListenRef.current = true
      setLiveTranscript("")
      setInterimTranscript("")
      setRecognizedText("")

      try {
        recognitionRef.current.lang = LANG_BCP[language][0]
        recognitionRef.current.start()
      } catch (err: unknown) {
        const error = err as { name?: string }
        if (error?.name === "InvalidStateError") {
          try {
            recognitionRef.current.stop()
            setTimeout(() => {
              if (shouldListenRef.current) {
                recognitionRef.current?.start()
              }
            }, 200)
          } catch {}
        } else {
          console.warn("Failed to start speech recognition:", err)
        }
      }
    }
  }

  async function submitText(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return

    setState("PROCESSING")
    setTypedInput(trimmed)
    setRecognizedText(trimmed)
    setErrorMsg("")

    const result = await processVoiceQuery(
      trimmed,
      language,
      role,
      currentLotId,
      currentOrderId
    )
    setResponseText(result.textResponse)
    setActionUrl(result.data?.actionUrl)
    setActionLabel(result.data?.actionLabel)

    if (typeof window !== "undefined" && window.speechSynthesis && result.speakResponse) {
      playSpeech(result.speakResponse)
    } else {
      setState("READY")
    }
  }

  function playSpeech(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) return

    setState("SPEAKING")
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = LANG_BCP[language][0]
    utterance.rate = 0.95
    utterance.pitch = 1.0

    const preferred = getPreferredVoice(language, voices)
    if (preferred) {
      utterance.voice = preferred
    }

    utterance.onend = () => {
      if (isMountedRef.current) setState("READY")
    }
    utterance.onerror = () => {
      if (isMountedRef.current) setState("READY")
    }

    // Small delay before speak prevents Mobile Chrome audio engine lock
    setTimeout(() => {
      window.speechSynthesis.speak(utterance)
    }, 50)
  }

  function handleTypedSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!typedInput.trim()) return

    if (shouldListenRef.current) {
      stopListening()
    }
    void submitText(typedInput)
    setTypedInput("")
  }

  function changeLanguage(nextLanguage: VoiceLanguage) {
    setLanguage(nextLanguage)
    localStorage.setItem("uzhavan_voice_lang", nextLanguage)
    setErrorMsg("")
    setState("READY")
    window.speechSynthesis?.cancel()

    if (shouldListenRef.current && recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
  }

  const currentDisplayTranscript =
    interimTranscript
      ? `${recognizedText} ${interimTranscript}`.trim()
      : recognizedText

  return (
    <>
      <button
        id="voice-assistant-fab"
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 rounded-full px-5 py-3.5 text-sm font-black text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, ${
            isFarmer ? "#1a8c2c" : "#2563eb"
          } 100%)`,
        }}
      >
        <span className="text-lg animate-pulse">🎙️</span>
        <span>ASK UZHAVAN</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
            {/* Header */}
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ background: accentLight }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-sm"
                  style={{ background: accent }}
                >
                  🎙️
                </div>
                <div>
                  <div className="text-sm font-extrabold tracking-wide text-slate-800">
                    UZHAVAN VOICE ASSISTANT
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isListening ? "animate-ping" : ""
                      }`}
                      style={{ background: isListening ? "#ef4444" : accent }}
                    />
                    {isFarmer ? "FARMER" : "BUYER"} · {LANG_LABELS[language]}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  stopListening()
                  setIsOpen(false)
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-500 shadow-sm hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Language Switcher */}
            <div className="border-b bg-slate-50 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Language:
                </span>
                {(["ta", "hi", "mr", "en"] as VoiceLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => changeLanguage(lang)}
                    className="rounded-lg border px-3 py-1 text-[11px] font-bold transition cursor-pointer"
                    style={
                      language === lang
                        ? {
                            background: accent,
                            color: "white",
                            borderColor: accent,
                          }
                        : {
                            background: "white",
                            color: "#374151",
                            borderColor: "#e5e7eb",
                          }
                    }
                  >
                    {LANG_LABELS[lang]}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="space-y-4 p-4">
              {/* Real-time Visual Transcript */}
              {currentDisplayTranscript && (
                <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3.5 text-xs text-slate-800">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                      Real-Time Transcript
                    </span>
                    {isListening && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-red-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-ping" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="font-medium leading-relaxed">
                    {recognizedText}
                    {interimTranscript && (
                      <span className="italic text-slate-400">
                        {" "}
                        {interimTranscript} ...
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Status Badges */}
              {state === "LISTENING" && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-black uppercase tracking-widest text-red-600">
                  <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                  LISTENING (CONTINUOUS MODE)
                </div>
              )}

              {state === "PROCESSING" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center text-xs font-black uppercase tracking-widest text-slate-600">
                  PROCESSING RESPONSE...
                </div>
              )}

              {state === "SPEAKING" && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-black uppercase tracking-widest text-emerald-700">
                  <span className="text-sm animate-bounce">🔊</span>
                  SPEAKING RESPONSE
                </div>
              )}

              {state === "ERROR" && errorMsg && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                  {errorMsg}
                </div>
              )}

              {/* Response Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-800">
                <div className="mb-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                  Response
                </div>
                <p className="font-semibold leading-relaxed">
                  {responseText || "Your response will appear here."}
                </p>

                {actionUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      stopListening()
                      setIsOpen(false)
                      navigate(actionUrl)
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:opacity-95 active:scale-95 mt-3 cursor-pointer"
                    style={{ background: accent }}
                  >
                    <span>➔</span>
                    <span>{actionLabel || "View Details"}</span>
                  </button>
                )}
              </div>

              {!speechSupported && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-center text-[10px] font-semibold text-amber-800">
                  Voice input is unavailable on this device/browser. You can type your query below.
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="space-y-3 border-t bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleListening}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black text-white shadow-sm transition hover:opacity-95 active:scale-95 cursor-pointer"
                  style={{
                    background: isListening ? "#dc2626" : accent,
                  }}
                >
                  <span className="text-base">{isListening ? "⏹️" : "🎙️"}</span>
                  <span>
                    {isListening ? "Stop Listening" : "Start Continuous Listening"}
                  </span>
                </button>

                {responseText && (
                  <button
                    type="button"
                    onClick={() => playSpeech(responseText)}
                    className="flex items-center gap-1.5 rounded-xl px-3.5 py-3 text-xs font-black text-white shadow-sm transition hover:opacity-95 active:scale-95 cursor-pointer"
                    style={{ background: accent }}
                  >
                    <span>🔊</span>
                    <span>Replay</span>
                  </button>
                )}
              </div>

              {/* Text Input Fallback */}
              <form onSubmit={handleTypedSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  placeholder="Type your question here..."
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={!typedInput.trim()}
                  className="rounded-xl px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  style={{ background: accent }}
                >
                  Submit
                </button>
              </form>

              {!speechSynthesisSupported && (
                <div className="text-center text-[10px] italic text-slate-400">
                  Speech synthesis audio output is unavailable on this device, text response is active.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}