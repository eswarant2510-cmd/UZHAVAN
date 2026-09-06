import { saveSession, readSession } from "./src/lib/auth"
import { farmerApi } from "./src/services/farmerApi"

// Mock localStorage for Node environment if needed
if (typeof globalThis.localStorage === "undefined") {
  const store: Record<string, string> = {}
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      for (const k in store) delete store[k]
    },
    key: (index: number) => Object.keys(store)[index] || null,
    length: 0,
  }
}

async function runOwnershipVerificationTests() {
  console.log("==========================================================")
  console.log(" UZHAVAN: Strict Lot Ownership & Access Control Verification Tests")
  console.log("==========================================================\n")

  let passedTests = 0
  let totalTests = 0

  function assertTest(description: string, passed: boolean, details?: string) {
    totalTests++
    if (passed) {
      passedTests++
      console.log(`✅ TEST ${totalTests} PASSED: ${description}`)
      if (details) console.log(`   └─ ${details}`)
    } else {
      console.error(`❌ TEST ${totalTests} FAILED: ${description}`)
      if (details) console.error(`   └─ ${details}`)
    }
  }

  // --- SCENARIO 1: LOGIN AS FARMER 588 ---
  console.log("--- SCENARIO 1: Authenticated as Farmer #588 ---")
  saveSession("farmer", "588")
  const session588 = readSession()
  assertTest("Farmer 588 Session Loaded", session588?.loginNumber === "588", `Logged in user: ${session588?.name}`)

  // Create a lot as 588
  const testLot588Id = `LW588_${Date.now()}`
  await farmerApi.createLot({
    id: testLot588Id,
    crop: "Tomato",
    variety: "Local Hybrid",
    quantityKg: 300,
    unit: "kg",
    imageUrl: "https://example.com/tomato.jpg",
    location: "Nashik, Maharashtra",
    expectedNetPerKg: 30,
    status: "active",
  })
  const createdLot = await farmerApi.getLot(testLot588Id)
  assertTest(
    "Create Lot by 588",
    createdLot !== null && createdLot.createdByLoginNumber === "588",
    `Lot ${testLot588Id} created with owner: ${createdLot?.createdByLoginNumber}`
  )

  // Edit own lot as 588 -> EXPECT PASS
  let editOwnResult = false
  try {
    await farmerApi.updateLot(testLot588Id, { quantityKg: 350 })
    const updated = await farmerApi.getLot(testLot588Id)
    editOwnResult = updated?.quantityKg === 350
  } catch (e: any) {
    editOwnResult = false
  }
  assertTest("Farmer 588 Edit Own Lot", editOwnResult, "Quantity updated to 350kg")

  // Edit Farmer 553's lot (LW002) as 588 -> EXPECT FAIL
  let editOtherResult = false
  try {
    await farmerApi.updateLot("LW002", { quantityKg: 999 })
    editOtherResult = true // Should not reach here
  } catch (e: any) {
    editOtherResult = false
    assertTest("Farmer 588 Edit 553 Lot Rejected", true, `Rejection Message: "${e.message}"`)
  }
  if (editOtherResult) {
    assertTest("Farmer 588 Edit 553 Lot Rejected", false, "Security vulnerability: 588 was allowed to edit 553 lot")
  }

  // Delete Farmer 553's lot (LW002) as 588 -> EXPECT FAIL
  let deleteOtherResult = false
  try {
    await farmerApi.deleteLot("LW002")
    deleteOtherResult = true
  } catch (e: any) {
    deleteOtherResult = false
    assertTest("Farmer 588 Delete 553 Lot Rejected", true, `Rejection Message: "${e.message}"`)
  }
  if (deleteOtherResult) {
    assertTest("Farmer 588 Delete 553 Lot Rejected", false, "Security vulnerability: 588 was allowed to delete 553 lot")
  }

  // Delete own lot as 588 -> EXPECT PASS
  let deleteOwnResult = false
  try {
    await farmerApi.deleteLot(testLot588Id)
    const checkDeleted = await farmerApi.getLot(testLot588Id)
    deleteOwnResult = checkDeleted === null
  } catch (e: any) {
    deleteOwnResult = false
  }
  assertTest("Farmer 588 Delete Own Lot", deleteOwnResult, "Lot successfully removed from database")

  console.log("\n--- SCENARIO 2: Authenticated as Farmer #553 ---")
  saveSession("farmer", "553")
  const session553 = readSession()
  assertTest("Farmer 553 Session Loaded", session553?.loginNumber === "553", `Logged in user: ${session553?.name}`)

  // Edit own lot LW002 as 553 -> EXPECT PASS
  let edit553Own = false
  try {
    await farmerApi.updateLot("LW002", { quantityKg: 850 })
    const lot553 = await farmerApi.getLot("LW002")
    edit553Own = lot553?.quantityKg === 850
  } catch (e: any) {
    edit553Own = false
  }
  assertTest("Farmer 553 Edit Own Lot (LW002)", edit553Own, "Quantity updated to 850kg")

  // Edit Farmer 590's lot LW003 as 553 -> EXPECT FAIL
  try {
    await farmerApi.updateLot("LW003", { quantityKg: 999 })
    assertTest("Farmer 553 Edit 590 Lot Rejected", false, "553 was allowed to edit 590 lot")
  } catch (e: any) {
    assertTest("Farmer 553 Edit 590 Lot Rejected", true, `Rejection Message: "${e.message}"`)
  }

  console.log("\n--- SCENARIO 3: Authenticated as Farmer #590 ---")
  saveSession("farmer", "590")
  const session590 = readSession()
  assertTest("Farmer 590 Session Loaded", session590?.loginNumber === "590", `Logged in user: ${session590?.name}`)

  // Edit own lot LW003 as 590 -> EXPECT PASS
  let edit590Own = false
  try {
    await farmerApi.updateLot("LW003", { minPricePerKg: 45 })
    const lot590 = await farmerApi.getLot("LW003")
    edit590Own = lot590?.minPricePerKg === 45
  } catch (e: any) {
    edit590Own = false
  }
  assertTest("Farmer 590 Edit Own Lot (LW003)", edit590Own, "Price updated to ₹45/kg")

  // Delete Farmer 137's lot LW004 as 590 -> EXPECT FAIL
  try {
    await farmerApi.deleteLot("LW004")
    assertTest("Farmer 590 Delete 137 Lot Rejected", false, "590 was allowed to delete 137 lot")
  } catch (e: any) {
    assertTest("Farmer 590 Delete 137 Lot Rejected", true, `Rejection Message: "${e.message}"`)
  }

  console.log("\n--- SCENARIO 4: Authenticated as Farmer #137 ---")
  saveSession("farmer", "137")
  const session137 = readSession()
  assertTest("Farmer 137 Session Loaded", session137?.loginNumber === "137", `Logged in user: ${session137?.name}`)

  // Modify Farmer 588's lot LW001 as 137 -> EXPECT FAIL
  try {
    await farmerApi.updateLot("LW001", { crop: "Hacked Crop" })
    assertTest("Farmer 137 Modify 588 Lot Rejected", false, "137 was allowed to modify 588 lot")
  } catch (e: any) {
    assertTest("Farmer 137 Modify 588 Lot Rejected", true, `Rejection Message: "${e.message}"`)
  }

  console.log("\n==========================================================")
  console.log(` TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests/totalTests)*100).toFixed(0)}%)`)
  console.log("==========================================================")

  if (passedTests === totalTests) {
    process.exit(0)
  } else {
    process.exit(1)
  }
}

runOwnershipVerificationTests().catch((err) => {
  console.error("Test execution error:", err)
  process.exit(1)
})
