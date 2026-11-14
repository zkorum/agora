# Project document loading: investigation and refactor plan

## Scope and conclusion

Investigated on 2026-11-14 against the public participant report at
<https://www.agoracitizen.app/project/sfcg-amplify-kg>.
Worktree branch: `investigate/project-documents`, based on freshly fetched
`upstream/main` at `2f6305d3`.

**The principal reproduced bottleneck is downloading a large, uncompressed,
all-in-one HTML report directly from S3.** The access API and report startup
were much faster. The 15-second viewer timeout explains a misleading failure
message, but changing that timeout does not solve the performance problem.

No application code, infrastructure, stored objects, or production data was
changed during this investigation. Only the public participant version was
tested; facilitator access was not exercised.

## Measurements

Browser navigation timing, two separate loads of the same report:

| Measurement | Initial open | Reload |
| --- | ---: | ---: |
| Total iframe navigation | 22.899 s | 23.909 s |
| Time to first byte | 0.569 s | 0.512 s |
| Response body transfer | 22.252 s | 23.347 s |
| Response end to load event | 0.078 s | 0.050 s |
| Encoded body size | 12,147,444 bytes | 12,147,444 bytes |
| Decoded body size | 12,147,444 bytes | 12,147,444 bytes |

- The initial `/api/v1/project/document/access` request took 159 ms.
- Both document requests returned HTTP 200.
- On reload, the viewer displayed “The document could not be opened” after
  15.215 s, then recovered when the still-running download completed.
- No browser console errors were observed in these runs.
- A separate Node download from the local machine took 6.191 s, including
  0.496 s to first byte. This is a different client/network path, not a
  directly comparable browser benchmark. It demonstrates that 23 seconds is
  not a fixed server-side processing delay.

The tested browser path transferred the body at approximately 4.2 Mbit/s.
Sending 12.1 MB at that rate accounts for the observed delay. These observations
do not establish why that network path has this throughput, nor the exact
latency experienced by users in Kyrgyzstan.

### Delivery headers

The iframe URL points directly to the S3 regional endpoint in `eu-west-1`,
not a CDN endpoint.

| Header | Observed value |
| --- | --- |
| `Content-Type` | `text/html` |
| `Content-Length` | `12147444` |
| `Content-Encoding` | absent |
| `Cache-Control` | absent |
| `ETag` | present |
| `Server` | `AmazonS3` |
| `Accept-Ranges` | `bytes` |

Offline compression of the exact downloaded bytes using Node's default
compression settings produced:

| Representation | Bytes | Reduction |
| --- | ---: | ---: |
| Current HTML | 12,147,444 | — |
| gzip | 1,901,881 | 84.3% |
| Brotli | 565,565 | 95.3% |

These are size measurements, **not measured compressed production load
times**. The default Brotli setting is quality 11; a more practical quality 6
produced 730,188 bytes in about 75 ms, versus about 8.1 seconds at quality 11.
These are single local compression runs, not production capacity benchmarks.

### Controlled browser validation: keep the JavaScript report unchanged

Served the exact downloaded HTML locally through the same `allow-scripts`
iframe sandbox. Chromium network emulation imposed 4 Mbit/s download throughput
and 150 ms latency. All responses used `no-store`.

| Representation | Encoded bytes | Iframe load time |
| --- | ---: | ---: |
| Identity | 12,147,444 | 24.498 s |
| gzip | 1,901,881 | 4.003 s |
| Brotli quality 6 | 730,188 | 1.653 s |

All decoded bodies remained 12,147,444 bytes. The welcome view rendered,
“Explore the report” successfully switched to the report view, and no
JavaScript page errors were observed in any of these three runs.

These are single controlled local runs, not geographically representative
production results or a full report regression suite. They demonstrate that
normal HTTP compression can remove most of the transfer delay in this test
**without removing JavaScript, changing the embedded data, or rewriting the
renderer**. HTTP localhost was used for the harness; the Brotli representation
was explicitly selected. Production HTTPS encoding negotiation was not tested.

The post-transfer interval is not total JavaScript/rendering cost: parsing can
overlap the transfer, and paint or later work can occur after the load event.
The test verified the welcome view and one interaction, not a complete measure
of mobile report usability. No raw timing trace or reusable benchmark harness
is included in this change; the values above are investigation observations.

### What is in the file?

The report contains no external resource requests during the measured startup.
Its data, JavaScript, and styles are embedded:

- JSON data block: **11,778,742 bytes**, approximately 97% of the file.
- Executable JavaScript: 321,391 bytes.
- Styles: 43,785 bytes.
- Only about 462 DOM elements after the initial view renders.

The JSON contains:

| Section | Serialized bytes | Contents |
| --- | ---: | --- |
| `targets` | 8,461,997 | All 51 scopes |
| `ingestion` | 1,266,081 | All 35 consultations and source statements |
| `proposalTranslations` | 1,233,786 | Proposal language variants |
| `sourceTranslations` | 816,194 | Source-statement language variants |

Of the targets, 35 conversation scopes occupy 2,383,963 bytes and 16 aggregate
scopes occupy 6,078,035 bytes. Scope data includes deduplication/proposals,
sensemaking, survey results, and opinion-group analysis. The entire dataset is
transferred even to open the welcome view.

The executable script follows the large JSON block and starts by parsing it:

```js
const D = JSON.parse(document.getElementById("report-data").textContent);
```

