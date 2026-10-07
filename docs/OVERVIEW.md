# 🏋️‍♂️ Iron Man Gym & GymPro — System Overview & Architecture

A complete, role-aware, multi-tenant gym management ecosystem and SaaS command center built with **Node.js / Express**, **MongoDB (Mongoose)**, **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Redux Toolkit (RTK Query)**.

---

## 📌 1. Project Vision & Purpose

**Iron Man Gym** streamlines daily gym operations into a rapid, high-visibility operational dashboard. The platform serves two distinct operational tiers:
1. **Multi-Tenant SaaS SuperAdmin Console**: Allows platform owners to provision new client gym branches, configure subscription tiers, monitor MRR (Monthly Recurring Revenue), and oversee fleet health.
2. **Gym Branch Operational Portal**: Allows gym owners, front-desk receptionists, and coaches to execute real-time check-ins, record membership fees, collect dues, manage coaches, track machine repairs, and balance daily cash drawers.

---

## 🏗️ 2. System Architecture (3 Independent Projects)

The ecosystem is decoupled into **3 standalone projects**:

```
iron-man/
├── ironman-backend/            # 1. Unified Node.js + Express API (Port 8000)
│   ├── src/
│   │   ├── config/             # MongoDB connection (Mongoose) & Cloudinary setup
│   │   ├── controllers/        # Auth, Gyms, Members, Attendance, Payments, etc.
│   │   ├── middleware/         # Cookie/JWT Auth, RBAC, Dual-Storage Upload
│   │   ├── models/             # Gym (Tenant), User, Member, Payment, Expense, etc.
│   │   ├── routes/             # RESTful API Endpoints
│   │   ├── services/           # DB Seeder (seeder.js)
│   │   └── server.js           # Server Entrypoint
│   ├── uploads/                # Local uploaded files (served at /uploads/...)
│   ├── .env                    # Active Environment Variables
│   ├── .env.example
│   └── package.json
│
├── ironman-admin/              # 2. SuperAdmin SaaS Console (Port 4000)
│   ├── src/
│   │   ├── app/                # Next.js 16 App Router (Dashboard & Login)
│   │   ├── components/         # CreateGymWizard (4-Step Form), Sidebar, Topbar
│   │   ├── redux/              # Redux Toolkit & RTK Query (baseApi.ts, store.ts)
│   │   └── lib/                # Utility helpers & currency formatters
│   ├── .env.local
│   ├── .env.example
│   └── package.json
│
└── ironman-client/             # 3. Main Gym Operations Portal (Port 3000)
    ├── src/
    │   ├── app/                # Next.js 16 App Router (Dashboard & Login)
    │   ├── components/         # Views: Dashboard, Check-in, Members, Payments, Expenses
    │   ├── redux/              # Redux Toolkit & RTK Query with tag invalidation
    │   └── lib/                # Utility helpers & cn function
    ├── .env.local
    ├── .env.example
    └── package.json
```

---

## 👥 3. Role-Based Workspaces & Permissions

```
                  ┌───────────────────────────────┐
                  │    Iron Man Platform Shell    │
                  └──────────────┬────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
   [Super Admin]           [Gym Owner]             [Receptionist / Coach]
   • SaaS Client Gyms      • Full Business Stats   • Fast Check-in Desk
   • MRR Tracking          • Cashflow & Expenses   • Fee Collection & POS
   • Fleet Health & Tiers  • Staff Roster & Pay    • Member Directory
   • Provision Accounts    • Machine Health Tags   • Daily Attendance Logs
```

---

## 🗄️ 4. Database Schema & Data Models

