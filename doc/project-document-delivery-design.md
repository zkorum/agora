# JavaScript report delivery: refactor proposal

Status: design only; no implementation or production change.
Evidence: [loading investigation](project-document-loading-investigation.md).

## Decision and scope

**Keep the self-contained report, JavaScript rendering, and existing security
policy. Fix publication and HTTP delivery first.**

The unchanged report loaded in a controlled browser test in 24.50 seconds
uncompressed, 4.00 seconds with gzip, and 1.65 seconds with Brotli quality 6.
This supports compression, not a mandatory renderer rewrite.

The first implementation should:

1. Prepare compressed representations once, after existing HTML normalization.
2. Preserve authorization on every open/download.
3. Serve an explicitly encoded object through the existing isolated S3 path.
4. Migrate the already-published report without overwriting its working object.
5. Correct misleading viewer loading states independently.

CDN delivery is conditional on regional measurements. A different renderer,
multi-file uploads, worker service, grant cache, and new report-data format are
not prerequisites.

## Security invariants: unchanged

- Interactive HTML retains `sandbox="allow-scripts"` without
  `allow-same-origin`, forms, popups, or top navigation.
- Preserve document-specific inline-script hashes and the current CSP,
  including `connect-src 'none'`. Do not add a blanket `script-src 'none'`.
- Preserve `htmlScriptsEnabled`; migrating storage must not enable scripts for
  a previously script-free document.
- Retain authorized uploads, separate participant/facilitator files, and the
  existing project/document/audience checks.
- Keep uploaded HTML outside the authenticated application origin.
- Facilitator object responses remain `private, no-store`; access-grant
  responses remain `no-store`.
- Compression must round-trip to the exact normalized bytes. It neither
  authorizes scripts nor sanitizes their behavior.
- Do not execute uploaded JavaScript server-side.

These are isolation controls, not a claim that arbitrary uploaded JavaScript
cannot leak its own contents. In particular, CSP script hashes identify allowed
code; they do not audit it, and `connect-src` is not a universal navigation
prohibition. Preserve the authorized-uploader boundary.

## Publication flow

```text
Upload ordinary file
    -> validate decoded size, MIME and content
    -> normalize HTML / insert existing CSP
    -> prepare useful HTTP representations
    -> reserve pending storage metadata
    -> upload private objects with encoded-byte checksums
    -> transactionally publish complete representation set
```

Compression applies to output only. Do not start accepting compressed uploads
or archives, which would introduce decompression-limit and extraction risks.

Retain the existing upload limit over normalized decoded bytes. Compress only
after normalization and script hashing; compression must not modify the
decoded script source.

### Small, explicit responsibility split

- `projectDocumentFile.ts`: validation and the existing HTML policy.
- One asynchronous representation-preparation module: encoded bytes, encoding,
  size, and transport checksum; no database, S3, or authorization.
- Project-document service: publication, authorization, representation selection,
  and cleanup orchestration.
- S3 helper: upload declared bytes/metadata and issue exact-object URLs.
- Viewer composable/component: access and display lifecycle.

Use typed object parameters and the repository's existing function/closure
patterns. Do not create a generic storage plugin framework or silently compress
unrelated callers of the shared S3 helper.

## Type safety and persisted invariants

Separate three concepts:

| Concept | Required meaning |
| --- | --- |
| Logical file | Existing content type, audience, execution policy, normalized byte size, publication identity |
| Stored representation | File identity, encoding, private object key, encoded byte size, checksum of encoded bytes |
| Access grant | Authorized publication/representation, mode, filename, URL, expiration |

Use one literal encoding domain: `identity`, `gzip`, or `br`. Do not combine
optional encoding strings with independent `isCompressed`/`hasBrotli` flags.

Representation preparation should return a required identity representation
plus zero or more derived representations, each carrying its own bytes and
checksum. Selection returns one complete representation, never parallel arrays
or a key whose encoding must be guessed.

For multiple stored encodings, prefer a small representation table owned by the
logical file rather than hard-coded filename guesses:

- Encoding enum, non-null file FK/key/size/checksum, positive encoded size.
- Unique object key and one active representation per file/encoding.
- Preserve the existing logical `byteSize`; do not reinterpret it as compressed
  size or apply decoded-size limits to encoded bytes.
