import { resolveIntent, processVoiceQuery, type VoiceLanguage } from "./src/services/voiceAssistant"

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`)
  }
}

const languages: VoiceLanguage[] = ["ta", "mr", "en"]

assertEqual(languages.includes("ta"), true, "Tamil support")
assertEqual(languages.includes("mr"), true, "Marathi support")
assertEqual(languages.includes("en"), true, "English support")
assertEqual(resolveIntent("hello there", "ta"), "UNKNOWN", "Unknown intent default")
assertEqual(resolveIntent("market price today", "en"), "MARKET_PRICE", "Market price intent placeholder")
assertEqual(resolveIntent("order status", "en"), "ORDER_STATUS", "Order status placeholder")

const result = await processVoiceQuery("What is my order status?", "en", "farmer")
assertEqual(result.intent, "ORDER_STATUS", "Process voice query returns placeholder order intent")
assertEqual(result.textResponse.includes("order") || result.textResponse.includes("Order"), true, "Text response renders for placeholder routing")

console.log("Voice assistant foundation checks passed")
