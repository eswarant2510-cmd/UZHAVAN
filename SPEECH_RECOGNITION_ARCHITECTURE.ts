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

/**
 * SPEECH RECOGNITION IMPLEMENTATION
 * 
 * This component uses three Web APIs to provide multilingual voice interaction:
 * 
 * 1. SPEECH RECOGNITION API (Microphone Input)
 *    - Browser API: window.SpeechRecognition / window.webkitSpeechRecognition
 *    - Supports: Chrome, Edge, Safari, Opera
 *    - Features:
 *      • Real-time speech-to-text conversion
 *      • Language detection via BCP-47 tags (ta-IN, mr-IN, en-IN)
 *      • Error handling for permissions, device unavailable, no speech detected
 *      • Interim vs final results
 * 
 * 2. SPEECH SYNTHESIS API (Audio Output)
 *    - Browser API: window.speechSynthesis
 *    - Supports: All modern browsers
 *    - Features:
 *      • Text-to-speech output
 *      • Language-specific voice selection
 *      • Pitch, rate, volume control
 *      • Ability to replay responses
 * 
 * 3. TEXT INPUT FALLBACK
 *    - Standard HTML text input
 *    - Provides full accessibility for devices without speech support
 *    - Uses same intent routing as speech input
 * 
 * ARCHITECTURE FLOW:
 * 
 * [User speaks / types] 
 *           ↓
 *    [Speech Recognition API converts to text]
 *           ↓
 *    [processVoiceQuery() routes to business logic]
 *           ↓
 *    [Service layer calls farmerApi, decisionEngine, etc.]
 *           ↓
 *    [Response formatted in user's language]
 *           ↓
 *    [Speech Synthesis API converts response to audio]
 *           ↓
 *    [User sees text + hears audio response]
 */

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

  /**
   * SPEECH RECOGNITION SETUP
   * 
   * This useEffect initializes the SpeechRecognition API with:
   * - Language selection (ta-IN, mr-IN, en-IN)
   * - Event handlers for all lifecycle states
   * - Error recovery and fallback logic
   */
  useEffect(() => {
    // Step 1: Detect browser support for Speech Recognition
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSpeechSupported(Boolean(SpeechRecognitionCtor))
    setSpeechSynthesisSupported(Boolean(window.speechSynthesis))

    if (!SpeechRecognitionCtor) {
      setErrorMsg("Voice input is unavailable on this device. You can type instead.")
      setState("ERROR")
      return
    }

    // Step 2: Create recognition instance
    const recognition = new SpeechRecognitionCtor()
    
    // Step 3: Configure recognition parameters
    recognition.continuous = false           // Stop after one phrase
    recognition.interimResults = false        // Only final results
    recognition.maxAlternatives = 1           // Single best match
    recognition.lang = LANG_BCP[language]     // Set language dynamically

    // Step 4: Handle recognition start (user started speaking)
    recognition.onstart = () => {
      setState("LISTENING")
      setErrorMsg("")
    }

    // Step 5: Handle recognition results (speech converted to text)
    recognition.onresult = (event: any) => {
      // Extract transcript from all results
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript ?? "")
        .join(" ")
        .trim()

      if (!transcript) {
        return
      }

      // Update UI with recognized text
      setRecognizedText(transcript)
      
      // Process the query immediately (no need to wait for user to hit submit)
      void submitText(transcript)
    }

    // Step 6: Handle recognition errors
    recognition.onerror = (event: any) => {
      let message = "Voice input is unavailable on this device. You can type instead."
      
      // Provide specific error messages for common issues
      if (event.error === "not-allowed") {
        message = "Microphone permission denied. Please allow access or type your question."
      } else if (event.error === "no-speech") {
        message = "No speech detected. Please try again."
      } else if (event.error === "network") {
        message = "Network error. Please check your internet connection."
      }

      setErrorMsg(message)
      setState("ERROR")
    }

    // Step 7: Handle recognition end
    recognition.onend = () => {
      // Transition back to READY if still in LISTENING state
      setState((current) => (current === "LISTENING" ? "READY" : current))
    }

    // Step 8: Store recognition instance for later use
    recognitionRef.current = recognition

    // Step 9: Cleanup on unmount
    return () => {
      recognition.stop?.()
    }
  }, [language])

  /**
   * SPEECH SYNTHESIS CLEANUP
   * 
   * Ensure any playing speech is cancelled when component unmounts
   */
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  /**
   * QUERY SUBMISSION HANDLER
   * 
   * This function:
   * 1. Processes the user's query through the intent router
   * 2. Gets response from business logic layer
   * 3. Displays text response
   * 4. Plays audio response if available
   */
  async function submitText(text: string) {
    const trimmed = text.trim()
    if (!trimmed) {
      return
    }

    // Set state to PROCESSING while working
    setState("PROCESSING")
    setTypedInput(trimmed)
    setRecognizedText(trimmed)
    setErrorMsg("")

    // Call voice assistant service with:
    // - Raw query text
    // - Selected language
    // - User role (farmer/buyer)
    // - Current context (lot ID, order ID)
    const result = await processVoiceQuery(trimmed, language, role, currentLotId, currentOrderId)
    setResponseText(result.textResponse)

    // Check if Speech Synthesis API is available
    if (window.speechSynthesis && result.speakResponse) {
      // Set state to SPEAKING and create utterance
      setState("SPEAKING")
      const utterance = new SpeechSynthesisUtterance(result.speakResponse)
      
      // Set language for TTS
      utterance.lang = LANG_BCP[language]
      
      // Try to find a voice that matches the user's language
      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find((voice) => 
        voice.lang.toLowerCase().startsWith(LANG_BCP[language].slice(0, 2))
      )
      if (preferred) {
        utterance.voice = preferred
      }

      // Handle end of speech playback
      utterance.onend = () => setState("READY")
      utterance.onerror = () => setState("READY")

      // Cancel any previously playing speech
      window.speechSynthesis.cancel()
      
      // Start speaking
      window.speechSynthesis.speak(utterance)
      return
    }

    // If no speech synthesis, just show text and go back to READY
    setState("READY")
  }

  /**
   * MICROPHONE TRIGGER
   * 
   * This is called when user clicks the "🎙️ Microphone" button.
   * It starts the speech recognition engine.
   */
  function startListening() {
    if (!speechSupported || !recognitionRef.current) {
      setErrorMsg("Voice input is unavailable on this device. You can type instead.")
      setState("ERROR")
      return
    }

    try {
      recognitionRef.current.start()
    } catch {
      // If recognition fails to start, retry after a short delay
      // (sometimes recognition needs time to reset between sessions)
      setTimeout(() => {
        recognitionRef.current?.start()
      }, 200)
    }
  }

  /**
   * AUDIO REPLAY
   * 
   * User can re-listen to the last response without re-processing
   */
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

  /**
   * LANGUAGE CHANGE
   * 
   * When user switches language, update recognition language
   * and reset the voice assistant state
   */
  function changeLanguage(nextLanguage: VoiceLanguage) {
    setLanguage(nextLanguage)
    localStorage.setItem("uzhavan_voice_lang", nextLanguage)
    setErrorMsg("")
    setState("READY")
    window.speechSynthesis?.cancel()
  }

  // ... UI rendering code follows ...
}

/**
 * BROWSER API COMPATIBILITY
 * 
 * Speech Recognition:
 *   Chrome/Edge/Opera: window.SpeechRecognition (Standard)
 *   Safari: window.webkitSpeechRecognition (Webkit)
 *   Firefox: Not supported (use text input fallback)
 * 
 * Speech Synthesis:
 *   All modern browsers: window.speechSynthesis
 * 
 * Language Tags (BCP-47):
 *   Tamil:  ta-IN
 *   Marathi: mr-IN
 *   English: en-IN
 * 
 * PERMISSIONS:
 *   - Microphone permission required (browser will prompt)
 *   - User can deny → falls back to text input
 *   - Can be revoked in browser settings
 * 
 * ERROR SCENARIOS:
 *   1. Device has no microphone → Show error, use text input
 *   2. User denies permission → Show error, use text input
 *   3. Network error during recognition → Show error, retry
 *   4. No speech detected → Show error, retry listening
 *   5. Speech synthesis not available → Show text only
 */
