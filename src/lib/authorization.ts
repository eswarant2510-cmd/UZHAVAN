import { readSession } from "./auth"
import type {
  AuditEvent,
  CartItem,
  Order,
  SessionUser,
  SmartLot,
  UserProfile,
  UserSettings,
} from "./types"

// In-memory audit log store
const securityAuditLogs: AuditEvent[] = []

export interface AuthorizationResult<T = unknown> {
  status: number
  data?: T
  error?: string
}

/**
 * Returns the currently authenticated user from the active session/token.
 * NEVER trusts frontend user IDs. Always derives user identity from session context.
 */
export function getAuthenticatedUser(): SessionUser {
  const session = readSession()
  if (!session) {
    throw new Error("UNAUTHENTICATED: No active user session")
  }
  const userId = session.id || session.userId || `usr_${session.phone}`
  return {
    ...session,
    id: userId,
    userId: userId,
  }
}

/**
 * Middleware/Guard: Verifies user is logged in.
 */
export function requireAuth(): SessionUser {
  const user = readSession()
  if (!user) {
    logSecurityAudit("UNAUTHORIZED_ACCESS_ATTEMPT", "anonymous", "Unauthenticated access attempt")
    throw new Error("UNAUTHENTICATED: Access denied")
  }
  const userId = user.id || user.userId || `usr_${user.phone}`
  return {
    ...user,
    id: userId,
    userId: userId,
  }
}

/**
 * Middleware/Guard: Validates record ownership.
 * Before UPDATE, DELETE, or EDIT operations:
 * Verify: record.userId === authenticatedUser.id
 *
 * Returns status 403 Forbidden ({ error: "Access denied" }) when ownership validation fails.
 */
export function requireOwnership(
  recordUserId: string | undefined,
  currentUserId: string,
  resourceName = "resource"
): { authorized: boolean; error?: string; status?: number } {
  if (!recordUserId || recordUserId !== currentUserId) {
    logSecurityAudit(
      "UNAUTHORIZED_ACCESS_ATTEMPT",
      currentUserId,
      `Forbidden attempt to access/modify ${resourceName} owned by user '${recordUserId}'`
    )
    return {
      authorized: false,
      status: 403,
      error: "Access denied",
    }
  }

  return { authorized: true }
}

/**
 * Logs security audit events for profile updates, product edits, cart changes, order updates, and access violations.
 */
export function logSecurityAudit(
  eventType: AuditEvent["eventType"],
  actor: string,
  details?: string,
  orderId?: string
) {
  const event: AuditEvent = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    eventType,
    actor,
    details,
    orderId: orderId || "SYSTEM",
    timestamp: new Date().toISOString(),
  }
  securityAuditLogs.push(event)
  return event
}

export function getSecurityAuditLogs(): AuditEvent[] {
  return [...securityAuditLogs]
}

// In-memory data structures secured by ownership verification
const userProfiles = new Map<string, UserProfile>()
const userCarts = new Map<string, CartItem[]>()
const userSettings = new Map<string, UserSettings>()

/**
 * Update Profile: Securely updates user profile after ownership validation.
 */
export function updateProfile(
  targetUserId: string,
  data: Partial<UserProfile>
): AuthorizationResult<UserProfile> {
  const currentUser = getAuthenticatedUser()

  if (targetUserId !== currentUser.id && targetUserId !== currentUser.userId && targetUserId !== `usr_${currentUser.phone}`) {
    logSecurityAudit(
      "UNAUTHORIZED_ACCESS_ATTEMPT",
      currentUser.id || currentUser.phone,
      `Attempted unauthorized profile update for target userId '${targetUserId}'`
    )
    return {
      status: 403,
      error: "Access denied",
    }
  }

  const userId = currentUser.id || currentUser.userId || `usr_${currentUser.phone}`
  const existing = userProfiles.get(userId) || {
    id: userId,
    userId: userId,
    phone: currentUser.phone,
    name: currentUser.name,
    role: currentUser.role,
    location: currentUser.location,
  }

  const updated: UserProfile = {
    ...existing,
    ...data,
    id: userId,
    userId: userId,
    updatedAt: new Date().toISOString(),
  }

  userProfiles.set(userId, updated)
  logSecurityAudit("PROFILE_UPDATED", userId, `Updated profile data for user ${userId}`)

  return {
    status: 200,
    data: updated,
  }
}

