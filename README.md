# UZHAVAN (SIH26132) — Agricultural Market Linkage Platform

UZHAVAN is a React-based agricultural intelligence platform designed to empower Farmers, Buyers, Transporters, and Admins to optimize market decisions, produce pricing, transport matching, and secure transactions.

This repository serves as the foundation baseline for Milestone 0.1, set up for Figma Make integration with client-side routing.

---

## 🛠️ Project Stack

- **Frontend Core:** React 19 & React DOM 19
- **Routing:** React Router v8.3.0 (Client-side routing)
- **Styling:** Tailwind CSS v4.0.0 (Vite integration style)
- **Toolchain:** TypeScript 5.7, Vite 8, Node.js 22, pnpm 10
- **Linter/Formatter:** oxfmt

---

## 📂 Directories Outline

- `src/` — Primary application source code.
  - `src/pages/` - UI Views organized by roles (`farmer`, `buyer`, `placeholders`).
  - `src/components/` - Shared layouts and layout shells (`FarmerShell`, `BuyerShell`).
  - `src/lib/` - Shared core logic (Net Realisation calculation algorithms, typings).
  - `src/services/` - Client-side mock APIs simulating delay.
- `.figma/` — Figma Make wrapper config scripts and integration metadata.

---

## ⚡ Development & Commands

Vite is configured to serve the app on port `8443` for integration inside Fiji Make previews.

Run the development server locally:
```bash
# Using npm
npm run dev

# Using pnpm
pnpm dev
```

Build the production bundles:
```bash
npm run build
```

Verify Type Safety:
```bash
npx tsc --noEmit
```

Formatted Coding Styles Check:
```bash
npm run format
```

---

## 🚀 Roadmap (Milestone 0.2+)

- **Backend Integration:** Configuring Supabase schemas and clients to replace simulated mocks.
- **Authentication:** Transitioning simulated local sessions to real Supabase OTP Auth and security rules.
- **Transport & Admin Dashboards:** Building actual portal modules to replace the current placeholder pages.
