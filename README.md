# Bisoke QR Service App

## What this MVP does
- One QR code opens the customer service page.
- Customer chooses a service and quantity.
- Customer enters name and phone.
- An order is created.
- Demo payment confirms the order.
- Admin dashboard shows orders, payment status and totals.
- Admin can change order status.
- QR code is generated automatically.

## Run on a computer
1. Install Node.js 20+.
2. Open a terminal in this folder.
3. Run:
   npm install
   npm start
4. Open http://localhost:3000
5. Admin dashboard: http://localhost:3000/admin
6. Default admin PIN: 1234 (change ADMIN_PIN before production).

## Put it online
Set:
BASE_URL=https://your-domain.example
ADMIN_PIN=your-secure-pin
Then run the app on your hosting/server.

## Real payments
The included `/api/payments/demo` is deliberately a demo. For production, replace it with your chosen Rwanda payment provider integration (for example MTN MoMo, Airtel Money, or a payment gateway). You will need merchant/API credentials and a public HTTPS callback/webhook URL.

## Important
Do not use the demo payment endpoint as proof of real payment in a production business.
