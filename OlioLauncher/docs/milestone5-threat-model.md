# Milestone 5 secure launcher connection threat model

Status: design input for Milestone 5 implementation. This document authorizes no Quick
Paste synchronization or later launcher feature.

## Trust boundaries and protected assets

The standard-user launcher, the user's normal browser, the Workstation origin, the
Workstation server endpoint, Supabase Auth, and PostgreSQL are separate trust boundaries.
The launcher never receives an Olio password or Supabase session. The browser never
receives a pairing secret or device credential. The database stores only SHA-256 hashes
of uniformly random 256-bit pairing secrets and device credentials. A server-only
service-role key is used by the Workstation endpoint and is never shipped to the browser
or launcher.

The protected assets are the one-time pairing secret, device credential, authenticated
approval decision, account/device ownership, and connection metadata. Quick Paste data
is outside this milestone and no device scope grants access to it.

## Threats and controls

| Threat | Controls and residual risk |
| --- | --- |
| Pairing-request theft | A request ID and display code can open only an approval screen. Exchange also requires the launcher's independent 256-bit pairing secret and matching stable device identifier. Requests expire after 10 minutes and are single-use. |
| User-code guessing | Codes use 10 characters from an unambiguous 32-character alphabet, are collision-checked by a unique active-code hash, expire with the request, and are subject to per-request, source, and authenticated-user rate limits. A correct code cannot obtain a credential without the pairing secret. |
| Replay | Approval and exchange lock the request row and perform one atomic state transition. Only `approved` may exchange, and successful exchange changes it to `exchanged`. Repeated, concurrent, malformed, denied, cancelled, expired, or unknown exchanges return the same content-free failure. |
| Approval-link manipulation | The launcher constructs the URL from the built-in, validated `https://olio.one` origin and fixed path. Only an opaque request UUID and display code are in the URL. Device name, owner, pairing secret, credential, session, and keys are absent. The server validates both values before showing safe metadata. |
| Credential theft | Credentials are independent 256-bit random values returned once in an HTTPS response body and stored as a Windows Credential Manager generic credential scoped to the current Windows user. They never enter settings, URLs, command lines, logs, diagnostics, or browser storage. A stolen credential is limited to its one device and can be revoked individually. |
| Database disclosure | Only fixed-length hashes are stored for pairing secrets, codes, device credentials, and rate-limit actors. High-entropy tokens resist offline guessing. RLS, column-minimizing RPCs, explicit grants, fixed search paths, and server-only mutation functions prevent raw security metadata from reaching clients. |
| Device loss | Account settings list each named device and allow confirmed revocation. Revocation is checked on every device-authenticated operation and immediately blocks later status checks or future authorized operations. |
| Cross-user access | Approval ownership comes only from the server-validated Supabase session. Client-supplied user IDs are ignored. Owner-scoped RPCs derive `auth.uid()`, RLS limits rows, and device authentication selects only the credential/device pair. |
| Approval of the wrong device | The page shows a sanitized device name, expiration, and the same short display code shown by the launcher. It explains the limited connection scope and requires an explicit Approve or Deny action. |
| Polling abuse and denial of service | Creation, inspection/approval, polling, exchange, and device validation have independent bounded database rate limits. Launcher polling starts at three seconds, allows one request at a time, uses bounded timeouts, stops at every terminal state, and expires after the server deadline. Responses are deliberately small. |
| Revocation and disconnect | Workstation revocation atomically timestamps the device. Confirmed launcher disconnect first obtains server revocation and then deletes the local credential; recoverable network failure leaves the credential available for a safe retry. A locally missing/invalid credential returns the launcher to disconnected recovery. |
| Logs, browser history, crash reports, and diagnostics | Approval history contains only request UUID and insufficient display code. Server and launcher code do not log bodies, authorization headers, codes, account identifiers, email, tokens, hashes, or database errors. UI and tests use generic state labels. No analytics, browser cache, offline cache, or crash reporter is added. |

## Protocol invariants

1. The launcher generates its pairing secret with Windows CNG and sends it only in an
   HTTPS JSON request body. The server hashes it before storage.
2. The server returns a short-lived request UUID, display code, and expiration. The
   launcher constructs the approval URL and validates that its origin exactly matches the
   built-in production HTTPS origin.
3. Workstation requires the existing signed-in session, validates the request and code,
   and assigns ownership from the server-validated session identity.
4. Polling authenticates the request with the device identifier and pairing secret.
   Approval reveals only a state change; it never returns account data.
5. Exchange generates a fresh credential in server memory, hashes it, and asks one atomic
   database function to consume the approved request and create one device row. Only the
   winning exchange response receives the raw credential.
6. Device operations require the stable identifier plus credential. Revoked devices and
   all invalid inputs fail without enumeration.
7. Milestone 5 grants only `connection:status`. A future Quick Paste read scope requires a
   separately approved Milestone 6 migration and endpoint; none exists here.
