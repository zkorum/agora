import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export type PrivacyPolicyTag =
  | "section"
  | "p"
  | "h2"
  | "h3"
  | "h4"
  | "ul"
  | "ol"
  | "li"
  | "strong"
  | "a"
  | "table"
  | "thead"
  | "tbody"
  | "tr"
  | "th"
  | "td";

export interface PrivacyPolicyElement {
  tag: Exclude<PrivacyPolicyTag, "a">;
  children: readonly PrivacyPolicyNode[];
}

export interface PrivacyPolicyLink {
  tag: "a";
  children: readonly PrivacyPolicyNode[];
  href: string;
  external?: boolean;
}

export type PrivacyPolicyNode =
  | string
  | PrivacyPolicyElement
  | PrivacyPolicyLink;

export interface PrivacyPolicyContent {
  title: string;
  automatedTranslationNotice: {
    title: string;
    statement: string;
    viewEnglish: string;
    returnToTranslation: string;
  };
  nodes: readonly PrivacyPolicyNode[];
}

export const privacyPolicyContent = {
  // Multilingual review draft: legal-basis and operational checks remain publication gates.
  en: {
    title: "Privacy Policy",
    automatedTranslationNotice: {
      title: "Automated translation",
      statement:
        "This privacy policy has been translated automatically. The English version is the only authoritative version and exclusively prevails in the event of any discrepancy.",
      viewEnglish: "View authoritative English version",
      returnToTranslation: "Return to translated version",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["Last updated on"],
          },
          ": 2026/10/14 (YYYY/MM/DD)",
        ],
      },
      {
        tag: "p",
        children: [
          " Agora Citizen Network is developed by ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          ". ",
        ],
      },
      {
        tag: "p",
        children: [
          ' ZKorum SAS ("Agora", "we" or "us") is responsible for the personal data described in this notice. ',
        ],
      },
      {
        tag: "p",
        children: [
          " Contact: ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". California residents: see section 7. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["Content visibility and participation records"],
          },
          {
            tag: "p",
            children: [
              " Published content and results are generally public, subject to access restrictions. Unlisted conversations may remain accessible by link; exclusion from search does not make them confidential. ",
            ],
          },
          {
            tag: "p",
            children: [" You can browse without an account. To participate: "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Guests:"],
                  },
                  " Where permitted, participate through a device-based account. Losing its stored keys can prevent access or recovery. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Registered accounts:"],
                  },
                  " Available verification methods include: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          { tag: "strong", children: ["Email address:"] },
                          " A one-time code proves address ownership, not identity or uniqueness. ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["Phone number:"],
                          },
                          " Verified through a one-time code sent via SMS ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "a",
                            children: ["Rarimo"],
                            href: "https://rarimo.com/privacy-notice.html",
                            external: true,
                          },
                          ": Passport-based Zero-Knowledge Proof (ZKP) verification ",
                        ],
                      },
                    ],
                  },
                  " Conversations may require a particular method. Passport verification discloses eligibility information, not your passport image, number, name or photograph. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["Account upgrades:"],
              },
              " Guest activity can be merged into a registered account, whose existing choices take priority. Merging is irreversible and cannot combine two registered accounts. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Your chosen or generated username may appear with published content; it need not be your real name. ",
            ],
          },
          {
            tag: "h3",
            children: ["Who can see your information?"],
          },
          {
            tag: "p",
            children: [" Access depends on the activity and permissions: "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "Published content, results, usernames and project/organization contacts may be public, copied or indexed.",
                ],
              },
              {
                tag: "li",
                children: [
                  "Authentication details, private keys and account settings are not published.",
                ],
              },
              {
                tag: "li",
                children: [
                  " Participation is account-linked until detached. Participants can retrieve their own QV allocations; retaining QV inputs does not publish individual ballots or enable individual-ballot exports. ",
                ],
              },
              {
                tag: "li",
                children: [
                  "Individual survey responses and full results, including unsuppressed aggregates, require owner-level permission. Public aggregates may suppress small groups.",
                ],
              },
              {
                tag: "li",
                children: [
                  "Where enabled, anyone with conversation access, including device-based guests, can obtain standard exports containing statements, remapped author IDs, timestamps, vote totals and permitted survey aggregates.",
                ],
              },
              {
                tag: "li",
                children: [
                  "Individual-vote exports, where offered, include choices, participant IDs, statement references and timestamps. Additional participation disclosures and audiences are explained before they apply, with consent where required.",
                ],
              },
              {
                tag: "li",
                children: [
                  " Reports, moderation reasons and relevant identities are available to authorized staff or organizers. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Shared export IDs can link statements, votes and survey answers. Text, timestamps, voting patterns or small groups may identify participants despite remapped IDs. Standard survey exports omit authentication emails, but free-text answers can contain contact details. ",
            ],
          },
          {
            tag: "p",
            children: [
              " These rules apply regardless of export format. Recipients may keep, combine or republish files subject to law; section 3.6 explains independent copies. ",
            ],
          },
          {
            tag: "h3",
            children: ["Planned AT Protocol migration"],
          },
          {
            tag: "p",
            children: [
              " A possible AT Protocol migration could share public content, individual votes and identifiers with independent services outside Agora's control, including outside the EEA. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Restricted-conversation arrangements remain undecided. Access controls are not end-to-end encryption and cannot prevent authorized readers from copying data. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Before migration, we will explain the changes and choices, update this notice and obtain required consent. This does not authorize publishing existing restricted participation. ",
            ],
          },
          {
            tag: "h3",
            children: ["Third-party services"],
          },
          {
            tag: "p",
            children: [
              " Providers process information needed for their services, including network addresses. Their notices explain their processing: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Rarimo"],
                    href: "https://rarimo.com/privacy-notice.html",
                    external: true,
                  },
                  " (global) for zero-knowledge identity proofs. May process IP addresses for security and service operations. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                  " receives your full number for SMS verification and abuse prevention. Agora stores a protected hash and partial number/country information. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Cloudflare"],
                    href: "https://www.cloudflare.com/privacypolicy/",
                    external: true,
                  },
                  " processes network/browser signals for abuse detection and service improvement. Enabled proxy/security services also handle traffic and content. See the ",
                  {
                    tag: "a",
                    children: ["Turnstile Privacy Addendum"],
                    href: "https://www.cloudflare.com/turnstile-privacy-policy/",
                    external: true,
                  },
                  ". ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Amazon Web Services"],
                    href: "https://aws.amazon.com/privacy/",
                    external: true,
                  },
                  " provides hosting, storage, email and diagnostics, generally in Ireland, and Bedrock/Mistral AI processing in the United States. Email requires recipient addresses and messages; AI uses relevant text and context. Full Bedrock input/output logging is disabled. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Google Cloud Platform"],
                    href: "https://cloud.google.com/terms/cloud-privacy-notice",
                    external: true,
                  },
                  " processes text in the United States for optional translation and fallback language detection. Automatic detection cannot be disabled, including when translation is off. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Plausible Analytics"],
                    href: "https://plausible.io/data-policy",
                    external: true,
                  },
                  " provides cookieless analytics from page and technical information, not credentials or drafts. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Sentry"],
                    href: "https://sentry.io/privacy/",
                    external: true,
                  },
                  " receives diagnostics and masked, error-triggered interaction replays through our EU configuration, including browser, page, route, interaction and network information. Masking does not guarantee anonymity. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Our self-hosted Reacher checks email validity using your full address and may contact mail servers or validation providers. AI/translation requests omit accompanying account and contact identifiers, but do not remove identifying information within text. ",
            ],
          },
          {
            tag: "h3",
            children: ["Cookies and analytics"],
          },
          {
            tag: "p",
            children: [
              " We do not use advertising or cross-site tracking cookies or sell data for advertising. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Browser storage holds keys, session information, preferences and drafts until cleared. Local saving does not itself upload drafts; submission, import or requested AI processing sends relevant input. Server deletion cannot erase every device-local copy. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["1. When does this privacy policy apply?"],
          },
          {
            tag: "p",
            children: [
              " This notice applies when you use our website or apps, or contact us. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. Which personal data do we process and why?"],
          },
          {
            tag: "p",
            children: [
              " We receive data from you, your device and organizers/imports. The table lists purposes and legal bases; section 6 explains your rights. ",
            ],
          },
          {
            tag: "table",
            children: [
              {
                tag: "thead",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "th",
                        children: ["What personal data?"],
                      },
                      {
                        tag: "th",
                        children: ["Why?"],
                      },
                      {
                        tag: "th",
                        children: ["Legal basis?"],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "tbody",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Device identifiers and sessions"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Public-key identifiers, browser/device information and session status for authentication, recovery and abuse prevention. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Legitimate interest"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Retired event-ticket records"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Historical verification identifiers, dates and metadata; no longer used for access or eligibility. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Legitimate interest"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Authentication Data - Phone Number"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Number verification, protected hash, partial number/country information and anti-abuse records for authentication. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Legitimate interest"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Authentication Data - Passport Zero-Knowledge Proof (Rarimo)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Passport-derived uniqueness identifier, citizenship, sex and age-threshold proof for eligibility and ownership checks, without a full birth date. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Legitimate interest"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Account Information"],
                          },
                          " (Username, languages, preferences, status and permissions) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " To manage your account, preferences, permissions and notifications. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Your consent"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Actions you take"],
                          },
                          " (Conversations, statements, agree/disagree/pass votes, survey choices/free-text answers, best/worst and pairwise comparisons, and credit allocations for quadratic voting) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Content, choices and timestamps for participation and results. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Your consent"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["IP address"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " To protect the service and prevent attacks. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Legitimate interest"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Pseudonymous Technical Data"],
                          },
                          " (Identifiers, errors, counts, timings and technical context) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " For reliability and security. Infrastructure/provider logs may also contain network, request or database context. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Legitimate interest"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Communication"],
                          },
                          " (Contact details, messages, reports and dates) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " To communicate with you and handle requests or reports. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Legitimate interest in communicating with you. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Above-mentioned personal data."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " To meet legal obligations and lawful authority requests. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Our legal obligation."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Above-mentioned personal data."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " To prevent fraud, unwanted messages and unauthorized activity. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Our legal obligation."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Above-mentioned personal data."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: ["To defend ourselves in legal proceedings."],
                      },
                      {
                        tag: "td",
                        children: [
                          " Legitimate interest in defending legal claims. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Above-mentioned personal data."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " For a merger, acquisition or demerger, including with parties outside the EU. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Legitimate interest in business transactions. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Account Upgrade/Merge Data"],
                          },
                          " (User content, devices and preferences) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " To transfer guest activity to a registered account. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Your consent and our legitimate interest."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          { tag: "strong", children: ["Email authentication"] },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Address, account/device association, verification codes/status and anti-abuse records for login and recovery.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Legitimate interest in account authentication and abuse prevention.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Derived analysis and ranking information",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Opinion groups, preferences and results, using individual numerical inputs: Polis vote matrices, BWS/pairwise choices and QV credit allocations.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Consent to participation and analysis, with an additional condition for sensitive data where required. Continued retention after withdrawal requires an independent legal ground.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Projects, organizations, documents and imports",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Permissions, contacts, files and content for administration. Imports may include statements, votes, participant identifiers and timestamps about non-users.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Requested services and legitimate interests in authorized projects/imports, respecting affected people's rights and additional required legal conditions.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Automatic language detection, optional AI assistance and dynamic translation",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Text, unpublished drafts, statements/summaries and processing metadata for language detection, requested translation and AI suggestions/descriptions.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "The underlying content's legal basis; specific consent where required for optional processing.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Conversation Email Updates, where enabled",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Addresses, preferences, language, delivery history, action links and opt-outs/complaints for chosen updates and delivery management.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Consent where required; requested preference actions; legitimate interests in reliable, abuse-free delivery.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Deletion, recovery and restricted case records",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Requests, ownership checks, deadlines and limited case/cleanup evidence for recovery, erasure and preventing restoration of erased data.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Your request, legal obligations and justified security or legal-claim interests.",
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "Content and voting patterns can reveal political opinions or other sensitive information, requiring an applicable legal condition, including explicit consent where required. Avoid unnecessary personal information about yourself or others.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["3. With whom do we share your personal data?"],
          },
          {
            tag: "p",
            children: [
              " 3.1. Depending on the feature and permissions, recipients include: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["You, for account access and rights requests;"],
              },
              {
                tag: "li",
                children: [
                  "Visitors, for public information and permitted exports described above;",
                ],
              },
              {
                tag: "li",
                children: [
                  "Authorized organizers/staff, for administration, restricted responses, exports and moderation. Organizers are responsible for their subsequent use and collection;",
                ],
              },
              {
                tag: "li",
                children: [
                  "Our personnel and providers, with appropriate access restrictions and processor arrangements; and",
                ],
              },
              {
                tag: "li",
                children: [
                  " Authorities where disclosure is legally required. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. Processing outside the EEA includes U.S. AI/translation and global verification/security services. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. Where required, transfers rely on applicable adequacy decisions or approved frameworks, or standard contractual clauses with relevant security measures. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. Contact legal@zkorum.com for recipient/location details and information about applicable transfer safeguards, including contractual safeguards. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. We may retain or share anonymous aggregates. Removing account links does not by itself guarantee anonymity: identifiable text, patterns and small-group results remain personal data. ",
            ],
          },
          {
            tag: "p",
            children: [
              "3.6. We issue required erasure/correction/restriction instructions and recipient notifications, but cannot remotely erase independent downloads, publications or search-engine copies. Providers may retain records for their own lawful purposes. Replying to an organizer shares your email address and message.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["4. How long do we keep your personal data?"],
          },
          {
            tag: "p",
            children: [
              " 4.1. We keep account data while needed for section 2's purposes. Withdrawal ends consent-based processing unless an independent legal ground applies. Section 6.7 explains account deletion and recovery. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. Accepted account deletion disables access and makes participation ineligible for new live calculations. It hides personal statement text, translations and attribution, including in historical displays. Open results refresh asynchronously. Recovery data remain private for 15 days, then become eligible for permanent cleanup. ",
            ],
          },
          {
            tag: "p",
            children: [
              "We keep saved results' numerical inputs indefinitely for voting analysis and recalculation, removing account links during permanent cleanup.",
            ],
          },
          {
            tag: "p",
            children: [
              "Cleanup proceeds without undue delay, but need not finish at the recovery deadline. Delays do not extend recovery or legal deadlines.",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. Retained inputs are those used in saved results, not every ballot or calculation. Ordinary deletion does not recalculate saved numbers; separate corrections or re-analysis may change them. Historical AI descriptions are not automatically rewritten; identifying excerpts remain subject to erasure rights. Applicable erasure removes or redacts affected output/translations without generating a replacement. Reopening excludes deleted or permanently detached participation. Conversation/project deletion removes its exclusively owned results and inputs. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. Files remain while their project or another valid shared use needs them. Existing exports may contain later-deleted content; downloads expire at most 30 days after generation, without extension. Ordinary deletion does not rewrite them; new exports use current deletion state. Expired files undergo prompt cleanup. Specific erasure requests follow section 6. ",
            ],
          },
          {
            tag: "p",
            children: [
              "4.5. Verification codes and action/recovery tokens expire and are cleaned up. Necessary anti-abuse and credential-retirement records remain for their protective purpose.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.6. Email preferences, opt-outs and delivery records remain to honor choices and resolve failures. Account deletion invalidates your links and removes unnecessary recipient details. Raw delivery-event data are cleared after processing or failure resolution.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.7. Our CloudWatch application/database logs have rolling 180-day retention; provider retention varies. Account deletion does not erase every log. Restricted support, moderation, security or legal evidence may remain longer for its specific purpose, not as a whole-account archive.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.8. Erased data may remain in restricted backups for at most 30 days after live-system removal, unavailable for ordinary use. Copies/restores do not restart that period; deletion instructions are reapplied before restored data is exposed.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. How do we keep your personal data secure?"],
          },
          {
            tag: "p",
            children: [
              " We use proportionate access controls, encryption, restricted backups, data minimization and security monitoring. Authentication uses verification codes and cryptographic keys, not stored account passwords. No service can guarantee absolute security. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. Your rights regarding your personal data"],
          },
          {
            tag: "p",
            children: [
              " 6.1. Use account controls or contact legal@zkorum.com, including for imported data about non-users. We verify identity or ownership proportionately, not necessarily with identity documents. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2. Depending on the processing and legal basis, you have the: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["right to access your data"],
              },
              {
                tag: "li",
                children: ["right to amend your data"],
              },
              {
                tag: "li",
                children: [
                  "right to object to the processing of your personal data",
                ],
              },
              {
                tag: "li",
                children: ["right to restrict data processing"],
              },
              {
                tag: "li",
                children: ["right to have your data erased"],
              },
              {
                tag: "li",
                children: ["right to withdraw your previously given consent"],
              },
              {
                tag: "li",
                children: ["right to transfer your data"],
              },
              {
                tag: "li",
                children: [
                  " right to lodge complaints with the competent data protection authority. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. We explain any legally permitted or required limitation on these rights. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. Rights requests are free. We respond without undue delay, normally within one month. Complexity or numerous requests may require up to two further months; we explain any extension within the first month. For manifestly unfounded or excessive requests, we must justify any lawful refusal or reasonable fee. Response periods do not justify delaying required erasure. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5. Within your permissions, controls let you manage content/preferences and withdraw or change supported participation, subject to open/closed rules. Account deletion also redacts your personal statements; separate statement deletion is unnecessary. Independent content deletion has no recovery period. ",
            ],
          },
          {
            tag: "p",
            children: [
              "Withdrawals do not rewrite saved results. After permanent unlinking, account controls cannot retrieve, change or withdraw detached numerical records, nor can a new account reclaim them.",
            ],
          },
          {
            tag: "p",
            children: [
              "Project deletion covers its conversations, documents and exclusively owned results/inputs. Organization deletion requires solely owned projects to be transferred or separately deleted; co-owned projects survive with other owners. Deletion is not reversible archiving.",
            ],
          },
          {
            tag: "h3",
            children: ["6.6. Security records:"],
          },
          {
            tag: "p",
            children: [
              " Limited anti-abuse, blocked-credential, opt-out and erasure/security/legal evidence may remain for their specific purposes—not full authentication proofs, verification secrets or a general copy of your deleted account. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. How to delete your account:"],
          },
          {
            tag: "p",
            children: [
              " Request deletion through account controls. If organization responsibilities prevent account deletion through those controls, contact us. An accepted deletion request starts the 15-day recovery period; a refused request does not. Section 4 explains what is hidden, erased or retained. ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["On acceptance:"],
                  },
                  " Sessions are revoked and further account-related email/private work stops; already-dispatched operations may complete. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["During the next 15 days:"],
                  },
                  " Recovery requires verified ownership and explicit cancellation before the deadline, using a supported credential or original guest-device keys. Recovery-only data are excluded from ordinary access, historical displays and new exports; existing exports follow section 4.4. ",
                ],
              },
              {
                tag: "li",
                children: [
                  { tag: "strong", children: ["At the 15-day deadline:"] },
                  " Recovery ends. Cleanup removes private account/recovery data, original personal statement text and translations, and unnecessary associations. Statements show a deletion notice without your attribution. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "Recovery restores otherwise permitted data hidden solely by account deletion, not revoked sessions, independent deletions, withdrawals, guest merges or moderation decisions.",
            ],
          },
          {
            tag: "p",
            children: [
              "Shared organizations/projects and others' contributions survive account deletion. Project-owned seed statements survive without your public attribution. Their deletion requires separate authorization.",
            ],
          },
          {
            tag: "p",
            children: [
              " Statutory erasure requests do not require waiting for account recovery to expire. Account deletion does not waive your statutory data-protection rights. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. Complain to ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              " or directly to a competent data protection authority, including France's CNIL (",
              {
                tag: "a",
                children: ["www.cnil.fr"],
                href: "http://www.cnil.fr/",
                external: true,
              },
              "). ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["7. Important information for California residents"],
          },
          {
            tag: "p",
            children: [
              " 7.1. Under the California Consumer Privacy Act (CCPA), the categories collected, used and shared in the past 12 months are those described above, for the stated purposes. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. We have not sold personal information for money or other valuable consideration. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. You may request access, deletion and information about our practices through section 6. We verify requests and may require proof that an agent is authorized to act for you. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. Exercising rights will not affect prices or service quality except where law permits. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["8. Changes to this privacy policy"],
          },
          {
            tag: "p",
            children: [
              " We notify you of material privacy changes by email or in Agora. The latest notice and its update date are available on our website. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. Do you have any questions?"],
          },
          {
            tag: "p",
            children: [
              " Contact our privacy manager: ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". ",
            ],
          },
        ],
      },
    ],
  },
  ar: {
    title: "سياسة الخصوصية",
    automatedTranslationNotice: {
      title: "ترجمة آلية",
      statement:
        "تُرجمت سياسة الخصوصية هذه آليًا. النسخة الإنجليزية هي النسخة المعتمدة الوحيدة، ولها وحدها الأولوية في حال وجود أي اختلاف.",
      viewEnglish: "عرض النسخة الإنجليزية المعتمدة",
      returnToTranslation: "العودة إلى النسخة المترجمة",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["تاريخ آخر تحديث"],
          },
          ": 2026/10/14 (YYYY/MM/DD)",
        ],
      },
      {
        tag: "p",
        children: [
          " تتولى تطوير Agora Citizen Network شركة ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          ". ",
        ],
      },
      {
        tag: "p",
        children: [
          " تتولى ZKorum SAS («Agora» أو «نحن») المسؤولية عن البيانات الشخصية الموضّحة في هذا الإشعار. ",
        ],
      },
      {
        tag: "p",
        children: [
          " للتواصل: ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". للمقيمين في كاليفورنيا: انظر القسم 7. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["إتاحة المحتوى وسجلات المشاركة"],
          },
          {
            tag: "p",
            children: [
              " يكون المحتوى المنشور والنتائج متاحين للجمهور عمومًا، مع مراعاة قيود الوصول. وقد تظل المحادثات غير المدرجة متاحة عبر الرابط؛ فاستبعادها من البحث لا يجعلها سرّية. ",
            ],
          },
          {
            tag: "p",
            children: [" يمكنك التصفّح دون حساب. وللمشاركة: "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["الضيوف:"],
                  },
                  " حيثما يُسمح بذلك، يمكنك المشاركة بحساب قائم على الجهاز. وقد يمنع فقدان مفاتيحه المخزّنة الوصول إليه أو استرداده. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["الحسابات المسجّلة:"],
                  },
                  " تشمل وسائل التحقق المتاحة: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["عنوان البريد الإلكتروني:"],
                          },
                          " يثبت رمز يُستخدم مرة واحدة ملكية العنوان، لا الهوية أو التفرّد. ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["رقم الهاتف:"],
                          },
                          " يُتحقّق منه بواسطة رمز يُستخدم مرة واحدة ويُرسل عبر SMS ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "a",
                            children: ["Rarimo"],
                            href: "https://rarimo.com/privacy-notice.html",
                            external: true,
                          },
                          ": تحقّق قائم على جواز السفر باستخدام إثبات عديم المعرفة (ZKP) ",
                        ],
                      },
                    ],
                  },
                  " قد تشترط المحادثات وسيلة معيّنة. ويكشف التحقق بجواز السفر معلومات الأهلية، لا صورة جوازك أو رقمه أو اسمك أو صورتك الشخصية. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["ترقية الحسابات:"],
              },
              " يمكن دمج نشاط الضيف في حساب مسجّل، وتكون الأولوية لخيارات الحساب القائمة. والدمج غير قابل للعكس ولا يمكنه جمع حسابين مسجّلين. ",
            ],
          },
          {
            tag: "p",
            children: [
              " قد يظهر اسم المستخدم الذي تختاره أو يُنشأ لك مع المحتوى المنشور؛ ولا يلزم أن يكون اسمك الحقيقي. ",
            ],
          },
          {
            tag: "h3",
            children: ["من يمكنه الاطلاع على معلوماتك؟"],
          },
          {
            tag: "p",
            children: [" يعتمد الوصول على النشاط والصلاحيات: "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "قد يكون المحتوى المنشور والنتائج وأسماء المستخدمين وجهات اتصال المشاريع والمنظمات متاحة للجمهور وقابلة للنسخ أو الفهرسة.",
                ],
              },
              {
                tag: "li",
                children: [
                  "لا تُنشر تفاصيل المصادقة أو المفاتيح الخاصة أو إعدادات الحساب.",
                ],
              },
              {
                tag: "li",
                children: [
                  " ترتبط المشاركة بالحساب حتى فصلها عنه. ويمكن للمشاركين استرجاع توزيعات QV الخاصة بهم؛ ولا يعني الاحتفاظ بمدخلات QV نشر أوراق التصويت الفردية أو إتاحة تصديرها. ",
                ],
              },
              {
                tag: "li",
                children: [
                  "تتطلب إجابات الاستبيانات الفردية والنتائج الكاملة، بما فيها النتائج التجميعية غير المحجوبة، صلاحيات بمستوى المالك. وقد تحجب النتائج التجميعية العامة المجموعات الصغيرة.",
                ],
              },
              {
                tag: "li",
                children: [
                  "حيثما يكون التصدير مفعّلًا، يستطيع كل من يملك حق الوصول إلى المحادثة، بما في ذلك الضيوف ذوو الحسابات القائمة على الأجهزة، الحصول على صادرات قياسية تتضمن المقترحات ومعرّفات المؤلفين المعاد تعيينها والطوابع الزمنية وإجماليات الأصوات والنتائج التجميعية المسموح بها للاستبيانات.",
                ],
              },
              {
                tag: "li",
                children: [
                  "تتضمن صادرات الأصوات الفردية، حيثما تُتاح، الخيارات ومعرّفات المشاركين ومراجع المقترحات والطوابع الزمنية. ونوضّح أي إفصاحات إضافية عن المشاركة والجهات التي تتلقاها قبل تطبيقها، مع الحصول على الموافقة حيثما تلزم.",
                ],
              },
              {
                tag: "li",
                children: [
                  " تتاح البلاغات وأسباب الإشراف والهويات ذات الصلة للموظفين أو المنظّمين المصرّح لهم. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " قد تربط معرّفات التصدير المشتركة المقترحات والأصوات وإجابات الاستبيانات. وقد تكشف النصوص أو الطوابع الزمنية أو أنماط التصويت أو المجموعات الصغيرة هوية المشاركين رغم إعادة تعيين المعرّفات. وتستبعد صادرات الاستبيانات القياسية عناوين بريد المصادقة، لكن الإجابات النصية الحرة قد تتضمن بيانات اتصال. ",
            ],
          },
          {
            tag: "p",
            children: [
              " تسري هذه القواعد بغض النظر عن تنسيق التصدير. وقد يحتفظ المتلقون بالملفات أو يدمجونها أو يعيدون نشرها مع مراعاة القانون؛ ويوضّح القسم 3.6 النسخ المستقلة. ",
            ],
          },
          {
            tag: "h3",
            children: ["الانتقال المزمع إلى AT Protocol"],
          },
          {
            tag: "p",
            children: [
              " قد يتيح انتقال محتمل إلى AT Protocol مشاركة المحتوى العام والأصوات الفردية والمعرّفات مع خدمات مستقلة خارج سيطرة Agora، بما فيها خدمات خارج المنطقة الاقتصادية الأوروبية (EEA). ",
            ],
          },
          {
            tag: "p",
            children: [
              " لم تُحسم ترتيبات المحادثات المقيّدة بعد. وضوابط الوصول ليست تشفيرًا من طرف إلى طرف، ولا تمنع القراء المصرّح لهم من نسخ البيانات. ",
            ],
          },
          {
            tag: "p",
            children: [
              " قبل الانتقال، سنوضّح التغييرات والخيارات ونحدّث هذا الإشعار ونحصل على الموافقة المطلوبة. ولا يجيز ذلك نشر المشاركة المقيّدة القائمة. ",
            ],
          },
          {
            tag: "h3",
            children: ["خدمات الأطراف الثالثة"],
          },
          {
            tag: "p",
            children: [
              " يعالج مقدّمو الخدمات المعلومات اللازمة لخدماتهم، بما فيها عناوين الشبكة. وتوضّح إشعاراتهم كيفية معالجتها: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Rarimo"],
                    href: "https://rarimo.com/privacy-notice.html",
                    external: true,
                  },
                  " (عالمي) لإثباتات الهوية عديمة المعرفة. وقد يعالج عناوين IP لأغراض الأمن وتشغيل الخدمة. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                  " تتلقى رقمك الكامل للتحقق عبر SMS ومنع إساءة الاستخدام. وتخزّن Agora تجزئة محمية ومعلومات جزئية عن الرقم والبلد. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Cloudflare"],
                    href: "https://www.cloudflare.com/privacypolicy/",
                    external: true,
                  },
                  " تعالج إشارات الشبكة والمتصفّح لكشف إساءة الاستخدام وتحسين الخدمة. وتعالج خدمات الوكيل والأمن المفعّلة أيضًا حركة البيانات والمحتوى. انظر ",
                  {
                    tag: "a",
                    children: ["ملحق خصوصية Turnstile"],
                    href: "https://www.cloudflare.com/turnstile-privacy-policy/",
                    external: true,
                  },
                  ". ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Amazon Web Services"],
                    href: "https://aws.amazon.com/privacy/",
                    external: true,
                  },
                  " توفّر الاستضافة والتخزين والبريد الإلكتروني والتشخيصات، في أيرلندا عمومًا، ومعالجة الذكاء الاصطناعي Bedrock/Mistral في الولايات المتحدة. ويتطلب البريد عناوين المتلقين والرسائل؛ ويستخدم الذكاء الاصطناعي النص والسياق المعنيين. وتسجيل مدخلات Bedrock ومخرجاته كاملة معطّل. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Google Cloud Platform"],
                    href: "https://cloud.google.com/terms/cloud-privacy-notice",
                    external: true,
                  },
                  " تعالج النص في الولايات المتحدة للترجمة الاختيارية وكشف اللغة الاحتياطي. ولا يمكن تعطيل الكشف الآلي، حتى عند إيقاف الترجمة. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Plausible Analytics"],
                    href: "https://plausible.io/data-policy",
                    external: true,
                  },
                  " توفّر تحليلات دون ملفات تعريف ارتباط باستخدام معلومات الصفحات والمعلومات التقنية، لا بيانات الاعتماد أو المسودات. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Sentry"],
                    href: "https://sentry.io/privacy/",
                    external: true,
                  },
                  " تتلقى تشخيصات وإعادات تشغيل مموّهة للتفاعلات تُرسل عند وقوع خطأ عبر إعدادنا في الاتحاد الأوروبي، وتتضمن معلومات المتصفّح والصفحة والمسار والتفاعل والشبكة. ولا يضمن التمويه إخفاء الهوية. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " تتحقق خدمة Reacher المستضافة ذاتيًا لدينا من صلاحية البريد باستخدام عنوانك الكامل، وقد تتصل بخوادم البريد أو مقدّمي خدمات التحقق. وتستبعد طلبات الذكاء الاصطناعي والترجمة معرّفات الحساب والاتصال المرافقة، لكنها لا تزيل المعلومات الكاشفة للهوية داخل النص. ",
            ],
          },
          {
            tag: "h3",
            children: ["ملفات تعريف الارتباط والتحليلات"],
          },
          {
            tag: "p",
            children: [
              " لا نستخدم ملفات تعريف ارتباط للإعلانات أو التتبع عبر المواقع، ولا نبيع البيانات لأغراض الإعلان. ",
            ],
          },
          {
            tag: "p",
            children: [
              " يحتفظ تخزين المتصفّح بالمفاتيح ومعلومات الجلسة والتفضيلات والمسودات حتى مسحها. ولا يرفع الحفظ المحلي المسودات بحد ذاته؛ ويرسل الإرسال أو الاستيراد أو معالجة الذكاء الاصطناعي المطلوبة المدخلات المعنية. ولا يستطيع الحذف من الخادم محو كل نسخة محلية على الأجهزة. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["1. متى تسري سياسة الخصوصية هذه؟"],
          },
          {
            tag: "p",
            children: [
              " يسري هذا الإشعار عند استخدام موقعنا أو تطبيقاتنا أو التواصل معنا. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. ما البيانات الشخصية التي نعالجها، ولماذا؟"],
          },
          {
            tag: "p",
            children: [
              " نتلقى بيانات منك ومن جهازك ومن المنظّمين وعمليات الاستيراد. ويسرد الجدول الأغراض والأسس القانونية؛ ويوضّح القسم 6 حقوقك. ",
            ],
          },
          {
            tag: "table",
            children: [
              {
                tag: "thead",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "th",
                        children: ["ما البيانات الشخصية؟"],
                      },
                      {
                        tag: "th",
                        children: ["لماذا؟"],
                      },
                      {
                        tag: "th",
                        children: ["ما الأساس القانوني؟"],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "tbody",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["معرّفات الأجهزة والجلسات"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " معرّفات المفاتيح العامة ومعلومات المتصفّح والجهاز وحالة الجلسة للمصادقة والاسترداد ومنع إساءة الاستخدام. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["المصلحة المشروعة"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["سجلات تذاكر الفعاليات المتوقفة"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " معرّفات تحقق تاريخية وتواريخ وبيانات وصفية؛ لم تعد تُستخدم للوصول أو الأهلية. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["المصلحة المشروعة"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["بيانات المصادقة - رقم الهاتف"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " التحقق من الرقم وتجزئة محمية ومعلومات جزئية عن الرقم والبلد وسجلات مكافحة إساءة الاستخدام للمصادقة. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["المصلحة المشروعة"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "بيانات المصادقة - إثبات عديم المعرفة قائم على جواز السفر (Rarimo)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " معرّف تفرّد مستمد من جواز السفر والجنسية والجنس وإثبات استيفاء الحد العمري للتحقق من الأهلية والملكية، دون تاريخ الميلاد كاملًا. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["المصلحة المشروعة"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["معلومات الحساب"],
                          },
                          " (اسم المستخدم واللغات والتفضيلات والحالة والصلاحيات) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " لإدارة حسابك وتفضيلاتك وصلاحياتك وإشعاراتك. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["موافقتك"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["الإجراءات التي تتخذها"],
                          },
                          " (المحادثات والمقترحات وأصوات الموافقة/عدم الموافقة/التجاوز وخيارات الاستبيانات والإجابات النصية الحرة ومقارنات الأفضل والأسوأ والمقارنات الثنائية pairwise وتوزيع الأرصدة للتصويت التربيعي) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " المحتوى والخيارات والطوابع الزمنية للمشاركة والنتائج. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["موافقتك"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["عنوان IP"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [" لحماية الخدمة ومنع الهجمات. "],
                      },
                      {
                        tag: "td",
                        children: ["المصلحة المشروعة"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["بيانات تقنية ذات معرّفات مستعارة"],
                          },
                          " (المعرّفات والأخطاء والأعداد والقياسات الزمنية والسياق التقني) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " للموثوقية والأمن. وقد تتضمن سجلات البنية التحتية ومقدّمي الخدمات أيضًا سياق الشبكة أو الطلبات أو قاعدة البيانات. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["المصلحة المشروعة"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["التواصل"],
                          },
                          " (بيانات الاتصال والرسائل والبلاغات والتواريخ) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " للتواصل معك ومعالجة الطلبات أو البلاغات. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" المصلحة المشروعة في التواصل معك. "],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["البيانات الشخصية المذكورة أعلاه."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " للوفاء بالالتزامات القانونية وطلبات السلطات المشروعة. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["التزامنا القانوني."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["البيانات الشخصية المذكورة أعلاه."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " لمنع الاحتيال والرسائل غير المرغوب فيها والنشاط غير المصرّح به. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["التزامنا القانوني."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["البيانات الشخصية المذكورة أعلاه."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: ["للدفاع عن أنفسنا في الإجراءات القضائية."],
                      },
                      {
                        tag: "td",
                        children: [
                          " المصلحة المشروعة في الدفاع في المطالبات القانونية. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["البيانات الشخصية المذكورة أعلاه."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " لأغراض الاندماج أو الاستحواذ أو الانقسام، بما في ذلك مع أطراف خارج الاتحاد الأوروبي. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " مصلحتنا المشروعة في إبرام معاملات تجارية. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["بيانات ترقية الحساب ودمجه"],
                          },
                          " (محتوى المستخدم والأجهزة والتفضيلات) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" لنقل نشاط الضيف إلى حساب مسجّل. "],
                      },
                      {
                        tag: "td",
                        children: ["موافقتك ومصلحتنا المشروعة."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["المصادقة عبر البريد الإلكتروني"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "العنوان وارتباطه بالحساب والجهاز ورموز التحقق وحالتها وسجلات مكافحة إساءة الاستخدام لتسجيل الدخول والاسترداد.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "المصلحة المشروعة في مصادقة الحساب ومنع إساءة الاستخدام.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["معلومات التحليل والترتيب المستنبطة"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "مجموعات الرأي والتفضيلات والنتائج، باستخدام المدخلات الرقمية الفردية: مصفوفات تصويت Polis وخيارات BWS/pairwise وتوزيع أرصدة QV.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "الموافقة على المشاركة والتحليل، مع شرط إضافي للبيانات الحساسة حيثما يلزم. ويتطلب استمرار الاحتفاظ بعد سحب الموافقة سندًا قانونيًا مستقلًا.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "المشاريع والمنظمات والمستندات وعمليات الاستيراد",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "الصلاحيات وجهات الاتصال والملفات والمحتوى للإدارة. وقد تشمل الواردات مقترحات وأصواتًا ومعرّفات مشاركين وطوابع زمنية لأشخاص غير مستخدمين.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "تنفيذ الخدمات المطلوبة؛ والمصالح المشروعة في تشغيل المشاريع وعمليات الاستيراد المصرّح بها، مع مراعاة حقوق الأشخاص المتأثرين وأي شرط قانوني إضافي مطلوب.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "كشف اللغة الآلي والمساعدة الاختيارية بالذكاء الاصطناعي (AI) والترجمة الديناميكية",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "النصوص والمسودات غير المنشورة والمقترحات والملخصات وبيانات المعالجة الوصفية لكشف اللغة والترجمة المطلوبة واقتراحات الذكاء الاصطناعي وأوصافه.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "الأساس القانوني للمحتوى الأصلي؛ وموافقة محدّدة حيثما تلزم للمعالجة الاختيارية.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "تحديثات المحادثات عبر البريد الإلكتروني، حيثما تكون مفعّلة",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "العناوين والتفضيلات واللغة وسجل التسليم وروابط الإجراءات وخيارات الانسحاب والشكاوى للتحديثات المختارة وإدارة التسليم.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "الموافقة حيثما تلزم؛ وإجراءات التفضيلات المطلوبة؛ والمصالح المشروعة في تسليم موثوق وخالٍ من إساءة الاستخدام.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "سجلات الحذف والاسترداد والقضايا المقيّدة",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "الطلبات والتحقق من الملكية والمواعيد النهائية والأدلة المحدودة للقضايا والتنظيف، للاسترداد والمحو ومنع استعادة البيانات الممحوة.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "طلبك والالتزامات القانونية والمصالح المبرّرة المتعلقة بالأمن أو المطالبات القانونية.",
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "قد يكشف المحتوى وأنماط التصويت آراء سياسية أو معلومات حساسة أخرى، مما يتطلب شرطًا قانونيًا منطبقًا، بما فيه الموافقة الصريحة حيثما تلزم. تجنّب المعلومات الشخصية غير الضرورية عن نفسك أو الآخرين.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["3. مع من نشارك بياناتك الشخصية؟"],
          },
          {
            tag: "p",
            children: [" 3.1. بحسب الميزة والصلاحيات، يشمل المتلقون: "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["أنت، للوصول إلى الحساب وطلبات الحقوق؛"],
              },
              {
                tag: "li",
                children: [
                  "الزوار، للمعلومات العامة والصادرات المسموح بها الموضّحة أعلاه؛",
                ],
              },
              {
                tag: "li",
                children: [
                  "المنظّمون والموظفون المصرّح لهم، للإدارة والإجابات المقيّدة والتصدير والإشراف. والمنظّمون مسؤولون عن استخدامهم وجمعهم اللاحقين؛",
                ],
              },
              {
                tag: "li",
                children: [
                  "موظفونا ومقدّمو خدماتنا، مع قيود وصول وترتيبات معالجة مناسبة؛ و",
                ],
              },
              {
                tag: "li",
                children: [" السلطات حيثما يكون الإفصاح مطلوبًا قانونًا. "],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. تشمل المعالجة خارج المنطقة الاقتصادية الأوروبية (EEA) الذكاء الاصطناعي والترجمة في الولايات المتحدة وخدمات التحقق والأمن العالمية. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. حيثما يلزم، يستند النقل إلى قرارات كفاية الحماية أو الأطر المعتمدة المنطبقة، أو البنود التعاقدية القياسية مع التدابير الأمنية ذات الصلة. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. تواصل مع legal@zkorum.com لمعرفة تفاصيل المتلقين والمواقع وضمانات النقل المنطبقة، بما فيها الضمانات التعاقدية. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. قد نحتفظ بنتائج تجميعية مجهولة الهوية أو نشاركها. ولا تضمن إزالة روابط الحساب وحدها إخفاء الهوية: فالنصوص والأنماط ونتائج المجموعات الصغيرة الكاشفة للهوية تظل بيانات شخصية. ",
            ],
          },
          {
            tag: "p",
            children: [
              "3.6. نصدر تعليمات المحو والتصحيح والتقييد وإخطارات المتلقين المطلوبة، لكن لا نستطيع محو التنزيلات أو المنشورات المستقلة أو نسخ محركات البحث عن بُعد. وقد يحتفظ مقدّمو الخدمات بسجلات لأغراضهم المشروعة الخاصة. ويكشف الرد على منظّم عنوان بريدك ورسالتك له.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["4. كم من الوقت نحتفظ ببياناتك الشخصية؟"],
          },
          {
            tag: "p",
            children: [
              " 4.1. نحتفظ ببيانات الحساب ما دامت لازمة لأغراض القسم 2. وينهي سحب الموافقة المعالجة القائمة عليها ما لم ينطبق سند قانوني مستقل. ويوضّح القسم 6.7 حذف الحساب واسترداده. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. يعطّل حذف الحساب المقبول الوصول ويستبعد المشاركة من الحسابات المباشرة الجديدة. ويخفي نص المقترحات الشخصية وترجماتها ونسبتها إليك، بما في ذلك في العروض التاريخية. وتتحدّث النتائج المفتوحة بصورة غير متزامنة. وتبقى بيانات الاسترداد خاصة لمدة 15 يومًا، ثم تصبح مؤهلة للتنظيف النهائي. ",
            ],
          },
          {
            tag: "p",
            children: [
              "نحتفظ بالمدخلات الرقمية للنتائج المحفوظة إلى أجل غير مسمى لتحليل التصويت وإعادة الحساب، ونزيل روابط الحساب أثناء التنظيف النهائي.",
            ],
          },
          {
            tag: "p",
            children: [
              "يجري التنظيف دون تأخير غير مبرر، لكن ليس من الضروري اكتماله عند الموعد النهائي للاسترداد. ولا تمدّد التأخيرات الاسترداد أو المهل القانونية.",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. المدخلات المحتفظ بها هي المستخدمة في النتائج المحفوظة، لا كل ورقة تصويت أو عملية حساب. ولا يعيد الحذف المعتاد حساب الأرقام المحفوظة؛ وقد تغيّرها تصحيحات أو إعادة تحليل منفصلة. ولا تُعاد كتابة أوصاف الذكاء الاصطناعي التاريخية تلقائيًا؛ وتظل المقتطفات الكاشفة للهوية خاضعة لحقوق المحو. ويزيل المحو المنطبق المخرجات والترجمات المتأثرة أو ينقّحها دون توليد بديل. وتستبعد إعادة الفتح المشاركة المحذوفة أو المفصولة نهائيًا عن الحساب. ويزيل حذف المحادثة أو المشروع النتائج والمدخلات التي يملكها حصريًا. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. تبقى الملفات ما دام مشروعها أو استخدام مشترك صالح آخر يحتاج إليها. وقد تحتوي الصادرات القائمة على محتوى حُذف لاحقًا؛ وتنتهي صلاحية تنزيلها خلال 30 يومًا على الأكثر من إنشائها، دون تمديد. ولا يعيد الحذف المعتاد كتابتها؛ وتعتمد الصادرات الجديدة حالة الحذف الحالية. وتُزال الملفات المنتهية الصلاحية سريعًا. وتتبع طلبات المحو المحدّدة القسم 6. ",
            ],
          },
          {
            tag: "p",
            children: [
              "4.5. تنتهي صلاحية رموز التحقق ورموز الإجراءات والاسترداد وتُزال. وتبقى سجلات مكافحة إساءة الاستخدام وإخراج بيانات الاعتماد من الخدمة الضرورية لغرضها الوقائي.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.6. تبقى تفضيلات البريد وخيارات الانسحاب وسجلات التسليم لاحترام الخيارات وحل الإخفاقات. ويبطل حذف الحساب روابطك ويزيل تفاصيل المتلقي غير الضرورية. وتُمسح بيانات أحداث التسليم الخام بعد المعالجة أو حل الإخفاق.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.7. تخضع سجلات التطبيق وقاعدة البيانات لدينا في CloudWatch لاحتفاظ متجدّد لمدة 180 يومًا؛ وتختلف مدد مقدّمي الخدمات. ولا يمحو حذف الحساب كل سجل. وقد تبقى أدلة الدعم أو الإشراف أو الأمن أو القانون المقيّدة مدة أطول لغرضها المحدّد، لا كأرشيف للحساب كاملًا.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.8. قد تبقى البيانات الممحوة في نسخ احتياطية مقيّدة لمدة لا تتجاوز 30 يومًا بعد إزالتها من الأنظمة الحية، دون إتاحتها للاستخدام المعتاد. ولا يعيد النسخ أو الاستعادة بدء تلك المدة؛ ويُعاد تطبيق تعليمات الحذف قبل إتاحة البيانات المستعادة.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. كيف نحافظ على أمن بياناتك الشخصية؟"],
          },
          {
            tag: "p",
            children: [
              " نستخدم ضوابط وصول وتشفيرًا ونسخًا احتياطية مقيّدة وتقليلًا للبيانات ومراقبة أمنية بصورة متناسبة. وتستخدم المصادقة رموز التحقق والمفاتيح التشفيرية، لا كلمات مرور حسابات مخزّنة. ولا يمكن لأي خدمة ضمان الأمن المطلق. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. حقوقك المتعلقة ببياناتك الشخصية"],
          },
          {
            tag: "p",
            children: [
              " 6.1. استخدم أدوات الحساب أو تواصل مع legal@zkorum.com، بما في ذلك بشأن بيانات مستوردة عن غير المستخدمين. ونتحقق من الهوية أو الملكية بصورة متناسبة، وليس بالضرورة بوثائق هوية. ",
            ],
          },
          {
            tag: "p",
            children: [" 6.2. بحسب المعالجة والأساس القانوني، لك: "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["الحق في الوصول إلى بياناتك"],
              },
              {
                tag: "li",
                children: ["الحق في تعديل بياناتك"],
              },
              {
                tag: "li",
                children: ["الحق في الاعتراض على معالجة بياناتك الشخصية"],
              },
              {
                tag: "li",
                children: ["الحق في تقييد معالجة البيانات"],
              },
              {
                tag: "li",
                children: ["الحق في محو بياناتك"],
              },
              {
                tag: "li",
                children: ["الحق في سحب موافقتك التي سبق أن منحتها"],
              },
              {
                tag: "li",
                children: ["الحق في نقل بياناتك"],
              },
              {
                tag: "li",
                children: [
                  " الحق في تقديم شكاوى إلى سلطة حماية البيانات المختصة. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. نوضّح أي قيد على هذه الحقوق يسمح به القانون أو يفرضه. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. طلبات الحقوق مجانية. ونرد دون تأخير غير مبرر، عادة خلال شهر. وقد يتطلب التعقيد أو كثرة الطلبات شهرين إضافيين كحد أقصى؛ ونوضّح أي تمديد خلال الشهر الأول. وللطلبات غير المستندة بوضوح إلى أساس أو المفرطة، يجب تبرير أي رفض مشروع أو رسم معقول. ولا تبرّر مدد الرد تأخير المحو المطلوب. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5. تتيح الأدوات، ضمن صلاحياتك، إدارة المحتوى والتفضيلات وسحب المشاركة المدعومة أو تغييرها، مع مراعاة قواعد الفتح والإغلاق. وينقّح حذف الحساب أيضًا مقترحاتك الشخصية؛ فلا يلزم حذفها منفردة. ولا توجد مهلة استرداد لحذف المحتوى المستقل. ",
            ],
          },
          {
            tag: "p",
            children: [
              "لا يعيد سحب المشاركة كتابة النتائج المحفوظة. وبعد فك الارتباط نهائيًا، لا تستطيع أدوات الحساب استرجاع السجلات الرقمية المفصولة أو تغييرها أو سحبها، ولا يستطيع حساب جديد استعادتها.",
            ],
          },
          {
            tag: "p",
            children: [
              "يشمل حذف المشروع محادثاته ومستنداته والنتائج والمدخلات التي يملكها حصريًا. ويتطلب حذف المنظمة نقل مشاريعها المملوكة لها وحدها أو حذفها بصورة منفصلة؛ وتبقى المشاريع المشتركة مع مالكيها الآخرين. والحذف ليس أرشفة قابلة للعكس.",
            ],
          },
          {
            tag: "h3",
            children: ["6.6. السجلات الأمنية:"],
          },
          {
            tag: "p",
            children: [
              " قد تبقى سجلات محدودة لمكافحة إساءة الاستخدام وبيانات الاعتماد المحظورة والانسحاب وأدلة المحو والأمن والقانون لأغراضها المحدّدة، لا إثباتات مصادقة كاملة أو أسرار تحقق أو نسخة عامة من حسابك المحذوف. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. كيفية حذف حسابك:"],
          },
          {
            tag: "p",
            children: [
              " اطلب الحذف عبر أدوات الحساب. وإذا حالت مسؤولياتك في منظمة دون حذف الحساب عبرها، فتواصل معنا. ويبدأ طلب الحذف المقبول مهلة الاسترداد البالغة 15 يومًا؛ ولا يبدأها الطلب المرفوض. ويوضّح القسم 4 ما يُخفى أو يُمحى أو يُحتفظ به. ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["عند القبول:"],
                  },
                  " تُلغى الجلسات ويتوقف أي إرسال بريد إلكتروني أو عمل خاص لاحق مرتبط بالحساب؛ وقد تكتمل العمليات التي أُرسلت بالفعل. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["خلال الأيام 15 التالية:"],
                  },
                  " يتطلب الاسترداد التحقق من الملكية وإلغاءً صريحًا قبل الموعد النهائي، باستخدام بيانات اعتماد مدعومة أو مفاتيح جهاز الضيف الأصلية. وتُستبعد البيانات المخصّصة للاسترداد وحده من الوصول المعتاد والعروض التاريخية والصادرات الجديدة؛ وتتبع الصادرات القائمة القسم 4.4. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["عند حلول الموعد النهائي بعد 15 يومًا:"],
                  },
                  " ينتهي الاسترداد. ويزيل التنظيف بيانات الحساب والاسترداد الخاصة والنص الأصلي للمقترحات الشخصية وترجماتها والارتباطات غير الضرورية. وتُعرض المقترحات مع إشعار حذف دون نسبتها إليك. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "يعيد الاسترداد البيانات المسموح بها التي أُخفيت بسبب حذف الحساب وحده، لا الجلسات الملغاة أو عمليات الحذف المستقلة أو سحب المشاركة أو دمج الضيوف أو قرارات الإشراف.",
            ],
          },
          {
            tag: "p",
            children: [
              "تبقى المنظمات والمشاريع المشتركة ومساهمات الآخرين بعد حذف الحساب. وتبقى المقترحات الأولية المملوكة للمشروع دون نسبتها إليك علنًا. ويتطلب حذفها تصريحًا منفصلًا.",
            ],
          },
          {
            tag: "p",
            children: [
              " لا تتطلب طلبات المحو القانونية انتظار انتهاء مهلة استرداد الحساب. ولا يعني حذف الحساب التنازل عن حقوقك القانونية في حماية البيانات. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. قدّم الشكوى إلى ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              " أو مباشرة إلى سلطة مختصة بحماية البيانات، بما فيها CNIL في فرنسا (",
              {
                tag: "a",
                children: ["www.cnil.fr"],
                href: "http://www.cnil.fr/",
                external: true,
              },
              "). ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["7. معلومات مهمة للمقيمين في كاليفورنيا"],
          },
          {
            tag: "p",
            children: [
              " 7.1. بموجب قانون خصوصية المستهلك في كاليفورنيا (CCPA)، فإن الفئات التي جُمعت واستُخدمت وشُوركت خلال الأشهر 12 الماضية هي المبيّنة أعلاه، للأغراض المذكورة. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. لم نبع المعلومات الشخصية مقابل مال أو أي مقابل آخر ذي قيمة. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. يمكنك طلب الوصول والحذف ومعلومات عن ممارساتنا عبر القسم 6. ونتحقق من الطلبات، وقد نطلب إثباتًا بأن الوكيل مفوّض بالتصرف نيابة عنك. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. لن تؤثر ممارسة الحقوق في الأسعار أو جودة الخدمة إلا حيثما يسمح القانون. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["8. التغييرات على سياسة الخصوصية هذه"],
          },
          {
            tag: "p",
            children: [
              " نُخطرك بالتغييرات الجوهرية المتعلقة بالخصوصية عبر البريد الإلكتروني أو داخل Agora. ويتاح أحدث إشعار وتاريخ تحديثه على موقعنا. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. هل لديك أي أسئلة؟"],
          },
          {
            tag: "p",
            children: [
              " تواصل مع مسؤول الخصوصية لدينا: ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". ",
            ],
          },
        ],
      },
    ],
  },
  es: {
    title: "Política de privacidad",
    automatedTranslationNotice: {
      title: "Traducción automática",
      statement:
        "Esta política de privacidad se ha traducido automáticamente. La versión en inglés es la única versión autorizada y prevalece exclusivamente en caso de discrepancia.",
      viewEnglish: "Ver la versión autorizada en inglés",
      returnToTranslation: "Volver a la versión traducida",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["Última actualización"],
          },
          ": 2026/10/14 (YYYY/MM/DD)",
        ],
      },
      {
        tag: "p",
        children: [
          " Agora Citizen Network está desarrollada por ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          ". ",
        ],
      },
      {
        tag: "p",
        children: [
          " ZKorum SAS («Agora» o «nosotros») es responsable de los datos personales descritos en este aviso. ",
        ],
      },
      {
        tag: "p",
        children: [
          " Contacto: ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". Residentes en California: véase la sección 7. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: [
              "Visibilidad del contenido y registros de participación",
            ],
          },
          {
            tag: "p",
            children: [
              " El contenido publicado y los resultados son generalmente públicos, sujetos a restricciones de acceso. Las conversaciones no listadas pueden seguir siendo accesibles mediante enlace; excluirlas de las búsquedas no las hace confidenciales. ",
            ],
          },
          {
            tag: "p",
            children: [" Puede navegar sin una cuenta. Para participar: "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Invitados:"],
                  },
                  " Cuando se permita, participe mediante una cuenta basada en el dispositivo. Perder las claves almacenadas puede impedir el acceso o la recuperación. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Cuentas registradas:"],
                  },
                  " Los métodos de verificación disponibles incluyen: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["Dirección de correo electrónico:"],
                          },
                          " Un código de un solo uso acredita la titularidad de la dirección, no la identidad ni la unicidad. ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["Número de teléfono:"],
                          },
                          " Se verifica mediante un código de un solo uso enviado por SMS ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "a",
                            children: ["Rarimo"],
                            href: "https://rarimo.com/privacy-notice.html",
                            external: true,
                          },
                          ": Verificación mediante una prueba de conocimiento cero (ZKP) basada en el pasaporte ",
                        ],
                      },
                    ],
                  },
                  " Las conversaciones pueden exigir un método específico. La verificación mediante pasaporte revela información sobre el cumplimiento de los requisitos, no la imagen o el número de su pasaporte, su nombre ni su fotografía. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["Conversión de cuentas:"],
              },
              " La actividad de invitado puede fusionarse con una cuenta registrada, cuyas elecciones existentes tienen prioridad. La fusión es irreversible y no permite combinar dos cuentas registradas. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Su nombre de usuario, elegido o generado, puede aparecer con el contenido publicado; no tiene por qué ser su nombre real. ",
            ],
          },
          {
            tag: "h3",
            children: ["¿Quién puede ver su información?"],
          },
          {
            tag: "p",
            children: [
              " El acceso depende de la actividad y de los permisos: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "El contenido publicado, los resultados, los nombres de usuario y los contactos de proyectos u organizaciones pueden ser públicos, copiarse o indexarse.",
                ],
              },
              {
                tag: "li",
                children: [
                  "Los datos de autenticación, las claves privadas y los ajustes de cuenta no se publican.",
                ],
              },
              {
                tag: "li",
                children: [
                  " La participación permanece vinculada a la cuenta hasta su desvinculación. Los participantes pueden consultar sus propias asignaciones QV; conservar los datos de entrada QV no publica las papeletas individuales ni permite exportarlas. ",
                ],
              },
              {
                tag: "li",
                children: [
                  "Las respuestas individuales y los resultados completos de encuestas, incluidos los agregados sin ocultaciones, requieren permisos de propietario. Los agregados públicos pueden ocultar grupos pequeños.",
                ],
              },
              {
                tag: "li",
                children: [
                  "Cuando estén habilitadas, cualquier persona con acceso a la conversación, incluidos los invitados con cuenta basada en el dispositivo, puede obtener exportaciones estándar con proposiciones, identificadores de autor reasignados, marcas de tiempo, totales de votos y agregados de encuestas permitidos.",
                ],
              },
              {
                tag: "li",
                children: [
                  "Las exportaciones de votos individuales, cuando se ofrecen, incluyen elecciones, identificadores de participantes, referencias a proposiciones y marcas de tiempo. Las comunicaciones adicionales de participación y sus destinatarios se explican antes de aplicarse, con consentimiento cuando sea necesario.",
                ],
              },
              {
                tag: "li",
                children: [
                  " Las denuncias, los motivos de moderación y las identidades pertinentes están disponibles para el personal o los organizadores autorizados. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Los identificadores compartidos entre exportaciones pueden vincular proposiciones, votos y respuestas a encuestas. El texto, las marcas de tiempo, los patrones de votación o los grupos pequeños pueden identificar a los participantes pese a reasignar los identificadores. Las exportaciones estándar de encuestas omiten los correos de autenticación, pero las respuestas de texto libre pueden contener datos de contacto. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Estas reglas se aplican a cualquier formato de exportación. Los destinatarios pueden conservar, combinar o volver a publicar archivos conforme a la ley; la sección 3.6 explica las copias independientes. ",
            ],
          },
          {
            tag: "h3",
            children: ["Migración prevista a AT Protocol"],
          },
          {
            tag: "p",
            children: [
              " Una posible migración a AT Protocol podría compartir contenido público, votos individuales e identificadores con servicios independientes fuera del control de Agora, incluso fuera del EEE. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Las modalidades para conversaciones restringidas aún no se han decidido. Los controles de acceso no son cifrado de extremo a extremo y no impiden que los lectores autorizados copien datos. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Antes de la migración, explicaremos los cambios y las opciones, actualizaremos este aviso y obtendremos el consentimiento necesario. Esto no autoriza a publicar la participación restringida existente. ",
            ],
          },
          {
            tag: "h3",
            children: ["Servicios de terceros"],
          },
          {
            tag: "p",
            children: [
              " Los proveedores tratan la información necesaria para sus servicios, incluidas las direcciones de red. Sus avisos explican ese tratamiento: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Rarimo"],
                    href: "https://rarimo.com/privacy-notice.html",
                    external: true,
                  },
                  " (de alcance mundial) para pruebas de identidad de conocimiento cero. Puede tratar direcciones IP por motivos de seguridad y funcionamiento del servicio. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                  " recibe su número completo para la verificación por SMS y la prevención de abusos. Agora almacena un hash protegido e información parcial del número y del país. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Cloudflare"],
                    href: "https://www.cloudflare.com/privacypolicy/",
                    external: true,
                  },
                  " trata señales de red y navegador para detectar abusos y mejorar el servicio. Los servicios de proxy y seguridad habilitados también gestionan tráfico y contenido. Véase el ",
                  {
                    tag: "a",
                    children: ["Anexo de privacidad de Turnstile"],
                    href: "https://www.cloudflare.com/turnstile-privacy-policy/",
                    external: true,
                  },
                  ". ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Amazon Web Services"],
                    href: "https://aws.amazon.com/privacy/",
                    external: true,
                  },
                  " proporciona alojamiento, almacenamiento, correo y diagnósticos, generalmente en Irlanda, y tratamiento mediante Bedrock/Mistral AI en Estados Unidos. El correo requiere las direcciones de los destinatarios y los mensajes; la IA utiliza el texto y el contexto pertinentes. El registro completo de entradas y salidas de Bedrock está deshabilitado. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Google Cloud Platform"],
                    href: "https://cloud.google.com/terms/cloud-privacy-notice",
                    external: true,
                  },
                  " trata texto en Estados Unidos para la traducción opcional y como alternativa para detectar el idioma. La detección automática no puede desactivarse, ni siquiera cuando la traducción está desactivada. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Plausible Analytics"],
                    href: "https://plausible.io/data-policy",
                    external: true,
                  },
                  " proporciona analítica sin cookies a partir de información de páginas y datos técnicos, no de credenciales ni borradores. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Sentry"],
                    href: "https://sentry.io/privacy/",
                    external: true,
                  },
                  " recibe diagnósticos y reproducciones de interacciones enmascaradas, activadas por errores, mediante nuestra configuración en la UE, con información del navegador, páginas, rutas, interacciones y red. El enmascaramiento no garantiza el anonimato. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Nuestro Reacher autoalojado comprueba la validez de su correo utilizando la dirección completa y puede contactar con servidores de correo o proveedores de validación. Las solicitudes de IA y traducción omiten los identificadores de cuenta y contacto que acompañan al texto, pero no eliminan la información identificativa contenida en él. ",
            ],
          },
          {
            tag: "h3",
            children: ["Cookies y analítica"],
          },
          {
            tag: "p",
            children: [
              " No utilizamos cookies publicitarias ni de seguimiento entre sitios, ni vendemos datos con fines publicitarios. ",
            ],
          },
          {
            tag: "p",
            children: [
              " El almacenamiento del navegador conserva claves, información de sesión, preferencias y borradores hasta que se borren. Guardar localmente no sube por sí mismo los borradores; enviarlos, importarlos o solicitar su tratamiento mediante IA transmite los datos pertinentes. La eliminación del servidor no puede borrar todas las copias locales de los dispositivos. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["1. ¿Cuándo se aplica esta política de privacidad?"],
          },
          {
            tag: "p",
            children: [
              " Este aviso se aplica cuando utiliza nuestro sitio web o nuestras aplicaciones, o se pone en contacto con nosotros. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. ¿Qué datos personales tratamos y por qué?"],
          },
          {
            tag: "p",
            children: [
              " Recibimos datos de usted, de su dispositivo y de organizadores o importaciones. La tabla enumera las finalidades y bases jurídicas; la sección 6 explica sus derechos. ",
            ],
          },
          {
            tag: "table",
            children: [
              {
                tag: "thead",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "th",
                        children: ["¿Qué datos personales?"],
                      },
                      {
                        tag: "th",
                        children: ["¿Por qué?"],
                      },
                      {
                        tag: "th",
                        children: ["¿Base jurídica?"],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "tbody",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Identificadores de dispositivo y sesiones",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Identificadores de clave pública, información del navegador y dispositivo y estado de sesión para autenticación, recuperación y prevención de abusos. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Interés legítimo"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Registros de entradas de eventos retirados",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Identificadores históricos de verificación, fechas y metadatos; ya no se utilizan para el acceso ni para determinar el cumplimiento de requisitos. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Interés legítimo"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Datos de autenticación: número de teléfono",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Verificación del número, hash protegido, información parcial del número y del país y registros contra el abuso para la autenticación. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Interés legítimo"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Datos de autenticación: prueba de conocimiento cero basada en el pasaporte (Rarimo)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Identificador de unicidad derivado del pasaporte, nacionalidad, sexo y prueba de umbral de edad para comprobar requisitos y titularidad, sin la fecha de nacimiento completa. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Interés legítimo"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Información de la cuenta"],
                          },
                          " (Nombre de usuario, idiomas, preferencias, estado y permisos) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Para gestionar su cuenta, preferencias, permisos y notificaciones. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Su consentimiento"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Acciones que realiza"],
                          },
                          " (Conversaciones, proposiciones, votos de acuerdo, desacuerdo o abstención, elecciones y respuestas de texto libre en encuestas, comparaciones de mejor/peor opción y pairwise, y asignaciones de créditos para votación cuadrática) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Contenido, elecciones y marcas de tiempo para la participación y los resultados. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Su consentimiento"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Dirección IP"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Para proteger el servicio y prevenir ataques. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Interés legítimo"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Datos técnicos seudónimos"],
                          },
                          " (Identificadores, errores, recuentos, tiempos y contexto técnico) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Para la fiabilidad y la seguridad. Los registros de infraestructura y proveedores también pueden contener contexto de red, solicitudes o bases de datos. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Interés legítimo"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Comunicación"],
                          },
                          " (Datos de contacto, mensajes, denuncias y fechas) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Para comunicarnos con usted y gestionar solicitudes o denuncias. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Interés legítimo en comunicarnos con usted. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Los datos personales mencionados anteriormente.",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Para cumplir obligaciones legales y solicitudes lícitas de las autoridades. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Nuestra obligación legal."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Los datos personales mencionados anteriormente.",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Para prevenir el fraude, los mensajes no deseados y la actividad no autorizada. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Nuestra obligación legal."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Los datos personales mencionados anteriormente.",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Para defendernos en procedimientos judiciales.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Interés legítimo en defendernos frente a reclamaciones legales. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Los datos personales mencionados anteriormente.",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Para una fusión, adquisición o escisión, incluso con partes de fuera de la UE. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Interés legítimo en operaciones empresariales. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Datos de conversión o fusión de cuentas",
                            ],
                          },
                          " (Contenido del usuario, dispositivos y preferencias) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Para transferir la actividad de invitado a una cuenta registrada. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Su consentimiento y nuestro interés legítimo.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Autenticación por correo electrónico"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Dirección, asociación con la cuenta o dispositivo, códigos y estado de verificación y registros contra el abuso para iniciar sesión y recuperar la cuenta.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Interés legítimo en la autenticación de cuentas y la prevención de abusos.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Información derivada de análisis y clasificación",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Grupos de opinión, preferencias y resultados a partir de datos numéricos individuales: matrices de votos Polis, elecciones BWS/pairwise y asignaciones de créditos QV.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Consentimiento para la participación y el análisis, con una condición adicional para datos sensibles cuando sea necesaria. La conservación tras retirar el consentimiento requiere un fundamento jurídico independiente.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Proyectos, organizaciones, documentos e importaciones",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Permisos, contactos, archivos y contenido para la administración. Las importaciones pueden incluir proposiciones, votos, identificadores de participantes y marcas de tiempo de personas no usuarias.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Servicios solicitados e intereses legítimos en proyectos e importaciones autorizados, respetando los derechos de las personas afectadas y las condiciones jurídicas adicionales exigibles.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Detección automática de idioma, asistencia opcional mediante IA y traducción dinámica",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Texto, borradores no publicados, proposiciones o resúmenes y metadatos de tratamiento para detectar el idioma, realizar traducciones solicitadas y generar sugerencias o descripciones mediante IA.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "La base jurídica del contenido subyacente; consentimiento específico cuando sea necesario para el tratamiento opcional.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Actualizaciones por correo electrónico de conversaciones, cuando estén habilitadas",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Direcciones, preferencias, idioma, historial de entrega, enlaces de acción y bajas o quejas para las actualizaciones elegidas y la gestión de entregas.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Consentimiento cuando sea necesario; acciones solicitadas sobre preferencias; intereses legítimos en una entrega fiable y sin abusos.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Registros de eliminación, recuperación y expedientes restringidos",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Solicitudes, comprobaciones de titularidad, plazos y pruebas limitadas de expedientes y limpieza para la recuperación, la supresión y la prevención de restauraciones de datos suprimidos.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Su solicitud, obligaciones legales e intereses justificados de seguridad o defensa de reclamaciones legales.",
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "El contenido y los patrones de votación pueden revelar opiniones políticas u otra información sensible y requieren una condición jurídica aplicable, incluido el consentimiento explícito cuando sea necesario. Evite información personal innecesaria sobre usted u otras personas.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["3. ¿Con quién compartimos sus datos personales?"],
          },
          {
            tag: "p",
            children: [
              " 3.1. Según la función y los permisos, los destinatarios incluyen: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "Usted, para el acceso a la cuenta y las solicitudes de ejercicio de derechos;",
                ],
              },
              {
                tag: "li",
                children: [
                  "Los visitantes, para la información pública y las exportaciones permitidas descritas anteriormente;",
                ],
              },
              {
                tag: "li",
                children: [
                  "Los organizadores y el personal autorizados, para la administración, respuestas restringidas, exportaciones y moderación. Los organizadores son responsables del uso y la recopilación posteriores que realicen;",
                ],
              },
              {
                tag: "li",
                children: [
                  "Nuestro personal y proveedores, con las restricciones de acceso y los acuerdos de encargo del tratamiento adecuados; y",
                ],
              },
              {
                tag: "li",
                children: [
                  " Las autoridades cuando la comunicación sea legalmente obligatoria. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. El tratamiento fuera del EEE incluye servicios de IA y traducción en Estados Unidos y servicios mundiales de verificación y seguridad. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. Cuando sea necesario, las transferencias se basan en decisiones de adecuación o marcos aprobados aplicables, o en cláusulas contractuales tipo con las medidas de seguridad pertinentes. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. Contacte con legal@zkorum.com para obtener detalles sobre destinatarios y ubicaciones e información sobre las garantías de transferencia aplicables, incluidas las contractuales. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. Podemos conservar o compartir agregados anónimos. Eliminar los vínculos con la cuenta no garantiza por sí solo el anonimato: el texto identificativo, los patrones y los resultados de grupos pequeños siguen siendo datos personales. ",
            ],
          },
          {
            tag: "p",
            children: [
              "3.6. Damos las instrucciones de supresión, rectificación o limitación y las notificaciones a destinatarios exigidas, pero no podemos borrar a distancia descargas, publicaciones o copias de buscadores independientes. Los proveedores pueden conservar registros para sus propias finalidades lícitas. Responder a un organizador comparte su dirección de correo y su mensaje.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: [
              "4. ¿Durante cuánto tiempo conservamos sus datos personales?",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.1. Conservamos los datos de cuenta mientras sean necesarios para las finalidades de la sección 2. Retirar el consentimiento pone fin al tratamiento basado en él, salvo que se aplique un fundamento jurídico independiente. La sección 6.7 explica la eliminación y recuperación de cuentas. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. La eliminación aceptada de la cuenta deshabilita el acceso y excluye la participación de nuevos cálculos en vivo. Oculta el texto de las proposiciones personales, sus traducciones y su atribución, incluso en vistas históricas. Los resultados abiertos se actualizan de forma asíncrona. Los datos de recuperación permanecen privados durante 15 días; después pueden someterse a limpieza permanente. ",
            ],
          },
          {
            tag: "p",
            children: [
              "Conservamos indefinidamente los datos numéricos de entrada de los resultados guardados para analizar las votaciones y recalcular los resultados, eliminando los vínculos con la cuenta durante la limpieza permanente.",
            ],
          },
          {
            tag: "p",
            children: [
              "La limpieza se realiza sin dilación indebida, pero no tiene por qué finalizar al vencer el plazo de recuperación. Los retrasos no amplían dicho plazo ni los plazos legales.",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. Los datos de entrada conservados son los utilizados en resultados guardados, no todas las papeletas ni todos los cálculos. La eliminación ordinaria no recalcula las cifras guardadas; las correcciones o los nuevos análisis independientes pueden modificarlas. Las descripciones históricas de IA no se reescriben automáticamente; los fragmentos identificativos siguen sujetos al derecho de supresión. Cuando procede la supresión, se elimina u oculta la información afectada en el resultado y sus traducciones sin generar un sustituto. La reapertura excluye la participación eliminada o desvinculada permanentemente. Eliminar una conversación o un proyecto elimina sus resultados y datos de entrada de propiedad exclusiva. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. Los archivos permanecen mientras los necesite su proyecto u otro uso compartido válido. Las exportaciones existentes pueden contener contenido eliminado posteriormente; las descargas caducan como máximo 30 días después de su generación, sin prórroga. La eliminación ordinaria no las reescribe; las nuevas exportaciones utilizan el estado de eliminación actual. Los archivos caducados se limpian con prontitud. Las solicitudes específicas de supresión se rigen por la sección 6. ",
            ],
          },
          {
            tag: "p",
            children: [
              "4.5. Los códigos de verificación y los tokens de acción o recuperación caducan y se limpian. Los registros necesarios contra el abuso y de retirada de credenciales se conservan para su finalidad protectora.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.6. Las preferencias de correo, bajas y registros de entrega se conservan para respetar sus elecciones y resolver fallos. Eliminar la cuenta invalida sus enlaces y elimina los datos innecesarios del destinatario. Los datos brutos de eventos de entrega se borran tras su tratamiento o la resolución del fallo.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.7. Nuestros registros de aplicaciones y bases de datos en CloudWatch tienen una conservación móvil de 180 días; la conservación de los proveedores varía. Eliminar la cuenta no borra todos los registros. Las pruebas restringidas de soporte, moderación, seguridad o asuntos jurídicos pueden conservarse más tiempo para su finalidad específica, no como archivo de toda la cuenta.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.8. Los datos suprimidos pueden permanecer en copias de seguridad restringidas un máximo de 30 días después de su eliminación de los sistemas en producción, sin estar disponibles para el uso ordinario. Las copias o restauraciones no reinician ese plazo; las instrucciones de eliminación se reaplican antes de exponer los datos restaurados.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. ¿Cómo protegemos sus datos personales?"],
          },
          {
            tag: "p",
            children: [
              " Utilizamos controles de acceso proporcionados, cifrado, copias de seguridad restringidas, minimización de datos y supervisión de seguridad. La autenticación utiliza códigos de verificación y claves criptográficas, no contraseñas de cuenta almacenadas. Ningún servicio puede garantizar una seguridad absoluta. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. Sus derechos en relación con sus datos personales"],
          },
          {
            tag: "p",
            children: [
              " 6.1. Utilice los controles de cuenta o contacte con legal@zkorum.com, también para datos importados sobre personas no usuarias. Verificamos la identidad o titularidad de forma proporcionada, no necesariamente mediante documentos de identidad. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2. Según el tratamiento y la base jurídica, tiene los siguientes derechos: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["derecho de acceso a sus datos"],
              },
              {
                tag: "li",
                children: ["derecho de rectificación de sus datos"],
              },
              {
                tag: "li",
                children: [
                  "derecho de oposición al tratamiento de sus datos personales",
                ],
              },
              {
                tag: "li",
                children: ["derecho a la limitación del tratamiento de datos"],
              },
              {
                tag: "li",
                children: ["derecho de supresión de sus datos"],
              },
              {
                tag: "li",
                children: [
                  "derecho a retirar el consentimiento prestado anteriormente",
                ],
              },
              {
                tag: "li",
                children: ["derecho a la portabilidad de sus datos"],
              },
              {
                tag: "li",
                children: [
                  " derecho a presentar reclamaciones ante la autoridad competente de protección de datos. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. Explicamos cualquier limitación de estos derechos permitida o exigida por la ley. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. Las solicitudes de ejercicio de derechos son gratuitas. Respondemos sin dilación indebida, normalmente en un mes. La complejidad o el número de solicitudes puede requerir hasta dos meses adicionales; explicamos cualquier prórroga durante el primer mes. Ante solicitudes manifiestamente infundadas o excesivas, debemos justificar cualquier negativa lícita o canon razonable. Los plazos de respuesta no justifican retrasar una supresión exigible. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5. Dentro de sus permisos, los controles permiten gestionar contenido y preferencias y retirar o modificar la participación admitida, según las reglas de apertura o cierre. Eliminar la cuenta también suprime el texto de sus proposiciones personales; no es necesario eliminarlas por separado. La eliminación independiente de contenido no tiene plazo de recuperación. ",
            ],
          },
          {
            tag: "p",
            children: [
              "Las retiradas no reescriben los resultados guardados. Tras la desvinculación permanente, los controles de cuenta no pueden recuperar, modificar ni retirar los registros numéricos desvinculados, y una nueva cuenta tampoco puede reclamarlos.",
            ],
          },
          {
            tag: "p",
            children: [
              "La eliminación de un proyecto abarca sus conversaciones, documentos y resultados y datos de entrada de propiedad exclusiva. Eliminar una organización exige transferir o eliminar por separado sus proyectos de propiedad exclusiva; los proyectos compartidos subsisten con sus otros propietarios. La eliminación no es un archivado reversible.",
            ],
          },
          {
            tag: "h3",
            children: ["6.6. Registros de seguridad:"],
          },
          {
            tag: "p",
            children: [
              " Pueden conservarse registros limitados contra el abuso, de credenciales bloqueadas y bajas, y pruebas de supresión, seguridad o asuntos jurídicos para sus finalidades específicas; no pruebas completas de autenticación, secretos de verificación ni una copia general de su cuenta eliminada. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. Cómo eliminar su cuenta:"],
          },
          {
            tag: "p",
            children: [
              " Solicite la eliminación mediante los controles de cuenta. Si sus responsabilidades en una organización lo impiden, contacte con nosotros. Una solicitud de eliminación aceptada inicia el plazo de recuperación de 15 días; una solicitud rechazada no lo inicia. La sección 4 explica qué se oculta, suprime o conserva. ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Al aceptarse:"],
                  },
                  " Se revocan las sesiones y se detienen los nuevos envíos de correo y trabajos privados vinculados a la cuenta; las operaciones ya enviadas pueden completarse. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Durante los 15 días siguientes:"],
                  },
                  " La recuperación exige verificar la titularidad y cancelar explícitamente la eliminación antes del vencimiento, mediante una credencial admitida o las claves originales del dispositivo de invitado. Los datos exclusivos de recuperación se excluyen del acceso ordinario, las vistas históricas y las nuevas exportaciones; las exportaciones existentes se rigen por la sección 4.4. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Al cumplirse el plazo de 15 días:"],
                  },
                  " Finaliza la recuperación. La limpieza elimina los datos privados de cuenta y recuperación, el texto original de las proposiciones personales y sus traducciones, y las asociaciones innecesarias. Las proposiciones muestran un aviso de eliminación sin atribuirle la autoría. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "La recuperación restablece los datos permitidos ocultos únicamente por la eliminación de la cuenta, no las sesiones revocadas, eliminaciones independientes, retiradas, fusiones de invitados ni decisiones de moderación.",
            ],
          },
          {
            tag: "p",
            children: [
              "Las organizaciones y proyectos compartidos y las contribuciones de otras personas subsisten tras eliminar la cuenta. Las proposiciones iniciales propiedad del proyecto subsisten sin su atribución pública. Su eliminación requiere una autorización separada.",
            ],
          },
          {
            tag: "p",
            children: [
              " Las solicitudes legales de supresión no exigen esperar al vencimiento de la recuperación de la cuenta. Eliminar la cuenta no supone renunciar a los derechos legales de protección de datos. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. Presente una reclamación en ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              " o directamente ante una autoridad competente de protección de datos, incluida la CNIL francesa (",
              {
                tag: "a",
                children: ["www.cnil.fr"],
                href: "http://www.cnil.fr/",
                external: true,
              },
              "). ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: [
              "7. Información importante para residentes de California",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.1. Conforme a la Ley de Privacidad del Consumidor de California (CCPA), las categorías recopiladas, utilizadas y compartidas en los últimos 12 meses son las descritas anteriormente, para las finalidades indicadas. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. No hemos vendido información personal a cambio de dinero ni de otra contraprestación de valor. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. Puede solicitar acceso, supresión e información sobre nuestras prácticas mediante la sección 6. Verificamos las solicitudes y podemos exigir pruebas de la autorización de un representante para actuar en su nombre. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. Ejercer sus derechos no afectará a los precios ni a la calidad del servicio, salvo cuando la ley lo permita. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["8. Cambios en esta política de privacidad"],
          },
          {
            tag: "p",
            children: [
              " Le notificamos los cambios sustanciales de privacidad por correo electrónico o en Agora. El aviso más reciente y su fecha de actualización están disponibles en nuestro sitio web. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. ¿Tiene alguna pregunta?"],
          },
          {
            tag: "p",
            children: [
              " Contacte con nuestro responsable de privacidad: ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". ",
            ],
          },
        ],
      },
    ],
  },
  fa: {
    title: "سیاست حریم خصوصی",
    automatedTranslationNotice: {
      title: "ترجمهٔ خودکار",
      statement:
        "این سیاست حریم خصوصی به‌صورت خودکار ترجمه شده است. نسخهٔ انگلیسی تنها نسخهٔ معتبر است و در صورت هرگونه مغایرت، منحصراً همان نسخه ملاک خواهد بود.",
      viewEnglish: "مشاهدهٔ نسخهٔ انگلیسی معتبر",
      returnToTranslation: "بازگشت به نسخهٔ ترجمه‌شده",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["آخرین به‌روزرسانی"],
          },
          ": 2026/10/14 (YYYY/MM/DD)",
        ],
      },
      {
        tag: "p",
        children: [
          " Agora Citizen Network توسط شرکت ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          " توسعه می‌یابد. ",
        ],
      },
      {
        tag: "p",
        children: [
          " ZKorum SAS («Agora» یا «ما») مسئول داده‌های شخصی شرح‌داده‌شده در این اطلاعیه است. ",
        ],
      },
      {
        tag: "p",
        children: [
          " تماس: ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". ساکنان کالیفرنیا: بخش 7 را ببینید. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["نمایانی محتوا و سوابق مشارکت"],
          },
          {
            tag: "p",
            children: [
              " محتوا و نتایج منتشرشده عموماً عمومی‌اند، مگر آنکه محدودیت دسترسی داشته باشند. گفت‌وگوهای فهرست‌نشده ممکن است با پیوند همچنان در دسترس باشند؛ حذف از جست‌وجو آن‌ها را محرمانه نمی‌کند. ",
            ],
          },
          {
            tag: "p",
            children: [" بدون حساب می‌توانید مرور کنید. برای مشارکت: "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["مهمانان:"],
                  },
                  " در صورت مجاز بودن، با حساب مبتنی بر دستگاه مشارکت کنید. از دست رفتن کلیدهای ذخیره‌شدهٔ آن ممکن است مانع دسترسی یا بازیابی شود. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["حساب‌های ثبت‌شده:"],
                  },
                  " روش‌های تأیید موجود عبارت‌اند از: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["نشانی ایمیل:"],
                          },
                          " کد یک‌بارمصرف مالکیت نشانی را اثبات می‌کند، نه هویت یا یکتایی شخص را. ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["شمارهٔ تلفن:"],
                          },
                          " با کد یک‌بارمصرف ارسالی از طریق پیامک تأیید می‌شود ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "a",
                            children: ["Rarimo"],
                            href: "https://rarimo.com/privacy-notice.html",
                            external: true,
                          },
                          ": تأیید مبتنی بر گذرنامه با اثبات دانش صفر (ZKP) ",
                        ],
                      },
                    ],
                  },
                  " گفت‌وگوها ممکن است روش خاصی را الزامی کنند. تأیید گذرنامه اطلاعات واجد شرایط بودن را آشکار می‌کند، نه تصویر یا شمارهٔ گذرنامه، نام یا عکس شما را. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["ارتقای حساب:"],
              },
              " فعالیت مهمان را می‌توان در حساب ثبت‌شده ادغام کرد؛ انتخاب‌های موجود آن حساب اولویت دارند. ادغام برگشت‌ناپذیر است و نمی‌تواند دو حساب ثبت‌شده را ترکیب کند. ",
            ],
          },
          {
            tag: "p",
            children: [
              " نام کاربری انتخابی یا تولیدشدهٔ شما ممکن است همراه محتوای منتشرشده نمایش داده شود؛ لازم نیست نام واقعی شما باشد. ",
            ],
          },
          {
            tag: "h3",
            children: ["چه کسانی می‌توانند اطلاعات شما را ببینند؟"],
          },
          {
            tag: "p",
            children: [" دسترسی به فعالیت و مجوزها بستگی دارد: "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "محتوا و نتایج منتشرشده، نام‌های کاربری و اطلاعات تماس پروژه‌ها/سازمان‌ها ممکن است عمومی باشند، کپی شوند یا نمایه‌سازی شوند.",
                ],
              },
              {
                tag: "li",
                children: [
                  "جزئیات احراز هویت، کلیدهای خصوصی و تنظیمات حساب منتشر نمی‌شوند.",
                ],
              },
              {
                tag: "li",
                children: [
                  " مشارکت تا زمان قطع پیوند به حساب مرتبط است. مشارکت‌کنندگان می‌توانند تخصیص‌های QV خود را بازیابی کنند؛ نگهداری ورودی‌های QV به معنای انتشار برگه‌های رأی فردی یا امکان خروجی‌گیری از آن‌ها نیست. ",
                ],
              },
              {
                tag: "li",
                children: [
                  "پاسخ‌های فردی نظرسنجی و نتایج کامل، از جمله نتایج تجمیعی پنهان‌نشده، به مجوز سطح مالک نیاز دارند. در نتایج تجمیعی عمومی ممکن است گروه‌های کوچک پنهان شوند.",
                ],
              },
              {
                tag: "li",
                children: [
                  "در صورت فعال بودن، هر فرد دارای دسترسی به گفت‌وگو، از جمله مهمانان مبتنی بر دستگاه، می‌تواند خروجی‌های استاندارد شامل گزاره‌ها، شناسه‌های بازنگاشت‌شدهٔ نویسندگان، مهرهای زمانی، مجموع رأی‌ها و نتایج تجمیعی مجاز نظرسنجی را دریافت کند.",
                ],
              },
              {
                tag: "li",
                children: [
                  "خروجی‌های رأی فردی، در صورت ارائه، شامل انتخاب‌ها، شناسه‌های مشارکت‌کنندگان، ارجاع به گزاره‌ها و مهرهای زمانی‌اند. افشاهای اضافی مشارکت و مخاطبان آن‌ها پیش از اعمال توضیح داده می‌شوند و در صورت لزوم رضایت گرفته می‌شود.",
                ],
              },
              {
                tag: "li",
                children: [
                  " گزارش‌ها، دلایل نظارت بر محتوا و هویت‌های مرتبط در اختیار کارکنان یا برگزارکنندگان مجاز قرار می‌گیرند. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " شناسه‌های مشترک خروجی می‌توانند گزاره‌ها، رأی‌ها و پاسخ‌های نظرسنجی را به هم مرتبط کنند. با وجود بازنگاشت شناسه‌ها، متن، مهرهای زمانی، الگوهای رأی‌دهی یا گروه‌های کوچک ممکن است هویت مشارکت‌کنندگان را مشخص کنند. خروجی‌های استاندارد نظرسنجی ایمیل‌های احراز هویت را ندارند، اما پاسخ‌های متنی آزاد ممکن است شامل اطلاعات تماس باشند. ",
            ],
          },
          {
            tag: "p",
            children: [
              " این قواعد مستقل از قالب خروجی اعمال می‌شوند. دریافت‌کنندگان می‌توانند با رعایت قانون فایل‌ها را نگه دارند، ترکیب یا بازنشر کنند؛ بخش 3.6 نسخه‌های مستقل را توضیح می‌دهد. ",
            ],
          },
          {
            tag: "h3",
            children: ["مهاجرت برنامه‌ریزی‌شده به AT Protocol"],
          },
          {
            tag: "p",
            children: [
              " مهاجرت احتمالی به AT Protocol ممکن است محتوای عمومی، رأی‌های فردی و شناسه‌ها را با خدمات مستقل خارج از کنترل Agora، از جمله خارج از منطقهٔ اقتصادی اروپا (EEA)، به اشتراک بگذارد. ",
            ],
          },
          {
            tag: "p",
            children: [
              " ترتیبات گفت‌وگوهای محدودشده هنوز تعیین نشده است. کنترل دسترسی رمزگذاری سرتاسری نیست و نمی‌تواند مانع کپی داده‌ها توسط خوانندگان مجاز شود. ",
            ],
          },
          {
            tag: "p",
            children: [
              " پیش از مهاجرت، تغییرات و انتخاب‌ها را توضیح می‌دهیم، این اطلاعیه را به‌روز می‌کنیم و رضایت لازم را می‌گیریم. این امر مجوز انتشار مشارکت محدودشدهٔ موجود نیست. ",
            ],
          },
          {
            tag: "h3",
            children: ["خدمات اشخاص ثالث"],
          },
          {
            tag: "p",
            children: [
              " ارائه‌دهندگان اطلاعات لازم برای خدمات خود، از جمله نشانی‌های شبکه را پردازش می‌کنند. اطلاعیه‌های آن‌ها شیوهٔ پردازششان را توضیح می‌دهد: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Rarimo"],
                    href: "https://rarimo.com/privacy-notice.html",
                    external: true,
                  },
                  " (جهانی) برای اثبات هویت با دانش صفر. ممکن است نشانی‌های IP را برای امنیت و عملیات خدمات پردازش کند. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                  " شمارهٔ کامل شما را برای تأیید پیامکی و پیشگیری از سوءاستفاده دریافت می‌کند. Agora هش محافظت‌شده و بخشی از اطلاعات شماره/کشور را ذخیره می‌کند. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Cloudflare"],
                    href: "https://www.cloudflare.com/privacypolicy/",
                    external: true,
                  },
                  " سیگنال‌های شبکه/مرورگر را برای تشخیص سوءاستفاده و بهبود خدمات پردازش می‌کند. خدمات پراکسی/امنیتی فعال، ترافیک و محتوا را نیز پردازش می‌کنند. این سند را ببینید: ",
                  {
                    tag: "a",
                    children: ["الحاقیهٔ حریم خصوصی Turnstile"],
                    href: "https://www.cloudflare.com/turnstile-privacy-policy/",
                    external: true,
                  },
                  ". ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Amazon Web Services"],
                    href: "https://aws.amazon.com/privacy/",
                    external: true,
                  },
                  " میزبانی، ذخیره‌سازی، ایمیل و عیب‌یابی را عموماً در ایرلند، و پردازش هوش مصنوعی Bedrock/Mistral را در ایالات متحده ارائه می‌کند. ایمیل به نشانی گیرندگان و پیام‌ها نیاز دارد؛ هوش مصنوعی از متن و زمینهٔ مرتبط استفاده می‌کند. ثبت کامل ورودی/خروجی Bedrock غیرفعال است. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Google Cloud Platform"],
                    href: "https://cloud.google.com/terms/cloud-privacy-notice",
                    external: true,
                  },
                  " متن را برای ترجمهٔ اختیاری و تشخیص جایگزین زبان در ایالات متحده پردازش می‌کند. تشخیص خودکار را نمی‌توان غیرفعال کرد، حتی وقتی ترجمه خاموش است. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Plausible Analytics"],
                    href: "https://plausible.io/data-policy",
                    external: true,
                  },
                  " تحلیل بدون کوکی را با اطلاعات صفحه و اطلاعات فنی ارائه می‌کند، نه با اعتبارنامه‌ها یا پیش‌نویس‌ها. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Sentry"],
                    href: "https://sentry.io/privacy/",
                    external: true,
                  },
                  " از طریق پیکربندی ما در اتحادیهٔ اروپا، داده‌های عیب‌یابی و بازپخش تعاملات با اطلاعات پوشانده‌شده را که بر اثر خطا فعال می‌شوند، از جمله اطلاعات مرورگر، صفحه، مسیر، تعامل و شبکه دریافت می‌کند. پوشاندن اطلاعات، ناشناس بودن را تضمین نمی‌کند. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Reacher با میزبانی خودمان، اعتبار ایمیل را با نشانی کامل شما بررسی می‌کند و ممکن است با سرورهای ایمیل یا ارائه‌دهندگان اعتبارسنجی تماس بگیرد. درخواست‌های هوش مصنوعی/ترجمه، شناسه‌های همراهِ حساب و تماس را ندارند، اما اطلاعات هویتی داخل متن را حذف نمی‌کنند. ",
            ],
          },
          {
            tag: "h3",
            children: ["کوکی‌ها و تحلیل"],
          },
          {
            tag: "p",
            children: [
              " از کوکی‌های تبلیغاتی یا ردیابی میان‌وب‌سایتی استفاده نمی‌کنیم و داده‌ها را برای تبلیغات نمی‌فروشیم. ",
            ],
          },
          {
            tag: "p",
            children: [
              " فضای ذخیره‌سازی مرورگر، کلیدها، اطلاعات نشست، ترجیحات و پیش‌نویس‌ها را تا زمان پاک شدن نگه می‌دارد. ذخیرهٔ محلی به‌خودی‌خود پیش‌نویس‌ها را بارگذاری نمی‌کند؛ ارسال، ورود داده یا پردازش درخواستی هوش مصنوعی، ورودی مرتبط را می‌فرستد. حذف در سرور نمی‌تواند همهٔ نسخه‌های محلی دستگاه‌ها را پاک کند. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["1. این سیاست حریم خصوصی چه زمانی اعمال می‌شود؟"],
          },
          {
            tag: "p",
            children: [
              " این اطلاعیه هنگام استفاده از وب‌سایت یا برنامه‌های ما یا تماس با ما اعمال می‌شود. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. چه داده‌های شخصی را پردازش می‌کنیم و چرا؟"],
          },
          {
            tag: "p",
            children: [
              " داده‌ها را از شما، دستگاهتان و برگزارکنندگان/داده‌های واردشده دریافت می‌کنیم. جدول، اهداف و مبانی قانونی را فهرست می‌کند؛ بخش 6 حقوق شما را توضیح می‌دهد. ",
            ],
          },
          {
            tag: "table",
            children: [
              {
                tag: "thead",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "th",
                        children: ["چه داده‌های شخصی؟"],
                      },
                      {
                        tag: "th",
                        children: ["چرا؟"],
                      },
                      {
                        tag: "th",
                        children: ["مبنای قانونی؟"],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "tbody",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["شناسه‌های دستگاه و نشست‌ها"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " شناسه‌های کلید عمومی، اطلاعات مرورگر/دستگاه و وضعیت نشست برای احراز هویت، بازیابی و پیشگیری از سوءاستفاده. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["منفعت مشروع"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["سوابق بلیت رویدادِ کنارگذاشته‌شده"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " شناسه‌های تأیید، تاریخ‌ها و فراداده‌های تاریخی؛ دیگر برای دسترسی یا احراز شرایط استفاده نمی‌شوند. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["منفعت مشروع"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["داده‌های احراز هویت ـ شمارهٔ تلفن"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " تأیید شماره، هش محافظت‌شده، بخشی از اطلاعات شماره/کشور و سوابق مقابله با سوءاستفاده برای احراز هویت. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["منفعت مشروع"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "داده‌های احراز هویت ـ اثبات دانش صفر گذرنامه (Rarimo)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " شناسهٔ یکتایی برگرفته از گذرنامه، تابعیت، جنسیت و اثبات آستانهٔ سنی برای بررسی صلاحیت و مالکیت، بدون تاریخ کامل تولد. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["منفعت مشروع"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["اطلاعات حساب"],
                          },
                          " (نام کاربری، زبان‌ها، ترجیحات، وضعیت و مجوزها) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای مدیریت حساب، ترجیحات، مجوزها و اعلان‌های شما. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["رضایت شما"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["اقداماتی که انجام می‌دهید"],
                          },
                          " (گفت‌وگوها، گزاره‌ها، رأی‌های موافق/مخالف/عبور، انتخاب‌ها/پاسخ‌های متنی آزاد نظرسنجی، مقایسه‌های بهترین/بدترین و pairwise، و تخصیص اعتبار برای رأی‌دهی درجه‌دوم) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " محتوا، انتخاب‌ها و مهرهای زمانی برای مشارکت و نتایج. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["رضایت شما"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["نشانی IP"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [" برای حفاظت از خدمات و پیشگیری از حملات. "],
                      },
                      {
                        tag: "td",
                        children: ["منفعت مشروع"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["داده‌های فنی با شناسهٔ مستعار"],
                          },
                          " (شناسه‌ها، خطاها، شمارش‌ها، زمان‌سنجی‌ها و زمینهٔ فنی) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای قابلیت اطمینان و امنیت. گزارش‌های رویداد زیرساخت/ارائه‌دهندگان ممکن است زمینهٔ شبکه، درخواست یا پایگاه داده را نیز داشته باشند. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["منفعت مشروع"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["ارتباطات"],
                          },
                          " (اطلاعات تماس، پیام‌ها، گزارش‌ها و تاریخ‌ها) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای ارتباط با شما و رسیدگی به درخواست‌ها یا گزارش‌ها. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" منفعت مشروع در ارتباط با شما. "],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["داده‌های شخصی یادشده."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای انجام تعهدات قانونی و درخواست‌های قانونی مقامات. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["تعهد قانونی ما."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["داده‌های شخصی یادشده."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای پیشگیری از تقلب، پیام‌های ناخواسته و فعالیت غیرمجاز. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["تعهد قانونی ما."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["داده‌های شخصی یادشده."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: ["برای دفاع از خود در رسیدگی‌های قضایی."],
                      },
                      {
                        tag: "td",
                        children: [
                          " منفعت مشروع در دفاع در برابر دعاوی حقوقی. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["داده‌های شخصی یادشده."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای ادغام، تملک یا تجزیهٔ شرکت، از جمله با طرف‌های خارج از اتحادیهٔ اروپا. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" منفعت مشروع در معاملات تجاری. "],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["داده‌های ارتقا/ادغام حساب"],
                          },
                          " (محتوای کاربر، دستگاه‌ها و ترجیحات) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای انتقال فعالیت مهمان به حساب ثبت‌شده. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["رضایت شما و منفعت مشروع ما."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["احراز هویت با ایمیل"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "نشانی، ارتباط حساب/دستگاه، کدها/وضعیت تأیید و سوابق مقابله با سوءاستفاده برای ورود و بازیابی.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "منفعت مشروع در احراز هویت حساب و پیشگیری از سوءاستفاده.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["اطلاعات حاصل از تحلیل و رتبه‌بندی"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "گروه‌های دیدگاهی، ترجیحات و نتایج با استفاده از ورودی‌های عددی فردی: ماتریس‌های رأی Polis، انتخاب‌های BWS/pairwise و تخصیص اعتبار QV.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "رضایت به مشارکت و تحلیل، همراه با شرط اضافی برای داده‌های حساس در صورت لزوم. ادامهٔ نگهداری پس از انصراف به مبنای قانونی مستقل نیاز دارد.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "پروژه‌ها، سازمان‌ها، اسناد و داده‌های واردشده",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "مجوزها، اطلاعات تماس، فایل‌ها و محتوا برای مدیریت. داده‌های واردشده ممکن است شامل گزاره‌ها، رأی‌ها، شناسه‌های مشارکت‌کنندگان و مهرهای زمانی مربوط به غیرکاربران باشند.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "خدمات درخواستی و منافع مشروع در پروژه‌ها/ورود داده‌های مجاز، با رعایت حقوق اشخاص متأثر و سایر شرایط قانونی لازم.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "تشخیص خودکار زبان، کمک اختیاری هوش مصنوعی و ترجمهٔ پویا",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "متن، پیش‌نویس‌های منتشرنشده، گزاره‌ها/خلاصه‌ها و فرادادهٔ پردازش برای تشخیص زبان، ترجمهٔ درخواستی و پیشنهادها/توصیف‌های هوش مصنوعی.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "مبنای قانونی محتوای مربوط؛ رضایت مشخص در صورت لزوم برای پردازش اختیاری.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "به‌روزرسانی‌های ایمیلی گفت‌وگو، در صورت فعال بودن",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "نشانی‌ها، ترجیحات، زبان، سابقهٔ تحویل، پیوندهای اقدام و انصراف‌ها/شکایت‌ها برای به‌روزرسانی‌های انتخاب‌شده و مدیریت تحویل.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "رضایت در صورت لزوم؛ اقدامات درخواستی برای ترجیحات؛ منافع مشروع در تحویل قابل اعتماد و بدون سوءاستفاده.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "سوابق حذف، بازیابی و پرونده‌های با دسترسی محدود",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "درخواست‌ها، بررسی مالکیت، مهلت‌ها و شواهد محدود پرونده/پاک‌سازی برای بازیابی، محو داده و پیشگیری از بازگرداندن داده‌های محوشده.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "درخواست شما، تعهدات قانونی و منافع موجه امنیتی یا مربوط به دعاوی حقوقی.",
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "محتوا و الگوهای رأی‌دهی ممکن است دیدگاه‌های سیاسی یا اطلاعات حساس دیگر را آشکار کنند و به شرط قانونی قابل اعمال، از جمله رضایت صریح در صورت لزوم، نیاز داشته باشند. از ارائهٔ اطلاعات شخصی غیرضروری دربارهٔ خود یا دیگران بپرهیزید.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: [
              "3. داده‌های شخصی شما را با چه کسانی به اشتراک می‌گذاریم؟",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.1. بسته به قابلیت و مجوزها، دریافت‌کنندگان عبارت‌اند از: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "شما، برای دسترسی به حساب و درخواست‌های مربوط به حقوقتان؛",
                ],
              },
              {
                tag: "li",
                children: [
                  "بازدیدکنندگان، برای اطلاعات عمومی و خروجی‌های مجاز شرح‌داده‌شده در بالا؛",
                ],
              },
              {
                tag: "li",
                children: [
                  "برگزارکنندگان/کارکنان مجاز، برای مدیریت، پاسخ‌های محدودشده، خروجی‌گیری و نظارت بر محتوا. برگزارکنندگان مسئول استفاده و گردآوری بعدی خود هستند؛",
                ],
              },
              {
                tag: "li",
                children: [
                  "کارکنان و ارائه‌دهندگان ما، با محدودیت‌های دسترسی و ترتیبات مناسب پردازشگر؛ و",
                ],
              },
              {
                tag: "li",
                children: [" مقامات، در موارد الزام قانونی به افشا. "],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. پردازش خارج از EEA شامل هوش مصنوعی/ترجمه در ایالات متحده و خدمات جهانی تأیید/امنیت است. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. در صورت لزوم، انتقال‌ها بر تصمیم‌های قابل اعمال دربارهٔ کفایت حفاظت، چارچوب‌های تأییدشده یا شروط قراردادی استاندارد همراه با تدابیر امنیتی مرتبط متکی‌اند. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. برای جزئیات دریافت‌کنندگان/مکان‌ها و اطلاعات تضمین‌های قابل اعمال انتقال، از جمله تضمین‌های قراردادی، با legal@zkorum.com تماس بگیرید. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. ممکن است نتایج تجمیعی ناشناس را نگه داریم یا به اشتراک بگذاریم. قطع پیوند حساب به‌تنهایی ناشناس بودن را تضمین نمی‌کند: متن قابل انتساب به فرد، الگوها و نتایج گروه‌های کوچک همچنان دادهٔ شخصی‌اند. ",
            ],
          },
          {
            tag: "p",
            children: [
              "3.6. دستورهای لازم محو/اصلاح/محدودسازی و اعلان‌های لازم برای دریافت‌کنندگان را صادر می‌کنیم، اما نمی‌توانیم دانلودها، انتشارات یا نسخه‌های موتورهای جست‌وجوی مستقل را از راه دور پاک کنیم. ارائه‌دهندگان ممکن است سوابق را برای اهداف قانونی خود نگه دارند. پاسخ به برگزارکننده، نشانی ایمیل و پیام شما را در اختیار او می‌گذارد.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["4. داده‌های شخصی شما را چه مدت نگه می‌داریم؟"],
          },
          {
            tag: "p",
            children: [
              " 4.1. داده‌های حساب را تا زمانی که برای اهداف بخش 2 لازم باشند نگه می‌داریم. پس‌گرفتن رضایت، پردازش مبتنی بر رضایت را پایان می‌دهد، مگر آنکه مبنای قانونی مستقلی وجود داشته باشد. بخش 6.7 حذف و بازیابی حساب را توضیح می‌دهد. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. پذیرش حذف حساب، دسترسی را غیرفعال و مشارکت را از محاسبات زندهٔ جدید خارج می‌کند. متن گزاره‌های شخصی، ترجمه‌ها و انتساب به شما، از جمله در نمایش‌های تاریخی، پنهان می‌شوند. نتایج باز به‌صورت ناهمگام به‌روز می‌شوند. داده‌های بازیابی 15 روز خصوصی می‌مانند و سپس مشمول پاک‌سازی دائمی می‌شوند. ",
            ],
          },
          {
            tag: "p",
            children: [
              "ورودی‌های عددی نتایج ذخیره‌شده را برای تحلیل رأی‌دهی و محاسبهٔ مجدد به‌مدت نامحدود نگه می‌داریم و در پاک‌سازی دائمی، پیوند آن‌ها با حساب را قطع می‌کنیم.",
            ],
          },
          {
            tag: "p",
            children: [
              "پاک‌سازی بدون تأخیر ناروا انجام می‌شود، اما لزوماً در پایان مهلت بازیابی تمام نمی‌شود. تأخیرها مهلت بازیابی یا مهلت‌های قانونی را تمدید نمی‌کنند.",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. ورودی‌های نگهداری‌شده همان ورودی‌های به‌کاررفته در نتایج ذخیره‌شده‌اند، نه همهٔ برگه‌های رأی یا محاسبات. حذف عادی اعداد ذخیره‌شده را دوباره محاسبه نمی‌کند؛ اصلاحات جداگانه یا تحلیل مجدد ممکن است آن‌ها را تغییر دهند. توصیف‌های تاریخی هوش مصنوعی خودکار بازنویسی نمی‌شوند؛ بخش‌های حاوی اطلاعات هویتی همچنان مشمول حق محو هستند. در موارد اعمال حق محو، خروجی/ترجمه‌های مربوط حذف یا بخش‌های مشمول محو در آن‌ها پوشانده می‌شوند، بدون تولید جایگزین. با بازگشایی، مشارکت حذف‌شده یا برای همیشه جداشده کنار گذاشته می‌شود. حذف گفت‌وگو/پروژه، نتایج و ورودی‌های تحت مالکیت انحصاری آن را حذف می‌کند. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. فایل‌ها تا زمانی می‌مانند که پروژهٔ آن‌ها یا استفادهٔ مشترک معتبر دیگری به آن‌ها نیاز داشته باشد. خروجی‌های موجود ممکن است شامل محتوایی باشند که بعداً حذف شده است؛ مهلت دانلود حداکثر 30 روز پس از تولید و بدون تمدید پایان می‌یابد. حذف عادی آن‌ها را بازنویسی نمی‌کند؛ خروجی‌های جدید وضعیت فعلی حذف را لحاظ می‌کنند. فایل‌های منقضی‌شده سریع پاک‌سازی می‌شوند. درخواست‌های مشخص محو تابع بخش 6 هستند. ",
            ],
          },
          {
            tag: "p",
            children: [
              "4.5. کدهای تأیید و توکن‌های اقدام/بازیابی منقضی و پاک‌سازی می‌شوند. سوابق ضروری مقابله با سوءاستفاده و کنارگذاری اعتبارنامه‌ها برای هدف حفاظتی خود باقی می‌مانند.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.6. ترجیحات ایمیل، انصراف‌ها و سوابق تحویل برای رعایت انتخاب‌ها و رفع خطاها باقی می‌مانند. حذف حساب پیوندهای شما را باطل و جزئیات غیرضروری گیرنده را حذف می‌کند. داده‌های خام رویدادهای تحویل پس از پردازش یا رفع خطا پاک می‌شوند.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.7. گزارش‌های رویداد برنامه/پایگاه دادهٔ ما در CloudWatch، دورهٔ نگهداری چرخشی 180 روزه دارند؛ دورهٔ ارائه‌دهندگان متفاوت است. حذف حساب همهٔ گزارش‌ها را پاک نمی‌کند. شواهد با دسترسی محدود مربوط به پشتیبانی، نظارت بر محتوا، امنیت یا امور حقوقی ممکن است برای هدف خاص خود بیشتر بمانند، نه به‌عنوان بایگانی کامل حساب.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.8. داده‌های محوشده ممکن است حداکثر 30 روز پس از حذف از سامانهٔ زنده در پشتیبان‌های با دسترسی محدود بمانند و برای استفادهٔ عادی در دسترس نباشند. کپی/بازیابی این مدت را از نو آغاز نمی‌کند؛ پیش از در دسترس قرار گرفتن داده‌های بازیابی‌شده، دستورهای حذف دوباره اعمال می‌شوند.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. چگونه امنیت داده‌های شخصی شما را حفظ می‌کنیم؟"],
          },
          {
            tag: "p",
            children: [
              " از کنترل دسترسی متناسب، رمزگذاری، پشتیبان‌های با دسترسی محدود، کمینه‌سازی داده و پایش امنیتی استفاده می‌کنیم. احراز هویت با کد تأیید و کلیدهای رمزنگاری انجام می‌شود، نه گذرواژهٔ ذخیره‌شدهٔ حساب. هیچ خدمتی نمی‌تواند امنیت مطلق را تضمین کند. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. حقوق شما دربارهٔ داده‌های شخصی‌تان"],
          },
          {
            tag: "p",
            children: [
              " 6.1. از ابزارهای حساب استفاده کنید یا با legal@zkorum.com تماس بگیرید؛ این شامل داده‌های واردشده دربارهٔ غیرکاربران نیز می‌شود. هویت یا مالکیت را به‌طور متناسب تأیید می‌کنیم، نه لزوماً با مدارک هویتی. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2. بسته به پردازش و مبنای قانونی، این حقوق را دارید: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["حق دسترسی به داده‌های خود"],
              },
              {
                tag: "li",
                children: ["حق اصلاح داده‌های خود"],
              },
              {
                tag: "li",
                children: ["حق اعتراض به پردازش داده‌های شخصی خود"],
              },
              {
                tag: "li",
                children: ["حق محدود کردن پردازش داده‌ها"],
              },
              {
                tag: "li",
                children: ["حق محو داده‌های خود"],
              },
              {
                tag: "li",
                children: ["حق پس‌گرفتن رضایت قبلی خود"],
              },
              {
                tag: "li",
                children: ["حق انتقال داده‌های خود"],
              },
              {
                tag: "li",
                children: [" حق شکایت نزد مرجع صلاحیت‌دار حفاظت از داده‌ها. "],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. هر محدودیت قانونیِ مجاز یا الزامی بر این حقوق را توضیح می‌دهیم. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. درخواست‌های اعمال حقوق رایگان‌اند. بدون تأخیر ناروا و معمولاً ظرف یک ماه پاسخ می‌دهیم. پیچیدگی یا تعدد درخواست‌ها ممکن است تا دو ماه دیگر زمان بخواهد؛ هر تمدید را در ماه اول توضیح می‌دهیم. برای درخواست‌های آشکارا بی‌اساس یا بیش از حد، باید هر رد قانونی یا هزینهٔ معقول را توجیه کنیم. مهلت‌های پاسخ، تأخیر در محو الزامی را توجیه نمی‌کنند. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5. در حدود مجوزهایتان، ابزارها امکان مدیریت محتوا/ترجیحات و پس‌گرفتن یا تغییر مشارکت پشتیبانی‌شده را با رعایت قواعد باز/بسته بودن فعالیت فراهم می‌کنند. حذف حساب، متن گزاره‌های شخصی شما را نیز حذف می‌کند؛ حذف جداگانهٔ گزاره لازم نیست. حذف مستقل محتوا مهلت بازیابی ندارد. ",
            ],
          },
          {
            tag: "p",
            children: [
              "پس‌گرفتن مشارکت، نتایج ذخیره‌شده را بازنویسی نمی‌کند. پس از قطع دائمی پیوند، ابزارهای حساب نمی‌توانند سوابق عددی جداشده را بازیابی، تغییر یا پس بگیرند؛ حساب جدید نیز نمی‌تواند آن‌ها را دوباره به خود نسبت دهد.",
            ],
          },
          {
            tag: "p",
            children: [
              "حذف پروژه شامل گفت‌وگوها، اسناد و نتایج/ورودی‌های تحت مالکیت انحصاری آن است. حذف سازمان مستلزم انتقال یا حذف جداگانهٔ پروژه‌های تحت مالکیت انحصاری آن است؛ پروژه‌های مشترک با مالکان دیگر باقی می‌مانند. حذف، بایگانیِ برگشت‌پذیر نیست.",
            ],
          },
          {
            tag: "h3",
            children: ["6.6. سوابق امنیتی:"],
          },
          {
            tag: "p",
            children: [
              " شواهد محدود مقابله با سوءاستفاده، اعتبارنامه‌های مسدودشده، انصراف و محو/امنیت/امور حقوقی ممکن است برای اهداف خاص خود باقی بمانند؛ نه اثبات‌های کامل احراز هویت، اسرار تأیید یا نسخهٔ کلی حساب حذف‌شدهٔ شما. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. روش حذف حساب:"],
          },
          {
            tag: "p",
            children: [
              " از طریق ابزارهای حساب درخواست حذف کنید. اگر مسئولیت‌های سازمانی مانع حذف حساب با این ابزارها هستند، با ما تماس بگیرید. پذیرش درخواست حذف، مهلت بازیابی 15 روزه را آغاز می‌کند؛ درخواست ردشده چنین اثری ندارد. بخش 4 موارد پنهان‌شده، محوشده یا نگهداری‌شده را توضیح می‌دهد. ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["هنگام پذیرش:"],
                  },
                  " نشست‌ها لغو و ارسال ایمیل/کارهای خصوصیِ بعدی مرتبط با حساب متوقف می‌شوند؛ عملیات ازپیش‌ارسال‌شده ممکن است تکمیل شوند. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["در 15 روز بعد:"],
                  },
                  " بازیابی مستلزم تأیید مالکیت و لغو صریح درخواست پیش از مهلت، با اعتبارنامهٔ پشتیبانی‌شده یا کلیدهای اصلی دستگاه مهمان است. داده‌های صرفاً ویژهٔ بازیابی از دسترسی عادی، نمایش‌های تاریخی و خروجی‌های جدید کنار گذاشته می‌شوند؛ خروجی‌های موجود تابع بخش 4.4 هستند. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["در پایان مهلت 15 روزه:"],
                  },
                  " بازیابی پایان می‌یابد. پاک‌سازی، داده‌های خصوصی حساب/بازیابی، متن اصلی گزاره‌های شخصی و ترجمه‌ها و ارتباطات غیرضروری را حذف می‌کند. گزاره‌ها بدون انتساب به شما، اعلان حذف نشان می‌دهند. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "بازیابی، داده‌های مجاز را که فقط به‌دلیل حذف حساب پنهان شده‌اند برمی‌گرداند، نه نشست‌های لغوشده، حذف‌های مستقل، مشارکت‌های پس‌گرفته‌شده، ادغام مهمان یا تصمیم‌های نظارت بر محتوا را.",
            ],
          },
          {
            tag: "p",
            children: [
              "سازمان‌ها/پروژه‌های مشترک و مشارکت دیگران پس از حذف حساب باقی می‌مانند. گزاره‌های آغازین متعلق به پروژه بدون انتساب عمومی به شما باقی می‌مانند. حذف آن‌ها به مجوز جداگانه نیاز دارد.",
            ],
          },
          {
            tag: "p",
            children: [
              " درخواست قانونی محو نیازمند انتظار برای پایان مهلت بازیابی حساب نیست. حذف حساب به معنای صرف‌نظر از حقوق قانونی حفاظت از داده‌ها نیست. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. شکایت خود را به ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              " یا مستقیماً به مرجع صلاحیت‌دار حفاظت از داده‌ها، از جمله CNIL فرانسه (",
              {
                tag: "a",
                children: ["www.cnil.fr"],
                href: "http://www.cnil.fr/",
                external: true,
              },
              ") ارائه کنید. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["7. اطلاعات مهم برای ساکنان کالیفرنیا"],
          },
          {
            tag: "p",
            children: [
              " 7.1. طبق قانون حریم خصوصی مصرف‌کنندهٔ کالیفرنیا (CCPA)، دسته‌های گردآوری‌شده، استفاده‌شده و اشتراک‌گذاری‌شده در 12 ماه گذشته همان موارد بالاست، برای اهداف ذکرشده. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. اطلاعات شخصی را در برابر پول یا عوض باارزش دیگری نفروخته‌ایم. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. از طریق بخش 6 می‌توانید دسترسی، حذف و اطلاعات دربارهٔ رویه‌های ما را درخواست کنید. درخواست‌ها را تأیید می‌کنیم و ممکن است مدرک اختیار نماینده برای اقدام از طرف شما را بخواهیم. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. اعمال حقوق، جز در موارد مجاز قانونی، بر قیمت‌ها یا کیفیت خدمات اثر نمی‌گذارد. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["8. تغییرات این سیاست حریم خصوصی"],
          },
          {
            tag: "p",
            children: [
              " تغییرات مهم حریم خصوصی را با ایمیل یا در Agora اطلاع می‌دهیم. آخرین اطلاعیه و تاریخ به‌روزرسانی آن در وب‌سایت ما در دسترس است. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. پرسشی دارید؟"],
          },
          {
            tag: "p",
            children: [
              " با مسئول حریم خصوصی ما تماس بگیرید: ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". ",
            ],
          },
        ],
      },
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    automatedTranslationNotice: {
      title: "Traduction automatique",
      statement:
        "La présente politique de confidentialité a été traduite automatiquement. Seule la version anglaise fait foi et elle prévaut exclusivement en cas de divergence.",
      viewEnglish: "Consulter la version anglaise faisant foi",
      returnToTranslation: "Revenir à la version traduite",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["Dernière mise à jour le"],
          },
          ": 2026/10/14 (YYYY/MM/DD)",
        ],
      },
      {
        tag: "p",
        children: [
          " Agora Citizen Network est développé par ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          ". ",
        ],
      },
      {
        tag: "p",
        children: [
          " ZKorum SAS (« Agora » ou « nous ») est responsable des données personnelles décrites dans la présente notice. ",
        ],
      },
      {
        tag: "p",
        children: [
          " Contact : ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". Résidents de Californie : voir la section 7. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["Visibilité des contenus et données de participation"],
          },
          {
            tag: "p",
            children: [
              " Les contenus publiés et les résultats sont généralement publics, sous réserve des restrictions d’accès. Les conversations non répertoriées peuvent rester accessibles par lien ; leur exclusion des recherches ne les rend pas confidentielles. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Vous pouvez consulter Agora sans compte. Pour participer : ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Invités :"],
                  },
                  " Lorsque cela est autorisé, participez au moyen d’un compte lié à l’appareil. La perte de ses clés enregistrées peut empêcher l’accès ou la récupération. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Comptes enregistrés :"],
                  },
                  " Les méthodes de vérification disponibles comprennent : ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["Adresse e-mail :"],
                          },
                          " Un code à usage unique prouve que l’adresse vous appartient, et non votre identité ou votre unicité. ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["Numéro de téléphone :"],
                          },
                          " Vérifié au moyen d’un code à usage unique envoyé par SMS ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "a",
                            children: ["Rarimo"],
                            href: "https://rarimo.com/privacy-notice.html",
                            external: true,
                          },
                          ": vérification fondée sur un passeport au moyen d’une preuve à divulgation nulle de connaissance (ZKP) ",
                        ],
                      },
                    ],
                  },
                  " Les conversations peuvent exiger une méthode particulière. La vérification par passeport divulgue des informations d’admissibilité, et non l’image ou le numéro de votre passeport, votre nom ou votre photographie. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["Évolution du compte :"],
              },
              " L’activité d’un invité peut être fusionnée avec un compte enregistré, dont les choix existants sont prioritaires. La fusion est irréversible et ne permet pas de réunir deux comptes enregistrés. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Votre nom d’utilisateur choisi ou généré peut apparaître avec les contenus publiés ; il n’a pas à être votre véritable nom. ",
            ],
          },
          {
            tag: "h3",
            children: ["Qui peut voir vos informations ?"],
          },
          {
            tag: "p",
            children: [" L’accès dépend de l’activité et des autorisations : "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "Les contenus publiés, résultats, noms d’utilisateur et contacts des projets ou organisations peuvent être publics, copiés ou indexés.",
                ],
              },
              {
                tag: "li",
                children: [
                  "Les données d’authentification, les clés privées et les paramètres du compte ne sont pas publiés.",
                ],
              },
              {
                tag: "li",
                children: [
                  " La participation reste liée au compte jusqu’à sa dissociation. Les participants peuvent retrouver leurs propres allocations QV ; la conservation des données d’entrée QV ne publie pas les bulletins individuels et ne permet pas leur export. ",
                ],
              },
              {
                tag: "li",
                children: [
                  "Les réponses individuelles aux questionnaires et les résultats complets, y compris les agrégats non masqués, nécessitent une autorisation de niveau propriétaire. Les agrégats publics peuvent masquer les petits groupes.",
                ],
              },
              {
                tag: "li",
                children: [
                  "Lorsque les exports sont activés, toute personne ayant accès à la conversation, y compris les invités disposant d’un compte lié à leur appareil, peut obtenir des exports standard contenant les propositions, des identifiants d’auteur remappés, des horodatages, les totaux de votes et les agrégats de questionnaires autorisés.",
                ],
              },
              {
                tag: "li",
                children: [
                  "Les exports de votes individuels, lorsqu’ils sont proposés, comprennent les choix, les identifiants des participants, les références des propositions et les horodatages. Les divulgations supplémentaires de participation et leurs destinataires sont expliqués avant leur mise en œuvre, avec consentement lorsque cela est requis.",
                ],
              },
              {
                tag: "li",
                children: [
                  " Les signalements, les motifs de modération et les identités pertinentes sont accessibles au personnel ou aux organisateurs autorisés. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Les identifiants communs aux exports peuvent relier propositions, votes et réponses aux questionnaires. Les textes, horodatages, profils de vote ou petits groupes peuvent permettre d’identifier les participants malgré le remappage des identifiants. Les exports standard des questionnaires omettent les adresses e-mail d’authentification, mais les réponses en texte libre peuvent contenir des coordonnées. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Ces règles s’appliquent quel que soit le format d’export. Les destinataires peuvent conserver, combiner ou republier les fichiers sous réserve de la loi ; la section 3.6 explique les copies indépendantes. ",
            ],
          },
          {
            tag: "h3",
            children: ["Migration envisagée vers AT Protocol"],
          },
          {
            tag: "p",
            children: [
              " Une éventuelle migration vers AT Protocol pourrait partager les contenus publics, les votes individuels et les identifiants avec des services indépendants échappant au contrôle d’Agora, y compris hors de l’EEE. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Les modalités applicables aux conversations à accès restreint restent à définir. Les contrôles d’accès ne constituent pas un chiffrement de bout en bout et ne peuvent empêcher les lecteurs autorisés de copier les données. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Avant la migration, nous expliquerons les changements et les choix, mettrons à jour la présente notice et recueillerons les consentements requis. Cela n’autorise pas à publier les participations existantes à accès restreint. ",
            ],
          },
          {
            tag: "h3",
            children: ["Services tiers"],
          },
          {
            tag: "p",
            children: [
              " Les prestataires traitent les informations nécessaires à leurs services, notamment les adresses réseau. Leurs notices expliquent leurs traitements : ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Rarimo"],
                    href: "https://rarimo.com/privacy-notice.html",
                    external: true,
                  },
                  " (mondial) pour les preuves d’identité à divulgation nulle de connaissance. Peut traiter les adresses IP pour la sécurité et le fonctionnement du service. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                  " reçoit votre numéro complet pour la vérification par SMS et la prévention des abus. Agora conserve un hachage protégé et des informations partielles sur le numéro et le pays. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Cloudflare"],
                    href: "https://www.cloudflare.com/privacypolicy/",
                    external: true,
                  },
                  " traite les signaux du réseau et du navigateur pour détecter les abus et améliorer le service. Les services de proxy et de sécurité activés traitent aussi le trafic et les contenus. Voir l’ ",
                  {
                    tag: "a",
                    children: [
                      "Avenant de Turnstile relatif à la confidentialité",
                    ],
                    href: "https://www.cloudflare.com/turnstile-privacy-policy/",
                    external: true,
                  },
                  ". ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Amazon Web Services"],
                    href: "https://aws.amazon.com/privacy/",
                    external: true,
                  },
                  " fournit l’hébergement, le stockage, la messagerie électronique et les diagnostics, généralement en Irlande, ainsi que les traitements d’IA Bedrock/Mistral AI aux États-Unis. La messagerie nécessite les adresses des destinataires et les messages ; l’IA utilise les textes et le contexte pertinents. La journalisation intégrale des entrées et sorties Bedrock est désactivée. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Google Cloud Platform"],
                    href: "https://cloud.google.com/terms/cloud-privacy-notice",
                    external: true,
                  },
                  " traite les textes aux États-Unis pour la traduction facultative et la détection de langue de secours. La détection automatique ne peut pas être désactivée, même lorsque la traduction l’est. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Plausible Analytics"],
                    href: "https://plausible.io/data-policy",
                    external: true,
                  },
                  " fournit des analyses d’audience sans cookies à partir d’informations de page et de données techniques, et non de moyens d’authentification ou de brouillons. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Sentry"],
                    href: "https://sentry.io/privacy/",
                    external: true,
                  },
                  " reçoit des diagnostics et des relectures d’interactions masquées déclenchées par des erreurs, au moyen de notre configuration dans l’UE, comprenant des informations sur le navigateur, la page, les chemins de navigation, les interactions et le réseau. Le masquage ne garantit pas l’anonymat. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Notre service Reacher auto-hébergé vérifie la validité des e-mails à l’aide de votre adresse complète et peut contacter des serveurs de messagerie ou des prestataires de validation. Les requêtes d’IA et de traduction omettent les identifiants de compte et de contact joints, sans supprimer les informations identifiantes contenues dans les textes. ",
            ],
          },
          {
            tag: "h3",
            children: ["Cookies et analyse d’audience"],
          },
          {
            tag: "p",
            children: [
              " Nous n’utilisons ni cookies publicitaires ni cookies de suivi entre sites et ne vendons pas de données à des fins publicitaires. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Le stockage du navigateur conserve les clés, les informations de session, les préférences et les brouillons jusqu’à leur effacement. L’enregistrement local ne téléverse pas, à lui seul, les brouillons ; la soumission, l’import ou un traitement d’IA demandé envoie les données pertinentes. La suppression sur le serveur ne peut pas effacer toutes les copies locales sur les appareils. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: [
              "1. Quand la présente politique de confidentialité s’applique-t-elle ?",
            ],
          },
          {
            tag: "p",
            children: [
              " La présente notice s’applique lorsque vous utilisez notre site web ou nos applications, ou nous contactez. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: [
              "2. Quelles données à caractère personnel traitons-nous et pourquoi ?",
            ],
          },
          {
            tag: "p",
            children: [
              " Nous recevons des données de vous, de votre appareil et des organisateurs ou imports. Le tableau indique les finalités et les bases juridiques ; la section 6 explique vos droits. ",
            ],
          },
          {
            tag: "table",
            children: [
              {
                tag: "thead",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "th",
                        children: ["Quelles données à caractère personnel ?"],
                      },
                      {
                        tag: "th",
                        children: ["Pourquoi ?"],
                      },
                      {
                        tag: "th",
                        children: ["Quelle base juridique ?"],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "tbody",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Identifiants d’appareil et sessions"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Identifiants de clé publique, informations de navigateur et d’appareil, et état des sessions pour l’authentification, la récupération et la prévention des abus. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Intérêt légitime"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Anciens enregistrements de billets d’événement",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Identifiants historiques de vérification, dates et métadonnées ; ne sont plus utilisés pour l’accès ou l’admissibilité. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Intérêt légitime"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Données d’authentification — Numéro de téléphone",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Vérification du numéro, hachage protégé, informations partielles sur le numéro et le pays, et données anti-abus pour l’authentification. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Intérêt légitime"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Données d’authentification — Preuve à divulgation nulle de connaissance fondée sur un passeport (Rarimo)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Identifiant d’unicité dérivé du passeport, nationalité, sexe et preuve de seuil d’âge pour les contrôles d’admissibilité et de titularité, sans date de naissance complète. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Intérêt légitime"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Informations du compte"],
                          },
                          " (Nom d’utilisateur, langues, préférences, état et autorisations) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour gérer votre compte, vos préférences, vos autorisations et vos notifications. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Votre consentement"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Actions que vous effectuez"],
                          },
                          " (Conversations, propositions, votes « d’accord », « pas d’accord » ou « passer », choix et réponses en texte libre aux questionnaires, comparaisons meilleur/pire et par paires, et allocations de crédits pour le vote quadratique) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Contenus, choix et horodatages pour la participation et les résultats. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Votre consentement"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Adresse IP"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour protéger le service et prévenir les attaques. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Intérêt légitime"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Données techniques pseudonymes"],
                          },
                          " (Identifiants, erreurs, décomptes, durées et contexte technique) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour la fiabilité et la sécurité. Les journaux de l’infrastructure ou des prestataires peuvent aussi contenir des éléments de contexte réseau, de requête ou de base de données. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Intérêt légitime"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Communication"],
                          },
                          " (Coordonnées, messages, signalements et dates) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour communiquer avec vous et traiter les demandes ou signalements. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Intérêt légitime à communiquer avec vous. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Données à caractère personnel mentionnées ci-dessus.",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour respecter les obligations légales et les demandes licites des autorités. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Notre obligation légale."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Données à caractère personnel mentionnées ci-dessus.",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour prévenir la fraude, les messages indésirables et les activités non autorisées. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Notre obligation légale."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Données à caractère personnel mentionnées ci-dessus.",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Pour assurer notre défense dans le cadre de procédures judiciaires.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Intérêt légitime à assurer notre défense en justice. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Données à caractère personnel mentionnées ci-dessus.",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour une fusion, une acquisition ou une scission, y compris avec des parties établies hors de l’UE. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Notre intérêt légitime à réaliser des opérations commerciales. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Données d’évolution ou de fusion du compte",
                            ],
                          },
                          " (Contenus de l’utilisateur, appareils et préférences) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour transférer l’activité d’un invité vers un compte enregistré. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Votre consentement et notre intérêt légitime.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Authentification par e-mail"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Adresse, association au compte et à l’appareil, codes et état de vérification, et données anti-abus pour la connexion et la récupération.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Intérêt légitime à l’authentification des comptes et à la prévention des abus.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Informations dérivées d’analyse et de classement",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Groupes d’opinion, préférences et résultats, à partir de données numériques individuelles : matrices de votes Polis, choix BWS/pairwise et allocations de crédits QV.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Consentement à la participation et à l’analyse, avec une condition supplémentaire pour les données sensibles lorsque cela est requis. La poursuite de la conservation après retrait exige un fondement juridique indépendant.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Projets, organisations, documents et imports",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Autorisations, contacts, fichiers et contenus pour l’administration. Les imports peuvent comprendre des propositions, des votes, des identifiants de participant et des horodatages concernant des non-utilisateurs.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Exécution des services demandés ; intérêts légitimes à l’exploitation des projets et imports autorisés, sous réserve des droits des personnes concernées et de toute condition juridique supplémentaire requise.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Détection automatique de la langue, assistance facultative par IA et traduction dynamique",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Textes, brouillons non publiés, propositions ou résumés et métadonnées de traitement pour la détection de langue, la traduction demandée et les suggestions ou descriptions produites par IA.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "La base juridique du contenu sous-jacent ; un consentement spécifique lorsqu’il est requis pour un traitement facultatif.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Mises à jour des conversations par e-mail, lorsque la fonctionnalité est activée",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Adresses, préférences, langue, historique de livraison, liens d’action, désabonnements et plaintes pour les mises à jour choisies et la gestion de leur livraison.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Consentement lorsqu’il est requis ; actions demandées concernant les préférences ; intérêts légitimes à une livraison fiable et sans abus.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Données de suppression, de récupération et de dossiers à accès restreint",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Demandes, vérifications de titularité, échéances et éléments de preuve limités relatifs aux dossiers et au nettoyage, pour la récupération, l’effacement et la prévention de la restauration de données effacées.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Votre demande, les obligations légales et les intérêts justifiés liés à la sécurité ou aux droits en justice.",
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "Les contenus et les profils de vote peuvent révéler des opinions politiques ou d’autres informations sensibles, nécessitant une condition juridique applicable, notamment le consentement explicite lorsqu’il est requis. Évitez les informations personnelles inutiles vous concernant ou concernant autrui.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: [
              "3. Avec qui partageons-nous vos données à caractère personnel ?",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.1. Selon la fonctionnalité et les autorisations, les destinataires comprennent : ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "Vous-même, pour l’accès au compte et les demandes d’exercice des droits ;",
                ],
              },
              {
                tag: "li",
                children: [
                  "Les visiteurs, pour les informations publiques et les exports autorisés décrits ci-dessus ;",
                ],
              },
              {
                tag: "li",
                children: [
                  "Les organisateurs ou membres du personnel autorisés, pour l’administration, les réponses à accès restreint, les exports et la modération. Les organisateurs sont responsables de leurs utilisations et collectes ultérieures ;",
                ],
              },
              {
                tag: "li",
                children: [
                  "Notre personnel et nos prestataires, avec des restrictions d’accès et des accords de sous-traitance appropriés ; et",
                ],
              },
              {
                tag: "li",
                children: [
                  " Les autorités lorsque la divulgation est légalement requise. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. Les traitements hors de l’EEE comprennent l’IA et la traduction aux États-Unis ainsi que les services mondiaux de vérification et de sécurité. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. Lorsque cela est requis, les transferts reposent sur les décisions d’adéquation applicables, des cadres approuvés ou des clauses contractuelles types accompagnées des mesures de sécurité pertinentes. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. Contactez legal@zkorum.com pour obtenir des précisions sur les destinataires, les lieux de traitement et les garanties de transfert applicables, notamment contractuelles. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. Nous pouvons conserver ou partager des agrégats anonymes. La suppression des liens avec le compte ne garantit pas, à elle seule, l’anonymat : les textes identifiants, les profils et les résultats de petits groupes restent des données personnelles. ",
            ],
          },
          {
            tag: "p",
            children: [
              "3.6. Nous donnons les instructions requises d’effacement, de rectification ou de limitation et notifions les destinataires, mais ne pouvons pas effacer à distance les téléchargements indépendants, les publications ou les copies des moteurs de recherche. Les prestataires peuvent conserver des données pour leurs propres finalités licites. Répondre à un organisateur lui communique votre adresse e-mail et votre message.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: [
              "4. Combien de temps conservons-nous vos données à caractère personnel ?",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.1. Nous conservons les données du compte tant qu’elles sont nécessaires aux finalités de la section 2. Le retrait du consentement met fin aux traitements fondés sur celui-ci, sauf fondement juridique indépendant applicable. La section 6.7 explique la suppression et la récupération du compte. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. La suppression acceptée du compte désactive l’accès et exclut la participation des nouveaux calculs des résultats courants. Elle masque le texte des propositions personnelles, leurs traductions et leur attribution, y compris dans les affichages historiques. Les résultats des activités ouvertes s’actualisent de manière asynchrone. Les données de récupération restent privées pendant 15 jours, puis deviennent admissibles au nettoyage définitif. ",
            ],
          },
          {
            tag: "p",
            children: [
              "Nous conservons indéfiniment les données numériques ayant servi aux résultats enregistrés pour l’analyse des votes et leur recalcul, en supprimant les liens avec le compte lors du nettoyage définitif.",
            ],
          },
          {
            tag: "p",
            children: [
              "Le nettoyage s’effectue dans les meilleurs délais, sans nécessairement être achevé à l’échéance de récupération. Les retards ne prolongent ni la récupération ni les délais légaux.",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. Les données d’entrée conservées sont celles ayant servi aux résultats enregistrés, et non tous les bulletins ou calculs. La suppression ordinaire ne recalcule pas les chiffres enregistrés ; des corrections ou une nouvelle analyse distinctes peuvent les modifier. Les descriptions historiques produites par IA ne sont pas automatiquement réécrites ; les extraits identifiants restent soumis aux droits d’effacement. L’effacement applicable supprime ou occulte les résultats et traductions concernés sans générer de remplacement. La réouverture exclut les participations supprimées ou définitivement dissociées. La suppression d’une conversation ou d’un projet supprime les résultats et données d’entrée dont il est l’unique propriétaire. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. Les fichiers subsistent tant que leur projet ou un autre usage partagé valide en a besoin. Les exports existants peuvent contenir des contenus supprimés ultérieurement ; leur téléchargement expire au plus tard 30 jours après leur génération, sans prolongation. La suppression ordinaire ne les réécrit pas ; les nouveaux exports tiennent compte de l’état actuel des suppressions. Les fichiers expirés sont nettoyés rapidement. Les demandes spécifiques d’effacement suivent la section 6. ",
            ],
          },
          {
            tag: "p",
            children: [
              "4.5. Les codes de vérification et les jetons d’action ou de récupération expirent et sont nettoyés. Les données nécessaires de lutte contre les abus et de mise hors service des moyens d’authentification subsistent pour leur finalité de protection.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.6. Les préférences d’e-mail, désabonnements et données de livraison subsistent pour respecter vos choix et résoudre les échecs. La suppression du compte invalide vos liens et supprime les détails inutiles sur le destinataire. Les données brutes d’événements de livraison sont effacées après traitement ou résolution de l’échec.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.7. Nos journaux d’application et de base de données CloudWatch ont une conservation glissante de 180 jours ; celle des prestataires varie. La suppression du compte n’efface pas tous les journaux. Des éléments de preuve à accès restreint relatifs à l’assistance, à la modération, à la sécurité ou aux questions juridiques peuvent subsister plus longtemps pour leur finalité spécifique, sans constituer une archive complète du compte.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.8. Les données effacées peuvent subsister dans des sauvegardes à accès restreint pendant 30 jours au maximum après leur suppression des systèmes en production, sans être disponibles pour un usage ordinaire. Les copies ou restaurations ne font pas repartir ce délai ; les instructions d’effacement sont réappliquées avant que les données restaurées ne soient exposées.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: [
              "5. Comment assurons-nous la sécurité de vos données à caractère personnel ?",
            ],
          },
          {
            tag: "p",
            children: [
              " Nous utilisons des contrôles d’accès proportionnés, le chiffrement, des sauvegardes à accès restreint, la minimisation des données et une surveillance de sécurité. L’authentification repose sur des codes de vérification et des clés cryptographiques, et non sur des mots de passe de compte stockés. Aucun service ne peut garantir une sécurité absolue. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: [
              "6. Vos droits concernant vos données à caractère personnel",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.1. Utilisez les commandes du compte ou contactez legal@zkorum.com, y compris pour les données importées concernant des non-utilisateurs. Nous vérifions l’identité ou la titularité de manière proportionnée, sans nécessairement demander de pièce d’identité. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2. Selon le traitement et sa base juridique, vous disposez des droits suivants : ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["droit d’accès à vos données"],
              },
              {
                tag: "li",
                children: ["droit de rectification de vos données"],
              },
              {
                tag: "li",
                children: [
                  "droit d’opposition au traitement de vos données à caractère personnel",
                ],
              },
              {
                tag: "li",
                children: ["droit à la limitation du traitement des données"],
              },
              {
                tag: "li",
                children: ["droit à l’effacement de vos données"],
              },
              {
                tag: "li",
                children: [
                  "droit de retirer votre consentement précédemment donné",
                ],
              },
              {
                tag: "li",
                children: ["droit à la portabilité de vos données"],
              },
              {
                tag: "li",
                children: [
                  " droit d’introduire une réclamation auprès de l’autorité de protection des données compétente. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. Nous expliquons toute limitation de ces droits autorisée ou imposée par la loi. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. Les demandes d’exercice des droits sont gratuites. Nous répondons dans les meilleurs délais, normalement sous un mois. La complexité ou le nombre de demandes peut nécessiter jusqu’à deux mois supplémentaires ; nous expliquons toute prolongation dans le premier mois. Pour les demandes manifestement infondées ou excessives, nous devons justifier tout refus légal ou frais raisonnables. Les délais de réponse ne justifient pas de retarder un effacement requis. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5. Dans les limites de vos autorisations, les commandes permettent de gérer vos contenus et préférences et de retirer ou modifier les participations prises en charge, selon les règles d’ouverture et de clôture. La suppression du compte occulte aussi vos propositions personnelles ; il est inutile de les supprimer séparément. La suppression indépendante d’un contenu ne bénéficie d’aucun délai de récupération. ",
            ],
          },
          {
            tag: "p",
            children: [
              "Les retraits ne réécrivent pas les résultats enregistrés. Après la suppression définitive des liens, les commandes du compte ne permettent plus de retrouver, modifier ou retirer les données numériques dissociées, et un nouveau compte ne peut pas les récupérer.",
            ],
          },
          {
            tag: "p",
            children: [
              "La suppression d’un projet couvre ses conversations, ses documents et les résultats ou données d’entrée dont il est l’unique propriétaire. La suppression d’une organisation exige que ses projets détenus exclusivement soient transférés ou supprimés séparément ; les projets détenus en commun subsistent avec les autres propriétaires. La suppression n’est pas un archivage réversible.",
            ],
          },
          {
            tag: "h3",
            children: ["6.6. Données de sécurité :"],
          },
          {
            tag: "p",
            children: [
              " Des données limitées de lutte contre les abus, de blocage des moyens d’authentification et de désabonnement, ainsi que des éléments de preuve d’effacement, de sécurité ou juridiques peuvent subsister pour leurs finalités spécifiques — pas les preuves complètes d’authentification, les secrets de vérification ni une copie générale de votre compte supprimé. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. Comment supprimer votre compte :"],
          },
          {
            tag: "p",
            children: [
              " Demandez la suppression au moyen des commandes du compte. Si vos responsabilités au sein d’une organisation empêchent la suppression par ces commandes, contactez-nous. Une demande de suppression acceptée déclenche le délai de récupération de 15 jours ; une demande refusée ne le déclenche pas. La section 4 explique ce qui est masqué, effacé ou conservé. ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Dès l’acceptation :"],
                  },
                  " Les sessions sont révoquées et les nouveaux envois d’e-mails et traitements privés liés au compte cessent ; les opérations déjà lancées peuvent s’achever. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Pendant les 15 jours suivants :"],
                  },
                  " La récupération exige la vérification de la titularité et une annulation explicite avant l’échéance, au moyen d’un moyen d’authentification pris en charge ou des clés d’origine de l’appareil invité. Les données réservées à la récupération sont exclues de l’accès ordinaire, des affichages historiques et des nouveaux exports ; les exports existants suivent la section 4.4. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["À l’échéance des 15 jours :"],
                  },
                  " La récupération prend fin. Le nettoyage supprime les données privées du compte et de récupération, le texte d’origine des propositions personnelles et leurs traductions, ainsi que les associations inutiles. Les propositions affichent un avis de suppression sans vous être attribuées. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "La récupération rétablit les données par ailleurs autorisées masquées du seul fait de la suppression du compte, mais pas les sessions révoquées, les suppressions indépendantes, les retraits, les fusions de comptes invités ni les décisions de modération.",
            ],
          },
          {
            tag: "p",
            children: [
              "Les organisations et projets partagés et les contributions d’autrui subsistent après la suppression du compte. Les propositions initiales appartenant au projet subsistent sans vous être publiquement attribuées. Leur suppression nécessite une autorisation distincte.",
            ],
          },
          {
            tag: "p",
            children: [
              " Les demandes légales d’effacement n’exigent pas d’attendre l’expiration du délai de récupération du compte. La suppression du compte n’emporte pas renonciation à vos droits légaux en matière de protection des données. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. Adressez une réclamation à ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              " ou directement à une autorité de protection des données compétente, notamment la CNIL en France (",
              {
                tag: "a",
                children: ["www.cnil.fr"],
                href: "http://www.cnil.fr/",
                external: true,
              },
              "). ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: [
              "7. Informations importantes pour les résidents de Californie",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.1. Au titre du California Consumer Privacy Act (CCPA), les catégories collectées, utilisées et partagées au cours des 12 derniers mois sont celles décrites ci-dessus, pour les finalités indiquées. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. Nous n’avons pas vendu d’informations personnelles contre de l’argent ou toute autre contrepartie ayant une valeur. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. Vous pouvez demander l’accès, la suppression et des informations sur nos pratiques selon la section 6. Nous vérifions les demandes et pouvons exiger la preuve qu’un mandataire est autorisé à agir pour vous. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. L’exercice de vos droits n’affectera ni les prix ni la qualité du service, sauf lorsque la loi le permet. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: [
              "8. Modifications de la présente politique de confidentialité",
            ],
          },
          {
            tag: "p",
            children: [
              " Nous vous informons par e-mail ou dans Agora des changements importants concernant la confidentialité. La dernière notice et sa date de mise à jour sont disponibles sur notre site web. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. Avez-vous des questions ?"],
          },
          {
            tag: "p",
            children: [
              " Contactez notre responsable de la confidentialité : ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". ",
            ],
          },
        ],
      },
    ],
  },
  he: {
    title: "מדיניות פרטיות",
    automatedTranslationNotice: {
      title: "תרגום אוטומטי",
      statement:
        "מדיניות פרטיות זו תורגמה באופן אוטומטי. הנוסח באנגלית הוא הנוסח המחייב היחיד, והוא בלבד גובר במקרה של אי־התאמה כלשהי.",
      viewEnglish: "הצגת הנוסח המחייב באנגלית",
      returnToTranslation: "חזרה לנוסח המתורגם",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["עודכן לאחרונה בתאריך"],
          },
          ": 2026/10/14 (YYYY/MM/DD)",
        ],
      },
      {
        tag: "p",
        children: [
          " Agora Citizen Network מפותחת בידי ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          ". ",
        ],
      },
      {
        tag: "p",
        children: [
          ' ZKorum SAS ("Agora", "אנו" או "אנחנו") אחראית לנתונים האישיים המתוארים בהודעה זו. ',
        ],
      },
      {
        tag: "p",
        children: [
          " ליצירת קשר: ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". תושבי קליפורניה: ראו סעיף 7. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["חשיפת תוכן ורשומות השתתפות"],
          },
          {
            tag: "p",
            children: [
              " תוכן ותוצאות שפורסמו הם בדרך כלל פומביים, בכפוף להגבלות גישה. שיחות שאינן מופיעות ברשימות עשויות להישאר נגישות בקישור; אי־הכללה בחיפוש אינה הופכת אותן לחסויות. ",
            ],
          },
          {
            tag: "p",
            children: [" תוכלו לגלוש ללא חשבון. כדי להשתתף: "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["אורחים:"],
                  },
                  " כשמותר, ניתן להשתתף באמצעות חשבון המבוסס על מכשיר. אובדן המפתחות השמורים עלול למנוע גישה או שחזור. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["חשבונות רשומים:"],
                  },
                  " שיטות האימות הזמינות כוללות: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["כתובת דואר אלקטרוני:"],
                          },
                          " קוד חד־פעמי מוכיח בעלות על הכתובת, לא זהות או ייחודיות. ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["מספר טלפון:"],
                          },
                          " מאומת באמצעות קוד חד־פעמי הנשלח ב־SMS ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "a",
                            children: ["Rarimo"],
                            href: "https://rarimo.com/privacy-notice.html",
                            external: true,
                          },
                          ": אימות המבוסס על דרכון באמצעות הוכחת אפס־ידע (ZKP) ",
                        ],
                      },
                    ],
                  },
                  " שיחות עשויות לדרוש שיטה מסוימת. אימות דרכון חושף מידע זכאות, לא את תמונת הדרכון, מספרו, שמכם או תצלומכם. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["שדרוגי חשבון:"],
              },
              " ניתן למזג פעילות אורח לחשבון רשום, שבחירותיו הקיימות מקבלות עדיפות. המיזוג אינו הפיך ואינו מאפשר לשלב שני חשבונות רשומים. ",
            ],
          },
          {
            tag: "p",
            children: [
              " שם המשתמש שבחרתם או שנוצר עבורכם עשוי להופיע עם תוכן שפורסם; אין חובה שיהיה שמכם האמיתי. ",
            ],
          },
          {
            tag: "h3",
            children: ["מי יכול לראות את המידע שלכם?"],
          },
          {
            tag: "p",
            children: [" הגישה תלויה בפעילות ובהרשאות: "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "תוכן שפורסם, תוצאות, שמות משתמש ופרטי קשר של מיזמים וארגונים עשויים להיות פומביים, מועתקים או מאונדקסים.",
                ],
              },
              {
                tag: "li",
                children: [
                  "פרטי אימות, מפתחות פרטיים והגדרות חשבון אינם מתפרסמים.",
                ],
              },
              {
                tag: "li",
                children: [
                  " השתתפות מקושרת לחשבון עד ניתוק הקישור. משתתפים יכולים לאחזר את הקצאות QV שלהם; שמירת קלט QV אינה מפרסמת הצבעות אישיות ואינה מאפשרת ייצוא שלהן. ",
                ],
              },
              {
                tag: "li",
                children: [
                  "תשובות אישיות לסקרים ותוצאות מלאות, לרבות נתונים מצרפיים שלא הוסתרו, מחייבים הרשאה ברמת בעלים. נתונים מצרפיים פומביים עשויים להסתיר קבוצות קטנות.",
                ],
              },
              {
                tag: "li",
                children: [
                  "כשהאפשרות מופעלת, כל מי שיש לו גישה לשיחה, לרבות אורחים בחשבון המבוסס על מכשיר, יכול לקבל ייצואים רגילים הכוללים הצהרות, מזהי מחברים שמופו מחדש, חותמות זמן, סיכומי הצבעות ונתוני סקרים מצרפיים מותרים.",
                ],
              },
              {
                tag: "li",
                children: [
                  "ייצואי הצבעות אישיות, כשמוצעים, כוללים בחירות, מזהי משתתפים, הפניות להצהרות וחותמות זמן. חשיפות נוספות של השתתפות והקהלים שלהן מוסברים לפני החלתן, ובהסכמה כשזו נדרשת.",
                ],
              },
              {
                tag: "li",
                children: [
                  " דיווחים, נימוקי פיקוח על תוכן וזהויות רלוונטיות זמינים לצוות או למארגנים מורשים. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " מזהים משותפים בייצוא יכולים לקשר הצהרות, הצבעות ותשובות לסקרים. טקסט, חותמות זמן, דפוסי הצבעה או קבוצות קטנות עשויים לזהות משתתפים גם לאחר מיפוי המזהים מחדש. ייצואי סקרים רגילים אינם כוללים כתובות דואר אלקטרוני לאימות, אך תשובות בטקסט חופשי עשויות להכיל פרטי קשר. ",
            ],
          },
          {
            tag: "p",
            children: [
              " כללים אלה חלים בכל פורמט ייצוא. מקבלים רשאים לשמור, לשלב או לפרסם מחדש קבצים בכפוף לדין; סעיף 3.6 מסביר על עותקים עצמאיים. ",
            ],
          },
          {
            tag: "h3",
            children: ["מעבר מתוכנן ל־AT Protocol"],
          },
          {
            tag: "p",
            children: [
              " מעבר אפשרי ל־AT Protocol עשוי לשתף תוכן פומבי, הצבעות אישיות ומזהים עם שירותים עצמאיים שאינם בשליטת Agora, לרבות מחוץ לאזור הכלכלי האירופי (EEA). ",
            ],
          },
          {
            tag: "p",
            children: [
              " ההסדרים לשיחות מוגבלות טרם הוכרעו. בקרות גישה אינן הצפנה מקצה לקצה ואינן יכולות למנוע מקוראים מורשים להעתיק נתונים. ",
            ],
          },
          {
            tag: "p",
            children: [
              " לפני המעבר נסביר את השינויים והאפשרויות, נעדכן הודעה זו ונקבל הסכמה נדרשת. אין בכך היתר לפרסם השתתפות קיימת בעלת גישה מוגבלת. ",
            ],
          },
          {
            tag: "h3",
            children: ["שירותי צדדים שלישיים"],
          },
          {
            tag: "p",
            children: [
              " ספקים מעבדים מידע הנחוץ לשירותיהם, לרבות כתובות רשת. הודעותיהם מסבירות את העיבוד שלהם: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Rarimo"],
                    href: "https://rarimo.com/privacy-notice.html",
                    external: true,
                  },
                  " (גלובלי) לצורך הוכחות זהות באפס־ידע. עשוי לעבד כתובות IP לצורכי אבטחה ותפעול השירות. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                  " מקבלת את מספרכם המלא לאימות ב־SMS ולמניעת שימוש לרעה. Agora שומרת גיבוב מוגן ומידע חלקי על המספר והמדינה. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Cloudflare"],
                    href: "https://www.cloudflare.com/privacypolicy/",
                    external: true,
                  },
                  " מעבדת אותות רשת ודפדפן לזיהוי שימוש לרעה ולשיפור השירות. שירותי תיווך ואבטחה שהופעלו מטפלים גם בתעבורה ובתוכן. ראו את ",
                  {
                    tag: "a",
                    children: ["נספח הפרטיות של Turnstile"],
                    href: "https://www.cloudflare.com/turnstile-privacy-policy/",
                    external: true,
                  },
                  ". ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Amazon Web Services"],
                    href: "https://aws.amazon.com/privacy/",
                    external: true,
                  },
                  " מספקת אירוח, אחסון, דואר אלקטרוני ואבחון, בדרך כלל באירלנד, ועיבוד AI של Bedrock/Mistral בארצות הברית. דואר אלקטרוני מחייב כתובות נמענים והודעות; AI משתמש בטקסט ובהקשר הרלוונטיים. רישום מלא של קלט ופלט Bedrock מושבת. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Google Cloud Platform"],
                    href: "https://cloud.google.com/terms/cloud-privacy-notice",
                    external: true,
                  },
                  " מעבדת טקסט בארצות הברית לתרגום אופציונלי ולזיהוי שפה כחלופה. לא ניתן להשבית זיהוי אוטומטי, גם כשהתרגום כבוי. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Plausible Analytics"],
                    href: "https://plausible.io/data-policy",
                    external: true,
                  },
                  " מספקת ניתוח נתוני שימוש ללא עוגיות, על סמך מידע על דפים ומידע טכני, לא פרטי אימות או טיוטות. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Sentry"],
                    href: "https://sentry.io/privacy/",
                    external: true,
                  },
                  " מקבלת אבחון ושחזורים ממוסכים של אינטראקציות המופעלים בעקבות שגיאה, דרך התצורה שלנו באיחוד האירופי, לרבות מידע על דפדפן, דף, נתיב, אינטראקציות ורשת. מיסוך אינו מבטיח אנונימיות. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Reacher המתארח אצלנו בודק את תקפות הדואר האלקטרוני באמצעות כתובתכם המלאה ועשוי לפנות לשרתי דואר או לספקי אימות. בקשות AI ותרגום אינן מצרפות מזהי חשבון ופרטי קשר, אך אינן מסירות מידע מזהה מתוך הטקסט. ",
            ],
          },
          {
            tag: "h3",
            children: ["עוגיות וניתוח נתוני שימוש"],
          },
          {
            tag: "p",
            children: [
              " איננו משתמשים בעוגיות פרסום או מעקב בין אתרים ואיננו מוכרים נתונים לצורכי פרסום. ",
            ],
          },
          {
            tag: "p",
            children: [
              " אחסון הדפדפן מחזיק מפתחות, מידע מושב, העדפות וטיוטות עד לניקויו. שמירה מקומית כשלעצמה אינה מעלה טיוטות; שליחה, ייבוא או עיבוד AI שהתבקש שולחים את הקלט הרלוונטי. מחיקה בשרת אינה יכולה למחוק כל עותק מקומי במכשיר. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["1. מתי חלה מדיניות פרטיות זו?"],
          },
          {
            tag: "p",
            children: [
              " הודעה זו חלה כשאתם משתמשים באתר או ביישומים שלנו, או פונים אלינו. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. אילו נתונים אישיים אנו מעבדים ומדוע?"],
          },
          {
            tag: "p",
            children: [
              " אנו מקבלים נתונים מכם, ממכשירכם וממארגנים או מייבואים. הטבלה מפרטת מטרות ובסיסים משפטיים; סעיף 6 מסביר את זכויותיכם. ",
            ],
          },
          {
            tag: "table",
            children: [
              {
                tag: "thead",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "th",
                        children: ["אילו נתונים אישיים?"],
                      },
                      {
                        tag: "th",
                        children: ["מדוע?"],
                      },
                      {
                        tag: "th",
                        children: ["מהו הבסיס המשפטי?"],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "tbody",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["מזהי מכשיר ומושבים"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " מזהי מפתח ציבורי, מידע על דפדפן ומכשיר ומצב מושב, לצורך אימות, שחזור ומניעת שימוש לרעה. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["אינטרס לגיטימי"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["רשומות כרטיסים לאירועים שהוצאו משימוש"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " מזהי אימות היסטוריים, תאריכים ומטא־נתונים; אינם משמשים עוד לגישה או לזכאות. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["אינטרס לגיטימי"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["נתוני אימות — מספר טלפון"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " אימות מספר, גיבוב מוגן, מידע חלקי על המספר והמדינה ורשומות למניעת שימוש לרעה, לצורכי אימות. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["אינטרס לגיטימי"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "נתוני אימות — הוכחת אפס־ידע המבוססת על דרכון (Rarimo)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " מזהה ייחודיות הנגזר מדרכון, אזרחות, מין והוכחת עמידה בסף גיל, לבדיקות זכאות ובעלות, ללא תאריך לידה מלא. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["אינטרס לגיטימי"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["מידע על החשבון"],
                          },
                          " (שם משתמש, שפות, העדפות, מצב והרשאות) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " לניהול החשבון, ההעדפות, ההרשאות וההתראות שלכם. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["הסכמתכם"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["פעולות שאתם מבצעים"],
                          },
                          " (שיחות, הצהרות, הצבעות הסכמה/אי־הסכמה/דילוג, בחירות בסקרים ותשובות בטקסט חופשי, השוואות הטוב ביותר/הגרוע ביותר ו־pairwise והקצאות נקודות להצבעה ריבועית) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " תוכן, בחירות וחותמות זמן לצורך השתתפות ותוצאות. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["הסכמתכם"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["כתובת IP"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [" להגנה על השירות ולמניעת מתקפות. "],
                      },
                      {
                        tag: "td",
                        children: ["אינטרס לגיטימי"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["נתונים טכניים פסאודונימיים"],
                          },
                          " (מזהים, שגיאות, ספירות, מדידות זמן והקשר טכני) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " לצורך אמינות ואבטחה. יומני תשתית וספקים עשויים להכיל גם הקשר של רשת, בקשות או מסד נתונים. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["אינטרס לגיטימי"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["תקשורת"],
                          },
                          " (פרטי קשר, הודעות, דיווחים ותאריכים) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " לתקשורת עמכם ולטיפול בבקשות או בדיווחים. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" אינטרס לגיטימי בתקשורת עמכם. "],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["הנתונים האישיים המוזכרים לעיל."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " לעמידה בחובות חוקיות ובבקשות חוקיות של רשויות. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["חובתנו החוקית."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["הנתונים האישיים המוזכרים לעיל."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " למניעת הונאה, הודעות בלתי רצויות ופעילות בלתי מורשית. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["חובתנו החוקית."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["הנתונים האישיים המוזכרים לעיל."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: ["כדי להתגונן בהליכים משפטיים."],
                      },
                      {
                        tag: "td",
                        children: [
                          " אינטרס לגיטימי בהתגוננות מפני תביעות משפטיות. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["הנתונים האישיים המוזכרים לעיל."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " לצורך מיזוג, רכישה או פיצול, לרבות עם צדדים מחוץ לאיחוד האירופי. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " האינטרס הלגיטימי שלנו להתקשר בעסקאות עסקיות. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["נתוני שדרוג ומיזוג חשבון"],
                          },
                          " (תוכן משתמשים, מכשירים והעדפות) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" להעברת פעילות אורח לחשבון רשום. "],
                      },
                      {
                        tag: "td",
                        children: ["הסכמתכם והאינטרס הלגיטימי שלנו."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["אימות באמצעות דואר אלקטרוני"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "כתובת, שיוך לחשבון ולמכשיר, קודי אימות ומצבם ורשומות מניעת שימוש לרעה, להתחברות ולשחזור.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "אינטרס לגיטימי באימות חשבונות ובמניעת שימוש לרעה.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["מידע נגזר של ניתוח ודירוג"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "קבוצות דעה, העדפות ותוצאות, באמצעות קלט מספרי אישי: מטריצות הצבעה של Polis, בחירות BWS/pairwise והקצאות נקודות QV.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "הסכמה להשתתפות ולניתוח, עם תנאי נוסף לנתונים רגישים כשנדרש. המשך שמירה לאחר ביטול הסכמה מחייב בסיס משפטי עצמאי.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["מיזמים, ארגונים, מסמכים וייבוא"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "הרשאות, פרטי קשר, קבצים ותוכן לצורכי ניהול. ייבואים עשויים לכלול הצהרות, הצבעות, מזהי משתתפים וחותמות זמן של מי שאינם משתמשים.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "ביצוע השירותים שהתבקשו; אינטרסים לגיטימיים בהפעלת מיזמים וייבואים מורשים, בכפוף לזכויות האנשים המושפעים ולכל תנאי משפטי נוסף הנדרש.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "זיהוי שפה אוטומטי, סיוע אופציונלי של בינה מלאכותית (AI) ותרגום דינמי",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "טקסט, טיוטות שלא פורסמו, הצהרות או סיכומים ומטא־נתוני עיבוד, לזיהוי שפה, לתרגום שהתבקש ולהצעות ותיאורי AI.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "הבסיס המשפטי של התוכן שביסוד הפעולה; הסכמה מסוימת כשנדרשת לעיבוד אופציונלי.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "עדכוני שיחה בדואר אלקטרוני, כאשר הם מופעלים",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "כתובות, העדפות, שפה, היסטוריית מסירה, קישורי פעולה וביטולי הרשמה או תלונות, לעדכונים שנבחרו ולניהול המסירה.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "הסכמה ככל שהיא נדרשת לעדכונים אופציונליים; ביצוע פעולות העדפה שהתבקשו; אינטרסים לגיטימיים בתקינות המסירה ובמניעת הודעות בלתי רצויות או פוגעניות.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "רשומות מחיקה, שחזור ותיקים בעלי גישה מוגבלת",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "בקשות, בדיקות בעלות, מועדים וראיות מוגבלות על תיקים וניקוי, לשחזור, למחיקה ולמניעת השבה של נתונים שנמחקו.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "בקשתכם, חובות חוקיות ואינטרסים מוצדקים של אבטחה או תביעות משפטיות.",
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "תוכן ודפוסי הצבעה עשויים לחשוף דעות פוליטיות או מידע רגיש אחר, המחייב תנאי משפטי מתאים, לרבות הסכמה מפורשת כשנדרשת. הימנעו ממידע אישי מיותר על עצמכם או על אחרים.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["3. עם מי אנו משתפים את נתוניכם האישיים?"],
          },
          {
            tag: "p",
            children: [" 3.1. בהתאם לתכונה ולהרשאות, מקבלי המידע כוללים: "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["אתכם, לגישה לחשבון ולבקשות למימוש זכויות;"],
              },
              {
                tag: "li",
                children: [
                  "מבקרים, למידע פומבי ולייצואים המותרים שתוארו לעיל;",
                ],
              },
              {
                tag: "li",
                children: [
                  "מארגנים וצוות מורשים, לניהול, לתשובות מוגבלות, לייצוא ולפיקוח על תוכן. מארגנים אחראים לשימוש ולאיסוף הנוספים שלהם;",
                ],
              },
              {
                tag: "li",
                children: [
                  "אנשינו וספקינו, בכפוף להגבלות גישה ולהסדרי עיבוד מתאימים; וכן",
                ],
              },
              {
                tag: "li",
                children: [" רשויות כשהחשיפה נדרשת לפי דין. "],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. עיבוד מחוץ ל־EEA כולל AI ותרגום בארצות הברית ושירותי אימות ואבטחה גלובליים. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. כשנדרש, העברות מסתמכות על החלטות נאותות או מסגרות מאושרות החלות עליהן, או על סעיפים חוזיים סטנדרטיים עם אמצעי אבטחה רלוונטיים. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. פנו ל־legal@zkorum.com לפרטים על מקבלים ומיקומים ועל אמצעי ההגנה החלים על העברות, לרבות אמצעים חוזיים. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. אנו עשויים לשמור או לשתף נתונים מצרפיים אנונימיים. הסרת קישורים לחשבון אינה כשלעצמה מבטיחה אנונימיות: טקסט מזהה, דפוסים ותוצאות של קבוצות קטנות נשארים נתונים אישיים. ",
            ],
          },
          {
            tag: "p",
            children: [
              "3.6. אנו נותנים הוראות מחיקה, תיקון והגבלה והודעות למקבלים כנדרש, אך איננו יכולים למחוק מרחוק הורדות, פרסומים או עותקי מנועי חיפוש עצמאיים. ספקים עשויים לשמור רשומות למטרות חוקיות משלהם. תשובה למארגן משתפת עמו את כתובת הדואר האלקטרוני ואת ההודעה שלכם.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["4. למשך כמה זמן אנו שומרים את נתוניכם האישיים?"],
          },
          {
            tag: "p",
            children: [
              " 4.1. אנו שומרים נתוני חשבון כל עוד הם נחוצים למטרות סעיף 2. ביטול הסכמה מסיים עיבוד המבוסס עליה, אלא אם חל בסיס משפטי עצמאי. סעיף 6.7 מסביר על מחיקת חשבון ושחזורו. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. מחיקת חשבון שאושרה משביתה גישה ומוציאה את ההשתתפות מקלט לחישובים חיים חדשים. היא מסתירה טקסט, תרגומים וייחוס של הצהרות אישיות, גם בתצוגות היסטוריות. תוצאות פתוחות מתעדכנות באופן אסינכרוני. נתוני השחזור נשארים פרטיים במשך 15 ימים, ולאחר מכן מיועדים לניקוי סופי. ",
            ],
          },
          {
            tag: "p",
            children: [
              "אנו שומרים ללא הגבלת זמן את הקלט המספרי ששימש לתוצאות שנשמרו, לצורך ניתוח הצבעות וחישוב מחדש, ומסירים קישורים לחשבון בניקוי הסופי.",
            ],
          },
          {
            tag: "p",
            children: [
              "הניקוי מתבצע ללא דיחוי בלתי מוצדק, אך אינו חייב להסתיים במועד סיום השחזור. עיכובים אינם מאריכים את השחזור או מועדים חוקיים.",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. הקלט שנשמר הוא זה ששימש לתוצאות שנשמרו, לא כל הצבעה או חישוב. מחיקה רגילה אינה מחשבת מחדש מספרים שנשמרו; תיקונים נפרדים או ניתוח חוזר עשויים לשנותם. תיאורי AI היסטוריים אינם נכתבים מחדש אוטומטית; קטעים מזהים נשארים כפופים לזכויות מחיקה. מחיקה לפי דין מסירה את הפלט והתרגומים המושפעים או מוחקת מהם מידע, ללא יצירת תחליף. פתיחה מחדש אינה כוללת השתתפות שנמחקה או שקישורה נותק לצמיתות. מחיקת שיחה או מיזם מסירה תוצאות וקלט שבבעלותם הבלעדית. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. קבצים נשארים כל עוד המיזם שלהם או שימוש משותף תקף אחר זקוקים להם. ייצואים קיימים עשויים להכיל תוכן שנמחק לאחר מכן; ההורדות פוקעות לכל המאוחר 30 ימים לאחר היצירה, ללא הארכה. מחיקה רגילה אינה משכתבת אותם; ייצואים חדשים משקפים את מצב המחיקה הנוכחי. קבצים שפג תוקפם מנוקים בהקדם. בקשות מחיקה מסוימות מטופלות לפי סעיף 6. ",
            ],
          },
          {
            tag: "p",
            children: [
              "4.5. קודי אימות ואסימוני פעולה ושחזור פוקעים ומנוקים. רשומות נחוצות למניעת שימוש לרעה ולהוצאת אמצעי אימות משימוש נשארות למטרת ההגנה שלהן.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.6. העדפות דואר אלקטרוני, ביטולי הרשמה ורשומות מסירה נשארים לכיבוד הבחירות ולטיפול בכשלים. מחיקת חשבון מבטלת את קישוריכם ומסירה פרטי נמען שאינם נחוצים. נתוני אירועי מסירה גולמיים מנוקים לאחר עיבוד או פתרון כשל.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.7. יומני היישום ומסד הנתונים שלנו ב־CloudWatch נשמרים לתקופה מתגלגלת של 180 ימים; תקופות הספקים משתנות. מחיקת חשבון אינה מוחקת כל יומן. ראיות מוגבלות לתמיכה, פיקוח על תוכן, אבטחה או צורך משפטי עשויות להישאר זמן רב יותר למטרתן המסוימת, לא כארכיון של החשבון כולו.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.8. נתונים שנמחקו עשויים להישאר בגיבויים מוגבלים עד 30 ימים לאחר הסרתם בפועל מהמערכת הפעילה, ללא זמינות לשימוש רגיל. העתקה או שחזור אינם מתחילים תקופה זו מחדש; הוראות המחיקה מוחלות מחדש לפני חשיפת נתונים משוחזרים.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. כיצד אנו שומרים על אבטחת נתוניכם האישיים?"],
          },
          {
            tag: "p",
            children: [
              " אנו משתמשים בבקרות גישה מידתיות, בהצפנה, בגיבויים מוגבלים, במזעור נתונים ובניטור אבטחה. האימות משתמש בקודי אימות ובמפתחות קריפטוגרפיים, לא בסיסמאות חשבון שמורות. שום שירות אינו יכול להבטיח אבטחה מוחלטת. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. זכויותיכם בנוגע לנתוניכם האישיים"],
          },
          {
            tag: "p",
            children: [
              " 6.1. השתמשו בבקרות החשבון או פנו ל־legal@zkorum.com, גם לגבי נתונים מיובאים של מי שאינם משתמשים. אנו מאמתים זהות או בעלות באופן מידתי, לא בהכרח באמצעות מסמכי זיהוי. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2. בהתאם לעיבוד ולבסיס המשפטי, עומדות לכם הזכויות הבאות: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["הזכות לגשת לנתוניכם"],
              },
              {
                tag: "li",
                children: ["הזכות לתקן את נתוניכם"],
              },
              {
                tag: "li",
                children: ["הזכות להתנגד לעיבוד נתוניכם האישיים"],
              },
              {
                tag: "li",
                children: ["הזכות להגביל את עיבוד הנתונים"],
              },
              {
                tag: "li",
                children: ["הזכות למחיקת נתוניכם"],
              },
              {
                tag: "li",
                children: ["הזכות לבטל הסכמה שנתתם בעבר"],
              },
              {
                tag: "li",
                children: ["הזכות לנייד את נתוניכם"],
              },
              {
                tag: "li",
                children: [" הזכות להגיש תלונות לרשות המוסמכת להגנת נתונים. "],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. אנו מסבירים כל הגבלה על זכויות אלה המותרת או הנדרשת לפי דין. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. בקשות למימוש זכויות הן ללא תשלום. אנו משיבים ללא דיחוי בלתי מוצדק, בדרך כלל בתוך חודש. מורכבות או ריבוי בקשות עשויים לחייב עד חודשיים נוספים; נסביר כל הארכה במהלך החודש הראשון. בבקשות חסרות בסיס בעליל או מופרזות, עלינו להצדיק כל סירוב חוקי או תשלום סביר. תקופות המענה אינן מצדיקות עיכוב במחיקה נדרשת. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5. במסגרת הרשאותיכם, הבקרות מאפשרות לנהל תוכן והעדפות ולבטל או לשנות השתתפות נתמכת, בכפוף לכללי פעילות פתוחה או סגורה. מחיקת חשבון מסירה גם את תוכן ההצהרות האישיות שלכם; אין צורך למחוק אותן בנפרד. למחיקת תוכן עצמאית אין תקופת שחזור. ",
            ],
          },
          {
            tag: "p",
            children: [
              "ביטולי השתתפות אינם משנים תוצאות שנשמרו. לאחר ניתוק סופי, בקרות החשבון אינן מאפשרות לאחזר, לשנות או לבטל רשומות מספריות שקישורן נותק, וגם חשבון חדש אינו יכול להשיב אותן.",
            ],
          },
          {
            tag: "p",
            children: [
              "מחיקת מיזם כוללת את שיחותיו, מסמכיו והתוצאות והקלט שבבעלותו הבלעדית. מחיקת ארגון מחייבת העברה או מחיקה נפרדת של מיזמים בבעלותו הבלעדית; מיזמים בבעלות משותפת נשארים עם הבעלים האחרים. מחיקה אינה העברה הפיכה לארכיון.",
            ],
          },
          {
            tag: "h3",
            children: ["6.6. רשומות אבטחה:"],
          },
          {
            tag: "p",
            children: [
              " רשומות מוגבלות למניעת שימוש לרעה, חסימת אמצעי אימות, ביטול הרשמה וראיות למחיקה, אבטחה או צורך משפטי עשויות להישאר למטרותיהן המסוימות — לא הוכחות אימות מלאות, סודות אימות או עותק כללי של חשבונכם שנמחק. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. כיצד למחוק את חשבונכם:"],
          },
          {
            tag: "p",
            children: [
              " בקשו מחיקה באמצעות בקרות החשבון. אם אחריותכם בארגון מונעת מחיקה באמצעותן, פנו אלינו. בקשת מחיקה שאושרה מתחילה תקופת שחזור בת 15 ימים; בקשה שנדחתה אינה מתחילה אותה. סעיף 4 מסביר מה מוסתר, נמחק או נשמר. ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["עם אישור הבקשה:"],
                  },
                  " מושבים מבוטלים, ומשלוח דואר אלקטרוני ועבודה פרטית נוספים הקשורים לחשבון נפסקים; פעולות שכבר נשלחו לביצוע עשויות להסתיים. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["במהלך 15 הימים הבאים:"],
                  },
                  " שחזור מחייב אימות בעלות וביטול מפורש לפני המועד האחרון, באמצעות אמצעי אימות נתמך או מפתחות מכשיר האורח המקוריים. נתונים המיועדים לשחזור בלבד אינם זמינים בגישה רגילה, בתצוגות היסטוריות או בייצואים חדשים; ייצואים קיימים כפופים לסעיף 4.4. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["במועד האחרון, בתום 15 ימים:"],
                  },
                  " השחזור מסתיים. הניקוי מסיר נתוני חשבון ושחזור פרטיים, טקסט מקור ותרגומים של הצהרות אישיות וקישורים שאינם נחוצים. הצהרות מציגות הודעת מחיקה ללא ייחוס אליכם. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "שחזור משיב נתונים מותרים שהוסתרו רק עקב מחיקת החשבון, ולא מושבים שבוטלו, מחיקות עצמאיות, ביטולי השתתפות, מיזוגי אורח או החלטות פיקוח על תוכן.",
            ],
          },
          {
            tag: "p",
            children: [
              "ארגונים ומיזמים משותפים ותרומות של אחרים נשארים לאחר מחיקת החשבון. הצהרות פתיחה שבבעלות מיזם נשארות ללא ייחוס פומבי אליכם. מחיקתם מחייבת הרשאה נפרדת.",
            ],
          },
          {
            tag: "p",
            children: [
              " בקשות מחיקה מכוח הדין אינן מחייבות להמתין לסיום תקופת שחזור החשבון. מחיקת חשבון אינה ויתור על זכויותיכם להגנת נתונים לפי דין. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. הגישו תלונה ל־ ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              " או ישירות לרשות מוסמכת להגנת נתונים, לרבות CNIL בצרפת (",
              {
                tag: "a",
                children: ["www.cnil.fr"],
                href: "http://www.cnil.fr/",
                external: true,
              },
              "). ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["7. מידע חשוב לתושבי קליפורניה"],
          },
          {
            tag: "p",
            children: [
              " 7.1. לפי חוק פרטיות הצרכן של קליפורניה (CCPA), הקטגוריות שנאספו, שימשו ושותפו ב־12 החודשים האחרונים הן אלה שתוארו לעיל, למטרות שצוינו. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. לא מכרנו מידע אישי תמורת כסף או תמורה אחרת בעלת ערך. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. תוכלו לבקש גישה, מחיקה ומידע על נהלינו באמצעות סעיף 6. אנו מאמתים בקשות ועשויים לדרוש הוכחה שנציג מוסמך לפעול בשמכם. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. מימוש זכויות לא ישפיע על מחירים או על איכות השירות, אלא כשמותר לפי דין. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["8. שינויים במדיניות פרטיות זו"],
          },
          {
            tag: "p",
            children: [
              " נודיע לכם על שינויים מהותיים בפרטיות בדואר אלקטרוני או ב־Agora. ההודעה העדכנית ותאריך עדכונה זמינים באתר שלנו. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. האם יש לכם שאלות?"],
          },
          {
            tag: "p",
            children: [
              " פנו לאחראי הפרטיות שלנו: ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". ",
            ],
          },
        ],
      },
    ],
  },
  ja: {
    title: "プライバシーポリシー",
    automatedTranslationNotice: {
      title: "自動翻訳",
      statement:
        "本プライバシーポリシーは自動翻訳されたものです。英語版のみが正文であり、相違がある場合には英語版のみが優先して適用されます。",
      viewEnglish: "正文である英語版を表示",
      returnToTranslation: "翻訳版に戻る",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["最終更新日"],
          },
          ": 2026/10/14 (YYYY/MM/DD)",
        ],
      },
      {
        tag: "p",
        children: [
          " Agora Citizen Networkの開発元は ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          "です。 ",
        ],
      },
      {
        tag: "p",
        children: [
          " ZKorum SAS（「Agora」または「当社」）は、本通知に記載する個人データについて責任を負います。 ",
        ],
      },
      {
        tag: "p",
        children: [
          " 連絡先： ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          "。カリフォルニア州居住者の方は第7節をご覧ください。 ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["コンテンツの公開範囲と参加記録"],
          },
          {
            tag: "p",
            children: [
              " 公開されたコンテンツと結果は、アクセス制限に従うことを条件として、原則公開されます。一覧非掲載の対話もリンクからアクセスできる場合があり、検索対象からの除外は機密性を保証しません。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " アカウントなしで閲覧できます。参加方法は次のとおりです： ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["ゲスト："],
                  },
                  " 許可されている場合、端末ベースのアカウントで参加できます。保存された鍵を紛失すると、アクセスや復旧ができなくなる場合があります。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["登録済みアカウント："],
                  },
                  " 利用可能な確認方法は次のとおりです： ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["メールアドレス："],
                          },
                          " ワンタイムコードはアドレスを管理していることを証明しますが、身元や一人につき一つであることを証明しません。 ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["電話番号："],
                          },
                          " SMSで送信されるワンタイムコードで確認します。 ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "a",
                            children: ["Rarimo"],
                            href: "https://rarimo.com/privacy-notice.html",
                            external: true,
                          },
                          "：パスポートに基づくゼロ知識証明（ZKP）による確認 ",
                        ],
                      },
                    ],
                  },
                  " 対話によっては特定の方法が必要です。パスポート確認では参加資格に関する情報を開示しますが、パスポート画像、番号、氏名や顔写真は開示しません。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["アカウントのアップグレード："],
              },
              " ゲストの活動は登録済みアカウントに統合でき、登録済みアカウントの既存の選択が優先されます。統合は取り消せず、二つの登録済みアカウントを統合することはできません。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 選択または自動生成されたユーザー名は、公開コンテンツとともに表示される場合があり、実名である必要はありません。 ",
            ],
          },
          {
            tag: "h3",
            children: ["誰が利用者の情報を見ることができますか？"],
          },
          {
            tag: "p",
            children: [" アクセスできる範囲は活動と権限によって異なります： "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "公開コンテンツ、結果、ユーザー名、プロジェクト・組織の連絡先は、公開、複製または検索エンジンに登録される場合があります。",
                ],
              },
              {
                tag: "li",
                children: [
                  "認証情報、秘密鍵およびアカウント設定は公開しません。",
                ],
              },
              {
                tag: "li",
                children: [
                  " 参加情報は、切り離すまでアカウントに関連付けられます。参加者は自身のQV配分を取得できます。QV入力の保持は、個別の投票の公開や個別投票のエクスポートを可能にするものではありません。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  "個別のアンケート回答や、非表示処理前の集計を含む完全な結果には、所有者レベルの権限が必要です。公開集計では少人数のグループを非表示にする場合があります。",
                ],
              },
              {
                tag: "li",
                children: [
                  "有効な場合、端末ベースのゲストを含む、対話へのアクセス権を持つすべての人が、意見文、置き換えられた投稿者ID、タイムスタンプ、投票総数および許可されたアンケート集計を含む標準エクスポートを取得できます。",
                ],
              },
              {
                tag: "li",
                children: [
                  "提供される個別投票エクスポートには、選択、参加者ID、意見文への参照、タイムスタンプが含まれます。追加の参加情報の開示とその受領対象は適用前に説明し、必要な場合は同意を得ます。",
                ],
              },
              {
                tag: "li",
                children: [
                  " 通報、モデレーションの理由および関係者の識別情報は、権限を持つスタッフまたは主催者が利用できます。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 共通のエクスポートIDで、意見文、投票、アンケート回答を関連付けられます。IDを置き換えても、本文、タイムスタンプ、投票パターンや少人数のグループから参加者を特定できる場合があります。標準アンケートエクスポートは認証用メールアドレスを含みませんが、自由記述の回答には連絡先が含まれる場合があります。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " これらのルールはエクスポート形式を問いません。受領者は法令に従いファイルを保持、組合せ、再公開する場合があります。独立した複製については第3.6節で説明します。 ",
            ],
          },
          {
            tag: "h3",
            children: ["計画中のAT Protocolへの移行"],
          },
          {
            tag: "p",
            children: [
              " AT Protocolへの移行を行う場合、公開コンテンツ、個々の投票および識別子が、EEA域外を含むAgoraの管理外の独立したサービスと共有される可能性があります。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " アクセス制限付き対話の扱いは未定です。アクセス制御はエンドツーエンド暗号化ではなく、権限を持つ閲覧者によるデータの複製を防げません。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 移行前に変更と選択肢を説明し、本通知を更新し、必要な同意を得ます。これは、既存のアクセス制限付き参加情報の公開を許可するものではありません。 ",
            ],
          },
          {
            tag: "h3",
            children: ["第三者のサービス"],
          },
          {
            tag: "p",
            children: [
              " 事業者は、ネットワークアドレスを含む、サービスに必要な情報を処理します。各事業者の通知に処理内容が記載されています： ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Rarimo"],
                    href: "https://rarimo.com/privacy-notice.html",
                    external: true,
                  },
                  " （世界各地）は、ゼロ知識による本人確認の証明に用います。セキュリティおよびサービス運用のためにIPアドレスを処理する場合があります。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                  " はSMS確認と不正防止のため電話番号全体を受け取ります。Agoraは保護されたハッシュと、番号の一部・国の情報を保存します。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Cloudflare"],
                    href: "https://www.cloudflare.com/privacypolicy/",
                    external: true,
                  },
                  " は不正検出とサービス改善のためネットワーク・ブラウザーのシグナルを処理します。有効なプロキシ・セキュリティサービスも通信とコンテンツを扱います。次をご覧ください： ",
                  {
                    tag: "a",
                    children: ["Turnstileプライバシー補足規定"],
                    href: "https://www.cloudflare.com/turnstile-privacy-policy/",
                    external: true,
                  },
                  ". ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Amazon Web Services"],
                    href: "https://aws.amazon.com/privacy/",
                    external: true,
                  },
                  " は主にアイルランドでホスティング、ストレージ、メールおよび診断を提供し、米国でBedrock/MistralのAI処理を行います。メールには受信者アドレスとメッセージが必要で、AIには関連するテキストと文脈情報を用います。Bedrockの入力・出力全体のログ記録は無効です。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Google Cloud Platform"],
                    href: "https://cloud.google.com/terms/cloud-privacy-notice",
                    external: true,
                  },
                  " は任意の翻訳と、代替手段としての言語検出のため、米国でテキストを処理します。翻訳が無効の場合も含め、自動言語検出は無効にできません。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Plausible Analytics"],
                    href: "https://plausible.io/data-policy",
                    external: true,
                  },
                  " はページ情報と技術情報によるCookieを使わない分析を提供します。資格情報や下書きは用いません。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Sentry"],
                    href: "https://sentry.io/privacy/",
                    external: true,
                  },
                  " は当社のEU設定を通じ、診断情報とエラー時のマスキング済み操作リプレイを受け取ります。ブラウザー、ページ、ルート、操作およびネットワーク情報を含みます。マスキングは匿名性を保証しません。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 自社ホスティングのReacherはメールアドレス全体で有効性を確認し、メールサーバーや検証事業者に接続する場合があります。AI・翻訳の要求には付随するアカウント・連絡先の識別子を含めませんが、本文中の個人を識別する情報は除去しません。 ",
            ],
          },
          {
            tag: "h3",
            children: ["Cookieと分析"],
          },
          {
            tag: "p",
            children: [
              " 広告用またはサイト横断追跡用Cookieを使用せず、広告のためにデータを販売しません。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " ブラウザーのストレージには、消去されるまで鍵、セッション情報、設定、下書きが残ります。ローカル保存自体では下書きをアップロードしませんが、送信、インポート、要求したAI処理では関連入力を送信します。サーバー側の削除では、端末内のすべての複製を消去できません。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["1. 本プライバシーポリシーはいつ適用されますか？"],
          },
          {
            tag: "p",
            children: [
              " 本通知は、当社のウェブサイトやアプリの利用時、および当社への連絡時に適用されます。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. どの個人データを、どのような理由で処理しますか？"],
          },
          {
            tag: "p",
            children: [
              " 利用者、端末、主催者・インポートからデータを受け取ります。以下の表に目的と法的根拠を示し、第6節で利用者の権利を説明します。 ",
            ],
          },
          {
            tag: "table",
            children: [
              {
                tag: "thead",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "th",
                        children: ["どの個人データですか？"],
                      },
                      {
                        tag: "th",
                        children: ["何のためですか？"],
                      },
                      {
                        tag: "th",
                        children: ["法的根拠は何ですか？"],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "tbody",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["端末識別子とセッション"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 認証、復旧、不正防止のための公開鍵識別子、ブラウザー・端末情報、セッション状態。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["正当な利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["廃止されたイベントチケット確認の記録"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 過去の確認識別子、日付、メタデータ。アクセスや参加資格には、もはや使用しません。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["正当な利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["認証データ：電話番号"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 認証のための番号確認、保護されたハッシュ、番号の一部・国の情報、不正防止の記録。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["正当な利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "認証データ：パスポートのゼロ知識証明（Rarimo）",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 参加資格と所有者の確認のための、パスポート由来の一意性識別子、国籍、性別、年齢基準を満たす証明。完全な生年月日は含みません。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["正当な利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["アカウント情報"],
                          },
                          " （ユーザー名、言語、設定、状態、権限） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " アカウント、設定、権限、通知の管理のため。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["利用者の同意"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["利用者の行動"],
                          },
                          " （対話、意見文、賛成・反対・パスの投票、アンケートの選択・自由記述回答、最良・最悪の比較と一対比較、二次投票のクレジット配分） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 参加と結果のためのコンテンツ、選択、タイムスタンプ。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["利用者の同意"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["IPアドレス"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [" サービスの保護と攻撃の防止のため。 "],
                      },
                      {
                        tag: "td",
                        children: ["正当な利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["仮名化された技術データ"],
                          },
                          " （識別子、エラー、件数、所要時間、技術的な文脈情報） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 信頼性と安全性のため。インフラ・事業者のログには、ネットワーク、リクエスト、データベースに関する情報も含まれる場合があります。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["正当な利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["連絡"],
                          },
                          " （連絡先、メッセージ、通報、日付） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 利用者との連絡、要求・通報への対応のため。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 利用者と連絡する正当な利益。 "],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["上記の個人データ。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 法的義務と当局の適法な要求に従うため。 "],
                      },
                      {
                        tag: "td",
                        children: ["当社の法的義務。"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["上記の個人データ。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 不正行為、望まれないメッセージ、無許可の活動を防ぐため。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["当社の法的義務。"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["上記の個人データ。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "法的手続きにおいて当社を防御するためです。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 法的請求に対して防御する正当な利益。 "],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["上記の個人データ。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " EU域外の当事者を含む、合併、買収、会社分割のため。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 事業取引を行うことに関する当社の正当な利益。 ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "アカウントのアップグレード・統合に関するデータ",
                            ],
                          },
                          " （利用者のコンテンツ、端末、設定） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " ゲストの活動を登録済みアカウントへ移すため。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["利用者の同意および当社の正当な利益。"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["メールによる認証"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "ログインと復旧のためのアドレス、アカウント・端末との関連付け、確認コード・状態、不正防止の記録。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "アカウントの認証および不正利用防止に関する正当な利益。",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["派生する分析情報および順位付け情報"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "個別の数値入力（Polisの投票行列、BWS・pairwise（一対比較）の選択、QVのクレジット配分）を用いる意見グループ、選好、結果。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "参加と分析への同意、および必要な場合は機微なデータの追加条件。撤回後の継続保持には、独立した法的根拠が必要です。",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "プロジェクト、組織、文書およびインポート",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "管理のための権限、連絡先、ファイル、コンテンツ。インポートには、非利用者に関する意見文、投票、参加者識別子、タイムスタンプが含まれる場合があります。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "要求されたサービスの履行、および権限に基づくプロジェクト・インポートの運用に関する正当な利益。ただし、影響を受ける人々の権利および追加で必要となる法的条件に従います。",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "自動言語検出、任意のAI支援および動的翻訳",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "言語検出、要求された翻訳、AIの提案・説明のためのテキスト、未公開の下書き、意見文・要約、処理メタデータ。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "元のコンテンツに適用される法的根拠、および任意の処理について必要な場合の個別の同意。",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["対話のメール更新通知（有効な場合）"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "選択した更新通知と配信管理のためのアドレス、設定、言語、配信履歴、操作リンク、受信拒否・苦情。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "必要な場合の同意、要求された設定操作、信頼性が高く不正のない配信を行う正当な利益。",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "削除、復旧およびアクセス制限付きの事案記録",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "復旧、消去、消去済みデータの復元防止のための要求、所有者確認、期限、限定的な事案・消去処理の証拠。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "利用者の要求、法的義務、正当化されるセキュリティまたは法的請求に関する利益。",
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "コンテンツや投票パターンは政治的意見などの機微な情報を明らかにする場合があり、必要な場合の明示的同意を含む、適用可能な法的条件が必要です。ご自身や他の人の不要な個人情報は提供しないでください。",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["3. 個人データは誰と共有しますか？"],
          },
          {
            tag: "p",
            children: [
              " 3.1. 機能と権限に応じて、受領者には次の者が含まれます： ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "アカウントへのアクセスと権利の請求のための利用者ご本人。",
                ],
              },
              {
                tag: "li",
                children: [
                  "上記の公開情報と許可されたエクスポートを受け取る閲覧者。",
                ],
              },
              {
                tag: "li",
                children: [
                  "管理、アクセス制限付きの回答、エクスポート、モデレーションを行う権限のある主催者・スタッフ。主催者はその後の利用と収集について責任を負います。",
                ],
              },
              {
                tag: "li",
                children: [
                  "適切なアクセス制限と処理者との取決めが適用される当社の担当者および事業者。ならびに",
                ],
              },
              {
                tag: "li",
                children: [" 法令により開示が必要な場合の当局。 "],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. 欧州経済領域（EEA）域外の処理には、米国のAI・翻訳、および世界各地の確認・セキュリティサービスが含まれます。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. 必要な場合、移転は、適用される十分性認定や承認済みの枠組み、または関連する安全措置を伴う標準契約条項に基づきます。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. 受領者・所在地の詳細、および契約上の保護措置を含む移転の保護措置については、legal@zkorum.comまでお問い合わせください。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. 匿名の集計情報を保持・共有する場合があります。アカウントとの関連付けの除去だけでは匿名性を保証しません。個人を識別する本文、パターン、少人数グループの結果は引き続き個人データです。 ",
            ],
          },
          {
            tag: "p",
            children: [
              "3.6. 必要な消去・訂正・制限の指示と受領者への通知を行いますが、独立したダウンロード、公開物、検索エンジンの複製を遠隔消去することはできません。事業者は独自の適法な目的で記録を保持する場合があります。主催者に返信すると、メールアドレスとメッセージが共有されます。",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["4. 個人データはどのくらいの期間保持しますか？"],
          },
          {
            tag: "p",
            children: [
              " 4.1. 第2節の目的に必要な間、アカウントデータを保持します。同意の撤回により、独立した法的根拠がある場合を除き、同意に基づく処理を終了します。アカウントの削除と復旧は第6.7節で説明します。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. アカウント削除が受理されると、アクセスが無効になり、参加情報は新たな稼働中の計算の対象外になります。過去の表示も含め、個人の意見文の本文、翻訳、投稿者表示を非表示にします。進行中の結果は非同期で更新します。復旧用データは15日間非公開で保持し、その後、恒久的な消去処理の対象とします。 ",
            ],
          },
          {
            tag: "p",
            children: [
              "保存済み結果の数値入力は、投票の分析と再計算のため無期限に保持し、恒久的な消去処理の際にアカウントとの関連付けを除去します。",
            ],
          },
          {
            tag: "p",
            children: [
              "消去処理は不当な遅滞なく進めますが、復旧期限までに完了するとは限りません。遅延しても復旧期間や法定期限は延長されません。",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. 保持するのは保存済み結果に使用した入力であり、すべての投票や計算ではありません。通常の削除では保存済み数値を再計算しませんが、別途の訂正や再分析により変わる場合があります。過去のAI説明は自動的には書き換えませんが、個人を識別する引用には引き続き消去の権利が適用されます。適用される消去では、代替を生成せずに、対象の出力・翻訳を削除または伏字処理します。再開時には削除済みまたは恒久的に切り離された参加情報を除外します。対話・プロジェクトの削除では、それが単独で所有する結果と入力を削除します。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. ファイルは、そのプロジェクトまたは他の有効な共有用途で必要な間、保持します。既存のエクスポートには後から削除されたコンテンツが含まれる場合があります。ダウンロードは生成後最長30日で期限切れとなり、延長しません。通常の削除ではそれらを書き換えず、新しいエクスポートには現在の削除状態を反映します。期限切れファイルは速やかに消去処理します。個別の消去要求は第6節に従います。 ",
            ],
          },
          {
            tag: "p",
            children: [
              "4.5. 確認コードと操作・復旧用トークンは期限切れとなり、消去処理します。必要な不正防止と資格情報の使用終了の記録は、保護目的のため保持します。",
            ],
          },
          {
            tag: "p",
            children: [
              "4.6. メール設定、受信拒否、配信記録は、選択の尊重と失敗の解決のため保持します。アカウント削除で利用者のリンクを無効にし、不要な受信者情報を除去します。未加工の配信イベントデータは、処理または失敗の解決後に消去します。",
            ],
          },
          {
            tag: "p",
            children: [
              "4.7. 当社のCloudWatchアプリケーション・データベースログは直近180日間保持します。事業者の保持期間は異なります。アカウント削除ですべてのログが消去されるわけではありません。アクセス制限付きのサポート、モデレーション、セキュリティ、法的証拠は、個別の目的でさらに長く残る場合がありますが、アカウント全体のアーカイブではありません。",
            ],
          },
          {
            tag: "p",
            children: [
              "4.8. 消去されたデータは、現用システムからの実際の除去後、アクセス制限付きバックアップに最長30日間残る場合があり、通常の利用には使用できません。複製・復元でこの期間が再起算されることはなく、復元データを公開する前に削除指示を再適用します。",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. 個人データの安全性をどのように確保しますか？"],
          },
          {
            tag: "p",
            children: [
              " 必要性に見合ったアクセス制御、暗号化、アクセス制限付きバックアップ、データ最小化、セキュリティ監視を用います。認証には保存されたアカウントパスワードではなく、確認コードと暗号鍵を使います。絶対的な安全性を保証できるサービスはありません。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. 個人データに関する利用者の権利"],
          },
          {
            tag: "p",
            children: [
              " 6.1. アカウント操作機能をご利用いただくか、legal@zkorum.comまでご連絡ください。非利用者に関するインポートデータも対象です。必要性に見合った本人・所有者確認を行いますが、必ずしも本人確認書類を用いるわけではありません。 ",
            ],
          },
          {
            tag: "p",
            children: [" 6.2. 処理と法的根拠に応じて、次の権利があります： "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["自身のデータにアクセスする権利"],
              },
              {
                tag: "li",
                children: ["自身のデータを訂正する権利"],
              },
              {
                tag: "li",
                children: ["個人データの処理に異議を申し立てる権利"],
              },
              {
                tag: "li",
                children: ["データの処理を制限する権利"],
              },
              {
                tag: "li",
                children: ["自身のデータの消去を求める権利"],
              },
              {
                tag: "li",
                children: ["以前に与えた同意を撤回する権利"],
              },
              {
                tag: "li",
                children: ["自身のデータを移転する権利"],
              },
              {
                tag: "li",
                children: [
                  " 権限を持つデータ保護当局に苦情を申し立てる権利。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. 法令が認め、または要求する権利の制限がある場合は説明します。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. 権利の請求は無料です。不当な遅滞なく、通常1か月以内に回答します。複雑さや件数により追加で最長2か月を要する場合は、最初の1か月以内に延長を説明します。明らかに根拠を欠く、または過度な要求について適法に拒否し、もしくは合理的な手数料を請求する場合、当社がその理由を示す必要があります。回答期間は、必要な消去を遅らせる根拠にはなりません。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5. 権限の範囲内で、コンテンツ・設定の管理と、対応する参加情報の撤回・変更ができます。進行中・終了後のルールに従います。アカウント削除でも個人の意見文の情報を伏せるため、意見文を別途削除する必要はありません。個別のコンテンツ削除には復旧期間がありません。 ",
            ],
          },
          {
            tag: "p",
            children: [
              "撤回は保存済み結果を書き換えません。恒久的な関連付け解除後は、アカウント操作機能で切り離された数値記録を取得、変更、撤回できず、新しいアカウントで取り戻すこともできません。",
            ],
          },
          {
            tag: "p",
            children: [
              "プロジェクトの削除は、その中の対話、文書、それが単独で所有する結果・入力を対象とします。組織の削除には、単独所有のプロジェクトの移転または別途の削除が必要です。共同所有のプロジェクトは他の所有者の下で存続します。削除は元に戻せるアーカイブではありません。",
            ],
          },
          {
            tag: "h3",
            children: ["6.6. セキュリティ記録："],
          },
          {
            tag: "p",
            children: [
              " 限定的な不正防止、ブロック済み資格情報、受信拒否、および消去・セキュリティ・法的証拠は、個別の目的のため残る場合があります。完全な認証証明、確認用の秘密情報、削除済みアカウントの包括的な複製ではありません。 ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. アカウントの削除方法："],
          },
          {
            tag: "p",
            children: [
              " アカウント操作機能から削除を要求してください。組織に対する責務により削除できない場合は当社にご連絡ください。受理された削除要求で15日間の復旧期間が始まり、拒否された要求では始まりません。非表示、消去、保持の対象は第4節で説明します。 ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["受理時："],
                  },
                  " セッションを失効させ、その後のアカウント関連メール・非公開処理を停止します。既に送出された処理は完了する場合があります。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["その後の15日間："],
                  },
                  " 復旧には、対応する資格情報または元のゲスト端末鍵を用い、期限前に所有者を確認して明示的に取り消す必要があります。復旧専用データは、通常のアクセス、過去の表示、新しいエクスポートから除外します。既存エクスポートは第4.4節に従います。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["15日間の期限到来時："],
                  },
                  " 復旧が終了します。消去処理では、非公開のアカウント・復旧用データ、個人の意見文の元の本文と翻訳、不要な関連付けを除去します。意見文には、利用者の投稿者表示を伴わない削除通知を表示します。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "復旧は、アカウント削除だけを理由に非表示になった、本来許可されるデータを戻します。失効したセッション、個別の削除、撤回、ゲストの統合、モデレーションの判断は元に戻しません。",
            ],
          },
          {
            tag: "p",
            children: [
              "共有の組織・プロジェクトや他者の投稿は、アカウント削除後も存続します。プロジェクト所有の初期意見文は利用者の公開の投稿者表示なしで残ります。それらの削除には別途の権限が必要です。",
            ],
          },
          {
            tag: "p",
            children: [
              " 法律上の消去要求に、アカウントの復旧期間の満了を待つ必要はありません。アカウント削除は、法律上のデータ保護の権利の放棄を意味しません。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. 苦情は次の宛先へ： ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              "、またはフランスのCNILなど、管轄のデータ保護当局へ直接申し立てることができます (",
              {
                tag: "a",
                children: ["www.cnil.fr"],
                href: "http://www.cnil.fr/",
                external: true,
              },
              "). ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["7. カリフォルニア州居住者向けの重要事項"],
          },
          {
            tag: "p",
            children: [
              " 7.1. カリフォルニア州消費者プライバシー法（CCPA）に基づき、過去12か月間に収集、使用、共有した情報の種類は、上記のとおりで、記載した目的のためのものです。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. 金銭その他の価値ある対価と引き換えに個人情報を販売したことはありません。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. 第6節を通じて、アクセス、削除、当社の取扱いに関する情報を要求できます。当社は要求を確認し、代理人には利用者を代理する権限の証明を求める場合があります。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. 権利の行使により料金やサービス品質が変わることはありません。ただし、法令が認める場合を除きます。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["8. 本プライバシーポリシーの変更"],
          },
          {
            tag: "p",
            children: [
              " プライバシーに関する重要な変更は、メールまたはAgora内で通知します。最新の通知と更新日は当社のウェブサイトで確認できます。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. ご質問はありますか？"],
          },
          {
            tag: "p",
            children: [
              " プライバシー管理責任者の連絡先： ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". ",
            ],
          },
        ],
      },
    ],
  },
  ky: {
    title: "Купуялык саясаты",
    automatedTranslationNotice: {
      title: "Автоматтык котормо",
      statement:
        "Бул купуялык саясаты автоматтык түрдө которулган. Англис тилиндеги нуска гана расмий күчкө ээ жана кандайдыр бир айырмачылык болсо, ошол нуска гана артыкчылыкка ээ болот.",
      viewEnglish: "Расмий англис тилиндеги нусканы көрүү",
      returnToTranslation: "Которулган нускага кайтуу",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["Акыркы жаңыртылган күнү"],
          },
          ": 2026/10/14 (YYYY/MM/DD)",
        ],
      },
      {
        tag: "p",
        children: [
          " Agora Citizen Network тармагын иштеп чыккан — ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          ". ",
        ],
      },
      {
        tag: "p",
        children: [
          " ZKorum SAS («Agora» же «биз») бул билдирүүдө сүрөттөлгөн жеке маалыматтар үчүн жооптуу. ",
        ],
      },
      {
        tag: "p",
        children: [
          " Байланыш: ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". Калифорниянын тургундары: 7-бөлүмдү караңыз. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["Мазмундун көрүнүшү жана катышуу жазуулары"],
          },
          {
            tag: "p",
            children: [
              " Жарыяланган мазмун жана жыйынтыктар, жеткиликтүүлүк чектөөлөрүн эске алуу менен, адатта жалпыга ачык. Тизмеге кирбеген талкуулар шилтеме аркылуу жеткиликтүү калышы мүмкүн; издөөдөн чыгаруу аларды купуя кылбайт. ",
            ],
          },
          {
            tag: "p",
            children: [" Аккаунтсуз карап чыга аласыз. Катышуу үчүн: "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Коноктор:"],
                  },
                  " Уруксат берилген жерде түзмөккө негизделген аккаунт аркылуу катышыңыз. Анын сакталган ачкычтарын жоготуу кирүүгө же калыбына келтирүүгө тоскоол болушу мүмкүн. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Катталган аккаунттар:"],
                  },
                  " Жеткиликтүү текшерүү ыкмалары: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["Электрондук почта дареги:"],
                          },
                          " Бир жолку код адамдын кимдигин же кайталангыс экенин эмес, дарекке ээликти далилдейт. ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["Телефон номери:"],
                          },
                          " SMS аркылуу жөнөтүлгөн бир жолку код менен текшерилет ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "a",
                            children: ["Rarimo"],
                            href: "https://rarimo.com/privacy-notice.html",
                            external: true,
                          },
                          ": паспортко негизделген нөлдүк билим далили (ZKP) аркылуу текшерүү ",
                        ],
                      },
                    ],
                  },
                  " Талкуулар белгилүү бир ыкманы талап кылышы мүмкүн. Паспорт аркылуу текшерүү паспортуңуздун сүрөтүн, номерин, аты-жөнүңүздү же фотосүрөтүңүздү эмес, катышуу талаптарына ылайыктуулук маалыматын ачат. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["Аккаунтту катталган түргө өткөрүү:"],
              },
              " Коноктун аракеттерин катталган аккаунтка бириктирүүгө болот; катталган аккаунттагы учурдагы тандоолор артыкчылыкка ээ. Бириктирүү кайтарылгыс жана эки катталган аккаунтту бириктире албайт. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Сиз тандаган же түзүлгөн колдонуучу аты жарыяланган мазмун менен көрсөтүлүшү мүмкүн; ал чыныгы аты-жөнүңүз болушу шарт эмес. ",
            ],
          },
          {
            tag: "h3",
            children: ["Маалыматыңызды ким көрө алат?"],
          },
          {
            tag: "p",
            children: [
              " Жеткиликтүүлүк аракетке жана уруксаттарга жараша болот: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "Жарыяланган мазмун, жыйынтыктар, колдонуучу аттары жана долбоордун/уюмдун байланыш маалыматтары жалпыга ачык болуп, көчүрүлүшү же индекстелиши мүмкүн.",
                ],
              },
              {
                tag: "li",
                children: [
                  "Аутентификациялык маалыматтар, купуя ачкычтар жана аккаунттун жөндөөлөрү жарыяланбайт.",
                ],
              },
              {
                tag: "li",
                children: [
                  " Катышуу ажыратылганга чейин аккаунтка байланышкан бойдон калат. Катышуучулар өздөрүнүн QV бөлүштүрүүлөрүн ала алышат; QV киргизүүлөрүн сактоо жеке бюллетендерди жарыялабайт жана аларды өзүнчө экспорттоого жол бербейт. ",
                ],
              },
              {
                tag: "li",
                children: [
                  "Сурамжылоонун жеке жооптору жана толук жыйынтыктары, анын ичинде жашырылбаган топтолгон жыйынтыктар, ээсинин деңгээлиндеги уруксатты талап кылат. Жалпыга ачык топтолгон жыйынтыктарда чакан топтор жашырылышы мүмкүн.",
                ],
              },
              {
                tag: "li",
                children: [
                  "Экспорт иштетилген жерде талкууга кире алган ар ким, анын ичинде түзмөккө негизделген коноктор, билдирүүлөрдү, кайра белгиленген автор ID белгилерин, убакыт белгилерин, добуштардын жалпы сандарын жана сурамжылоонун уруксат берилген топтолгон жыйынтыктарын камтыган стандарттуу экспортторду ала алат.",
                ],
              },
              {
                tag: "li",
                children: [
                  "Сунушталган жерде жеке добуштардын экспорттору тандоолорду, катышуучу ID белгилерин, билдирүүлөргө шилтемелерди жана убакыт белгилерин камтыйт. Катышуу тууралуу кошумча ачылыштар жана аларды алуучулар колдонулганга чейин түшүндүрүлүп, талап кылынган жерде макулдук алынат.",
                ],
              },
              {
                tag: "li",
                children: [
                  " Даттануулар, модерациянын себептери жана тиешелүү адамдардын кимдиги уруксат берилген кызматкерлерге же уюштуруучуларга жеткиликтүү. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Экспорттогу жалпы ID белгилери билдирүүлөрдү, добуштарды жана сурамжылоонун жоопторун байланыштырышы мүмкүн. ID белгилери кайра белгиленсе да, текст, убакыт белгилери, добуш берүү үлгүлөрү же чакан топтор катышуучуну аныктоого мүмкүндүк бериши мүмкүн. Сурамжылоонун стандарттуу экспортторуна аутентификациялык электрондук почта даректери кирбейт, бирок эркин тексттик жооптор байланыш маалыматтарын камтышы мүмкүн. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Бул эрежелер экспорттун форматына карабастан колдонулат. Алуучулар мыйзамга ылайык файлдарды сактап, бириктирип же кайра жарыялай алышат; көз карандысыз көчүрмөлөр 3.6-бөлүмдө түшүндүрүлөт. ",
            ],
          },
          {
            tag: "h3",
            children: ["AT Protocol протоколуна пландалган көчүү"],
          },
          {
            tag: "p",
            children: [
              " AT Protocol протоколуна мүмкүн болгон көчүү жалпыга ачык мазмунду, жеке добуштарды жана идентификаторлорду Agora көзөмөлдөбөгөн көз карандысыз кызматтарга, анын ичинде EEA аймагынан тышкары жактарга өткөрүшү мүмкүн. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Жеткиликтүүлүгү чектелген талкуулардын тартиби азырынча чечиле элек. Жеткиликтүүлүктү көзөмөлдөө баштан-аяк шифрлөө эмес жана уруксат берилген окурмандардын маалыматты көчүрүшүнө тоскоол боло албайт. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Көчүүдөн мурун өзгөрүүлөрдү жана тандоолорду түшүндүрүп, бул билдирүүнү жаңыртабыз жана талап кылынган макулдукту алабыз. Бул учурдагы чектелген катышууну жарыялоого уруксат бербейт. ",
            ],
          },
          {
            tag: "h3",
            children: ["Үчүнчү тараптын кызматтары"],
          },
          {
            tag: "p",
            children: [
              " Кызмат көрсөтүүчүлөр өз кызматтарына керектүү маалыматты, анын ичинде тармактык даректерди иштетет. Алардын билдирүүлөрү бул иштетүүнү түшүндүрөт: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Rarimo"],
                    href: "https://rarimo.com/privacy-notice.html",
                    external: true,
                  },
                  " (дүйнөлүк) кимдиктин нөлдүк билим далилдери үчүн. Коопсуздук жана кызматтын иштеши үчүн IP даректерин иштетиши мүмкүн. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                  " SMS аркылуу текшерүү жана кыянат пайдалануунун алдын алуу үчүн толук номериңизди алат. Agora корголгон хэшти жана номер/өлкө тууралуу жарым-жартылай маалыматты сактайт. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Cloudflare"],
                    href: "https://www.cloudflare.com/privacypolicy/",
                    external: true,
                  },
                  " кыянат пайдаланууну аныктоо жана кызматты жакшыртуу үчүн тармактын/браузердин сигналдарын иштетет. Иштетилген прокси/коопсуздук кызматтары трафикти жана мазмунду да иштетет. Төмөнкүнү караңыз: ",
                  {
                    tag: "a",
                    children: ["Turnstile купуялык боюнча кошумчасы"],
                    href: "https://www.cloudflare.com/turnstile-privacy-policy/",
                    external: true,
                  },
                  ". ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Amazon Web Services"],
                    href: "https://aws.amazon.com/privacy/",
                    external: true,
                  },
                  " хостинг, сактоо, электрондук почта жана диагностиканы адатта Ирландияда, ал эми Bedrock/Mistral AI иштетүүсүн АКШда камсыздайт. Электрондук почтага алуучулардын даректери жана билдирүүлөр керек; AI тиешелүү текстти жана контекстти колдонот. Bedrock киргизүүлөрүн/чыгарууларын толук журналга жазуу өчүрүлгөн. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Google Cloud Platform"],
                    href: "https://cloud.google.com/terms/cloud-privacy-notice",
                    external: true,
                  },
                  " кошумча котормо жана тилди аныктоонун резервдик ыкмасы үчүн текстти АКШда иштетет. Автоматтык аныктоону, анын ичинде котормо өчүрүлгөндө да, өчүрүүгө болбойт. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Plausible Analytics"],
                    href: "https://plausible.io/data-policy",
                    external: true,
                  },
                  " ырастоочу маалыматтарды же чиймелерди эмес, барак жана техникалык маалыматты колдонуп, кукилерсиз талдоо жүргүзөт. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Sentry"],
                    href: "https://sentry.io/privacy/",
                    external: true,
                  },
                  " биздин EU жөндөөлөрү аркылуу диагностиканы жана ката болгондо жөнөтүлгөн, маалыматы жашырылган өз ара аракеттенүү кайталоолорун алат; аларга браузер, барак, маршрут, аракеттер жана тармак тууралуу маалымат кирет. Жашыруу анонимдүүлүктү кепилдебейт. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Өз инфраструктурабыздагы Reacher толук дарегиңиз аркылуу электрондук почтанын жарактуулугун текшерип, почта серверлерине же текшерүү кызматтарына кайрылышы мүмкүн. AI/котормо өтүнүчтөрүнө коштоочу аккаунт жана байланыш идентификаторлору кошулбайт, бирок тексттин ичиндеги адамды аныктоочу маалымат алынбайт. ",
            ],
          },
          {
            tag: "h3",
            children: ["Кукилер жана талдоо"],
          },
          {
            tag: "p",
            children: [
              " Жарнамалык же сайттар аралык көз салуучу кукилерди колдонбойбуз жана маалыматты жарнама үчүн сатпайбыз. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Браузердин сактагычында ачкычтар, сеанс маалыматы, каалоолор жана чиймелер тазаланганга чейин сакталат. Жергиликтүү сактоо чиймелерди өзүнөн өзү жүктөбөйт; тапшыруу, импорт же суралган AI иштетүүсү тиешелүү киргизүүнү жөнөтөт. Серверден өчүрүү түзмөктөгү ар бир жергиликтүү көчүрмөнү өчүрө албайт. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["1. Бул купуялык саясаты качан колдонулат?"],
          },
          {
            tag: "p",
            children: [
              " Бул билдирүү вебсайтыбызды же тиркемелерибизди пайдаланганыңызда же бизге кайрылганыңызда колдонулат. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. Кайсы жеке маалыматтарды иштетебиз жана эмне үчүн?"],
          },
          {
            tag: "p",
            children: [
              " Маалыматты сизден, түзмөгүңүздөн жана уюштуруучулардан/импорттордон алабыз. Таблицада максаттар жана укуктук негиздер көрсөтүлөт; укуктарыңыз 6-бөлүмдө түшүндүрүлөт. ",
            ],
          },
          {
            tag: "table",
            children: [
              {
                tag: "thead",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "th",
                        children: ["Кайсы жеке маалыматтар?"],
                      },
                      {
                        tag: "th",
                        children: ["Эмне үчүн?"],
                      },
                      {
                        tag: "th",
                        children: ["Укуктук негиз?"],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "tbody",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Түзмөктүн идентификаторлору жана сеанстар",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Аутентификация, калыбына келтирүү жана кыянат пайдалануунун алдын алуу үчүн ачык ачкычтын идентификаторлору, браузер/түзмөк маалыматы жана сеанс абалы. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Мыйзамдуу кызыкчылык"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Колдонуудан чыгарылган иш-чара билеттеринин жазуулары",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Мурунку текшерүү идентификаторлору, даталар жана метамаалыматтар; кирүү же жарамдуулук үчүн эми колдонулбайт. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Мыйзамдуу кызыкчылык"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Аутентификациялык маалыматтар — телефон номери",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Аутентификация үчүн номерди текшерүү, корголгон хэш, номер/өлкө тууралуу жарым-жартылай маалымат жана кыянат пайдаланууга каршы жазуулар. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Мыйзамдуу кызыкчылык"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Аутентификациялык маалыматтар — паспорттун нөлдүк билим далили (Rarimo)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Жарамдуулукту жана ээликти текшерүү үчүн паспорттон алынган кайталангыс идентификатор, жарандык, жыныс жана жаш чегине жеткендик далили; туулган күндүн толук датасы алынбайт. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Мыйзамдуу кызыкчылык"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Аккаунт маалыматы"],
                          },
                          " (Колдонуучу аты, тилдер, каалоолор, абал жана уруксаттар) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Аккаунтуңузду, каалоолоруңузду, уруксаттарды жана эскертмелерди башкаруу үчүн. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Сиздин макулдугуңуз"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Сиздин аракеттериңиз"],
                          },
                          " (Талкуулар, билдирүүлөр, макул/каршы/өткөрүп жиберүү добуштары, сурамжылоонун тандоолору/эркин тексттик жооптору, мыкты/начар жана pairwise жуптук салыштыруулар, квадраттык добуш берүүдөгү кредит бөлүштүрүүлөрү) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Катышуу жана жыйынтыктар үчүн мазмун, тандоолор жана убакыт белгилери. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Сиздин макулдугуңуз"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["IP дареги"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Кызматты коргоо жана чабуулдардын алдын алуу үчүн. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Мыйзамдуу кызыкчылык"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Псевдонимдүү техникалык маалыматтар"],
                          },
                          " (Идентификаторлор, каталар, сандар, убакыт көрсөткүчтөрү жана техникалык контекст) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Ишенимдүүлүк жана коопсуздук үчүн. Инфраструктуранын/кызмат көрсөтүүчүнүн журналдары тармак, суроо-талап же маалымат базасынын контекстин да камтышы мүмкүн. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Мыйзамдуу кызыкчылык"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Байланыш"],
                          },
                          " (Байланыш маалыматы, билдирүүлөр, даттануулар жана даталар) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Сиз менен байланышуу жана өтүнүчтөрдү же даттанууларды кароо үчүн. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Сиз менен байланышууга болгон мыйзамдуу кызыкчылык. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Жогоруда аталган жеке маалыматтар."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Мыйзамдык милдеттерди жана бийлик органдарынын мыйзамдуу талаптарын аткаруу үчүн. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Биздин мыйзамдык милдетибиз."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Жогоруда аталган жеке маалыматтар."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Алдамчылыктын, керексиз билдирүүлөрдүн жана уруксатсыз аракеттердин алдын алуу үчүн. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Биздин мыйзамдык милдетибиз."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Жогоруда аталган жеке маалыматтар."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Сот өндүрүшүндө өзүбүздү коргоо үчүн."],
                      },
                      {
                        tag: "td",
                        children: [
                          " Укуктук доолордон коргонууга болгон мыйзамдуу кызыкчылык. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Жогоруда аталган жеке маалыматтар."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Биригүү, сатып алуу же бөлүнүү үчүн, анын ичинде EU аймагынан тышкаркы тараптар менен. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Ишкердик бүтүмдөргө болгон мыйзамдуу кызыкчылык. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Аккаунтту катталган түргө өткөрүү/бириктирүү маалыматы",
                            ],
                          },
                          " (Колдонуучунун мазмуну, түзмөктөрү жана каалоолору) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Коноктун аракеттерин катталган аккаунтка өткөрүү үчүн. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Сиздин макулдугуңуз жана биздин мыйзамдуу кызыкчылыгыбыз.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Электрондук почта аркылуу аутентификация",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Кирүү жана калыбына келтирүү үчүн дарек, аккаунт/түзмөк байланышы, текшерүү коддору/абалы жана кыянат пайдаланууга каршы жазуулар.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Аккаунттун аутентификациясына жана кыянат пайдалануунун алдын алууга болгон мыйзамдуу кызыкчылык.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Талдоодон жана иреттөөдөн алынган маалымат",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Жеке сандык киргизүүлөрдү: Polis добуш матрицаларын, BWS/pairwise тандоолорун жана QV кредит бөлүштүрүүлөрүн колдонгон пикир топтору, каалоолор жана жыйынтыктар.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Катышууга жана талдоого макулдук; талап кылынган жерде сезимтал маалыматтар үчүн кошумча шарт колдонулат. Макулдукту кайтарып алгандан кийин сактоону улантууга өз алдынча укуктук негиз керек.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Долбоорлор, уюмдар, документтер жана импорттор",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Башкаруу үчүн уруксаттар, байланыштар, файлдар жана мазмун. Импорттор колдонуучу эмес адамдардын билдирүүлөрүн, добуштарын, катышуучу идентификаторлорун жана убакыт белгилерин камтышы мүмкүн.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Суралган кызматтар жана уруксат берилген долбоорлорго/импортторго болгон мыйзамдуу кызыкчылыктар; тиешелүү адамдардын укуктары жана талап кылынган кошумча укуктук шарттар сакталат.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Тилди автоматтык аныктоо, кошумча AI жардамы жана динамикалык котормо",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Тилди аныктоо, суралган котормо жана AI сунуштары/сүрөттөмөлөрү үчүн текст, жарыяланбаган чиймелер, билдирүүлөр/кыскача баяндар жана иштетүү метамаалыматтары.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Баштапкы мазмундун укуктук негизи; кошумча иштетүү үчүн талап кылынган жерде өзүнчө макулдук.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Иштетилген жерде талкуу тууралуу электрондук почта жаңылыктары",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Тандалган жаңылыктар жана жеткирүүнү башкаруу үчүн даректер, каалоолор, тил, жеткирүү тарыхы, аракет шилтемелери жана баш тартуулар/даттануулар.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Талап кылынган жерде макулдук; суралган каалоо өзгөртүүлөрү; ишенимдүү жана кыянат пайдалануусуз жеткирүүгө болгон мыйзамдуу кызыкчылыктар.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Өчүрүү, калыбына келтирүү жана чектелген иштердин жазуулары",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Калыбына келтирүү, өчүрүү жана өчүрүлгөн маалыматтын кайра калыбына келишин алдын алуу үчүн өтүнүчтөр, ээликти текшерүүлөр, акыркы мөөнөттөр жана иш/тазалоо боюнча чектелген далилдер.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Сиздин өтүнүчүңүз, мыйзамдык милдеттер жана негизделген коопсуздук же укуктук доо кызыкчылыктары.",
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "Мазмун жана добуш берүү үлгүлөрү саясий көз караштарды же башка сезимтал маалыматты ачышы мүмкүн; аларга колдонулуучу укуктук шарт, анын ичинде талап кылынган жерде ачык макулдук керек. Өзүңүз же башкалар тууралуу керексиз жеке маалыматты бербеңиз.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["3. Жеке маалыматтарыңызды ким менен бөлүшөбүз?"],
          },
          {
            tag: "p",
            children: [
              " 3.1. Мүмкүнчүлүккө жана уруксаттарга жараша алуучулар: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "Аккаунтка кирүү жана укуктар боюнча өтүнүчтөр үчүн — өзүңүз;",
                ],
              },
              {
                tag: "li",
                children: [
                  "Жогоруда сүрөттөлгөн жалпыга ачык маалымат жана уруксат берилген экспорттор үчүн — келүүчүлөр;",
                ],
              },
              {
                tag: "li",
                children: [
                  "Башкаруу, чектелген жооптор, экспорттор жана модерация үчүн — уруксат берилген уюштуруучулар/кызматкерлер. Уюштуруучулар маалыматты кийинки пайдалануусу жана чогултуусу үчүн жооптуу;",
                ],
              },
              {
                tag: "li",
                children: [
                  "Тиешелүү жеткиликтүүлүк чектөөлөрү жана маалыматты иштетүү келишимдери менен — биздин кызматкерлер жана кызмат көрсөтүүчүлөр; жана",
                ],
              },
              {
                tag: "li",
                children: [
                  " Мыйзам талап кылган ачылыштар үчүн — бийлик органдары. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. EEA аймагынан тышкары иштетүүгө АКШдагы AI/котормо жана дүйнөлүк текшерүү/коопсуздук кызматтары кирет. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. Талап кылынган жерде өткөрүп берүү колдонулуучу коргоонун жетиштүүлүгү жөнүндө чечимдерге, бекитилген алкактарга же тиешелүү коопсуздук чаралары коштолгон стандарттуу келишимдик жоболорго негизделет. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. Алуучулар/жайгашкан жерлер жана колдонулуучу өткөрүп берүү кепилдиктери, анын ичинде келишимдик кепилдиктер тууралуу маалымат үчүн legal@zkorum.com дарегине кайрылыңыз. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. Анонимдүү топтолгон жыйынтыктарды сакташыбыз же бөлүшүшүбүз мүмкүн. Аккаунт менен байланыштарды алып салуу өзүнөн өзү анонимдүүлүктү кепилдебейт: адамды аныктоочу текст, үлгүлөр жана чакан топтордун жыйынтыктары жеке маалымат бойдон калат. ",
            ],
          },
          {
            tag: "p",
            children: [
              "3.6. Талап кылынган өчүрүү/оңдоо/чектөө көрсөтмөлөрүн жана алуучуларга билдирүүлөрдү жөнөтөбүз, бирок көз карандысыз жүктөлгөн, жарыяланган же издөө системасындагы көчүрмөлөрдү алыстан өчүрө албайбыз. Кызмат көрсөтүүчүлөр жазууларды өздөрүнүн мыйзамдуу максаттары үчүн сакташы мүмкүн. Уюштуруучуга жооп берүү электрондук почта дарегиңизди жана билдирүүңүздү ага ачат.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["4. Жеке маалыматтарыңызды канча убакыт сактайбыз?"],
          },
          {
            tag: "p",
            children: [
              " 4.1. Аккаунт маалыматын 2-бөлүмдөгү максаттар үчүн керек болгончо сактайбыз. Өз алдынча укуктук негиз болбосо, макулдукту кайтарып алуу макулдукка негизделген иштетүүнү токтотот. Аккаунтту өчүрүү жана калыбына келтирүү 6.7-бөлүмдө түшүндүрүлөт. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. Кабыл алынган аккаунтту өчүрүү кирүүнү токтотуп, катышууну жаңы учурдагы эсептөөлөргө жараксыз кылат. Жеке билдирүүлөрдүн тексти, котормолору жана авторлук маалыматы, анын ичинде тарыхый көрүнүштөрдө да жашырылат. Ачык жыйынтыктар асинхрондуу жаңыртылат. Калыбына келтирүү маалыматтары 15 күн купуя сакталып, андан кийин биротоло тазалоого жарамдуу болот. ",
            ],
          },
          {
            tag: "p",
            children: [
              "Сакталган жыйынтыктардын сандык киргизүүлөрүн добуш берүүнү талдоо жана кайра эсептөө үчүн мөөнөтсүз сактайбыз; биротоло тазалоодо аккаунт менен байланыштар алынат.",
            ],
          },
          {
            tag: "p",
            children: [
              "Тазалоо негизсиз кечиктирбестен жүргүзүлөт, бирок калыбына келтирүүнүн акыркы мөөнөтүндө аякташы шарт эмес. Кечигүү калыбына келтирүү же мыйзамдык мөөнөттөрдү узартпайт.",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. Сакталган киргизүүлөр — ар бир бюллетень же эсептөө эмес, сакталган жыйынтыктарда колдонулгандары. Кадимки өчүрүү сакталган сандарды кайра эсептебейт; өзүнчө оңдоолор же кайра талдоо аларды өзгөртүшү мүмкүн. Тарыхый AI сүрөттөмөлөрү автоматтык түрдө кайра жазылбайт; адамды аныктоочу үзүндүлөргө өчүрүү укуктары колдонулат. Тиешелүү өчүрүү алмаштыруучу натыйжа түзбөстөн жабыркаган натыйжаны/котормолорду алып салат же алардан маалыматты өчүрөт. Кайра ачууда өчүрүлгөн же биротоло ажыратылган катышуу эсепке алынбайт. Талкууну/долбоорду өчүрүү ага гана таандык жыйынтыктарды жана киргизүүлөрдү алып салат. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. Файлдар долбооруна же башка жарактуу биргелешкен колдонууга керек болгончо сакталат. Учурдагы экспорттор кийин өчүрүлгөн мазмунду камтышы мүмкүн; жүктөө мүмкүнчүлүгү түзүлгөндөн кийин узартылбастан эң көп 30 күндө аяктайт. Кадимки өчүрүү аларды кайра жазбайт; жаңы экспорттор өчүрүүнүн учурдагы абалын колдонот. Мөөнөтү бүткөн файлдар тез арада тазаланат. Өзүнчө өчүрүү өтүнүчтөрүнө 6-бөлүм колдонулат. ",
            ],
          },
          {
            tag: "p",
            children: [
              "4.5. Текшерүү коддорунун жана аракет/калыбына келтирүү токендеринин мөөнөтү бүтүп, алар тазаланат. Кыянат пайдаланууга каршы жана ырастоочу маалыматтарды колдонуудан чыгаруу боюнча зарыл жазуулар коргоо максаты үчүн сакталат.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.6. Электрондук почта каалоолору, баш тартуулар жана жеткирүү жазуулары тандоолорду аткаруу жана каталарды чечүү үчүн сакталат. Аккаунтту өчүрүү шилтемелериңизди жараксыз кылып, алуучу тууралуу керексиз маалыматты алып салат. Жеткирүү окуяларынын чийки маалыматтары иштетилгенден же ката чечилгенден кийин тазаланат.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.7. CloudWatch тиркеме/маалымат базасы журналдарыбыз жылма 180 күндүк мөөнөткө сакталат; кызмат көрсөтүүчүлөрдүн мөөнөттөрү ар башка. Аккаунтту өчүрүү ар бир журналды өчүрбөйт. Колдоо, модерация, коопсуздук же укуктук далилдер боюнча чектелген жазуулар толук аккаунт архиви катары эмес, өзүнүн белгилүү максаты үчүн узагыраак сакталышы мүмкүн.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.8. Өчүрүлгөн маалыматтар иштеп жаткан тутумдан алынгандан кийин эң көп 30 күн чектелген камдык көчүрмөлөрдө калышы мүмкүн жана кадимки колдонууга жеткиликсиз болот. Көчүрүү/калыбына келтирүү бул мөөнөттү кайра баштабайт; калыбына келтирилген маалымат ачылганга чейин өчүрүү көрсөтмөлөрү кайра колдонулат.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. Жеке маалыматтарыңызды кантип коргойбуз?"],
          },
          {
            tag: "p",
            children: [
              " Өлчөмдөш жеткиликтүүлүк көзөмөлүн, шифрлөөнү, чектелген камдык көчүрмөлөрдү, маалыматты минималдаштырууну жана коопсуздук мониторингин колдонобуз. Аутентификацияда сакталган аккаунт сырсөздөрү эмес, текшерүү коддору жана криптографиялык ачкычтар колдонулат. Эч бир кызмат абсолюттук коопсуздукту кепилдей албайт. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. Жеке маалыматтарыңызга байланыштуу укуктарыңыз"],
          },
          {
            tag: "p",
            children: [
              " 6.1. Аккаунттун башкаруу каражаттарын колдонуңуз же legal@zkorum.com дарегине, анын ичинде колдонуучу эмес адамдар тууралуу импорттолгон маалымат боюнча да кайрылыңыз. Кимдикти же ээликти өлчөмдөш текшеребиз; кимдик документтери сөзсүз талап кылынбайт. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2. Иштетүүгө жана укуктук негизге жараша төмөнкү укуктарыңыз бар: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["маалыматтарыңызга жетүү укугу"],
              },
              {
                tag: "li",
                children: ["маалыматтарыңызды оңдоо укугу"],
              },
              {
                tag: "li",
                children: [
                  "жеке маалыматтарыңыздын иштетилишине каршы чыгуу укугу",
                ],
              },
              {
                tag: "li",
                children: ["маалыматтарды иштетүүнү чектөө укугу"],
              },
              {
                tag: "li",
                children: ["маалыматтарыңызды өчүртүүгө укук"],
              },
              {
                tag: "li",
                children: ["мурда берген макулдугуңузду кайтарып алуу укугу"],
              },
              {
                tag: "li",
                children: ["маалыматтарыңызды өткөрүп алуу укугу"],
              },
              {
                tag: "li",
                children: [
                  " маалыматтарды коргоо боюнча ыйгарым укуктуу органга даттануу укугу. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. Бул укуктарга мыйзам жол берген же талап кылган чектөөлөрдү түшүндүрөбүз. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. Укуктар боюнча өтүнүчтөр акысыз. Негизсиз кечиктирбестен, адатта бир айдын ичинде жооп беребиз. Татаалдык же көп өтүнүч дагы эки айга чейинки узартууну талап кылышы мүмкүн; узартууну биринчи айдын ичинде түшүндүрөбүз. Ачык эле негизсиз же ашыкча өтүнүчтөргө мыйзамдуу баш тартууну же акылга сыярлык төлөмдү негиздөөгө милдеттүүбүз. Жооп берүү мөөнөттөрү талап кылынган өчүрүүнү кечиктирүүгө негиз болбойт. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5. Уруксаттарыңыздын чегинде башкаруу каражаттары мазмунду/каалоолорду башкарууга жана ачык/жабык эрежелерге ылайык колдоого алынган катышууну кайтарып алууга же өзгөртүүгө мүмкүндүк берет. Аккаунтту өчүрүү жеке билдирүүлөрүңүздөн да маалыматты алып салат; аларды өзүнчө өчүрүүнүн кереги жок. Мазмунду өз алдынча өчүрүүдө калыбына келтирүү мөөнөтү жок. ",
            ],
          },
          {
            tag: "p",
            children: [
              "Катышууну кайтарып алуу сакталган жыйынтыктарды кайра жазбайт. Байланыш биротоло алынгандан кийин аккаунттун башкаруу каражаттары ажыратылган сандык жазууларды алууга, өзгөртүүгө же кайтарып алууга мүмкүндүк бербейт; жаңы аккаунт да аларды өзүнө кайтарып байланыштыра албайт.",
            ],
          },
          {
            tag: "p",
            children: [
              "Долбоорду өчүрүү анын талкууларын, документтерин жана өзүнө гана таандык жыйынтыктарын/киргизүүлөрүн камтыйт. Уюмду өчүрүү үчүн жалгыз өзүнө таандык долбоорлор өткөрүлүшү же өзүнчө өчүрүлүшү керек; биргелешкен долбоорлор башка ээлеринде калат. Өчүрүү кайтарылуучу архивдөө эмес.",
            ],
          },
          {
            tag: "h3",
            children: ["6.6. Коопсуздук жазуулары:"],
          },
          {
            tag: "p",
            children: [
              " Кыянат пайдаланууга каршы, бөгөттөлгөн ырастоочу маалымат, баш тартуу жана өчүрүү/коопсуздук/укуктук далилдердин чектелген жазуулары өз максаттары үчүн сакталышы мүмкүн; бул толук аутентификация далилдери, текшерүү сырлары же өчүрүлгөн аккаунттун жалпы көчүрмөсү эмес. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. Аккаунтуңузду кантип өчүрсө болот:"],
          },
          {
            tag: "p",
            children: [
              " Аккаунттун башкаруу каражаттары аркылуу өчүрүүнү сураңыз. Уюмдагы милдеттериңиз бул каражаттар аркылуу аккаунтту өчүрүүгө жол бербесе, бизге кайрылыңыз. Кабыл алынган өчүрүү өтүнүчү 15 күндүк калыбына келтирүү мөөнөтүн баштайт; четке кагылган өтүнүч баштабайт. Эмне жашырылып, өчүрүлүп же сакталары 4-бөлүмдө түшүндүрүлөт. ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Кабыл алынганда:"],
                  },
                  " Сеанстар жокко чыгарылып, аккаунтка байланыштуу кийинки электрондук почта/купуя иштер токтойт; буга чейин жөнөтүлгөн аракеттер аякташы мүмкүн. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Кийинки 15 күндө:"],
                  },
                  " Калыбына келтирүү үчүн колдоого алынган ырастоочу маалымат же коноктун баштапкы түзмөк ачкычтары менен ээлик текшерилип, акыркы мөөнөткө чейин өчүрүү ачык түрдө жокко чыгарылышы керек. Калыбына келтирүүгө гана керектүү маалымат кадимки кирүүдөн, тарыхый көрүнүштөрдөн жана жаңы экспорттордон чыгарылат; учурдагы экспортторго 4.4-бөлүм колдонулат. ",
                ],
              },
              {
                tag: "li",
                children: [
                  { tag: "strong", children: ["15 күндүк акыркы мөөнөттө:"] },
                  " Калыбына келтирүү аяктайт. Тазалоо купуя аккаунт/калыбына келтирүү маалыматтарын, жеке билдирүүлөрдүн баштапкы текстин жана котормолорун, керексиз байланыштарды алып салат. Билдирүүлөрдө сиздин авторлук маалыматыңызсыз өчүрүү тууралуу белги көрсөтүлөт. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "Калыбына келтирүү аккаунт өчүрүлгөндүктөн гана жашырылган, башка жагынан уруксат берилген маалыматты калыбына келтирет; жокко чыгарылган сеанстарды, өзүнчө өчүрүүлөрдү, катышууну кайтарып алууларды, конок бириктирүүлөрүн же модерациянын чечимдерин калыбына келтирбейт.",
            ],
          },
          {
            tag: "p",
            children: [
              "Жалпы уюмдар/долбоорлор жана башкалардын салымдары аккаунт өчүрүлгөндө сакталат. Долбоорго таандык баштапкы билдирүүлөр сиздин жалпыга ачык авторлук маалыматыңызсыз сакталат. Аларды өчүрүү өзүнчө уруксатты талап кылат.",
            ],
          },
          {
            tag: "p",
            children: [
              " Мыйзамдагы өчүрүү өтүнүчтөрү аккаунтту калыбына келтирүү мөөнөтүнүн бүтүшүн күтүүнү талап кылбайт. Аккаунтту өчүрүү мыйзамдагы маалыматтарды коргоо укуктарыңыздан баш тартуу эмес. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. Даттануу үчүн ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              " дарегине же маалыматтарды коргоо боюнча ыйгарым укуктуу органга, анын ичинде Франциянын CNIL органына түз кайрылыңыз (",
              {
                tag: "a",
                children: ["www.cnil.fr"],
                href: "http://www.cnil.fr/",
                external: true,
              },
              "). ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["7. Калифорниянын тургундары үчүн маанилүү маалымат"],
          },
          {
            tag: "p",
            children: [
              " 7.1. California Consumer Privacy Act (CCPA) мыйзамына ылайык, акыркы 12 айда чогултулган, колдонулган жана бөлүшүлгөн маалымат категориялары жана алардын максаттары жогоруда сүрөттөлгөн. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. Жеке маалыматты акчага же башка баалуу акыга саткан эмеспиз. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. Жетүү, өчүрүү жана иштөө тартибибиз тууралуу маалыматты 6-бөлүм аркылуу сурай аласыз. Өтүнүчтөрдү текшеребиз жана өкүлдүн сиздин атыңыздан аракеттенүүгө укуктуу экенине далил талап кылышыбыз мүмкүн. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. Укуктарды пайдалануу мыйзам жол берген учурлардан тышкары баага же кызматтын сапатына таасир этпейт. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["8. Бул купуялык саясатына өзгөртүүлөр"],
          },
          {
            tag: "p",
            children: [
              " Купуялыктагы олуттуу өзгөрүүлөрдү электрондук почта же Agora аркылуу билдиребиз. Акыркы билдирүү жана анын жаңыртылган датасы вебсайтыбызда жеткиликтүү. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. Суроолоруңуз барбы?"],
          },
          {
            tag: "p",
            children: [
              " Купуялык боюнча жооптуу жетекчибизге кайрылыңыз: ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". ",
            ],
          },
        ],
      },
    ],
  },
  ru: {
    title: "Политика конфиденциальности",
    automatedTranslationNotice: {
      title: "Автоматический перевод",
      statement:
        "Настоящая политика конфиденциальности переведена автоматически. Единственной юридически определяющей версией является английская версия; в случае любых расхождений преимущественную силу имеет исключительно она.",
      viewEnglish: "Открыть юридически определяющую английскую версию",
      returnToTranslation: "Вернуться к переведённой версии",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["Дата последнего обновления"],
          },
          ": 2026/10/14 (YYYY/MM/DD)",
        ],
      },
      {
        tag: "p",
        children: [
          " Разработчиком Agora Citizen Network является ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          ". ",
        ],
      },
      {
        tag: "p",
        children: [
          " ZKorum SAS («Agora», «мы» или «нас») отвечает за персональные данные, описанные в настоящем уведомлении. ",
        ],
      },
      {
        tag: "p",
        children: [
          " Контакт: ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". Жителям Калифорнии: см. раздел 7. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["Видимость контента и сведения об участии"],
          },
          {
            tag: "p",
            children: [
              " Опубликованный контент и результаты, как правило, общедоступны с учётом ограничений доступа. Обсуждения, не включённые в списки, могут оставаться доступными по ссылке; исключение из поиска не делает их конфиденциальными. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Просматривать контент можно без учётной записи. Для участия: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Гости:"],
                  },
                  " Если разрешено, участвуйте через учётную запись, привязанную к устройству. Потеря сохранённых ключей может сделать доступ или восстановление невозможными. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Зарегистрированные учётные записи:"],
                  },
                  " Доступные способы проверки: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["Адрес электронной почты:"],
                          },
                          " Одноразовый код подтверждает владение адресом, а не личность или уникальность человека. ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["Номер телефона:"],
                          },
                          " Подтверждается одноразовым кодом, отправленным в SMS ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "a",
                            children: ["Rarimo"],
                            href: "https://rarimo.com/privacy-notice.html",
                            external: true,
                          },
                          ": проверка на основе паспорта с использованием доказательства с нулевым разглашением (ZKP) ",
                        ],
                      },
                    ],
                  },
                  " Для обсуждения может требоваться определённый способ проверки. Проверка по паспорту раскрывает сведения о соответствии условиям участия, но не изображение или номер паспорта, ваше имя или фотографию. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["Расширение учётной записи:"],
              },
              " Гостевую активность можно объединить с зарегистрированной учётной записью; уже сделанные в ней выборы имеют приоритет. Объединение необратимо и не позволяет объединить две зарегистрированные учётные записи. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Выбранное или сгенерированное имя пользователя может отображаться рядом с опубликованным контентом; оно не обязано быть вашим настоящим именем. ",
            ],
          },
          {
            tag: "h3",
            children: ["Кто может видеть вашу информацию?"],
          },
          {
            tag: "p",
            children: [" Доступ зависит от активности и полномочий: "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "Опубликованный контент, результаты, имена пользователей и контакты проектов и организаций могут быть общедоступны, скопированы или проиндексированы.",
                ],
              },
              {
                tag: "li",
                children: [
                  "Данные аутентификации, закрытые ключи и настройки учётной записи не публикуются.",
                ],
              },
              {
                tag: "li",
                children: [
                  " Участие связано с учётной записью до удаления этой связи. Участники могут получать собственные распределения кредитов QV; сохранение входных данных QV не публикует индивидуальные бюллетени и не разрешает их экспорт. ",
                ],
              },
              {
                tag: "li",
                children: [
                  "Для доступа к индивидуальным ответам на опросы и полным результатам, включая агрегаты без скрытия данных, требуются полномочия уровня владельца. В публичных агрегатах данные малых групп могут скрываться.",
                ],
              },
              {
                tag: "li",
                children: [
                  "Если экспорт включён, любой имеющий доступ к обсуждению, включая гостей с привязанными к устройствам учётными записями, может получить стандартные экспортные файлы с утверждениями, переназначенными идентификаторами авторов, временными метками, итогами голосования и разрешёнными агрегатами опросов.",
                ],
              },
              {
                tag: "li",
                children: [
                  "Экспорт индивидуальных голосов, если доступен, включает выборы, идентификаторы участников, ссылки на утверждения и временные метки. Дополнительное раскрытие участия и круг получателей объясняются до их применения, с получением согласия, когда оно необходимо.",
                ],
              },
              {
                tag: "li",
                children: [
                  " Жалобы, основания модерации и соответствующие сведения о личности доступны уполномоченным сотрудникам или организаторам. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Общие идентификаторы экспорта могут связывать утверждения, голоса и ответы на опросы. Текст, временные метки, характер голосования или малые группы могут позволить установить личность участников, несмотря на переназначенные идентификаторы. Стандартный экспорт опросов не включает адреса электронной почты для аутентификации, но ответы в свободной форме могут содержать контактные данные. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Эти правила действуют независимо от формата экспорта. Получатели могут сохранять, объединять или повторно публиковать файлы в рамках закона; независимые копии описаны в разделе 3.6. ",
            ],
          },
          {
            tag: "h3",
            children: ["Планируемый переход на AT Protocol"],
          },
          {
            tag: "p",
            children: [
              " Возможный переход на AT Protocol может привести к передаче публичного контента, индивидуальных голосов и идентификаторов независимым сервисам вне контроля Agora, в том числе за пределами ЕЭЗ. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Порядок работы обсуждений с ограниченным доступом пока не определён. Контроль доступа не является сквозным шифрованием и не может помешать уполномоченным читателям копировать данные. ",
            ],
          },
          {
            tag: "p",
            children: [
              " До перехода мы объясним изменения и варианты выбора, обновим уведомление и получим необходимое согласие. Это не разрешает публиковать существующие сведения об участии с ограниченным доступом. ",
            ],
          },
          {
            tag: "h3",
            children: ["Сторонние сервисы"],
          },
          {
            tag: "p",
            children: [
              " Поставщики обрабатывают информацию, необходимую для их услуг, включая сетевые адреса. Обработка описана в их уведомлениях: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Rarimo"],
                    href: "https://rarimo.com/privacy-notice.html",
                    external: true,
                  },
                  " (работает по всему миру) для доказательств личности с нулевым разглашением. Может обрабатывать IP-адреса для обеспечения безопасности и работы сервиса. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                  " получает полный номер для проверки по SMS и предотвращения злоупотреблений. Agora хранит защищённый хеш и частичные сведения о номере и стране. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Cloudflare"],
                    href: "https://www.cloudflare.com/privacypolicy/",
                    external: true,
                  },
                  " обрабатывает сетевые и браузерные сигналы для выявления злоупотреблений и улучшения сервиса. Включённые сервисы проксирования и безопасности также обрабатывают трафик и контент. См. ",
                  {
                    tag: "a",
                    children: ["Дополнение Turnstile о конфиденциальности"],
                    href: "https://www.cloudflare.com/turnstile-privacy-policy/",
                    external: true,
                  },
                  ". ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Amazon Web Services"],
                    href: "https://aws.amazon.com/privacy/",
                    external: true,
                  },
                  " предоставляет хостинг, хранение, электронную почту и диагностику, как правило, в Ирландии, а обработку ИИ Bedrock/Mistral — в США. Для электронной почты нужны адреса получателей и сообщения; ИИ использует соответствующий текст и контекст. Полное журналирование входных и выходных данных Bedrock отключено. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Google Cloud Platform"],
                    href: "https://cloud.google.com/terms/cloud-privacy-notice",
                    external: true,
                  },
                  " обрабатывает текст в США для необязательного перевода и резервного определения языка. Автоматическое определение нельзя отключить, даже если перевод выключен. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Plausible Analytics"],
                    href: "https://plausible.io/data-policy",
                    external: true,
                  },
                  " предоставляет аналитику без файлов cookie на основе сведений о страницах и технической информации, а не учётных данных или черновиков. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Sentry"],
                    href: "https://sentry.io/privacy/",
                    external: true,
                  },
                  " получает диагностику и записи взаимодействий с маскированием, отправляемые при ошибках, через нашу конфигурацию в ЕС, включая сведения о браузере, странице, маршруте, взаимодействиях и сети. Маскирование не гарантирует анонимность. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Размещённый у нас Reacher проверяет действительность электронной почты по полному адресу и может обращаться к почтовым серверам или поставщикам проверок. Запросы ИИ и перевода не включают сопутствующие идентификаторы учётной записи и контактные данные, но не удаляют идентифицирующие сведения внутри текста. ",
            ],
          },
          {
            tag: "h3",
            children: ["Файлы cookie и аналитика"],
          },
          {
            tag: "p",
            children: [
              " Мы не используем рекламные файлы cookie или файлы cookie для межсайтового отслеживания и не продаём данные для рекламы. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Хранилище браузера сохраняет ключи, сведения о сеансах, настройки и черновики до очистки. Само локальное сохранение не загружает черновики на сервер; отправка, импорт или запрошенная обработка ИИ передают соответствующие входные данные. Удаление на сервере не может стереть все локальные копии на устройствах. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: [
              "1. Когда применяется настоящая политика конфиденциальности?",
            ],
          },
          {
            tag: "p",
            children: [
              " Это уведомление применяется, когда вы пользуетесь нашим веб-сайтом или приложениями либо связываетесь с нами. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. Какие персональные данные мы обрабатываем и зачем?"],
          },
          {
            tag: "p",
            children: [
              " Мы получаем данные от вас, вашего устройства, организаторов и из импорта. В таблице указаны цели и правовые основания; ваши права описаны в разделе 6. ",
            ],
          },
          {
            tag: "table",
            children: [
              {
                tag: "thead",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "th",
                        children: ["Какие персональные данные?"],
                      },
                      {
                        tag: "th",
                        children: ["Для чего?"],
                      },
                      {
                        tag: "th",
                        children: ["Правовое основание?"],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "tbody",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Идентификатор устройства (DID — децентрализованный идентификатор)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Идентификаторы открытых ключей, сведения о браузере и устройстве и состояние сеанса для аутентификации, восстановления и предотвращения злоупотреблений. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Законный интерес"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Неактивные записи о билетах на мероприятия",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Исторические идентификаторы проверок, даты и метаданные; больше не используются для доступа или определения права на участие. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Законный интерес"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Данные аутентификации — номер телефона",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Проверка номера, защищённый хеш, частичные сведения о номере и стране и записи противодействия злоупотреблениям для аутентификации. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Законный интерес"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Данные аутентификации — доказательство с нулевым разглашением на основе паспорта (Rarimo)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Полученный на основе паспорта идентификатор уникальности, гражданство, пол и доказательство достижения возрастного порога для проверки права на участие и владения учётной записью, без полной даты рождения. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Законный интерес"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Информация об учётной записи"],
                          },
                          " (Имя пользователя, языки, настройки, статус и полномочия) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Для управления учётной записью, настройками, полномочиями и уведомлениями. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Ваше согласие"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Ваши действия"],
                          },
                          " (Обсуждения, утверждения, голоса «согласен»/«не согласен»/«пропускаю», варианты и ответы в свободной форме в опросах, выбор лучшего и худшего варианта и попарные сравнения, распределение кредитов при квадратичном голосовании) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Контент, выборы и временные метки для участия и результатов. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Ваше согласие"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["IP-адрес"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Для защиты сервиса и предотвращения атак. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Законный интерес"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Псевдонимные технические данные"],
                          },
                          " (Идентификаторы, ошибки, количественные показатели, данные о времени и технический контекст) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Для надёжности и безопасности. Журналы инфраструктуры и поставщиков также могут содержать сведения о сети, запросах или базе данных. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Законный интерес"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Общение"],
                          },
                          " (Контактные данные, сообщения, жалобы и даты) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Для общения с вами и рассмотрения запросов или жалоб. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" Законный интерес в общении с вами. "],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Указанные выше персональные данные."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Для исполнения юридических обязанностей и законных запросов органов власти. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Наша юридическая обязанность."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Указанные выше персональные данные."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Для предотвращения мошенничества, нежелательных сообщений и несанкционированной активности. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Наша юридическая обязанность."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Указанные выше персональные данные."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Для защиты наших интересов в судебных разбирательствах.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Законный интерес в защите по правовым требованиям. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Указанные выше персональные данные."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Для слияния, приобретения или разделения, в том числе со сторонами за пределами ЕС. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Законный интерес в коммерческих сделках. ",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Данные расширения или объединения учётных записей",
                            ],
                          },
                          " (Пользовательский контент, устройства и настройки) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Для переноса гостевой активности в зарегистрированную учётную запись. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Ваше согласие и наш законный интерес."],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["Аутентификация по электронной почте"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Адрес, связь с учётной записью и устройством, коды и статус проверки и записи противодействия злоупотреблениям для входа и восстановления.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Законный интерес в аутентификации учётных записей и предотвращении злоупотреблений.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Производные сведения анализа и ранжирования",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Группы мнений, предпочтения и результаты на основе индивидуальных числовых входных данных: матриц голосования Polis, выборов BWS/pairwise и распределения кредитов QV.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Согласие на участие и анализ, с дополнительным условием для чувствительных данных, когда оно необходимо. Продолжение хранения после отзыва согласия требует самостоятельного правового основания.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Проекты, организации, документы и импорт",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Полномочия, контакты, файлы и контент для администрирования. Импорт может включать утверждения, голоса, идентификаторы участников и временные метки о людях, не являющихся пользователями.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Предоставление запрошенных услуг; законные интересы в ведении разрешённых проектов и импорте с учётом прав затронутых лиц и любого дополнительного правового условия, которое требуется.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Автоматическое определение языка, необязательная помощь ИИ (AI) и динамический перевод",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Текст, неопубликованные черновики, утверждения и краткие изложения, метаданные обработки для определения языка, запрошенного перевода и предложений или описаний ИИ.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Правовое основание обработки исходного контента; отдельное согласие, когда оно необходимо для необязательной обработки.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Обновления обсуждений по электронной почте, если функция включена",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Адреса, настройки, язык, история доставки, ссылки действий и отказы от рассылки или жалобы для выбранных обновлений и управления доставкой.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Согласие, когда необходимо; запрошенные действия с настройками; законные интересы в надёжной доставке без злоупотреблений.",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "Записи об удалении, восстановлении и делах с ограниченным доступом",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Запросы, проверки владения, сроки и ограниченные подтверждения по делам и очистке для восстановления, удаления и предотвращения возврата удалённых данных.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Ваш запрос, юридические обязанности и обоснованные интересы безопасности или защиты по правовым требованиям.",
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "Контент и характер голосования могут раскрывать политические взгляды или другую чувствительную информацию, для чего необходимо применимое правовое условие, включая явное согласие, когда оно требуется. Не указывайте ненужную персональную информацию о себе или других людях.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["3. С кем мы делимся вашими персональными данными?"],
          },
          {
            tag: "p",
            children: [
              " 3.1. В зависимости от функции и полномочий получателями могут быть: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "Вы — для доступа к учётной записи и запросов о реализации прав;",
                ],
              },
              {
                tag: "li",
                children: [
                  "Посетители — для публичной информации и разрешённого экспорта, описанных выше;",
                ],
              },
              {
                tag: "li",
                children: [
                  "Уполномоченные организаторы и сотрудники — для администрирования, ответов с ограниченным доступом, экспорта и модерации. Организаторы отвечают за последующее использование и сбор данных;",
                ],
              },
              {
                tag: "li",
                children: [
                  "Наши сотрудники и поставщики с надлежащими ограничениями доступа и соглашениями об обработке; и",
                ],
              },
              {
                tag: "li",
                children: [
                  " Органы власти, когда раскрытие требуется законом. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. Обработка за пределами ЕЭЗ включает ИИ и перевод в США и глобальные сервисы проверки и безопасности. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. Когда необходимо, передача основывается на применимых решениях об адекватности защиты или утверждённых механизмах либо стандартных договорных положениях с соответствующими мерами безопасности. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. Обратитесь по адресу legal@zkorum.com за сведениями о получателях, местах обработки и применимых гарантиях передачи, включая договорные. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. Мы можем хранить или передавать анонимные агрегаты. Само удаление связей с учётной записью не гарантирует анонимность: идентифицирующий текст, закономерности и результаты малых групп остаются персональными данными. ",
            ],
          },
          {
            tag: "p",
            children: [
              "3.6. Мы направляем необходимые указания об удалении, исправлении или ограничении обработки и уведомления получателям, но не можем дистанционно стереть независимые скачанные, опубликованные или поисковые копии. Поставщики могут хранить записи для собственных законных целей. Ответ организатору раскрывает ему ваш адрес электронной почты и сообщение.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["4. Как долго мы храним ваши персональные данные?"],
          },
          {
            tag: "p",
            children: [
              " 4.1. Мы храним данные учётной записи, пока они нужны для целей раздела 2. Отзыв согласия прекращает обработку на его основании, если нет самостоятельного правового основания. Удаление и восстановление учётной записи описаны в разделе 6.7. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. Принятый запрос на удаление учётной записи отключает доступ и исключает участие из новых текущих расчётов. Текст личных утверждений, переводы и авторство скрываются, в том числе в исторических представлениях. Открытые результаты обновляются асинхронно. Данные восстановления хранятся непублично 15 дней, после чего подлежат окончательной очистке. ",
            ],
          },
          {
            tag: "p",
            children: [
              "Мы бессрочно храним числовые входные данные сохранённых результатов для анализа голосования и пересчёта, удаляя связи с учётной записью при окончательной очистке.",
            ],
          },
          {
            tag: "p",
            children: [
              "Очистка проводится без неоправданной задержки, но не обязательно завершается к окончанию срока восстановления. Задержки не продлевают восстановление или законные сроки.",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. Сохраняются входные данные, использованные в сохранённых результатах, а не каждый бюллетень или расчёт. Обычное удаление не пересчитывает сохранённые показатели; отдельные исправления или повторный анализ могут их изменить. Исторические описания ИИ автоматически не переписываются; идентифицирующие фрагменты по-прежнему подпадают под право на удаление. Применимое удаление убирает результат и переводы полностью или удаляет из них затронутые сведения без создания замены. При повторном открытии удалённое или окончательно отвязанное участие исключается. Удаление обсуждения или проекта удаляет принадлежащие исключительно ему результаты и входные данные. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. Файлы хранятся, пока они нужны проекту или для другого действующего совместного использования. Существующий экспорт может содержать позднее удалённый контент; скачивание прекращается не позднее чем через 30 дней после создания, без продления. Обычное удаление не переписывает такие файлы; новый экспорт учитывает текущее состояние удаления. Файлы с истёкшим сроком действия оперативно очищаются. Отдельные запросы на удаление регулируются разделом 6. ",
            ],
          },
          {
            tag: "p",
            children: [
              "4.5. Коды подтверждения и токены действий и восстановления имеют срок действия и очищаются. Необходимые записи противодействия злоупотреблениям и вывода учётных данных из обращения сохраняются для защитной цели.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.6. Настройки рассылки, отказы от неё и записи доставки сохраняются для соблюдения выбора и устранения сбоев. Удаление учётной записи аннулирует ваши ссылки и удаляет ненужные данные получателя. Исходные данные событий доставки очищаются после обработки или устранения сбоев.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.7. Наши журналы приложения и базы данных в CloudWatch имеют скользящий срок хранения 180 дней; сроки поставщиков различаются. Удаление учётной записи не стирает все журналы. Материалы поддержки, модерации, безопасности или правовые доказательства с ограниченным доступом могут храниться дольше для конкретной цели, но не как архив всей учётной записи.",
            ],
          },
          {
            tag: "p",
            children: [
              "4.8. Удалённые данные могут оставаться в резервных копиях с ограниченным доступом не более 30 дней после удаления из действующих систем, без возможности обычного использования. Копирование и восстановление не запускают этот срок заново; указания об удалении повторно применяются до предоставления доступа к восстановленным данным.",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: [
              "5. Как мы обеспечиваем безопасность ваших персональных данных?",
            ],
          },
          {
            tag: "p",
            children: [
              " Мы применяем соразмерный контроль доступа, шифрование, резервные копии с ограниченным доступом, минимизацию данных и мониторинг безопасности. Аутентификация использует коды подтверждения и криптографические ключи, а не сохраняемые пароли учётных записей. Ни один сервис не может гарантировать абсолютную безопасность. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. Ваши права в отношении персональных данных"],
          },
          {
            tag: "p",
            children: [
              " 6.1. Используйте средства управления учётной записью или обратитесь по адресу legal@zkorum.com, в том числе по поводу импортированных данных о людях, не являющихся пользователями. Мы соразмерно проверяем личность или владение, не обязательно с помощью удостоверяющих личность документов. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2. В зависимости от обработки и правового основания вы имеете: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["право на доступ к своим данным"],
              },
              {
                tag: "li",
                children: ["право на исправление своих данных"],
              },
              {
                tag: "li",
                children: [
                  "право возражать против обработки своих персональных данных",
                ],
              },
              {
                tag: "li",
                children: ["право на ограничение обработки данных"],
              },
              {
                tag: "li",
                children: ["право на удаление своих данных"],
              },
              {
                tag: "li",
                children: ["право отозвать ранее данное согласие"],
              },
              {
                tag: "li",
                children: ["право на переносимость своих данных"],
              },
              {
                tag: "li",
                children: [
                  " право подать жалобу в компетентный орган по защите данных. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. Мы объясняем любые разрешённые или требуемые законом ограничения этих прав. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. Запросы о реализации прав бесплатны. Мы отвечаем без неоправданной задержки, обычно в течение месяца. Сложность или большое число запросов могут потребовать ещё до двух месяцев; о продлении мы сообщаем в первый месяц. При явно необоснованных или чрезмерных запросах мы обязаны обосновать законный отказ или разумную плату. Сроки ответа не оправдывают задержку необходимого удаления. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5. В пределах ваших полномочий средства управления позволяют менять контент и настройки, отзывать или изменять поддерживаемые виды участия с учётом правил открытых и закрытых активностей. Удаление учётной записи также удаляет текст ваших личных утверждений; отдельно удалять их не требуется. Независимое удаление контента не имеет срока восстановления. ",
            ],
          },
          {
            tag: "p",
            children: [
              "Отзыв участия не переписывает сохранённые результаты. После окончательного удаления связей средства управления учётной записью не позволяют получать, изменять или отзывать отвязанные числовые записи, и новая учётная запись не может вернуть их себе.",
            ],
          },
          {
            tag: "p",
            children: [
              "Удаление проекта охватывает его обсуждения, документы и принадлежащие исключительно ему результаты и входные данные. Для удаления организации проекты, принадлежащие только ей, нужно передать или отдельно удалить; совместные проекты сохраняются у других владельцев. Удаление не является обратимым архивированием.",
            ],
          },
          {
            tag: "h3",
            children: ["6.6. Записи безопасности:"],
          },
          {
            tag: "p",
            children: [
              " Ограниченные записи противодействия злоупотреблениям, блокировки учётных данных, отказов от рассылки и доказательства удаления, безопасности или по правовым вопросам могут сохраняться для конкретных целей, но не полные доказательства аутентификации, секреты проверки или общая копия удалённой учётной записи. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. Как удалить учётную запись:"],
          },
          {
            tag: "p",
            children: [
              " Запросите удаление через средства управления учётной записью. Если обязанности в организации мешают удалению через эти средства, свяжитесь с нами. Принятый запрос запускает 15-дневный срок восстановления; отклонённый — нет. Что скрывается, удаляется или сохраняется, описано в разделе 4. ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["При принятии запроса:"],
                  },
                  " Сеансы отзываются, дальнейшая связанная с учётной записью отправка писем и непубличная обработка прекращаются; уже отправленные операции могут завершиться. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["В течение следующих 15 дней:"],
                  },
                  " Для восстановления нужны подтверждение владения и явная отмена удаления до предельного срока с помощью поддерживаемых учётных данных или исходных ключей гостевого устройства. Данные только для восстановления исключены из обычного доступа, исторических представлений и нового экспорта; существующий экспорт регулируется разделом 4.4. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["По истечении 15-дневного срока:"],
                  },
                  " Восстановление прекращается. Очистка удаляет непубличные данные учётной записи и восстановления, исходный текст личных утверждений и переводы, а также ненужные связи. Утверждения показывают уведомление об удалении без указания вашего авторства. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "Восстановление возвращает допустимые данные, скрытые исключительно из-за удаления учётной записи, но не отозванные сеансы, независимые удаления, отозванное участие, гостевые объединения или решения модерации.",
            ],
          },
          {
            tag: "p",
            children: [
              "Совместные организации и проекты и вклад других людей сохраняются после удаления учётной записи. Принадлежащие проекту исходные утверждения сохраняются без публичного указания вашего авторства. Для их удаления нужны отдельные полномочия.",
            ],
          },
          {
            tag: "p",
            children: [
              " Предусмотренные законом запросы на удаление не требуют ожидания окончания срока восстановления. Удаление учётной записи не означает отказа от законных прав на защиту данных. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. Подайте жалобу по адресу ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              " или непосредственно в компетентный орган по защите данных, в том числе французскую CNIL (",
              {
                tag: "a",
                children: ["www.cnil.fr"],
                href: "http://www.cnil.fr/",
                external: true,
              },
              "). ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["7. Важная информация для жителей Калифорнии"],
          },
          {
            tag: "p",
            children: [
              " 7.1. Согласно Закону Калифорнии о защите конфиденциальности потребителей (CCPA), категории данных, собранных, использованных и переданных за последние 12 месяцев, описаны выше вместе с соответствующими целями. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. Мы не продавали вашу персональную информацию, то есть не раскрывали её за денежное или иное ценное встречное предоставление. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. Вы можете запросить доступ, удаление и сведения о наших практиках по разделу 6. Мы проверяем запросы и можем потребовать подтверждение полномочий представителя действовать от вашего имени. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. Осуществление прав не влияет на цены или качество услуг, кроме разрешённых законом случаев. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["8. Изменения настоящей политики конфиденциальности"],
          },
          {
            tag: "p",
            children: [
              " Мы уведомляем о существенных изменениях конфиденциальности по электронной почте или в Agora. Последнее уведомление и дата обновления доступны на нашем веб-сайте. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. У вас есть вопросы?"],
          },
          {
            tag: "p",
            children: [
              " Свяжитесь с нашим ответственным за конфиденциальность: ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". ",
            ],
          },
        ],
      },
    ],
  },
  "zh-Hans": {
    title: "隐私政策",
    automatedTranslationNotice: {
      title: "自动翻译",
      statement:
        "本隐私政策由自动翻译生成。英文版本是唯一具有权威效力的版本；如有任何差异，仅以英文版本为准。",
      viewEnglish: "查看具有权威效力的英文版本",
      returnToTranslation: "返回译文版本",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["最后更新日期"],
          },
          "：2026/10/14 (YYYY/MM/DD)",
        ],
      },
      {
        tag: "p",
        children: [
          " Agora Citizen Network 由以下公司开发： ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          "。 ",
        ],
      },
      {
        tag: "p",
        children: [" ZKorum SAS（“Agora”或“我们”）负责本声明所述的个人数据。 "],
      },
      {
        tag: "p",
        children: [
          " 联系方式： ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          "。加利福尼亚州居民请参阅第7节。 ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["内容可见性与参与记录"],
          },
          {
            tag: "p",
            children: [
              " 已发布的内容和结果通常公开，但受访问限制约束。未列出的对话仍可能通过链接访问；不出现在搜索结果中不代表保密。 ",
            ],
          },
          {
            tag: "p",
            children: [" 您无需账户即可浏览。如要参与： "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["访客："],
                  },
                  " 在允许的情况下，通过基于设备的账户参与。丢失其存储的密钥可能导致无法访问或恢复。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["注册账户："],
                  },
                  " 可用的验证方式包括： ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["电子邮件地址："],
                          },
                          " 一次性验证码证明地址所有权，而非身份或个人唯一性。 ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["电话号码："],
                          },
                          " 通过短信（SMS）发送的一次性验证码进行验证 ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "a",
                            children: ["Rarimo"],
                            href: "https://rarimo.com/privacy-notice.html",
                            external: true,
                          },
                          "：基于护照的零知识证明（ZKP）验证 ",
                        ],
                      },
                    ],
                  },
                  " 对话可能要求采用特定方式。护照验证披露资格信息，而非您的护照图像、号码、姓名或照片。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["账户升级："],
              },
              " 访客活动可合并到注册账户中，注册账户已有的选择优先。合并不可撤销，也不能合并两个注册账户。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 您选择或自动生成的用户名可能随已发布内容显示，无须使用真实姓名。 ",
            ],
          },
          {
            tag: "h3",
            children: ["谁可以看到您的信息？"],
          },
          {
            tag: "p",
            children: [" 访问范围取决于活动和权限： "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "已发布的内容、结果、用户名以及项目/组织联系方式可能公开、被复制或被索引。",
                ],
              },
              {
                tag: "li",
                children: ["身份验证详情、私钥和账户设置不会公开。"],
              },
              {
                tag: "li",
                children: [
                  " 参与记录在解除关联前与账户关联。参与者可以检索自己的 QV 分配；保留 QV 输入不会公开个人选票，也不会开放个人选票导出。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  "个人问卷答复和完整结果（包括未隐藏的汇总结果）需要所有者级别的权限。公开汇总结果可能隐藏小群体信息。",
                ],
              },
              {
                tag: "li",
                children: [
                  "启用导出功能时，任何有权访问对话的人（包括基于设备的访客）均可获取标准导出文件，其中包含陈述、重新映射的作者ID、时间戳、投票总数及获准的问卷汇总结果。",
                ],
              },
              {
                tag: "li",
                children: [
                  "提供个人投票导出时，内容包括选择、参与者ID、陈述引用和时间戳。其他参与信息披露及其接收群体会在适用前说明，并在需要时征得同意。",
                ],
              },
              {
                tag: "li",
                children: [
                  " 举报、审核理由及相关身份信息向经授权的工作人员或组织者提供。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 共享的导出ID可以关联陈述、投票和问卷答案。即使ID已重新映射，文本、时间戳、投票模式或小群体仍可能识别出参与者。标准问卷导出不包含身份验证电子邮件地址，但自由文本答案可能包含联系方式。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 这些规则适用于所有导出格式。接收者可在法律允许的范围内保留、组合或再次发布文件；独立副本详见第3.6节。 ",
            ],
          },
          {
            tag: "h3",
            children: ["计划中的 AT Protocol 迁移"],
          },
          {
            tag: "p",
            children: [
              " 可能进行的 AT Protocol 迁移可能会将公开内容、个人投票和标识符共享给 Agora 无法控制的独立服务，包括欧洲经济区（EEA）以外的服务。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 受限对话的安排尚未确定。访问控制并非端到端加密，无法阻止经授权的读取者复制数据。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 迁移前，我们会说明变更和可选方案，更新本声明，并取得所需同意。这不授权公开现有的受限参与信息。 ",
            ],
          },
          {
            tag: "h3",
            children: ["第三方服务"],
          },
          {
            tag: "p",
            children: [
              " 提供商处理服务所需的信息，包括网络地址。其声明说明了各自的处理方式： ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Rarimo"],
                    href: "https://rarimo.com/privacy-notice.html",
                    external: true,
                  },
                  " （全球）用于零知识身份证明。可能为安全和服务运营目的处理IP地址。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                  " 接收您的完整号码，用于短信验证和防止滥用。Agora 存储受保护的哈希值及部分号码/国家信息。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Cloudflare"],
                    href: "https://www.cloudflare.com/privacypolicy/",
                    external: true,
                  },
                  " 处理网络/浏览器信号，用于检测滥用和改进服务。已启用的代理/安全服务还会处理流量和内容。请参阅 ",
                  {
                    tag: "a",
                    children: ["Turnstile 隐私附录"],
                    href: "https://www.cloudflare.com/turnstile-privacy-policy/",
                    external: true,
                  },
                  ". ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Amazon Web Services"],
                    href: "https://aws.amazon.com/privacy/",
                    external: true,
                  },
                  " 提供托管、存储、电子邮件和诊断服务，通常位于爱尔兰；Bedrock/Mistral AI 处理则位于美国。电子邮件服务需要收件人地址和邮件内容；AI使用相关文本和上下文。Bedrock 的完整输入/输出日志已禁用。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Google Cloud Platform"],
                    href: "https://cloud.google.com/terms/cloud-privacy-notice",
                    external: true,
                  },
                  " 在美国处理文本，用于可选翻译和备用语言检测。自动检测无法禁用，即使关闭翻译也是如此。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Plausible Analytics"],
                    href: "https://plausible.io/data-policy",
                    external: true,
                  },
                  " 使用页面和技术信息提供无Cookie分析，不使用凭据或草稿。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Sentry"],
                    href: "https://sentry.io/privacy/",
                    external: true,
                  },
                  " 通过我们的欧盟配置接收诊断信息，以及经遮蔽处理、由错误触发的交互回放，包括浏览器、页面、路由、交互和网络信息。遮蔽不保证匿名性。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 我们自行托管的 Reacher 使用您的完整地址检查电子邮件有效性，可能联系邮件服务器或验证提供商。AI/翻译请求不附带账户和联系标识符，但不会移除文本内的身份识别信息。 ",
            ],
          },
          {
            tag: "h3",
            children: ["Cookie与分析"],
          },
          {
            tag: "p",
            children: [
              " 我们不使用广告或跨网站跟踪Cookie，也不为广告目的出售数据。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 浏览器存储会保留密钥、会话信息、偏好和草稿，直至清除。本地保存本身不会上传草稿；提交、导入或请求AI处理会发送相关输入。服务器删除无法清除每一份设备本地副本。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["1. 本隐私政策何时适用？"],
          },
          {
            tag: "p",
            children: [
              " 当您使用我们的网站或应用，或联系我们时，本声明适用。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. 我们处理哪些个人数据，为什么处理？"],
          },
          {
            tag: "p",
            children: [
              " 我们从您、您的设备以及组织者/导入中接收数据。下表列出目的和法律依据；第6节说明您的权利。 ",
            ],
          },
          {
            tag: "table",
            children: [
              {
                tag: "thead",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "th",
                        children: ["哪些个人数据？"],
                      },
                      {
                        tag: "th",
                        children: ["为什么？"],
                      },
                      {
                        tag: "th",
                        children: ["法律依据？"],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "tbody",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["设备标识符和会话"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 公钥标识符、浏览器/设备信息和会话状态，用于身份验证、恢复和防止滥用。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["已停用的活动门票记录"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 历史验证标识符、日期和元数据；不再用于访问或资格判断。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["身份验证数据——电话号码"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 号码验证、受保护的哈希值、部分号码/国家信息及反滥用记录，用于身份验证。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "身份验证数据——护照零知识证明（Rarimo）",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 源自护照的唯一性标识符、国籍、性别和年龄门槛证明，用于资格及所有权核验，不含完整出生日期。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["账户信息"],
                          },
                          " （用户名、语言、偏好、状态和权限） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 用于管理您的账户、偏好、权限和通知。 "],
                      },
                      {
                        tag: "td",
                        children: ["您的同意"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["您的操作"],
                          },
                          " （对话、陈述、同意/不同意/跳过投票、问卷选择/自由文本答案、最佳/最差及两两比较（pairwise），以及二次方投票的点数分配） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 内容、选择和时间戳，用于参与和生成结果。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["您的同意"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["IP地址"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 用于保护服务和防止攻击。 "],
                      },
                      {
                        tag: "td",
                        children: ["合法利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["假名化技术数据"],
                          },
                          " （标识符、错误、计数、耗时和技术上下文） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 用于可靠性和安全性。基础设施/提供商日志也可能包含网络、请求或数据库上下文。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["通信"],
                          },
                          " （联系方式、消息、举报和日期） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 用于与您沟通及处理请求或举报。 "],
                      },
                      {
                        tag: "td",
                        children: [" 与您沟通方面的合法利益。 "],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["上述个人数据。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 用于履行法律义务及响应主管机关的合法请求。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["我们的法律义务。"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["上述个人数据。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 用于防止欺诈、不受欢迎的消息及未经授权的活动。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["我们的法律义务。"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["上述个人数据。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: ["用于在法律诉讼中进行抗辩。"],
                      },
                      {
                        tag: "td",
                        children: [" 就法律主张进行抗辩方面的合法利益。 "],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["上述个人数据。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 用于合并、收购或分拆，包括涉及欧盟以外的各方。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 我们开展商业交易的合法利益。 "],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["账户升级/合并数据"],
                          },
                          " （用户内容、设备和偏好） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 用于将访客活动转移至注册账户。 "],
                      },
                      {
                        tag: "td",
                        children: ["您的同意及我们的合法利益。"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["电子邮件身份验证"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "地址、账户/设备关联、验证码/状态及反滥用记录，用于登录和恢复。",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["账户身份验证和防止滥用方面的合法利益。"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["衍生分析和排名信息"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "观点群组、偏好和结果，使用个人数值输入：Polis 投票矩阵、BWS/pairwise 选择和 QV 点数分配。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "对参与和分析的同意，涉及敏感数据时须满足所需的额外条件。撤回后继续保留需要独立的法律依据。",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["项目、组织、文档和导入"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "权限、联系人、文件和内容，用于管理。导入可能包含非用户的陈述、投票、参与者标识符和时间戳。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "所请求的服务及经授权项目/导入方面的合法利益，同时尊重受影响人员的权利，并满足额外的必要法律条件。",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["自动语言检测、可选AI辅助和动态翻译"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "文本、未发布草稿、陈述/摘要及处理元数据，用于语言检测、所请求的翻译和AI建议/描述。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "底层内容的法律依据；可选处理需要同意时，取得特定同意。",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["对话电子邮件更新（如已启用）"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "地址、偏好、语言、投递历史、操作链接及退订/投诉信息，用于您选择接收的更新和投递管理。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "需要时取得的同意；所请求的偏好操作；可靠、无滥用投递方面的合法利益。",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["删除、恢复和受限个案记录"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "请求、所有权核验、截止时间及有限的个案/清理证据，用于恢复、删除和防止已删除数据被还原。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "您的请求、法律义务，以及有正当理由的安全或法律主张相关利益。",
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "内容和投票模式可能揭示政治观点或其他敏感信息，需要满足适用的法律条件，包括在需要时取得明示同意。请避免提供关于您自己或他人的不必要个人信息。",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["3. 我们与谁共享您的个人数据？"],
          },
          {
            tag: "p",
            children: [" 3.1. 根据功能和权限，接收者包括： "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["您本人，用于账户访问和权利请求；"],
              },
              {
                tag: "li",
                children: ["访问者，用于获取上述公开信息和获准的导出文件；"],
              },
              {
                tag: "li",
                children: [
                  "经授权的组织者/工作人员，用于管理、受限答复、导出和内容审核。组织者对其后续使用和收集负责；",
                ],
              },
              {
                tag: "li",
                children: [
                  "我们的人员和提供商，受适当访问限制及处理者安排约束；以及",
                ],
              },
              {
                tag: "li",
                children: [" 依法必须披露时的主管机关。 "],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. 欧洲经济区（EEA）以外的处理包括美国的AI/翻译服务及全球验证/安全服务。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. 在需要时，数据传输依据适用的充分性决定、获批准的框架，或标准合同条款及相关安全措施。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. 请联系 legal@zkorum.com，了解接收者/地点详情及适用的传输保障措施，包括合同保障措施。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. 我们可能保留或共享匿名汇总结果。仅移除账户关联并不保证匿名性：可识别身份的文本、模式和小群体结果仍属于个人数据。 ",
            ],
          },
          {
            tag: "p",
            children: [
              "3.6. 我们发出所需的删除/更正/限制指令并通知接收者，但无法远程清除独立下载、发布或搜索引擎中的副本。提供商可能为其自身合法目的保留记录。回复组织者会向其共享您的电子邮件地址和消息。",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["4. 我们保留您的个人数据多久？"],
          },
          {
            tag: "p",
            children: [
              " 4.1. 我们在实现第2节所述目的所需的期间内保留账户数据。撤回同意会终止基于同意的处理，但存在独立法律依据的情形除外。账户删除和恢复详见第6.7节。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. 账户删除请求获接受后，访问被禁用，相关参与记录不再纳入新的实时计算。个人陈述文本、译文和署名会被隐藏，包括在历史展示中。开放活动的结果异步更新。恢复数据以私密方式保留15天，此后可进入永久清理。 ",
            ],
          },
          {
            tag: "p",
            children: [
              "我们无限期保留已保存结果的数值输入，用于投票分析和重新计算，并在永久清理时移除账户关联。",
            ],
          },
          {
            tag: "p",
            children: [
              "清理不得无故拖延，但不一定在恢复截止时间前完成。延迟不会延长恢复期或法定期限。",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. 保留的输入是已保存结果所使用的输入，并非每一张选票或每一次计算。常规删除不会重新计算已保存的数值；另行更正或重新分析可能使其改变。历史AI描述不会自动改写；可识别身份的摘录仍受删除权约束。适用的删除会移除或遮蔽受影响的输出/译文，不生成替代内容。重新开放时，已删除或永久解除关联的参与记录不再纳入计算。删除对话/项目会移除其独占拥有的结果和输入。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. 文件在其项目或其他有效共享用途需要时保留。现有导出文件可能包含后来删除的内容；下载最迟在生成后30天到期，不予延长。常规删除不会改写这些文件；新导出文件按当前删除状态生成。到期文件会及时清理。特定删除请求遵循第6节。 ",
            ],
          },
          {
            tag: "p",
            children: [
              "4.5. 验证码和操作/恢复令牌到期后会被清理。必要的反滥用和凭据停用记录会为其保护目的保留。",
            ],
          },
          {
            tag: "p",
            children: [
              "4.6. 电子邮件偏好、退订和投递记录会为尊重您的选择和解决投递失败而保留。删除账户会使您的链接失效，并移除不必要的收件人详情。原始投递事件数据会在处理或故障解决后清除。",
            ],
          },
          {
            tag: "p",
            children: [
              "4.7. 我们的 CloudWatch 应用/数据库日志采用滚动180天保留政策；提供商的保留期限各不相同。删除账户不会清除每一条日志。受限的支持、审核、安全或法律证据可能为其特定目的保留更久，但不作为完整账户档案。",
            ],
          },
          {
            tag: "p",
            children: [
              "4.8. 数据从线上系统实际移除后，已删除数据可能在受限备份中保留最多30天，不可用于常规使用。复制或恢复不会重新起算该期限；恢复的数据开放访问前会重新应用删除指令。",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. 我们如何保障您的个人数据安全？"],
          },
          {
            tag: "p",
            children: [
              " 我们采用与风险相称的访问控制、加密、受限备份、数据最小化和安全监测。身份验证使用验证码和密码学密钥，而非存储账户密码。任何服务都无法保证绝对安全。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. 您对个人数据享有的权利"],
          },
          {
            tag: "p",
            children: [
              " 6.1. 请使用账户功能或联系 legal@zkorum.com，包括就非用户的导入数据提出请求。我们以适度方式验证身份或所有权，不一定需要身份证件。 ",
            ],
          },
          {
            tag: "p",
            children: [" 6.2. 根据处理活动和法律依据，您享有以下权利： "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["访问您的数据的权利"],
              },
              {
                tag: "li",
                children: ["更正您的数据的权利"],
              },
              {
                tag: "li",
                children: ["反对处理您的个人数据的权利"],
              },
              {
                tag: "li",
                children: ["限制数据处理的权利"],
              },
              {
                tag: "li",
                children: ["要求删除您的数据的权利"],
              },
              {
                tag: "li",
                children: ["撤回您先前给予的同意的权利"],
              },
              {
                tag: "li",
                children: ["转移您的数据的权利"],
              },
              {
                tag: "li",
                children: [" 向有管辖权的数据保护机关提出投诉的权利。 "],
              },
            ],
          },
          {
            tag: "p",
            children: [" 6.3. 我们会说明法律允许或要求的任何权利限制。 "],
          },
          {
            tag: "p",
            children: [
              " 6.4. 权利请求免费。我们会在不无故拖延的情况下回应，通常在1个月内。复杂或大量请求可能需要再延长最多2个月；我们会在第1个月内说明延期。对于明显缺乏依据或过度的请求，任何合法拒绝或合理收费均须说明理由。回应期限不能成为延迟执行必要删除的理由。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5. 在您的权限范围内，相关功能可让您管理内容/偏好，以及撤回或更改受支持的参与记录，但须遵循开放/关闭规则。删除账户也会遮蔽您的个人陈述，无须单独删除陈述。独立删除内容没有恢复期。 ",
            ],
          },
          {
            tag: "p",
            children: [
              "撤回不会改写已保存的结果。永久解除关联后，账户功能无法检索、更改或撤回已解除关联的数值记录，新账户也无法重新认领这些记录。",
            ],
          },
          {
            tag: "p",
            children: [
              "删除项目涵盖其对话、文档和独占拥有的结果/输入。删除组织要求先转移或单独删除其独自拥有的项目；共同拥有的项目继续由其他所有者持有。删除并非可撤销的归档。",
            ],
          },
          {
            tag: "h3",
            children: ["6.6. 安全记录："],
          },
          {
            tag: "p",
            children: [
              " 有限的反滥用、已屏蔽凭据、退订以及删除/安全/法律证据可能为其特定目的保留，但不包括完整身份验证证明、验证秘密信息或已删除账户的通用副本。 ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. 如何删除您的账户："],
          },
          {
            tag: "p",
            children: [
              " 请通过账户功能请求删除。如果组织职责导致您无法通过该功能删除账户，请联系我们。获接受的删除请求启动15天恢复期；被拒绝的请求不会启动。第4节说明哪些信息会被隐藏、删除或保留。 ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["请求获接受时："],
                  },
                  " 会话被撤销，后续账户相关电子邮件/私密处理停止；已发出的操作可能完成。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["接下来的15天内："],
                  },
                  " 恢复要求使用受支持的凭据或原始访客设备密钥验证所有权，并在截止时间前明确取消删除。仅供恢复的数据不用于常规访问、历史展示或新导出；现有导出遵循第4.4节。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["15天截止时间到达时："],
                  },
                  " 恢复期结束。清理会移除私密账户/恢复数据、个人陈述原文和译文，以及不必要的关联。陈述显示删除提示，不再显示您的署名。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "恢复会还原仅因账户删除而隐藏、且原本获准保留的数据，不会还原已撤销的会话、独立删除的内容、已撤回的参与记录、访客合并或审核决定。",
            ],
          },
          {
            tag: "p",
            children: [
              "共享的组织/项目及他人的贡献不会随账户删除而消失。项目拥有的初始陈述会保留，但不再公开显示您的署名。删除这些资源需要另行授权。",
            ],
          },
          {
            tag: "p",
            children: [
              " 法定删除请求无须等待账户恢复期届满。删除账户不代表放弃您的法定数据保护权利。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. 您可向以下地址投诉： ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              "，或直接向有管辖权的数据保护机关投诉，包括法国的 CNIL（",
              {
                tag: "a",
                children: ["www.cnil.fr"],
                href: "http://www.cnil.fr/",
                external: true,
              },
              "）。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["7. 加利福尼亚州居民的重要信息"],
          },
          {
            tag: "p",
            children: [
              " 7.1. 根据《加利福尼亚州消费者隐私法》（CCPA），过去12个月收集、使用和共享的数据类别及其用途如上所述。 ",
            ],
          },
          {
            tag: "p",
            children: [" 7.2. 我们未以金钱或其他有价值的对价出售个人信息。 "],
          },
          {
            tag: "p",
            children: [
              " 7.3. 您可按照第6节请求访问、删除及了解我们的处理方式。我们会验证请求，并可能要求证明代理人已获授权代表您行事。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. 行使权利不会影响价格或服务质量，但法律允许的情形除外。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["8. 本隐私政策的变更"],
          },
          {
            tag: "p",
            children: [
              " 我们会通过电子邮件或 Agora 通知您重大的隐私变更。最新声明及其更新日期可在我们的网站上查看。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. 您有任何疑问吗？"],
          },
          {
            tag: "p",
            children: [
              " 联系我们的隐私负责人： ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". ",
            ],
          },
        ],
      },
    ],
  },
  "zh-Hant": {
    title: "隱私權政策",
    automatedTranslationNotice: {
      title: "自動翻譯",
      statement:
        "本隱私權政策係以自動翻譯產生。英文版本為唯一具有權威效力的版本；如有任何差異，一律以英文版本為準。",
      viewEnglish: "查看具權威效力的英文版本",
      returnToTranslation: "返回翻譯版本",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["最後更新日期"],
          },
          ": 2026/10/14 (YYYY/MM/DD)",
        ],
      },
      {
        tag: "p",
        children: [
          " Agora Citizen Network 的開發者為 ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          "。 ",
        ],
      },
      {
        tag: "p",
        children: [
          " ZKorum SAS（「Agora」或「我們」）負責本通知所述的個人資料。 ",
        ],
      },
      {
        tag: "p",
        children: [
          " 聯絡方式： ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          "。加州居民請參閱第 7 節。 ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["內容可見性與參與紀錄"],
          },
          {
            tag: "p",
            children: [
              " 已發布的內容及結果通常公開，但受存取限制約束。不列出的對話仍可能透過連結存取；不出現在搜尋結果中並不代表保密。 ",
            ],
          },
          {
            tag: "p",
            children: [" 您無須帳戶即可瀏覽。若要參與： "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["訪客："],
                  },
                  " 在允許時，透過以裝置為基礎的帳戶參與。遺失儲存的金鑰可能使您無法存取或復原帳戶。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["已註冊帳戶："],
                  },
                  " 可用的驗證方式包括： ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["電子郵件地址："],
                          },
                          " 一次性驗證碼證明地址所有權，而非身分或唯一性。 ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["電話號碼："],
                          },
                          " 透過 SMS 傳送的一次性驗證碼進行驗證 ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "a",
                            children: ["Rarimo"],
                            href: "https://rarimo.com/privacy-notice.html",
                            external: true,
                          },
                          "：以護照為基礎的零知識證明（ZKP）驗證 ",
                        ],
                      },
                    ],
                  },
                  " 對話可能要求特定驗證方式。護照驗證會揭露資格資訊，而非您的護照影像、號碼、姓名或照片。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["帳戶升級："],
              },
              " 訪客活動可合併至已註冊帳戶，並以該帳戶既有選擇為優先。合併不可逆，且不能合併兩個已註冊帳戶。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 您自行選擇或產生的使用者名稱可能與已發布內容一併顯示；它不必是真實姓名。 ",
            ],
          },
          {
            tag: "h3",
            children: ["誰可以看到您的資料？"],
          },
          {
            tag: "p",
            children: [" 存取權取決於活動及權限： "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "已發布內容、結果、使用者名稱及專案／組織聯絡資料可能公開、被複製或建立索引。",
                ],
              },
              {
                tag: "li",
                children: ["身分驗證細節、私密金鑰及帳戶設定不會公開發布。"],
              },
              {
                tag: "li",
                children: [
                  " 參與資料在解除連結前會與帳戶連結。參與者可取回自己的 QV 分配；保留 QV 輸入不代表公開個別選票，也不提供個別選票匯出功能。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  "個別問卷回答及完整結果（包括未隱藏數值的彙總資料）需要擁有者層級權限。公開彙總資料可能隱藏小群體數據。",
                ],
              },
              {
                tag: "li",
                children: [
                  "啟用功能時，任何具有對話存取權的人（包括裝置訪客）均可取得標準匯出資料，內含陳述、重新對應的作者 ID、時間戳記、投票總數及允許的問卷彙總資料。",
                ],
              },
              {
                tag: "li",
                children: [
                  "提供個別投票匯出時，內容包括選擇、參與者 ID、陳述參照及時間戳記。其他參與資料的揭露內容及接收對象，會在適用前說明，並在需要時取得同意。",
                ],
              },
              {
                tag: "li",
                children: [
                  " 檢舉、內容管理理由及相關身分可供經授權的工作人員或主辦者存取。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 共用的匯出 ID 可連結陳述、投票及問卷回答。即使 ID 已重新對應，文字、時間戳記、投票模式或小群體仍可能識別參與者。標準問卷匯出不包含身分驗證用電子郵件地址，但自由文字回答可能含有聯絡資料。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 這些規則不因匯出格式而異。接收者可在法律允許下保留、合併或再次發布檔案；第 3.6 節說明獨立副本。 ",
            ],
          },
          {
            tag: "h3",
            children: ["規劃中的 AT Protocol 遷移"],
          },
          {
            tag: "p",
            children: [
              " 若遷移至 AT Protocol，公開內容、個別投票及識別碼可能分享予 Agora 控制範圍外的獨立服務，包括位於歐洲經濟區（EEA）以外的服務。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 受限制對話的安排尚未確定。存取控制並非端對端加密，無法防止經授權閱覽者複製資料。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 遷移前，我們會說明變更及可用選擇、更新本通知，並取得必要同意。這不授權公開既有的受限制參與資料。 ",
            ],
          },
          {
            tag: "h3",
            children: ["第三方服務"],
          },
          {
            tag: "p",
            children: [
              " 供應商會處理提供服務所需的資訊，包括網路位址。其通知說明各自的處理方式： ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Rarimo"],
                    href: "https://rarimo.com/privacy-notice.html",
                    external: true,
                  },
                  " （全球）用於零知識身分證明。可能為安全及服務營運目的處理 IP 位址。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                  " 會收到完整電話號碼，用於 SMS 驗證及防止濫用。Agora 儲存受保護的雜湊值及部分號碼／國家資訊。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Cloudflare"],
                    href: "https://www.cloudflare.com/privacypolicy/",
                    external: true,
                  },
                  " 處理網路／瀏覽器訊號，用於偵測濫用及改善服務。已啟用的代理／安全服務也會處理流量及內容。請參閱 ",
                  {
                    tag: "a",
                    children: ["Turnstile 隱私附錄"],
                    href: "https://www.cloudflare.com/turnstile-privacy-policy/",
                    external: true,
                  },
                  ". ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Amazon Web Services"],
                    href: "https://aws.amazon.com/privacy/",
                    external: true,
                  },
                  " 提供託管、儲存、電子郵件及診斷服務，通常位於愛爾蘭；Bedrock／Mistral AI 處理則位於美國。電子郵件服務需要收件人地址及訊息；AI 使用相關文字及脈絡。完整的 Bedrock 輸入／輸出日誌已停用。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Google Cloud Platform"],
                    href: "https://cloud.google.com/terms/cloud-privacy-notice",
                    external: true,
                  },
                  " 在美國處理文字，用於選用翻譯及備援語言偵測。即使關閉翻譯，自動偵測仍無法停用。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Plausible Analytics"],
                    href: "https://plausible.io/data-policy",
                    external: true,
                  },
                  " 根據頁面及技術資訊提供不使用 Cookie 的分析，不使用憑證或草稿。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Sentry"],
                    href: "https://sentry.io/privacy/",
                    external: true,
                  },
                  " 透過我們的 EU 設定接收診斷及經遮蔽、由錯誤觸發的互動重播，包括瀏覽器、頁面、路由、互動及網路資訊。遮蔽不保證匿名。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 我們自行託管的 Reacher 使用您的完整地址檢查電子郵件有效性，並可能聯絡郵件伺服器或驗證供應商。AI／翻譯請求不附帶帳戶及聯絡識別碼，但不會移除文字內的可識別資訊。 ",
            ],
          },
          {
            tag: "h3",
            children: ["Cookie 與分析"],
          },
          {
            tag: "p",
            children: [
              " 我們不使用廣告或跨網站追蹤 Cookie，也不為廣告目的出售資料。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 瀏覽器儲存空間保留金鑰、工作階段資訊、偏好及草稿，直到清除為止。本機儲存本身不會上傳草稿；提交、匯入或請求 AI 處理會傳送相關輸入。伺服器刪除無法清除每一份裝置本機副本。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["1. 本隱私權政策何時適用？"],
          },
          {
            tag: "p",
            children: [
              " 本通知適用於您使用我們的網站或應用程式，或聯絡我們時。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. 我們處理哪些個人資料，以及為何處理？"],
          },
          {
            tag: "p",
            children: [
              " 我們從您、您的裝置及主辦者／匯入資料取得資料。下表列出目的及法律依據；第 6 節說明您的權利。 ",
            ],
          },
          {
            tag: "table",
            children: [
              {
                tag: "thead",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "th",
                        children: ["哪些個人資料？"],
                      },
                      {
                        tag: "th",
                        children: ["為何處理？"],
                      },
                      {
                        tag: "th",
                        children: ["法律依據？"],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "tbody",
                children: [
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["裝置識別碼及工作階段"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 公開金鑰識別碼、瀏覽器／裝置資訊及工作階段狀態，用於身分驗證、復原及防止濫用。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["正當利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["已停用的活動票券紀錄"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 歷史驗證識別碼、日期及中繼資料；不再用於存取或資格判定。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["正當利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["身分驗證資料 — 電話號碼"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 電話號碼驗證、受保護的雜湊值、部分號碼／國家資訊及防濫用紀錄，用於身分驗證。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["正當利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: [
                              "身分驗證資料 — 護照零知識證明（Rarimo）",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 護照衍生的唯一性識別碼、國籍、性別及年齡門檻證明，用於資格及所有權查核，不包含完整出生日期。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["正當利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["帳戶資訊"],
                          },
                          " （使用者名稱、語言、偏好、狀態及權限） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 用於管理您的帳戶、偏好、權限及通知。 "],
                      },
                      {
                        tag: "td",
                        children: ["您的同意"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["您所採取的行動"],
                          },
                          " （對話、陳述、同意／不同意／略過投票、問卷選項／自由文字回答、最佳／最差及 pairwise 成對比較，以及二次方投票的點數分配） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 內容、選擇及時間戳記，用於參與及結果。 "],
                      },
                      {
                        tag: "td",
                        children: ["您的同意"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["IP 位址"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 用於保護服務及防止攻擊。 "],
                      },
                      {
                        tag: "td",
                        children: ["正當利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["假名化技術資料"],
                          },
                          " （識別碼、錯誤、計數、耗時及技術脈絡） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 用於可靠性及安全。基礎設施／供應商日誌也可能包含網路、請求或資料庫脈絡。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["正當利益"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["通訊"],
                          },
                          " （聯絡資料、訊息、檢舉及日期） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 用於與您通訊及處理請求或檢舉。 "],
                      },
                      {
                        tag: "td",
                        children: [" 與您通訊的正當利益。 "],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["上述個人資料。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 用於履行法律義務及回應主管機關的合法請求。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["我們的法律義務。"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["上述個人資料。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 用於防止詐欺、不受歡迎的訊息及未經授權的活動。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["我們的法律義務。"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["上述個人資料。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: ["在法律程序中為我們自身辯護。"],
                      },
                      {
                        tag: "td",
                        children: [" 就法律請求進行辯護的正當利益。 "],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["上述個人資料。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 用於合併、收購或分拆，包括與 EU 以外的當事方進行的交易。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 我們進行商業交易的正當利益。 "],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["帳戶升級／合併資料"],
                          },
                          " （使用者內容、裝置及偏好） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 用於將訪客活動移轉至已註冊帳戶。 "],
                      },
                      {
                        tag: "td",
                        children: ["您的同意及我們的正當利益。"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["電子郵件身分驗證"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "地址、帳戶／裝置連結、驗證碼／狀態及防濫用紀錄，用於登入及復原。",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["帳戶身分驗證及防止濫用的正當利益。"],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["衍生分析與排序資訊"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "意見群組、偏好及結果，使用個別數值輸入：Polis 投票矩陣、BWS／pairwise 選擇及 QV 點數分配。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "對參與及分析的同意；涉及敏感資料時，須在需要時另行符合附加條件。撤回同意後繼續保留，需要獨立的法律依據。",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["專案、組織、文件與匯入資料"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "權限、聯絡資料、檔案及內容，用於管理。匯入資料可能包含非使用者的陳述、投票、參與者識別碼及時間戳記。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "履行所請求的服務；營運經授權專案／匯入作業的正當利益，但須尊重受影響者的權利，並符合任何額外要求的法律條件。",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["自動語言偵測、選用 AI 輔助及動態翻譯"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "文字、未發布草稿、陳述／摘要及處理中繼資料，用於語言偵測、所請求的翻譯及 AI 建議／描述。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "原始內容的法律依據；選用處理在法律要求時取得特定同意。",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["對話電子郵件更新通知（啟用時）"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "地址、偏好、語言、投遞歷史、操作連結及退訂／投訴，用於所選更新通知及投遞管理。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "在法律要求時取得同意；履行所請求的偏好操作；可靠且不受濫用的投遞之正當利益。",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "tr",
                    children: [
                      {
                        tag: "td",
                        children: [
                          {
                            tag: "strong",
                            children: ["刪除、復原及受限制的案件紀錄"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "請求、所有權查核、期限及有限的案件／清理證據，用於復原、刪除及防止已刪除資料被還原。",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "您的請求、法律義務，以及具有正當理由的安全或法律請求利益。",
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "內容及投票模式可能揭露政治意見或其他敏感資訊，需要符合適用的法律條件，包括在要求時取得明示同意。請避免提供不必要的自身或他人個人資料。",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["3. 我們與誰分享您的個人資料？"],
          },
          {
            tag: "p",
            children: [" 3.1. 視功能及權限而定，接收者包括： "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["您本人，用於帳戶存取及權利請求；"],
              },
              {
                tag: "li",
                children: ["訪客，可取得上述公開資訊及允許的匯出資料；"],
              },
              {
                tag: "li",
                children: [
                  "經授權的主辦者／工作人員，用於管理、受限制回答、匯出及內容管理。主辦者須對其後續使用及蒐集負責；",
                ],
              },
              {
                tag: "li",
                children: [
                  "我們的人員及供應商，並受適當存取限制及資料處理者安排約束；以及",
                ],
              },
              {
                tag: "li",
                children: [" 依法必須揭露資料時的主管機關。 "],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. EEA 以外的處理包括美國的 AI／翻譯，以及全球驗證／安全服務。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. 在法律要求時，傳輸以適用的適足性決定、經核准架構，或搭配相關安全措施的標準契約條款為依據。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. 請聯絡 legal@zkorum.com，取得接收者／所在地詳情，以及適用的傳輸保障措施資訊，包括契約保障措施。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. 我們可能保留或分享匿名彙總資料。僅移除帳戶連結不保證匿名：可識別文字、模式及小群體結果仍屬個人資料。 ",
            ],
          },
          {
            tag: "p",
            children: [
              "3.6. 我們會發出必要的刪除／更正／限制指示及接收者通知，但無法遠端刪除獨立下載、發布或搜尋引擎副本。供應商可為自身合法目的保留紀錄。回覆主辦者會分享您的電子郵件地址及訊息。",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["4. 我們保留您的個人資料多久？"],
          },
          {
            tag: "p",
            children: [
              " 4.1. 我們會在第 2 節目的所需期間保留帳戶資料。撤回同意會終止以同意為依據的處理，除非有獨立的法律依據。第 6.7 節說明帳戶刪除及復原。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. 帳戶刪除請求獲接受後，會停用存取，並使參與資料不再符合新的即時計算資格。個人陳述文字、翻譯及署名會隱藏，包括歷史顯示中的內容。開放中的結果會非同步更新。復原資料會保持非公開 15 天，之後符合永久清理條件。 ",
            ],
          },
          {
            tag: "p",
            children: [
              "我們會無限期保留已儲存結果的數值輸入，用於投票分析及重新計算，並在永久清理時移除帳戶連結。",
            ],
          },
          {
            tag: "p",
            children: [
              "清理會在無不當延誤的情況下進行，但不一定在復原期限屆滿時完成。延遲不會延長復原期間或法定期限。",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. 保留的輸入是已儲存結果所使用的資料，而非每張選票或每次計算。一般刪除不會重新計算已儲存數值；另行更正或重新分析可能改變數值。歷史 AI 描述不會自動改寫；可識別摘錄仍受刪除權利約束。適用的刪除會移除或遮蔽受影響輸出／翻譯，不產生替代內容。重新開啟時，會排除已刪除或永久解除連結的參與資料。刪除對話／專案會移除其專屬結果及輸入。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. 檔案會在其專案或其他有效共用用途仍需要時保留。既有匯出可能包含之後刪除的內容；下載期限最遲於產生後 30 天屆滿，不予延長。一般刪除不會改寫既有匯出；新匯出採用目前刪除狀態。過期檔案會迅速清理。特定刪除請求依第 6 節處理。 ",
            ],
          },
          {
            tag: "p",
            children: [
              "4.5. 驗證碼及操作／復原權杖會到期並清理。必要的防濫用及憑證停用紀錄會為其保護目的保留。",
            ],
          },
          {
            tag: "p",
            children: [
              "4.6. 電子郵件偏好、退訂及投遞紀錄會保留，以遵守選擇及解決失敗。帳戶刪除會使您的連結失效，並移除不必要的收件人細節。原始投遞事件資料會在處理或解決失敗後清除。",
            ],
          },
          {
            tag: "p",
            children: [
              "4.7. 我們的 CloudWatch 應用程式／資料庫日誌採滾動式 180 天保留；供應商保留期間各異。帳戶刪除不會清除每一筆日誌。受限制的支援、內容管理、安全或法律證據可為其特定目的保留更久，但不作為整個帳戶的封存。",
            ],
          },
          {
            tag: "p",
            children: [
              "4.8. 已刪除資料可在受限制備份中，於從運作中系統移除後最多保留 30 天，不供一般使用。複製／還原不會重新起算該期間；還原資料開放存取前，會重新套用刪除指示。",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. 我們如何維護您的個人資料安全？"],
          },
          {
            tag: "p",
            children: [
              " 我們採用合乎比例的存取控制、加密、受限制備份、資料最小化及安全監控。身分驗證使用驗證碼及密碼學金鑰，而非儲存的帳戶密碼。任何服務都無法保證絕對安全。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. 您對個人資料享有的權利"],
          },
          {
            tag: "p",
            children: [
              " 6.1. 請使用帳戶控制項或聯絡 legal@zkorum.com，包括涉及匯入的非使用者資料。我們以合乎比例的方式驗證身分或所有權，不一定需要身分證件。 ",
            ],
          },
          {
            tag: "p",
            children: [" 6.2. 視處理活動及法律依據而定，您享有以下權利： "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["存取您資料的權利"],
              },
              {
                tag: "li",
                children: ["更正您資料的權利"],
              },
              {
                tag: "li",
                children: ["反對處理您個人資料的權利"],
              },
              {
                tag: "li",
                children: ["限制資料處理的權利"],
              },
              {
                tag: "li",
                children: ["要求刪除您資料的權利"],
              },
              {
                tag: "li",
                children: ["撤回先前所給予同意的權利"],
              },
              {
                tag: "li",
                children: ["資料可攜權"],
              },
              {
                tag: "li",
                children: [" 向有權的資料保護主管機關提出申訴的權利。 "],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. 我們會說明法律允許或要求對這些權利施加的任何限制。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. 權利請求免費。我們會在無不當延遲的情況下回應，通常於一個月內。因複雜程度或請求數量，可能需要再延長最多兩個月；我們會在首月內說明延長原因。對顯然無理由或過度的請求，任何合法拒絕或合理收費均須提出理由。回應期間不構成延遲必要刪除的理由。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5. 在您的權限範圍內，控制項可讓您管理內容／偏好，並依開放／關閉規則撤回或更改支援的參與資料。帳戶刪除也會遮蔽您的個人陳述，無須另行刪除陳述。獨立刪除內容不設復原期間。 ",
            ],
          },
          {
            tag: "p",
            children: [
              "撤回不會改寫已儲存的結果。永久解除連結後，帳戶控制項無法取回、更改或撤回已解除連結的數值紀錄，新帳戶也無法取回這些紀錄。",
            ],
          },
          {
            tag: "p",
            children: [
              "專案刪除涵蓋其中的對話、文件及專屬結果／輸入。組織刪除要求先移轉或另行刪除其單獨擁有的專案；共同擁有的專案由其他擁有者繼續保有。刪除並非可還原的封存。",
            ],
          },
          {
            tag: "h3",
            children: ["6.6. 安全紀錄："],
          },
          {
            tag: "p",
            children: [
              " 有限的防濫用、封鎖憑證、退訂及刪除／安全／法律證據可為其特定目的保留，但不是完整身分驗證證明、驗證秘密資料或已刪除帳戶的一般副本。 ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. 如何刪除您的帳戶："],
          },
          {
            tag: "p",
            children: [
              " 請透過帳戶控制項請求刪除。若組織責任使您無法透過控制項刪除帳戶，請聯絡我們。刪除請求獲接受後才會開始 15 天復原期間；遭拒絕的請求不會啟動該期間。第 4 節說明隱藏、刪除或保留的資料。 ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["請求獲接受時："],
                  },
                  " 工作階段會撤銷，後續帳戶相關電子郵件／私密處理會停止；已送出的操作仍可能完成。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["接下來的 15 天內："],
                  },
                  " 復原須在期限前，使用受支援的憑證或原始訪客裝置金鑰驗證所有權，並明確取消刪除。僅供復原的資料不會用於一般存取、歷史顯示及新匯出；既有匯出依第 4.4 節處理。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["15 天期限屆滿時："],
                  },
                  " 復原結束。清理會移除私密帳戶／復原資料、原始個人陳述文字及翻譯，以及不必要的連結。陳述會顯示刪除通知，不附您的署名。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              "復原會還原僅因帳戶刪除而隱藏、且原本允許保留的資料，但不會還原已撤銷的工作階段、獨立刪除、撤回、訪客合併或內容管理決定。",
            ],
          },
          {
            tag: "p",
            children: [
              "共用組織／專案及他人的貢獻不會因帳戶刪除而消失。專案擁有的初始陳述會保留，但不再公開您的署名。刪除這些內容需要另行授權。",
            ],
          },
          {
            tag: "p",
            children: [
              " 法定刪除請求無須等待帳戶復原期間屆滿。帳戶刪除不表示放棄您的法定資料保護權利。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. 您可向以下地址提出申訴： ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              "，或直接向有權的資料保護主管機關提出申訴，包括法國 CNIL（",
              {
                tag: "a",
                children: ["www.cnil.fr"],
                href: "http://www.cnil.fr/",
                external: true,
              },
              "）。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["7. 加州居民的重要資訊"],
          },
          {
            tag: "p",
            children: [
              " 7.1. 依《加州消費者隱私法》（CCPA），過去 12 個月蒐集、使用及分享的資料類別，即為上文所述，並用於所述目的。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. 我們未曾為取得金錢或其他有價對價而出售個人資料。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. 您可依第 6 節請求存取、刪除及了解我們的處理實務。我們會驗證請求，並可能要求證明代理人已獲授權代表您行事。 ",
            ],
          },
          {
            tag: "p",
            children: [" 7.4. 除法律允許外，行使權利不會影響價格或服務品質。 "],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["8. 本隱私權政策的變更"],
          },
          {
            tag: "p",
            children: [
              " 我們會透過電子郵件或 Agora 通知您重大隱私變更。最新通知及更新日期可在我們的網站查看。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. 您有任何疑問嗎？"],
          },
          {
            tag: "p",
            children: [
              " 請聯絡我們的隱私事務負責人： ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". ",
            ],
          },
        ],
      },
    ],
  },
} satisfies Record<SupportedDisplayLanguageCodes, PrivacyPolicyContent>;