- File and representation keys are server-owned, never accepted from an access
  request as arbitrary storage paths.
- Existing files retain a valid identity representation throughout rollout.
- Cross-row completeness belongs in the publication transaction: publish only
  after all advertised representations uploaded successfully.

Use schema-backed Drizzle operations. Change only canonical shared-backend
schema source, sync, and generate migrations through the normal workflow.
Application-row deletion remains soft deletion.

Keep parsed DTOs at external boundaries; validate encoding preferences and
storage metadata without assertions or casts. If the access DTO changes,
regenerate shared copies/OpenAPI clients rather than editing generated files.
There is no new TypeScript implementation to typecheck in this proposal.

## Compression and resource budget

- Prepare Brotli around quality 6 and gzip; retain identity fallback.
- Skip tiny files and representations larger than their identity form.
- Keep PDFs on the existing identity/range-request path by default.
- Use asynchronous compression, not synchronous work in request handlers.
- Bound compression concurrency **across uploads**, not just within one file.
  Include normalized buffers, strings/parser output, encoded buffers, S3
  requests, and concurrent participant/owner uploads in memory measurements.
- Start with publication in the existing service. Add a durable worker only
  if measured resource use requires it.
- Do not compress, generate reports, fetch object bodies, or issue availability
  HEAD requests on each open.

On this file, Brotli quality 6 took approximately 75 ms locally; quality 11 took
8.1 seconds. These single runs justify benchmarking moderate quality, not a
production throughput guarantee. Compression does not reduce decoded size or
mobile JavaScript parse/render work.

### HTTP representation contract

Each object URL identifies one fixed representation:

```http
Content-Type: text/html; charset=utf-8
Content-Encoding: br
Content-Length: 730188
```

This example is for the measured Brotli object. gzip uses `gzip`; identity
omits `Content-Encoding`. S3 checksums cover the encoded bytes actually uploaded.
Keep existing filenames and inline/attachment disposition behavior. Verify
Safari/iOS and Chromium attachment downloads save usable decoded HTML before
claiming offline-download compatibility.

## Access, encoding selection, and caching

Keep the POST access endpoint and authorize **every** open/download as today.
Do not add grant reuse to this refactor: a cached URL can skip the current
checks after project deletion, unlisting, or an authorization change.

Select only from published representations belonging to the authorized file.
Never serve an owner's representation as a participant fallback.

Use standard `Accept-Encoding` semantics, including quality values, explicit
`q=0`, wildcard, and identity handling, through a maintained parser subject to
dependency review. No user-agent sniffing or substring matching.

**Integration assumption to verify:** the existing access POST and the
subsequent object GET are separate requests. Capabilities observed on the POST
can inform selection for ordinary browsers, but do not constitute negotiation
on the object GET. Verify proxy behavior and actual object-request headers.
Absent or ambiguous capability information should choose acceptable identity,
not assume Brotli. Non-browser clients must support the issued representation;
if no stored representation is acceptable, return a clear not-acceptable error.

Do not silently serve differently encoded bytes when an object is missing or
corrupt. Treat that as a publication/storage error.

Because representation-specific URLs never change encoding, they do not need
single-URL encoding negotiation. If negotiation moves to one URL, use
`Vary: Accept-Encoding` and encoding-aware cache keys.

Preserve `private, no-store` for facilitator files and `no-store` for grants.
Do not introduce broader participant caching in the first implementation.
Define a revocation window before adding explicit participant cache lifetimes:
neither expiring a URL nor invalidating a CDN erases browser/downloaded copies.
Keep report bodies and signed URLs out of logs and persistent application caches.

## Viewer correctness

Retain stale-request guards and close/deactivation handling. Separate the list
from the viewer only where it makes the existing data flow clearer.

- Show a cancellable shell while access is pending.
- A slow threshold means “taking longer than usual”, not confirmed failure.
- Do not automatically discard and restart a healthy in-progress transfer.
- An iframe `load` event is not proof of successful rendering, and browsers do
  not expose a reliable generic iframe network-error event.