/**
 * Get Profile: Returns profile strictly filtered by authenticated user.
 */
export function getProfile(targetUserId?: string): AuthorizationResult<UserProfile> {
  const currentUser = getAuthenticatedUser()
  const userId = currentUser.id || currentUser.userId || `usr_${currentUser.phone}`

  if (targetUserId && targetUserId !== userId) {
    logSecurityAudit("UNAUTHORIZED_ACCESS_ATTEMPT", userId, `Attempted access to profile of user '${targetUserId}'`)
    return {
      status: 403,
      error: "Access denied",
    }
  }

  const profile = userProfiles.get(userId) || {
    id: userId,
    userId: userId,
    phone: currentUser.phone,
    name: currentUser.name,
    role: currentUser.role,
    location: currentUser.location,
  }

  return {
    status: 200,
    data: profile,
  }
}

/**
 * Get Cart: Database/store query filtered strictly by user_id = currentUser.id
 */
export function getCart(): AuthorizationResult<CartItem[]> {
  const currentUser = getAuthenticatedUser()
  const userId = currentUser.id || currentUser.userId || `usr_${currentUser.phone}`
  const cart = userCarts.get(userId) || []

  return {
    status: 200,
    data: [...cart],
  }
}

/**
 * Add Cart Item: Securely adds item to user's own cart.
 */
