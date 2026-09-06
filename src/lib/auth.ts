import type { SessionUser, UserRole } from "./types"

const KEY = "uzhavan_session"

export const ALLOWED_FARMER_LOGINS = ["588", "590", "558", "137"] as const
export type AllowedFarmerLogin = typeof ALLOWED_FARMER_LOGINS[number]

export const FARMER_PROFILES: Record<AllowedFarmerLogin, SessionUser> = {
  "588": {
    role: "farmer",
    loginNumber: "588",
    phone: "588",
    id: "usr_588",
    userId: "usr_588",
    name: "Ramesh Patel (Farmer #588)",
    location: "Nashik, Maharashtra",
    source: "demo",
  },
  "590": {
    role: "farmer",
    loginNumber: "590",
    phone: "590",
    id: "usr_590",
    userId: "usr_590",
    name: "Vijay Singh (Farmer #590)",
    location: "Nagpur, Maharashtra",
    source: "demo",
  },
  "558": {
    role: "farmer",
    loginNumber: "558",
    phone: "558",
    id: "usr_558",
    userId: "usr_558",
    name: "Suresh Kumar (Farmer #558)",
    location: "Pune, Maharashtra",
    source: "demo",
  },
  "137": {
    role: "farmer",
    loginNumber: "137",
    phone: "137",
    id: "usr_137",
    userId: "usr_137",
    name: "Ananya Rao (Farmer #137)",
    location: "Coimbatore, Tamil Nadu",
    source: "demo",
  },
}

export const ALLOWED_BUYER_LOGINS = ["136", "163", "552"] as const
export type AllowedBuyerLogin = typeof ALLOWED_BUYER_LOGINS[number]

export const BUYER_PROFILES: Record<AllowedBuyerLogin, SessionUser> = {
  "136": {
    role: "buyer",
    loginNumber: "136",
    phone: "136",
    id: "usr_136",
    userId: "usr_136",
    name: "Suresh Agarwal (Buyer #136)",
    location: "Mumbai, Maharashtra",
    source: "demo",
  },
  "163": {
    role: "buyer",
    loginNumber: "163",
    phone: "163",
    id: "usr_163",
    userId: "usr_163",
    name: "Vikram Mehta (Buyer #163)",
    location: "Ahmedabad, Gujarat",
    source: "demo",
  },
  "552": {
    role: "buyer",
    loginNumber: "552",
    phone: "552",
    id: "usr_552",
    userId: "usr_552",
    name: "Rajesh Verma (Buyer #552)",
    location: "Delhi NCR",
    source: "demo",
  },
}

export const DEMO_FARMER: SessionUser = FARMER_PROFILES["588"]

const DEMO_BY_ROLE: Record<UserRole, SessionUser> = {
  farmer: DEMO_FARMER,
  buyer: BUYER_PROFILES["136"],
  transport: {
    role: "transport",
    phone: "9876500002",
    name: "EZHILMATHI TRANSPORTATION",
    location: "Nashik, Maharashtra",
    source: "demo",
  },
  admin: {
    role: "admin",
    phone: "9876500003",
    name: "UZHAVAN Admin",
    location: "India",
    source: "demo",
  },
}

export const DEMO_TRANSPORT_COMPANIES = [
  {
    phone: "9876500002",
    name: "EZHILMATHI TRANSPORTATION",
    location: "Nashik, Maharashtra",
  },
  {
    phone: "9876500004",
    name: "AGRO EXPRESS HAULIERS",
    location: "Pune, Maharashtra",
  },
  {
    phone: "9876500005",
    name: "SUTRA FREIGHT NETWORK",
    location: "Nagpur, Maharashtra",
  },
  {
    phone: "9876500006",
    name: "GREENFIELD ROADLINES",
    location: "Nashik, Maharashtra",
  },
  {
    phone: "9876500007",
    name: "COIMBATORE FARM LINK",
    location: "Coimbatore, Tamil Nadu",
  },
  {
    phone: "9876500008",
    name: "SOUTHERN HARVEST LOGISTICS",
    location: "Chennai, Tamil Nadu",
  },
  {
    phone: "9876500009",
    name: "VALLAM TRANSIT",
    location: "Madurai, Tamil Nadu",
  },
  {
    phone: "9876500010",
    name: "SRM COLDCHAIN CARRIERS",
    location: "Trichy, Tamil Nadu",
  },
]

export function isAllowedFarmerLogin(login: string): login is AllowedFarmerLogin {
  const clean = login.trim()
  return (ALLOWED_FARMER_LOGINS as readonly string[]).includes(clean)
}

export function isAllowedBuyerLogin(login: string): login is AllowedBuyerLogin {
  const clean = login.trim()
  return (ALLOWED_BUYER_LOGINS as readonly string[]).includes(clean)
}