- Keep accessible download/reload fallbacks. Do not promise distinct script
  errors for arbitrary HTML without report cooperation.
- An optional report-ready protocol is a separate enhancement, not required
  for existing reports. Validate active frame source, load identity, and parsed
  message shape; opaque `origin: "null"` is not authentication. Messages may
  update display status only, never confer authorization or a network bridge.
- Keep native PDF behavior separate from HTML script/sandbox rules.

## Conditional follow-ups, not first-release requirements

**CDN:** if regional latency/throughput remains outside the budget, use an
isolated managed artifact host, private S3 REST origin, OAC, and exact
CloudFront-signed URLs. Do not cache S3 bearer URLs by stripping their signatures.
Keep audience/representation/disposition cache identities distinct. Default
paths must not expose restricted objects; review behavior ordering. Disable
facilitator caching, including minimum/default/maximum TTLs of zero.

CloudFront automatic compression cannot handle this 12.1 MB origin object:
its documented limit is 10,000,000 bytes. Precompression works independently of
that limit and requires no bespoke edge compressor/rewrite service.

**Direct-open hardening:** the iframe sandbox does not apply to a URL opened
directly. Additional response-header CSP/permissions policies may be reviewed
separately, but must not silently disable existing rendering, navigation, or
PDF behavior. CSP `sandbox` and `frame-ancestors` cannot be enforced via meta.

**Report compatibility:** fix the producer's browser-contract mismatch through
maintained build tooling. App polyfills do not affect the iframe realm.
Compile before upload so normalization hashes the final scripts. Do not inject
ad-hoc global patches or maintain a second renderer from generated HTML.

**Content optimization:** consider smaller per-scope/language data only if
compression still misses measured budgets and the producer is available.
Do not relax `connect-src 'none'` or introduce multi-file hosting incidentally.

## Rollout and verification

1. Test compression round trips and CSP-script hashes; validate encoded
   checksums, logical/stored sizes, negotiation, and legacy identity fallback.
2. Test partial uploads, failed publication, deletion races, and retryable
   cleanup of every representation. Successful checksum-validated uploads do
   not require downloading every object again on each publication.
3. Exercise real-browser rendering, scope/language/tab interactions, downloads
   opened offline, PDFs/ranges, denied access, slow/interrupted transfers,
   unsupported encoding, and expired URLs. Include supported-browser coverage.
4. Migrate existing files by creating new objects and verifying them before
   transactionally publishing their representation metadata. Keep the working
   identity object and rollback metadata; never overwrite it in place.
   Do not hold database locks during compression or S3 network I/O.
5. Keep representation metadata writer-consistent during migration/publication;
   use returned values or the write transaction, not a replica read-after-write.
   Reserve pending object metadata before S3 writes for retryable cleanup.
6. Production migration requires explicit approval. Canary one report, measure,
   then expand. Rollback selects the retained identity representation, without
   restoring deleted documents or bypassing authorization.

Use synthetic fixtures, not real participant content or bearer URLs. Verify
anonymous/facilitator/cross-project boundaries and that compression leaves CSP,
sandbox and execution policy unchanged.

The proposed target is under 3 seconds for this report on a Brotli-capable
client at 4 Mbit/s / 150 ms latency. Measure access, transfer, and usability
separately across repeated cold/warm runs on representative mobile devices and
Kyrgyzstan/nearby networks. Report fallback results separately. Do not equate an
iframe load event with usability or claim the local test proves production
performance.

## References

- [web.dev: HTML performance](https://web.dev/learn/performance/general-html-performance):
  text compression, static compression and CDN trade-offs.
- [MDN: HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching):
  cache identity, `Vary`, explicit policy and revocation limits.
- [OWASP: file uploads](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html):
  validation, active content, authorization and isolated hosting.
- [MDN: iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)
  and [CSP sandbox](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox):
  script isolation, direct opens, PDF limitations and load/error semantics.
- AWS: [compression](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html),
  [OAC](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html),
  [signed URLs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html),
  [cache behavior](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html),
  [PutObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html).
- MDN: [postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage),
  compatibility data for [flatMap](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/Array.json)
  and [replaceAll](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/String.json).