export function addToCart(item: Omit<CartItem, "id" | "userId">): AuthorizationResult<CartItem> {
  const currentUser = getAuthenticatedUser()
  const userId = currentUser.id || currentUser.userId || `usr_${currentUser.phone}`

  const newItem: CartItem = {
    ...item,
    id: `cart_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: userId,
    createdAt: new Date().toISOString(),
  }

  const currentCart = userCarts.get(userId) || []
  currentCart.push(newItem)
  userCarts.set(userId, currentCart)

  logSecurityAudit("CART_UPDATED", userId, `Added lot '${item.lotId}' to cart for user ${userId}`)

  return {
    status: 200,
    data: newItem,
  }
}

/**
 * Delete Cart Item: Ownership validated before deletion.
 */
export function deleteCartItem(cartItemId: string): AuthorizationResult<{ message: string }> {
  const currentUser = getAuthenticatedUser()
  const userId = currentUser.id || currentUser.userId || `usr_${currentUser.phone}`
  const cart = userCarts.get(userId) || []

  const itemIndex = cart.findIndex((i) => i.id === cartItemId)
  if (itemIndex === -1) {
    // Check if the item belongs to another user's cart
    for (const [otherUserId, otherCart] of userCarts.entries()) {
      if (otherUserId !== userId && otherCart.some((i) => i.id === cartItemId)) {
        logSecurityAudit("UNAUTHORIZED_ACCESS_ATTEMPT", userId, `Attempted unauthorized deletion of cart item '${cartItemId}' owned by user '${otherUserId}'`)
        return {
          status: 403,
          error: "Access denied",
        }
      }
    }
    return {
      status: 404,
      error: "Cart item not found",
    }
  }

  const item = cart[itemIndex]
  const ownership = requireOwnership(item.userId, userId, "CartItem")
  if (!ownership.authorized) {
    return {
      status: 403,
      error: "Access denied",
    }
  }

  cart.splice(itemIndex, 1)
  userCarts.set(userId, cart)
  logSecurityAudit("CART_UPDATED", userId, `Deleted cart item '${cartItemId}' for user ${userId}`)

  return {
    status: 200,
    data: { message: "Item deleted successfully" },
  }
}

/**
 * Update Product/Lot: Verifies record.userId === currentUser.id before mutation.
 */
export function updateProduct(
  record: SmartLot,
  updates: Partial<SmartLot>
): AuthorizationResult<SmartLot> {
  const currentUser = getAuthenticatedUser()
  const userId = currentUser.id || currentUser.userId || `usr_${currentUser.phone}`
  const recordUserId = record.userId || (record.farmerPhone ? `usr_${record.farmerPhone}` : undefined)

  if (!recordUserId || (recordUserId !== userId && record.farmerPhone !== currentUser.phone)) {
    logSecurityAudit(
      "UNAUTHORIZED_ACCESS_ATTEMPT",
      userId,
      `Attempted unauthorized edit of product '${record.id}' owned by user '${recordUserId}'`
    )
    return {
      status: 403,
      error: "Access denied",
    }
  }

  const updatedLot: SmartLot = {
    ...record,
    ...updates,
    userId: userId,
  }

  logSecurityAudit("PRODUCT_UPDATED", userId, `Updated product '${record.id}' for user ${userId}`)

  return {
    status: 200,
    data: updatedLot,
  }
}

/**
 * Delete Product/Lot: Verifies record.userId === currentUser.id before deletion.
 */
export function deleteProduct(record: SmartLot): AuthorizationResult<{ message: string }> {
  const currentUser = getAuthenticatedUser()
  const userId = currentUser.id || currentUser.userId || `usr_${currentUser.phone}`
  const recordUserId = record.userId || (record.farmerPhone ? `usr_${record.farmerPhone}` : undefined)

  if (!recordUserId || (recordUserId !== userId && record.farmerPhone !== currentUser.phone)) {
    logSecurityAudit(
      "UNAUTHORIZED_ACCESS_ATTEMPT",
      userId,
      `Attempted unauthorized deletion of product '${record.id}' owned by user '${recordUserId}'`
    )
    return {
      status: 403,
      error: "Access denied",
    }
  }

  logSecurityAudit("PRODUCT_DELETED", userId, `Deleted product '${record.id}' for user ${userId}`)

  return {
    status: 200,
    data: { message: "Product deleted successfully" },
  }
}

/**
 * Access Order: Verifies user is buyer or farmer of order.
 */
export function accessOrder(order: Order): AuthorizationResult<Order> {
  const currentUser = getAuthenticatedUser()
  const userId = currentUser.id || currentUser.userId || `usr_${currentUser.phone}`
  const userPhone = currentUser.phone

  const isBuyer = order.buyerUserId === userId || order.buyerPhone === userPhone
  const isFarmer = order.farmerUserId === userId || order.farmerPhone === userPhone
  const isOwner = order.userId === userId

  if (!isBuyer && !isFarmer && !isOwner) {
    logSecurityAudit(
      "UNAUTHORIZED_ACCESS_ATTEMPT",
      userId,
      `Attempted unauthorized access to order '${order.id}'`
    )
    return {
      status: 403,
      error: "Access denied",
    }
  }

  return {
    status: 200,
    data: order,
  }
}

/**
 * Update Settings: Verifies targetUserId === currentUser.id
 */
export function updateSettings(
  targetUserId: string,
  data: Partial<UserSettings>
): AuthorizationResult<UserSettings> {
  const currentUser = getAuthenticatedUser()
  const userId = currentUser.id || currentUser.userId || `usr_${currentUser.phone}`

  if (targetUserId !== userId) {
    logSecurityAudit(
      "UNAUTHORIZED_ACCESS_ATTEMPT",
      userId,
      `Attempted unauthorized update of settings for user '${targetUserId}'`
    )
    return {
      status: 403,
      error: "Access denied",
    }
  }

  const existing = userSettings.get(userId) || {
    id: `set_${userId}`,
    userId: userId,
    notificationsEnabled: true,
    preferredLanguage: "en",
    currency: "INR",
  }

  const updated: UserSettings = {
    ...existing,
    ...data,
    userId: userId,
    updatedAt: new Date().toISOString(),
  }

  userSettings.set(userId, updated)

  return {
    status: 200,
    data: updated,
  }
}