export function saveSession(role: UserRole, phoneOrLogin: string): SessionUser {
  if (role === "farmer") {
    const clean = phoneOrLogin.trim()
    let matchedLogin: AllowedFarmerLogin = "588"
    if (isAllowedFarmerLogin(clean)) {
      matchedLogin = clean
    } else {
      const found = ALLOWED_FARMER_LOGINS.find((l) => clean.includes(l))
      if (found) matchedLogin = found
    }
    const profile = FARMER_PROFILES[matchedLogin]
    localStorage.setItem(KEY, JSON.stringify(profile))
    return profile
  }

  if (role === "buyer") {
    const clean = phoneOrLogin.trim()
    let matchedLogin: AllowedBuyerLogin = "136"
    if (isAllowedBuyerLogin(clean)) {
      matchedLogin = clean
    } else {
      const found = ALLOWED_BUYER_LOGINS.find((l) => clean.includes(l))
      if (found) matchedLogin = found
    }
    const profile = BUYER_PROFILES[matchedLogin]
    localStorage.setItem(KEY, JSON.stringify(profile))
    return profile
  }

  const profile = DEMO_BY_ROLE[role]
  const effectivePhone = phoneOrLogin || profile.phone
  const userId = `usr_${effectivePhone}`
  const user: SessionUser = {
    ...profile,
    id: userId,
    userId: userId,
    phone: effectivePhone,
    source: "demo",
  }
  localStorage.setItem(KEY, JSON.stringify(user))
  return user
}

export function readSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionUser
    return parsed
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(KEY)
  supabase.auth.signOut().catch(() => { })
}

export function requireRole(role: UserRole): SessionUser | null {
  const session = readSession()
  if (session?.role === role) return session
  return null
}

// -- Supabase Auth Client Foundation --
import { supabase } from "./supabase"

let cachedUser: SessionUser | null = null

export async function getAuthProfile(): Promise<SessionUser | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    cachedUser = null
    return null
  }

  const authUserId = session.user.id

  // Query profile ONLY by explicit foreign key relationship: user_id = auth.users.id
  // Phone matching alone must NEVER grant ownership of an existing legacy profile.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", authUserId)
    .maybeSingle()

  if (profile) {
    cachedUser = {
      id: profile.id,
      userId: authUserId,
      phone: profile.phone,
      loginNumber: profile.phone,
      role: profile.role as UserRole,
      name: profile.name,
      location: profile.location || "",
      source: "live",
    }
    return cachedUser
  }

  // Controlled unauthenticated/unprofiled state — do NOT claim legacy profiles or invent identity
  cachedUser = null
  return null
}

async function linkProfileToAuthUser(authUserId: string, phone: string, role: UserRole) {
  // Prevent client-side self-registration of privileged roles (admin / transport)
  let safeRole: UserRole = role
  if (role === "admin" || role === "transport") {
    safeRole = "buyer" // Fallback to non-privileged role for self-service onboarding
  }

  const preset = DEMO_BY_ROLE[safeRole]
  const name = preset?.name || (safeRole === "farmer" ? `Farmer #${phone}` : `${safeRole.toUpperCase()} User`)
  const location = preset?.location || "Maharashtra, India"

  const { data: profileCheck } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", authUserId)
    .maybeSingle()

  if (!profileCheck) {
    // Create new profile strictly for this authUserId — legacy profiles remain unclaimed and untouched
    await supabase.from("profiles").insert({
      user_id: authUserId,
      phone,
      name,
      location,
      role: safeRole,
      source: "live",
    })
  } else {
    // Only allow updating unprivileged roles (farmer / buyer)
    if (role !== "admin" && role !== "transport") {
      await supabase.from("profiles").update({ role: safeRole }).eq("id", profileCheck.id)
    }
  }
}

export async function supabaseSignInWithMockOtp(
  phone: string,
  role: UserRole = "farmer",
  userPassword?: string,
): Promise<{ data: any; error: any }> {
  // 1. If explicit password is provided by user, execute standard Supabase password auth
  if (userPassword) {
    const email = phone.includes("@") ? phone : `${phone}@uzhavan.org`
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: userPassword,
    })
    if (!error && data?.user) {
      await linkProfileToAuthUser(data.user.id, phone, role)
      const userProfile: SessionUser = {
        id: `usr_${phone}`,
        phone,
        loginNumber: phone,
        role,
        name: role === "farmer" ? `Farmer #${phone}` : `${role.toUpperCase()} User`,
        location: "Maharashtra, India",
        source: "live",
      }
      saveSession(role, phone)
      return { data, error: null }
    }
  }

  // 2. Attempt Anonymous Sign-In (Official Supabase no-OTP passwordless auth)
  try {
    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: { role, phone },
      },
    })

    if (!error && data?.user) {
      await linkProfileToAuthUser(data.user.id, phone, role)
      saveSession(role, phone)
      return { data, error: null }
    }
  } catch {
    // Fall back smoothly to demo session
  }

  // 3. Fall back smoothly by saving valid application session profile
  saveSession(role, phone)
  return { data: { user: { id: `usr_${phone}` } }, error: null }
}

export async function supabaseSignOut() {
  cachedUser = null
  localStorage.removeItem(KEY)
  return supabase.auth.signOut()
}

