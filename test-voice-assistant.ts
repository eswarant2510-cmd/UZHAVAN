// Mock browser global environments
const storage: Record<string, string> = {}
global.localStorage = {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => { storage[key] = value },
    removeItem: (key: string) => { delete storage[key] },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]) },
    length: 0,
    key: (index: number) => Object.keys(storage)[index] || null
}

global.window = {
    localStorage: global.localStorage
} as any

// Mock the Vite environment properties for esbuild/tsx execution
// @ts-ignore
if (typeof import.meta.env === "undefined") {
    // @ts-ignore
    import.meta.env = {
        VITE_SUPABASE_URL: "https://placeholder-url.supabase.co",
        VITE_SUPABASE_ANON_KEY: "placeholder-anon-key",
        VITE_APP_MODE: "demo"
    }
}

import { processVoiceQuery } from "./src/services/voiceAssistant"

async function runTests() {
    console.log("=== RUNNING VOICE ASSISTANT INTENT TESTS ===")

    // Helper check function
    function assert(condition: boolean, message: string) {
        if (!condition) {
            console.error(`❌ FAIL: ${message}`)
            process.exit(1)
        }
        console.log(`✓ PASS: ${message}`)
    }

    // Test 1: Tamil Price query
    console.log("\n--- Testing Tamil Queries ---")
    const r1 = await processVoiceQuery("என் தக்காளிக்கு இப்போ சந்தை விலை என்ன?", "ta", "farmer")
    assert(r1.intent === "MARKET_PRICE", `Expected MARKET_PRICE, got ${r1.intent}`)
    assert(r1.textResponse.includes("விலை") || r1.textResponse.includes("சந்தை"), `Should mention price: ${r1.textResponse}`)

    // Test 2: Tamil Sell query
    const r2 = await processVoiceQuery("நான் இப்போது விற்கலாமா?", "ta", "farmer")
    assert(r2.intent === "BEST_SELLING_DECISION", `Expected BEST_SELLING_DECISION, got ${r2.intent}`)

    // Test 3: Marathi Buyer query
    console.log("\n--- Testing Marathi Queries ---")
    const r3 = await processVoiceQuery("कोणता खरेदीदार मला जास्त पैसे देतो?", "mr", "farmer")
    assert(r3.intent === "BUYER_COMPARISON", `Expected BUYER_COMPARISON, got ${r3.intent}`)

    // Test 4: Marathi Net Return query
    const r4 = await processVoiceQuery("वाहतूक खर्च वजा केल्यावर मला किती मिळेल?", "mr", "farmer")
    assert(r4.intent === "NET_REALISATION", `Expected NET_REALISATION, got ${r4.intent}`)

    // Test 5: English What-If query
    console.log("\n--- Testing English Queries ---")
    const r5 = await processVoiceQuery("What if price falls by 10 percent?", "en", "farmer")
    assert(r5.intent === "WHAT_IF", `Expected WHAT_IF, got ${r5.intent}`)

    // Test 6: English Order Status query
    const r6 = await processVoiceQuery("order status", "en", "farmer")
    assert(r6.intent === "ORDER_STATUS", `Expected ORDER_STATUS, got ${r6.intent}`)

    // Test 7: Buyer Discover available crops query
    console.log("\n--- Testing Buyer Queries ---")
    const r7 = await processVoiceQuery("What crops or lots are available?", "en", "buyer")
    assert(r7.intent === "DISCOVER_LOTS", `Expected DISCOVER_LOTS, got ${r7.intent}`)

    // Test 8: Buyer disputes query
    const r8 = await processVoiceQuery("What is the status of my active disputes?", "en", "buyer")
    assert(r8.intent === "DISPUTE_STATUS", `Expected DISPUTE_STATUS, got ${r8.intent}`)

    console.log("\n=== ALL VOICE ASSISTANT TESTS PASSED SUCCESSFULLY ===")
}

runTests().catch(err => {
    console.error("Test execution failed:", err)
    process.exit(1)
})
