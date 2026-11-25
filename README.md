# KAISH GOLDEN SPICES: Billing and Stock Management

Next.js 15, TypeScript, Tailwind, Supabase (Postgres, Auth, Row Level Security). Installable as an app (PWA) on Android, iPhone, Windows and Mac. Uses its **own** Supabase project.

## What is included
| Phase | Features |
|---|---|
| 1 Foundation | Login, roles, 15-table schema, Row Level Security, dashboard |
| 2 Products | Categories, products, manual SKU, barcode, image upload, activate, archive |
| 3 Stock | Stock in, manual adjustment with reason, stock history, low and out-of-stock alerts |
| 4 Billing | POS screen, search, USB/Bluetooth barcode scanner, camera scan, discount, payment method, atomic bill creation, print (A4 and 80 mm thermal), PDF |
| 5 Customers | Registration (KGS-CUS-0001), search, duplicate mobile and shared address warnings, address history, purchase history |
| 6 Purchases and reports | Purchase history, sales history with filters, daily/weekly/monthly reports, best sellers, CSV export, cancel and refund records |
| 7 Finalization | Settings (shop details, logo), staff logins and permissions, PWA, security headers |

## Setup
1. **Create a new Supabase project** for billing.
2. In Supabase > SQL Editor, run these files **in order**, each one fully:
   `supabase/migrations/001_foundation.sql`, `002_products.sql`, `003_stock.sql`, `004_billing_customers.sql`, `005_reports.sql`
3. Authentication > Users > Add user (tick **Auto Confirm User**) with your email and a strong password.
4. Edit the email in `supabase/seed_admin.sql` and run it. That user is now the admin.
5. Copy `.env.example` to `.env.local` and fill in the values from Project Settings > API.
   The URL must be exactly `https://YOURPROJECT.supabase.co`, with nothing after `.supabase.co`.
6. Run:
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000 and sign in.

## First steps in the app
1. Settings: enter your real shop name, address, phone and logo.
2. Products > Categories: add categories. Products > Add product: add products.
3. Stock > Stock in: add the quantity you have on the shelf.
4. Settings > Staff: create logins for your staff.
5. New bill: make a test bill, print it, and check Stock and Sales history.

## How the important rules are enforced
- **No overselling:** bills are created by one database function that locks each product, checks stock, saves the bill and items, reduces stock and writes the stock history in a single transaction.
- **No duplicate bills:** every bill carries a one-time key, so double taps and retries create one bill.
- **Prices cannot be faked:** the browser sends only product ids and quantities. Prices come from the database.
- **Stock cannot be edited directly:** a database trigger blocks it. Only stock in, adjustment, sale and cancellation change stock, and each writes a history entry.
- **Bills are never deleted:** admins cancel or refund them with a reason. Stock is returned and totals ignore them.
- **Old bills never change:** bills keep the product name, price, cost and customer details from the time of sale.
- **Service-role key** is used only on the server, only to create staff logins.

## Notes
- **Camera barcode scanning** works in Chrome and Edge on Android and desktop over https. iPhone Safari does not support it yet, so use a Bluetooth scanner or type the code.
- **PDF bills** use "Rs." instead of the rupee sign. The printed bill shows the rupee sign.
- **Thermal printers:** open a bill and choose "Thermal (80 mm) layout", then print and select the printer.
- **Offline billing is not included.** Billing needs an internet connection, which keeps stock accurate across devices.
- **Profit** is shown only when every item sold has a purchase cost. Revenue and profit are always shown separately.
- A staff member with a duplicate mobile number must use the existing customer. Only the admin can save a duplicate number.

## Deploy to Vercel
1. Push the project to GitHub.
2. In Vercel: New Project > import the repo.
3. Add the three environment variables from `.env.example`.
4. Deploy.
5. In Supabase > Authentication > URL Configuration, set the Site URL to your Vercel URL.
6. Open the Vercel URL on a phone and choose "Add to Home Screen" (iPhone: Share > Add to Home Screen; Android Chrome: Install app).

## Backups
Supabase Pro includes daily backups. On the free plan, export regularly: run `pg_dump` against the database connection string (Project Settings > Database), or download the CSV reports weekly.

## Security checklist before going live
- Rotate any key that was ever pasted into a chat or email.
- Use strong passwords for admin and staff.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in Vercel server environment variables.
- See `TESTING.md` and run every check.
