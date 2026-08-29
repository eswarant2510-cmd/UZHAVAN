import assert from "node:assert/strict"

;(globalThis as any).__UZHAVAN_ENV__ = {
  VITE_SUPABASE_URL: "https://placeholder-url.supabase.co",
  VITE_SUPABASE_ANON_KEY: "placeholder-anon-key",
  VITE_APP_MODE: "demo",
}

const { resolveIntent, processVoiceQuery } = await import("./src/services/voiceAssistant")

const marketIntent = resolveIntent("தக்காளியின் இப்போதைய சந்தை விலை என்ன?", "ta", { crop: "Tomato" })
assert.equal(marketIntent, "MARKET_PRICE")

const english = await processVoiceQuery("What is the latest tomato price?", "en", "farmer", "LW001")
assert.equal(english.intent, "MARKET_PRICE")
assert.match(english.textResponse, /Tomato|market|range|demand|selling/i)

console.log("voice milestone assertions passed")
