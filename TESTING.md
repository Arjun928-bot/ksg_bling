# Testing checklist

Run these on a phone and on a computer before using the system in the shop.

## Login and roles
- [ ] Wrong password shows an error. Correct password opens the dashboard.
- [ ] Opening any page while signed out goes to the sign-in page.
- [ ] Staff login does not show Purchases, Reports or Settings, and typing `/settings` or `/reports` goes back to the dashboard.
- [ ] Disabling a staff login (Settings > Staff) stops that person from using the app.

## Products and stock
- [ ] Add a product with a SKU already in use: a clear message appears.
- [ ] Add a product: it starts with 0 stock and shows Out of stock.
- [ ] Stock in 20: stock is 20, history shows "Stock in +20, balance 20".
- [ ] Double-tap "Save stock in": only one entry is created.
- [ ] Adjust: remove more than the stock: refused. Remove with a reason: history shows the reason.
- [ ] Set the low stock limit to 20: the product shows Low stock and appears on the dashboard.

## Billing
- [ ] Search by name, by SKU, and scan or type a barcode and press Enter.
- [ ] Cart + and − work, and quantity cannot go above the stock.
- [ ] Discount above the subtotal is limited to the subtotal.
- [ ] Complete a walk-in bill: bill number appears, stock goes down, history shows "Sale".
- [ ] Open the same app on two devices with 1 item left. Add it to a bill on both. Complete both: the second shows "Not enough stock".
- [ ] Press the browser Back button after a bill and try again: no second bill is created for the same cart.
- [ ] Change a product's price afterwards: the old bill still shows the old price.

## Printing
- [ ] Print bill on A4. Print with the Thermal layout.
- [ ] Download PDF opens with the right items and totals.

## Customers
- [ ] Register a customer: ID like KGS-CUS-0001 appears.
- [ ] Register another customer with the same mobile number: duplicate warning with a link to the existing customer. Staff cannot save it; admin can after confirming.
- [ ] Register a customer with the same address (spelled slightly differently): shared address warning, with an option to confirm a household.
- [ ] Bill a customer twice: both bills show in the customer's history and the total spent adds up.
- [ ] Edit the address as admin: the old address appears in address history, and old bills keep the old address.

## Cancel and refund
- [ ] Cancel a bill with a reason: stock returns, the bill shows CANCELLED, and the customer's total spent drops.
- [ ] A cancelled bill appears under "Cancelled and refunded bills" for the customer.
- [ ] Cancelling the same bill again is refused.

## Reports
- [ ] Today's revenue equals the sum of today's completed bills.
- [ ] Profit shows "Not available" if a product sold had no purchase price.
- [ ] CSV downloads open in Excel. Product names that start with "=" appear as text.

## Security
- [ ] As staff, try to open `/products/new`: you are sent away.
- [ ] In the browser console, a staff session cannot write to `sales`, `stock_movements` or `products` stock (blocked by the database).
- [ ] `.env.local` is not in your Git repository.

## PWA
- [ ] Install to the home screen on Android and iPhone. The app opens full screen.