This packaging prevents the interactive report from initializing until the
embedded data has arrived. Repeated material across scopes is a candidate for
normalization, but not every aggregate is redundant: preserve independently
computed analysis and privacy suppression.

## Code path and contributing design choices

1. `services/agora/src/utils/api/projectPage.ts`
   requests access through the POST endpoint; participant access is public.
2. `services/api/src/service/projectDocumentAccessRoute.ts`
   delegates to `accessProjectDocument`.
3. `services/api/src/service/projectDocument.ts`
   authorizes the selected audience and creates a short-lived S3 URL.
   There is no report generation or S3-body download in this request path.
4. `services/agora/src/components/project/useProjectDocuments.ts`
   mounts a new viewer after access succeeds.
5. `services/agora/src/components/project/ProjectDocuments.vue`
   loads HTML through `SandboxedHtmlFrame.vue`.
6. The browser downloads and executes the complete self-contained report.

The upload path normalizes HTML and inserts CSP in
`services/api/src/service/projectDocumentFile.ts`, then uploads the normalized
buffer unchanged. `services/api/src/service/s3.ts` currently has no upload
parameter for `Content-Encoding`. Consequently, this path neither compresses
text artifacts nor declares a compressed HTTP representation.

Opening again requests access and creates a fresh iframe. A newly issued URL's
signature/date can vary; disposition also varies with mode/filename. They need
not all change on every open. Stable browser-cache reuse cannot be assumed;
the measured reload transferred the complete body again. The participant
response has no explicit cache policy, which does not mean caching is disabled:
HTTP permits heuristic caching. Source code sets facilitator object responses
to `private, no-store`; this was not verified with a facilitator request.

The viewer treats iframe `load` as success, which is not proof that an
interactive report initialized successfully. An HTTP error document or script
failure can require different handling. No such failure was reproduced here.

### Separate reliability risk: standalone report compatibility

The standalone report bypasses the frontend build and its compatibility
tooling. The parent application's polyfills do not modify the iframe's realm.
The report calls `Array.prototype.flatMap()` while rendering its hero and uses
`String.prototype.replaceAll()` elsewhere.

The checked-in browser contract includes Chrome 51, Firefox 54, Safari/iOS 10,
and Edge 15. MDN compatibility data lists native `flatMap` support starting at
Chrome 69 / Firefox 62 / Safari 12, and `replaceAll` at Chrome 85 / Firefox 77 /
Safari 13.1. This is a confirmed contract mismatch and a plausible cause of
device-specific failures, **not proof that it caused the reported incidents**.
No affected historical browser was available for reproduction.

## Recommended refactor

See [the delivery design](project-document-delivery-design.md) for the
researched recommendation, security model, alternatives, and implementation
sequence.

The requirement is to retain self-contained, JavaScript-rendered reports.
The controlled test changes the priority: **fix their publication and delivery,
not their renderer**. Brotli with gzip/identity fallback, explicit artifact
metadata, and isolated delivery are the target. Chunking report data or
introducing a native app renderer is not required by the measured bottleneck.

## Verification and acceptance

Proposed budgets to confirm with the team:

- Representative cold public report usable within 3 seconds at 4 Mbit/s,
  150 ms latency, on a representative mobile device. The controlled test used
  Chromium latency emulation, not a calibrated real-network RTT measurement.
- This existing report should transfer less than 1 MB on Brotli-capable
  clients, without changing its JavaScript or data.
- Measure warm reopen behavior without bypassing authorization checks or
  assuming a signed URL is cache-friendly.

Use multiple cold and warm runs, reporting medians and tails separately.
Repeat from Kyrgyzstan or a representative nearby network, and test current
Safari/iOS, Android Chrome, and desktop browsers.

Required regressions:

- Compression round-trip equals normalized bytes; correct MIME, encoding,
  checksum, download filename, and logical-size handling.
- Existing uncompressed documents and PDFs still work.
- Participant/facilitator access boundaries, CSP, and sandbox remain intact.
- Downloaded HTML remains a usable offline file.
- Slow transfer must not be mislabeled as confirmed failure. Test interrupted
  transfer and HTTP denial/expiry recovery. Script startup failures require a
  cooperative report protocol to distinguish reliably; generic iframe events
  alone cannot meet that guarantee.
- Representative large synthetic report in automated tests; do not commit the
  real participant dataset or signed URLs as fixtures.

Capture access latency, response timing, encoded/decoded byte counts, and
report-ready latency. Any production telemetry must use approved privacy-aware
schemas; never log signed URLs, report contents, or credentials.

## Remaining uncertainty

- The measured false failure is reproduced. Other reported failures may have
  different causes; no production exception logs or affected-device traces were
  available.
- The throughput constraint's geographic/network origin is not established.
- Mobile parse/render cost may exceed the desktop measurements.
- The report producer's location needs confirming for compatibility fixes or
  any optional content-level optimization, but not to improve HTTP delivery.

To reproduce the main evidence without changing production, open the public
report, inspect iframe Navigation Timing and response headers, then repeat via
Reload. Compare `responseEnd - responseStart` with
`loadEventEnd - responseEnd`, and compare `encodedBodySize` with
`decodedBodySize`. The iframe is cross-origin and opaque; its detailed timing
requires DevTools or browser-automation access inside that frame. The parent
application cannot read it directly. Retrieve the public artifact locally for
compression and section-size analysis without retaining or publishing its
signed URL.