| Model | Primary Fields | Description |
| :--- | :--- | :--- |
| **`Gym`** | `name`, `slug`, `branchCode`, `address`, `phone`, `email`, `subscriptionPlan`, `subscriptionStatus`, `mrrAmount`, `currency`, `settings` | Multi-tenant gym organization and billing profile. |
| **`User`** | `name`, `email`, `password` (bcrypt), `role` (`superadmin`/`owner`/`receptionist`/`trainer`), `gymId`, `phone`, `isActive` | Authenticated administrative, staff, and coach accounts. |
| **`Member`** | `gymId`, `memberId`, `name`, `phone`, `cnic`, `address`, `plan`, `durationDays`, `startDate`, `expiryDate`, `status`, `totalAmount`, `paidAmount`, `dueAmount`, `photoUrl` | Member profiles, subscription durations, and dues balance. |
| **`Attendance`** | `gymId`, `member`, `memberId`, `memberName`, `checkInTime`, `dateStr`, `statusSnapshot` | Timestamped admission logs for rapid front-desk verification. |
| **`Payment`** | `gymId`, `memberId`, `memberName`, `amount`, `method` (`cash`/`jazzcash`/`easypaisa`/`bank_transfer`/`card`), `paymentType`, `invoiceNo`, `paidOn` | Financial transaction ledger for fees, renewals, and dues. |
| **`Expense`** | `gymId`, `title`, `category` (`rent`/`electricity`/`salaries`/`repairs`/`supplements`/`utilities`), `amount`, `spentOn`, `receiptNo` | Facility overhead and utility bills. |
| **`Trainer`** | `gymId`, `name`, `phone`, `email`, `specialty`, `salary`, `commissionPercent`, `status`, `photoUrl` | Personal trainers and floor coach directory. |
| **`Equipment`**| `gymId`, `name`, `category`, `status` (`working`/`maintenance`/`out_of_order`), `quantity`, `cost`, `lastMaintenance` | Floor inventory and machinery health maintenance records. |
| **`Plan`** | `gymId`, `name`, `planType`, `durationDays`, `price`, `features`, `isActive` | Membership pricing tiers and day passes. |

---

## 🔌 5. RESTful API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticates user, signs JWT, and issues `httpOnly` secure session cookie.
- `GET /api/auth/me`: Retrieves current session with tenant gym profile.
- `POST /api/auth/logout`: Clears session cookie.

### Multi-Tenant Gym Management (`/api/gyms`)
- `GET /api/gyms`: Lists all registered gyms with search and plan filters (SuperAdmin only).
- `POST /api/gyms`: Multi-step gym provisioning that creates the Gym entity AND the initial Gym Owner account with password.
- `PUT /api/gyms/:id`: Updates gym profile or subscription tier.
- `DELETE /api/gyms/:id`: Removes gym and deactivates associated staff.

### Member Management (`/api/members`)
- `GET /api/members`: Retrieves members with search (`?q=`) and status filter (`?status=active|due|expired|frozen`).
- `POST /api/members`: Enrolls a new member and generates an initial payment receipt.
- `POST /api/members/:id/renew`: Extends membership duration and logs renewal fee payment.
- `DELETE /api/members/:id`: Removes member record.

### Check-in & Attendance (`/api/attendance`)
- `POST /api/attendance/checkin`: Rapid admission by Member ID, Phone, or CNIC with instant dues/expiry status verification.
- `GET /api/attendance`: Retrieves attendance logs for a given date (`?date=YYYY-MM-DD`).

### Financials (`/api/payments`, `/api/expenses`)
- `GET /api/payments`: Retrieves collection history and total revenue sums.
- `POST /api/payments`: Records a payment and updates member dues.
- `GET /api/expenses`: Retrieves overhead costs filtered by category and month.
- `POST /api/expenses`: Adds a facility expense entry.

### Roster & Equipment (`/api/trainers`, `/api/equipment`)
- `GET/POST/PUT/DELETE /api/trainers`: Coach roster and salary management.
- `GET/POST/PUT/DELETE /api/equipment`: Equipment inventory and health status tracking.

### Analytics & Reports (`/api/reports`)
- `GET /api/reports/dashboard`: Aggregates active members, today's check-ins, today's revenue, pending dues, and 6-month financial trends.
- `GET /api/reports/admin-platform`: Aggregates total gyms, platform MRR, and platform-wide active members (SuperAdmin).

### File & Image Uploads (`/api/upload`)
- `POST /api/upload`: Dual-mode storage engine. Saves to local [uploads/](file:///Users/apple/Documents/Code/Divinesoft/iron-man/ironman-backend/uploads/) directory by default, or streams to Cloudinary if configured in `.env`.

---

## 🚀 6. Execution Ports & URLs

| Project | Port | URL | Purpose |
| :--- | :--- | :--- | :--- |
| **`ironman-backend`** | `8000` | `http://localhost:8000/api` | Unified Node.js API |
| **`ironman-admin`** | `4000` | `http://localhost:4000` | SuperAdmin SaaS Console |
| **`ironman-client`** | `3000` | `http://localhost:3000` | Gym Operations Portal |
