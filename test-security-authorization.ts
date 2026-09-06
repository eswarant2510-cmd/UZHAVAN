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

import { saveSession, clearSession } from "./src/lib/auth"
import { getAuthenticatedUser, getSecurityAuditLogs } from "./src/lib/authorization"
import { SecurityService } from "./src/services/securityService"
import type { CartItem, Order, SmartLot } from "./src/lib/types"

async function runSecurityTests() {
  console.log("==========================================================")
  console.log("=== RUNNING UZHAVAN SECURITY & AUTHORIZATION SUITE ===")
  console.log("==========================================================")

  // Clear previous session state
  clearSession()

  // Setup User A (Farmer)
  console.log("\n--- Setting up Session for User A (Farmer: Ramesh Patel) ---")
  const userA = saveSession("farmer", "9876543210")
  const authUserA = getAuthenticatedUser()
  assert.ok(authUserA.id, "User A must have an authenticated ID")
  console.log(`✓ User A Authenticated: ID=${authUserA.id}, Phone=${authUserA.phone}`)

  // Setup User B (Buyer: Suresh Agarwal)
  console.log("\n--- Setting up Session for User B (Buyer: Suresh Agarwal) ---")
  clearSession()
  const userB = saveSession("buyer", "9876500001")
  const authUserB = getAuthenticatedUser()
  assert.ok(authUserB.id, "User B must have an authenticated ID")
  console.log(`✓ User B Authenticated: ID=${authUserB.id}, Phone=${authUserB.phone}`)

  // Switch active session to User A for testing cross-user authorization attacks
  clearSession()
  saveSession("farmer", "9876543210")
  const currentUser = getAuthenticatedUser()
  assert.strictEqual(currentUser.phone, "9876543210")

  // TEST 1: User A cannot edit User B's profile
  console.log("\n--- TEST 1: User A cannot edit User B's profile ---")
  const editProfileResult = SecurityService.updateProfile(authUserB.id!, {
    name: "HACKED NAME BY USER A",
    location: "Hacked Location",
  })
  assert.strictEqual(editProfileResult.status, 403, "Must return HTTP 403 Forbidden")
  assert.strictEqual(editProfileResult.error, "Access denied", "Must return 'Access denied'")
  console.log("✓ PASS: User A profile edit attempt on User B blocked with HTTP 403 Access denied")

  // TEST 2: User A cannot read User B's profile
  console.log("\n--- TEST 2: User A cannot read User B's profile ---")
  const getProfileResult = SecurityService.getProfile(authUserB.id!)
  assert.strictEqual(getProfileResult.status, 403, "Must return HTTP 403 Forbidden")
  assert.strictEqual(getProfileResult.error, "Access denied", "Must return 'Access denied'")
  console.log("✓ PASS: User A profile read attempt on User B blocked with HTTP 403 Access denied")

  // TEST 3: User A cannot delete or modify User B's cart
  console.log("\n--- TEST 3: User A cannot delete or modify User B's cart ---")
  // First, populate User B's cart while logged in as User B
  clearSession()
  saveSession("buyer", "9876500001")
  const itemB = SecurityService.addToCart({
    lotId: "LW001",
    crop: "Tomato",
    quantityKg: 100,
    pricePerKg: 30,
  })
  assert.ok(itemB.data?.id, "Cart item created for User B")
  const cartItemIdB = itemB.data!.id

  // Switch back to User A
  clearSession()
  saveSession("farmer", "9876543210")

  const deleteCartResult = SecurityService.deleteCartItem(cartItemIdB)
  assert.strictEqual(deleteCartResult.status, 403, "Must return HTTP 403 Forbidden")
  assert.strictEqual(deleteCartResult.error, "Access denied", "Must return 'Access denied'")
  console.log("✓ PASS: User A cart deletion attempt on User B blocked with HTTP 403 Access denied")

  // TEST 4: User A cannot modify User B's products/lots
  console.log("\n--- TEST 4: User A cannot modify User B's products/lots ---")
  const lotB: SmartLot = {
    id: "LOT_USER_B",
    userId: authUserB.id,
    farmerPhone: authUserB.phone,
    crop: "Onion",
    quantityKg: 500,
    imageUrl: "https://example.com/onion.jpg",
    location: "Lasalgaon",
    quality: { grade: "A", confidencePct: 90, label: "Grade A", disclaimer: "None" },
    expectedNetPerKg: 20,
    status: "active",
  }

  const editProductResult = SecurityService.updateProduct(lotB, {
    quantityKg: 0,
    expectedNetPerKg: 1,
  })
  assert.strictEqual(editProductResult.status, 403, "Must return HTTP 403 Forbidden")
  assert.strictEqual(editProductResult.error, "Access denied", "Must return 'Access denied'")
  console.log("✓ PASS: User A product edit attempt on User B blocked with HTTP 403 Access denied")

  // TEST 5: User A cannot delete User B's products/lots
  console.log("\n--- TEST 5: User A cannot delete User B's products/lots ---")
  const deleteProductResult = SecurityService.deleteProduct(lotB)
  assert.strictEqual(deleteProductResult.status, 403, "Must return HTTP 403 Forbidden")
  assert.strictEqual(deleteProductResult.error, "Access denied", "Must return 'Access denied'")
  console.log("✓ PASS: User A product deletion attempt on User B blocked with HTTP 403 Access denied")

  // TEST 6: User A cannot access User B's orders
  console.log("\n--- TEST 6: User A cannot access User B's orders ---")
  const orderB: Order = {
    id: "ORD_USER_B_999",
    userId: authUserB.id,
    buyerUserId: authUserB.id,
    farmerUserId: "usr_other_farmer",
    lotId: "LW002",
    offerId: "OFF_999",
    buyerPhone: authUserB.phone,
    farmerPhone: "9999999999",
    amount: 15000,
    status: "PAID",
    paymentStatus: "VERIFIED",
    settlementStatus: "ON_HOLD",
  }

  const accessOrderResult = SecurityService.accessOrder(orderB)
  assert.strictEqual(accessOrderResult.status, 403, "Must return HTTP 403 Forbidden")
  assert.strictEqual(accessOrderResult.error, "Access denied", "Must return 'Access denied'")
  console.log("✓ PASS: User A order access attempt on User B blocked with HTTP 403 Access denied")

  // TEST 7: Requirement 12 Exact Code Snippet Pattern Verification
  console.log("\n--- TEST 7: Requirement 12 Code Pattern Verification ---")
  const activeUser = getAuthenticatedUser()
  assert.strictEqual(activeUser.id, currentUser.id)

  const profileUpdateResult = SecurityService.updateProfile(authUserB.id!, { name: "Unauthorized Update" })
  if (authUserB.id !== activeUser.id) {
    assert.strictEqual(profileUpdateResult.status, 403)
    assert.strictEqual(profileUpdateResult.error, "Access denied")
  }
  console.log("✓ PASS: Requirement 12 pattern (if record.userId !== currentUser.id return res.status(403).json({ error: 'Access denied' })) verified")

  // TEST 8: Security Audit Trail Verification
  console.log("\n--- TEST 8: Security Audit Trail Verification ---")
  const logs = getSecurityAuditLogs()
  assert.ok(logs.length > 0, "Audit trail must contain recorded security events")
  const violations = logs.filter((l) => l.eventType === "UNAUTHORIZED_ACCESS_ATTEMPT")
  assert.ok(violations.length >= 5, "Audit log must record all blocked access violation attempts")
  console.log(`✓ PASS: Audit Trail verified with ${violations.length} recorded unauthorized access attempts`)

  console.log("\n==========================================================")
  console.log("=== ALL SECURITY & AUTHORIZATION TESTS PASSED (100%) ===")
  console.log("==========================================================")
}

runSecurityTests().catch((err) => {
  console.error("Security test failed:", err)
  process.exit(1)
})
