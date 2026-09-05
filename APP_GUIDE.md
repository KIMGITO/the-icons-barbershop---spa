# The Icons Barber & Spa - Application Guide

## 📱 Project Overview
The Icons Barber & Spa is a premium management and booking platform for a luxury barber shop and spa located in Nairobi. It features a customer-facing booking engine, a product catalog, and a comprehensive management portal for administrators and staff.

---

## 🔐 Default Accounts

### Administrator Portal
Used for managing business settings, services, staff, products, and viewing analytics.
- **URL**: `/admin` (or `/portal`)
- **Email**: `admin@theicons.co.ke`
- **Password**: `Admin@123`

### Staff / Barber Portal
Used by barbers to view their schedules and manage their profiles.
- **URL**: `/staff` or `/barber`
- **Email**: (Credentials created by Admin in the staff management section)

---

## 🛠 Required Configurations & APIs

To fully operationalize the application, the following environment variables and external service credentials must be provided in the Supabase project settings (Edge Function Secrets) and the `.env` file.

### 1. Supabase (Core Backend)
- `VITE_SUPABASE_URL`: Your Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous public key.
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for administrative operations (Server-side only).

### 2. M-Pesa Integration (Payments)
The app uses Safaricom Daraja API for STK Push payments.
- `MPESA_CONSUMER_KEY`: Daraja API Consumer Key.
- `MPESA_CONSUMER_SECRET`: Daraja API Consumer Secret.
- `MPESA_PASSKEY`: Daraja API Online Passkey.
- `MPESA_SHORTCODE`: Business Shortcode (Lipa Na M-Pesa Paybill/Till).
- `MPESA_ENV`: `sandbox` (for testing) or `production`.

### 3. Africa's Talking (SMS Notifications)
Used for sending booking confirmations and payment receipts.
- `AFRICASTALKING_API_KEY`: Your AT API Key.
- `AFRICASTALKING_USERNAME`: Your AT Username (usually `sandbox` for testing).
- `AFRICASTALKING_SENDER_ID`: (Optional) Registered Alphanumeric Sender ID.

### 4. Email Service
The app invokes a `send-email` edge function. You should configure an email provider (like Resend, SendGrid, or Mailgun) within that function.
- `RESEND_API_KEY`: (If using Resend)

### 5. Google Gemini AI
The app includes `@google/genai` for potential AI-powered features (e.g., service recommendations).
- `GOOGLE_GEMINI_API_KEY`: API Key from Google AI Studio.

---

## 🗺️ Site Structure (Routes)

### Public Routes
- `/` - Home Page
- `/services` - List of all services offered
- `/products` - Product catalog/shop
- `/barbers` - Meet our master barbers
- `/about` - About the sanctuary
- `/gallery` - Visual showcase
- `/faq` - Frequently Asked Questions
- `/contact` - Location and contact details
- `/book` - Direct booking link
- `/terms` - Terms of Service
- `/privacy` - Privacy Policy

### Dynamic Routes
- `/services/:id` - Detailed service information
- `/barbers/:id` - Barber profile and personal schedule

---

## 🔍 SEO & Visibility
The application includes pre-configured SEO files to ensure proper indexing by search engines:
- **Sitemap**: `/sitemap.xml` (Updated for all public routes)
- **Robots.txt**: `/robots.txt` (Configured to allow public content while protecting portal areas)
- **Dynamic SEO**: Individual service and barber pages include dynamic meta tags managed via `src/utils/seo.ts`.

- `/products/:id` - Product details and purchase options

### Management Routes (Internal)
- `/admin/*` - Admin Dashboard (Overview, Bookings, Business, Staff, etc.)
- `/staff/*` - Staff/Barber Dashboard
- `/portal/*` - Unified Authentication and Portal Entry

---

## 📧 Contact Information
For technical support or inquiries:
- **Email**: tech@theicons.co.ke
- **Website**: [theiconsbarber.co.ke](https://theiconsbarber.co.ke)
