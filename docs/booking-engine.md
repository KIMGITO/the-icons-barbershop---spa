# Booking Engine — Architecture & Configuration Guide

## Overview

The booking engine handles multi-resource services, provider schedules, breaks, absences, customer conflicts, buffers, and race-condition-safe booking creation. The solution is **authoritative in Supabase** (SQL/RLS + RPC) and reflected in the React/Zustand UI.

## Data Model

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `services` | Service catalog | `id`, `name`, `duration_minutes`, `buffer_minutes` |
| `service_requirements` | Which role(s) a service needs | `service_id`, `role_id`, `quantity` |
| `staff_roles` | Enumerate roles (BARBER, SPA_THERAPIST, ...) | `id`, `code`, `name` |
| `service_providers` | Individual providers | `id`, `name`, `provider_type`, `active` |
| `staff_schedules` | Regular weekly hours | `provider_id`, `weekday (0-6)`, `start_time`, `end_time` |
| `staff_schedule_exceptions` | Absence / special day overrides | `provider_id`, `date`, `exception_type` |
| `staff_breaks` | Break windows (recurring or date-specific) | `provider_id`, `date`, `weekday`, `start_time`, `end_time` |
| `bookings` | Booking master row | `id`, `customer_id`, `service_id`, `start_ts`, `end_ts`, `status` |
| `booking_resources` | Join table linking booking to staff | `booking_id`, `provider_id`, `role_id` |
| `business_hours` | Business opening/closing times | `business_id`, `weekday`, `open_time`, `close_time` |

## RPC Functions

### `get_available_slots(service_id, date, preferred_staff_ids?)`
Returns all available start times for a service on a date. Each slot is sized to `duration + buffer` and includes the assigned staff member.

### `check_and_reserve(customer_id, service_id, desired_start_ts, preferred_staff_ids?, check_only?, ...)`
Atomically validates and creates a booking. Returns JSONB with booking details or error code.

**Error codes:**
- `SERVICE_NOT_FOUND` — Service doesn't exist
- `BUSINESS_CLOSED` — Business is closed at requested time
- `CUSTOMER_CONFLICT` — Customer already has a booking at this time
- `SLOT_UNAVAILABLE` — The specific slot is taken
- `ROLE_UNAVAILABLE` — No staff available for this service on this date

### `fn_get_staff_free_windows(provider_id, date)`
Returns free windows for a provider, considering schedule, exceptions, breaks, and bookings.

## Race-Condition Safety

- **Exclusion constraint** on `booking_resources` prevents overlapping bookings for the same provider
- **Exclusion constraint** on `bookings` prevents overlapping bookings for the same customer
- `check_and_reserve` performs all validation and insertion in a single transaction

## Configuration

### Business Hours
Edit the `business_hours` table to change opening/closing times per weekday (0=Sunday, 6=Saturday).

### Service Buffers
Set `buffer_minutes` on the `services` table. The buffer is added to the service duration when calculating availability.

### Staff Roles
Edit the `staff_roles` table to add/remove roles. Link services to roles via `service_requirements`.

### Staff Schedules
Edit the `staff_schedules` table for weekly hours. Use `staff_schedule_exceptions` for absences or special working days. Use `staff_breaks` for break windows.

## Frontend Integration

- `src/services/bookingEngineService.ts` — Wraps the RPC calls
- `src/types/booking.ts` — TypeScript types for the new data model
- `src/components/BookingModal.tsx` — Uses `get_available_slots` for slot display and `check_and_reserve` for atomic booking creation

## Migration Plan

1. `0016_booking_engine_normalized_tables.sql` — Creates normalized tables, migrates existing data, adds exclusion constraints
2. `0017_booking_engine_rpc_functions.sql` — Creates RPC functions
3. `0018_booking_engine_rls.sql` — Adds RLS policies

Deploy with: `supabase db push`