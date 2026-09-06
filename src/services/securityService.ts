import {
  getAuthenticatedUser,
  requireAuth,
  requireOwnership,
  logSecurityAudit,
  updateProfile as authUpdateProfile,
  getProfile as authGetProfile,
  getCart as authGetCart,
  addToCart as authAddToCart,
  deleteCartItem as authDeleteCartItem,
  updateProduct as authUpdateProduct,
  deleteProduct as authDeleteProduct,
  accessOrder as authAccessOrder,
  updateSettings as authUpdateSettings,
} from "../lib/authorization"
import type { CartItem, Order, SmartLot, UserProfile, UserSettings } from "../lib/types"

/**
 * Strict Security Controller enforcing User-Based Authorization.
 */
export const SecurityService = {
  getAuthenticatedUser,

  requireAuth,

  requireOwnership,

  updateProfile(targetUserId: string, data: Partial<UserProfile>) {
    const currentUser = getAuthenticatedUser()

    // Explicit Requirement 12 ownership validation check pattern:
    if (targetUserId !== currentUser.id && targetUserId !== currentUser.userId) {
      logSecurityAudit(
        "UNAUTHORIZED_ACCESS_ATTEMPT",
        currentUser.id || currentUser.phone,
        `Forbidden profile update for target '${targetUserId}'`
      )
      return {
        status: 403,
        error: "Access denied",
      }
    }

    return authUpdateProfile(targetUserId, data)
  },

  getProfile(targetUserId?: string) {
    const currentUser = getAuthenticatedUser()
    const effectiveTarget = targetUserId || currentUser.id || currentUser.userId || ""

    if (effectiveTarget !== currentUser.id && effectiveTarget !== currentUser.userId) {
      logSecurityAudit(
        "UNAUTHORIZED_ACCESS_ATTEMPT",
        currentUser.id || currentUser.phone,
        `Forbidden profile read for target '${effectiveTarget}'`
      )
      return {
        status: 403,
        error: "Access denied",
      }
    }

    return authGetProfile(effectiveTarget)
  },

  getCart() {
    requireAuth()
    return authGetCart()
  },

  addToCart(item: Omit<CartItem, "id" | "userId">) {
    requireAuth()
    return authAddToCart(item)
  },

  deleteCartItem(cartItemId: string) {
    requireAuth()
    return authDeleteCartItem(cartItemId)
  },

  updateProduct(record: SmartLot, updates: Partial<SmartLot>) {
    const currentUser = getAuthenticatedUser()
    const recordUserId = record.userId || (record.farmerPhone ? `usr_${record.farmerPhone}` : undefined)

    if (
      recordUserId &&
      recordUserId !== currentUser.id &&
      recordUserId !== currentUser.userId &&
      record.farmerPhone !== currentUser.phone
    ) {
      logSecurityAudit(
        "UNAUTHORIZED_ACCESS_ATTEMPT",
        currentUser.id || currentUser.phone,
        `Forbidden product edit for product '${record.id}'`
      )
      return {
        status: 403,
        error: "Access denied",
      }
    }

    return authUpdateProduct(record, updates)
  },

  deleteProduct(record: SmartLot) {
    const currentUser = getAuthenticatedUser()
    const recordUserId = record.userId || (record.farmerPhone ? `usr_${record.farmerPhone}` : undefined)

    if (
      recordUserId &&
      recordUserId !== currentUser.id &&
      recordUserId !== currentUser.userId &&
      record.farmerPhone !== currentUser.phone
    ) {
      logSecurityAudit(
        "UNAUTHORIZED_ACCESS_ATTEMPT",
        currentUser.id || currentUser.phone,
        `Forbidden product deletion for product '${record.id}'`
      )
      return {
        status: 403,
        error: "Access denied",
      }
    }

    return authDeleteProduct(record)
  },

  accessOrder(order: Order) {
    const currentUser = getAuthenticatedUser()
    return authAccessOrder(order)
  },

  updateSettings(targetUserId: string, data: Partial<UserSettings>) {
    const currentUser = getAuthenticatedUser()

    if (targetUserId !== currentUser.id && targetUserId !== currentUser.userId) {
      logSecurityAudit(
        "UNAUTHORIZED_ACCESS_ATTEMPT",
        currentUser.id || currentUser.phone,
        `Forbidden settings update for user '${targetUserId}'`
      )
      return {
        status: 403,
        error: "Access denied",
      }
    }

    return authUpdateSettings(targetUserId, data)
  },
}
