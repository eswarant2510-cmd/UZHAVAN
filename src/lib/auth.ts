import type { SessionUser, UserRole } from "./types"

const KEY = "uzhavan_session"

export const DEMO_FARMER: SessionUser = {
  role: "farmer",
  phone: "9876543210",
  name: "Ramesh Patel",
  location: "Nashik, Maharashtra",
  source: "demo",
}

const DEMO_BY_ROLE: Record<UserRole, SessionUser> = {
  farmer: DEMO_FARMER,
  buyer: {
    role: "buyer",
    phone: "9876500001",
    name: "Suresh Agarwal",
    location: "Mumbai, Maharashtra",
    source: "demo",
  },
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

export function saveSession(role: UserRole, phone: string): SessionUser {
  const profile = DEMO_BY_ROLE[role]
  const user: SessionUser = {
    ...profile,
    phone: phone || profile.phone,
    source: "demo",
  }
  localStorage.setItem(KEY, JSON.stringify(user))
  return user
}

export function readSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(KEY)
  supabase.auth.signOut().catch(() => { })
}

export function requireRole(role: UserRole): SessionUser {
  const session = readSession()
  if (session?.role === role) return session
  return DEMO_BY_ROLE[role]
}

// -- Supabase Auth Client Foundation --
import { supabase } from "./supabase"

let cachedUser: SessionUser | null = null

export async function getAuthProfile(): Promise<SessionUser | null> {
  const local = readSession()
  if (local) {
    cachedUser = local
    return local
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    cachedUser = null
    return null
  }

  const email = session.user.email || ""
  const phone = email.includes("@") ? email.split("@")[0] : ""

  if (cachedUser && cachedUser.phone === phone) {
    return cachedUser
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("phone", phone)
    .maybeSingle()

  if (profile) {
    cachedUser = {
      role: profile.role as any,
      phone: profile.phone,
      name: profile.name,
      location: profile.location || "",
      source: "live",
    }
  } else {
    // Check if there is an existing profile for Ramesh. If so, we can update its ID to match the auth users id.
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone", phone)
      .maybeSingle()

    if (existingProfile) {
      cachedUser = {
        role: existingProfile.role as any,
        phone: existingProfile.phone,
        name: existingProfile.name,
        location: existingProfile.location || "",
        source: "live",
      }
    } else {
      // Create a default profile
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({
          id: session.user.id,
          phone,
          name: "Ramesh Patel",
          location: "Nashik, Maharashtra",
          role: "farmer",
          source: "live",
        })
        .select("*")
        .single()

      if (newProfile) {
        cachedUser = {
          role: newProfile.role as any,
          phone: newProfile.phone,
          name: newProfile.name,
          location: newProfile.location || "",
          source: "live",
        }
      } else {
        cachedUser = {
          role: "farmer",
          phone,
          name: "Ramesh Patel",
          location: "Nashik, Maharashtra",
          source: "live",
        }
      }
    }
  }

  return cachedUser
}

export async function supabaseSignInWithMockOtp(
  phone: string,
  role: UserRole = "farmer",
): Promise<{ data: any; error: any }> {
  const email = `${phone}@uzhavan.com`
  const password = `UzhavanPassword123!`

  const preset = DEMO_BY_ROLE[role]
  const name = preset?.name || "Demo User"
  const location = preset?.location || ""

  // Try sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (
    (error && error.message.includes("Invalid credentials")) ||
    (error && error.message.includes("Invalid login credentials"))
  ) {
    // Try sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email,
        password,
        options: {
          data: {
            role,
            phone,
            name,
            location,
          },
        },
      },
    )

    if (signUpError) {
      return { data: null, error: signUpError }
    }

    // Ensure we create a profile record in database as well
    const { data: profileCheck } = await supabase
      .from("profiles")
      .select("phone")
      .eq("phone", phone)
      .maybeSingle()

    if (!profileCheck) {
      await supabase.from("profiles").insert({
        id: signUpData.user?.id,
        phone,
        name,
        location,
        role,
        source: "live",
      })
    }

    return { data: signUpData, error: null }
  }

  // If successfully signed in, verify profile exists and matches chosen role
  if (data?.user) {
    const { data: profileCheck } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone", phone)
      .maybeSingle()

    if (!profileCheck) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        phone,
        name,
        location,
        role,
        source: "live",
      })
    } else if (profileCheck.role !== role) {
      // Sync/update role if the user chooses to login with a different role on this device
      await supabase.from("profiles").update({ role }).eq("phone", phone)
    }
  }

  return { data, error }
}

export async function supabaseSendOtp(phone: string) {
  return supabase.auth.signInWithOtp({
    phone,
  })
}

export async function supabaseVerifyOtp(phone: string, token: string) {
  return supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  })
}

export async function supabaseSignOut() {
  cachedUser = null
  localStorage.removeItem(KEY)
  return supabase.auth.signOut()
}
