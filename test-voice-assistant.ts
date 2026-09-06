import assert from "node:assert"

if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>()
  ;(globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    length: 0,
    key: () => null,
  }
}

if (typeof process.env.VITE_SUPABASE_URL === "undefined") {
  process.env.VITE_SUPABASE_URL = "https://placeholder-url.supabase.co"
}

import { processVoiceQuery } from "./src/services/voiceAssistant"

async function runTests() {
  console.log("=== RUNNING 4-LANGUAGE VOICE ASSISTANT INTENT TESTS ===")

  console.log("\n--- 1. Testing English Queries ---")
  const en1 = await processVoiceQuery(
    "what is the rate of onion today",
    "en",
    "farmer"
  )
  assert.ok(
    en1.intent === "CROP_PRICE" || en1.intent === "MARKET_PRICE",
    `Expected CROP_PRICE for 'what is the rate of onion today', got ${en1.intent}`
  )
  console.log("✓ PASS: English CROP_PRICE ->", en1.intent)

  const en2 = await processVoiceQuery("weather forecast", "en", "farmer")
  assert.strictEqual(en2.intent, "WEATHER")
  console.log("✓ PASS: English WEATHER ->", en2.intent)

  const en3 = await processVoiceQuery("government schemes", "en", "farmer")
  assert.strictEqual(en3.intent, "GOVERNMENT_SCHEMES")
  console.log("✓ PASS: English GOVERNMENT_SCHEMES ->", en3.intent)

  const en4 = await processVoiceQuery("available lots", "en", "buyer")
  assert.strictEqual(en4.intent, "AVAILABLE_LOTS")
  console.log("✓ PASS: English AVAILABLE_LOTS ->", en4.intent)

  console.log("\n--- 2. Testing Tamil Queries ---")
  const ta1 = await processVoiceQuery("வெங்காய விலை", "ta", "farmer")
  assert.ok(
    ta1.intent === "CROP_PRICE" || ta1.intent === "MARKET_PRICE",
    `Expected CROP_PRICE for 'வெங்காய விலை', got ${ta1.intent}`
  )
  console.log("✓ PASS: Tamil CROP_PRICE ->", ta1.intent)

  const ta2 = await processVoiceQuery("வானிலை அறிக்கை", "ta", "farmer")
  assert.strictEqual(ta2.intent, "WEATHER")
  console.log("✓ PASS: Tamil WEATHER ->", ta2.intent)

  const ta3 = await processVoiceQuery("அரசு திட்டம்", "ta", "farmer")
  assert.strictEqual(ta3.intent, "GOVERNMENT_SCHEMES")
  console.log("✓ PASS: Tamil GOVERNMENT_SCHEMES ->", ta3.intent)

  const ta4 = await processVoiceQuery("கிடைக்கும் லாட்கள்", "ta", "buyer")
  assert.strictEqual(ta4.intent, "AVAILABLE_LOTS")
  console.log("✓ PASS: Tamil AVAILABLE_LOTS ->", ta4.intent)

  console.log("\n--- 3. Testing Hindi Queries for All Farmer Intents ---")
  // 1. Crop Price
  const hi1 = await processVoiceQuery("आज प्याज का भाव क्या है", "hi", "farmer")
  assert.ok(
    hi1.intent === "CROP_PRICE" || hi1.intent === "MARKET_PRICE",
    `Expected CROP_PRICE for 'आज प्याज का भाव क्या है', got ${hi1.intent}`
  )
  console.log("✓ PASS: Hindi 1. Crop Price ->", hi1.intent)

  // 2. Weather
  const hi2 = await processVoiceQuery("मौसम कैसा है", "hi", "farmer")
  assert.strictEqual(hi2.intent, "WEATHER")
  console.log("✓ PASS: Hindi 2. Weather ->", hi2.intent)

  // 3. Fertilizer Recommendation
  const hi3 = await processVoiceQuery("खाद की सिफारिश", "hi", "farmer")
  assert.strictEqual(hi3.intent, "FERTILIZER_RECOMMENDATION")
  console.log("✓ PASS: Hindi 3. Fertilizer Recommendation ->", hi3.intent)

  // 4. Pest Control
  const hi4 = await processVoiceQuery("कीट नियंत्रण स्प्रे", "hi", "farmer")
  assert.strictEqual(hi4.intent, "PEST_CONTROL")
  console.log("✓ PASS: Hindi 4. Pest Control ->", hi4.intent)

  // 5. Government Schemes
  const hi5 = await processVoiceQuery("सरकारी योजना", "hi", "farmer")
  assert.strictEqual(hi5.intent, "GOVERNMENT_SCHEMES")
  console.log("✓ PASS: Hindi 5. Government Schemes ->", hi5.intent)

  // 6. Order Status
  const hi6 = await processVoiceQuery("मेरा ऑर्डर स्थिति", "hi", "farmer", undefined, "ORD-123456")
  assert.strictEqual(hi6.intent, "ORDER_STATUS")
  console.log("✓ PASS: Hindi 6. Order Status ->", hi6.intent)

  // 7. Seller Details
  const hi7 = await processVoiceQuery("विक्रेता विवरण", "hi", "buyer")
  assert.strictEqual(hi7.intent, "SELLER_DETAILS")
  console.log("✓ PASS: Hindi 7. Seller Details ->", hi7.intent)

  // 8. Available Lots
  const hi8 = await processVoiceQuery("उपलब्ध लॉट दिखाओ", "hi", "buyer")
  assert.ok(
    hi8.intent === "AVAILABLE_LOTS" || hi8.intent === "DISCOVER_LOTS",
    `Expected AVAILABLE_LOTS for 'उपलब्ध लॉट दिखाओ', got ${hi8.intent}`
  )
  console.log("✓ PASS: Hindi 8. Available Lots ->", hi8.intent)

  console.log("\n--- 4. Testing Roman Hindi Phrase Support ---")
  // Phrase 1: Pyaz ka bhav kya hai
  const rh1 = await processVoiceQuery("Pyaz ka bhav kya hai", "hi", "farmer")
  assert.ok(rh1.intent === "CROP_PRICE" || rh1.intent === "MARKET_PRICE")
  assert.strictEqual(rh1.data?.crop, "onion")
  console.log("✓ PASS: Roman Hindi 1. 'Pyaz ka bhav kya hai' ->", rh1.intent, "(crop: onion)")

  // Phrase 2: Aaj pyaz ka rate kya hai
  const rh2 = await processVoiceQuery("Aaj pyaz ka rate kya hai", "hi", "farmer")
  assert.ok(rh2.intent === "CROP_PRICE" || rh2.intent === "MARKET_PRICE")
  assert.strictEqual(rh2.data?.crop, "onion")
  console.log("✓ PASS: Roman Hindi 2. 'Aaj pyaz ka rate kya hai' ->", rh2.intent, "(crop: onion)")

  // Phrase 3: Tamatar ka bhav kya hai
  const rh3 = await processVoiceQuery("Tamatar ka bhav kya hai", "hi", "farmer")
  assert.ok(rh3.intent === "CROP_PRICE" || rh3.intent === "MARKET_PRICE")
  assert.strictEqual(rh3.data?.crop, "tomato")
  console.log("✓ PASS: Roman Hindi 3. 'Tamatar ka bhav kya hai' ->", rh3.intent, "(crop: tomato)")

  // Phrase 4: Aloo ka rate kya hai
  const rh4 = await processVoiceQuery("Aloo ka rate kya hai", "hi", "farmer")
  assert.ok(rh4.intent === "CROP_PRICE" || rh4.intent === "MARKET_PRICE")
  assert.strictEqual(rh4.data?.crop, "potato")
  console.log("✓ PASS: Roman Hindi 4. 'Aloo ka rate kya hai' ->", rh4.intent, "(crop: potato)")

  // Phrase 5: Mausam kaisa hai
  const rh5 = await processVoiceQuery("Mausam kaisa hai", "hi", "farmer")
  assert.strictEqual(rh5.intent, "WEATHER")
  console.log("✓ PASS: Roman Hindi 5. 'Mausam kaisa hai' ->", rh5.intent)

  // Phrase 6: Barish hogi kya
  const rh6 = await processVoiceQuery("Barish hogi kya", "hi", "farmer")
  assert.strictEqual(rh6.intent, "WEATHER")
  console.log("✓ PASS: Roman Hindi 6. 'Barish hogi kya' ->", rh6.intent)

  // Phrase 7: PM Kisan yojana
  const rh7 = await processVoiceQuery("PM Kisan yojana", "hi", "farmer")
  assert.strictEqual(rh7.intent, "GOVERNMENT_SCHEMES")
  console.log("✓ PASS: Roman Hindi 7. 'PM Kisan yojana' ->", rh7.intent)

  // Phrase 8: Khaad ki salah do
  const rh8 = await processVoiceQuery("Khaad ki salah do", "hi", "farmer")
  assert.strictEqual(rh8.intent, "FERTILIZER_RECOMMENDATION")
  console.log("✓ PASS: Roman Hindi 8. 'Khaad ki salah do' ->", rh8.intent)

  console.log("\n--- 5. Testing Marathi Queries ---")
  const mr1 = await processVoiceQuery("आज कांद्याचा भाव काय आहे", "mr", "farmer")
  assert.ok(
    mr1.intent === "CROP_PRICE" || mr1.intent === "MARKET_PRICE",
    `Expected CROP_PRICE for 'आज कांद्याचा भाव काय आहे', got ${mr1.intent}`
  )
  console.log("✓ PASS: Marathi CROP_PRICE ->", mr1.intent)

  const mr2 = await processVoiceQuery("हवामान कसे आहे", "mr", "farmer")
  assert.strictEqual(mr2.intent, "WEATHER")
  console.log("✓ PASS: Marathi WEATHER ->", mr2.intent)

  const mr3 = await processVoiceQuery("सरकारी योजना", "mr", "farmer")
  assert.strictEqual(mr3.intent, "GOVERNMENT_SCHEMES")
  console.log("✓ PASS: Marathi GOVERNMENT_SCHEMES ->", mr3.intent)

  const mr4 = await processVoiceQuery("उपलब्ध लॉट दाखवा", "mr", "buyer")
  assert.ok(
    mr4.intent === "AVAILABLE_LOTS" || mr4.intent === "DISCOVER_LOTS",
    `Expected AVAILABLE_LOTS for 'उपलब्ध लॉट दाखवा', got ${mr4.intent}`
  )
  console.log("✓ PASS: Marathi AVAILABLE_LOTS ->", mr4.intent)

  console.log("\n=== ALL 4-LANGUAGE VOICE ASSISTANT INTENT TESTS PASSED SUCCESSFULLY ===")
}

runTests().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
