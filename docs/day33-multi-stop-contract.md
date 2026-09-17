# Day 33 — Multi-stop Booking V2 Contract

Status: IMPLEMENTATION IN PROGRESS  
Owner: Core  
Date: 2026-09-17

## Boundary

Multi-stop is trip-instance data attached to a Booking V2 request. It does not create a Route, Direction, Location, SEO page or canonical URL. Day 33 does not calculate extra-stop, waiting, overtime or distance pricing.

## Input contract

`intermediateStops` is optional and defaults to an empty array. It accepts at most three ordered rows:

| Field | Rule |
| --- | --- |
| `address` | Required for an added row; trimmed; maximum 240 characters |
| `waitingMinutes` | Integer from 0 to 1,440 |

Array position is authoritative. The API ignores any client-supplied order and derives a one-based `order` value during persistence.

## Persistence contract

WordPress Booking V2 stores `intermediate_stops_v1` as an array of objects:

```json
[
  {
    "order": 1,
    "address": "Điểm hẹn đã được khách nhập",
    "waiting_minutes": 30
  }
]
```

The WordPress sanitizer caps the array at three rows, removes invalid or empty rows, caps waiting time and rebuilds sequential order. Exact stop addresses remain private booking-instance data.

## UI contract

The shared control is used by Contact Booking, Route Quick Booking and Journey Quote. Users can add, remove and reorder stops. The interface prevents adding more than three rows; the API and WordPress contract enforce the same boundary independently.

## Compatibility

- Existing clients may omit `intermediateStops`.
- An empty array preserves the pre-Day-33 booking behavior.
- Route/Direction resolution and Day 32 service-zone/surcharge resolution continue to use only canonical endpoint Location entities.
- Multi-stop data is included in the operator notification but never exposed as SEO input.

## Deferred to Day 34

- extra-stop charge;
- waiting charge;
- overtime and extra-distance rules;
- any effect on Pricing V2 or quoted price.
