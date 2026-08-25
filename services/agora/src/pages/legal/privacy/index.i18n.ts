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
          ": 2025/11/11 (YYYY/MM/DD)",
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
          ". At ZKorum, we believe that privacy is a fundamental right. Our mission is to empower users to engage in political and social discourse while maintaining control over their identity and personal information. ",
        ],
      },
      {
        tag: "p",
        children: [
          ' This Privacy Policy explains how and why Agora Citizen Network ("Agora", "we", "us" or "ZKorum") collects, uses, and shares information about you when you use our website and mobile applications (collectively, the "Services") or when you otherwise interact with us. We are responsible for the collection and use of your personal data in the manner explained in this privacy policy. ',
        ],
      },
      {
        tag: "p",
        children: [
          " If you have any questions about this, please contact us by e-mail: ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". If you are a California resident, we would like to draw your attention to Article 7. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["Agora is a public platform"],
          },
          {
            tag: "p",
            children: [
              " Most content on Agora is publicly accessible, meaning your profile, posts, votes and opinions can be viewed by anyone, even without an account. ",
            ],
          },
          {
            tag: "p",
            children: [
              " You are not required to create an account to browse Agora. To participate in discussions and interact with content, you can: ",
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
                    children: ["Browse as a guest:"],
                  },
                  " You can explore content and participate in limited interactions without registering. When you first interact with the platform (e.g., posting, voting), a device-specific cryptographic identifier (DID) is automatically generated and stored on your device, then linked to a user account on our servers. This DID serves as a permanent session identifier for your device. Guest accounts are not verified and can only be accessed from the original device. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Soft login (session-based verification):"],
                  },
                  " Verify using ",
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " for event ticket verification using Group Proof of Credentials (GPC). This adds temporary event-based verification to your account but does NOT create a registered account. Soft login allows you to prove event participation without revealing ticket details. You can upgrade to a permanent registered account at any time by adding phone or passport verification. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Hard login (permanent registered account):"],
                  },
                  " Create a permanent verified account using one of the following methods: ",
                  {
                    tag: "ul",
                    children: [
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
                  " These methods create a registered account and ensure that your identity is validated while maintaining privacy. Agora receives only cryptographic proofs confirming uniqueness and eligibility, never the underlying identity documents or ticket information. ",
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
              " When you upgrade from guest or soft login to hard verification (phone or passport), all your existing content (posts, votes, follows, event verifications) is automatically transferred to your verified account, and your previous unverified account is deleted. This merge is permanent and cannot be undone. You cannot merge two verified accounts for security reasons. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Your Agora account will have a username, which can be manually selected or automatically generated. Usernames are public but do not need to be linked to your real identity. You may also provide optional profile details such as preferred topics, which can be modified or removed at any time. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Most content on Agora Citizen Network is public. When you submit content (e.g. a post, opinion or reaction), it is visible to all users and may be indexed by search engines. Agora also utilizes cryptographic proofs to provide data verifiability, which means certain interactions (such as account creation and participation) are publicly recorded in a decentralized manner. ",
            ],
          },
          {
            tag: "h3",
            children: ["Your Agora profile"],
          },
          {
            tag: "p",
            children: [
              " Your Agora profile is public by default and contains information such as: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["Username"],
              },
              {
                tag: "li",
                children: ["Unique User Identifier (UUID)"],
              },
              {
                tag: "li",
                children: [
                  " Activity history (posts, opinions, interactions (emojis, agree/disagree actions, claps, upvotes/downvotes), survey responses and flagged/reported content ",
                ],
              },
              {
                tag: "li",
                children: ["Communities and topics of interest"],
              },
              {
                tag: "li",
                children: [
                  " Verification status: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          " Verified via passport proof (user nullifier & bidirectional identity proofs) ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          " Verified via phone number (Agora-signed proof binding did:keys to user UUID) ",
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
              " Users have the option to post anonymously. When using this feature, usernames and profile pictures are replaced with generic identifiers, and content is not linked publicly to the user's profile. ",
            ],
          },
          {
            tag: "h3",
            children: ["Third-party services"],
          },
          {
            tag: "p",
            children: [
              " Agora uses third-party services that may process IP addresses and other personal data. Where possible, Agora configures services to use EU regional endpoints or uses EU-based providers. These services have their own privacy policies, and users are encouraged to review them. ",
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
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " (global, open-source) for event ticket and identity verification using Group Proof of Credentials (GPC). May process IP addresses for service operations. Zupass uses Simple Analytics for privacy-friendly web analytics. ",
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
                  " (global) for phone number verification. Twilio stores phone numbers in cleartext and processes IP addresses for fraud prevention. Note that Agora only stores hashed phone numbers (never in cleartext) in our database, but Twilio retains phone numbers according to their own privacy policy. ",
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
                  " (global) for DDoS protection and security. Processes IP addresses. ",
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
                  " (EU: Dublin and Paris) for hosting infrastructure, data storage, and computing resources. Processes IP addresses for infrastructure operations. ",
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
                  " (U.S. based, us-central1 region) for AI-powered translation of user posts and platform-generated content. May process IP addresses for infrastructure operations. ",
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
                  " (EU-based) for privacy-friendly web analytics. Temporarily processes IP addresses for visitor counting but does not store them (see their data policy for details). ",
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
                  " (EU servers) for error tracking and crash reporting. Processes IP addresses for debugging purposes. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              ' Services marked as "global" operate with appropriate GDPR safeguards as described in Article 3. Users concerned about IP address privacy are encouraged to use Tor or other mixnet solutions when accessing Agora. ',
            ],
          },
          {
            tag: "h3",
            children: ["Cookies and analytics"],
          },
          {
            tag: "p",
            children: [
              " Agora does not use advertising or cross-site tracking cookies, nor do we sell data for advertising. We use Plausible Analytics, an EU-based analytics service that does not employ cookies, and Sentry for limited error and performance telemetry. For more details, visit ",
              {
                tag: "a",
                children: ["Plausible Analytics"],
                href: "https://plausible.io/about",
                external: true,
              },
              ". ",
            ],
          },
          {
            tag: "p",
            children: [
              " We only use session/authentication cookies, which are strictly necessary for the functioning of the website. ",
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
            children: ["1.1. We collect and use your personal data when you:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["use our website (https://agoracitizen.network/);"],
              },
              {
                tag: "li",
                children: ["use our mobile app; and"],
              },
              {
                tag: "li",
                children: [
                  " communicate with us by email or any other digital communication channel. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 1.2. This privacy policy may be amended as set forth in Article 8. ",
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
              " We will only process your personal data for a specific purpose and to the extent permitted by law. We further explain below in which cases we collect and use your personal data. If we do not receive your personal data directly from you, we will also inform you of this below. ",
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
                            children: [
                              "Device Identifier (DID - Decentralized Identifier)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " A cryptographic public key (did:key format) generated and stored on your device, then linked to your user account on our servers. DIDs serve as permanent session identifiers that connect your device to your account. DIDs are stored for all users (guest, soft login, and hard login) to maintain device-based sessions. ",
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
                              "Soft Login - Event Ticket Verification (Zupass)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " When you verify using Zupass, we store an event-specific nullifier (privacy-preserving identifier derived from your ticket) and the event slug. This proves event participation without revealing ticket details. Soft login does NOT create a registered account but allows session-based verification that can be upgraded to permanent registration. ",
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
                          " To authenticate users and deliver one-time verification codes. Phone numbers are stored as cryptographic hashes in our database. Twilio (our SMS provider) processes and stores phone numbers in cleartext to deliver verification codes. Phone verification creates a permanent registered account. ",
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
                          " To verify user eligibility through privacy-preserving passport verification. We store a passport-derived nullifier, citizenship country code, and sex. Agora receives only the cryptographic proof confirming uniqueness and eligibility, never your passport number, name, photo, or other passport details. Passport verification creates a permanent registered account. ",
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
                          " (Username, Preferred Language, Gender and Nationality (if passport verified)) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " To create and manage user accounts, customize user experience. This data will be aggregated for analytics, insights, and monetization purposes. ",
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
                          " (Posts, Opinions, Replies, Reactions, surveys) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " To facilitate discussions, user interactions and engagement on the platform. This data will be aggregated for analytics, insights, and monetization purposes. ",
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
                          " To safeguard platform infrastructure, prevent malicious activities and ensure operational security (e.g. protection against Distributed Denial-of-Service (DDoS) attacks). ",
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
                          " (User UUIDs, usernames, request metadata, error logs, timestamps) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " For system monitoring, debugging, performance optimization, and improving service reliability. We do NOT log sensitive PII such as phone numbers in application logs. ",
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
                          " (Identity and contact details provided by you to us, the content of the communication, the technical details of the communication itself (e.g. date and time) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " To enable communication between you and us (e.g. when you contact us via social media, telephone or email). ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Our legitimate interest in being able to respond to requests, questions or comments or to contact you proactively for questions of any kind. ",
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
                          " To comply with our legal obligations or to comply with any reasonable request from competent police authorities, judicial authorities, government institutions or bodies, including competent data protection authorities. ",
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
                          " To prevent, detect and combat fraud or other illegal or unauthorized activities. ",
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
                          " Our legitimate interest in using your personal data in these proceedings. ",
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
                          " To inform a third party in the context of a possible merger with, acquisition of/by or demerger by that third party, even if that third party is located outside the EU. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Our legitimate interest in entering into business transactions. ",
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
                          " (User content, devices, event tickets, preferences) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " When you upgrade from guest or soft login to hard verification (phone or passport), all your data is transferred to your verified account and your previous account is deleted. This ensures continuity of your content and activity history while adding permanent verification. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Your consent and our legitimate interest."],
                      },
                    ],
                  },
                ],
              },
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
              " 3.1. In principle, we do not share your personal data with anyone other than the persons who work for us, as well as with the suppliers who help us process your personal data. Anyone who has access to your personal data will always be bound by strict legal or contractual obligations to keep your personal data safe and confidential. This means that only the following categories of recipients will receive your personal data: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["You;"],
              },
              {
                tag: "li",
                children: ["Our employees and suppliers; and"],
              },
              {
                tag: "li",
                children: [
                  " Government or judicial authorities to the extent that we are obliged to share your personal data with them (e.g. tax authorities, police or judicial authorities). ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. We send your personal data outside the European Economic Area (EEA) (the European Economic Area consists of the EU, Liechtenstein, Norway and Iceland). We will transfer this personal data outside the EEA to communicate with the categories of recipients of your personal data as defined in this Article 3. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. We will apply appropriate safeguards to protect your personal data during transfers, such as working only with processors located in countries that have an European Commission adequacy decision or are certified under an approved framework like the EU-U.S. Data Privacy Framework. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. If there is no European Commission adequacy decision for the destination country, we will use appropriate safeguards, as described in Article 46 of the GDPR, when transferring personal data, and such transfers and technical and organisational security measures will be documented in accordance with Article 30 of the GDPR. For example, we use standard contractual clauses to protect the transfer of personal data to countries outside the European Economic Area (EEA), thus insuring that an equivalent level of data protection applies to your personal data even if EU data protection law is not directly applicable. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. Agora may transfer anonymized and/or aggregated data to organizations outside the jurisdiction in which you provide it. Should such transfer take place, Agora will ensure that there are safeguards in place to ensure the safety and integrity of your data and all rights with respect to your personal data you might enjoy under applicable mandatory law. ",
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
              " 4.1. Your personal data will only be processed for as long as necessary to achieve the purposes described above or, when we have asked you for your consent, until you withdraw your consent. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. As a general rule, we will de-identify your personal data when it is no longer needed for the purposes described above. However, we cannot delete your personal data if there is a legal or regulatory obligation or a court or administrative order preventing us from doing so. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. We retain all personal data collected through our website or mobile app, for as long as necessary to protect the legitimate interests stated in Article 2 or until your consent is withdrawn. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. All personal data we collect through our interactions with you through social media, telephone, email or other digital communication channels will be retained for as long as necessary to communicate with you, but also to maintain a historical record of our communications. This allows us to return to previous communications when you come back to us with new questions, requests, comments or other input. ",
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
              " 5.1. At Agora, safeguarding your personal data is a top priority. We have implemented a range of technical and organizational measures to ensure that all personal data processed remains secure. These measures include: ",
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
                    children: ["Data minimization and privacy by design:"],
                  },
                  " We only collect the minimum personal data necessary for platform functionality, avoiding the storage of sensitive information whenever possible. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Encryption and pseudonymization:"],
                  },
                  ' Personal data is encrypted, and pseudonymization techniques are applied to protect user identities. For example, phone numbers are never stored in plaintext; instead, we apply a cryptographic "pepper" and hash them to prevent unauthorized access. ',
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Zero-knowledge proof authentication:"],
                  },
                  " Agora leverages zero-knowledge proofs (ZKP) for passport verification, ensuring that users can prove their eligibility without revealing sensitive personal information. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Decentralized cryptographic proofs:"],
                  },
                  " Certain user interactions (such as account creation and participation) are publicly verifiable through cryptographic proofs without revealing user identities. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Secure authentication:"],
                  },
                  " We do not store passwords. Instead, authentication is handled through one-time verification codes or cryptographic keys, reducing the risk of credential leaks. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Infrastructure protection:"],
                  },
                  " Our platform is secured against cyber threats using DDoS protection, access controls, and network monitoring to detect and mitigate attacks. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Transparency and user control:"],
                  },
                  " Users have the ability to manage their personal data, delete their account and control how their information is processed. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Regular security evaluations:"],
                  },
                  " Our security measures are periodically reviewed and updated to address emerging threats and improve data protection. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Controlled access to logs and analytics:"],
                  },
                  " Only aggregated and anonymized analytics data is used for performance monitoring and improving user experience. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Data redundancy and backups:"],
                  },
                  " Data is securely stored on AWS servers in Dublin, Ireland and replicated in Paris, France for disaster recovery purposes, with strict access controls and encryption measures. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Limited metadata collection:"],
                  },
                  " Agora application logs do not deliberately record IP addresses. Infrastructure and error monitoring providers, including Cloudflare, cloud service providers, and Sentry, may process IP addresses for security, operations, or debugging. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Anonymized AI translation:"],
                  },
                  " Content sent to Google Cloud Platform for translation is transmitted as-is without any accompanying metadata (user identifiers, etc.) and processed in the U.S. (us-central1 region). The Google Cloud LLM-based translation service we use is currently not available in the EU region. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "Use of ",
                      {
                        tag: "a",
                        children: ["Sentry.io"],
                        href: "https://sentry.io/privacy/",
                        external: true,
                      },
                      " for privacy-reduced crash reports:",
                    ],
                  },
                  " Agora utilizes Sentry (hosted on EU servers) for error tracking and crash reporting purposes. Routine sessions are not uploaded for Session Replay; when an error occurs, buffered recent interaction data may be uploaded to help diagnose the failure. Replay masks text and inputs, blocks media, disables network body capture, and masks configured text and form attributes before recording. Navigation and network custom recording events are scrubbed, and the Replay event's visited-URL list is sanitized before upload. First-party Agora and ZKorum URLs may retain paths and pseudonymous route identifiers, but credentials, query strings, and fragments are removed. External URLs are reduced to their origins, while unsafe URL schemes are redacted. Error events also remove request URLs and arbitrary extra data, retain only an explicit allowlist of technical contexts, and omit console and user-interface breadcrumbs. For one specific stack-overflow diagnostic, a narrowly limited attachment may include structural page-layout flags but not OTP state, drafts, onboarding state, identifiers, or user-generated content. Replay and error reports can still contain structural DOM, pseudonymous route paths, resource origins, technical, and interaction metadata, and Sentry may process IP addresses as described in its privacy policy. Sentry does not use tracking cookies. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Pseudonymous logging for monitoring:"],
                  },
                  " Agora collects pseudonymous technical data for system monitoring, debugging, and performance optimization purposes. This includes user UUIDs, usernames, request metadata, and error logs. We do NOT log sensitive PII such as phone numbers in our application logs. However, third-party services like Twilio, AWS, Cloudflare, and others may retain data (including IP addresses and, in Twilio's case, phone numbers) according to their own privacy policies and retention schedules. ",
                ],
              },
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
              " 6.1. When we collect and use your personal data, you will enjoy a number of rights that you can exercise in the manner described below. Please note that when you wish to exercise a right, we will ask you for proof of identity. We do this to prevent a personal data breach (e.g. because an unauthorized person is impersonating you and is exercising a right in your name). ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2. Depending on the processing and the legal basis, as a data subject you have a number of possibilities to keep control over your personal data: ",
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
              " 6.3. We should point out to you that these rights are not always absolute, that in certain circumstances we are entitled or even required by law to further process your personal data and that we may therefore not always be able to comply (fully) with your request. In such cases, we will inform you accordingly. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. You may exercise these rights free of charge, except in cases of abuse and in which case we are entitled to charge an administration fee to comply with your request. ",
            ],
          },
          {
            tag: "p",
            children: [
              ' 6.5. Note that you can delete your own reactions, claps, upvote/downvote, survey responses, agree/disagree actions, conversations, opinions, replies, "views" information and the language spoken (at least one must remain). ',
            ],
          },
          {
            tag: "h3",
            children: ["6.6. Security records:"],
          },
          {
            tag: "p",
            children: [
              " Some security records are retained after account deletion to protect the service: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " Short-lived User Controlled Authorization Network (UCAN) token hashes used for replay attack protection ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " These records are kept only for the duration needed to prevent reused authorization tokens. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. How to delete your account:"],
          },
          {
            tag: "p",
            children: [
              " When you delete your account, it is ",
              {
                tag: "strong",
                children: ["immediately inaccessible"],
              },
              " and cannot be recovered. The deletion process follows this timeline: ",
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
                    children: ["Immediate:"],
                  },
                  " Your account is soft-deleted and becomes inaccessible. All devices are logged out. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["After 15 days:"],
                  },
                  " Your account data is permanently deleted (hard-deleted) from our database. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Up to 30 days after that:"],
                  },
                  " Data may persist in encrypted backups for disaster recovery purposes. ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["What happens upon deletion:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " Your account becomes immediately inaccessible and cannot be restored ",
                ],
              },
              {
                tag: "li",
                children: [
                  "All devices are logged out and your session is terminated",
                ],
              },
              {
                tag: "li",
                children: [
                  " Your verification credentials (phone number, passport proof, event tickets) are invalidated ",
                ],
              },
              {
                tag: "li",
                children: [
                  " Your content (posts, votes, opinions) remains on the platform but is no longer publicly associated with your account ",
                ],
              },
              {
                tag: "li",
                children: [
                  " After 15 days, your account data is permanently removed from our database ",
                ],
              },
              {
                tag: "li",
                children: [
                  " Cryptographic proofs of account actions are not retained after verification ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["Third-party data retention:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Database backups:"],
                  },
                  " Data may persist in encrypted AWS backups for up to 30 days after the 15-day hard deletion ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Twilio:"],
                  },
                  " Phone verification records are retained according to ",
                  {
                    tag: "a",
                    children: ["Twilio's privacy policy"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Third-party services:"],
                  },
                  " Logs and data in Sentry, Cloudflare, AWS, and Google Cloud may be retained according to their respective privacy policies ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["Important:"],
              },
              " Deletion is immediate and irreversible. You cannot recover your account after requesting deletion. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. If you have a complaint about the processing of your personal data by us, you can always contact us at ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". If you are not satisfied with our response, you may lodge a complaint with the competent data protection authority, i.e. the French Commission nationale de l'informatique et des libertés (",
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
              ' 7.1. Pursuant to the California Consumer Privacy Act of 2018 ("the CCPA"), we provide the following additional details to California residents. During the preceding 12 months, we have collected, used, and shared the categories of your personal information described above in this privacy policy for our operational business purposes. ',
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. We have not sold your personal information, meaning that we have not disclosed your personal information for monetary or other valuable consideration. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. You have the right to request access or deletion of your personal information and to request transparency about our privacy practices. If you would like to exercise your rights under the CCPA, please see Article 6. Once we receive your request, we will verify it by requesting information to confirm your identity, including by asking you for additional information. If you would like to use an agent registered with the California Secretary of State to exercise your rights, we may request evidence that you have provided such agent with power of attorney or that the agent otherwise has valid written authority to submit requests to exercise rights on your behalf. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. If you choose to exercise your rights, we will not charge you different prices or provide different quality of services for exercising your rights unless those differences are permitted by law. ",
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
              " 8.1. We can change this privacy policy on our own initiative at any time. If material changes to this privacy policy may affect the processing of your personal data, we will communicate these changes to you in a way that we normally communicate with you (e.g. via e-mail or via a message on the platform). ",
            ],
          },
          {
            tag: "p",
            children: [
              " 8.2. We invite you to read the latest version of this privacy policy on our website (https://agoracitizen.network/). The privacy policy states the date our privacy policy was last changed. ",
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
              " 9.1. Should you have any further questions about the processing of your personal data, please do not hesitate to contact our privacy manager. You can contact our privacy manager by e-mail: ",
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
        "تُرجمت سياسة الخصوصية هذه آليًا. النسخة الإنجليزية هي النسخة الرسمية الوحيدة، وهي التي تسود حصريًا في حال وجود أي تعارض.",
      viewEnglish: "عرض النسخة الإنجليزية الرسمية",
      returnToTranslation: "العودة إلى النسخة المترجمة",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["آخر تحديث بتاريخ"],
          },
          ": 2025/11/11 (السنة/الشهر/اليوم)",
        ],
      },
      {
        tag: "p",
        children: [
          " تم تطوير شبكة Agora Citizen بواسطة ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          ". في ZKorum، نؤمن بأن الخصوصية هي حق أساسي. مهمتنا هي تمكين المستخدمين من المشاركة في الخطاب السياسي والاجتماعي مع الحفاظ على السيطرة على هويتهم ومعلوماتهم الشخصية. ",
        ],
      },
      {
        tag: "p",
        children: [
          ' تشرح سياسة الخصوصية هذه كيف ولماذا تقوم شبكة Agora Citizen Network ("Agora" أو "نحن" أو "نا" أو "ZKorum") بجمع المعلومات الخاصة بك واستخدامها ومشاركتها عند استخدام موقعنا الإلكتروني وتطبيقات الهاتف المحمول (يُشار إليها إجمالاً باسم "الخدمات") أو عندما تتفاعل معنا بطريقة أخرى. نحن مسؤولون عن جمع واستخدام بياناتك الشخصية بالطريقة الموضحة في سياسة الخصوصية هذه. ',
        ],
      },
      {
        tag: "p",
        children: [
          " إذا كان لديك أي أسئلة حول هذا، يرجى الاتصال بنا عن طريق البريد الإلكتروني: ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". إذا كنت مقيمًا في كاليفورنيا، نود أن نلفت انتباهك إلى المادة 7. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["أغورا هي منصة عامة"],
          },
          {
            tag: "p",
            children: [
              " معظم المحتوى الموجود على Agora متاح للعامة، مما يعني أنه يمكن لأي شخص الاطلاع على ملفك الشخصي ومشاركاتك وتصويتاتك وآرائك، حتى بدون حساب. ",
            ],
          },
          {
            tag: "p",
            children: [
              " ليس مطلوبًا منك إنشاء حساب لتصفح أغورا. للمشاركة في المناقشات والتفاعل مع المحتوى، يمكنك: ",
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
                    children: ["تصفح كضيف:"],
                  },
                  " يمكنك استكشاف المحتوى والمشاركة في تفاعلات محدودة دون التسجيل. عندما تتفاعل لأول مرة مع النظام الأساسي (على سبيل المثال، النشر والتصويت)، يتم إنشاء معرف التشفير الخاص بالجهاز (DID) تلقائيًا وتخزينه على جهازك، ثم ربطه بحساب مستخدم على خوادمنا. يعمل DID هذا كمعرف جلسة دائمة لجهازك. لم يتم التحقق من حسابات الضيوف ولا يمكن الوصول إليها إلا من الجهاز الأصلي. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "تسجيل الدخول المبسط (التحقق المستند إلى الجلسة):",
                    ],
                  },
                  " التحقق باستخدام ",
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " للتحقق من تذكرة الحدث باستخدام إثبات بيانات الاعتماد الجماعي (GPC). يؤدي هذا إلى إضافة تحقق مؤقت قائم على الحدث إلى حسابك ولكنه لا يؤدي إلى إنشاء حساب مسجل. يتيح لك تسجيل الدخول المبسط إثبات المشاركة في الحدث دون الكشف عن تفاصيل التذكرة. يمكنك الترقية إلى حساب مسجل دائم في أي وقت عن طريق إضافة التحقق من الهاتف أو جواز السفر. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["تسجيل الدخول الثابت (حساب مسجل دائم):"],
                  },
                  " قم بإنشاء حساب مؤكد دائم باستخدام إحدى الطرق التالية: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["رقم التليفون:"],
                          },
                          " تم التحقق من خلال رمز لمرة واحدة يتم إرساله عبر الرسائل القصيرة ",
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
                          ": التحقق من إثبات المعرفة الصفرية (ZKP) القائم على جواز السفر ",
                        ],
                      },
                    ],
                  },
                  " تقوم هذه الطرق بإنشاء حساب مسجل وتضمن التحقق من هويتك مع الحفاظ على الخصوصية. تتلقى Agora فقط أدلة التشفير التي تؤكد التفرد والأهلية، ولا تتلقى أبدًا وثائق الهوية الأساسية أو معلومات التذكرة. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["ترقيات الحساب:"],
              },
              " عند الترقية من تسجيل دخول الضيف أو تسجيل الدخول المبدئي إلى التحقق الثابت (الهاتف أو جواز السفر)، يتم نقل كل المحتوى الحالي الخاص بك (المشاركات والتصويتات والمتابعات وعمليات التحقق من الأحداث) تلقائيًا إلى حسابك الذي تم التحقق منه، ويتم حذف حسابك السابق الذي لم يتم التحقق منه. يعتبر هذا الدمج دائمًا ولا يمكن التراجع عنه. لا يمكنك دمج حسابين تم التحقق منهما لأسباب أمنية. ",
            ],
          },
          {
            tag: "p",
            children: [
              " سيكون لحساب Agora الخاص بك اسم مستخدم يمكن تحديده يدويًا أو إنشاؤه تلقائيًا. أسماء المستخدمين عامة ولكن لا يلزم ربطها بهويتك الحقيقية. يمكنك أيضًا تقديم تفاصيل الملف الشخصي الاختيارية مثل الموضوعات المفضلة، والتي يمكن تعديلها أو إزالتها في أي وقت. ",
            ],
          },
          {
            tag: "p",
            children: [
              " معظم المحتوى الموجود على Agora Citizen Network عام. عندما تقوم بإرسال محتوى (على سبيل المثال، منشور أو رأي أو رد فعل)، فإنه يكون مرئيًا لجميع المستخدمين ويمكن أن تتم فهرسته بواسطة محركات البحث. تستخدم Agora أيضًا أدلة التشفير لتوفير إمكانية التحقق من البيانات، مما يعني أن بعض التفاعلات (مثل إنشاء الحساب والمشاركة) يتم تسجيلها علنًا بطريقة لا مركزية. ",
            ],
          },
          {
            tag: "h3",
            children: ["ملفك الشخصي في أغورا"],
          },
          {
            tag: "p",
            children: [
              " يكون ملفك الشخصي في Agora عامًا بشكل افتراضي ويحتوي على معلومات مثل: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["اسم المستخدم"],
              },
              {
                tag: "li",
                children: ["معرف المستخدم الفريد (UUID)"],
              },
              {
                tag: "li",
                children: [
                  " سجل النشاط (المشاركات والآراء والتفاعلات (الرموز التعبيرية وإجراءات الموافقة/عدم الموافقة والتصفيق والتصويتات المؤيدة/التصويتات السلبية) وإجابات الاستطلاع والمحتوى الذي تم وضع علامة عليه/الإبلاغ عنه ",
                ],
              },
              {
                tag: "li",
                children: ["المجتمعات والموضوعات ذات الاهتمام"],
              },
              {
                tag: "li",
                children: [
                  " حالة التحقق: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          " تم التحقق منه عبر إثبات جواز السفر (بطلان المستخدم وإثباتات الهوية ثنائية الاتجاه) ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          " تم التحقق منه عبر رقم الهاتف (تم ربط إثبات موقع Agora: مفاتيح UUID للمستخدم) ",
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
              " لدى المستخدمين خيار النشر بشكل مجهول. عند استخدام هذه الميزة، يتم استبدال أسماء المستخدمين وصور الملفات الشخصية بمعرفات عامة، ولا يتم ربط المحتوى بشكل عام بالملف الشخصي للمستخدم. ",
            ],
          },
          {
            tag: "h3",
            children: ["خدمات الطرف الثالث"],
          },
          {
            tag: "p",
            children: [
              " تستخدم Agora خدمات الجهات الخارجية التي قد تعالج عناوين IP والبيانات الشخصية الأخرى. حيثما أمكن، تقوم Agora بتكوين الخدمات لاستخدام نقاط النهاية الإقليمية للاتحاد الأوروبي أو تستخدم موفري الخدمة المقيمين في الاتحاد الأوروبي. تتمتع هذه الخدمات بسياسات الخصوصية الخاصة بها، ويتم تشجيع المستخدمين على مراجعتها. ",
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
                  " (عالمي) لإثباتات الهوية ذات المعرفة الصفرية. قد يعالج عناوين IP لعمليات الأمان والخدمة. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " (عالمي ومفتوح المصدر) لتذكرة الحدث والتحقق من الهوية باستخدام إثبات بيانات الاعتماد الجماعي (GPC). قد يعالج عناوين IP لعمليات الخدمة. يستخدم Zupass تحليلات بسيطة لتحليلات الويب الصديقة للخصوصية. ",
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
                  " (عالمي) للتحقق من رقم الهاتف. يقوم Twilio بتخزين أرقام الهواتف بنص واضح ومعالجة عناوين IP لمنع الاحتيال. لاحظ أن Agora تقوم فقط بتخزين أرقام الهواتف المجزأة (ليس بنص واضح أبدًا) في قاعدة البيانات الخاصة بنا، ولكن Twilio تحتفظ بأرقام الهواتف وفقًا لسياسة الخصوصية الخاصة بها. ",
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
                  " (عالمي) لحماية وأمان DDoS. يعالج عناوين IP. ",
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
                  " (الاتحاد الأوروبي: دبلن وباريس) لاستضافة البنية التحتية وتخزين البيانات وموارد الحوسبة. يعالج عناوين IP لعمليات البنية التحتية. ",
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
                  " (مقرها الولايات المتحدة، منطقة وسط الولايات المتحدة 1) للترجمة المدعومة بالذكاء الاصطناعي لمشاركات المستخدمين والمحتوى الذي يتم إنشاؤه بواسطة النظام الأساسي. قد يعالج عناوين IP لعمليات البنية التحتية. ",
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
                  " (مقرها الاتحاد الأوروبي) لتحليلات الويب الصديقة للخصوصية. يعالج عناوين IP بشكل مؤقت لحساب عدد الزوار ولكن لا يخزنها (راجع سياسة البيانات الخاصة بهم للحصول على التفاصيل). ",
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
                  " (خوادم الاتحاد الأوروبي) لتتبع الأخطاء والإبلاغ عن الأعطال. يعالج عناوين IP لأغراض التصحيح. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              ' تعمل الخدمات التي تحمل علامة "عالمية" مع ضمانات اللائحة العامة لحماية البيانات (GDPR) المناسبة كما هو موضح في المادة 3. ويتم تشجيع المستخدمين المهتمين بخصوصية عنوان IP على استخدام Tor أو حلول mixnet الأخرى عند الوصول إلى Agora. ',
            ],
          },
          {
            tag: "h3",
            children: ["ملفات تعريف الارتباط والتحليلات"],
          },
          {
            tag: "p",
            children: [
              " لا تستخدم Agora ملفات تعريف الارتباط للإعلانات أو التتبع عبر المواقع، ولا نبيع البيانات للإعلان. نحن نستخدم Plausible Analytics، وهي خدمة تحليلية مقرها الاتحاد الأوروبي ولا تستخدم ملفات تعريف الارتباط، وSentry لقياس الأخطاء المحدودة وقياس الأداء عن بعد. لمزيد من التفاصيل، قم بزيارة ",
              {
                tag: "a",
                children: ["Plausible Analytics"],
                href: "https://plausible.io/about",
                external: true,
              },
              ". ",
            ],
          },
          {
            tag: "p",
            children: [
              " نحن نستخدم فقط ملفات تعريف الارتباط الخاصة بالجلسة/المصادقة، والتي تعتبر ضرورية للغاية لتشغيل الموقع. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["1. متى يتم تطبيق سياسة الخصوصية هذه؟"],
          },
          {
            tag: "p",
            children: ["1.1. نقوم بجمع واستخدام بياناتك الشخصية عندما:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "استخدم موقعنا الإلكتروني (https://agoracitizen.network/)؛",
                ],
              },
              {
                tag: "li",
                children: ["استخدام التطبيق المحمول لدينا؛ و"],
              },
              {
                tag: "li",
                children: [
                  " التواصل معنا عبر البريد الإلكتروني أو أي قناة اتصال رقمية أخرى. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 1.2. يجوز تعديل سياسة الخصوصية هذه على النحو المنصوص عليه في المادة 8. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. ما هي البيانات الشخصية التي نقوم بمعالجتها ولماذا؟"],
          },
          {
            tag: "p",
            children: [
              " سنقوم بمعالجة بياناتك الشخصية فقط لغرض محدد وإلى الحد الذي يسمح به القانون. نوضح أيضًا أدناه الحالات التي نجمع فيها بياناتك الشخصية ونستخدمها. إذا لم نتلق بياناتك الشخصية منك مباشرةً، فسنبلغك بذلك أيضًا أدناه. ",
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
                        children: ["الأساس القانوني؟"],
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
                            children: ["معرف الجهاز (DID - المعرف اللامركزي)"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " يتم إنشاء مفتاح عام مشفر (did:key format) وتخزينه على جهازك، ثم ربطه بحساب المستخدم الخاص بك على خوادمنا. تعمل معرفات DID كمعرفات جلسة دائمة تربط جهازك بحسابك. يتم تخزين معرفات DID لجميع المستخدمين (الضيف، وتسجيل الدخول المبسط، وتسجيل الدخول الثابت) للحفاظ على الجلسات المستندة إلى الجهاز. ",
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
                              "تسجيل الدخول المبدئي - التحقق من تذكرة الحدث (Zupass)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " عند التحقق من استخدام Zupass، نقوم بتخزين مُبطل خاص بالحدث (معرف الحفاظ على الخصوصية المشتق من تذكرتك) ورابط الحدث. وهذا يثبت المشاركة في الحدث دون الكشف عن تفاصيل التذكرة. لا يؤدي تسجيل الدخول المبسط إلى إنشاء حساب مسجل ولكنه يسمح بالتحقق المستند إلى الجلسة والذي يمكن ترقيته إلى التسجيل الدائم. ",
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
                          " لمصادقة المستخدمين وتسليم رموز التحقق لمرة واحدة. يتم تخزين أرقام الهواتف كتجزئة تشفير في قاعدة بياناتنا. يقوم Twilio (موفر خدمة الرسائل القصيرة لدينا) بمعالجة وتخزين أرقام الهواتف بنص واضح لتقديم رموز التحقق. يؤدي التحقق من الهاتف إلى إنشاء حساب مسجل دائم. ",
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
                              "بيانات المصادقة - إثبات عدم المعرفة بجواز السفر (Rarimo)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " للتحقق من أهلية المستخدم من خلال التحقق من جواز السفر مع الحفاظ على الخصوصية. نقوم بتخزين مُبطل مشتق من جواز السفر، ورمز دولة المواطنة، والجنس. تتلقى Agora فقط إثبات التشفير الذي يؤكد التفرد والأهلية، وليس رقم جواز السفر أو الاسم أو الصورة أو تفاصيل جواز السفر الأخرى. يؤدي التحقق من جواز السفر إلى إنشاء حساب مسجل دائم. ",
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
                          " (اسم المستخدم واللغة المفضلة والجنس والجنسية (إذا تم التحقق من جواز السفر)) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " لإنشاء حسابات مستخدمين وإدارتها، قم بتخصيص تجربة المستخدم. سيتم تجميع هذه البيانات لأغراض التحليلات والرؤى وتحقيق الدخل. ",
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
                          " (المشاركات والآراء والردود وردود الفعل والاستطلاعات) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " لتسهيل المناقشات وتفاعلات المستخدم والمشاركة على المنصة. سيتم تجميع هذه البيانات لأغراض التحليلات والرؤى وتحقيق الدخل. ",
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
                        children: [
                          " لحماية البنية التحتية للنظام الأساسي ومنع الأنشطة الضارة وضمان الأمان التشغيلي (مثل الحماية ضد هجمات رفض الخدمة الموزعة (DDoS)). ",
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
                            children: ["بيانات فنية مجهولة المصدر"],
                          },
                          " (معرفات UUID الخاصة بالمستخدم، وأسماء المستخدمين، وبيانات تعريف الطلب، وسجلات الأخطاء، والطوابع الزمنية) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " لمراقبة النظام وتصحيح الأخطاء وتحسين الأداء وتحسين موثوقية الخدمة. نحن لا نسجل معلومات تحديد الهوية الشخصية (PII) الحساسة، مثل أرقام الهواتف، في سجلات التطبيقات. ",
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
                            children: ["تواصل"],
                          },
                          " (الهوية وتفاصيل الاتصال التي قدمتها لنا، ومحتوى الاتصال، والتفاصيل الفنية للاتصال نفسه (مثل التاريخ والوقت) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " لتمكين التواصل بينك وبيننا (على سبيل المثال، عند الاتصال بنا عبر وسائل التواصل الاجتماعي أو الهاتف أو البريد الإلكتروني). ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " مصلحتنا المشروعة هي القدرة على الرد على الطلبات أو الأسئلة أو التعليقات أو الاتصال بك بشكل استباقي لطرح أسئلة من أي نوع. ",
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
                          " للامتثال لالتزاماتنا القانونية أو الامتثال لأي طلب معقول من سلطات الشرطة المختصة أو السلطات القضائية أو المؤسسات أو الهيئات الحكومية، بما في ذلك سلطات حماية البيانات المختصة. ",
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
                          " لمنع وكشف ومكافحة الاحتيال أو غيرها من الأنشطة غير القانونية أو غير المصرح بها. ",
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
                        children: ["للدفاع عن أنفسنا في الإجراءات القانونية."],
                      },
                      {
                        tag: "td",
                        children: [
                          " مصلحتنا المشروعة في استخدام بياناتك الشخصية في هذه الإجراءات. ",
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
                          " لإبلاغ طرف ثالث في سياق الاندماج المحتمل مع هذا الطرف الثالث أو الاستحواذ عليه/بواسطته أو الانفصال عنه، حتى لو كان هذا الطرف الثالث موجودًا خارج الاتحاد الأوروبي. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " مصلحتنا المشروعة في الدخول في معاملات تجارية. ",
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
                            children: ["ترقية/دمج بيانات الحساب"],
                          },
                          " (محتوى المستخدم، الأجهزة، تذاكر الأحداث، التفضيلات) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " عند الترقية من تسجيل الدخول الضيف أو تسجيل الدخول المبسط إلى التحقق الثابت (الهاتف أو جواز السفر)، يتم نقل جميع بياناتك إلى حسابك الذي تم التحقق منه ويتم حذف حسابك السابق. وهذا يضمن استمرارية المحتوى الخاص بك وسجل النشاط مع إضافة التحقق الدائم. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["موافقتك ومصلحتنا المشروعة."],
                      },
                    ],
                  },
                ],
              },
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
            children: [
              " 3.1. من حيث المبدأ، نحن لا نشارك بياناتك الشخصية مع أي شخص آخر غير الأشخاص الذين يعملون لدينا، وكذلك مع الموردين الذين يساعدوننا في معالجة بياناتك الشخصية. سيكون أي شخص لديه حق الوصول إلى بياناتك الشخصية ملزمًا دائمًا بالتزامات قانونية أو تعاقدية صارمة للحفاظ على بياناتك الشخصية آمنة وسرية. وهذا يعني أن الفئات التالية من المستلمين فقط هي التي ستتلقى بياناتك الشخصية: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["أنت؛"],
              },
              {
                tag: "li",
                children: ["موظفينا وموردينا؛ و"],
              },
              {
                tag: "li",
                children: [
                  " السلطات الحكومية أو القضائية إلى الحد الذي نكون فيه ملزمين بمشاركة بياناتك الشخصية معهم (مثل السلطات الضريبية أو الشرطة أو السلطات القضائية). ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. نرسل بياناتك الشخصية خارج المنطقة الاقتصادية الأوروبية (EEA) (تتكون المنطقة الاقتصادية الأوروبية من الاتحاد الأوروبي وليختنشتاين والنرويج وأيسلندا). سنقوم بنقل هذه البيانات الشخصية خارج المنطقة الاقتصادية الأوروبية للتواصل مع فئات متلقي بياناتك الشخصية على النحو المحدد في هذه المادة 3. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. سنطبق الضمانات المناسبة لحماية بياناتك الشخصية أثناء عمليات النقل، مثل العمل فقط مع المعالجين الموجودين في البلدان التي لديها قرار كفاية من المفوضية الأوروبية أو معتمدة بموجب إطار عمل معتمد مثل الاتحاد الأوروبي والولايات المتحدة. إطار خصوصية البيانات. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. إذا لم يكن هناك قرار ملائم من المفوضية الأوروبية لبلد الوجهة، فسنستخدم الضمانات المناسبة، كما هو موضح في المادة 46 من اللائحة العامة لحماية البيانات، عند نقل البيانات الشخصية، وسيتم توثيق عمليات النقل والتدابير الأمنية الفنية والتنظيمية وفقًا للمادة 30 من اللائحة العامة لحماية البيانات. على سبيل المثال، نستخدم بنودًا تعاقدية قياسية لحماية نقل البيانات الشخصية إلى بلدان خارج المنطقة الاقتصادية الأوروبية (EEA)، وبالتالي ضمان تطبيق مستوى مكافئ من حماية البيانات على بياناتك الشخصية حتى لو كان قانون حماية البيانات في الاتحاد الأوروبي غير قابل للتطبيق بشكل مباشر. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. يجوز لشركة Agora نقل بيانات مجهولة المصدر و/أو مجمعة إلى مؤسسات خارج نطاق الولاية القضائية التي تقدمها فيها. في حالة حدوث هذا النقل، ستضمن Agora وجود ضمانات معمول بها لضمان سلامة وسلامة بياناتك وجميع الحقوق المتعلقة ببياناتك الشخصية التي قد تتمتع بها بموجب القانون الإلزامي المعمول به. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["4. ما المدة التي نحتفظ فيها ببياناتك الشخصية؟"],
          },
          {
            tag: "p",
            children: [
              " 4.1. لن تتم معالجة بياناتك الشخصية إلا طالما كان ذلك ضروريًا لتحقيق الأغراض الموضحة أعلاه، أو عندما نطلب موافقتك، حتى تسحب موافقتك. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. كقاعدة عامة، سنقوم بإلغاء تعريف بياناتك الشخصية عندما لا تكون هناك حاجة إليها للأغراض الموضحة أعلاه. ومع ذلك، لا يمكننا حذف بياناتك الشخصية إذا كان هناك التزام قانوني أو تنظيمي أو أمر محكمة أو إداري يمنعنا من القيام بذلك. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. نحن نحتفظ بجميع البيانات الشخصية التي تم جمعها من خلال موقعنا الإلكتروني أو تطبيق الهاتف المحمول، طالما كان ذلك ضروريًا لحماية المصالح المشروعة المنصوص عليها في المادة 2 أو حتى يتم سحب موافقتك. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. سيتم الاحتفاظ بجميع البيانات الشخصية التي نجمعها من خلال تفاعلاتنا معك عبر وسائل التواصل الاجتماعي أو الهاتف أو البريد الإلكتروني أو قنوات الاتصال الرقمية الأخرى طالما كان ذلك ضروريًا للتواصل معك، ولكن أيضًا للاحتفاظ بسجل تاريخي لاتصالاتنا. يتيح لنا ذلك العودة إلى الاتصالات السابقة عندما تعود إلينا بأسئلة أو طلبات أو تعليقات أو مدخلات أخرى جديدة. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. كيف نحافظ على أمان بياناتك الشخصية؟"],
          },
          {
            tag: "p",
            children: [
              " 5.1. في Agora، تعد حماية بياناتك الشخصية أولوية قصوى. لقد قمنا بتنفيذ مجموعة من التدابير الفنية والتنظيمية لضمان بقاء جميع البيانات الشخصية التي تتم معالجتها آمنة. وتشمل هذه التدابير: ",
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
                    children: ["تقليل البيانات والخصوصية حسب التصميم:"],
                  },
                  " نحن نجمع فقط الحد الأدنى من البيانات الشخصية اللازمة لوظائف النظام الأساسي، ونتجنب تخزين المعلومات الحساسة كلما أمكن ذلك. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["التشفير والاسم المستعار:"],
                  },
                  ' يتم تشفير البيانات الشخصية، ويتم تطبيق تقنيات الأسماء المستعارة لحماية هويات المستخدم. على سبيل المثال، لا يتم تخزين أرقام الهواتف أبدًا في نص عادي؛ وبدلاً من ذلك، نقوم بتطبيق "فلفل" مشفر وتجزئة هذه العناصر لمنع الوصول غير المصرح به. ',
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["مصادقة إثبات المعرفة الصفرية:"],
                  },
                  " تستفيد Agora من إثباتات المعرفة الصفرية (ZKP) للتحقق من جواز السفر، مما يضمن قدرة المستخدمين على إثبات أهليتهم دون الكشف عن معلومات شخصية حساسة. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["إثباتات التشفير اللامركزية:"],
                  },
                  " يمكن التحقق من بعض تفاعلات المستخدم (مثل إنشاء الحساب والمشاركة) علنًا من خلال أدلة التشفير دون الكشف عن هويات المستخدم. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["المصادقة الآمنة:"],
                  },
                  " نحن لا نقوم بتخزين كلمات المرور. وبدلاً من ذلك، تتم معالجة المصادقة من خلال رموز التحقق أو مفاتيح التشفير لمرة واحدة، مما يقلل من مخاطر تسرب بيانات الاعتماد. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["حماية البنية التحتية:"],
                  },
                  " تم تأمين منصتنا ضد التهديدات السيبرانية باستخدام حماية DDoS، وعناصر التحكم في الوصول، ومراقبة الشبكة لاكتشاف الهجمات والتخفيف منها. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["الشفافية ومراقبة المستخدم:"],
                  },
                  " يتمتع المستخدمون بالقدرة على إدارة بياناتهم الشخصية وحذف حساباتهم والتحكم في كيفية معالجة معلوماتهم. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["التقييمات الأمنية المنتظمة:"],
                  },
                  " تتم مراجعة إجراءاتنا الأمنية وتحديثها بشكل دوري لمعالجة التهديدات الناشئة وتحسين حماية البيانات. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["التحكم في الوصول إلى السجلات والتحليلات:"],
                  },
                  " يتم استخدام بيانات التحليلات المجمعة والمجهولة المصدر فقط لمراقبة الأداء وتحسين تجربة المستخدم. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["تكرار البيانات والنسخ الاحتياطي:"],
                  },
                  " يتم تخزين البيانات بشكل آمن على خوادم AWS في دبلن، أيرلندا، ويتم نسخها في باريس، فرنسا لأغراض التعافي من الكوارث، مع ضوابط وصول صارمة وإجراءات تشفير. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["جمع البيانات الوصفية المحدودة:"],
                  },
                  " لا تقوم سجلات تطبيق Agora بتسجيل عناوين IP عمدًا. قد يقوم موفرو البنية التحتية ومراقبة الأخطاء، بما في ذلك Cloudflare وموفرو الخدمات السحابية وSentry، بمعالجة عناوين IP للأمان أو العمليات أو تصحيح الأخطاء. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["ترجمة مجهولة المصدر بالذكاء الاصطناعي:"],
                  },
                  " يتم نقل المحتوى المرسل إلى Google Cloud Platform للترجمة كما هو دون أي بيانات وصفية مصاحبة (معرفات المستخدم، وما إلى ذلك) وتتم معالجته في الولايات المتحدة (منطقة us-central1). خدمة الترجمة المستندة إلى Google Cloud LLM التي نستخدمها غير متوفرة حاليًا في منطقة الاتحاد الأوروبي. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "استخدام ",
                      {
                        tag: "a",
                        children: ["Sentry.io"],
                        href: "https://sentry.io/privacy/",
                        external: true,
                      },
                      " لتقارير الأعطال ذات الخصوصية المنخفضة:",
                    ],
                  },
                  " يستخدم Agora Sentry (المستضاف على خوادم الاتحاد الأوروبي) لأغراض تتبع الأخطاء والإبلاغ عن الأعطال. لا يتم تحميل الجلسات الروتينية لإعادة تشغيل الجلسة؛ عند حدوث خطأ، قد يتم تحميل بيانات التفاعل الحديثة المخزنة مؤقتًا للمساعدة في تشخيص الفشل. إعادة تشغيل أقنعة النص والمدخلات، وحظر الوسائط، وتعطيل التقاط جسم الشبكة، وأقنعة النص الذي تم تكوينه وسمات النموذج قبل التسجيل. يتم مسح أحداث التنقل والتسجيل المخصص للشبكة، ويتم تنقية قائمة عناوين URL التي تمت زيارتها لحدث إعادة التشغيل قبل التحميل. قد تحتفظ عناوين URL الخاصة بـ Agora وZKorum للطرف الأول بالمسارات ومعرفات المسار ذات الأسماء المستعارة، ولكن تتم إزالة بيانات الاعتماد وسلاسل الاستعلام والأجزاء. يتم تقليص عناوين URL الخارجية إلى أصولها، بينما يتم تنقيح مخططات عناوين URL غير الآمنة. تعمل أحداث الخطأ أيضًا على إزالة عناوين URL للطلبات والبيانات الإضافية التعسفية، والاحتفاظ فقط بالقائمة المسموح بها الصريحة للسياقات الفنية، وحذف مسارات التنقل لوحدة التحكم وواجهة المستخدم. بالنسبة لتشخيص واحد محدد لتجاوز سعة المكدس، قد يتضمن المرفق المحدود بشكل ضيق علامات تخطيط الصفحة الهيكلية ولكن ليس حالة OTP أو المسودات أو حالة الإعداد أو المعرفات أو المحتوى الذي أنشأه المستخدم. لا يزال من الممكن أن تحتوي تقارير إعادة التشغيل والأخطاء على DOM الهيكلي، ومسارات المسارات بأسماء مستعارة، وأصول الموارد، والبيانات التعريفية التقنية، وبيانات التفاعل، وقد يقوم Sentry بمعالجة عناوين IP كما هو موضح في سياسة الخصوصية الخاصة به. لا يستخدم Sentry ملفات تعريف الارتباط للتتبع. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["التسجيل بأسماء مستعارة للمراقبة:"],
                  },
                  " تقوم Agora بجمع البيانات الفنية ذات الأسماء المستعارة لأغراض مراقبة النظام وتصحيح الأخطاء وتحسين الأداء. يتضمن ذلك UUIDs للمستخدم وأسماء المستخدمين وبيانات تعريف الطلب وسجلات الأخطاء. نحن لا نسجل معلومات تحديد الهوية الشخصية (PII) الحساسة، مثل أرقام الهواتف، في سجلات التطبيقات الخاصة بنا. ومع ذلك، قد تحتفظ خدمات الجهات الخارجية مثل Twilio وAWS وCloudflare وغيرها بالبيانات (بما في ذلك عناوين IP، وفي حالة Twilio، أرقام الهواتف) وفقًا لسياسات الخصوصية وجداول الاحتفاظ الخاصة بها. ",
                ],
              },
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. حقوقك فيما يتعلق ببياناتك الشخصية"],
          },
          {
            tag: "p",
            children: [
              " 6.1. عندما نقوم بجمع بياناتك الشخصية واستخدامها، ستستمتع بعدد من الحقوق التي يمكنك ممارستها بالطريقة الموضحة أدناه. يرجى ملاحظة أنه عندما ترغب في ممارسة حق ما، سنطلب منك إثبات هويتك. نقوم بذلك لمنع انتهاك البيانات الشخصية (على سبيل المثال، لأن شخصًا غير مصرح له ينتحل شخصيتك ويمارس حقه باسمك). ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2. اعتمادًا على المعالجة والأساس القانوني، باعتبارك موضوعًا للبيانات، لديك عدد من الإمكانيات للحفاظ على التحكم في بياناتك الشخصية: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["الحق في الوصول إلى البيانات الخاصة بك"],
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
                children: ["الحق في مسح بياناتك"],
              },
              {
                tag: "li",
                children: ["الحق في سحب موافقتك الممنوحة مسبقًا"],
              },
              {
                tag: "li",
                children: ["الحق في نقل البيانات الخاصة بك"],
              },
              {
                tag: "li",
                children: [
                  " الحق في تقديم الشكاوى إلى السلطة المختصة بحماية البيانات. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. يجب أن نشير لك إلى أن هذه الحقوق ليست مطلقة دائمًا، وأنه في ظروف معينة يحق لنا أو حتى يطلب منا القانون معالجة بياناتك الشخصية بشكل أكبر، وبالتالي قد لا نكون قادرين دائمًا على الامتثال (الكامل) لطلبك. وفي مثل هذه الحالات، سنخبرك وفقًا لذلك. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. يمكنك ممارسة هذه الحقوق مجانًا، إلا في حالات إساءة الاستخدام وفي هذه الحالة يحق لنا فرض رسوم إدارية للامتثال لطلبك. ",
            ],
          },
          {
            tag: "p",
            children: [
              ' 6.5. لاحظ أنه يمكنك حذف ردود أفعالك، والتصفيق، والتصويت الإيجابي/التصويت السلبي، وإجابات الاستطلاع، وإجراءات الموافقة/الرفض، والمحادثات، والآراء، والردود، ومعلومات "المشاهدات" واللغة المنطوقة (يجب أن تبقى واحدة على الأقل). ',
            ],
          },
          {
            tag: "h3",
            children: ["6.6. السجلات الأمنية:"],
          },
          {
            tag: "p",
            children: [
              " يتم الاحتفاظ ببعض سجلات الأمان بعد حذف الحساب لحماية الخدمة: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " تجزئات الرمز المميز لشبكة التفويض التي يتحكم فيها المستخدم (UCAN) قصيرة العمر المستخدمة لإعادة الحماية من الهجمات ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " يتم الاحتفاظ بهذه السجلات فقط للمدة اللازمة لمنع إعادة استخدام رموز التفويض المميزة. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. كيفية حذف حسابك:"],
          },
          {
            tag: "p",
            children: [
              " عندما تقوم بحذف حسابك، فهو كذلك ",
              {
                tag: "strong",
                children: ["لا يمكن الوصول إليه على الفور"],
              },
              " ولا يمكن استردادها. تتبع عملية الحذف هذا الجدول الزمني: ",
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
                    children: ["مباشر:"],
                  },
                  " يتم حذف حسابك بشكل مبدئي ويصبح غير قابل للوصول. يتم تسجيل خروج جميع الأجهزة. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["بعد 15 يوما:"],
                  },
                  " يتم حذف بيانات حسابك نهائيًا (تم حذفها نهائيًا) من قاعدة بياناتنا. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["حتى 30 يومًا بعد ذلك:"],
                  },
                  " قد تستمر البيانات في النسخ الاحتياطية المشفرة لأغراض التعافي من الكوارث. ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["ماذا يحدث عند الحذف:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " يصبح حسابك غير قابل للوصول على الفور ولا يمكن استعادته ",
                ],
              },
              {
                tag: "li",
                children: ["يتم تسجيل خروج جميع الأجهزة ويتم إنهاء جلستك"],
              },
              {
                tag: "li",
                children: [
                  " تم إبطال بيانات اعتماد التحقق الخاصة بك (رقم الهاتف، وإثبات جواز السفر، وتذاكر الأحداث). ",
                ],
              },
              {
                tag: "li",
                children: [
                  " يظل المحتوى الخاص بك (المشاركات والتصويتات والآراء) موجودًا على النظام الأساسي ولكنه لم يعد مرتبطًا بشكل عام بحسابك ",
                ],
              },
              {
                tag: "li",
                children: [
                  " وبعد 15 يومًا، تتم إزالة بيانات حسابك نهائيًا من قاعدة بياناتنا ",
                ],
              },
              {
                tag: "li",
                children: [
                  " لا يتم الاحتفاظ بأدلة التشفير لإجراءات الحساب بعد التحقق ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["الاحتفاظ ببيانات الطرف الثالث:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["النسخ الاحتياطية لقاعدة البيانات:"],
                  },
                  " قد تستمر البيانات في نسخ AWS الاحتياطية المشفرة لمدة تصل إلى 30 يومًا بعد الحذف الثابت لمدة 15 يومًا ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["تويليو:"],
                  },
                  " يتم الاحتفاظ بسجلات التحقق من الهاتف وفقًا لـ ",
                  {
                    tag: "a",
                    children: ["سياسة خصوصية Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["خدمات الطرف الثالث:"],
                  },
                  " قد يتم الاحتفاظ بالسجلات والبيانات في Sentry وCloudflare وAWS وGoogle Cloud وفقًا لسياسات الخصوصية الخاصة بها ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["مهم:"],
              },
              " الحذف فوري ولا رجعة فيه. لا يمكنك استرداد حسابك بعد طلب الحذف. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. إذا كانت لديك شكوى بشأن معالجة بياناتك الشخصية من قبلنا، فيمكنك دائمًا الاتصال بنا على ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". إذا لم تكن راضيًا عن ردنا، فيمكنك تقديم شكوى إلى السلطة المختصة بحماية البيانات، أي اللجنة الوطنية الفرنسية للمعلوماتية والحريات (",
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
            children: ["7. معلومات هامة لسكان ولاية كاليفورنيا"],
          },
          {
            tag: "p",
            children: [
              ' 7.1. وفقًا لقانون خصوصية المستهلك في كاليفورنيا لعام 2018 ("CCPA")، فإننا نقدم التفاصيل الإضافية التالية للمقيمين في كاليفورنيا. خلال الـ 12 شهرًا السابقة، قمنا بجمع واستخدام ومشاركة فئات معلوماتك الشخصية الموضحة أعلاه في سياسة الخصوصية هذه لأغراض أعمالنا التشغيلية. ',
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. لم نقم ببيع معلوماتك الشخصية، مما يعني أننا لم نكشف عن معلوماتك الشخصية مقابل مقابل مالي أو أي مقابل آخر ذي قيمة. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. لديك الحق في طلب الوصول إلى معلوماتك الشخصية أو حذفها وطلب الشفافية بشأن ممارسات الخصوصية لدينا. إذا كنت ترغب في ممارسة حقوقك بموجب قانون CCPA، فيرجى الاطلاع على المادة 6. بمجرد أن نتلقى طلبك، سوف نتحقق منه عن طريق طلب معلومات لتأكيد هويتك، بما في ذلك عن طريق مطالبتك بمعلومات إضافية. إذا كنت ترغب في الاستعانة بوكيل مسجل لدى وزير خارجية ولاية كاليفورنيا لممارسة حقوقك، فقد نطلب دليلاً على أنك زودت هذا الوكيل بتوكيل رسمي أو أن الوكيل لديه سلطة كتابية صالحة لتقديم طلبات لممارسة الحقوق نيابة عنك. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. إذا اخترت ممارسة حقوقك، فلن نفرض عليك أسعارًا مختلفة أو نقدم جودة مختلفة من الخدمات لممارسة حقوقك ما لم يسمح القانون بهذه الاختلافات. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["8. التغييرات في سياسة الخصوصية هذه"],
          },
          {
            tag: "p",
            children: [
              " 8.1. يمكننا تغيير سياسة الخصوصية هذه بمبادرة منا في أي وقت. إذا كانت التغييرات المادية في سياسة الخصوصية هذه قد تؤثر على معالجة بياناتك الشخصية، فسنقوم بإبلاغك بهذه التغييرات بالطريقة التي نتواصل بها معك عادةً (على سبيل المثال عبر البريد الإلكتروني أو عبر رسالة على النظام الأساسي). ",
            ],
          },
          {
            tag: "p",
            children: [
              " 8.2. نحن ندعوك لقراءة أحدث إصدار من سياسة الخصوصية هذه على موقعنا (https://agoracitizen.network/). تنص سياسة الخصوصية على تاريخ آخر تغيير لسياسة الخصوصية الخاصة بنا. ",
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
              " 9.1. إذا كانت لديك أي أسئلة أخرى حول معالجة بياناتك الشخصية، فلا تتردد في الاتصال بمدير الخصوصية لدينا. يمكنك الاتصال بمدير الخصوصية لدينا عبر البريد الإلكتروني: ",
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
        "Esta política de privacidad se ha traducido automáticamente. La versión en inglés es la única versión oficial y prevalece exclusivamente en caso de discrepancia.",
      viewEnglish: "Ver la versión oficial en inglés",
      returnToTranslation: "Volver a la versión traducida",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["Última actualización el"],
          },
          ": 2025/11/11 (AAAA/MM/DD)",
        ],
      },
      {
        tag: "p",
        children: [
          " La Red Ciudadana Agora está desarrollada por ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          ". En ZKorum creemos que la privacidad es un derecho fundamental. Nuestra misión es capacitar a los usuarios para que participen en el discurso político y social mientras mantienen el control sobre su identidad e información personal. ",
        ],
      },
      {
        tag: "p",
        children: [
          ' Esta Política de Privacidad explica cómo y por qué Agora Citizen Network ("Agora", "nosotros", "nos" o "ZKorum") recopila, utiliza y comparte información sobre usted cuando utiliza nuestro sitio web y aplicaciones móviles (colectivamente, los "Servicios") o cuando interactúa de otro modo con nosotros. Somos responsables de la recopilación y el uso de sus datos personales en la forma explicada en esta política de privacidad. ',
        ],
      },
      {
        tag: "p",
        children: [
          " Si tiene alguna pregunta al respecto, por favor contáctenos por correo electrónico: ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". Si es residente de California, nos gustaría llamar su atención sobre el Artículo 7. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["Agora es una plataforma pública"],
          },
          {
            tag: "p",
            children: [
              " La mayor parte del contenido de Agora es de acceso público, lo que significa que cualquier persona puede ver su perfil, publicaciones, votos y opiniones, incluso sin una cuenta. ",
            ],
          },
          {
            tag: "p",
            children: [
              " No es necesario crear una cuenta para navegar por Agora. Para participar en debates e interactuar con el contenido, puede: ",
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
                    children: ["Navegar como invitado:"],
                  },
                  " Puede explorar contenido y participar en interacciones limitadas sin registrarse. Cuando interactúa por primera vez con la plataforma (por ejemplo, publicando, votando), se genera automáticamente un identificador criptográfico (DID) específico del dispositivo y se almacena en su dispositivo, luego se vincula a una cuenta de usuario en nuestros servidores. Este DID sirve como identificador de sesión permanente para su dispositivo. Las cuentas de invitados no están verificadas y solo se puede acceder a ellas desde el dispositivo original. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "Inicio de sesión suave (verificación basada en sesiones):",
                    ],
                  },
                  " Verificar usando ",
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " para la verificación de entradas para eventos utilizando Prueba de Credenciales de Grupo (GPC). Esto agrega una verificación temporal basada en eventos a su cuenta, pero NO crea una cuenta registrada. El inicio de sesión suave le permite demostrar la participación en el evento sin revelar los detalles del boleto. Puede actualizar a una cuenta registrada permanente en cualquier momento agregando verificación por teléfono o pasaporte. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "Inicio de sesión duro (cuenta registrada permanente):",
                    ],
                  },
                  " Cree una cuenta verificada permanente utilizando uno de los siguientes métodos: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["Número de teléfono:"],
                          },
                          " Verificado mediante un código único enviado por SMS ",
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
                          ": Verificación de prueba de conocimiento cero (ZKP) basada en pasaporte ",
                        ],
                      },
                    ],
                  },
                  " Estos métodos crean una cuenta registrada y garantizan que su identidad sea validada manteniendo la privacidad. Agora sólo recibe pruebas criptográficas que confirman la unicidad y la elegibilidad, nunca los documentos de identidad subyacentes o la información del billete. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["Actualizaciones de cuenta:"],
              },
              " Cuando actualiza desde el inicio de sesión de invitado o suave a la verificación física (teléfono o pasaporte), todo su contenido existente (publicaciones, votos, seguimientos, verificaciones de eventos) se transfiere automáticamente a su cuenta verificada y su cuenta no verificada anterior se elimina. Esta combinación es permanente y no se puede deshacer. No puede fusionar dos cuentas verificadas por razones de seguridad. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Su cuenta de Agora tendrá un nombre de usuario, que puede seleccionarse manualmente o generarse automáticamente. Los nombres de usuario son públicos pero no es necesario que estén vinculados a su identidad real. También puede proporcionar detalles de perfil opcionales, como temas preferidos, que pueden modificarse o eliminarse en cualquier momento. ",
            ],
          },
          {
            tag: "p",
            children: [
              " La mayor parte del contenido de Agora Citizen Network es público. Cuando envía contenido (por ejemplo, una publicación, una opinión o una reacción), es visible para todos los usuarios y puede ser indexado por los motores de búsqueda. Agora también utiliza pruebas criptográficas para proporcionar verificabilidad de los datos, lo que significa que ciertas interacciones (como la creación y participación de cuentas) se registran públicamente de manera descentralizada. ",
            ],
          },
          {
            tag: "h3",
            children: ["Su perfil de Ágora"],
          },
          {
            tag: "p",
            children: [
              " Su perfil de Agora es público por defecto y contiene información como: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["Nombre de usuario"],
              },
              {
                tag: "li",
                children: ["Identificador de usuario único (UUID)"],
              },
              {
                tag: "li",
                children: [
                  " Historial de actividad (publicaciones, opiniones, interacciones (emojis, acciones de acuerdo/desacuerdo, aplausos, votos a favor/en contra), respuestas a encuestas y contenido marcado/reportado ",
                ],
              },
              {
                tag: "li",
                children: ["Comunidades y temas de interés"],
              },
              {
                tag: "li",
                children: [
                  " Estado de verificación: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          " Verificado mediante prueba de pasaporte (anulador de usuario y pruebas de identidad bidireccionales) ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          " Verificado a través del número de teléfono (el enlace de prueba firmado por Agora hizo: claves para el UUID del usuario) ",
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
              " Los usuarios tienen la opción de publicar de forma anónima. Al utilizar esta función, los nombres de usuario y las imágenes de perfil se reemplazan con identificadores genéricos y el contenido no se vincula públicamente al perfil del usuario. ",
            ],
          },
          {
            tag: "h3",
            children: ["Servicios de terceros"],
          },
          {
            tag: "p",
            children: [
              " Agora utiliza servicios de terceros que pueden procesar direcciones IP y otros datos personales. Siempre que sea posible, Agora configura los servicios para utilizar puntos finales regionales de la UE o utiliza proveedores con sede en la UE. Estos servicios tienen sus propias políticas de privacidad y se anima a los usuarios a revisarlas. ",
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
                  " (global) para pruebas de identidad de conocimiento cero. Puede procesar direcciones IP para operaciones de seguridad y servicios. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " (global, de código abierto) para entradas a eventos y verificación de identidad mediante prueba de credenciales de grupo (GPC). Puede procesar direcciones IP para operaciones de servicio. Zupass utiliza Simple Analytics para realizar análisis web respetuosos con la privacidad. ",
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
                  " (global) para la verificación del número de teléfono. Twilio almacena números de teléfono en texto sin cifrar y procesa direcciones IP para prevenir el fraude. Tenga en cuenta que Agora solo almacena números de teléfono cifrados (nunca en texto sin cifrar) en nuestra base de datos, pero Twilio conserva los números de teléfono de acuerdo con su propia política de privacidad. ",
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
                  " (global) para protección y seguridad DDoS. Procesa direcciones IP. ",
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
                  " (UE: Dublín y París) para infraestructura de alojamiento, almacenamiento de datos y recursos informáticos. Procesa direcciones IP para operaciones de infraestructura. ",
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
                  " (con base en EE. UU., región us-central1) para la traducción basada en inteligencia artificial de publicaciones de usuarios y contenido generado por la plataforma. Puede procesar direcciones IP para operaciones de infraestructura. ",
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
                  " (con sede en la UE) para análisis web respetuosos con la privacidad. Procesa temporalmente direcciones IP para el recuento de visitantes, pero no las almacena (consulte su política de datos para obtener más detalles). ",
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
                  " (servidores de la UE) para seguimiento de errores e informes de fallos. Procesa direcciones IP con fines de depuración. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              ' Los servicios marcados como "globales" funcionan con las salvaguardias apropiadas del RGPD, como se describe en el artículo 3. Se recomienda a los usuarios preocupados por la privacidad de la dirección IP que utilicen Tor u otras soluciones mixnet al acceder a Agora. ',
            ],
          },
          {
            tag: "h3",
            children: ["Cookies y análisis"],
          },
          {
            tag: "p",
            children: [
              " Agora no utiliza cookies de publicidad ni de seguimiento entre sitios, ni vendemos datos para publicidad. Utilizamos Plausible Analytics, un servicio de análisis con sede en la UE que no emplea cookies, y Sentry para telemetría de rendimiento y errores limitados. Para más detalles, visite ",
              {
                tag: "a",
                children: ["Plausible Analytics"],
                href: "https://plausible.io/about",
                external: true,
              },
              ". ",
            ],
          },
          {
            tag: "p",
            children: [
              " Sólo utilizamos cookies de sesión/autenticación, que son estrictamente necesarias para el funcionamiento del sitio web. ",
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
              "1.1. Recopilamos y utilizamos sus datos personales cuando usted:",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "utilizar nuestro sitio web (https://agoracitizen.network/);",
                ],
              },
              {
                tag: "li",
                children: ["utilice nuestra aplicación móvil; y"],
              },
              {
                tag: "li",
                children: [
                  " comunicarse con nosotros por correo electrónico o cualquier otro canal de comunicación digital. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 1.2. Esta política de privacidad podrá modificarse según lo establecido en el artículo 8. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. ¿Qué datos personales procesamos y por qué?"],
          },
          {
            tag: "p",
            children: [
              " Solo procesaremos sus datos personales para un propósito específico y en la medida permitida por la ley. A continuación explicamos con más detalle en qué casos recopilamos y utilizamos sus datos personales. Si no recibimos sus datos personales directamente de usted, también le informaremos de ello a continuación. ",
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
                              "Identificador de dispositivo (DID - Identificador descentralizado)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Una clave pública criptográfica (formato did:key) generada y almacenada en su dispositivo, luego vinculada a su cuenta de usuario en nuestros servidores. Los DID sirven como identificadores de sesión permanentes que conectan su dispositivo a su cuenta. Los DID se almacenan para todos los usuarios (invitados, inicio de sesión suave e inicio de sesión físico) para mantener sesiones basadas en dispositivos. ",
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
                              "Inicio de sesión suave - Verificación de entradas para eventos (Zupass)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Cuando verifica usando Zupass, almacenamos un anulador específico del evento (identificador de preservación de la privacidad derivado de su boleto) y el slug del evento. Esto prueba la participación en el evento sin revelar los detalles del boleto. El inicio de sesión suave NO crea una cuenta registrada, pero permite la verificación basada en sesiones que se puede actualizar a registro permanente. ",
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
                          " Para autenticar usuarios y entregar códigos de verificación únicos. Los números de teléfono se almacenan como hashes criptográficos en nuestra base de datos. Twilio (nuestro proveedor de SMS) procesa y almacena números de teléfono en texto sin cifrar para entregar códigos de verificación. La verificación telefónica crea una cuenta registrada permanente. ",
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
                              "Datos de autenticación: prueba de conocimiento cero del pasaporte (Rarimo)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Verificar la elegibilidad del usuario mediante la verificación del pasaporte para preservar la privacidad. Almacenamos un anulador derivado del pasaporte, el código de país de ciudadanía y el sexo. Agora solo recibe la prueba criptográfica que confirma la unicidad y elegibilidad, nunca su número de pasaporte, nombre, fotografía u otros detalles del pasaporte. La verificación del pasaporte crea una cuenta registrada permanente. ",
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
                          " (Nombre de usuario, idioma preferido, género y nacionalidad (si se verifica el pasaporte)) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Para crear y administrar cuentas de usuario, personalice la experiencia del usuario. Estos datos se agregarán con fines de análisis, información y monetización. ",
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
                            children: ["Acciones que toma"],
                          },
                          " (Publicaciones, Opiniones, Respuestas, Reacciones, Encuestas) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Facilitar las discusiones, las interacciones de los usuarios y la participación en la plataforma. Estos datos se agregarán con fines de análisis, información y monetización. ",
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
                            children: ["dirección IP"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Para salvaguardar la infraestructura de la plataforma, prevenir actividades maliciosas y garantizar la seguridad operativa (por ejemplo, protección contra ataques de denegación de servicio distribuido (DDoS)). ",
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
                          " (UUID de usuario, nombres de usuario, metadatos de solicitud, registros de errores, marcas de tiempo) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Para monitorear el sistema, depurar, optimizar el rendimiento y mejorar la confiabilidad del servicio. NO registramos PII confidencial, como números de teléfono, en los registros de aplicaciones. ",
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
                          " (Identidad y datos de contacto que usted nos proporcionó, el contenido de la comunicación, los detalles técnicos de la comunicación en sí (por ejemplo, fecha y hora) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Para permitir la comunicación entre usted y nosotros (por ejemplo, cuando se comunica con nosotros a través de las redes sociales, teléfono o correo electrónico). ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Nuestro interés legítimo en poder responder a solicitudes, preguntas o comentarios o contactarlo de manera proactiva para preguntas de cualquier tipo. ",
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
                            children: ["Datos personales antes mencionados."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Para cumplir con nuestras obligaciones legales o para cumplir con cualquier solicitud razonable de autoridades policiales competentes, autoridades judiciales, instituciones u organismos gubernamentales, incluidas las autoridades competentes en protección de datos. ",
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
                            children: ["Datos personales antes mencionados."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Prevenir, detectar y combatir el fraude u otras actividades ilegales o no autorizadas. ",
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
                            children: ["Datos personales antes mencionados."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Para defendernos en procesos judiciales."],
                      },
                      {
                        tag: "td",
                        children: [
                          " Nuestro interés legítimo en utilizar sus datos personales en estos procedimientos. ",
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
                            children: ["Datos personales antes mencionados."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Informar a un tercero en el contexto de una posible fusión con, adquisición de/por o escisión por parte de ese tercero, incluso si ese tercero está ubicado fuera de la UE. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Nuestro interés legítimo en realizar transacciones comerciales. ",
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
                              "Actualización de cuenta/fusión de datos",
                            ],
                          },
                          " (Contenido del usuario, dispositivos, entradas para eventos, preferencias) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Cuando actualiza de invitado o inicio de sesión suave a verificación física (teléfono o pasaporte), todos sus datos se transfieren a su cuenta verificada y su cuenta anterior se elimina. Esto garantiza la continuidad de su contenido y su historial de actividad al tiempo que agrega verificación permanente. ",
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
                ],
              },
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
              " 3.1. En principio, no compartimos sus datos personales con nadie más que las personas que trabajan para nosotros, así como con los proveedores que nos ayudan a procesar sus datos personales. Cualquier persona que tenga acceso a sus datos personales siempre estará sujeta a estrictas obligaciones legales o contractuales de mantener sus datos personales seguros y confidenciales. Esto significa que sólo las siguientes categorías de destinatarios recibirán sus datos personales: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["Usted;"],
              },
              {
                tag: "li",
                children: ["Nuestros empleados y proveedores; y"],
              },
              {
                tag: "li",
                children: [
                  " Autoridades gubernamentales o judiciales en la medida en que estemos obligados a compartir sus datos personales con ellos (por ejemplo, autoridades fiscales, autoridades policiales o judiciales). ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. Enviamos sus datos personales fuera del Espacio Económico Europeo (EEE) (el Espacio Económico Europeo está formado por la UE, Liechtenstein, Noruega e Islandia). Transferiremos estos datos personales fuera del EEE para comunicarnos con las categorías de destinatarios de sus datos personales tal como se definen en este Artículo 3. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. Aplicaremos las medidas de seguridad adecuadas para proteger sus datos personales durante las transferencias, como trabajar únicamente con procesadores ubicados en países que tengan una decisión de adecuación de la Comisión Europea o que estén certificados bajo un marco aprobado como el UE-EE.UU. Marco de privacidad de datos. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. Si no existe una decisión de adecuación de la Comisión Europea para el país de destino, utilizaremos las salvaguardias adecuadas, como se describe en el artículo 46 del RGPD, al transferir datos personales, y dichas transferencias y medidas de seguridad técnicas y organizativas se documentarán de conformidad con el artículo 30 del RGPD. Por ejemplo, utilizamos cláusulas contractuales estándar para proteger la transferencia de datos personales a países fuera del Espacio Económico Europeo (EEE), asegurando así que se aplique un nivel equivalente de protección de datos a sus datos personales incluso si la ley de protección de datos de la UE no es directamente aplicable. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. Agora puede transferir datos anonimizados y/o agregados a organizaciones fuera de la jurisdicción en la que usted los proporciona. En caso de que se produzca dicha transferencia, Agora se asegurará de que existan salvaguardas para garantizar la seguridad e integridad de sus datos y todos los derechos con respecto a sus datos personales que pueda disfrutar según la ley obligatoria aplicable. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["4. ¿Cuánto tiempo conservamos sus datos personales?"],
          },
          {
            tag: "p",
            children: [
              " 4.1. Sus datos personales sólo serán tratados durante el tiempo necesario para lograr las finalidades descritas anteriormente o, cuando le hayamos solicitado su consentimiento, hasta que retire su consentimiento. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. Como regla general, desidentificaremos sus datos personales cuando ya no sean necesarios para los fines descritos anteriormente. Sin embargo, no podemos eliminar sus datos personales si existe una obligación legal o reglamentaria o una orden judicial o administrativa que nos lo impida. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. Conservamos todos los datos personales recopilados a través de nuestro sitio web o aplicación móvil durante el tiempo necesario para proteger los intereses legítimos establecidos en el artículo 2 o hasta que se retire su consentimiento. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. Todos los datos personales que recopilamos a través de nuestras interacciones con usted a través de redes sociales, teléfono, correo electrónico u otros canales de comunicación digital se conservarán durante el tiempo necesario para comunicarnos con usted, pero también para mantener un registro histórico de nuestras comunicaciones. Esto nos permite volver a comunicaciones anteriores cuando usted regresa con nuevas preguntas, solicitudes, comentarios u otros comentarios. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. ¿Cómo mantenemos seguros sus datos personales?"],
          },
          {
            tag: "p",
            children: [
              " 5.1. En Agora, salvaguardar sus datos personales es una máxima prioridad. Hemos implementado una serie de medidas técnicas y organizativas para garantizar que todos los datos personales procesados ​​permanezcan seguros. Estas medidas incluyen: ",
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
                    children: [
                      "Minimización de datos y privacidad por diseño:",
                    ],
                  },
                  " Solo recopilamos los datos personales mínimos necesarios para la funcionalidad de la plataforma, evitando el almacenamiento de información confidencial siempre que sea posible. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Cifrado y seudonimización:"],
                  },
                  ' Los datos personales están cifrados y se aplican técnicas de seudonimización para proteger las identidades de los usuarios. Por ejemplo, los números de teléfono nunca se almacenan en texto plano; en su lugar, aplicamos un "pepper" criptográfico y los aplicamos hash para evitar el acceso no autorizado. ',
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Autenticación a prueba de conocimiento cero:"],
                  },
                  " Agora aprovecha las pruebas de conocimiento cero (ZKP) para la verificación de pasaportes, lo que garantiza que los usuarios puedan demostrar su elegibilidad sin revelar información personal confidencial. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Pruebas criptográficas descentralizadas:"],
                  },
                  " Ciertas interacciones de los usuarios (como la creación y participación de cuentas) son verificables públicamente mediante pruebas criptográficas sin revelar las identidades de los usuarios. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Autenticación segura:"],
                  },
                  " No almacenamos contraseñas. En cambio, la autenticación se maneja mediante códigos de verificación únicos o claves criptográficas, lo que reduce el riesgo de fuga de credenciales. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Protección de infraestructura:"],
                  },
                  " Nuestra plataforma está protegida contra amenazas cibernéticas mediante protección DDoS, controles de acceso y monitoreo de red para detectar y mitigar ataques. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Transparencia y control de usuarios:"],
                  },
                  " Los usuarios tienen la capacidad de administrar sus datos personales, eliminar su cuenta y controlar cómo se procesa su información. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Evaluaciones periódicas de seguridad:"],
                  },
                  " Nuestras medidas de seguridad se revisan y actualizan periódicamente para abordar las amenazas emergentes y mejorar la protección de datos. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Acceso controlado a registros y análisis:"],
                  },
                  " Solo se utilizan datos analíticos agregados y anonimizados para monitorear el rendimiento y mejorar la experiencia del usuario. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Redundancia de datos y copias de seguridad:"],
                  },
                  " Los datos se almacenan de forma segura en servidores de AWS en Dublín, Irlanda y se replican en París, Francia, con fines de recuperación ante desastres, con estrictos controles de acceso y medidas de cifrado. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Recopilación limitada de metadatos:"],
                  },
                  " Los registros de la aplicación Agora no registran deliberadamente direcciones IP. Los proveedores de infraestructura y monitoreo de errores, incluidos Cloudflare, proveedores de servicios en la nube y Sentry, pueden procesar direcciones IP por motivos de seguridad, operaciones o depuración. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Traducción anónima de IA:"],
                  },
                  " El contenido enviado a Google Cloud Platform para su traducción se transmite tal cual, sin metadatos adjuntos (identificadores de usuario, etc.) y se procesa en los EE. UU. (región us-central1). El servicio de traducción basado en Google Cloud LLM que utilizamos no está disponible actualmente en la región de la UE. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "uso de ",
                      {
                        tag: "a",
                        children: ["Sentry.io"],
                        href: "https://sentry.io/privacy/",
                        external: true,
                      },
                      " para informes de fallos con privacidad reducida:",
                    ],
                  },
                  " Agora utiliza Sentry (alojado en servidores de la UE) para realizar seguimiento de errores e informar fallos. Las sesiones de rutina no se cargan para la reproducción de sesiones; Cuando ocurre un error, se pueden cargar datos de interacción recientes almacenados en buffer para ayudar a diagnosticar la falla. La reproducción enmascara el texto y las entradas, bloquea los medios, deshabilita la captura del cuerpo de la red y enmascara el texto configurado y los atributos del formulario antes de grabar. Los eventos de navegación y grabación personalizada de la red se eliminan y la lista de URL visitadas del evento de reproducción se desinfecta antes de la carga. Las URL propias de Agora y ZKorum pueden conservar rutas e identificadores de ruta seudónimos, pero se eliminan las credenciales, las cadenas de consulta y los fragmentos. Las URL externas se reducen a sus orígenes, mientras que los esquemas de URL inseguros se eliminan. Los eventos de error también eliminan las URL de solicitud y datos adicionales arbitrarios, conservan solo una lista explícita de contextos técnicos permitidos y omiten las rutas de navegación de la consola y la interfaz de usuario. Para un diagnóstico de desbordamiento de pila específico, un archivo adjunto muy limitado puede incluir indicadores de diseño de página estructurales, pero no el estado de OTP, borradores, estado de incorporación, identificadores o contenido generado por el usuario. Los informes de reproducción y errores aún pueden contener DOM estructural, rutas de ruta seudónimas, orígenes de recursos, metadatos técnicos y de interacción, y Sentry puede procesar direcciones IP como se describe en su política de privacidad. Sentry no utiliza cookies de seguimiento. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Registro seudónimo para monitoreo:"],
                  },
                  " Agora recopila datos técnicos seudónimos con fines de monitoreo, depuración y optimización del rendimiento del sistema. Esto incluye UUID de usuario, nombres de usuario, metadatos de solicitud y registros de errores. NO registramos PII confidencial, como números de teléfono, en nuestros registros de aplicaciones. Sin embargo, los servicios de terceros como Twilio, AWS, Cloudflare y otros pueden conservar datos (incluidas direcciones IP y, en el caso de Twilio, números de teléfono) de acuerdo con sus propias políticas de privacidad y programas de retención. ",
                ],
              },
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. Sus derechos respecto a sus datos personales"],
          },
          {
            tag: "p",
            children: [
              " 6.1. Cuando recopilamos y utilizamos sus datos personales, disfrutará de una serie de derechos que podrá ejercer de la manera que se describe a continuación. Tenga en cuenta que cuando desee ejercer un derecho, le solicitaremos una prueba de identidad. Hacemos esto para evitar una violación de datos personales (por ejemplo, porque una persona no autorizada se hace pasar por usted y ejerce un derecho en su nombre). ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2. Dependiendo del tratamiento y de la base jurídica, como interesado tiene una serie de posibilidades para mantener el control sobre sus datos personales: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["derecho a acceder a sus datos"],
              },
              {
                tag: "li",
                children: ["derecho a modificar sus datos"],
              },
              {
                tag: "li",
                children: [
                  "derecho a oponerse al tratamiento de sus datos personales",
                ],
              },
              {
                tag: "li",
                children: ["derecho a restringir el procesamiento de datos"],
              },
              {
                tag: "li",
                children: ["derecho a que se borren sus datos"],
              },
              {
                tag: "li",
                children: [
                  "derecho a retirar su consentimiento previamente otorgado",
                ],
              },
              {
                tag: "li",
                children: ["derecho a transferir sus datos"],
              },
              {
                tag: "li",
                children: [
                  " derecho a presentar reclamaciones ante la autoridad competente en protección de datos. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. Debemos señalarle que estos derechos no siempre son absolutos, que en determinadas circunstancias tenemos derecho o incluso estamos obligados por ley a seguir procesando sus datos personales y que, por lo tanto, es posible que no siempre podamos cumplir (completamente) con su solicitud. En tales casos, le informaremos en consecuencia. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. Podrá ejercer estos derechos de forma gratuita, excepto en casos de abuso y en cuyo caso tenemos derecho a cobrar una tarifa administrativa para cumplir con su solicitud. ",
            ],
          },
          {
            tag: "p",
            children: [
              ' 6.5. Tenga en cuenta que puede eliminar sus propias reacciones, aplausos, votos a favor o en contra, respuestas a encuestas, acciones de acuerdo o en desacuerdo, conversaciones, opiniones, respuestas, información de "vistas" y el idioma hablado (al menos uno debe permanecer). ',
            ],
          },
          {
            tag: "h3",
            children: ["6.6. Registros de seguridad:"],
          },
          {
            tag: "p",
            children: [
              " Algunos registros de seguridad se conservan después de la eliminación de la cuenta para proteger el servicio: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " Hashes de tokens de la Red de autorización controlada por el usuario (UCAN) de corta duración utilizados para la protección contra ataques de repetición ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Estos registros se conservan únicamente durante el tiempo necesario para evitar la reutilización de tokens de autorización. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. Cómo eliminar su cuenta:"],
          },
          {
            tag: "p",
            children: [
              " Cuando elimina su cuenta, es ",
              {
                tag: "strong",
                children: ["inmediatamente inaccesible"],
              },
              " y no se puede recuperar. El proceso de eliminación sigue este cronograma: ",
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
                    children: ["Inmediato:"],
                  },
                  " Su cuenta se elimina temporalmente y se vuelve inaccesible. Todos los dispositivos están desconectados. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Después de 15 días:"],
                  },
                  " Los datos de su cuenta se eliminan permanentemente (eliminados por completo) de nuestra base de datos. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Hasta 30 días después de eso:"],
                  },
                  " Los datos pueden persistir en copias de seguridad cifradas con fines de recuperación ante desastres. ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["Qué sucede al eliminarlo:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " Su cuenta se vuelve inmediatamente inaccesible y no se puede restaurar ",
                ],
              },
              {
                tag: "li",
                children: [
                  "Todos los dispositivos están desconectados y su sesión finaliza",
                ],
              },
              {
                tag: "li",
                children: [
                  " Sus credenciales de verificación (número de teléfono, comprobante de pasaporte, entradas para eventos) están invalidadas ",
                ],
              },
              {
                tag: "li",
                children: [
                  " Su contenido (publicaciones, votos, opiniones) permanece en la plataforma pero ya no está asociado públicamente con su cuenta. ",
                ],
              },
              {
                tag: "li",
                children: [
                  " Después de 15 días, los datos de su cuenta se eliminan permanentemente de nuestra base de datos. ",
                ],
              },
              {
                tag: "li",
                children: [
                  " Las pruebas criptográficas de las acciones de la cuenta no se conservan después de la verificación. ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["Retención de datos de terceros:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Copias de seguridad de bases de datos:"],
                  },
                  " Los datos pueden persistir en las copias de seguridad cifradas de AWS hasta 30 días después de la eliminación definitiva de 15 días ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Twilio:"],
                  },
                  " Los registros de verificación telefónica se conservan de acuerdo con ",
                  {
                    tag: "a",
                    children: ["Política de privacidad de Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Servicios de terceros:"],
                  },
                  " Los registros y datos en Sentry, Cloudflare, AWS y Google Cloud pueden conservarse de acuerdo con sus respectivas políticas de privacidad. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["Importante:"],
              },
              " La eliminación es inmediata e irreversible. No puede recuperar su cuenta después de solicitar la eliminación. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. Si tiene una queja sobre el procesamiento de sus datos personales por parte nuestra, siempre puede contactarnos en ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". Si no está satisfecho con nuestra respuesta, puede presentar una reclamación ante la autoridad de protección de datos competente, es decir, la Commission nationale de l'informatique et des libertés de Francia (",
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
              "7. Información importante para los residentes de California",
            ],
          },
          {
            tag: "p",
            children: [
              ' 7.1. De conformidad con la Ley de Privacidad del Consumidor de California de 2018 ("la CCPA"), proporcionamos los siguientes detalles adicionales a los residentes de California. Durante los 12 meses anteriores, hemos recopilado, utilizado y compartido las categorías de su información personal descritas anteriormente en esta política de privacidad para nuestros fines comerciales operativos. ',
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. No hemos vendido su información personal, lo que significa que no hemos divulgado su información personal a cambio de una contraprestación monetaria u otra contraprestación valiosa. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. Tiene derecho a solicitar acceso o eliminación de su información personal y a solicitar transparencia sobre nuestras prácticas de privacidad. Si desea ejercer sus derechos según la CCPA, consulte el Artículo 6. Una vez que recibamos su solicitud, la verificaremos solicitando información para confirmar su identidad, incluso solicitándole información adicional. Si desea utilizar un agente registrado ante la Secretaría de Estado de California para ejercer sus derechos, podemos solicitarle pruebas de que le ha proporcionado un poder notarial a dicho agente o que el agente tiene autoridad escrita válida para presentar solicitudes para ejercer derechos en su nombre. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. Si elige ejercer sus derechos, no le cobraremos precios diferentes ni le brindaremos servicios de calidad diferente para ejercer sus derechos, a menos que esas diferencias estén permitidas por la ley. ",
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
              " 8.1. Podemos cambiar esta política de privacidad por nuestra propia iniciativa en cualquier momento. Si los cambios materiales en esta política de privacidad pueden afectar el procesamiento de sus datos personales, le comunicaremos estos cambios de la manera en que normalmente nos comunicamos con usted (por ejemplo, por correo electrónico o mediante un mensaje en la plataforma). ",
            ],
          },
          {
            tag: "p",
            children: [
              " 8.2. Le invitamos a leer la última versión de esta política de privacidad en nuestro sitio web (https://agoracitizen.network/). La política de privacidad indica la fecha en que se modificó por última vez nuestra política de privacidad. ",
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
              " 9.1. Si tiene más preguntas sobre el procesamiento de sus datos personales, no dude en ponerse en contacto con nuestro responsable de privacidad. Puede ponerse en contacto con nuestro responsable de privacidad por correo electrónico: ",
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
    title: "سیاست حفظ حریم خصوصی",
    automatedTranslationNotice: {
      title: "ترجمه خودکار",
      statement:
        "این سیاست حفظ حریم خصوصی به‌صورت خودکار ترجمه شده است. نسخه انگلیسی تنها نسخه معتبر است و در صورت هرگونه مغایرت، منحصراً برتری دارد.",
      viewEnglish: "مشاهده نسخه معتبر انگلیسی",
      returnToTranslation: "بازگشت به نسخه ترجمه‌شده",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["آخرین به روز رسانی در"],
          },
          ": 2025/11/11 (YYYY/MM/DD)",
        ],
      },
      {
        tag: "p",
        children: [
          " شبکه شهروند آگورا توسط ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          ". در ZKorum، ما معتقدیم که حریم خصوصی یک حق اساسی است. ماموریت ما توانمندسازی کاربران برای مشارکت در گفتمان سیاسی و اجتماعی و در عین حال حفظ کنترل بر هویت و اطلاعات شخصی آنها است. ",
        ],
      },
      {
        tag: "p",
        children: [
          ' این خط‌مشی رازداری توضیح می‌دهد که چگونه و چرا شبکه شهروند Agora ("Agora"، "ما"، "ما" یا "ZKorum") اطلاعات مربوط به شما را هنگام استفاده از وب‌سایت و برنامه‌های تلفن همراه ما (مجموعاً «سرویس‌ها») جمع‌آوری، استفاده و به اشتراک می‌گذارد یا زمانی که به‌طور دیگری با ما تعامل دارید. ما مسئول جمع آوری و استفاده از داده های شخصی شما به روشی که در این سیاست حفظ حریم خصوصی توضیح داده شده است. ',
        ],
      },
      {
        tag: "p",
        children: [
          " اگر در این مورد سوالی دارید، لطفا از طریق ایمیل با ما تماس بگیرید: ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". اگر ساکن کالیفرنیا هستید، مایلیم توجه شما را به ماده 7 جلب کنیم. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["آگورا یک پلتفرم عمومی است"],
          },
          {
            tag: "p",
            children: [
              " بیشتر محتوای Agora در دسترس عموم است، به این معنی که نمایه، پست‌ها، رای‌ها و نظرات شما می‌تواند توسط هر کسی مشاهده شود، حتی بدون حساب. ",
            ],
          },
          {
            tag: "p",
            children: [
              " برای مرور Agora نیازی به ایجاد حساب کاربری ندارید. برای شرکت در بحث ها و تعامل با محتوا، می توانید: ",
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
                    children: ["به عنوان مهمان مرور کنید:"],
                  },
                  " می توانید بدون ثبت نام، محتوا را کاوش کنید و در تعاملات محدود شرکت کنید. هنگامی که برای اولین بار با پلتفرم تعامل می کنید (به عنوان مثال، پست کردن، رای دادن)، یک شناسه رمزنگاری خاص دستگاه (DID) به طور خودکار تولید و در دستگاه شما ذخیره می شود، سپس به یک حساب کاربری در سرورهای ما پیوند داده می شود. این DID به عنوان یک شناسه جلسه دائمی برای دستگاه شما عمل می کند. حساب‌های مهمان تأیید نشده‌اند و فقط از دستگاه اصلی قابل دسترسی هستند. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["ورود به سیستم نرم (تأیید بر اساس جلسه):"],
                  },
                  " تأیید با استفاده از ",
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " برای تأیید بلیط رویداد با استفاده از گواهینامه گروهی (GPC). این تأییدیه موقت مبتنی بر رویداد را به حساب شما اضافه می کند اما یک حساب ثبت شده ایجاد نمی کند. ورود نرم به شما امکان می دهد بدون فاش کردن جزئیات بلیط، شرکت در رویداد را اثبات کنید. با افزودن تأییدیه تلفن یا پاسپورت، می‌توانید در هر زمان به یک حساب ثبت‌شده دائمی ارتقا دهید. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["ورود سخت (حساب ثبت شده دائمی):"],
                  },
                  " با استفاده از یکی از روش های زیر یک حساب تایید شده دائمی ایجاد کنید: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["شماره تلفن:"],
                          },
                          " از طریق یک کد یک بار ارسال شده از طریق پیامک تأیید می شود ",
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
                          ": تأیید گواهی صفر دانش (ZKP) مبتنی بر پاسپورت ",
                        ],
                      },
                    ],
                  },
                  " این روش‌ها یک حساب کاربری ثبت‌شده ایجاد می‌کنند و تضمین می‌کنند که هویت شما با حفظ حریم خصوصی تأیید می‌شود. آگورا فقط مدارک رمزنگاری را دریافت می کند که منحصر به فرد بودن و واجد شرایط بودن را تأیید می کند، نه اسناد هویتی اساسی یا اطلاعات بلیط. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["ارتقاء حساب:"],
              },
              " هنگامی که از ورود مهمان یا نرم افزار به تأیید سخت (تلفن یا پاسپورت) ارتقا می دهید، تمام محتوای موجود شما (پست ها، رای ها، دنبال ها، تأیید رویدادها) به طور خودکار به حساب تأیید شده شما منتقل می شود و حساب تأیید نشده قبلی شما حذف می شود. این ادغام دائمی است و قابل واگرد نیست. شما نمی توانید دو حساب تایید شده را به دلایل امنیتی ادغام کنید. ",
            ],
          },
          {
            tag: "p",
            children: [
              " حساب Agora شما دارای یک نام کاربری است که می تواند به صورت دستی انتخاب یا به صورت خودکار ایجاد شود. نام های کاربری عمومی هستند اما نیازی به پیوند دادن به هویت واقعی شما ندارند. همچنین می‌توانید جزئیات نمایه اختیاری مانند موضوعات ترجیحی را ارائه دهید، که می‌توانند در هر زمان تغییر یا حذف شوند. ",
            ],
          },
          {
            tag: "p",
            children: [
              " اکثر مطالب در شبکه شهروند آگورا عمومی هستند. هنگامی که محتوایی را ارسال می کنید (به عنوان مثال یک پست، نظر یا واکنش)، برای همه کاربران قابل مشاهده است و ممکن است توسط موتورهای جستجو نمایه شود. Agora همچنین از شواهد رمزنگاری برای ارائه قابلیت تأیید داده ها استفاده می کند، به این معنی که برخی از تعاملات (مانند ایجاد حساب و مشارکت) به صورت غیرمتمرکز به صورت عمومی ثبت می شوند. ",
            ],
          },
          {
            tag: "h3",
            children: ["نمایه آگورا شما"],
          },
          {
            tag: "p",
            children: [
              " نمایه Agora شما به طور پیش فرض عمومی است و حاوی اطلاعاتی مانند: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["نام کاربری"],
              },
              {
                tag: "li",
                children: ["شناسه کاربری منحصر به فرد (UUID)"],
              },
              {
                tag: "li",
                children: [
                  " سابقه فعالیت (پست‌ها، نظرات، تعاملات (ایموجی‌ها، اقدامات موافق/مخالف، کف زدن، رأی موافق/ مخالف)، پاسخ‌های نظرسنجی و محتوای پرچم‌گذاری‌شده/گزارش‌شده ",
                ],
              },
              {
                tag: "li",
                children: ["جوامع و موضوعات مورد علاقه"],
              },
              {
                tag: "li",
                children: [
                  " وضعیت تأیید: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          " تأیید از طریق اثبات گذرنامه (ابطال کننده کاربر و مدارک هویت دو طرفه) ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          " تأیید شده از طریق شماره تلفن (با امضای Agora صحافی اثبات شده انجام شد: کلیدهای کاربر UUID) ",
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
              " کاربران این امکان را دارند که به صورت ناشناس پست کنند. هنگام استفاده از این ویژگی، نام‌های کاربری و تصاویر نمایه با شناسه‌های عمومی جایگزین می‌شوند و محتوا به صورت عمومی به نمایه کاربر پیوند داده نمی‌شود. ",
            ],
          },
          {
            tag: "h3",
            children: ["خدمات شخص ثالث"],
          },
          {
            tag: "p",
            children: [
              " Agora از خدمات شخص ثالثی استفاده می کند که ممکن است آدرس های IP و سایر داده های شخصی را پردازش کند. در صورت امکان، Agora خدمات را برای استفاده از نقاط پایانی منطقه ای اتحادیه اروپا پیکربندی می کند یا از ارائه دهندگان مبتنی بر اتحادیه اروپا استفاده می کند. این سرویس ها خط مشی های حفظ حریم خصوصی خود را دارند و کاربران تشویق می شوند که آنها را بررسی کنند. ",
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
                  " (جهانی) برای اثبات هویت با دانش صفر. ممکن است آدرس های IP را برای عملیات امنیتی و خدماتی پردازش کند. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " (جهانی، منبع باز) برای بلیط رویداد و تأیید هویت با استفاده از گواهی گروهی (GPC). ممکن است آدرس های IP را برای عملیات سرویس پردازش کند. Zupass از Simple Analytics برای تجزیه و تحلیل وب دوستانه حریم خصوصی استفاده می کند. ",
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
                  " (جهانی) برای تأیید شماره تلفن. Twilio شماره تلفن ها را در متن شفاف ذخیره می کند و آدرس های IP را برای جلوگیری از تقلب پردازش می کند. توجه داشته باشید که Agora فقط شماره تلفن های هش شده (هرگز در متن واضح) را در پایگاه داده ما ذخیره می کند، اما Twilio شماره تلفن ها را طبق خط مشی رازداری خود حفظ می کند. ",
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
                  " (جهانی) برای حفاظت و امنیت DDoS. آدرس های IP را پردازش می کند. ",
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
                  " (EU: Dublin and Paris) برای میزبانی زیرساخت ها، ذخیره سازی داده ها و منابع محاسباتی. آدرس های IP را برای عملیات زیرساخت پردازش می کند. ",
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
                  " (مستقر در ایالات متحده، منطقه ایالات متحده مرکزی 1) برای ترجمه پست های کاربر و محتوای تولید شده توسط پلت فرم مبتنی بر هوش مصنوعی. ممکن است آدرس های IP را برای عملیات زیرساخت پردازش کند. ",
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
                  " (بر اساس اتحادیه اروپا) برای تجزیه و تحلیل وب دوستانه حریم خصوصی. آدرس های IP را برای شمارش بازدیدکنندگان به طور موقت پردازش می کند اما آنها را ذخیره نمی کند (برای جزئیات به خط مشی داده آنها مراجعه کنید). ",
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
                  " (سرورهای اتحادیه اروپا) برای ردیابی خطا و گزارش خرابی. آدرس های IP را برای اهداف اشکال زدایی پردازش می کند. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " سرویس‌هایی که به‌عنوان «جهانی» علامت‌گذاری شده‌اند، با پادمان‌های مناسب GDPR که در ماده 3 توضیح داده شده است، کار می‌کنند. کاربرانی که نگران حریم خصوصی آدرس IP هستند، تشویق می‌شوند هنگام دسترسی به Agora از Tor یا سایر راه‌حل‌های mixnet استفاده کنند. ",
            ],
          },
          {
            tag: "h3",
            children: ["کوکی ها و تجزیه و تحلیل"],
          },
          {
            tag: "p",
            children: [
              " آگورا از تبلیغات یا کوکی‌های ردیابی متقابل سایت استفاده نمی‌کند و ما داده‌هایی را برای تبلیغات نمی‌فروشیم. ما از Plausible Analytics، یک سرویس تحلیلی مبتنی بر اتحادیه اروپا که از کوکی‌ها استفاده نمی‌کند، و Sentry برای تله‌متری خطا و عملکرد محدود استفاده می‌کنیم. برای جزئیات بیشتر، مراجعه کنید ",
              {
                tag: "a",
                children: ["Plausible Analytics"],
                href: "https://plausible.io/about",
                external: true,
              },
              ". ",
            ],
          },
          {
            tag: "p",
            children: [
              " ما فقط از کوکی های جلسه/ احراز هویت استفاده می کنیم که برای عملکرد وب سایت کاملاً ضروری هستند. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["1. چه زمانی این سیاست حفظ حریم خصوصی اعمال می شود؟"],
          },
          {
            tag: "p",
            children: ["1.1. زمانی که شما:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "از وب سایت ما (https://agoracitizen.network/) استفاده کنید؛",
                ],
              },
              {
                tag: "li",
                children: ["از برنامه موبایل ما استفاده کنید؛ و"],
              },
              {
                tag: "li",
                children: [
                  " از طریق ایمیل یا هر کانال ارتباطی دیجیتال دیگر با ما در ارتباط باشید. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 1.2. این سیاست حفظ حریم خصوصی ممکن است همانطور که در ماده 8 ذکر شده است اصلاح شود. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. کدام داده های شخصی را پردازش می کنیم و چرا؟"],
          },
          {
            tag: "p",
            children: [
              " ما فقط داده های شخصی شما را برای یک هدف خاص و تا حدی که قانون مجاز بداند پردازش می کنیم. در ادامه توضیح می دهیم که در چه مواردی داده های شخصی شما را جمع آوری و استفاده می کنیم. اگر اطلاعات شخصی شما را مستقیماً از شما دریافت نکنیم، در زیر به شما اطلاع خواهیم داد. ",
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
                        children: ["چه داده های شخصی؟"],
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
                            children: ["شناسه دستگاه (DID - شناسه غیرمتمرکز)"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " یک کلید عمومی رمزنگاری (فرمت انجام داد: کلید) در دستگاه شما ایجاد و ذخیره می شود، سپس به حساب کاربری شما در سرورهای ما پیوند داده می شود. DID ها به عنوان شناسه های جلسه دائمی عمل می کنند که دستگاه شما را به حساب شما متصل می کند. DID ها برای همه کاربران (مهمان، ورود نرم افزاری و ورود سخت) ذخیره می شوند تا جلسات مبتنی بر دستگاه را حفظ کنند. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["منافع مشروع"],
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
                            children: ["ورود نرم - تأیید بلیت رویداد (Zupass)"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " هنگامی که با استفاده از Zupass تأیید می‌کنید، ما یک باطل کننده خاص رویداد (شناسه حفظ حریم خصوصی که از بلیط شما مشتق شده است) و Slug رویداد را ذخیره می‌کنیم. این شرکت در رویداد را بدون فاش کردن جزئیات بلیط ثابت می کند. ورود نرم افزار حساب کاربری ثبت شده ایجاد نمی کند، اما اجازه می دهد تا تایید مبتنی بر جلسه است که می تواند به ثبت نام دائمی ارتقا داده شود. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["منافع مشروع"],
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
                            children: ["داده های احراز هویت - شماره تلفن"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای احراز هویت کاربران و ارائه کدهای تأیید یک بار مصرف. شماره تلفن ها به عنوان هش رمزنگاری در پایگاه داده ما ذخیره می شوند. Twilio (ارائه‌دهنده پیامک ما) شماره تلفن‌ها را در متن شفاف پردازش و ذخیره می‌کند تا کدهای تأیید را تحویل دهد. تأیید تلفن یک حساب ثبت شده دائمی ایجاد می کند. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["منافع مشروع"],
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
                              "داده های احراز هویت - گواهی عدم دانش گذرنامه (راریمو)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای تأیید واجد شرایط بودن کاربر از طریق تأیید گذرنامه با حفظ حریم خصوصی. ما یک باطل کننده گذرنامه، کد کشور تابعیت و جنسیت را ذخیره می کنیم. آگورا فقط مدرک رمزنگاری را دریافت می کند که منحصر به فرد بودن و واجد شرایط بودن را تأیید می کند، نه شماره پاسپورت، نام، عکس یا سایر جزئیات گذرنامه شما. تأیید گذرنامه یک حساب ثبت شده دائمی ایجاد می کند. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["منافع مشروع"],
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
                          " (نام کاربری، زبان ترجیحی، جنسیت و ملیت (در صورت تایید گذرنامه)) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای ایجاد و مدیریت حساب های کاربری، تجربه کاربری را سفارشی کنید. این داده ها برای اهداف تجزیه و تحلیل، اطلاعات بینش و کسب درآمد جمع می شوند. ",
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
                            children: ["اقداماتی که انجام می دهید"],
                          },
                          " (پست ها، نظرات، پاسخ ها، واکنش ها، نظرسنجی ها) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای تسهیل بحث ها، تعاملات کاربر و تعامل در پلت فرم. این داده ها برای اهداف تجزیه و تحلیل، اطلاعات بینش و کسب درآمد جمع می شوند. ",
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
                            children: ["آدرس IP"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای محافظت از زیرساخت پلت فرم، جلوگیری از فعالیت های مخرب و اطمینان از امنیت عملیاتی (مانند محافظت در برابر حملات انکار سرویس توزیع شده (DDoS). ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["منافع مشروع"],
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
                            children: ["اطلاعات فنی مستعار"],
                          },
                          " (UUID های کاربر، نام های کاربری، فراداده های درخواست، گزارش های خطا، مُهر زمانی) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای نظارت بر سیستم، اشکال زدایی، بهینه سازی عملکرد و بهبود قابلیت اطمینان سرویس. ما PII حساس مانند شماره تلفن را در گزارش‌های برنامه ثبت نمی‌کنیم. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["منافع مشروع"],
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
                            children: ["ارتباط"],
                          },
                          " (هویت و اطلاعات تماس ارائه شده توسط شما به ما، محتوای ارتباط، جزئیات فنی خود ارتباط (به عنوان مثال تاریخ و زمان) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای فعال کردن ارتباط بین شما و ما (به عنوان مثال هنگامی که از طریق رسانه های اجتماعی، تلفن یا ایمیل با ما تماس می گیرید). ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " علاقه مشروع ما به توانایی پاسخگویی به درخواست ها، سؤالات یا نظرات یا تماس فعالانه با شما برای هرگونه سؤالی است. ",
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
                            children: ["داده های شخصی فوق الذکر"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای پیروی از تعهدات قانونی خود یا پیروی از هرگونه درخواست معقول از مقامات صالح پلیس، مقامات قضایی، نهادها یا ارگان های دولتی، از جمله مقامات ذیصلاح حفاظت از داده ها. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["تعهد قانونی ما"],
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
                            children: ["داده های شخصی فوق الذکر"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " برای پیشگیری، کشف و مبارزه با کلاهبرداری یا سایر فعالیت های غیرقانونی یا غیرمجاز. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["تعهد قانونی ما"],
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
                            children: ["داده های شخصی فوق الذکر"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: ["برای دفاع از خود در مراحل قانونی."],
                      },
                      {
                        tag: "td",
                        children: [
                          " منافع مشروع ما در استفاده از داده های شخصی شما در این روند. ",
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
                            children: ["داده های شخصی فوق الذکر"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " اطلاع رسانی به شخص ثالث در زمینه ادغام احتمالی، اکتساب/توسط یا تجزیه توسط آن شخص ثالث، حتی اگر آن شخص ثالث در خارج از اتحادیه اروپا واقع شده باشد. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " منافع مشروع ما در ورود به معاملات تجاری. ",
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
                            children: ["ارتقا/ادغام حساب کاربری"],
                          },
                          " (محتوای کاربر، دستگاه ها، بلیط های رویداد، تنظیمات برگزیده) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " وقتی از ورود مهمان یا نرم افزاری به تأیید سخت (تلفن یا پاسپورت) ارتقا می دهید، تمام اطلاعات شما به حساب تأیید شده شما منتقل می شود و حساب قبلی شما حذف می شود. این امر ضمن افزودن تأیید دائمی، تداوم محتوا و سابقه فعالیت شما را تضمین می کند. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["رضایت شما و منافع مشروع ما."],
                      },
                    ],
                  },
                ],
              },
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
              "3. اطلاعات شخصی شما را با چه کسانی به اشتراک می گذاریم؟",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.1. در اصل، ما اطلاعات شخصی شما را با هیچ کس دیگری به جز افرادی که برای ما کار می کنند، و همچنین با تامین کنندگانی که به ما در پردازش داده های شخصی شما کمک می کنند، به اشتراک نمی گذاریم. هر کسی که به داده های شخصی شما دسترسی داشته باشد، همیشه ملزم به رعایت تعهدات قانونی یا قراردادی سختگیرانه برای حفظ امنیت و محرمانه بودن اطلاعات شخصی شما خواهد بود. این بدان معنی است که فقط دسته های زیر از گیرندگان اطلاعات شخصی شما را دریافت خواهند کرد: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["شما؛"],
              },
              {
                tag: "li",
                children: ["کارمندان و تامین کنندگان ما؛ و"],
              },
              {
                tag: "li",
                children: [
                  " مقامات دولتی یا قضایی تا حدی که ما موظف هستیم اطلاعات شخصی شما را با آنها به اشتراک بگذاریم (مانند مقامات مالیاتی، پلیس یا مقامات قضایی). ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. ما اطلاعات شخصی شما را به خارج از منطقه اقتصادی اروپا (EEA) ارسال می کنیم (منطقه اقتصادی اروپا متشکل از اتحادیه اروپا، لیختن اشتاین، نروژ و ایسلند است). ما این داده‌های شخصی را به خارج از منطقه اقتصادی اروپا منتقل می‌کنیم تا با دسته‌های گیرندگان داده‌های شخصی شما که در این ماده ۳ تعریف شده است ارتباط برقرار کنیم. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. ما تدابیر مناسبی را برای محافظت از داده‌های شخصی شما در حین انتقال اعمال خواهیم کرد، مانند کار کردن فقط با پردازنده‌های مستقر در کشورهایی که دارای تصمیم کمیسیون اروپا برای کفایت هستند یا تحت یک چارچوب تأیید شده مانند اتحادیه اروپا-ایالات متحده تأیید شده‌اند. چارچوب حریم خصوصی داده ها ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. اگر تصمیم کمیسیون اروپا برای کفایت کشور مقصد وجود نداشته باشد، هنگام انتقال داده‌های شخصی از تدابیر حفاظتی مناسب، همانطور که در ماده 46 GDPR توضیح داده شده است، استفاده خواهیم کرد و این گونه انتقال‌ها و اقدامات امنیتی فنی و سازمانی مطابق با ماده 30 GDPR مستند خواهد شد. برای مثال، ما از بندهای قراردادی استاندارد برای محافظت از انتقال داده‌های شخصی به کشورهای خارج از منطقه اقتصادی اروپا (EEA) استفاده می‌کنیم، بنابراین تضمین می‌کنیم که سطح برابری از حفاظت از داده‌ها برای داده‌های شخصی شما اعمال می‌شود، حتی اگر قانون حفاظت از داده‌های اتحادیه اروپا مستقیماً قابل اجرا نباشد. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. Agora ممکن است داده‌های ناشناس و/یا جمع‌آوری‌شده را به سازمان‌هایی خارج از حوزه قضایی که در آن ارائه می‌کنید، منتقل کند. اگر چنین انتقالی انجام شود، آگورا تضمین می‌کند که تدابیری برای اطمینان از ایمنی و یکپارچگی داده‌های شما و کلیه حقوق مربوط به داده‌های شخصی شما که ممکن است تحت قانون اجباری قابل اجرا از آن برخوردار باشید، وجود دارد. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["4. چه مدت داده های شخصی شما را نگه می داریم؟"],
          },
          {
            tag: "p",
            children: [
              " 4.1. داده های شخصی شما فقط تا زمانی که برای دستیابی به اهدافی که در بالا توضیح داده شد یا زمانی که ما از شما رضایت خواسته ایم تا زمانی که رضایت خود را پس نگیرید، لازم باشد، پردازش می شود. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. به عنوان یک قاعده کلی، ما اطلاعات شخصی شما را زمانی که دیگر برای اهدافی که در بالا توضیح داده شد مورد نیاز نباشند، از بین می بریم. با این حال، اگر یک تعهد قانونی یا نظارتی یا حکم دادگاه یا اداری که ما را از انجام این کار منع کند، نمی‌توانیم اطلاعات شخصی شما را حذف کنیم. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. ما تمام داده‌های شخصی جمع‌آوری‌شده از طریق وب‌سایت یا برنامه تلفن همراه خود را تا زمانی که برای حفاظت از منافع قانونی مندرج در ماده ۲ یا تا زمانی که رضایت شما پس گرفته نشود، حفظ می‌کنیم. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. تمام داده‌های شخصی که از طریق تعاملات خود با شما از طریق رسانه‌های اجتماعی، تلفن، ایمیل یا سایر کانال‌های ارتباطی دیجیتال جمع‌آوری می‌کنیم تا زمانی که برای برقراری ارتباط با شما و همچنین برای حفظ سابقه تاریخی ارتباطات ما لازم باشد، حفظ می‌شوند. این به ما امکان می دهد وقتی با سؤالات، درخواست ها، نظرات یا ورودی های جدید به ما مراجعه می کنید، به ارتباطات قبلی بازگردیم. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. چگونه اطلاعات شخصی شما را ایمن نگه داریم؟"],
          },
          {
            tag: "p",
            children: [
              " 5.1. در آگورا، حفاظت از داده های شخصی شما اولویت اصلی است. ما مجموعه ای از اقدامات فنی و سازمانی را برای اطمینان از ایمن ماندن همه داده های شخصی پردازش شده اجرا کرده ایم. این اقدامات عبارتند از: ",
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
                    children: [
                      "به حداقل رساندن داده ها و حفظ حریم خصوصی توسط طراحی:",
                    ],
                  },
                  " ما فقط حداقل داده های شخصی لازم برای عملکرد پلتفرم را جمع آوری می کنیم و در صورت امکان از ذخیره سازی اطلاعات حساس اجتناب می کنیم. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["رمزگذاری و نام مستعار:"],
                  },
                  ' داده‌های شخصی رمزگذاری می‌شوند و تکنیک‌های نام مستعار برای محافظت از هویت کاربر استفاده می‌شود. به عنوان مثال، شماره تلفن هرگز در متن ساده ذخیره نمی شود. در عوض، ما یک "فلفل" رمزنگاری را اعمال می کنیم و آنها را برای جلوگیری از دسترسی غیرمجاز هش می کنیم. ',
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["احراز هویت با مدرک بدون دانش:"],
                  },
                  " آگورا از مدارک دانش صفر (ZKP) برای تأیید گذرنامه استفاده می کند و اطمینان می دهد که کاربران می توانند واجد شرایط بودن خود را بدون افشای اطلاعات شخصی حساس ثابت کنند. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["شواهد رمزنگاری غیرمتمرکز:"],
                  },
                  " برخی از تعاملات کاربر (مانند ایجاد حساب و مشارکت) به طور عمومی از طریق اثبات رمزنگاری بدون افشای هویت کاربر قابل تأیید است. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["احراز هویت امن:"],
                  },
                  " ما رمز عبور را ذخیره نمی کنیم. در عوض، احراز هویت از طریق کدهای تأیید یک بار مصرف یا کلیدهای رمزنگاری انجام می شود و خطر نشت اعتبار را کاهش می دهد. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["حفاظت از زیرساخت:"],
                  },
                  " پلت فرم ما در برابر تهدیدات سایبری با استفاده از حفاظت DDoS، کنترل های دسترسی و نظارت بر شبکه برای شناسایی و کاهش حملات ایمن است. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["شفافیت و کنترل کاربر:"],
                  },
                  " کاربران می توانند اطلاعات شخصی خود را مدیریت کنند، حساب کاربری خود را حذف کنند و نحوه پردازش اطلاعات خود را کنترل کنند. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["ارزیابی های امنیتی منظم:"],
                  },
                  " اقدامات امنیتی ما به طور دوره ای بررسی و به روز می شود تا تهدیدات نوظهور را برطرف کرده و حفاظت از داده ها را بهبود بخشد. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "دسترسی کنترل شده به گزارش ها و تجزیه و تحلیل ها:",
                    ],
                  },
                  " برای نظارت بر عملکرد و بهبود تجربه کاربر فقط از داده های تجزیه و تحلیل انبوه و ناشناس استفاده می شود. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["افزونگی داده ها و پشتیبان گیری:"],
                  },
                  " داده ها به طور ایمن در سرورهای AWS در دوبلین، ایرلند ذخیره می شوند و در پاریس، فرانسه برای اهداف بازیابی فاجعه، با کنترل های دسترسی دقیق و اقدامات رمزگذاری، تکرار می شوند. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["مجموعه محدود فراداده:"],
                  },
                  " لاگ های برنامه Agora عمدا آدرس های IP را ضبط نمی کنند. ارائه دهندگان زیرساخت و نظارت بر خطا، از جمله Cloudflare، ارائه دهندگان خدمات ابری، و Sentry، ممکن است آدرس های IP را برای امنیت، عملیات یا اشکال زدایی پردازش کنند. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["ترجمه هوش مصنوعی ناشناس:"],
                  },
                  " محتوایی که برای ترجمه به پلتفرم Google Cloud ارسال می‌شود، بدون هیچ گونه ابرداده همراه (شناسه‌های کاربر و غیره) همانطور که هست منتقل می‌شود و در ایالات متحده (منطقه us-central1) پردازش می‌شود. سرویس ترجمه مبتنی بر Google Cloud LLM که ما استفاده می کنیم در حال حاضر در منطقه اتحادیه اروپا در دسترس نیست. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "استفاده از ",
                      {
                        tag: "a",
                        children: ["Sentry.io"],
                        href: "https://sentry.io/privacy/",
                        external: true,
                      },
                      " برای گزارش‌های خرابی کاهش‌یافته حریم خصوصی:",
                    ],
                  },
                  " Agora از Sentry (میزبان شده در سرورهای اتحادیه اروپا) برای ردیابی خطا و اهداف گزارش خرابی استفاده می کند. جلسات روتین برای پخش مجدد جلسه آپلود نمی شوند. هنگامی که خطایی رخ می دهد، داده های تعامل اخیر بافر ممکن است برای کمک به تشخیص خرابی آپلود شود. پخش مجدد متن و ورودی‌ها را ماسک می‌کند، رسانه‌ها را مسدود می‌کند، ضبط بدنه شبکه را غیرفعال می‌کند و ویژگی‌های متن و فرم پیکربندی‌شده را قبل از ضبط ماسک می‌کند. رویدادهای ضبط سفارشی ناوبری و شبکه پاک می‌شوند و لیست URL بازدید شده رویداد Replay قبل از آپلود پاکسازی می‌شود. آدرس‌های اینترنتی Agora و ZKorum شخص اول ممکن است مسیرها و شناسه‌های مسیر مستعار را حفظ کنند، اما اعتبارنامه‌ها، رشته‌های جستجو و قطعات حذف می‌شوند. URL های خارجی به مبدا خود کاهش می یابند، در حالی که طرح های URL ناامن ویرایش می شوند. رویدادهای خطا همچنین نشانی‌های اینترنتی درخواست و داده‌های اضافی دلخواه را حذف می‌کنند، فقط یک فهرست مجاز صریح از زمینه‌های فنی را حفظ می‌کنند، و اطلاعات کنسول و رابط کاربری را حذف می‌کنند. برای یک عیب‌یابی سرریز پشته خاص، یک پیوست محدود ممکن است شامل پرچم‌های ساختاری صفحه‌بندی باشد، اما نه وضعیت OTP، پیش‌نویس‌ها، وضعیت ورود، شناسه‌ها یا محتوای تولید شده توسط کاربر. گزارش‌های بازپخش و خطا همچنان می‌توانند حاوی DOM ساختاری، مسیرهای مسیر مستعار، مبدا منابع، ابرداده‌های فنی و تعاملی باشند و Sentry ممکن است آدرس‌های IP را همانطور که در خط‌مشی رازداری خود توضیح داده است پردازش کند. Sentry از کوکی های ردیابی استفاده نمی کند. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["ثبت نام مستعار برای نظارت:"],
                  },
                  " Agora داده های فنی مستعار را برای اهداف نظارت بر سیستم، اشکال زدایی و بهینه سازی عملکرد جمع آوری می کند. این شامل UUID های کاربر، نام های کاربری، فراداده های درخواست و گزارش های خطا می شود. ما PII حساس مانند شماره تلفن را در گزارش های برنامه خود ثبت نمی کنیم. با این حال، سرویس‌های شخص ثالث مانند Twilio، AWS، Cloudflare و سایرین ممکن است داده‌ها (از جمله آدرس‌های IP و در مورد Twilio، شماره تلفن‌ها) را طبق خط‌مشی‌های حفظ حریم خصوصی و برنامه‌های نگهداری خود حفظ کنند. ",
                ],
              },
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. حقوق شما در مورد داده های شخصی شما"],
          },
          {
            tag: "p",
            children: [
              " 6.1. هنگامی که ما داده‌های شخصی شما را جمع‌آوری و استفاده می‌کنیم، از تعدادی حقوق برخوردار خواهید شد که می‌توانید به روشی که در زیر توضیح داده شده از آنها استفاده کنید. لطفاً توجه داشته باشید که وقتی می‌خواهید از حقی استفاده کنید، از شما مدرک هویت می‌خواهیم. ما این کار را برای جلوگیری از نقض اطلاعات شخصی انجام می دهیم (به عنوان مثال به این دلیل که یک فرد غیرمجاز جعل هویت شماست و از حقی به نام شما استفاده می کند). ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2. بسته به پردازش و مبنای قانونی، به عنوان یک موضوع داده، تعدادی از امکانات برای حفظ کنترل داده های شخصی خود دارید: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["حق دسترسی به داده های شما"],
              },
              {
                tag: "li",
                children: ["حق اصلاح داده های شما"],
              },
              {
                tag: "li",
                children: ["حق اعتراض به پردازش داده های شخصی شما"],
              },
              {
                tag: "li",
                children: ["حق محدود کردن پردازش داده ها"],
              },
              {
                tag: "li",
                children: ["حق پاک کردن اطلاعات شما"],
              },
              {
                tag: "li",
                children: ["حق انصراف از رضایت قبلی"],
              },
              {
                tag: "li",
                children: ["حق انتقال داده های شما"],
              },
              {
                tag: "li",
                children: [" حق طرح شکایت نزد مقام ذیصلاح حفاظت از داده ها. "],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. ما باید به شما اشاره کنیم که این حقوق همیشه مطلق نیستند، که در شرایط خاص ما حق داریم یا حتی طبق قانون ما را ملزم به پردازش بیشتر داده های شخصی شما می کنیم و بنابراین ممکن است همیشه نتوانیم (به طور کامل) با درخواست شما مطابقت کنیم. در چنین مواردی ما به شما اطلاع خواهیم داد. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. شما می‌توانید از این حقوق به‌طور رایگان استفاده کنید، مگر در موارد سوء استفاده و در این صورت، ما حق داریم برای انجام درخواست شما، هزینه مدیریتی دریافت کنیم. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5. توجه داشته باشید که می‌توانید واکنش‌ها، کف زدن‌ها، رأی موافق/مخالف، پاسخ‌های نظرسنجی، اقدامات موافق/مخالف، مکالمات، نظرات، پاسخ‌ها، اطلاعات «نمایش» و زبان صحبت شده خود را حذف کنید (حداقل یکی باید باقی بماند). ",
            ],
          },
          {
            tag: "h3",
            children: ["6.6. سوابق امنیتی:"],
          },
          {
            tag: "p",
            children: [
              " برخی از سوابق امنیتی پس از حذف حساب برای محافظت از سرویس حفظ می شوند: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " هش توکن شبکه کنترل کنترل شده توسط کاربر (UCAN) کوتاه مدت که برای محافظت از حمله مجدد استفاده می شود ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " این سوابق فقط برای مدت زمان مورد نیاز برای جلوگیری از استفاده مجدد از نشانه های مجوز نگهداری می شوند. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. چگونه اکانت خود را حذف کنیم:"],
          },
          {
            tag: "p",
            children: [
              " وقتی اکانت خود را حذف می کنید، همینطور است ",
              {
                tag: "strong",
                children: ["بلافاصله غیر قابل دسترس"],
              },
              " و قابل بازیابی نیست. فرآیند حذف از این جدول زمانی پیروی می کند: ",
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
                    children: ["فوری:"],
                  },
                  " حساب شما به نرمی حذف شده و غیر قابل دسترس می شود. همه دستگاه ها از سیستم خارج شده اند. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["بعد از 15 روز:"],
                  },
                  " اطلاعات حساب شما برای همیشه از پایگاه داده ما حذف می شود (حذف سخت). ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["تا 30 روز پس از آن:"],
                  },
                  " داده ها ممکن است در پشتیبان های رمزگذاری شده برای اهداف بازیابی فاجعه باقی بمانند. ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["پس از حذف چه اتفاقی می افتد:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " حساب شما بلافاصله غیرقابل دسترسی می شود و قابل بازیابی نیست ",
                ],
              },
              {
                tag: "li",
                children: [
                  "همه دستگاه ها از سیستم خارج شده اند و جلسه شما خاتمه یافته است",
                ],
              },
              {
                tag: "li",
                children: [
                  " اعتبار تأیید شما (شماره تلفن، گواهی پاسپورت، بلیط رویداد) باطل است ",
                ],
              },
              {
                tag: "li",
                children: [
                  " محتوای شما (پست‌ها، رای‌ها، نظرات) در پلتفرم باقی می‌ماند اما دیگر به صورت عمومی با حساب شما مرتبط نیست ",
                ],
              },
              {
                tag: "li",
                children: [
                  " پس از 15 روز، داده های حساب شما برای همیشه از پایگاه داده ما حذف می شود ",
                ],
              },
              {
                tag: "li",
                children: [
                  " شواهد رمزنگاری اقدامات حساب پس از تأیید حفظ نمی شود ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["نگهداری داده های شخص ثالث:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["پشتیبان گیری از پایگاه داده:"],
                  },
                  " داده ها ممکن است تا 30 روز پس از حذف سخت 15 روزه در پشتیبان های AWS رمزگذاری شده باقی بمانند. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["تویلیو:"],
                  },
                  " سوابق تأیید تلفن بر اساس حفظ می شود ",
                  {
                    tag: "a",
                    children: ["سیاست حفظ حریم خصوصی Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["خدمات شخص ثالث:"],
                  },
                  " گزارش‌ها و داده‌ها در Sentry، Cloudflare، AWS و Google Cloud ممکن است طبق خط‌مشی‌های رازداری مربوطه حفظ شوند. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["مهم:"],
              },
              " حذف فوری و غیر قابل برگشت است. پس از درخواست حذف نمی توانید حساب خود را بازیابی کنید. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. اگر شکایتی در مورد پردازش داده های شخصی خود توسط ما دارید، همیشه می توانید با ما تماس بگیرید ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". اگر از پاسخ ما راضی نیستید، می‌توانید شکایتی را نزد مرجع ذی‌صلاح حفاظت از داده‌ها، یعنی کمیسیون ملی اطلاعات و آزادی‌های فرانسه (French Commission nationale de l'informatique et des libertés) ارسال کنید",
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
            children: ["7. اطلاعات مهم برای ساکنان کالیفرنیا"],
          },
          {
            tag: "p",
            children: [
              ' 7.1. بر اساس قانون حفظ حریم خصوصی مصرف کنندگان کالیفرنیا در سال 2018 ("CCPA")، ما جزئیات اضافی زیر را در اختیار ساکنان کالیفرنیا قرار می دهیم. در طی 12 ماه گذشته، دسته‌هایی از اطلاعات شخصی شما را که در بالا در این خط‌مشی رازداری توضیح داده شده است را برای اهداف تجاری عملیاتی خود جمع‌آوری، استفاده و به اشتراک گذاشته‌ایم. ',
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. ما اطلاعات شخصی شما را نفروخته‌ایم، به این معنی که اطلاعات شخصی شما را برای ملاحظات پولی یا سایر موارد ارزشمند فاش نکرده‌ایم. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. شما این حق را دارید که درخواست دسترسی یا حذف اطلاعات شخصی خود و درخواست شفافیت در مورد شیوه های حفظ حریم خصوصی ما را داشته باشید. اگر مایلید از حقوق خود تحت CCPA استفاده کنید، لطفاً به ماده 6 مراجعه کنید. هنگامی که درخواست شما را دریافت کردیم، با درخواست اطلاعات برای تأیید هویت شما، از جمله با درخواست اطلاعات اضافی، آن را تأیید می کنیم. اگر مایلید از یک نماینده ثبت شده در وزیر امور خارجه کالیفرنیا برای اعمال حقوق خود استفاده کنید، ممکن است مدرکی را درخواست کنیم که نشان دهد شما وکالتنامه ای را به چنین نماینده ای ارائه کرده اید یا اینکه نماینده در غیر این صورت دارای اختیارات کتبی معتبر برای ارائه درخواست برای اعمال حقوق از طرف شما است. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. اگر بخواهید از حقوق خود استفاده کنید، ما قیمت های متفاوتی از شما دریافت نمی کنیم یا خدمات با کیفیت متفاوتی را برای استفاده از حقوق شما ارائه نمی دهیم، مگر اینکه این تفاوت ها توسط قانون مجاز باشد. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["8. تغییرات در این سیاست حفظ حریم خصوصی"],
          },
          {
            tag: "p",
            children: [
              " 8.1. ما می توانیم این سیاست حفظ حریم خصوصی را به ابتکار خود در هر زمان تغییر دهیم. اگر تغییرات اساسی در این خط‌مشی رازداری ممکن است بر پردازش داده‌های شخصی شما تأثیر بگذارد، ما این تغییرات را به گونه‌ای که معمولاً با شما ارتباط برقرار می‌کنیم (به عنوان مثال از طریق ایمیل یا از طریق پیام در پلت‌فرم) به شما اطلاع خواهیم داد. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 8.2. از شما دعوت می کنیم آخرین نسخه این سیاست حفظ حریم خصوصی را در وب سایت ما (https://agoracitizen.network/) بخوانید. خط مشی رازداری تاریخ آخرین تغییر خط مشی رازداری ما را بیان می کند. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. آیا سوالی دارید؟"],
          },
          {
            tag: "p",
            children: [
              " 9.1. اگر در مورد پردازش اطلاعات شخصی خود سؤال دیگری دارید، لطفاً با مدیر حریم خصوصی ما تماس بگیرید. می توانید از طریق ایمیل با مدیر حریم خصوصی ما تماس بگیرید: ",
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
        "Cette politique de confidentialité a été traduite automatiquement. La version anglaise est la seule version faisant foi et prévaut exclusivement en cas de divergence.",
      viewEnglish: "Voir la version anglaise faisant foi",
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
          ": 2025/11/11 (AAAA/MM/JJ)",
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
          ". Chez ZKorum, nous pensons que la vie privée est un droit fondamental. Notre mission est de permettre aux utilisateurs de s'engager dans un discours politique et social tout en gardant le contrôle de leur identité et de leurs informations personnelles. ",
        ],
      },
      {
        tag: "p",
        children: [
          " Cette politique de confidentialité explique comment et pourquoi Agora Citizen Network (« Agora », « nous », « notre » ou « ZKorum ») collecte, utilise et partage des informations vous concernant lorsque vous utilisez notre site Web et nos applications mobiles (collectivement, les « Services ») ou lorsque vous interagissez avec nous d'une autre manière. Nous sommes responsables de la collecte et de l'utilisation de vos données personnelles de la manière expliquée dans cette politique de confidentialité. ",
        ],
      },
      {
        tag: "p",
        children: [
          " Si vous avez des questions à ce sujet, veuillez nous contacter par e-mail : ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". Si vous résidez en Californie, nous attirons votre attention sur l'article 7. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["Agora est une plateforme publique"],
          },
          {
            tag: "p",
            children: [
              " La plupart des contenus sur Agora sont accessibles au public, ce qui signifie que votre profil, vos publications, vos votes et vos opinions peuvent être consultés par n'importe qui, même sans compte. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Vous n'êtes pas obligé de créer un compte pour naviguer sur Agora. Pour participer aux discussions et interagir avec le contenu, vous pouvez : ",
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
                    children: ["Naviguez en tant qu'invité :"],
                  },
                  " Vous pouvez explorer le contenu et participer à des interactions limitées sans vous inscrire. Lorsque vous interagissez pour la première fois avec la plateforme (par exemple, publication, vote), un identifiant cryptographique (DID) spécifique à l'appareil est automatiquement généré et stocké sur votre appareil, puis lié à un compte utilisateur sur nos serveurs. Ce DID sert d'identifiant de session permanent pour votre appareil. Les comptes invités ne sont pas vérifiés et ne sont accessibles qu'à partir de l'appareil d'origine. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "Connexion logicielle (vérification basée sur la session) :",
                    ],
                  },
                  " Vérifiez en utilisant ",
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " pour la vérification des billets d'événement à l'aide d'une preuve d'accréditation de groupe (GPC). Cela ajoute une vérification temporaire basée sur des événements à votre compte mais ne crée PAS de compte enregistré. La connexion logicielle vous permet de prouver votre participation à un événement sans révéler les détails du billet. Vous pouvez passer à un compte enregistré permanent à tout moment en ajoutant une vérification par téléphone ou par passeport. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "Connexion matérielle (compte enregistré permanent) :",
                    ],
                  },
                  " Créez un compte permanent vérifié en utilisant l'une des méthodes suivantes : ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["Numéro de téléphone:"],
                          },
                          " Vérifié via un code à usage unique envoyé par SMS ",
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
                          ": Vérification Zero-Knowledge Proof (ZKP) basée sur le passeport ",
                        ],
                      },
                    ],
                  },
                  " Ces méthodes créent un compte enregistré et garantissent que votre identité est validée tout en préservant la confidentialité. Agora ne reçoit que les preuves cryptographiques confirmant l'unicité et l'éligibilité, jamais les pièces d'identité sous-jacentes ou les informations sur les billets. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["Mises à niveau du compte :"],
              },
              " Lorsque vous passez d'une connexion invité ou logicielle à une vérification matérielle (téléphone ou passeport), tout votre contenu existant (messages, votes, suivis, vérifications d'événements) est automatiquement transféré vers votre compte vérifié et votre précédent compte non vérifié est supprimé. Cette fusion est permanente et ne peut être annulée. Vous ne pouvez pas fusionner deux comptes vérifiés pour des raisons de sécurité. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Votre compte Agora aura un nom d'utilisateur, qui peut être sélectionné manuellement ou généré automatiquement. Les noms d'utilisateur sont publics mais ne doivent pas nécessairement être liés à votre véritable identité. Vous pouvez également fournir des détails de profil facultatifs tels que des sujets préférés, qui peuvent être modifiés ou supprimés à tout moment. ",
            ],
          },
          {
            tag: "p",
            children: [
              " La plupart des contenus d’Agora Citizen Network sont publics. Lorsque vous soumettez du contenu (par exemple une publication, une opinion ou une réaction), il est visible par tous les utilisateurs et peut être indexé par les moteurs de recherche. Agora utilise également des preuves cryptographiques pour assurer la vérifiabilité des données, ce qui signifie que certaines interactions (telles que la création de compte et la participation) sont enregistrées publiquement de manière décentralisée. ",
            ],
          },
          {
            tag: "h3",
            children: ["Votre profil Agora"],
          },
          {
            tag: "p",
            children: [
              " Votre profil Agora est public par défaut et contient des informations telles que : ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["Nom d'utilisateur"],
              },
              {
                tag: "li",
                children: ["Identifiant d'utilisateur unique (UUID)"],
              },
              {
                tag: "li",
                children: [
                  " Historique des activités (posts, opinions, interactions (émoticônes, actions d'accord/désaccord, applaudissements, votes positifs/négatifs), réponses aux enquêtes et contenu signalé/signalé ",
                ],
              },
              {
                tag: "li",
                children: ["Communautés et sujets d’intérêt"],
              },
              {
                tag: "li",
                children: [
                  " Statut de vérification : ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          " Vérifié via une preuve de passeport (annulateur d'utilisateur et preuves d'identité bidirectionnelles) ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          " Vérifié via un numéro de téléphone (preuve de liaison signée Agora : clés de l'UUID de l'utilisateur) ",
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
              " Les utilisateurs ont la possibilité de publier de manière anonyme. Lors de l'utilisation de cette fonctionnalité, les noms d'utilisateur et les photos de profil sont remplacés par des identifiants génériques et le contenu n'est pas lié publiquement au profil de l'utilisateur. ",
            ],
          },
          {
            tag: "h3",
            children: ["Services tiers"],
          },
          {
            tag: "p",
            children: [
              " Agora utilise des services tiers qui peuvent traiter des adresses IP et d'autres données personnelles. Dans la mesure du possible, Agora configure les services pour utiliser des points de terminaison régionaux de l'UE ou utilise des fournisseurs basés dans l'UE. Ces services ont leurs propres politiques de confidentialité et les utilisateurs sont encouragés à les consulter. ",
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
                  " (global) pour les preuves d’identité sans connaissance. Peut traiter les adresses IP pour les opérations de sécurité et de service. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " (mondial, open source) pour la vérification des billets d'événement et de l'identité à l'aide d'une preuve d'accréditation de groupe (GPC). Peut traiter les adresses IP pour les opérations de service. Zupass utilise Simple Analytics pour des analyses Web respectueuses de la confidentialité. ",
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
                  " (mondial) pour la vérification du numéro de téléphone. Twilio stocke les numéros de téléphone en texte clair et traite les adresses IP pour prévenir la fraude. Notez qu'Agora ne stocke que les numéros de téléphone hachés (jamais en texte clair) dans notre base de données, mais Twilio conserve les numéros de téléphone conformément à sa propre politique de confidentialité. ",
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
                  " (mondial) pour la protection et la sécurité DDoS. Traite les adresses IP. ",
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
                  " (UE : Dublin et Paris) pour l'hébergement des infrastructures, le stockage des données et les ressources informatiques. Traite les adresses IP pour les opérations d’infrastructure. ",
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
                  " (basée aux États-Unis, région centrale des États-Unis1) pour la traduction basée sur l'IA des publications des utilisateurs et du contenu généré par la plateforme. Peut traiter les adresses IP pour les opérations d’infrastructure. ",
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
                  " (basé dans l’UE) pour des analyses Web respectueuses de la vie privée. Traite temporairement les adresses IP pour le comptage des visiteurs mais ne les stocke pas (voir leur politique de données pour plus de détails). ",
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
                  " (serveurs de l'UE) pour le suivi des erreurs et le rapport de crash. Traite les adresses IP à des fins de débogage. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Les services marqués comme « globaux » fonctionnent avec les garanties RGPD appropriées décrites à l'article 3. Les utilisateurs préoccupés par la confidentialité des adresses IP sont encouragés à utiliser Tor ou d'autres solutions mixnet lorsqu'ils accèdent à Agora. ",
            ],
          },
          {
            tag: "h3",
            children: ["Cookies et analyses"],
          },
          {
            tag: "p",
            children: [
              " Agora n'utilise pas de cookies publicitaires ou de suivi intersites, et nous ne vendons pas non plus de données à des fins publicitaires. Nous utilisons Plausible Analytics, un service d'analyse basé dans l'UE qui n'utilise pas de cookies, et Sentry pour une télémétrie limitée des erreurs et des performances. Pour plus de détails, visitez ",
              {
                tag: "a",
                children: ["Plausible Analytics"],
                href: "https://plausible.io/about",
                external: true,
              },
              ". ",
            ],
          },
          {
            tag: "p",
            children: [
              " Nous utilisons uniquement des cookies de session/authentification, strictement nécessaires au fonctionnement du site Internet. ",
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
              "1. Quand cette politique de confidentialité s’applique-t-elle ?",
            ],
          },
          {
            tag: "p",
            children: [
              "1.1. Nous collectons et utilisons vos données personnelles lorsque vous :",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "utiliser notre site Web (https://agoracitizen.network/) ;",
                ],
              },
              {
                tag: "li",
                children: ["utilisez notre application mobile ; et"],
              },
              {
                tag: "li",
                children: [
                  " communiquer avec nous par e-mail ou tout autre canal de communication numérique. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 1.2. Cette politique de confidentialité peut être modifiée comme indiqué à l’article 8. ",
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
              "2. Quelles données personnelles traitons-nous et pourquoi ?",
            ],
          },
          {
            tag: "p",
            children: [
              " Nous ne traiterons vos données personnelles que dans un but spécifique et dans la mesure permise par la loi. Nous expliquons ci-dessous dans quels cas nous collectons et utilisons vos données personnelles. Si nous ne recevons pas vos données personnelles directement de votre part, nous vous en informerons également ci-dessous. ",
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
                        children: ["Quelles données personnelles ?"],
                      },
                      {
                        tag: "th",
                        children: ["Pourquoi?"],
                      },
                      {
                        tag: "th",
                        children: ["Base juridique ?"],
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
                              "Identifiant de l'appareil (DID - Identifiant décentralisé)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Une clé publique cryptographique (format did:key) générée et stockée sur votre appareil, puis liée à votre compte utilisateur sur nos serveurs. Les DID servent d'identifiants de session permanents qui connectent votre appareil à votre compte. Les DID sont stockés pour tous les utilisateurs (invité, connexion logicielle et connexion matérielle) afin de maintenir les sessions basées sur l'appareil. ",
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
                              "Connexion logicielle - Vérification des billets d'événement (Zupass)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Lorsque vous effectuez une vérification à l'aide de Zupass, nous stockons un annulateur spécifique à l'événement (identifiant préservant la confidentialité dérivé de votre ticket) et le slug de l'événement. Cela prouve la participation à l’événement sans révéler les détails du billet. La connexion logicielle ne crée PAS de compte enregistré mais permet une vérification basée sur la session qui peut être mise à niveau vers un enregistrement permanent. ",
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
                              "Données d'authentification - Numéro de téléphone",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour authentifier les utilisateurs et fournir des codes de vérification uniques. Les numéros de téléphone sont stockés sous forme de hachage cryptographique dans notre base de données. Twilio (notre fournisseur SMS) traite et stocke les numéros de téléphone en texte clair pour fournir des codes de vérification. La vérification par téléphone crée un compte enregistré permanent. ",
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
                              "Données d'authentification - Passport Zero-Knowledge Proof (Rarimo)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour vérifier l’éligibilité des utilisateurs grâce à une vérification du passeport préservant la confidentialité. Nous stockons un annulateur dérivé du passeport, le code du pays de citoyenneté et le sexe. Agora reçoit uniquement la preuve cryptographique confirmant l'unicité et l'éligibilité, jamais votre numéro de passeport, votre nom, votre photo ou d'autres détails de votre passeport. La vérification du passeport crée un compte enregistré permanent. ",
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
                            children: ["Informations sur le compte"],
                          },
                          " (Nom d'utilisateur, langue préférée, sexe et nationalité (si passeport vérifié)) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour créer et gérer des comptes utilisateur, personnalisez l'expérience utilisateur. Ces données seront regroupées à des fins d'analyse, d'informations et de monétisation. ",
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
                            children: ["Les actions que vous entreprenez"],
                          },
                          " (Messages, Opinions, Réponses, Réactions, sondages) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour faciliter les discussions, les interactions des utilisateurs et l’engagement sur la plateforme. Ces données seront regroupées à des fins d'analyse, d'informations et de monétisation. ",
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
                          " Pour protéger l'infrastructure de la plateforme, prévenir les activités malveillantes et assurer la sécurité opérationnelle (par exemple, protection contre les attaques par déni de service distribué (DDoS)). ",
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
                          " (UUID utilisateur, noms d'utilisateur, métadonnées de demande, journaux d'erreurs, horodatages) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour la surveillance du système, le débogage, l'optimisation des performances et l'amélioration de la fiabilité du service. Nous n'enregistrons PAS les informations personnelles sensibles telles que les numéros de téléphone dans les journaux d'applications. ",
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
                          " (Identité et coordonnées que vous nous avez fournies, le contenu de la communication, les détails techniques de la communication elle-même (par exemple, date et heure) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour permettre la communication entre vous et nous (par exemple lorsque vous nous contactez via les réseaux sociaux, par téléphone ou par e-mail). ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Notre intérêt légitime à pouvoir répondre aux demandes, questions ou commentaires ou à vous contacter de manière proactive pour des questions de toute nature. ",
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
                              "Données personnelles mentionnées ci-dessus.",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour respecter nos obligations légales ou pour se conformer à toute demande raisonnable des autorités policières compétentes, des autorités judiciaires, des institutions ou organismes gouvernementaux, y compris les autorités compétentes en matière de protection des données. ",
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
                              "Données personnelles mentionnées ci-dessus.",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Pour prévenir, détecter et combattre la fraude ou d’autres activités illégales ou non autorisées. ",
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
                              "Données personnelles mentionnées ci-dessus.",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Pour nous défendre devant les tribunaux."],
                      },
                      {
                        tag: "td",
                        children: [
                          " Notre intérêt légitime à utiliser vos données personnelles dans cette procédure. ",
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
                              "Données personnelles mentionnées ci-dessus.",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Informer un tiers dans le cadre d'une éventuelle fusion, acquisition ou scission par ce tiers, même si ce tiers est situé en dehors de l'UE. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Notre intérêt légitime à conclure des transactions commerciales. ",
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
                              "Mise à niveau de compte/fusion de données",
                            ],
                          },
                          " (Contenu utilisateur, appareils, billets d'événement, préférences) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Lorsque vous passez d'une connexion invité ou logicielle à une vérification matérielle (téléphone ou passeport), toutes vos données sont transférées vers votre compte vérifié et votre compte précédent est supprimé. Cela garantit la continuité de votre contenu et de votre historique d’activités tout en ajoutant une vérification permanente. ",
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
                ],
              },
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
              "3. Avec qui partageons-nous vos données personnelles ?",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.1. En principe, nous ne partageons vos données personnelles avec personne d'autre que les personnes qui travaillent pour nous, ainsi qu'avec les fournisseurs qui nous aident à traiter vos données personnelles. Toute personne ayant accès à vos données personnelles sera toujours liée par des obligations légales ou contractuelles strictes pour assurer la sécurité et la confidentialité de vos données personnelles. Cela signifie que seules les catégories de destinataires suivantes recevront vos données personnelles : ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["Vous;"],
              },
              {
                tag: "li",
                children: ["Nos employés et fournisseurs ; et"],
              },
              {
                tag: "li",
                children: [
                  " Autorités gouvernementales ou judiciaires dans la mesure où nous sommes obligés de partager vos données personnelles avec elles (par exemple autorités fiscales, police ou autorités judiciaires). ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. Nous envoyons vos données personnelles en dehors de l'Espace économique européen (EEE) (l'Espace économique européen comprend l'UE, le Liechtenstein, la Norvège et l'Islande). Nous transférerons ces données personnelles en dehors de l'EEE pour communiquer avec les catégories de destinataires de vos données personnelles telles que définies au présent article 3. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. Nous appliquerons des garanties appropriées pour protéger vos données personnelles lors des transferts, par exemple en travaillant uniquement avec des sous-traitants situés dans des pays dotés d'une décision d'adéquation de la Commission européenne ou certifiés dans un cadre approuvé comme l'accord UE-États-Unis. Cadre de confidentialité des données. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. S'il n'y a pas de décision d'adéquation de la Commission européenne pour le pays de destination, nous utiliserons les garanties appropriées, telles que décrites à l'article 46 du RGPD, lors du transfert de données personnelles, et ces transferts et mesures de sécurité techniques et organisationnelles seront documentés conformément à l'article 30 du RGPD. Par exemple, nous utilisons des clauses contractuelles types pour protéger le transfert de données personnelles vers des pays en dehors de l'Espace économique européen (EEE), garantissant ainsi qu'un niveau équivalent de protection des données s'applique à vos données personnelles même si la loi européenne sur la protection des données n'est pas directement applicable. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. Agora peut transférer des données anonymisées et/ou agrégées à des organisations en dehors de la juridiction dans laquelle vous les fournissez. Si un tel transfert a lieu, Agora veillera à ce que des mesures de protection soient en place pour garantir la sécurité et l'intégrité de vos données ainsi que tous les droits concernant vos données personnelles dont vous pourriez bénéficier en vertu de la loi impérative applicable. ",
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
              "4. Combien de temps conservons-nous vos données personnelles ?",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.1. Vos données personnelles ne seront traitées que le temps nécessaire pour atteindre les finalités décrites ci-dessus ou, lorsque nous vous avons demandé votre consentement, jusqu'à ce que vous retiriez votre consentement. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. En règle générale, nous anonymiserons vos données personnelles lorsqu'elles ne seront plus nécessaires aux fins décrites ci-dessus. Toutefois, nous ne pouvons pas supprimer vos données personnelles s’il existe une obligation légale ou réglementaire ou une décision judiciaire ou administrative nous en empêchant. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. Nous conservons toutes les données personnelles collectées via notre site Internet ou notre application mobile, aussi longtemps que nécessaire pour protéger les intérêts légitimes énoncés à l'article 2 ou jusqu'à ce que votre consentement soit retiré. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. Toutes les données personnelles que nous collectons lors de nos interactions avec vous via les réseaux sociaux, le téléphone, le courrier électronique ou d'autres canaux de communication numériques seront conservées aussi longtemps que nécessaire pour communiquer avec vous, mais également pour conserver un historique de nos communications. Cela nous permet de revenir aux communications précédentes lorsque vous revenez vers nous avec de nouvelles questions, demandes, commentaires ou autres commentaires. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. Comment protégeons-nous vos données personnelles ?"],
          },
          {
            tag: "p",
            children: [
              " 5.1. Chez Agora, la protection de vos données personnelles est une priorité absolue. Nous avons mis en œuvre une série de mesures techniques et organisationnelles pour garantir que toutes les données personnelles traitées restent sécurisées. Ces mesures comprennent : ",
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
                    children: [
                      "Minimisation des données et confidentialité dès la conception :",
                    ],
                  },
                  " Nous collectons uniquement le minimum de données personnelles nécessaires au fonctionnement de la plateforme, en évitant autant que possible le stockage d'informations sensibles. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Cryptage et pseudonymisation :"],
                  },
                  " Les données personnelles sont cryptées et des techniques de pseudonymisation sont appliquées pour protéger l'identité des utilisateurs. Par exemple, les numéros de téléphone ne sont jamais stockés en texte brut ; au lieu de cela, nous appliquons un « poivre » cryptographique et les hachons pour empêcher tout accès non autorisé. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "Authentification de preuve sans connaissance :",
                    ],
                  },
                  " Agora utilise des preuves sans connaissance (ZKP) pour la vérification des passeports, garantissant ainsi que les utilisateurs peuvent prouver leur éligibilité sans révéler d'informations personnelles sensibles. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Preuves cryptographiques décentralisées :"],
                  },
                  " Certaines interactions des utilisateurs (telles que la création de compte et la participation) sont publiquement vérifiables grâce à des preuves cryptographiques sans révéler l'identité des utilisateurs. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Authentification sécurisée :"],
                  },
                  " Nous ne stockons pas les mots de passe. Au lieu de cela, l'authentification est gérée via des codes de vérification uniques ou des clés cryptographiques, réduisant ainsi le risque de fuite d'informations d'identification. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Protection des infrastructures :"],
                  },
                  " Notre plateforme est sécurisée contre les cybermenaces grâce à la protection DDoS, aux contrôles d'accès et à la surveillance du réseau pour détecter et atténuer les attaques. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Transparence et contrôle des utilisateurs :"],
                  },
                  " Les utilisateurs ont la possibilité de gérer leurs données personnelles, de supprimer leur compte et de contrôler la manière dont leurs informations sont traitées. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Évaluations de sécurité régulières :"],
                  },
                  " Nos mesures de sécurité sont périodiquement revues et mises à jour pour faire face aux menaces émergentes et améliorer la protection des données. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Accès contrôlé aux journaux et aux analyses :"],
                  },
                  " Seules les données analytiques agrégées et anonymisées sont utilisées pour surveiller les performances et améliorer l'expérience utilisateur. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Redondance et sauvegardes des données :"],
                  },
                  " Les données sont stockées en toute sécurité sur les serveurs AWS à Dublin, en Irlande et répliquées à Paris, en France, à des fins de reprise après sinistre, avec des contrôles d'accès et des mesures de cryptage stricts. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Collecte limitée de métadonnées :"],
                  },
                  " Les journaux des applications Agora n'enregistrent pas délibérément les adresses IP. Les fournisseurs d'infrastructure et de surveillance des erreurs, notamment Cloudflare, les fournisseurs de services cloud et Sentry, peuvent traiter les adresses IP à des fins de sécurité, d'exploitation ou de débogage. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Traduction IA anonymisée :"],
                  },
                  " Le contenu envoyé à Google Cloud Platform pour traduction est transmis tel quel, sans métadonnées associées (identifiants d'utilisateur, etc.) et traité aux États-Unis (région us-central1). Le service de traduction basé sur Google Cloud LLM que nous utilisons n'est actuellement pas disponible dans la région de l'UE. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "Utilisation de ",
                      {
                        tag: "a",
                        children: ["Sentry.io"],
                        href: "https://sentry.io/privacy/",
                        external: true,
                      },
                      " pour les rapports d'erreur à confidentialité réduite :",
                    ],
                  },
                  " Agora utilise Sentry (hébergé sur des serveurs de l'UE) à des fins de suivi des erreurs et de rapport d'accidents. Les sessions de routine ne sont pas téléchargées pour Session Replay ; lorsqu'une erreur se produit, les données d'interaction récentes mises en mémoire tampon peuvent être téléchargées pour aider à diagnostiquer l'échec. La relecture masque le texte et les entrées, bloque les médias, désactive la capture du corps du réseau et masque les attributs de texte et de formulaire configurés avant l'enregistrement. Les événements d'enregistrement personnalisé de navigation et de réseau sont nettoyés et la liste des URL visitées de l'événement Replay est nettoyée avant le téléchargement. Les URL Agora et ZKorum propriétaires peuvent conserver des chemins et des identifiants de route pseudonymes, mais les informations d'identification, les chaînes de requête et les fragments sont supprimés. Les URL externes sont réduites à leurs origines, tandis que les schémas d'URL dangereux sont expurgés. Les événements d'erreur suppriment également les URL de requête et les données supplémentaires arbitraires, conservent uniquement une liste blanche explicite de contextes techniques et omettent le fil d'Ariane de la console et de l'interface utilisateur. Pour un diagnostic de débordement de pile spécifique, une pièce jointe étroitement limitée peut inclure des indicateurs de mise en page structurelle, mais pas l'état OTP, les brouillons, l'état d'intégration, les identifiants ou le contenu généré par l'utilisateur. Les rapports de relecture et d'erreurs peuvent toujours contenir du DOM structurel, des chemins d'itinéraire pseudonymes, des origines de ressources, des métadonnées techniques et d'interaction, et Sentry peut traiter les adresses IP comme décrit dans sa politique de confidentialité. Sentry n'utilise pas de cookies de suivi. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "Journalisation pseudonyme pour la surveillance :",
                    ],
                  },
                  " Agora collecte des données techniques pseudonymes à des fins de surveillance du système, de débogage et d'optimisation des performances. Cela inclut les UUID des utilisateurs, les noms d'utilisateur, les métadonnées des demandes et les journaux d'erreurs. Nous n'enregistrons PAS les informations personnelles sensibles telles que les numéros de téléphone dans nos journaux d'applications. Cependant, les services tiers tels que Twilio, AWS, Cloudflare et autres peuvent conserver des données (y compris les adresses IP et, dans le cas de Twilio, les numéros de téléphone) conformément à leurs propres politiques de confidentialité et calendriers de conservation. ",
                ],
              },
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. Vos droits concernant vos données personnelles"],
          },
          {
            tag: "p",
            children: [
              " 6.1. Lorsque nous collectons et utilisons vos données personnelles, vous bénéficierez d'un certain nombre de droits que vous pourrez exercer de la manière décrite ci-dessous. Veuillez noter que lorsque vous souhaiterez exercer un droit, nous vous demanderons un justificatif d'identité. Nous procédons ainsi pour empêcher une violation de données personnelles (par exemple parce qu'une personne non autorisée usurpe votre identité et exerce un droit en votre nom). ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2. En fonction du traitement et de la base juridique, en tant que personne concernée, vous disposez de plusieurs possibilités pour garder le contrôle de vos données personnelles : ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["droit d'accès à vos données"],
              },
              {
                tag: "li",
                children: ["droit de modifier vos données"],
              },
              {
                tag: "li",
                children: [
                  "droit de vous opposer au traitement de vos données personnelles",
                ],
              },
              {
                tag: "li",
                children: ["droit de restreindre le traitement des données"],
              },
              {
                tag: "li",
                children: ["droit de faire effacer vos données"],
              },
              {
                tag: "li",
                children: [
                  "droit de retirer votre consentement précédemment donné",
                ],
              },
              {
                tag: "li",
                children: ["droit de transférer vos données"],
              },
              {
                tag: "li",
                children: [
                  " droit de déposer une plainte auprès de l’autorité compétente en matière de protection des données. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. Nous attirons votre attention sur le fait que ces droits ne sont pas toujours absolus, que dans certaines circonstances, nous sommes en droit, voire tenus par la loi, de traiter ultérieurement vos données personnelles et que nous pouvons donc ne pas toujours être en mesure de répondre (entièrement) à votre demande. Dans de tels cas, nous vous en informerons en conséquence. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. Vous pouvez exercer ces droits gratuitement, sauf en cas d'abus et auquel cas nous sommes en droit de facturer des frais de dossier pour donner suite à votre demande. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5. Notez que vous pouvez supprimer vos propres réactions, applaudissements, votes positifs/négatifs, réponses à des enquêtes, actions d'accord/désaccord, conversations, opinions, réponses, informations de « points de vue » et la langue parlée (au moins une doit rester). ",
            ],
          },
          {
            tag: "h3",
            children: ["6.6. Dossiers de sécurité :"],
          },
          {
            tag: "p",
            children: [
              " Certains enregistrements de sécurité sont conservés après la suppression du compte pour protéger le service : ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " Hachages de jetons UCAN (User Controlled Authorization Network) de courte durée utilisés pour la protection contre les attaques par relecture ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Ces enregistrements sont conservés uniquement pendant la durée nécessaire pour empêcher la réutilisation des jetons d'autorisation. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. Comment supprimer votre compte :"],
          },
          {
            tag: "p",
            children: [
              " Lorsque vous supprimez votre compte, c'est ",
              {
                tag: "strong",
                children: ["immédiatement inaccessible"],
              },
              " et ne peut pas être récupéré. Le processus de suppression suit cette chronologie : ",
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
                    children: ["Immédiat:"],
                  },
                  " Votre compte est supprimé de manière logicielle et devient inaccessible. Tous les appareils sont déconnectés. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Après 15 jours :"],
                  },
                  " Les données de votre compte sont définitivement supprimées (supprimées définitivement) de notre base de données. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Jusqu'à 30 jours après :"],
                  },
                  " Les données peuvent persister dans des sauvegardes cryptées à des fins de reprise après sinistre. ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["Que se passe-t-il lors de la suppression :"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " Votre compte devient immédiatement inaccessible et ne peut pas être restauré ",
                ],
              },
              {
                tag: "li",
                children: [
                  "Tous les appareils sont déconnectés et votre session est terminée",
                ],
              },
              {
                tag: "li",
                children: [
                  " Vos informations de vérification (numéro de téléphone, preuve de passeport, billets d'événement) sont invalidées ",
                ],
              },
              {
                tag: "li",
                children: [
                  " Votre contenu (posts, votes, avis) reste sur la plateforme mais n'est plus publiquement associé à votre compte ",
                ],
              },
              {
                tag: "li",
                children: [
                  " Après 15 jours, les données de votre compte sont définitivement supprimées de notre base de données ",
                ],
              },
              {
                tag: "li",
                children: [
                  " Les preuves cryptographiques des actions du compte ne sont pas conservées après vérification ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["Conservation des données par des tiers :"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Sauvegardes de base de données :"],
                  },
                  " Les données peuvent persister dans les sauvegardes AWS chiffrées jusqu'à 30 jours après la suppression définitive de 15 jours. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Twilio :"],
                  },
                  " Les enregistrements de vérification téléphonique sont conservés conformément ",
                  {
                    tag: "a",
                    children: ["Politique de confidentialité de Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Services tiers :"],
                  },
                  " Les journaux et les données de Sentry, Cloudflare, AWS et Google Cloud peuvent être conservés conformément à leurs politiques de confidentialité respectives. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["Important:"],
              },
              " La suppression est immédiate et irréversible. Vous ne pouvez pas récupérer votre compte après avoir demandé la suppression. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. Si vous avez une plainte concernant le traitement de vos données personnelles par nos soins, vous pouvez toujours nous contacter à ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". Si vous n'êtes pas satisfait de notre réponse, vous pouvez introduire une réclamation auprès de l'autorité compétente en matière de protection des données, à savoir la Commission nationale de l'informatique et des libertés (",
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
              "7. Informations importantes pour les résidents californiens",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.1. Conformément à la California Consumer Privacy Act de 2018 (« la CCPA »), nous fournissons les détails supplémentaires suivants aux résidents de Californie. Au cours des 12 mois précédents, nous avons collecté, utilisé et partagé les catégories de vos informations personnelles décrites ci-dessus dans cette politique de confidentialité à des fins commerciales opérationnelles. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. Nous n'avons pas vendu vos informations personnelles, ce qui signifie que nous n'avons pas divulgué vos informations personnelles contre une contrepartie monétaire ou autre. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. Vous avez le droit de demander l'accès ou la suppression de vos informations personnelles et de demander la transparence sur nos pratiques de confidentialité. Si vous souhaitez exercer vos droits en vertu du CCPA, veuillez consulter l'article 6. Une fois que nous recevrons votre demande, nous la vérifierons en vous demandant des informations pour confirmer votre identité, notamment en vous demandant des informations supplémentaires. Si vous souhaitez faire appel à un agent enregistré auprès du secrétaire d'État de Californie pour exercer vos droits, nous pouvons demander la preuve que vous avez fourni à cet agent une procuration ou que l'agent dispose d'une autorité écrite valide pour soumettre des demandes d'exercice de droits en votre nom. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. Si vous choisissez d'exercer vos droits, nous ne vous facturerons pas de prix différents ni ne fournirons de services de qualité différente pour exercer vos droits, à moins que ces différences ne soient autorisées par la loi. ",
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
              "8. Modifications de cette politique de confidentialité",
            ],
          },
          {
            tag: "p",
            children: [
              " 8.1. Nous pouvons modifier cette politique de confidentialité de notre propre initiative à tout moment. Si des modifications importantes apportées à cette politique de confidentialité peuvent affecter le traitement de vos données personnelles, nous vous communiquerons ces modifications de la manière dont nous communiquons normalement avec vous (par exemple par e-mail ou via un message sur la plateforme). ",
            ],
          },
          {
            tag: "p",
            children: [
              " 8.2. Nous vous invitons à lire la dernière version de cette politique de confidentialité sur notre site Internet (https://agoracitizen.network/). La politique de confidentialité indique la date à laquelle notre politique de confidentialité a été modifiée pour la dernière fois. ",
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
              " 9.1. Si vous avez d'autres questions sur le traitement de vos données personnelles, n'hésitez pas à contacter notre responsable de la confidentialité. Vous pouvez contacter notre responsable de la confidentialité par e-mail : ",
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
        "מדיניות פרטיות זו תורגמה באופן אוטומטי. הגרסה באנגלית היא הגרסה המוסמכת היחידה, והיא גוברת באופן בלעדי במקרה של אי־התאמה.",
      viewEnglish: "הצגת הגרסה המוסמכת באנגלית",
      returnToTranslation: "חזרה לגרסה המתורגמת",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["עודכן לאחרונה ב"],
          },
          ": 2025/11/11 (YYYY/MM/DD)",
        ],
      },
      {
        tag: "p",
        children: [
          " Agora Citizen Network פותחה על ידי ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          ". אנו ב-ZKorum מאמינים שפרטיות היא זכות יסוד. המשימה שלנו היא להעצים את המשתמשים לעסוק בשיח פוליטי וחברתי תוך שמירה על שליטה על זהותם והמידע האישי שלהם. ",
        ],
      },
      {
        tag: "p",
        children: [
          ' מדיניות פרטיות זו מסבירה כיצד ומדוע Agora Citizen Network ("אגורה", "אנחנו", "אנחנו" או "ZKorum") אוספת, משתמשת ומשתפת מידע אודותיך כאשר אתה משתמש באתר האינטרנט ובאפליקציות הסלולריות שלנו (יחד, "השירותים") או כאשר אתה מקיים איתנו אינטראקציה אחרת. אנו אחראים לאיסוף ולשימוש בנתונים האישיים שלך באופן שמוסבר במדיניות פרטיות זו. ',
        ],
      },
      {
        tag: "p",
        children: [
          " אם יש לך שאלות בנושא, אנא צור איתנו קשר בדואר אלקטרוני: ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". אם אתה תושב קליפורניה, ברצוננו להפנות את תשומת לבך לסעיף 7. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["אגורה היא פלטפורמה ציבורית"],
          },
          {
            tag: "p",
            children: [
              " רוב התוכן באגורה נגיש לציבור, כלומר כל אחד יכול לראות את הפרופיל, הפוסטים, ההצבעות והדעות שלך, אפילו ללא חשבון. ",
            ],
          },
          {
            tag: "p",
            children: [
              " אינך נדרש ליצור חשבון כדי לגלוש באגורה. כדי להשתתף בדיונים וליצור אינטראקציה עם תוכן, אתה יכול: ",
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
                    children: ["דפדף כאורח:"],
                  },
                  " אתה יכול לחקור תוכן ולהשתתף באינטראקציות מוגבלות מבלי להירשם. כאשר אתה מקיים אינטראקציה ראשונה עם הפלטפורמה (למשל, פרסום, הצבעה), מזהה קריפטוגרפי ספציפי למכשיר (DID) נוצר באופן אוטומטי ומאוחסן במכשיר שלך, ולאחר מכן מקושר לחשבון משתמש בשרתים שלנו. DID זה משמש כמזהה הפעלה קבוע עבור המכשיר שלך. חשבונות אורח אינם מאומתים וניתן לגשת אליהם רק מהמכשיר המקורי. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["התחברות רכה (אימות מבוסס הפעלה):"],
                  },
                  " אמת שימוש ",
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " לאימות כרטיסים לאירוע באמצעות הוכחה קבוצתית של אישורים (GPC). זה מוסיף אימות זמני מבוסס-אירועים לחשבון שלך אך אינו יוצר חשבון רשום. התחברות רכה מאפשרת לך להוכיח השתתפות באירוע מבלי לחשוף פרטי כרטיס. אתה יכול לשדרג לחשבון רשום קבוע בכל עת על ידי הוספת אימות טלפון או דרכון. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["כניסה קשה (חשבון רשום קבוע):"],
                  },
                  " צור חשבון מאומת קבוע באחת מהשיטות הבאות: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["מספר טלפון:"],
                          },
                          " מאומת באמצעות קוד חד פעמי שנשלח באמצעות SMS ",
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
                          ": אימות אפס ידע (ZKP) מבוסס דרכון ",
                        ],
                      },
                    ],
                  },
                  " שיטות אלו יוצרות חשבון רשום ומבטיחות שהזהות שלך מאומתת תוך שמירה על פרטיות. אגורה מקבלת רק הוכחות קריפטוגרפיות המאשרות את הייחודיות והזכאות, לעולם לא את מסמכי הזהות הבסיסיים או פרטי הכרטיסים. ",
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
              " כאשר אתה משדרג מכניסה אורחת או רכה לאימות קשיח (טלפון או דרכון), כל התוכן הקיים שלך (פוסטים, הצבעות, עוקבים, אימותי אירועים) מועבר אוטומטית לחשבון המאומת שלך, והחשבון הקודם שלא אומת נמחק. המיזוג הזה הוא קבוע ולא ניתן לבטל אותו. לא ניתן למזג שני חשבונות מאומתים מסיבות אבטחה. ",
            ],
          },
          {
            tag: "p",
            children: [
              " לחשבון Agora שלך יהיה שם משתמש, שניתן לבחור ידנית או ליצור אוטומטית. שמות המשתמש הם ציבוריים אך אינם חייבים להיות מקושרים לזהותך האמיתית. אתה יכול גם לספק פרטי פרופיל אופציונליים כגון נושאים מועדפים, אותם ניתן לשנות או להסיר בכל עת. ",
            ],
          },
          {
            tag: "p",
            children: [
              " רוב התוכן ב-Agora Citizen Network הוא ציבורי. כאשר אתה שולח תוכן (למשל פוסט, דעה או תגובה), הוא גלוי לכל המשתמשים וייתכן שיוסף לאינדקס על ידי מנועי החיפוש. Agora משתמשת גם בהוכחות קריפטוגרפיות כדי לספק אימות נתונים, כלומר אינטראקציות מסוימות (כגון יצירת חשבון והשתתפות) מתועדות באופן מבוזר בפומבי. ",
            ],
          },
          {
            tag: "h3",
            children: ["פרופיל אגורה שלך"],
          },
          {
            tag: "p",
            children: [
              " פרופיל Agora שלך ציבורי כברירת מחדל ומכיל מידע כגון: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["שם משתמש"],
              },
              {
                tag: "li",
                children: ["מזהה משתמש ייחודי (UUID)"],
              },
              {
                tag: "li",
                children: [
                  " היסטוריית פעילויות (פוסטים, דעות, אינטראקציות (אימוג'ים, פעולות מסכים/לא מסכים, מחיאות כפיים, הצבעות למעלה/נגד), תגובות סקר ותוכן מסומן/מדווח ",
                ],
              },
              {
                tag: "li",
                children: ["קהילות ונושאי עניין"],
              },
              {
                tag: "li",
                children: [
                  " סטטוס אימות: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          " מאומת באמצעות הוכחת דרכון (מבטל משתמש והוכחות זהות דו-כיוונית) ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          " מאומת באמצעות מספר טלפון (הוכחה בחתימת אגורה did:keys to user UUID) ",
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
              " למשתמשים יש אפשרות לפרסם באופן אנונימי. בעת שימוש בתכונה זו, שמות משתמש ותמונות פרופיל מוחלפים במזהים גנריים, והתוכן אינו מקושר באופן ציבורי לפרופיל המשתמש. ",
            ],
          },
          {
            tag: "h3",
            children: ["שירותי צד שלישי"],
          },
          {
            tag: "p",
            children: [
              " אגורה משתמשת בשירותי צד שלישי שעשויים לעבד כתובות IP ונתונים אישיים אחרים. במידת האפשר, Agora מגדירה שירותים לשימוש בנקודות קצה אזוריות של האיחוד האירופי או משתמשת בספקים מבוססי האיחוד האירופי. לשירותים אלה יש מדיניות פרטיות משלהם, ומשתמשים מוזמנים לעיין בהם. ",
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
                  " (גלובלי) להוכחות זהות אפס ידע. עשוי לעבד כתובות IP עבור פעולות אבטחה ושירות. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " (עולמי, קוד פתוח) לאימות כרטיסים לאירוע וזהות באמצעות הוכחה קבוצתית של אישורים (GPC). עשוי לעבד כתובות IP עבור פעולות שירות. Zupass משתמש ב-Simple Analytics לניתוח אינטרנט ידידותי לפרטיות. ",
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
                  " (גלובלי) לאימות מספר טלפון. Twilio מאחסן מספרי טלפון בטקסט ברור ומעבד כתובות IP למניעת הונאה. שימו לב שאגורה מאחסנת רק מספרי טלפון מגובבים (לעולם לא בטקסט ברור) במסד הנתונים שלנו, אבל Twilio שומרת על מספרי טלפון בהתאם למדיניות הפרטיות שלהם. ",
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
                  " (גלובלי) להגנת DDoS ואבטחה. מעבד כתובות IP. ",
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
                  " (האיחוד האירופי: דבלין ופריז) לאירוח תשתית, אחסון נתונים ומשאבי מחשוב. מעבד כתובות IP עבור פעולות תשתית. ",
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
                  ' (מבוסס בארה"ב, us-central1 region) לתרגום מופעל בינה מלאכותית של פוסטים של משתמשים ותוכן שנוצר על ידי פלטפורמה. עשוי לעבד כתובות IP עבור פעולות תשתית. ',
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
                  " (מבוסס האיחוד האירופי) לניתוח אינטרנט ידידותי לפרטיות. מעבד באופן זמני כתובות IP לצורך ספירת מבקרים אך אינו שומר אותן (ראה מדיניות הנתונים שלהם לפרטים). ",
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
                  " (שרתי האיחוד האירופי) למעקב אחר שגיאות ודיווח על קריסה. מעבד כתובות IP למטרות ניפוי באגים. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              ' שירותים המסומנים כ"גלובליים" פועלים עם אמצעי הגנה מתאימים של GDPR כמתואר בסעיף 3. משתמשים המודאגים מפרטיות כתובת ה-IP מוזמנים להשתמש ב-Tor או בפתרונות mixnet אחרים בעת גישה לאגורה. ',
            ],
          },
          {
            tag: "h3",
            children: ["קובצי Cookie וניתוח"],
          },
          {
            tag: "p",
            children: [
              " אגורה אינה משתמשת בקובצי Cookie של פרסום או מעקב חוצה אתרים, ואיננו מוכרים נתונים לצורך פרסום. אנו משתמשים ב-Plausible Analytics, שירות ניתוח מבוסס האיחוד האירופי שאינו משתמש בקובצי Cookie, וב-Sentry למטרות מוגבלות של שגיאות וביצועים. לפרטים נוספים, בקר ",
              {
                tag: "a",
                children: ["Plausible Analytics"],
                href: "https://plausible.io/about",
                external: true,
              },
              ". ",
            ],
          },
          {
            tag: "p",
            children: [
              " אנו משתמשים רק בעוגיות הפעלה/אימות, אשר נחוצות בהחלט לתפקוד האתר. ",
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
              "1.1. אנו אוספים ומשתמשים בנתונים האישיים שלך כאשר אתה:",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "השתמש באתר האינטרנט שלנו (https://agoracitizen.network/);",
                ],
              },
              {
                tag: "li",
                children: ["השתמש באפליקציה שלנו לנייד; ו"],
              },
              {
                tag: "li",
                children: [
                  " לתקשר איתנו במייל או בכל ערוץ תקשורת דיגיטלי אחר. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 1.2. מדיניות פרטיות זו עשויה להשתנות כמפורט בסעיף 8. ",
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
              " אנו נעבד את הנתונים האישיים שלך רק למטרה מסוימת ובמידה המותרת על פי חוק. בהמשך נסביר באילו מקרים אנו אוספים ומשתמשים בנתונים האישיים שלך. אם לא נקבל את המידע האישי שלך ישירות ממך, נודיע לך על כך גם בהמשך. ",
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
                        children: ["איזה נתונים אישיים?"],
                      },
                      {
                        tag: "th",
                        children: ["מַדוּעַ?"],
                      },
                      {
                        tag: "th",
                        children: ["בסיס משפטי?"],
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
                            children: ["מזהה מכשיר (DID - מזהה מבוזר)"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " מפתח ציבורי קריפטוגרפי (פורמט did:key) שנוצר ומאוחסן במכשיר שלך, ולאחר מכן מקושר לחשבון המשתמש שלך בשרתים שלנו. מזהי הפעלה קבועים שמחברים את המכשיר שלך לחשבון שלך. מזהי DID מאוחסנים עבור כל המשתמשים (אורח, התחברות רכה והתחברות קשה) כדי לשמור על הפעלות מבוססות מכשירים. ",
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
                              "התחברות רכה - אימות כרטיסים לאירוע (Zupass)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " כאשר אתה מאמת את השימוש ב-Zupass, אנו מאחסנים מבטל ספציפי לאירוע (מזהה שומר פרטיות הנגזר מהכרטיס שלך) ואת שבלול האירוע. זה מוכיח השתתפות באירוע מבלי לחשוף את פרטי הכרטיסים. התחברות רכה אינה יוצרת חשבון רשום אך מאפשרת אימות מבוסס הפעלה שניתן לשדרג לרישום קבוע. ",
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
                            children: ["נתוני אימות - מספר טלפון"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " כדי לאמת משתמשים ולספק קודי אימות חד-פעמיים. מספרי טלפון מאוחסנים כ-hashs קריפטוגרפיים במסד הנתונים שלנו. Twilio (ספק ה-SMS שלנו) מעבד ומאחסן מספרי טלפון בטקסט ברור כדי לספק קודי אימות. אימות טלפוני יוצר חשבון רשום קבוע. ",
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
                              "נתוני אימות - הוכחת דרכון אפס ידע (Rarimo)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " לאמת את זכאות המשתמש באמצעות אימות דרכון לשמירה על הפרטיות. אנו מאחסנים מבטל שמקורו בדרכון, קוד מדינה של אזרחות ומין. אגורה מקבלת רק את ההוכחה ההצפנה המאשרת את הייחודיות והזכאות, לעולם לא את מספר הדרכון, השם, התמונה או פרטי הדרכון האחרים שלך. אימות דרכון יוצר חשבון רשום קבוע. ",
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
                            children: ["פרטי חשבון"],
                          },
                          " (שם משתמש, שפה מועדפת, מין ולאום (אם הדרכון מאומת)) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " כדי ליצור ולנהל חשבונות משתמש, התאם אישית את חוויית המשתמש. נתונים אלה יצטברו למטרות ניתוח, תובנות ומונטיזציה. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["הסכמתך"],
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
                            children: ["פעולות שאתה נוקט"],
                          },
                          " (פוסטים, דעות, תשובות, תגובות, סקרים) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " כדי להקל על דיונים, אינטראקציות עם משתמשים ומעורבות בפלטפורמה. נתונים אלה יצטברו למטרות ניתוח, תובנות ומונטיזציה. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["הסכמתך"],
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
                        children: [
                          " כדי להגן על תשתית הפלטפורמה, למנוע פעילויות זדוניות ולהבטיח אבטחה תפעולית (למשל הגנה מפני התקפות מניעת שירות מבוזרות (DDoS). ",
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
                            children: ["נתונים טכניים בדויים"],
                          },
                          " (זיהוי UUID של משתמש, שמות משתמש, מטא נתונים של בקשה, יומני שגיאות, חותמות זמן) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " לניטור מערכת, איתור באגים, אופטימיזציה של ביצועים ושיפור אמינות השירות. אנו לא רושמים PII רגישים כגון מספרי טלפון ביומני יישומים. ",
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
                            children: ["תִקשׁוֹרֶת"],
                          },
                          " (פרטי זהות ופרטי התקשרות שמסרת לנו, תוכן התקשורת, הפרטים הטכניים של התקשורת עצמה (למשל תאריך ושעה) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " כדי לאפשר תקשורת בינך לבינינו (למשל כאשר אתה יוצר איתנו קשר באמצעות מדיה חברתית, טלפון או דואר אלקטרוני). ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " האינטרס הלגיטימי שלנו להיות מסוגל להגיב לבקשות, שאלות או הערות או ליצור איתך קשר באופן יזום לשאלות מכל סוג שהוא. ",
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
                            children: ["נתונים אישיים הנזכרים לעיל."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " כדי לעמוד בהתחייבויות החוקיות שלנו או להיענות לכל בקשה סבירה מרשויות משטרה מוסמכות, רשויות משפט, מוסדות או גופים ממשלתיים, לרבות רשויות מוסמכות להגנת מידע. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["המחויבות המשפטית שלנו."],
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
                            children: ["נתונים אישיים הנזכרים לעיל."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " כדי למנוע, לזהות ולהילחם בהונאה או פעילויות לא חוקיות או לא מורשות אחרות. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["המחויבות המשפטית שלנו."],
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
                            children: ["נתונים אישיים הנזכרים לעיל."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: ["להגן על עצמנו בהליכים משפטיים."],
                      },
                      {
                        tag: "td",
                        children: [
                          " האינטרס הלגיטימי שלנו להשתמש בנתונים האישיים שלך בהליכים אלה. ",
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
                            children: ["נתונים אישיים הנזכרים לעיל."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " ליידע צד שלישי בהקשר של מיזוג אפשרי עם, רכישה של/על ידי או פיצול על ידי אותו צד שלישי, גם אם אותו צד שלישי נמצא מחוץ לאיחוד האירופי. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " האינטרס הלגיטימי שלנו להיכנס לעסקאות עסקיות. ",
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
                            children: ["שדרוג/מיזוג נתונים של חשבון"],
                          },
                          " (תוכן משתמש, מכשירים, כרטיסים לאירועים, העדפות) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " כאשר אתה משדרג מכניסה אורחת או רכה לאימות קשיח (טלפון או דרכון), כל הנתונים שלך מועברים לחשבון המאומת שלך והחשבון הקודם שלך נמחק. זה מבטיח המשכיות של היסטוריית התוכן והפעילות שלך תוך הוספת אימות קבוע. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["הסכמתך והאינטרס הלגיטימי שלנו."],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["3. עם מי אנו חולקים את הנתונים האישיים שלך?"],
          },
          {
            tag: "p",
            children: [
              " 3.1. באופן עקרוני, איננו חולקים את הנתונים האישיים שלך עם אף אחד מלבד האנשים שעובדים אצלנו, כמו גם עם הספקים שעוזרים לנו לעבד את הנתונים האישיים שלך. כל מי שיש לו גישה לנתונים האישיים שלך תמיד יהיה מחויב להתחייבויות משפטיות או חוזיות קפדניות לשמור על המידע האישי שלך בטוח וסודי. המשמעות היא שרק הקטגוריות הבאות של נמענים יקבלו את הנתונים האישיים שלך: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["אַתָה;"],
              },
              {
                tag: "li",
                children: ["העובדים והספקים שלנו; ו"],
              },
              {
                tag: "li",
                children: [
                  " רשויות ממשלתיות או משפטיות במידה שאנו מחויבים לחלוק עמן את הנתונים האישיים שלך (למשל רשויות מס, משטרה או רשויות משפטיות). ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. אנו שולחים את הנתונים האישיים שלך מחוץ לאזור הכלכלי האירופי (EEA) (האזור הכלכלי האירופי מורכב מהאיחוד האירופי, ליכטנשטיין, נורבגיה ואיסלנד). אנו נעביר נתונים אישיים אלה מחוץ לאזור ה-EEA כדי לתקשר עם קטגוריות הנמענים של הנתונים האישיים שלך כפי שהוגדרו בסעיף 3 זה. ",
            ],
          },
          {
            tag: "p",
            children: [
              ' 3.3. אנו ניישם אמצעי הגנה מתאימים כדי להגן על הנתונים האישיים שלך במהלך העברות, כגון עבודה רק עם מעבדים הממוקמים במדינות שיש להן החלטת הלימה של הנציבות האירופית או שהן מאושרות במסגרת מאושרת כמו האיחוד האירופי-ארה"ב. מסגרת פרטיות נתונים. ',
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. אם אין החלטת הלימה של הנציבות האירופית עבור מדינת היעד, נשתמש באמצעי הגנה מתאימים, כמתואר בסעיף 46 ל-GDPR, בעת העברת נתונים אישיים, והעברות כאלה ואמצעי אבטחה טכניים וארגוניים יתועדו בהתאם לסעיף 30 ל-GDPR. לדוגמה, אנו משתמשים בסעיפים חוזיים סטנדרטיים כדי להגן על העברת נתונים אישיים למדינות מחוץ לאזור הכלכלי האירופי (EEA), ובכך להבטיח שרמה מקבילה של הגנה על נתונים חלה על הנתונים האישיים שלך גם אם חוק הגנת הנתונים של האיחוד האירופי אינו ישים ישירות. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. אגורה עשויה להעביר נתונים אנונימיים ו/או מצטברים לארגונים מחוץ לתחום השיפוט שבו אתה מספק אותם. אם העברה כזו תתבצע, Agora תבטיח שקיימים אמצעי הגנה על מנת להבטיח את הבטיחות והשלמות של הנתונים שלך וכל הזכויות ביחס לנתונים האישיים שלך שאתה עשוי ליהנות מהם על פי החוק המחייב החל. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["4. כמה זמן אנחנו שומרים את הנתונים האישיים שלך?"],
          },
          {
            tag: "p",
            children: [
              " 4.1. הנתונים האישיים שלך יעובדו רק כל עוד הדרוש להשגת המטרות המתוארות לעיל או, כאשר ביקשנו ממך את הסכמתך, עד שתבטל את הסכמתך. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. ככלל, אנו נבטל את זיהוי הנתונים האישיים שלך כאשר הם אינם נחוצים עוד למטרות המתוארות לעיל. עם זאת, איננו יכולים למחוק את הנתונים האישיים שלך אם קיימת חובה משפטית או רגולטורית או צו בית משפט או מנהלי המונעים מאיתנו לעשות זאת. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. אנו שומרים את כל הנתונים האישיים שנאספו דרך האתר או האפליקציה הסלולרית שלנו, כל עוד נחוץ כדי להגן על האינטרסים הלגיטימיים המצוינים בסעיף 2 או עד לביטול הסכמתך. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. כל הנתונים האישיים שאנו אוספים באמצעות האינטראקציות שלנו איתך באמצעות מדיה חברתית, טלפון, דואר אלקטרוני או ערוצי תקשורת דיגיטליים אחרים יישמרו כל עוד נחוץ כדי לתקשר איתך, אך גם כדי לשמור על תיעוד היסטורי של התקשורת שלנו. זה מאפשר לנו לחזור לתקשורת קודמת כאשר אתה חוזר אלינו עם שאלות חדשות, בקשות, הערות או קלט אחר. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. כיצד אנו שומרים על אבטחת המידע האישי שלך?"],
          },
          {
            tag: "p",
            children: [
              " 5.1. ב-Agora, שמירה על הנתונים האישיים שלך היא בראש סדר העדיפויות. יישמנו מגוון אמצעים טכניים וארגוניים כדי להבטיח שכל הנתונים האישיים המעובדים יישארו מאובטחים. אמצעים אלה כוללים: ",
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
                    children: ["מזעור נתונים ופרטיות לפי תכנון:"],
                  },
                  " אנו אוספים רק את הנתונים האישיים המינימליים הדרושים לפונקציונליות הפלטפורמה, תוך הימנעות מאחסנת מידע רגיש במידת האפשר. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["הצפנה ופסאודונימיזציה:"],
                  },
                  ' נתונים אישיים מוצפנים, וטכניקות פסאודונימיזציה מיושמות כדי להגן על זהויות המשתמש. לדוגמה, מספרי טלפון לעולם אינם מאוחסנים בטקסט רגיל; במקום זאת, אנו מיישמים "פלפל" קריפטוגרפי ומקשקשים אותם כדי למנוע גישה לא מורשית. ',
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["אימות הוכחה אפס ידע:"],
                  },
                  " אגורה ממנפת הוכחות אפס ידע (ZKP) לאימות דרכון, ומבטיחה שמשתמשים יכולים להוכיח את זכאותם מבלי לחשוף מידע אישי רגיש. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["הוכחות קריפטוגרפיות מבוזרות:"],
                  },
                  " אינטראקציות מסוימות של משתמשים (כגון יצירת חשבון והשתתפות) ניתנות לאימות פומבית באמצעות הוכחות קריפטוגרפיות מבלי לחשוף את זהויות המשתמש. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["אימות מאובטח:"],
                  },
                  " אנחנו לא שומרים סיסמאות. במקום זאת, האימות מטופל באמצעות קודי אימות חד-פעמיים או מפתחות קריפטוגרפיים, מה שמפחית את הסיכון לדליפות אישורים. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["הגנה על תשתית:"],
                  },
                  " הפלטפורמה שלנו מאובטחת מפני איומי סייבר באמצעות הגנת DDoS, בקרות גישה וניטור רשת כדי לזהות ולהפחית התקפות. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["שקיפות ובקרת משתמש:"],
                  },
                  " למשתמשים יש את היכולת לנהל את הנתונים האישיים שלהם, למחוק את חשבונם ולשלוט על אופן עיבוד המידע שלהם. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["הערכות אבטחה רגילות:"],
                  },
                  " אמצעי האבטחה שלנו נבדקים ומתעדכנים מעת לעת כדי להתמודד עם איומים מתעוררים ולשפר את הגנת הנתונים. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["גישה מבוקרת ליומנים וניתוחים:"],
                  },
                  " רק נתוני ניתוח מצטברים ואנונימיים משמשים לניטור ביצועים ולשיפור חווית המשתמש. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["יתירות נתונים וגיבויים:"],
                  },
                  " הנתונים מאוחסנים בצורה מאובטחת בשרתי AWS בדבלין, אירלנד ומשוכפלים בפריז, צרפת למטרות התאוששות מאסון, עם בקרות גישה קפדניות ואמצעי הצפנה. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["איסוף מטא נתונים מוגבל:"],
                  },
                  " יומני יישומי Agora אינם מתעדים בכוונה כתובות IP. ספקי ניטור תשתיות וטעויות, כולל Cloudflare, ספקי שירותי ענן ו-Sentry, עשויים לעבד כתובות IP לצורך אבטחה, תפעול או ניפוי באגים. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["תרגום AI אנונימי:"],
                  },
                  " תוכן שנשלח ל-Google Cloud Platform לתרגום מועבר כפי שהוא ללא כל מטא-נתונים נלווים (מזהי משתמשים וכו') ומעובד בארה\"ב (אזור us-central1). שירות התרגום מבוסס Google Cloud LLM שאנו משתמשים בו אינו זמין כעת באזור האיחוד האירופי. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "שימוש ב ",
                      {
                        tag: "a",
                        children: ["Sentry.io"],
                        href: "https://sentry.io/privacy/",
                        external: true,
                      },
                      " עבור דוחות קריסה מופחתים בפרטיות:",
                    ],
                  },
                  " Agora משתמשת ב- Sentry (מתארח בשרתי האיחוד האירופי) למטרות מעקב שגיאות ודיווח על קריסה. הפעלות שגרתיות אינן מועלות עבור סשן חוזר; כאשר מתרחשת שגיאה, ייתכן שיועלו נתוני אינטראקציה אחרונים מאוחסנים כדי לסייע באבחון הכשל. הפעלה חוזרת מסווה טקסט וקלט, חוסמת מדיה, משביתה לכידת גוף ברשת ומסווה תכונות טקסט וטופס מוגדרות לפני ההקלטה. אירועי ניווט והקלטת רשת מותאמים אישית נסרקים, ורשימת כתובות ה-URL של האירוע החוזר עוברת חיטוי לפני ההעלאה. כתובות URL של צד ראשון של Agora ו-ZKorum עשויות לשמור על נתיבים ומזהי נתיב בדוי, אך אישורים, מחרוזות שאילתות ושברים יוסרו. כתובות אתרים חיצוניות מצטמצמות למקורן, בעוד שסכימות כתובות לא בטוחות נמחקות. אירועי שגיאה מסירים גם כתובות אתרים של בקשה ונתונים נוספים שרירותיים, שומרים רק רשימת הרשאות מפורשת של הקשרים טכניים ומשמיטים פירורי לחם של המסוף והממשק. עבור אבחון ספציפי אחד של הצפת מחסנית, קובץ מצורף מצומצם עשוי לכלול דגלים מבניים של פריסת עמוד אך לא מצב OTP, טיוטות, מצב הצטרפות, מזהים או תוכן שנוצר על ידי משתמשים. דוחות הפעלה חוזרים ושגיאות עדיין יכולים להכיל DOM מבני, נתיבי נתיב בדוי, מקורות משאבים, מטא נתונים טכניים ואינטראקציות, ו- Sentry עשוי לעבד כתובות IP כמתואר במדיניות הפרטיות שלה. Sentry אינו משתמש בעוגיות מעקב. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["רישום בדוי לניטור:"],
                  },
                  " Agora אוספת נתונים טכניים בדויים למטרות ניטור מערכת, ניפוי באגים ואופטימיזציה של ביצועים. זה כולל מזהי UUID של משתמשים, שמות משתמש, מטא נתונים של בקשות ויומני שגיאות. אנו לא רושמים PII רגישים כגון מספרי טלפון ביומני היישומים שלנו. עם זאת, שירותי צד שלישי כמו Twilio, AWS, Cloudflare ואחרים עשויים לשמור נתונים (כולל כתובות IP ובמקרה של Twilio, מספרי טלפון) בהתאם למדיניות הפרטיות ולוחות הזמנים של השמירה שלהם. ",
                ],
              },
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. הזכויות שלך לגבי הנתונים האישיים שלך"],
          },
          {
            tag: "p",
            children: [
              " 6.1. כאשר אנו אוספים ומשתמשים בנתונים האישיים שלך, אתה תהנה ממספר זכויות שתוכל לממש באופן המתואר להלן. שימו לב שכאשר תרצו לממש זכות, נבקש מכם הוכחת זהות. אנו עושים זאת כדי למנוע הפרת מידע אישי (למשל בגלל שאדם לא מורשה מתחזה אליך ומפעיל זכות בשמך). ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2. בהתאם לעיבוד ולבסיס המשפטי, כנושא מידע יש לך מספר אפשרויות לשמור על שליטה על הנתונים האישיים שלך: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["הזכות לגשת לנתונים שלך"],
              },
              {
                tag: "li",
                children: ["הזכות לתקן את הנתונים שלך"],
              },
              {
                tag: "li",
                children: ["הזכות להתנגד לעיבוד הנתונים האישיים שלך"],
              },
              {
                tag: "li",
                children: ["הזכות להגביל את עיבוד הנתונים"],
              },
              {
                tag: "li",
                children: ["הזכות למחוק את הנתונים שלך"],
              },
              {
                tag: "li",
                children: ["הזכות לבטל את הסכמתך שניתנה קודם לכן"],
              },
              {
                tag: "li",
                children: ["הזכות להעביר את הנתונים שלך"],
              },
              {
                tag: "li",
                children: [" הזכות להגיש תלונות לרשות המוסמכת להגנת המידע. "],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. עלינו לציין בפניך כי זכויות אלו אינן תמיד מוחלטות, כי בנסיבות מסוימות אנו זכאים או אף נדרשים על פי חוק להמשיך ולעבד את הנתונים האישיים שלך וכי לא תמיד נוכל להיענות (באופן מלא) לבקשתך. במקרים כאלה, נודיע לך בהתאם. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. אתה רשאי לממש זכויות אלה ללא תשלום, למעט מקרים של שימוש לרעה ובמקרה זה אנו זכאים לגבות דמי ניהול כדי להיענות לבקשתך. ",
            ],
          },
          {
            tag: "p",
            children: [
              ' 6.5. שימו לב שאתם יכולים למחוק את התגובות שלכם, מחיאות כפיים, להצביע למעלה/להצביע למטה, תגובות סקר, פעולות הסכמה/לא מסכים, שיחות, דעות, תשובות, מידע "צפיות" ואת השפה המדוברת (לפחות אחד חייב להישאר). ',
            ],
          },
          {
            tag: "h3",
            children: ["6.6. רישומי אבטחה:"],
          },
          {
            tag: "p",
            children: [
              " כמה רשומות אבטחה נשמרות לאחר מחיקת החשבון כדי להגן על השירות: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " גיבוב אסימון של רשתות הרשאות משתמש (UCAN) קצרות מועד המשמשות להגנה מפני התקפות חוזרות ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " רשומות אלה נשמרות רק למשך הזמן הדרוש כדי למנוע שימוש חוזר באסימוני הרשאה. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. כיצד למחוק את החשבון שלך:"],
          },
          {
            tag: "p",
            children: [
              " כאשר אתה מוחק את החשבון שלך, זה כן ",
              {
                tag: "strong",
                children: ["בלתי נגיש באופן מיידי"],
              },
              " ואי אפשר לשחזר. תהליך המחיקה פועל לפי ציר הזמן הזה: ",
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
                    children: ["מִיָדִי:"],
                  },
                  " החשבון שלך נמחק בצורה רכה והופך לבלתי נגיש. כל המכשירים מנותקים. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["לאחר 15 ימים:"],
                  },
                  " נתוני החשבון שלך נמחקים לצמיתות (מחיקה קשה) ממסד הנתונים שלנו. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["עד 30 ימים לאחר מכן:"],
                  },
                  " הנתונים עשויים להימשך בגיבויים מוצפנים למטרות התאוששות מאסון. ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["מה קורה עם המחיקה:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " החשבון שלך הופך לבלתי נגיש באופן מיידי ולא ניתן לשחזר אותו ",
                ],
              },
              {
                tag: "li",
                children: ["כל המכשירים מנותקים וההפעלה שלך מופסקת"],
              },
              {
                tag: "li",
                children: [
                  " אישורי האימות שלך (מספר טלפון, הוכחת דרכון, כרטיסים לאירוע) אינם חוקיים ",
                ],
              },
              {
                tag: "li",
                children: [
                  " התוכן שלך (פוסטים, הצבעות, דעות) נשאר בפלטפורמה אך אינו משויך עוד באופן ציבורי לחשבונך ",
                ],
              },
              {
                tag: "li",
                children: [
                  " לאחר 15 ימים, נתוני החשבון שלך יוסרו לצמיתות ממסד הנתונים שלנו ",
                ],
              },
              {
                tag: "li",
                children: [
                  " הוכחות קריפטוגרפיות לפעולות בחשבון אינן נשמרות לאחר האימות ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["שמירת נתונים של צד שלישי:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["גיבויים למסד נתונים:"],
                  },
                  " הנתונים עשויים להישאר בגיבויים מוצפנים של AWS עד 30 יום לאחר המחיקה הקשה של 15 יום ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["טוויליו:"],
                  },
                  " רישומי האימות הטלפוני נשמרים בהתאם ",
                  {
                    tag: "a",
                    children: ["מדיניות הפרטיות של Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["שירותי צד שלישי:"],
                  },
                  " יומנים ונתונים ב-Sentry, Cloudflare, AWS ו-Google Cloud עשויים להישמר בהתאם למדיניות הפרטיות שלהם. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["חָשׁוּב:"],
              },
              " המחיקה היא מיידית ובלתי הפיכה. לא תוכל לשחזר את חשבונך לאחר בקשת המחיקה. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. אם יש לך תלונה על עיבוד הנתונים האישיים שלך על ידינו, אתה תמיד יכול לפנות אלינו בכתובת ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". אם אינך מרוצה מהתגובה שלנו, תוכל להגיש תלונה לרשות המוסמכת להגנה על מידע, כלומר הנציבות הצרפתית הלאומית ל'אינפורמטיקה וחופשיות (",
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
              ' 7.1. בהתאם לחוק הפרטיות לצרכן בקליפורניה משנת 2018 ("ה-CCPA"), אנו מספקים את הפרטים הנוספים הבאים לתושבי קליפורניה. במהלך 12 החודשים הקודמים, אספנו, השתמשנו ושיתפנו את הקטגוריות של המידע האישי שלך המתוארות לעיל במדיניות פרטיות זו למטרות העסקיות התפעוליות שלנו. ',
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. לא מכרנו את המידע האישי שלך, כלומר לא חשפנו את המידע האישי שלך בתמורה כספית או אחרת בעלת ערך. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. יש לך את הזכות לבקש גישה או מחיקה של המידע האישי שלך ולבקש שקיפות לגבי נוהלי הפרטיות שלנו. אם ברצונך לממש את זכויותיך במסגרת ה-CCPA, אנא עיין בסעיף 6. לאחר שנקבל את בקשתך, נאמת אותה על ידי בקשת מידע לאישור זהותך, לרבות על ידי בקשה ממך למידע נוסף. אם תרצה להשתמש בסוכן הרשום אצל מזכיר המדינה של קליפורניה כדי לממש את זכויותיך, אנו עשויים לבקש הוכחה לכך שסיפקת לסוכן כזה ייפוי כוח או שלסוכן יש סמכות כתובה תקפה אחרת להגיש בקשות למימוש זכויות בשמך. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. אם תבחר לממש את זכויותיך, לא נגבה ממך מחירים שונים או נספק שירותים באיכות שונה למימוש זכויותיך, אלא אם הבדלים אלו מותרים על פי חוק. ",
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
              " 8.1. אנו יכולים לשנות את מדיניות הפרטיות הזו מיוזמתנו בכל עת. אם שינויים מהותיים במדיניות פרטיות זו עשויים להשפיע על עיבוד הנתונים האישיים שלך, אנו נעביר אליך את השינויים הללו באופן שבו אנו מתקשרים איתך בדרך כלל (למשל באמצעות דואר אלקטרוני או באמצעות הודעה בפלטפורמה). ",
            ],
          },
          {
            tag: "p",
            children: [
              " 8.2. אנו מזמינים אותך לקרוא את הגרסה העדכנית ביותר של מדיניות פרטיות זו באתר האינטרנט שלנו (https://agoracitizen.network/). מדיניות הפרטיות מציינת את התאריך האחרון שמדיניות הפרטיות שלנו השתנתה. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. יש לך שאלות?"],
          },
          {
            tag: "p",
            children: [
              " 9.1. אם יש לך שאלות נוספות לגבי עיבוד הנתונים האישיים שלך, אנא אל תהסס לפנות למנהל הפרטיות שלנו. ניתן ליצור קשר עם מנהל הפרטיות שלנו במייל: ",
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
        "このプライバシーポリシーは自動翻訳されています。英語版のみが正式な版であり、内容に相違がある場合は英語版が専ら優先されます。",
      viewEnglish: "正式な英語版を表示",
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
          ": 2025/11/11 (YYYY/MM/DD)",
        ],
      },
      {
        tag: "p",
        children: [
          " アゴラ市民ネットワークは以下によって開発されました。 ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          "。 ZKorum では、プライバシーは基本的な権利であると信じています。私たちの使命は、ユーザーが自分の身元情報や個人情報を管理しながら、政治的および社会的な議論に参加できるようにすることです。 ",
        ],
      },
      {
        tag: "p",
        children: [
          " このプライバシー ポリシーは、お客様が当社の Web サイトおよびモバイル アプリケーション (総称して「サービス」) を使用するとき、またはその他の方法で当社とやり取りするときに、Agora Citizen Network (「Agora」、「当社」、「当社」、または「ZKorum」) がお客様に関する情報を収集、使用、および共有する方法とその理由について説明します。当社は、このプライバシー ポリシーで説明されている方法でお客様の個人データを収集および使用することに責任を負います。 ",
        ],
      },
      {
        tag: "p",
        children: [
          " これについてご質問がある場合は、電子メールでお問い合わせください。 ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          "。あなたがカリフォルニア州在住の場合、第 7 条に注目していただきたいと思います。 ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["アゴラは公共プラットフォームです"],
          },
          {
            tag: "p",
            children: [
              " Agora のほとんどのコンテンツは公開されており、アカウントがなくても、あなたのプロフィール、投稿、投票、意見を誰でも閲覧できます。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " Agora を閲覧するためにアカウントを作成する必要はありません。ディスカッションに参加してコンテンツを操作するには、次のことができます。 ",
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
                    children: ["ゲストとして閲覧:"],
                  },
                  " 登録しなくても、コンテンツを探索したり、限られたインタラクションに参加したりできます。初めてプラットフォームと対話するとき (投稿、投票など)、デバイス固有の暗号識別子 (DID) が自動的に生成されてデバイスに保存され、当社のサーバー上のユーザー アカウントにリンクされます。この DID は、デバイスの永続的なセッション ID として機能します。ゲスト アカウントは検証されず、元のデバイスからのみアクセスできます。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["ソフト ログイン (セッションベースの検証):"],
                  },
                  " を使用して検証する ",
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " Group Proof of Credentials (GPC) を使用したイベント チケット検証用。これにより、アカウントに一時的なイベントベースの検証が追加されますが、登録済みアカウントは作成されません。ソフト ログインを使用すると、チケットの詳細を明かさずにイベントへの参加を証明できます。電話またはパスポートによる認証を追加することで、いつでも永久登録アカウントにアップグレードできます。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["ハード ログイン (永久登録アカウント):"],
                  },
                  " 次のいずれかの方法を使用して、永続的な認証済みアカウントを作成します。 ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["電話番号:"],
                          },
                          " SMS 経由で送信されたワンタイム コードによって認証される ",
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
                          ": パスポートベースのゼロ知識証明 (ZKP) 検証 ",
                        ],
                      },
                    ],
                  },
                  " これらの方法では、登録済みアカウントが作成され、プライバシーを維持しながら ID が確実に検証されます。 Agora は、一意性と適格性を確認する暗号証明のみを受け取り、基礎となる身分証明書やチケット情報は決して受け取りません。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["アカウントのアップグレード:"],
              },
              " ゲストまたはソフト ログインからハード認証 (電話またはパスポート) にアップグレードすると、既存のすべてのコンテンツ (投稿、投票、フォロー、イベント認証) が認証済みアカウントに自動的に転送され、以前の未認証アカウントは削除されます。このマージは永続的であり、元に戻すことはできません。セキュリティ上の理由から、2 つの認証済みアカウントを結合することはできません。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " Agora アカウントにはユーザー名があり、手動で選択することも、自動生成することもできます。ユーザー名は公開されますが、実際の身元とリンクする必要はありません。また、いつでも変更または削除できる、優先トピックなどのオプションのプロファイル詳細を提供することもできます。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " Agora Citizen Network のほとんどのコンテンツは公開されています。コンテンツ (投稿、意見、反応など) を送信すると、すべてのユーザーに表示され、検索エンジンによってインデックスに登録される場合があります。また、Agora は暗号証明を利用してデータの検証可能性を提供します。これは、特定のインタラクション (アカウントの作成や参加など) が分散型の方法で公的に記録されることを意味します。 ",
            ],
          },
          {
            tag: "h3",
            children: ["アゴラのプロフィール"],
          },
          {
            tag: "p",
            children: [
              " Agora プロフィールはデフォルトで公開されており、次のような情報が含まれています。 ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["ユーザー名"],
              },
              {
                tag: "li",
                children: ["固有のユーザー識別子 (UUID)"],
              },
              {
                tag: "li",
                children: [
                  " アクティビティ履歴（投稿、意見、インタラクション（絵文字、同意/反対アクション、拍手、賛成票/反対票）、アンケート回答、フラグ付き/報告されたコンテンツ ",
                ],
              },
              {
                tag: "li",
                children: ["コミュニティと興味のあるトピック"],
              },
              {
                tag: "li",
                children: [
                  " 検証ステータス: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          " パスポート証明 (ユーザー無効化および双方向 ID 証明) によって検証されます。 ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          " 電話番号経由で検証済み (Agora 署名済みの証明バインディングがユーザー UUID に行われた: キー) ",
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
              " ユーザーには匿名で投稿するオプションがあります。この機能を使用すると、ユーザー名とプロフィール写真は一般的な識別子に置き換えられ、コンテンツはユーザーのプロフィールに公開的にリンクされません。 ",
            ],
          },
          {
            tag: "h3",
            children: ["サードパーティのサービス"],
          },
          {
            tag: "p",
            children: [
              " Agora は、IP アドレスやその他の個人データを処理するサードパーティのサービスを使用します。可能な場合、Agora は EU 地域のエンドポイントを使用するか、EU ベースのプロバイダーを使用するようにサービスを構成します。これらのサービスには独自のプライバシー ポリシーがあり、ユーザーはそれらを確認することが推奨されます。 ",
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
                  " (グローバル) ゼロ知識 ID 証明用。セキュリティおよびサービス操作のために IP アドレスを処理する場合があります。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " Group Proof of Credentials (GPC) を使用したイベント チケットと ID 検証用 (グローバル、オープンソース)。サービス操作のために IP アドレスを処理する場合があります。 Zupass は、プライバシーに配慮した Web 分析のために Simple Analytics を使用しています。 ",
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
                  " (グローバル) 電話番号認証用。 Twilio は電話番号を平文で保存し、詐欺防止のために IP アドレスを処理します。 Agora はハッシュ化された電話番号のみを (決して平文で) データベースに保存しますが、Twilio は独自のプライバシー ポリシーに従って電話番号を保持することに注意してください。 ",
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
                  " (グローバル) DDoS 保護とセキュリティ用。 IP アドレスを処理します。 ",
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
                  " (EU: ダブリンとパリ) ホスティング インフラストラクチャ、データ ストレージ、コンピューティング リソース用。インフラストラクチャ操作のために IP アドレスを処理します。 ",
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
                  " (米国に拠点を置き、us-central1 リージョン) ユーザーの投稿とプラットフォームで生成されたコンテンツの AI を利用した翻訳。インフラストラクチャ操作のために IP アドレスを処理する場合があります。 ",
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
                  " (EU ベース) プライバシーに配慮した Web 分析を実現します。訪問者カウントのために IP アドレスを一時的に処理しますが、保存しません (詳細については、データ ポリシーを参照してください)。 ",
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
                  " (EU サーバー) エラー追跡とクラッシュレポート用。デバッグ目的で IP アドレスを処理します。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 「グローバル」とマークされたサービスは、第 3 条で説明されているように、適切な GDPR 保護策を講じて動作します。IP アドレスのプライバシーを懸念するユーザーは、Agora にアクセスするときに Tor またはその他のミックスネット ソリューションを使用することをお勧めします。 ",
            ],
          },
          {
            tag: "h3",
            children: ["クッキーと分析"],
          },
          {
            tag: "p",
            children: [
              " Agora は広告やクロスサイト トラッキング Cookie を使用せず、広告用のデータも販売しません。当社では、Cookie を使用しない EU ベースの分析サービスである Plausible Analytics と、限定的なエラーとパフォーマンスのテレメトリのために Sentry を使用しています。詳細については、次のサイトをご覧ください。 ",
              {
                tag: "a",
                children: ["Plausible Analytics"],
                href: "https://plausible.io/about",
                external: true,
              },
              "。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 当社は、Web サイトの機能に厳密に必要なセッション/認証 Cookie のみを使用します。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["1. このプライバシー ポリシーはいつ適用されますか?"],
          },
          {
            tag: "p",
            children: ["1.1.当社は次の場合に個人データを収集して使用します。"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "当社のウェブサイト (https://agoracitizen.network/) を使用してください。",
                ],
              },
              {
                tag: "li",
                children: ["モバイルアプリを使用してください。そして"],
              },
              {
                tag: "li",
                children: [
                  " 電子メールまたはその他のデジタル通信チャネルを通じて当社と通信します。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 1.2.このプライバシーポリシーは、第8条に定めるとおり修正される場合があります。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. 当社が処理する個人データとその理由は何ですか?"],
          },
          {
            tag: "p",
            children: [
              " 当社は、特定の目的のために、法律で認められる範囲でのみお客様の個人データを処理します。当社がお客様の個人データを収集および使用する場合については、以下でさらに説明します。当社がお客様から個人データを直接受け取らない場合には、以下でその旨をお知らせします。 ",
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
                        children: ["どのような個人データですか?"],
                      },
                      {
                        tag: "th",
                        children: ["なぜ？"],
                      },
                      {
                        tag: "th",
                        children: ["法的根拠は？"],
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
                            children: ["デバイス識別子 (DID - 分散型識別子)"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 暗号化公開キー (did:key 形式) が生成され、デバイスに保存され、当社のサーバー上のユーザー アカウントにリンクされます。 DID は、デバイスをアカウントに接続する永続的なセッション ID として機能します。 DID は、デバイスベースのセッションを維持するために、すべてのユーザー (ゲスト、ソフト ログイン、およびハード ログイン) に対して保存されます。 ",
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
                              "ソフトログイン - イベントチケット検証 (Zupass)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Zupass を使用して検証すると、イベント固有のヌルファイア (チケットから派生したプライバシー保護識別子) とイベント スラッグが保存されます。これは、チケットの詳細を明かさずにイベントに参加したことを証明します。ソフト ログインでは登録済みアカウントは作成されませんが、永続的な登録にアップグレードできるセッション ベースの検証が可能になります。 ",
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
                            children: ["認証データ - 電話番号"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " ユーザーを認証し、ワンタイム認証コードを配信するため。電話番号は暗号化ハッシュとしてデータベースに保存されます。 Twilio (SMS プロバイダー) は、電話番号をクリアテキストで処理して保存し、確認コードを配信します。電話認証により、永久的な登録アカウントが作成されます。 ",
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
                              "認証データ - パスポートゼロ知識証明 (Rarimo)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " プライバシーを保護したパスポート認証を通じてユーザーの適格性を確認するため。パスポート由来の無効化子、国籍国コード、性別を保存します。 Agora は、一意性と適格性を確認する暗号証明のみを受け取り、パスポート番号、名前、写真、その他のパスポートの詳細は決して受け取りません。パスポートの検証により、永久的な登録アカウントが作成されます。 ",
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
                          " (ユーザー名、優先言語、性別、国籍 (パスポートが認証されている場合)) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " ユーザー アカウントを作成および管理するには、ユーザー エクスペリエンスをカスタマイズします。このデータは、分析、洞察、収益化を目的として集約されます。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["あなたの同意"],
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
                            children: ["あなたがとる行動"],
                          },
                          " （投稿、意見、返信、反応、アンケート） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " プラットフォーム上でのディスカッション、ユーザーの対話、エンゲージメントを促進するため。このデータは、分析、洞察、収益化を目的として集約されます。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["あなたの同意"],
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
                        children: [
                          " プラットフォーム インフラストラクチャを保護し、悪意のあるアクティビティを防止し、運用上のセキュリティを確保します (例: 分散型サービス拒否 (DDoS) 攻撃に対する保護)。 ",
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
                            children: ["仮名技術データ"],
                          },
                          " (ユーザー UUID、ユーザー名、リクエスト メタデータ、エラー ログ、タイムスタンプ) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " システムの監視、デバッグ、パフォーマンスの最適化、サービスの信頼性の向上のため。電話番号などの機密 PII はアプリケーション ログに記録されません。 ",
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
                            children: ["コミュニケーション"],
                          },
                          " (お客様が当社に提供した身元情報と連絡先の詳細、通信の内容、通信自体の技術的な詳細 (日時など) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " お客様と当社との間のコミュニケーションを可能にするため (例: ソーシャルメディア、電話、または電子メールを介して当社に連絡する場合)。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " リクエスト、質問、コメントに対応すること、またはあらゆる種類の質問について積極的にお客様に連絡することに対する当社の正当な利益。 ",
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
                            children: ["上記の個人データ。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 当社の法的義務を遵守するため、または管轄の警察当局、司法当局、政府機関または団体（管轄のデータ保護当局を含む）からの合理的な要求に従うため。 ",
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
                          " 詐欺やその他の違法または無許可の活動を防止、検出し、これに対抗するため。 ",
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
                        children: ["法的手続きにおいて自分自身を守るため。"],
                      },
                      {
                        tag: "td",
                        children: [
                          " これらの手続きにおいてお客様の個人データを使用することに対する当社の正当な利益。 ",
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
                            children: ["上記の個人データ。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 第三者が EU 域外に所在する場合でも、第三者との合併、第三者による買収、または第三者による分割の可能性を通知するため。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 商取引を行うことに対する当社の正当な利益。 ",
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
                              "アカウントのアップグレード/データの統合",
                            ],
                          },
                          " (ユーザーコンテンツ、デバイス、イベントチケット、設定) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " ゲストまたはソフト ログインからハード認証 (電話またはパスポート) にアップグレードすると、すべてのデータが認証済みアカウントに転送され、以前のアカウントは削除されます。これにより、永続的な検証を追加しながら、コンテンツとアクティビティ履歴の継続性が保証されます。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["お客様の同意と当社の正当な利益。"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["3. あなたの個人データを誰と共有しますか?"],
          },
          {
            tag: "p",
            children: [
              " 3.1.原則として、当社は、お客様の個人データを、当社で働く者以外の誰とも共有することはありません。また、お客様の個人データの処理を支援するサプライヤーとも共有しません。あなたの個人データにアクセスできる人は、常にあなたの個人データを安全かつ機密に保つための厳格な法的義務または契約上の義務に拘束されます。これは、次のカテゴリの受信者のみがあなたの個人データを受け取ることを意味します。 ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["あなた;"],
              },
              {
                tag: "li",
                children: ["当社の従業員とサプライヤー。そして"],
              },
              {
                tag: "li",
                children: [
                  " 弊社がお客様の個人データを共有する義務がある範囲で、政府または司法当局 (税務当局、警察、司法当局など)。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2.当社はお客様の個人データを欧州経済領域 (EEA) 外に送信します (欧州経済領域は EU、リヒテンシュタイン、ノルウェー、アイスランドで構成されます)。当社は、この第 3 条で定義されている個人データの受信者のカテゴリーと通信するために、この個人データを EEA の外に転送します。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3.当社は、欧州委員会の十分性に関する決定を行っている国、または EU-米国のような承認された枠組みに基づいて認定されている国の処理業者とのみ連携するなど、転送中にお客様の個人データを保護するための適切な保護措置を適用します。データプライバシーフレームワーク。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4.宛先国に対する欧州委員会の適切性に関する決定がない場合、当社は個人データを転送する際に、GDPR 第 46 条に記載されている適切な保護措置を講じます。また、かかる転送および技術的および組織的なセキュリティ対策は、GDPR 第 30 条に従って文書化されます。たとえば、当社は標準的な契約条項を使用して、欧州経済領域 (EEA) 外の国への個人データの転送を保護します。これにより、EU データ保護法が直接適用されない場合でも、同等レベルのデータ保護がお客様の個人データに適用されることが保証されます。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. Agora は、匿名化および/または集約されたデータを、お客様が提供する管轄区域外の組織に転送する場合があります。このような転送が行われた場合、Agora は、お客様のデータの安全性と完全性、および適用される強制法に基づいてお客様が享受できる個人データに関するすべての権利を確保するための安全策が講じられていることを確認します。 ",
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
              "4. あなたの個人データはどのくらいの期間保管されますか?",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.1.お客様の個人データは、上記の目的を達成するために必要な期間、または当社がお客様に同意を求めた場合に限り、お客様が同意を撤回するまで処理されます。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2.原則として、上記の目的で個人データが不要になった場合、当社はお客様の個人データを匿名化します。ただし、法的義務または規制上の義務がある場合、あるいは裁判所または行政命令によって削除が妨げられている場合、当社はお客様の個人データを削除することはできません。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3.当社は、第 2 条に記載されている正当な利益を保護するために必要な期間、またはお客様の同意が撤回されるまで、当社の Web サイトまたはモバイル アプリを通じて収集したすべての個人データを保管します。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4.ソーシャルメディア、電話、電子メール、またはその他のデジタル通信チャネルを介したお客様とのやりとりを通じて当社が収集したすべての個人データは、お客様とのコミュニケーションに必要な期間だけでなく、当社のコミュニケーションの履歴記録を維持するためにも保持されます。これにより、新しい質問、リクエスト、コメント、その他の入力があった場合に、以前のコミュニケーションに戻ることができます。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. あなたの個人データをどのように安全に保ちますか?"],
          },
          {
            tag: "p",
            children: [
              " 5.1. Agora では、個人データを保護することが最優先事項です。当社は、処理されるすべての個人データの安全性を確保するために、さまざまな技術的および組織的対策を講じています。これらの対策には次のものが含まれます。 ",
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
                    children: ["設計によるデータの最小化とプライバシー:"],
                  },
                  " 当社はプラットフォームの機能に必要な最小限の個人データのみを収集し、可能な限り機密情報の保存を避けます。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["暗号化と仮名化:"],
                  },
                  " 個人データは暗号化され、ユーザー ID を保護するために仮名化技術が適用されます。たとえば、電話番号が平文で保存されることはありません。代わりに、暗号化「ペッパー」を適用してハッシュ化し、不正アクセスを防ぎます。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["ゼロ知識証明認証:"],
                  },
                  " Agora はパスポート検証にゼロ知識証明 (ZKP) を活用し、ユーザーが機密の個人情報を明かすことなく資格を証明できるようにします。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["分散型暗号証明:"],
                  },
                  " 特定のユーザー操作 (アカウントの作成や参加など) は、ユーザーの身元を明らかにすることなく、暗号証明によって公的に検証できます。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["安全な認証:"],
                  },
                  " 当社はパスワードを保存しません。代わりに、認証はワンタイム検証コードまたは暗号キーを通じて処理され、資格情報漏洩のリスクが軽減されます。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["インフラストラクチャの保護:"],
                  },
                  " 当社のプラットフォームは、DDoS 保護、アクセス制御、ネットワーク監視を使用してサイバー脅威から保護され、攻撃を検出して軽減します。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["透明性とユーザーコントロール:"],
                  },
                  " ユーザーは、自分の個人データを管理し、アカウントを削除し、自分の情報の処理方法を制御することができます。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["定期的なセキュリティ評価:"],
                  },
                  " 当社のセキュリティ対策は定期的に見直され、新たな脅威に対処し、データ保護を向上させるために更新されます。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["ログと分析へのアクセス制御:"],
                  },
                  " パフォーマンスの監視とユーザー エクスペリエンスの向上には、集約され匿名化された分析データのみが使用されます。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["データの冗長性とバックアップ:"],
                  },
                  " データはアイルランドのダブリンにある AWS サーバーに安全に保存され、災害復旧の目的でフランスのパリに複製され、厳格なアクセス制御と暗号化対策が講じられています。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["限定されたメタデータ収集:"],
                  },
                  " Agora アプリケーション ログには、意図的に IP アドレスが記録されません。 Cloudflare、クラウド サービス プロバイダー、Sentry などのインフラストラクチャおよびエラー監視プロバイダーは、セキュリティ、運用、またはデバッグのために IP アドレスを処理する場合があります。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["匿名化されたAI翻訳:"],
                  },
                  " 翻訳のために Google Cloud Platform に送信されたコンテンツは、付随するメタデータ (ユーザー ID など) なしでそのまま送信され、米国 (us-central1 リージョン) で処理されます。当社が使用している Google Cloud LLM ベースの翻訳サービスは、現在 EU 地域では利用できません。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "の使用 ",
                      {
                        tag: "a",
                        children: ["Sentry.io"],
                        href: "https://sentry.io/privacy/",
                        external: true,
                      },
                      " プライバシーが低下したクラッシュ レポートの場合:",
                    ],
                  },
                  " Agora は、エラー追跡とクラッシュ報告の目的で Sentry (EU サーバー上でホストされている) を利用します。ルーチンセッションはセッションリプレイ用にアップロードされません。エラーが発生すると、バッファされた最近のインタラクション データがアップロードされ、障害の診断に役立ちます。再生は、記録前にテキストと入力をマスクし、メディアをブロックし、ネットワーク本文のキャプチャを無効にし、設定されたテキストとフォーム属性をマスクします。ナビゲーションおよびネットワークのカスタム記録イベントはスクラブされ、再生イベントの訪問先 URL リストはアップロード前にサニタイズされます。ファーストパーティの Agora および ZKorum URL はパスと仮名ルート識別子を保持する場合がありますが、資格情報、クエリ文字列、およびフラグメントは削除されます。外部 URL は元の URL に還元され、安全でない URL スキームは編集されます。また、エラー イベントでは、リクエスト URL と任意の追加データが削除され、技術的コンテキストの明示的な許可リストのみが保持され、コンソールとユーザー インターフェイスのブレッドクラムが省略されます。 1 つの特定のスタック オーバーフロー診断の場合、狭く限定された添付ファイルには構造ページ レイアウト フラグが含まれる場合がありますが、OTP 状態、ドラフト、オンボーディング状態、識別子、またはユーザー生成コンテンツは含まれない場合があります。リプレイおよびエラー レポートには、構造 DOM、仮名ルート パス、リソースの起源、技術メタデータ、およびインタラクション メタデータが含まれる場合があり、Sentry はプライバシー ポリシーに記載されているように IP アドレスを処理する場合があります。 Sentry は追跡 Cookie を使用しません。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["モニタリングのための仮名ロギング:"],
                  },
                  " Agora は、システムの監視、デバッグ、パフォーマンスの最適化を目的として、匿名の技術データを収集します。これには、ユーザーの UUID、ユーザー名、リクエストのメタデータ、エラー ログが含まれます。電話番号などの機密 PII はアプリケーション ログに記録されません。ただし、Twilio、AWS、Cloudflare などのサードパーティ サービスは、独自のプライバシー ポリシーと保持スケジュールに従ってデータ (IP アドレス、Twilio の場合は電話番号を含む) を保持する場合があります。 ",
                ],
              },
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. 個人データに関するお客様の権利"],
          },
          {
            tag: "p",
            children: [
              " 6.1.当社がお客様の個人データを収集して使用する場合、お客様は以下に説明する方法で行使できる多くの権利を享受することになります。権利を行使する際には、ご本人様確認をさせていただく場合がございますので、予めご了承ください。これは、個人データの侵害（権限のない人物があなたになりすまし、あなたの名前で権利を行使しているなど）を防ぐために行われます。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2.処理と法的根拠に応じて、データ主体として、個人データを管理し続けるためのさまざまな可能性があります。 ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["自分のデータにアクセスする権利"],
              },
              {
                tag: "li",
                children: ["データを修正する権利"],
              },
              {
                tag: "li",
                children: ["あなたの個人データの処理に反対する権利"],
              },
              {
                tag: "li",
                children: ["データ処理を制限する権利"],
              },
              {
                tag: "li",
                children: ["データを消去してもらう権利"],
              },
              {
                tag: "li",
                children: ["以前に与えられた同意を撤回する権利"],
              },
              {
                tag: "li",
                children: ["データを転送する権利"],
              },
              {
                tag: "li",
                children: [" 管轄のデータ保護当局に苦情を申し立てる権利。 "],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3.これらの権利は必ずしも絶対的なものではないこと、特定の状況においては、当社はお客様の個人データをさらに処理する権利があり、または法律で要求されている場合もあり、したがってお客様の要求に常に（完全に）応じることができるとは限らないことを、当社はお客様に指摘しておく必要があります。その場合には、別途ご案内させていただきます。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4.お客様はこれらの権利を無料で行使できますが、悪用の場合は除き、その場合当社はお客様の要求に応じるために管理手数料を請求する権利があります。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5.自分の反応、拍手、賛成票/反対票、アンケートの回答、同意/反対のアクション、会話、意見、返信、「ビュー」情報、および話された言語は削除できることに注意してください (少なくとも 1 つは残す必要があります)。 ",
            ],
          },
          {
            tag: "h3",
            children: ["6.6.セキュリティ記録:"],
          },
          {
            tag: "p",
            children: [
              " サービスを保護するために、アカウント削除後も一部のセキュリティ レコードが保持されます。 ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " リプレイ攻撃保護に使用される、有効期間の短い User Controlled Authorization Network (UCAN) トークン ハッシュ ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " これらの記録は、認可トークンの再利用を防ぐために必要な期間のみ保持されます。 ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7.アカウントを削除する方法:"],
          },
          {
            tag: "p",
            children: [
              " アカウントを削除すると、 ",
              {
                tag: "strong",
                children: ["すぐにアクセスできなくなる"],
              },
              " そして回復できません。削除プロセスは次のタイムラインに従います。 ",
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
                    children: ["すぐに："],
                  },
                  " アカウントは論理的に削除され、アクセスできなくなります。すべてのデバイスがログアウトされます。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["15 日後:"],
                  },
                  " あなたのアカウント データはデータベースから完全に削除 (ハード削除) されます。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["それから 30 日後まで:"],
                  },
                  " データは、災害復旧の目的で暗号化されたバックアップに保存される場合があります。 ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["削除するとどうなるか:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " アカウントはすぐにアクセスできなくなり、復元できなくなります ",
                ],
              },
              {
                tag: "li",
                children: [
                  "すべてのデバイスがログアウトされ、セッションが終了します",
                ],
              },
              {
                tag: "li",
                children: [
                  " あなたの認証資格情報 (電話番号、パスポート証明、イベントチケット) は無効になります ",
                ],
              },
              {
                tag: "li",
                children: [
                  " あなたのコンテンツ (投稿、投票、意見) はプラットフォーム上に残りますが、あなたのアカウントと公に関連付けられることはなくなります。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  " 15 日後、アカウント データはデータベースから完全に削除されます ",
                ],
              },
              {
                tag: "li",
                children: [
                  " アカウント操作の暗号化された証拠は検証後に保持されません ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["サードパーティのデータ保持:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["データベースのバックアップ:"],
                  },
                  " データは、15 日間の完全削除後、暗号化された AWS バックアップに最大 30 日間保持される場合があります ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["トゥイリオ:"],
                  },
                  " 電話認証記録は次に従って保存されます。 ",
                  {
                    tag: "a",
                    children: ["Twilio のプライバシー ポリシー"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["サードパーティのサービス:"],
                  },
                  " Sentry、Cloudflare、AWS、Google Cloud のログとデータは、それぞれのプライバシー ポリシーに従って保持される場合があります。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["重要："],
              },
              " 削除は即座に行われ、元に戻すことはできません。削除をリクエストした後はアカウントを回復することはできません。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8.当社によるお客様の個人データの処理について苦情がある場合は、いつでも当社までご連絡ください。 ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              "。弊社の対応にご満足いただけない場合は、管轄のデータ保護当局、つまりフランス国立情報自由委員会 (",
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
            children: ["7. カリフォルニア州居住者への重要な情報"],
          },
          {
            tag: "p",
            children: [
              " 7.1. 2018 年カリフォルニア州消費者プライバシー法 (「CCPA」) に従って、当社はカリフォルニア州居住者に次の追加詳細を提供します。過去 12 か月間、当社は業務運営上の目的で、このプライバシー ポリシーに記載されているカテゴリのお客様の個人情報を収集、使用、共有してきました。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2.当社はお客様の個人情報を販売していません。これは、金銭またはその他の貴重な対価のためにお客様の個人情報を開示していないことを意味します。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3.あなたには、自分の個人情報へのアクセスまたは削除を要求し、当社のプライバシー慣行に関する透明性を要求する権利があります。 CCPA に基づく権利の行使をご希望の場合は、第 6 条を参照してください。当社はお客様のリクエストを受信すると、追加情報を求めるなど、お客様の身元を確認するための情報を要求することによって確認します。お客様がお客様の権利を行使するためにカリフォルニア州国務長官に登録された代理人を使用したい場合、当社は、お客様が当該代理人に委任状を提供したこと、またはその代理人がお客様に代わって権利行使の要求を提出する有効な書面による権限を有していることの証拠を要求する場合があります。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4.お客様が権利を行使することを選択した場合、法律で差異が認められない限り、当社はお客様の権利を行使するために異なる価格を請求したり、異なる品質のサービスを提供したりすることはありません。 ",
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
              " 8.1.当社は、いつでも自主的にこのプライバシー ポリシーを変更することができます。このプライバシー ポリシーへの重大な変更がお客様の個人データの処理に影響を与える可能性がある場合、当社はこれらの変更を通常お客様と通信する方法 (電子メールやプラットフォーム上のメッセージなど) でお客様に通知します。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 8.2.当社の Web サイト (https://agoracitizen.network/) でこのプライバシー ポリシーの最新版を読むことをお勧めします。プライバシー ポリシーには、プライバシー ポリシーが最後に変更された日付が記載されています。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. 何か質問はありますか?"],
          },
          {
            tag: "p",
            children: [
              " 9.1.個人データの処理についてさらにご質問がある場合は、お気軽に当社のプライバシー マネージャーにお問い合わせください。弊社のプライバシー マネージャーに電子メールでご連絡いただけます。 ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              "。 ",
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
        "Бул купуялык саясаты автоматтык түрдө которулган. Англис тилиндеги версия гана расмий күчкө ээ жана кандайдыр бир айырмачылык болгон учурда англис тилиндеги версия гана артыкчылык кылат.",
      viewEnglish: "Расмий англис версиясын көрүү",
      returnToTranslation: "Которулган версияга кайтуу",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["Акыркы жолу жаңыртылган"],
          },
          ": 2025/11/11 (ЖЖЖЖ/АА/КК)",
        ],
      },
      {
        tag: "p",
        children: [
          " Agora Citizen Network тарабынан иштелип чыккан ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          ". ZKorumда биз купуялуулук негизги укук деп эсептейбиз. Биздин миссия - колдонуучуларга алардын инсандыгын жана жеке маалыматтарын көзөмөлдөө менен саясий жана социалдык дискурска катышууга мүмкүнчүлүк берүү. ",
        ],
      },
      {
        tag: "p",
        children: [
          ' Бул Купуялык саясаты Agora Citizen Network ("Agora", "биз", "биз" же "ZKorum") сиз биздин веб-сайтты жана мобилдик тиркемелерди (жалпысынан "Кызматтар") колдонгонуңузда же сиз биз менен башка жол менен өз ара аракеттенгенде сиз жөнүндө маалыматты кантип жана эмне үчүн чогултарын, колдоноорун жана бөлүшөрүн түшүндүрөт. Биз сиздин жеке маалыматтарыңызды ушул купуялык саясатында түшүндүрүлгөн тартипте чогултуу жана колдонуу үчүн жооптуубуз. ',
        ],
      },
      {
        tag: "p",
        children: [
          " Бул боюнча кандайдыр бир суроолоруңуз болсо, биз менен электрондук почта аркылуу байланышыңыз: ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". Эгер сиз Калифорниянын тургуну болсоңуз, биз сиздин көңүлүңүздү 7-беренеге бургубуз келет. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["Agora коомдук платформа болуп саналат"],
          },
          {
            tag: "p",
            children: [
              " Агорадагы көпчүлүк мазмун жалпыга жеткиликтүү, демек сиздин профилиңиз, постторуңуз, добуштарыңыз жана пикириңизди каалаган адам, атүгүл аккаунту жок эле көрө алат. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Сиз Agora серептөө үчүн каттоо эсебин түзүү талап кылынбайт. Талкууларга катышуу жана мазмун менен баарлашуу үчүн сиз: ",
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
                    children: ["Конок катары карап чыгуу:"],
                  },
                  " Сиз каттоодон өтпөстөн мазмунду изилдеп, чектелген карым-катнаштарга катыша аласыз. Платформа менен биринчи жолу иштешкенде (мис., жарыялоо, добуш берүү), түзмөккө тиешелүү криптографиялык идентификатор (DID) автоматтык түрдө түзүлүп, түзмөгүңүздө сакталат, андан соң серверлерибиздеги колдонуучунун каттоо эсебине байланыштырат. Бул DID түзмөгүңүз үчүн туруктуу сеанс идентификатору катары кызмат кылат. Конок каттоо эсептери ырасталган эмес жана аларды баштапкы түзмөктөн гана алууга болот. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Жумшак кирүү (сеанстын негизинде текшерүү):"],
                  },
                  " Колдонуу менен текшерүү ",
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " Group Proof of Credentials (GPC) аркылуу окуя билетин текшерүү үчүн. Бул сиздин каттоо эсебиңизге убактылуу окуяга негизделген текшерүүнү кошот, бирок катталган каттоо эсебин түзбөйт. Жумшак кирүү билеттин чоо-жайын көрсөтпөстөн иш-чарага катышууну далилдөөгө мүмкүндүк берет. Сиз каалаган убакта телефонду же паспортту текшерүүнү кошуу менен туруктуу катталган каттоо эсебине жаңырта аласыз. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Катуу логин (туруктуу катталган эсеп):"],
                  },
                  " Төмөнкү ыкмалардын бирин колдонуп, туруктуу тастыкталган каттоо эсебин түзүңүз: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["Телефон номери:"],
                          },
                          " SMS аркылуу жөнөтүлгөн бир жолку код аркылуу текшерилди ",
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
                          ": Паспорттун негизинде Zero-Knowledge Proof (ZKP) текшерүү ",
                        ],
                      },
                    ],
                  },
                  " Бул ыкмалар катталган каттоо эсебин түзүп, купуялуулукту сактоо менен сиздин инсандыгыңыз ырасталышын камсыздайт. Agora уникалдуулугун жана жарамдуулугун тастыктаган криптографиялык далилдерди гана алат, эч качан негизги өздүгүн тастыктаган документтер же билет маалыматы эмес. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["Каттоо эсебинин жаңыртуулары:"],
              },
              " Конок же жумшак логинден катуу текшерүүгө (телефон же паспорт) жаңыртылганыңызда, учурдагы бардык мазмунуңуз (посттор, добуштар, кийинкилер, окуяны текшерүү) автоматтык түрдө ырасталган аккаунтуңузга өткөрүлүп берилет жана мурунку текшерилбеген аккаунтуңуз жок кылынат. Бул бириктирүү биротоло болот жана аны артка кайтарууга болбойт. Коопсуздук максатында эки ырасталган каттоо эсебин бириктире албайсыз. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Сиздин Agora каттоо эсебиңиз кол менен тандалган же автоматтык түрдө түзүлүүчү колдонуучу атка ээ болот. Колдонуучунун аттары жалпыга ачык, бирок сиздин чыныгы инсандыгыңызга байланыштыруунун кереги жок. Каалаган убакта өзгөртүүгө же алып салууга мүмкүн болгон артыкчылыктуу темалар сыяктуу кошумча профилдин чоо-жайын да бере аласыз. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Agora Citizen Network мазмунунун көбү жалпыга ачык. Сиз мазмунду тапшырганыңызда (мисалы, пост, пикир же реакция), ал бардык колдонуучуларга көрүнүп турат жана издөө системалары тарабынан индекстелиши мүмкүн. Agora ошондой эле маалыматтардын текшерилишин камсыз кылуу үчүн криптографиялык далилдерди колдонот, бул айрым өз ара аракеттер (мисалы, каттоо эсебин түзүү жана катышуу сыяктуу) борбордон ажыратылган түрдө ачык жазылат. ",
            ],
          },
          {
            tag: "h3",
            children: ["Сиздин Agora профилиңиз"],
          },
          {
            tag: "p",
            children: [
              " Сиздин Agora профилиңиз демейки боюнча жалпыга ачык жана төмөнкүлөрдү камтыйт: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["Колдонуучунун аты"],
              },
              {
                tag: "li",
                children: ["Уникалдуу колдонуучунун идентификатору (UUID)"],
              },
              {
                tag: "li",
                children: [
                  " Аракеттер таржымалы (посттор, пикирлер, өз ара аракеттешүүлөр (быйтыкчалар, макул/макул эмес аракеттер, кол чаап, жакшы/жакты эмес добуштар), сурамжылоого жооптор жана белгиленген/кабарланган мазмун ",
                ],
              },
              {
                tag: "li",
                children: ["Коомчулуктар жана кызыктуу темалар"],
              },
              {
                tag: "li",
                children: [
                  " Текшерүү абалы: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          " Паспорттук далил аркылуу текшерилген (колдонуучуну жокко чыгаруучу жана эки багыттуу инсандык далилдер) ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          " Телефон номери аркылуу ырасталган (Agora кол койгон далилдөө: колдонуучунун UUID ачкычтары) ",
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
              " Колдонуучулар анонимдүү пост жазууга мүмкүнчүлүгү бар. Бул функцияны колдонууда колдонуучунун аттары жана профилдик сүрөттөрү жалпы идентификаторлор менен алмаштырылат жана мазмун колдонуучунун профилине ачык байланыштырылбайт. ",
            ],
          },
          {
            tag: "h3",
            children: ["Үчүнчү тараптын кызматтары"],
          },
          {
            tag: "p",
            children: [
              " Agora IP даректерди жана башка жеке маалыматтарды иштете турган үчүнчү тараптын кызматтарын колдонот. Мүмкүн болгон учурда, Agora кызматтарды ЕБ аймактык акыркы чекиттерин колдонууга конфигурациялайт же ЕБ негизиндеги провайдерлерди колдонот. Бул кызматтардын өздөрүнүн купуялык саясаттары бар жана колдонуучулар аларды карап чыгууга чакырылат. ",
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
                  " (глобалдык) нөлдүк билимди тастыктоо үчүн. Коопсуздук жана тейлөө операциялары үчүн IP даректерди иштете алат. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " (глобалдык, ачык булак) иш-чара билети жана Group Proof of Credentials (GPC) аркылуу инсандыгын текшерүү үчүн. Кызмат операциялары үчүн IP даректерди иштете алат. Zupass купуялыкка ылайыктуу веб аналитика үчүн Simple Analytics колдонот. ",
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
                  " (глобалдык) телефон номерин текшерүү үчүн. Twilio телефон номерлерин ачык текстте сактайт жана алдамчылыктын алдын алуу үчүн IP даректерди иштетет. Эскерте кетсек, Agora биздин маалымат базасында хэштелген телефон номерлерин гана сактайт (эч качан ачык текстте эмес), бирок Twilio телефон номерлерин өзүнүн купуялык саясатына ылайык сактайт. ",
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
                  " (глобалдык) DDoS коргоо жана коопсуздук үчүн. IP даректерди иштетет. ",
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
                  " (ЕБ: Дублин жана Париж) инфраструктураны, маалыматтарды сактоону жана эсептөө ресурстарын жайгаштыруу үчүн. Инфраструктуралык операциялар үчүн IP даректерди иштетет. ",
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
                  " (АКШда жайгашкан, АКШ-борбордук1 аймак) колдонуучу постторун жана платформада түзүлгөн мазмунду AI менен котормосу үчүн. Инфраструктуралык операциялар үчүн IP даректерди иштете алат. ",
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
                  " (ЕБ негизинде) купуялыкка ылайыктуу веб аналитика үчүн. Конокторду эсептөө үчүн IP даректерди убактылуу иштетет, бирок аларды сактабайт (чоо-жайы үчүн алардын маалымат саясатын караңыз). ",
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
                  " (ЕБ серверлери) каталарды көзөмөлдөө жана каталар жөнүндө кабарлоо үчүн. Мүчүлүштүктөрдү оңдоо максатында IP даректерин иштетет. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              ' "Глобалдык" деп белгиленген кызматтар 3-беренеде сүрөттөлгөн тиешелүү GDPR коргоо чаралары менен иштешет. IP даректин купуялуулугуна тынчсызданган колдонуучулар Agora\'га кирүүдө Tor же башка микснет чечимдерин колдонууга чакырылат. ',
            ],
          },
          {
            tag: "h3",
            children: ["Cookies жана аналитика"],
          },
          {
            tag: "p",
            children: [
              " Agora жарнаманы же сайттар аралык көз салуу кукилерин колдонбойт, ошондой эле биз жарнама үчүн маалыматтарды сатпайбыз. Биз Cookie файлдарын колдонбогон Евробиримдиктин негизиндеги аналитикалык кызматты жана чектелген ката жана натыйжалуу телеметрия үчүн Sentryди колдонобуз. Көбүрөөк маалымат алуу үчүн, кириңиз ",
              {
                tag: "a",
                children: ["Plausible Analytics"],
                href: "https://plausible.io/about",
                external: true,
              },
              ". ",
            ],
          },
          {
            tag: "p",
            children: [
              " Биз веб-сайттын иштеши үчүн өтө зарыл болгон сеанс/аныктыгын текшерүү кукилерин гана колдонобуз. ",
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
              "1.1. Биз сиздин жеке маалыматыңызды төмөнкү учурларда чогултабыз жана колдонобуз:",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "биздин веб-сайтты колдонуу (https://agoracitizen.network/);",
                ],
              },
              {
                tag: "li",
                children: ["биздин мобилдик колдонмону колдонуу; жана"],
              },
              {
                tag: "li",
                children: [
                  " электрондук почта же башка санарип байланыш каналы аркылуу биз менен байланыш. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 1.2. Бул купуялык саясаты 8-беренеде белгиленгендей өзгөртүлүшү мүмкүн. ",
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
              "2. Биз кайсы жеке маалыматтарды иштетебиз жана эмне үчүн?",
            ],
          },
          {
            tag: "p",
            children: [
              " Биз сиздин жеке маалыматыңызды белгилүү бир максатта жана мыйзам тарабынан уруксат берилген өлчөмдө гана иштетебиз. Төмөндө биз сиздин жеке маалыматыңызды кайсы учурларда чогултуп жана колдонобуз. Эгерде биз сиздин жеке маалыматыңызды сизден түздөн-түз албасак, анда биз бул тууралуу төмөндө кабарлайбыз. ",
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
                        children: ["Кандай жеке маалыматтар?"],
                      },
                      {
                        tag: "th",
                        children: ["Неге?"],
                      },
                      {
                        tag: "th",
                        children: ["Юридикалык негиз?"],
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
                              "Түзмөктүн идентификатору (DID - борбордон ажыратылган идентификатор)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Түзмөгүңүздө түзүлүп, сакталган криптографиялык ачык ачкыч (диd:ачкыч форматы), андан кийин биздин серверлердеги колдонуучу каттоо эсебиңизге байланыштырылган. DID'лер түзмөгүңүздү каттоо эсебиңизге туташтыруучу туруктуу сеанс идентификаторлору катары кызмат кылат. DIDдер түзмөккө негизделген сеанстарды колдоо үчүн бардык колдонуучулар үчүн сакталат (конок, жумшак логин жана катуу логин). ",
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
                              "Soft Login - Окуя билетин текшерүү (Zupass)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Zupass аркылуу ырастаганыңызда, биз окуяга тиешелүү жокко чыгаргычты (билетиңизден алынган купуялыкты сактоочу идентификатор) жана окуянын слогун сактайбыз. Бул билеттин чоо-жайын көрсөтпөстөн иш-чарага катышууну далилдейт. Жумшак логин катталган каттоо эсебин түзбөйт, бирок туруктуу каттоого жаңыртылган сессиянын негизинде текшерүүгө мүмкүндүк берет. ",
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
                              "Аутентификация маалыматтары - Телефон номери",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Колдонуучулардын аныктыгын текшерүү жана бир жолку текшерүү коддорун жеткирүү. Телефон номерлери биздин маалымат базабызда криптографиялык хэштер катары сакталат. Twilio (биздин SMS провайдерибиз) текшерүү коддорун жеткирүү үчүн телефон номерлерин ачык текстте иштеп чыгат жана сактайт. Телефонду текшерүү туруктуу катталган каттоо эсебин түзөт. ",
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
                              "Аныктыгын текшерүү маалыматтары - Паспорттун нөлдүк билим далили (Rarimo)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Купуялыкты сактоочу паспорт текшерүү аркылуу колдонуучунун жарамдуулугун текшерүү. Биз паспорттон алынган жокко чыгаргычты, өлкөнүн жарандыгынын кодун жана жынысын сактайбыз. Agora уникалдуулугун жана жарамдуулугун тастыктаган криптографиялык далилди гана алат, эч качан сиздин паспортуңуздун номери, аты-жөнү, сүрөтү же паспорттун башка реквизиттери. Паспортту текшерүү туруктуу катталган каттоо эсебин түзөт. ",
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
                            children: ["Каттоо эсебинин маалыматы"],
                          },
                          " (Колдонуучунун аты, артыкчылыктуу тили, жынысы жана улуту (эгер паспорт текшерилсе)) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Колдонуучу каттоо эсептерин түзүү жана башкаруу үчүн колдонуучу тажрыйбасын ыңгайлаштырыңыз. Бул маалыматтар аналитика, статистика жана акча табуу максатында топтолот. ",
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
                            children: ["Сиз жасаган аракеттер"],
                          },
                          " (Посттор, Пикирлер, Жооптор, Реакциялар, сурамжылоолор) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Талкууларды, колдонуучунун өз ара аракеттенүүсүн жана платформада катышуусун камсыз кылуу. Бул маалыматтар аналитика, статистика жана акча табуу максатында топтолот. ",
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
                          " Платформанын инфраструктурасын коргоо, зыяндуу аракеттерди алдын алуу жана операциялык коопсуздукту камсыз кылуу (мисалы, Кызматтан баш тартуу (DDoS) чабуулдарынан коргоо). ",
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
                            children: ["Псевдонимдүү Техникалык маалыматтар"],
                          },
                          " (Колдонуучунун UUID'лери, колдонуучу аттары, суроонун метадайындары, ката журналдары, убакыт белгилери) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Системаны көзөмөлдөө, мүчүлүштүктөрдү оңдоо, аткарууну оптималдаштыруу жана кызматтын ишенимдүүлүгүн жогорулатуу үчүн. Биз колдонмо журналдарына телефон номерлери сыяктуу сезимтал PII киргизбейбиз. ",
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
                          " (Сиз бизге берген инсандык жана байланыш маалыматтары, байланыштын мазмуну, байланыштын техникалык деталдары (мисалы, датасы жана убактысы) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Сиз менен биздин ортобуздагы байланышты иштетүү үчүн (мисалы, биз менен социалдык медиа, телефон же электрондук почта аркылуу байланышканыңызда). ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Сурамдарга, суроолорго же комментарийлерге жооп берүүгө же ар кандай түрдөгү суроолор боюнча сиз менен активдүү байланышууга биздин мыйзамдуу кызыкчылыгыбыз. ",
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
                            children: ["Жогоруда айтылган жеке маалыматтар."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Биздин мыйзамдуу милдеттенмелерибизди аткаруу же компетенттүү полиция органдарынан, сот органдарынан, мамлекеттик мекемелерден же органдардан, анын ичинде компетенттүү маалыматтарды коргоо органдарынан келген акылга сыярлык талаптарды аткаруу. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Биздин мыйзамдуу милдетибиз."],
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
                            children: ["Жогоруда айтылган жеке маалыматтар."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Алдамчылыктын же башка мыйзамсыз же уруксатсыз аракеттердин алдын алуу, аныктоо жана ага каршы күрөшүү. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Биздин мыйзамдуу милдетибиз."],
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
                            children: ["Жогоруда айтылган жеке маалыматтар."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Соттук териштирүүдө өзүбүздү коргоо үчүн."],
                      },
                      {
                        tag: "td",
                        children: [
                          " Бул процесстерде сиздин жеке маалыматтарыңызды колдонууга биздин мыйзамдуу кызыкчылыгыбыз. ",
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
                            children: ["Жогоруда айтылган жеке маалыматтар."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Үчүнчү тарап ЕБнин чегинен тышкары жайгашкан болсо дагы, ошол үчүнчү тарап менен мүмкүн болгон биригүү, сатып алуу/тараптан же бөлүнүү контекстинде үчүнчү тарапка билдирүү. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Бизнес бүтүмдөрдү түзүүгө биздин мыйзамдуу кызыкчылыгыбыз. ",
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
                              "Каттоо эсебин жаңыртуу/Дайындарды бириктирүү",
                            ],
                          },
                          " (Колдонуучунун мазмуну, түзмөктөр, окуя билеттери, артыкчылыктар) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Конок же жумшак логинден катуу текшерүүгө (телефон же паспорт) жаңыртылганыңызда, бардык маалыматтарыңыз ырасталган аккаунтуңузга өткөрүлүп берилет жана мурунку аккаунтуңуз жок кылынат. Бул туруктуу текшерүүнү кошуп, мазмунуңуздун жана аракеттериңиздин таржымалынын үзгүлтүксүздүгүн камсыздайт. ",
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
                ],
              },
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
              "3. Биз сиздин жеке маалыматыңызды ким менен бөлүшөбүз?",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.1. Негизи, биз сиздин жеке маалыматыңызды бизде иштеген адамдардан башка эч ким менен, ошондой эле сиздин жеке маалыматыңызды иштетүүгө жардам берген камсыздоочулар менен бөлүшпөйбүз. Сиздин жеке маалыматтарыңызга кирүү мүмкүнчүлүгү бар адам ар дайым сиздин жеке маалыматыңызды коопсуз жана купуялуу сактоо боюнча катуу мыйзамдуу же келишимдик милдеттенмелерге милдеттүү болот. Бул сиздин жеке маалыматыңызды алуучулардын төмөнкү категориялары гана алат дегенди билдирет: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["сен;"],
              },
              {
                tag: "li",
                children: ["Биздин кызматкерлер жана жеткирүүчүлөр; жана"],
              },
              {
                tag: "li",
                children: [
                  " Биз сиздин жеке маалыматыңызды алар менен бөлүшүүгө милдеттүү болгон мамлекеттик же сот органдарына (мисалы, салык органдары, полиция же сот органдары). ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. Биз сиздин жеке маалыматыңызды Европалык Экономикалык Аймактан (ЕЭА) тышкары жөнөтөбүз (Европа Экономикалык Биримдиги ЕБ, Лихтенштейн, Норвегия жана Исландиядан турат). Биз бул жеке маалыматтарды ушул 3-беренеде аныкталгандай сиздин жеке маалыматтарыңызды алуучулардын категориялары менен байланышуу үчүн ЕАЭБден тышкарыга өткөрүп беребиз. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. Биз өткөрүп берүү учурунда сиздин жеке маалыматыңызды коргоо үчүн тиешелүү коргоо чараларын колдонобуз, мисалы, Европа Комиссиясынын шайкештиги жөнүндө чечими бар же ЕБ-АКШ сыяктуу бекитилген негиздер боюнча тастыкталган өлкөлөрдө жайгашкан процессорлор менен гана иштөө. Маалыматтын купуялык алкагы. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. Эгерде Европа Комиссиясынын бара турган өлкө үчүн адекваттуулугу боюнча чечими жок болсо, биз жеке маалыматтарды өткөрүп берүүдө GDPRдин 46-беренесинде сүрөттөлгөн тиешелүү кепилдиктерди колдонобуз жана мындай өткөрүп берүүлөр жана техникалык жана уюштуруучулук коопсуздук чаралары GDPRдын 30-беренесине ылайык документтештирилет. Мисалы, биз жеке маалыматтарды Европалык Экономикалык Аймактан (ЕЭА) тышкаркы өлкөлөргө өткөрүп берүүнү коргоо үчүн стандарттык келишимдик пункттарды колдонобуз, ошентип, ЕБ маалыматтарды коргоо мыйзамы түздөн-түз колдонулбаса да, сиздин жеке маалыматтарыңызга берилиштерди коргоонун эквиваленттүү деңгээли колдонулушун камсыздайбыз. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. Agora анонимдүү жана/же топтолгон маалыматтарды сиз берген юрисдикциядан тышкары уюмдарга өткөрүп бере алат. Эгерде мындай өткөрүп берүү ишке ашса, Agora сиздин маалыматтарыңыздын коопсуздугун жана бүтүндүгүн жана колдонуудагы милдеттүү мыйзамдарга ылайык пайдаланылышы мүмкүн болгон жеке маалыматтарыңызга карата бардык укуктарды камсыз кылуу үчүн коопсуздук чараларын камсыз кылат. ",
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
              "4. Сиздин жеке маалыматыңызды канча убакытка чейин сактайбыз?",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.1. Сиздин жеке маалыматтарыңыз жогоруда сүрөттөлгөн максаттарга жетүү үчүн зарыл болгон убакытка чейин же биз сизден макулдугуңузду сураганыбызда, сиз макулдугуңуздан баш тартмайынча иштетилет. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. Эреже катары, биз сиздин жеке маалыматыңыздын жогоруда сүрөттөлгөн максаттар үчүн кереги жок болгондо де-идентификациядан чыгарабыз. Бирок, биз сиздин жеке маалыматыңызды жок кыла албайбыз, эгерде мыйзамдуу же ченемдик милдеттенме же соттун же административдик чечимдин бизге тоскоолдук кылганы. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. Биз веб-сайтыбыз же мобилдик тиркеме аркылуу чогултулган бардык жеке маалыматтарды 2-беренеде айтылган мыйзамдуу кызыкчылыктарды коргоо үчүн зарыл болгонго чейин же сиздин макулдугуңуз алынганга чейин сактайбыз. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. Социалдык медиа, телефон, электрондук почта же башка санариптик байланыш каналдары аркылуу сиз менен болгон өз ара аракетибиз аркылуу чогулткан бардык жеке маалыматтар сиз менен баарлашуу үчүн зарыл болгон убакытка чейин сакталат, ошондой эле биздин байланыштарыбыздын тарыхый рекордун сактоо үчүн. Бул бизге жаңы суроолор, суроо-талаптар, комментарийлер же башка киргизүүлөр менен кайтып келгенде, мурунку байланыштарга кайтууга мүмкүндүк берет. ",
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
              "5. Биз сиздин жеке маалыматтарыңызды кантип коргойбуз?",
            ],
          },
          {
            tag: "p",
            children: [
              " 5.1. Agora'да жеке маалыматтарыңызды коргоо башкы артыкчылык болуп саналат. Биз бардык иштетилген жеке маалыматтардын коопсуз бойдон калышын камсыз кылуу үчүн бир катар техникалык жана уюштуруу чараларын ишке ашырдык. Бул чараларга төмөнкүлөр кирет: ",
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
                    children: [
                      "Дизайн боюнча маалыматтарды минималдаштыруу жана купуялуулук:",
                    ],
                  },
                  " Биз платформанын иштеши үчүн зарыл болгон минималдуу жеке маалыматтарды гана чогултабыз, мүмкүн болушунча купуя маалыматты сактоодон качабыз. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Шифрлөө жана псевдонимдөө:"],
                  },
                  ' Жеке маалыматтар шифрленген жана колдонуучунун инсандыгын коргоо үчүн псевдонимдөө ыкмалары колдонулат. Мисалы, телефон номерлери эч качан ачык текстте сакталбайт; анын ордуна, биз криптографиялык "калемпирди" колдонобуз жана уруксатсыз кирүүнү болтурбоо үчүн аларды хэштейбиз. ',
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Нөлдүк билимди тастыктаган аутентификация:"],
                  },
                  " Agora паспортту текшерүү үчүн нөлдүк билим далилдерин (ZKP) колдонот, бул колдонуучуларга купуя жеке маалыматты ачыкка чыгарбастан, алардын жарамдуулугун далилдей алышына кепилдик берет. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "Борбордон ажыратылган криптографиялык далилдер:",
                    ],
                  },
                  " Колдонуучунун айрым өз ара аракеттешүүсү (мисалы, каттоо эсебин түзүү жана катышуу) колдонуучунун инсандыгын көрсөтпөстөн, криптографиялык далилдер аркылуу ачык текшерилет. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Коопсуз аутентификация:"],
                  },
                  " Биз сырсөздөрдү сактабайбыз. Анын ордуна, аутентификация бир жолку текшерүү коддору же криптографиялык ачкычтар аркылуу жүргүзүлүп, эсептик маалыматтардын чыгып кетүү коркунучун азайтат. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Инфраструктураны коргоо:"],
                  },
                  " Биздин платформа кол салууларды аныктоо жана азайтуу үчүн DDoS коргоону, кирүүнү башкарууну жана тармактык мониторингди колдонуу менен кибер коркунучтардан корголгон. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Ачыктык жана колдонуучунун көзөмөлү:"],
                  },
                  " Колдонуучулар өздөрүнүн жеке маалыматтарын башкаруу, каттоо эсебин жок кылуу жана маалыматынын иштетилишин көзөмөлдөө мүмкүнчүлүгүнө ээ. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["үзгүлтүксүз коопсуздук баалоо:"],
                  },
                  " Биздин коопсуздук чараларыбыз мезгил-мезгили менен каралып, жаңыланып турат жана пайда болгон коркунучтарды жоюу жана маалыматтарды коргоону жакшыртуу. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "Журналдарга жана аналитикага көзөмөлгө алынган мүмкүнчүлүк:",
                    ],
                  },
                  " Агрегацияланган жана анонимдүү аналитикалык маалыматтар гана аткарууну көзөмөлдөө жана колдонуучу тажрыйбасын жакшыртуу үчүн колдонулат. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "Маалыматтын ашыкчасы жана резервдик көчүрмөлөрү:",
                    ],
                  },
                  " Маалыматтар Дублиндеги (Ирландия) AWS серверлеринде коопсуз сакталат жана катаал кирүү көзөмөлү жана шифрлөө чаралары менен кырсыкты калыбына келтирүү максатында Парижде, Францияда репликацияланат. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Чектелген метадайындарды чогултуу:"],
                  },
                  " Agora тиркемелеринин журналдары IP даректерди атайылап жаздырбайт. Инфраструктураны жана каталарды көзөмөлдөө провайдерлери, анын ичинде Cloudflare, булут кызмат көрсөтүүчүлөрү жана Sentry, коопсуздук, операциялар же мүчүлүштүктөрдү оңдоо үчүн IP даректерди иштетиши мүмкүн. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Анонимдүү AI котормосу:"],
                  },
                  " Которуу үчүн Google Булут Платформасына жөнөтүлгөн мазмун эч кандай коштоочу метадайындарсыз (колдонуучунун идентификаторлору ж.б.) ошол бойдон өткөрүлүп берилет жана АКШда (us-central1 чөлкөмүндө) иштетилет. Биз колдонгон Google Cloud LLMге негизделген котормо кызматы учурда ЕБ аймагында жеткиликтүү эмес. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "колдонуу ",
                      {
                        tag: "a",
                        children: ["Sentry.io"],
                        href: "https://sentry.io/privacy/",
                        external: true,
                      },
                      " купуялуулугу кыскартылган бузулуу отчеттору үчүн:",
                    ],
                  },
                  " Agora каталарды көзөмөлдөө жана каталарды билдирүү максатында Sentry'ди (ЕС серверлеринде жайгаштырылган) колдонот. Күнүмдүк сеанстар Сеансты кайра ойнотуу үчүн жүктөлбөйт; ката пайда болгондо, катаны аныктоого жардам берүү үчүн буферленген акыркы өз ара аракеттенүү дайындары жүктөлүшү мүмкүн. Кайра ойнотуу текстти жана киргизүүнү маскалар, медианы бөгөттөө, тармактын денесин тартууну өчүрүү жана жаздыруудан мурун конфигурацияланган текст менен форма атрибуттарын маска. Навигация жана тармактын ыңгайлаштырылган жазуу окуялары тазаланып, кайра ойнотуу окуясынын барган URL тизмеси жүктөөдөн мурун тазаланат. Биринчи тараптын Agora жана ZKorum URL даректеринде жолдор жана псевдонимдүү маршрут идентификаторлору сакталышы мүмкүн, бирок эсептик маалыматтар, суроо саптары жана фрагменттери алынып салынат. Тышкы URL даректери алардын келип чыгышына кыскартылат, ал эми кооптуу URL схемалары оңдолот. Ката окуялары ошондой эле сурамдын URL даректерин жана ыктыярдуу кошумча маалыматтарды алып салат, техникалык контексттердин ачык уруксат берилген тизмесин гана сактап, консоль менен колдонуучу интерфейсинин сыныктарын өткөрүп жиберет. Бир конкреттүү стек толуп кетүү диагностикасы үчүн, тар чектелген тиркеме OTP абалын, долбоорлорду, борттук абалды, идентификаторлорду же колдонуучу жараткан мазмунду эмес, түзүмдүк баракчанын желектерин камтышы мүмкүн. Кайталоо жана ката отчетторунда структуралык DOM, псевдонимдүү маршрут жолдору, ресурстун булактары, техникалык жана өз ара аракеттенүү метадайындары камтышы мүмкүн жана Sentry өзүнүн купуялык саясатында сүрөттөлгөндөй IP даректерин иштетиши мүмкүн. Sentry көз салуу кукилерин колдонбойт. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Мониторинг үчүн псевдонимдүү журнал:"],
                  },
                  " Agora системаны көзөмөлдөө, мүчүлүштүктөрдү оңдоо жана аткарууну оптималдаштыруу максатында псевдонимдүү техникалык маалыматтарды чогултат. Буга колдонуучунун UUIDдери, колдонуучу аттары, сурам метадайындары жана ката журналдары кирет. Биз колдонмо журналдарыбызга телефон номерлери сыяктуу сезгич PII киргизбейбиз. Бирок, Twilio, AWS, Cloudflare жана башкалар сыяктуу үчүнчү тараптын кызматтары маалыматтарды (анын ичинде IP даректерди жана, Twilio учурда телефон номерлерин) өздөрүнүн купуялык саясаттарына жана сактоо графиктерине ылайык сактай алышат. ",
                ],
              },
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. Сиздин жеке маалыматтарыңызга карата укуктарыңыз"],
          },
          {
            tag: "p",
            children: [
              " 6.1. Биз сиздин жеке маалыматыңызды чогултканыбызда жана колдонгонубузда, сиз төмөндө сүрөттөлгөн тартипте колдоно ала турган бир катар укуктарга ээ болосуз. Укугуңузду колдонгуңуз келсе, биз сизден өзүңүздү тастыктаган документти сурай турганыбызды эске алыңыз. Биз муну жеке маалыматтардын бузулушун алдын алуу үчүн жасайбыз (мисалы, уруксаты жок адам сиздин атыңыздан пайдаланып, сиздин атыңызга укукту колдонуп жаткандыктан). ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2. Иштеп чыгууга жана укуктук негизге жараша, маалымат субъекти катары сизде жеке маалыматтарыңызды көзөмөлдөө үчүн бир катар мүмкүнчүлүктөр бар: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["маалыматтарыңызга кирүү укугу"],
              },
              {
                tag: "li",
                children: ["маалыматыңызды өзгөртүүгө укуктуу"],
              },
              {
                tag: "li",
                children: [
                  "сиздин жеке маалыматтарыңызды иштетүүгө каршы чыгууга укуктуу",
                ],
              },
              {
                tag: "li",
                children: ["маалыматтарды иштетүүнү чектөөгө укуктуу"],
              },
              {
                tag: "li",
                children: ["маалыматыңызды жок кылууга укуктуу"],
              },
              {
                tag: "li",
                children: ["мурда берген макулдугуңуздан баш тартууга укуктуу"],
              },
              {
                tag: "li",
                children: ["маалыматыңызды өткөрүү укугу"],
              },
              {
                tag: "li",
                children: [
                  " маалыматтарды коргоо боюнча ыйгарым укуктуу органга даттанууга укуктуу. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. Биз сизге бул укуктар дайыма абсолюттук эмес экенин, белгилүү бир жагдайларда биз сиздин жеке маалыматыңызды андан ары иштетүүгө укуктуубуз же ал тургай мыйзам боюнча талап кылынарыбызды жана ошондуктан сиздин өтүнүчүңүздү ар дайым (толук) аткара албашыбызды эскертишибиз керек. Мындай учурларда биз сизге тиешелүү түрдө кабарлайбыз. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. Сиз бул укуктарды бекер колдоно аласыз, кыянаттык кылган учурларды кошпогондо жана бул учурда биз сиздин өтүнүчүңүздү аткаруу үчүн администрациялык төлөм алууга укуктуубуз. ",
            ],
          },
          {
            tag: "p",
            children: [
              ' 6.5. Өзүңүздүн реакцияларыңызды, кол чабууларыңызды, жакшы/жакшы добуштарыңызды, сурамжылоонун жоопторун, макул/макул эмес аракеттериңизди, баарлашууларыңызды, пикирлериңизди, жоопторуңузду, "караган" маалыматыңызды жана сүйлөгөн тилиңизди (жок дегенде бирөө калышы керек) жок кыла аларыңызды эске алыңыз. ',
            ],
          },
          {
            tag: "h3",
            children: ["6.6. Коопсуздук жазуулары:"],
          },
          {
            tag: "p",
            children: [
              " Айрым коопсуздук жазуулары кызматты коргоо үчүн каттоо эсеби жок кылынгандан кийин сакталат: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " Кыска мөөнөттүү Колдонуучу тарабынан башкарылуучу авторизация тармагы (UCAN) токен хэштери кайталап чабуулдан коргоо үчүн колдонулат ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Бул жазуулар кайра колдонулуучу авторизация белгилеринин алдын алуу үчүн зарыл болгон убакытка гана сакталат. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. Каттоо эсебиңизди кантип жок кылса болот:"],
          },
          {
            tag: "p",
            children: [
              " Каттоо эсебиңизди жок кылганыңызда, бул ",
              {
                tag: "strong",
                children: ["дароо кол жеткис"],
              },
              " жана калыбына келтирүү мүмкүн эмес. Жок кылуу процесси бул убакыт сызыгынан кийин жүрөт: ",
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
                    children: ["Дароо:"],
                  },
                  " Каттоо эсебиңиз акырын өчүрүлүп, жеткиликсиз болуп калат. Бардык түзмөктөр чыгып кетти. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["15 күндөн кийин:"],
                  },
                  " Каттоо эсебиңиздин дайындары биздин маалымат базасынан биротоло жок кылынат (катуу жок кылынган). ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Андан кийин 30 күнгө чейин:"],
                  },
                  " Кырсыктан калыбына келтирүү максатында маалыматтар шифрленген камдык көчүрмөдө сакталышы мүмкүн. ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["Жок кылууда эмне болот:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " Каттоо эсебиңиз дароо жеткиликсиз болуп калат жана аны калыбына келтирүүгө болбойт ",
                ],
              },
              {
                tag: "li",
                children: ["Бардык түзмөктөр чыгып, сеансыңыз токтотулду"],
              },
              {
                tag: "li",
                children: [
                  " Текшерүү маалыматтарыңыз (телефон номери, паспорттун далили, иш-чара билеттери) жараксыз ",
                ],
              },
              {
                tag: "li",
                children: [
                  " Мазмунуңуз (посттор, добуштар, пикирлер) платформада кала берет, бирок аккаунтуңуз менен жалпыга ачык байланыштырылбайт ",
                ],
              },
              {
                tag: "li",
                children: [
                  " 15 күндөн кийин каттоо эсебиңиздин маалыматы биздин маалымат базасынан биротоло өчүрүлөт ",
                ],
              },
              {
                tag: "li",
                children: [
                  " Эсептин аракеттеринин криптографиялык далилдери текшерүүдөн кийин сакталбайт ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["Үчүнчү тараптын маалыматын сактоо:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Маалымат базасынын резервдик көчүрмөлөрү:"],
                  },
                  " Маалыматтар шифрленген AWS камдык көчүрмөлөрүндө 15 күндүк катуу өчүрүлгөндөн кийин 30 күнгө чейин сакталышы мүмкүн ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Twilio:"],
                  },
                  " Телефонду текшерүү жазуулары ылайык сакталат ",
                  {
                    tag: "a",
                    children: ["Twilio купуялык саясаты"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Үчүнчү тараптын кызматтары:"],
                  },
                  " Sentry, Cloudflare, AWS жана Google Cloud'тагы журналдар жана маалыматтар тиешелүү купуялык саясаттарына ылайык сакталышы мүмкүн ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["Маанилүү:"],
              },
              " Жок кылуу дароо жана кайтарылгыс. Жок кылууну сурангандан кийин аккаунтуңузду калыбына келтире албайсыз. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. Эгерде сиздин жеке маалыматтарыңыздын биз тарабынан иштетилишине нааразычылыгыңыз болсо, биз менен ар дайым байланыша аласыз ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". Эгерде сиз биздин жообубузга канааттанбасаңыз, маалыматтарды коргоо боюнча компетенттүү органга, б.а. Франциянын улуттук маалымат комиссиясына арыздансаңыз болот (",
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
              ' 7.1. Калифорниянын 2018-жылдагы Керектөөчүлөрдүн Купуялык Актынына ("CCPA") ылайык, биз Калифорниянын тургундарына төмөнкү кошумча маалыматтарды беребиз. Мурунку 12 айдын ичинде биз оперативдүү бизнес максаттарыбыз үчүн бул купуялык саясатында жогоруда сүрөттөлгөн жеке маалыматыңыздын категорияларын чогулттук, колдондук жана бөлүштүк. ',
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. Биз сиздин жеке маалыматыңызды саткан жокпуз, башкача айтканда, биз сиздин жеке маалыматыңызды акчалай же башка баалуу кароо үчүн ачыкка чыгарган жокпуз. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. Сиздин жеке маалыматыңызга жетүү же жок кылууну талап кылууга жана биздин купуялык практикабыздын ачыктыгын талап кылууга укугуңуз бар. Эгерде сиз CCPA боюнча өз укуктарыңыздан пайдалангыңыз келсе, 6-беренени караңыз. Суранычыңызды алгандан кийин, биз сиздин инсандыгыңызды ырастоо үчүн маалыматты суроо менен, анын ичинде сизден кошумча маалыматты суроо менен текшеребиз. Эгер сиз Калифорния штатынын мамлекеттик катчысында катталган агентти өз укуктарыңызды ишке ашыруу үчүн колдонгуңуз келсе, биз мындай агентке ишеним кат бергениңизди же агенттин башка жол менен сиздин атыңыздан укуктарды ишке ашырууга өтүнүчтөрдү жөнөтүүгө жарактуу жазуу жүзүндөгү ыйгарым укугу бар экендигин далилдеп сурай алабыз. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. Эгерде сиз өз укуктарыңызды ишке ашырууну тандасаңыз, анда биз сизден ар кандай бааларды төлөбөйбүз же сиздин укуктарыңызды ишке ашыруу үчүн башка сапаттагы кызматтарды көрсөтпөйбүз, эгерде бул айырмачылыктар мыйзам тарабынан жол берилбесе. ",
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
              " 8.1. Бул купуялык саясатын каалаган убакта өзүбүздүн демилгебиз менен өзгөртө алабыз. Эгерде бул купуялык саясатына олуттуу өзгөртүүлөр сиздин жеке маалыматтарыңыздын иштетилишине таасир этиши мүмкүн болсо, биз бул өзгөрүүлөрдү сизге адатта сиз менен баарлашкан жол менен кабарлайбыз (мисалы, электрондук почта аркылуу же платформадагы билдирүү аркылуу). ",
            ],
          },
          {
            tag: "p",
            children: [
              " 8.2. Сизди бул купуялык саясатынын акыркы версиясын биздин веб-сайттан окууга чакырабыз (https://agoracitizen.network/). Купуялык саясатында купуялык саясатыбыз акыркы жолу өзгөртүлгөн күнү көрсөтүлгөн. ",
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
              " 9.1. Жеке маалыматтарыңызды иштетүү боюнча дагы суроолоруңуз болсо, биздин купуялык менеджерибиз менен байланышуудан тартынбаңыз. Сиз биздин купуялык менеджерибизге электрондук почта аркылуу кайрылсаңыз болот: ",
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
        "Настоящая политика конфиденциальности переведена автоматически. Единственной официальной версией является версия на английском языке, и в случае любых расхождений исключительно она имеет преимущественную силу.",
      viewEnglish: "Открыть официальную версию на английском языке",
      returnToTranslation: "Вернуться к переведённой версии",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["Последнее обновление"],
          },
          ": 2025/11/11 (ГГГГ/ММ/ДД)",
        ],
      },
      {
        tag: "p",
        children: [
          " Agora Citizen Network разработана ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          ". В ZKorum мы считаем, что конфиденциальность является фундаментальным правом. Наша миссия — предоставить пользователям возможность участвовать в политических и социальных дискуссиях, сохраняя при этом контроль над своей личностью и личной информацией. ",
        ],
      },
      {
        tag: "p",
        children: [
          " В настоящей Политике конфиденциальности объясняется, как и почему Agora Citizen Network («Агора», «мы», «нас» или «ZKorum») собирает, использует и передает информацию о вас, когда вы используете наш веб-сайт и мобильные приложения (совместно именуемые «Услуги») или когда вы иным образом взаимодействуете с нами. Мы несем ответственность за сбор и использование ваших личных данных в порядке, описанном в настоящей политике конфиденциальности. ",
        ],
      },
      {
        tag: "p",
        children: [
          " Если у вас есть какие-либо вопросы по этому поводу, пожалуйста, свяжитесь с нами по электронной почте: ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          ". Если вы проживаете в Калифорнии, мы хотели бы обратить ваше внимание на статью 7. ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["Агора — публичная платформа"],
          },
          {
            tag: "p",
            children: [
              " Большая часть контента на Agora общедоступна, а это означает, что ваш профиль, сообщения, голоса и мнения может просмотреть любой, даже без учетной записи. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Вам не требуется создавать учетную запись для просмотра Agora. Чтобы участвовать в обсуждениях и взаимодействовать с контентом, вы можете: ",
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
                    children: ["Просмотр в качестве гостя:"],
                  },
                  " Вы можете исследовать контент и участвовать в ограниченном взаимодействии без регистрации. Когда вы впервые взаимодействуете с платформой (например, публикуете сообщения, голосуете), автоматически генерируется и сохраняется на вашем устройстве криптографический идентификатор конкретного устройства (DID), а затем он привязывается к учетной записи пользователя на наших серверах. Этот DID служит постоянным идентификатором сеанса вашего устройства. Гостевые учетные записи не проверяются, и доступ к ним возможен только с исходного устройства. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Программный вход (проверка на основе сеанса):"],
                  },
                  " Подтвердите с помощью ",
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " для проверки билетов на мероприятия с использованием группового подтверждения учетных данных (GPC). Это добавляет временную проверку на основе событий в вашу учетную запись, но НЕ создает зарегистрированную учетную запись. Программный вход позволяет подтвердить участие в мероприятии, не раскрывая детали билета. Вы можете перейти на постоянную зарегистрированную учетную запись в любое время, добавив проверку телефона или паспорта. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "Жесткий вход (постоянная зарегистрированная учетная запись):",
                    ],
                  },
                  " Создайте постоянный подтвержденный аккаунт одним из следующих способов: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["Номер телефона:"],
                          },
                          " Подтверждено одноразовым кодом, отправленным по SMS. ",
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
                          ": Проверка доказательства с нулевым разглашением (ZKP) на основе паспорта. ",
                        ],
                      },
                    ],
                  },
                  " Эти методы создают зарегистрированную учетную запись и гарантируют проверку вашей личности при сохранении конфиденциальности. Agora получает только криптографические доказательства, подтверждающие уникальность и право на участие, а не соответствующие документы, удостоверяющие личность или информацию о билетах. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["Обновления аккаунта:"],
              },
              " Когда вы переходите с гостевого или программного входа на жесткую проверку (телефон или паспорт), весь ваш существующий контент (публикации, голоса, подписки, проверки событий) автоматически переносится в вашу подтвержденную учетную запись, а ваша предыдущая непроверенная учетная запись удаляется. Это слияние является постоянным и не может быть отменено. Вы не можете объединить две подтвержденные учетные записи по соображениям безопасности. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Ваша учетная запись Agora будет иметь имя пользователя, которое можно выбрать вручную или сгенерировать автоматически. Имена пользователей являются общедоступными, но не обязательно должны быть связаны с вашей реальной личностью. Вы также можете предоставить дополнительные данные профиля, такие как предпочтительные темы, которые можно изменить или удалить в любое время. ",
            ],
          },
          {
            tag: "p",
            children: [
              " Большая часть контента в Agora Citizen Network является общедоступной. Когда вы отправляете контент (например, публикацию, мнение или реакцию), он виден всем пользователям и может быть проиндексирован поисковыми системами. Agora также использует криптографические доказательства для обеспечения проверки данных, что означает, что определенные взаимодействия (например, создание учетной записи и участие) публично фиксируются децентрализованным образом. ",
            ],
          },
          {
            tag: "h3",
            children: ["Ваш профиль на Агоре"],
          },
          {
            tag: "p",
            children: [
              " Ваш профиль Agora по умолчанию является общедоступным и содержит такую ​​информацию, как: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["Имя пользователя"],
              },
              {
                tag: "li",
                children: ["Уникальный идентификатор пользователя (UUID)"],
              },
              {
                tag: "li",
                children: [
                  " История активности (публикации, мнения, взаимодействия (смайлики, действия «согласие/несогласие», хлопки, голоса «за» или «против»), ответы на опросы и помеченный/отмеченный контент ",
                ],
              },
              {
                tag: "li",
                children: ["Сообщества и интересующие темы"],
              },
              {
                tag: "li",
                children: [
                  " Статус проверки: ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          " Подтверждено с помощью паспорта (обнулитель пользователя и двунаправленные удостоверения личности) ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          " Проверено по номеру телефона (привязка подтверждения, подписанного Agora: ключи к UUID пользователя) ",
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
              " Пользователи имеют возможность публиковать сообщения анонимно. При использовании этой функции имена пользователей и изображения профиля заменяются общими идентификаторами, а контент не привязывается публично к профилю пользователя. ",
            ],
          },
          {
            tag: "h3",
            children: ["Сторонние сервисы"],
          },
          {
            tag: "p",
            children: [
              " Агора использует сторонние сервисы, которые могут обрабатывать IP-адреса и другие персональные данные. Там, где это возможно, Agora настраивает службы для использования региональных конечных точек ЕС или использует поставщиков из ЕС. Эти службы имеют собственную политику конфиденциальности, и пользователям рекомендуется ознакомиться с ней. ",
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
                  " (глобальный) для доказательств идентичности с нулевым разглашением. Может обрабатывать IP-адреса для обеспечения безопасности и обслуживания. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " (глобальный, с открытым исходным кодом) для билетов на мероприятия и проверки личности с использованием группового подтверждения учетных данных (GPC). Может обрабатывать IP-адреса для сервисных операций. Zupass использует Simple Analytics для веб-аналитики, обеспечивающей конфиденциальность. ",
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
                  " (глобальный) для проверки номера телефона. Twilio хранит номера телефонов в открытом виде и обрабатывает IP-адреса для предотвращения мошенничества. Обратите внимание, что Agora хранит в нашей базе данных только хешированные номера телефонов (никогда в открытом виде), а Twilio сохраняет номера телефонов в соответствии со своей собственной политикой конфиденциальности. ",
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
                  " (глобально) для защиты и безопасности от DDoS. Обрабатывает IP-адреса. ",
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
                  " (ЕС: Дублин и Париж) за хостинговую инфраструктуру, хранение данных и вычислительные ресурсы. Обрабатывает IP-адреса для операций инфраструктуры. ",
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
                  " (США, центральный регион США1) для перевода пользовательских сообщений и контента, созданного на платформе, с помощью искусственного интеллекта. Может обрабатывать IP-адреса для операций инфраструктуры. ",
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
                  " (в ЕС) для веб-аналитики, обеспечивающей конфиденциальность. Временно обрабатывает IP-адреса для подсчета посетителей, но не сохраняет их (подробную информацию см. в их политике в отношении данных). ",
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
                  " (серверы ЕС) для отслеживания ошибок и отчетов о сбоях. Обрабатывает IP-адреса в целях отладки. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Службы, помеченные как «глобальные», работают с соответствующими гарантиями GDPR, как описано в статье 3. Пользователям, обеспокоенным конфиденциальностью IP-адресов, рекомендуется использовать Tor или другие смешанные решения при доступе к Agora. ",
            ],
          },
          {
            tag: "h3",
            children: ["Файлы cookie и аналитика"],
          },
          {
            tag: "p",
            children: [
              " Agora не использует рекламные файлы cookie или файлы cookie межсайтового отслеживания, а также не продает данные для рекламы. Мы используем Plausible Analytics, аналитическую службу в ЕС, которая не использует файлы cookie, и Sentry для ограниченной телеметрии ошибок и производительности. Для получения более подробной информации посетите ",
              {
                tag: "a",
                children: ["Plausible Analytics"],
                href: "https://plausible.io/about",
                external: true,
              },
              ". ",
            ],
          },
          {
            tag: "p",
            children: [
              " Мы используем только файлы cookie сеанса/аутентификации, которые строго необходимы для функционирования веб-сайта. ",
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
              "1. Когда применяется данная политика конфиденциальности?",
            ],
          },
          {
            tag: "p",
            children: [
              "1.1. Мы собираем и используем ваши персональные данные, когда вы:",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  "используйте наш сайт (https://agoracitizen.network/);",
                ],
              },
              {
                tag: "li",
                children: ["используйте наше мобильное приложение; и"],
              },
              {
                tag: "li",
                children: [
                  " связываться с нами по электронной почте или любому другому цифровому каналу связи. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 1.2. В настоящую политику конфиденциальности могут быть внесены изменения, как указано в статье 8. ",
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
              "2. Какие персональные данные мы обрабатываем и почему?",
            ],
          },
          {
            tag: "p",
            children: [
              " Мы будем обрабатывать ваши персональные данные только для конкретной цели и в пределах, разрешенных законом. Ниже мы объясним, в каких случаях мы собираем и используем ваши персональные данные. Если мы не получим ваши персональные данные непосредственно от вас, мы также сообщим вам об этом ниже. ",
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
                        children: ["Почему?"],
                      },
                      {
                        tag: "th",
                        children: ["Правовая основа?"],
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
                          " Криптографический открытый ключ (формат Did:key), созданный и сохраненный на вашем устройстве, а затем связанный с вашей учетной записью пользователя на наших серверах. DID служат постоянными идентификаторами сеанса, которые подключают ваше устройство к вашей учетной записи. DID сохраняются для всех пользователей (гостевых, программных и жестких) для поддержания сеансов на основе устройств. ",
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
                              "Программный вход — проверка билетов на мероприятия (Zupass)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Когда вы подтверждаете информацию с помощью Zupass, мы сохраняем нуллификатор конкретного события (идентификатор сохранения конфиденциальности, полученный из вашего билета) и пул события. Это доказывает участие в мероприятии без раскрытия деталей билета. Программный вход НЕ создает зарегистрированную учетную запись, но позволяет проводить проверку на основе сеанса, которую можно повысить до постоянной регистрации. ",
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
                          " Для аутентификации пользователей и доставки одноразовых кодов проверки. Номера телефонов хранятся в нашей базе данных в виде криптографических хешей. Twilio (наш провайдер SMS) обрабатывает и сохраняет номера телефонов в открытом виде для доставки кодов подтверждения. Проверка телефона создает постоянную зарегистрированную учетную запись. ",
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
                              "Данные аутентификации — доказательство с нулевым разглашением паспорта (Rarimo)",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Чтобы проверить право пользователя на участие посредством проверки паспорта с сохранением конфиденциальности. Мы храним нуллификатор, полученный из паспорта, код страны гражданства и пол. Агора получает только криптографическое подтверждение, подтверждающее уникальность и право на участие, а не номер вашего паспорта, имя, фотографию или другие паспортные данные. Проверка паспорта создает постоянный зарегистрированный аккаунт. ",
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
                            children: ["Информация об аккаунте"],
                          },
                          " (Имя пользователя, предпочитаемый язык, пол и национальность (если паспорт подтвержден)) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Чтобы создавать учетные записи пользователей и управлять ими, настройте пользовательский интерфейс. Эти данные будут агрегированы для целей аналитики, анализа и монетизации. ",
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
                          " (Сообщения, Мнения, Ответы, Реакции, опросы) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Для облегчения обсуждений, взаимодействия с пользователями и взаимодействия на платформе. Эти данные будут агрегированы для целей аналитики, анализа и монетизации. ",
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
                          " Для защиты инфраструктуры платформы, предотвращения вредоносных действий и обеспечения операционной безопасности (например, защиты от атак распределенного отказа в обслуживании (DDoS)). ",
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
                          " (UUID пользователя, имена пользователей, метаданные запроса, журналы ошибок, временные метки) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Для мониторинга системы, отладки, оптимизации производительности и повышения надежности обслуживания. Мы НЕ регистрируем конфиденциальные личные данные, такие как номера телефонов, в журналах приложений. ",
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
                            children: ["Коммуникация"],
                          },
                          " (Личные данные и контактные данные, предоставленные вами нам, содержание сообщения, технические детали самого сообщения (например, дата и время) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Для обеспечения связи между вами и нами (например, когда вы связываетесь с нами через социальные сети, телефон или электронную почту). ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Наш законный интерес в том, чтобы иметь возможность отвечать на запросы, вопросы или комментарии или заранее связываться с вами по вопросам любого рода. ",
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
                            children: ["Вышеупомянутые персональные данные."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Для соблюдения наших юридических обязательств или для выполнения любого разумного запроса компетентных органов полиции, судебных органов, государственных учреждений или органов, включая компетентные органы по защите данных. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Наше юридическое обязательство."],
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
                            children: ["Вышеупомянутые персональные данные."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Для предотвращения, обнаружения и борьбы с мошенничеством или другой незаконной или несанкционированной деятельностью. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Наше юридическое обязательство."],
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
                            children: ["Вышеупомянутые персональные данные."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          "Чтобы защитить себя в судебных разбирательствах.",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Наш законный интерес в использовании ваших личных данных в этих разбирательствах. ",
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
                            children: ["Вышеупомянутые персональные данные."],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Информировать третью сторону в контексте возможного слияния, приобретения или разделения этой третьей стороной, даже если эта третья сторона находится за пределами ЕС. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Наш законный интерес в заключении деловых сделок. ",
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
                              "Обновление учетной записи/объединение данных",
                            ],
                          },
                          " (Пользовательский контент, устройства, билеты на мероприятия, настройки) ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " Когда вы переходите с гостевого или программного входа на жесткую проверку (телефон или паспорт), все ваши данные переносятся в проверенную учетную запись, а предыдущая учетная запись удаляется. Это обеспечивает непрерывность вашего контента и истории активности, а также добавляет постоянную проверку. ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["Ваше согласие и наш законный интерес."],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["3. Кому мы передаем ваши персональные данные?"],
          },
          {
            tag: "p",
            children: [
              " 3.1. В принципе, мы не передаем ваши персональные данные никому, кроме лиц, которые у нас работают, а также поставщиков, которые помогают нам обрабатывать ваши персональные данные. Любой, кто имеет доступ к вашим личным данным, всегда будет связан строгими юридическими или договорными обязательствами по обеспечению безопасности и конфиденциальности ваших личных данных. Это означает, что ваши персональные данные получат только следующие категории получателей: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["Ты;"],
              },
              {
                tag: "li",
                children: ["Наши сотрудники и поставщики; и"],
              },
              {
                tag: "li",
                children: [
                  " Государственные или судебные органы в той степени, в которой мы обязаны передавать им ваши персональные данные (например, налоговые органы, полиция или судебные органы). ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2. Мы отправляем ваши персональные данные за пределы Европейской экономической зоны (ЕЭЗ) (Европейская экономическая зона состоит из ЕС, Лихтенштейна, Норвегии и Исландии). Мы передадим эти персональные данные за пределы ЕЭЗ для связи с категориями получателей ваших персональных данных, как это определено в настоящей статье 3. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3. Мы будем применять соответствующие меры безопасности для защиты ваших личных данных во время передачи, например, работать только с обработчиками, расположенными в странах, которые имеют решение об адекватности Европейской комиссии или сертифицированы в соответствии с утвержденной структурой, такой как ЕС-США. Структура конфиденциальности данных. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4. Если для страны назначения не существует решения Европейской комиссии об адекватности, мы будем использовать соответствующие меры безопасности, как описано в статье 46 GDPR, при передаче персональных данных, и такие передачи, а также технические и организационные меры безопасности будут документироваться в соответствии со статьей 30 GDPR. Например, мы используем стандартные договорные положения для защиты передачи персональных данных в страны за пределами Европейской экономической зоны (ЕЭЗ), гарантируя тем самым, что эквивалентный уровень защиты данных применяется к вашим личным данным, даже если закон ЕС о защите данных не применим напрямую. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. Агора может передавать анонимные и/или агрегированные данные организациям за пределами юрисдикции, в которой вы их предоставляете. В случае такой передачи Агора обеспечит наличие мер безопасности и целостности ваших данных, а также всех прав в отношении ваших личных данных, которыми вы можете обладать в соответствии с применимым обязательным законодательством. ",
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
              " 4.1. Ваши персональные данные будут обрабатываться только до тех пор, пока это необходимо для достижения описанных выше целей или, если мы запросили ваше согласие, до тех пор, пока вы не отзовете свое согласие. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2. Как правило, мы деидентифицируем ваши персональные данные, когда они больше не нужны для целей, описанных выше. Однако мы не можем удалить ваши персональные данные, если существует юридическое или нормативное обязательство, а также судебное или административное постановление, препятствующее нам сделать это. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3. Мы храним все персональные данные, собранные через наш веб-сайт или мобильное приложение, до тех пор, пока это необходимо для защиты законных интересов, указанных в статье 2, или до тех пор, пока ваше согласие не будет отозвано. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4. Все персональные данные, которые мы собираем в ходе взаимодействия с вами через социальные сети, телефон, электронную почту или другие цифровые каналы связи, будут храниться столько времени, сколько необходимо для связи с вами, а также для ведения исторического учета наших сообщений. Это позволяет нам вернуться к предыдущим сообщениям, когда вы вернетесь к нам с новыми вопросами, запросами, комментариями или другими предложениями. ",
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
              "5. Как мы обеспечиваем безопасность ваших личных данных?",
            ],
          },
          {
            tag: "p",
            children: [
              " 5.1. В Agora защита ваших личных данных является главным приоритетом. Мы реализовали ряд технических и организационных мер для обеспечения безопасности всех обрабатываемых персональных данных. Эти меры включают: ",
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
                    children: [
                      "Минимизация данных и конфиденциальность задуманы:",
                    ],
                  },
                  " Мы собираем только минимум персональных данных, необходимых для функционирования платформы, по возможности избегая хранения конфиденциальной информации. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Шифрование и псевдонимизация:"],
                  },
                  " Персональные данные зашифрованы, а для защиты личности пользователей применяются методы псевдонимизации. Например, номера телефонов никогда не сохраняются в виде открытого текста; вместо этого мы применяем криптографический «перец» и хешируем их, чтобы предотвратить несанкционированный доступ. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Аутентификация с нулевым разглашением:"],
                  },
                  " Agora использует доказательство с нулевым разглашением (ZKP) для проверки паспортов, гарантируя, что пользователи могут доказать свое право на участие, не раскрывая конфиденциальную личную информацию. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "Децентрализованные криптографические доказательства:",
                    ],
                  },
                  " Определенные взаимодействия пользователей (например, создание учетной записи и участие) можно публично проверить с помощью криптографических доказательств без раскрытия личности пользователя. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Безопасная аутентификация:"],
                  },
                  " Мы не храним пароли. Вместо этого аутентификация осуществляется с помощью одноразовых кодов проверки или криптографических ключей, что снижает риск утечки учетных данных. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Защита инфраструктуры:"],
                  },
                  " Наша платформа защищена от киберугроз с помощью защиты от DDoS, контроля доступа и мониторинга сети для обнаружения и смягчения атак. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Прозрачность и пользовательский контроль:"],
                  },
                  " Пользователи имеют возможность управлять своими личными данными, удалять свою учетную запись и контролировать обработку своей информации. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Регулярные оценки безопасности:"],
                  },
                  " Наши меры безопасности периодически пересматриваются и обновляются для устранения возникающих угроз и улучшения защиты данных. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Контролируемый доступ к журналам и аналитике:"],
                  },
                  " Для мониторинга производительности и улучшения пользовательского опыта используются только агрегированные и анонимизированные аналитические данные. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Избыточность данных и резервное копирование:"],
                  },
                  " Данные надежно хранятся на серверах AWS в Дублине, Ирландия, и реплицируются в Париже, Франция, в целях аварийного восстановления со строгим контролем доступа и мерами шифрования. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Ограниченный сбор метаданных:"],
                  },
                  " Журналы приложений Agora не записывают IP-адреса намеренно. Поставщики инфраструктуры и мониторинга ошибок, включая Cloudflare, поставщиков облачных услуг и Sentry, могут обрабатывать IP-адреса для обеспечения безопасности, операций или отладки. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Анонимный перевод AI:"],
                  },
                  " Контент, отправляемый в Google Cloud Platform для перевода, передается «как есть» без каких-либо сопутствующих метаданных (идентификаторов пользователей и т. д.) и обрабатывается в США (регион us-central1). Используемая нами служба перевода на базе Google Cloud LLM в настоящее время недоступна в регионе ЕС. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "Использование ",
                      {
                        tag: "a",
                        children: ["Sentry.io"],
                        href: "https://sentry.io/privacy/",
                        external: true,
                      },
                      " для отчетов о сбоях с ограниченной конфиденциальностью:",
                    ],
                  },
                  " Agora использует Sentry (размещенный на серверах ЕС) для отслеживания ошибок и отчетов о сбоях. Регулярные сеансы не загружаются для воспроизведения сеанса; при возникновении ошибки могут быть загружены буферизованные данные о недавнем взаимодействии, чтобы помочь диагностировать сбой. Воспроизведение маскирует текст и вводимые данные, блокирует мультимедиа, отключает захват тела в сети и маскирует настроенный текст и атрибуты формы перед записью. События навигации и пользовательской сетевой записи очищаются, а список посещенных URL-адресов события Replay очищается перед загрузкой. Собственные URL-адреса Agora и ZKorum могут сохранять пути и идентификаторы псевдонимных маршрутов, но учетные данные, строки запросов и фрагменты удаляются. Внешние URL-адреса сводятся к их источникам, а небезопасные схемы URL-адресов удаляются. События ошибок также удаляют URL-адреса запросов и произвольные дополнительные данные, сохраняют только явный список разрешенных технических контекстов и опускают навигационные цепочки консоли и пользовательского интерфейса. Для одной конкретной диагностики переполнения стека узко ограниченное вложение может включать структурные флаги макета страницы, но не состояние OTP, черновики, состояние подключения, идентификаторы или пользовательский контент. Отчеты о воспроизведении и ошибках по-прежнему могут содержать структурный DOM, псевдонимные пути маршрутов, происхождение ресурсов, технические метаданные и метаданные взаимодействия, а Sentry может обрабатывать IP-адреса, как описано в его политике конфиденциальности. Sentry не использует файлы cookie для отслеживания. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Псевдонимное ведение журнала для мониторинга:"],
                  },
                  " Agora собирает псевдонимные технические данные для мониторинга системы, отладки и оптимизации производительности. Сюда входят UUID пользователей, имена пользователей, метаданные запросов и журналы ошибок. Мы НЕ регистрируем конфиденциальные личные данные, такие как номера телефонов, в журналах наших приложений. Однако сторонние сервисы, такие как Twilio, AWS, Cloudflare и другие, могут хранить данные (включая IP-адреса и, в случае Twilio, номера телефонов) в соответствии со своими собственными политиками конфиденциальности и графиками хранения. ",
                ],
              },
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. Ваши права в отношении ваших личных данных"],
          },
          {
            tag: "p",
            children: [
              " 6.1. Когда мы собираем и используем ваши персональные данные, вы получаете ряд прав, которыми вы можете воспользоваться в порядке, описанном ниже. Обратите внимание: когда вы захотите воспользоваться своим правом, мы попросим вас предоставить удостоверение личности. Мы делаем это, чтобы предотвратить утечку персональных данных (например, потому, что неуполномоченное лицо выдает себя за вас и осуществляет права от вашего имени). ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2. В зависимости от обработки и правовой основы у вас как субъекта данных есть ряд возможностей сохранять контроль над своими личными данными: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["право на доступ к вашим данным"],
              },
              {
                tag: "li",
                children: ["право вносить изменения в ваши данные"],
              },
              {
                tag: "li",
                children: [
                  "право возражать против обработки ваших персональных данных",
                ],
              },
              {
                tag: "li",
                children: ["право ограничить обработку данных"],
              },
              {
                tag: "li",
                children: ["право на удаление ваших данных"],
              },
              {
                tag: "li",
                children: ["право отозвать ранее данное согласие"],
              },
              {
                tag: "li",
                children: ["право на передачу ваших данных"],
              },
              {
                tag: "li",
                children: [
                  " право подавать жалобы в компетентный орган по защите данных. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3. Мы должны обратить ваше внимание на то, что эти права не всегда являются абсолютными, что в определенных обстоятельствах мы имеем право или даже обязаны по закону продолжать обработку ваших личных данных и что поэтому мы не всегда можем выполнить (полностью) ваш запрос. В таких случаях мы сообщим вам об этом соответствующим образом. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4. Вы можете воспользоваться этими правами бесплатно, за исключением случаев злоупотребления и в этом случае мы имеем право взимать административный сбор за выполнение вашего запроса. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5. Обратите внимание, что вы можете удалить свои собственные реакции, хлопки, голоса «за» или «против», ответы на опросы, действия «согласить/не согласиться», разговоры, мнения, ответы, информацию «просмотров» и язык, на котором говорят (хотя бы один должен остаться). ",
            ],
          },
          {
            tag: "h3",
            children: ["6.6. Записи безопасности:"],
          },
          {
            tag: "p",
            children: [
              " Некоторые записи безопасности сохраняются после удаления учетной записи для защиты службы: ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " Кратковременные хеши токенов сети авторизации, управляемой пользователем (UCAN), используемые для защиты от атак повторного воспроизведения. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " Эти записи хранятся только в течение периода, необходимого для предотвращения повторного использования токенов авторизации. ",
            ],
          },
          {
            tag: "h3",
            children: ["6.7. Как удалить свою учетную запись:"],
          },
          {
            tag: "p",
            children: [
              " Когда вы удаляете свою учетную запись, это ",
              {
                tag: "strong",
                children: ["сразу недоступен"],
              },
              " и не подлежит восстановлению. Процесс удаления происходит по следующему графику: ",
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
                    children: ["Немедленный:"],
                  },
                  " Ваша учетная запись будет удалена без возможности восстановления и станет недоступной. Все устройства отключены. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Через 15 дней:"],
                  },
                  " Данные вашей учетной записи будут окончательно удалены (жестко удалены) из нашей базы данных. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["До 30 дней после этого:"],
                  },
                  " Данные могут сохраняться в зашифрованных резервных копиях в целях аварийного восстановления. ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["Что происходит при удалении:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " Ваша учетная запись становится немедленно недоступной и не может быть восстановлена. ",
                ],
              },
              {
                tag: "li",
                children: [
                  "Все устройства выходят из системы, и ваш сеанс завершается.",
                ],
              },
              {
                tag: "li",
                children: [
                  " Ваши учетные данные для проверки (номер телефона, паспорт, билеты на мероприятия) аннулированы. ",
                ],
              },
              {
                tag: "li",
                children: [
                  " Ваш контент (публикации, голоса, мнения) остается на платформе, но больше не связан с вашей учетной записью публично. ",
                ],
              },
              {
                tag: "li",
                children: [
                  " Через 15 дней данные вашей учетной записи будут навсегда удалены из нашей базы данных. ",
                ],
              },
              {
                tag: "li",
                children: [
                  " Криптографические доказательства действий учетной записи не сохраняются после проверки. ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["Хранение данных третьих лиц:"],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Резервные копии базы данных:"],
                  },
                  " Данные могут храниться в зашифрованных резервных копиях AWS до 30 дней после 15-дневного принудительного удаления. ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Твилио:"],
                  },
                  " Записи о проверке телефона сохраняются в соответствии с ",
                  {
                    tag: "a",
                    children: ["Политика конфиденциальности Twilio"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["Сторонние сервисы:"],
                  },
                  " Журналы и данные в Sentry, Cloudflare, AWS и Google Cloud могут храниться в соответствии с их соответствующими политиками конфиденциальности. ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["Важный:"],
              },
              " Удаление происходит немедленно и необратимо. Вы не сможете восстановить свою учетную запись после запроса на удаление. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8. Если у вас есть жалоба на обработку нами ваших персональных данных, вы всегда можете связаться с нами по адресу: ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              ". Если вы не удовлетворены нашим ответом, вы можете подать жалобу в компетентный орган по защите данных, то есть в Национальную комиссию Франции по информатике и свободам (",
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
              " 7.1. В соответствии с Законом Калифорнии о конфиденциальности потребителей от 2018 года («CCPA») мы предоставляем жителям Калифорнии следующую дополнительную информацию. В течение предыдущих 12 месяцев мы собирали, использовали и передавали категории вашей личной информации, описанные выше в настоящей политике конфиденциальности, для наших операционных деловых целей. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2. Мы не продавали вашу личную информацию, а это означает, что мы не раскрывали вашу личную информацию за денежное или иное ценное вознаграждение. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3. Вы имеете право запросить доступ к вашей личной информации или ее удаление, а также потребовать прозрачности в отношении нашей политики конфиденциальности. Если вы хотите воспользоваться своими правами в соответствии с CCPA, ознакомьтесь со статьей 6. Как только мы получим ваш запрос, мы проверим его, запросив информацию для подтверждения вашей личности, в том числе запросив у вас дополнительную информацию. Если вы хотите использовать агента, зарегистрированного у государственного секретаря штата Калифорния, для осуществления ваших прав, мы можем запросить доказательства того, что вы предоставили такому агенту доверенность или что агент иным образом имеет действительные письменные полномочия на подачу запросов на реализацию прав от вашего имени. ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4. Если вы решите воспользоваться своими правами, мы не будем взимать с вас разные цены или предоставлять услуги разного качества для реализации ваших прав, если только такие различия не разрешены законом. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["8. Изменения в настоящей политике конфиденциальности"],
          },
          {
            tag: "p",
            children: [
              " 8.1. Мы можем изменить данную политику конфиденциальности по собственной инициативе в любое время. Если существенные изменения в настоящей политике конфиденциальности могут повлиять на обработку ваших личных данных, мы сообщим вам об этих изменениях способом, которым мы обычно общаемся с вами (например, по электронной почте или через сообщение на платформе). ",
            ],
          },
          {
            tag: "p",
            children: [
              " 8.2. Мы приглашаем вас ознакомиться с последней версией настоящей политики конфиденциальности на нашем веб-сайте (https://agoracitizen.network/). В политике конфиденциальности указана дата последнего изменения нашей политики конфиденциальности. ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. Есть ли у вас вопросы?"],
          },
          {
            tag: "p",
            children: [
              " 9.1. Если у вас возникнут дополнительные вопросы по поводу обработки ваших персональных данных, пожалуйста, свяжитесь с нашим менеджером по конфиденциальности. Вы можете связаться с нашим менеджером по конфиденциальности по электронной почте: ",
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
        "本隐私政策由自动翻译生成。英文版本是唯一具有权威性的版本，如有任何差异，应仅以英文版本为准。",
      viewEnglish: "查看具有权威性的英文版本",
      returnToTranslation: "返回翻译版本",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["最后更新于"],
          },
          ": 2025/11/11 (年/月/日)",
        ],
      },
      {
        tag: "p",
        children: [
          " Agora 公民网络由以下公司开发 ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          "。在 ZKorum，我们相信隐私是一项基本权利。我们的使命是让用户能够参与政治和社会讨论，同时保持对其身份和个人信息的控制。 ",
        ],
      },
      {
        tag: "p",
        children: [
          " 本隐私政策解释了当您使用我们的网站和移动应用程序（统称为“服务”）或以其他方式与我们互动时，Agora Citizen Network（“Agora”、“我们”、“我们”或“ZKorum”）如何以及为何收集、使用和共享有关您的信息。我们负责按照本隐私政策中说明的方式收集和使用您的个人数据。 ",
        ],
      },
      {
        tag: "p",
        children: [
          " 如果您对此有任何疑问，请通过电子邮件联系我们： ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          "。如果您是加利福尼亚州居民，我们希望提请您注意第 7 条。 ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["Agora是一个公共平台"],
          },
          {
            tag: "p",
            children: [
              " Agora 上的大多数内容都是可公开访问的，这意味着任何人都可以查看您的个人资料、帖子、投票和意见，即使没有帐户。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 您无需创建帐户即可浏览 Agora。要参与讨论并与内容互动，您可以： ",
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
                    children: ["以访客身份浏览："],
                  },
                  " 您无需注册即可探索内容并参与有限的互动。当您首次与平台交互（例如发帖、投票）时，系统会自动生成设备特定的加密标识符 (DID) 并将其存储在您的设备上，然后链接到我们服务器上的用户帐户。此 DID 用作您设备的永久会话标识符。访客帐户未经验证，只能从原始设备访问。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["软登录（基于会话的验证）："],
                  },
                  " 验证使用 ",
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " 使用团体凭证证明 (GPC) 进行活动门票验证。这会向您的帐户添加临时的基于事件的验证，但不会创建注册帐户。软登录允许您在不透露门票详细信息的情况下证明活动参与情况。您可以随时通过添加电话或护照验证来升级为永久注册帐户。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["硬登录（永久注册账号）："],
                  },
                  " 使用以下方法之一创建永久验证帐户： ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["电话号码："],
                          },
                          " 通过短信发送的一次性代码进行验证 ",
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
                  " 这些方法创建一个注册帐户并确保您的身份得到验证，同时维护隐私。 Agora 仅收到确认唯一性和资格的加密证明，而不会收到底层身份证明文件或票证信息。 ",
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
              " 当您从访客或软登录升级到硬验证（电话或护照）时，您现有的所有内容（帖子、投票、关注、事件验证）将自动转移到您已验证的帐户，并且您之前未经验证的帐户将被删除。此合并是永久性的且无法撤消。出于安全原因，您无法合并两个经过验证的帐户。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 您的 Agora 帐户将有一个用户名，可以手动选择或自动生成。用户名是公开的，但不需要与您的真实身份相关联。您还可以提供可选的个人资料详细信息，例如首选主题，这些详细信息可以随时修改或删除。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " Agora Citizen Network 上的大部分内容都是公开的。当您提交内容（例如帖子、意见或反应）时，所有用户都可以看到该内容，并且可能会被搜索引擎编入索引。 Agora 还利用密码学证明来提供数据可验证性，这意味着某些交互（例如账户创建和参与）以去中心化的方式公开记录。 ",
            ],
          },
          {
            tag: "h3",
            children: ["您的 Agora 个人资料"],
          },
          {
            tag: "p",
            children: [" 您的 Agora 个人资料默认是公开的，包含以下信息： "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["用户名"],
              },
              {
                tag: "li",
                children: ["唯一用户标识符 (UUID)"],
              },
              {
                tag: "li",
                children: [
                  " 活动历史记录（帖子、意见、互动（表情符号、同意/不同意操作、鼓掌、赞成/反对）、调查回复和标记/报告的内容 ",
                ],
              },
              {
                tag: "li",
                children: ["感兴趣的社区和主题"],
              },
              {
                tag: "li",
                children: [
                  " 验证状态： ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          " 通过护照证明进行验证（用户无效和双向身份证明） ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          " 通过电话号码验证（Agora 签名证明绑定 did:keys to user UUID） ",
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
              " 用户可以选择匿名发帖。使用此功能时，用户名和个人资料图片将替换为通用标识符，并且内容不会公开链接到用户的个人资料。 ",
            ],
          },
          {
            tag: "h3",
            children: ["第三方服务"],
          },
          {
            tag: "p",
            children: [
              " Agora 使用可能处理 IP 地址和其他个人数据的第三方服务。在可能的情况下，Agora 将服务配置为使用欧盟区域端点或使用基于欧盟的提供商。这些服务有自己的隐私政策，鼓励用户查看它们。 ",
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
                  " （全局）用于零知识身份证明。可以处理 IP 地址以实现安全和服务操作。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " （全球，开源）使用团体凭证证明 (GPC) 进行活动门票和身份验证。可以处理 IP 地址以进行服务操作。 Zupass 使用 Simple Analytics 进行隐私友好的网络分析。 ",
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
                  " （全球）用于电话号码验证。 Twilio 以明文形式存储电话号码并处理 IP 地址以防止欺诈。请注意，Agora 仅在我们的数据库中存储散列电话号码（从不以明文形式），但 Twilio 根据其自己的隐私政策保留电话号码。 ",
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
                  " （全球）DDoS 防护和安全。处理 IP 地址。 ",
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
                  " （欧盟：都柏林和巴黎）用于托管基础设施、数据存储和计算资源。处理基础设施操作的 IP 地址。 ",
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
                  " （位于美国，us-central1 区域）用于对用户帖子和平台生成的内容进行人工智能翻译。可以处理基础设施操作的 IP 地址。 ",
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
                  " （基于欧盟）用于隐私友好的网络分析。临时处理 IP 地址以进行访客计数，但不存储它们（有关详细信息，请参阅其数据政策）。 ",
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
                  " （欧盟服务器）用于错误跟踪和崩溃报告。出于调试目的处理 IP 地址。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 标记为“全球”的服务按照第 3 条中所述的适当 GDPR 保障措施运行。鼓励关注 IP 地址隐私的用户在访问 Agora 时使用 Tor 或其他 mixnet 解决方案。 ",
            ],
          },
          {
            tag: "h3",
            children: ["Cookie 和分析"],
          },
          {
            tag: "p",
            children: [
              " Agora 不使用广告或跨站跟踪 cookie，也不出售广告数据。我们使用 Plausible Analytics（一项基于欧盟的分析服务，不使用 cookie）和 Sentry 来限制错误和性能遥测。欲了解更多详情，请访问 ",
              {
                tag: "a",
                children: ["Plausible Analytics"],
                href: "https://plausible.io/about",
                external: true,
              },
              "。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 我们仅使用会话/身份验证 cookie，这是网站正常运行所必需的。 ",
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
              "1.1.当您执行以下操作时，我们会收集和使用您的个人数据：",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["使用我们的网站 (https://agoracitizen.network/)；"],
              },
              {
                tag: "li",
                children: ["使用我们的移动应用程序；和"],
              },
              {
                tag: "li",
                children: [" 通过电子邮件或任何其他数字通信渠道与我们沟通。 "],
              },
            ],
          },
          {
            tag: "p",
            children: [" 1.2.本隐私政策可根据第 8 条的规定进行修订。 "],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. 我们处理哪些个人数据以及为什么？"],
          },
          {
            tag: "p",
            children: [
              " 我们只会出于特定目的并在法律允许的范围内处理您的个人数据。我们在下面进一步解释我们在哪些情况下收集和使用您的个人数据。如果我们没有直接从您那里收到您的个人数据，我们也会在下面通知您。 ",
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
                        children: ["什么个人资料？"],
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
                            children: ["设备标识符（DID - 去中心化标识符）"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 生成并存储在您的设备上的加密公钥（did:key 格式），然后链接到您在我们服务器上的用户帐户。 DID 充当将您的设备连接到您的帐户的永久会话标识符。为所有用户（访客、软登录和硬登录）存储 DID，以维护基于设备的会话。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法权益"],
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
                            children: ["软登录 - 活动门票验证 (Zupass)"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 当您使用 Zupass 进行验证时，我们会存储特定于事件的无效符（从您的票证派生的隐私保护标识符）和事件 slug。这证明了活动的参与，而无需透露门票详细信息。软登录不会创建注册帐户，但允许基于会话的验证，该验证可以升级为永久注册。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法权益"],
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
                            children: ["身份验证数据 - 电话号码"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 对用户进行身份验证并提供一次性验证码。电话号码以加密哈希形式存储在我们的数据库中。 Twilio（我们的短信提供商）以明文形式处理和存储电话号码以提供验证码。电话验证创建永久注册帐户。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法权益"],
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
                            children: ["身份验证数据-护照零知识证明（Rarimo）"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 通过保护隐私的护照验证来验证用户的资格。我们存储源自护照的无效符、公民身份国家/地区代码和性别。 Agora 仅收到确认唯一性和资格的加密证明，而不会收到您的护照号码、姓名、照片或其他护照详细信息。护照验证创建永久注册帐户。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法权益"],
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
                          " （用户名、首选语言、性别和国籍（如果护照已验证）） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 要创建和管理用户帐户，自定义用户体验。这些数据将被汇总以用于分析、洞察和货币化目的。 ",
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
                            children: ["您采取的行动"],
                          },
                          " （帖子、意见、回复、反应、调查） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 促进平台上的讨论、用户互动和参与。这些数据将被汇总以用于分析、洞察和货币化目的。 ",
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
                        children: [
                          " 保护平台基础设施、防止恶意活动并确保操作安全（例如防止分布式拒绝服务 (DDoS) 攻击）。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法权益"],
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
                            children: ["化名技术数据"],
                          },
                          " （用户 UUID、用户名、请求元数据、错误日志、时间戳） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 用于系统监控、调试、性能优化、提高服务可靠性。我们不会在应用程序日志中记录敏感的 PII，例如电话号码。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法权益"],
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
                            children: ["沟通"],
                          },
                          " （您向我们提供的身份和联系方式、通信内容、通信本身的技术细节（例如日期和时间） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 为了实现您和我们之间的沟通（例如，当您通过社交媒体、电话或电子邮件联系我们时）。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 我们的合法权益是能够回复请求、问题或评论，或就任何类型的问题主动与您联系。 ",
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
                            children: ["上述个人资料。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 遵守我们的法律义务或遵守主管警察机关、司法机关、政府机构或团体（包括主管数据保护机关）的任何合理要求。 ",
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
                            children: ["上述个人资料。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 防止、发现和打击欺诈或其他非法或未经授权的活动。 ",
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
                            children: ["上述个人资料。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: ["在法律诉讼中为自己辩护。"],
                      },
                      {
                        tag: "td",
                        children: [
                          " 我们在这些诉讼中使用您的个人数据的合法权益。 ",
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
                            children: ["上述个人资料。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 在可能与第三方合并、收购或分拆的情况下通知第三方，即使该第三方位于欧盟境外。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 我们进行商业交易的合法权益。 "],
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
                          " （用户内容、设备、活动门票、偏好） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 当您从访客或软登录升级到硬验证（电话或护照）时，您的所有数据都会转移到您已验证的帐户，并且您之前的帐户将被删除。这可以确保您的内容和活动历史记录的连续性，同时添加永久验证。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["您的同意和我们的合法利益。"],
                      },
                    ],
                  },
                ],
              },
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
            children: [
              " 3.1.原则上，我们不会与为我们工作的人员以及帮助我​​们处理您的个人数据的供应商以外的任何人共享您的个人数据。任何有权访问您个人数据的人都将始终受到严格的法律或合同义务的约束，以确保您的个人数据安全和保密。这意味着只有以下类别的收件人才会收到您的个人数据： ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["你;"],
              },
              {
                tag: "li",
                children: ["我们的员工和供应商；和"],
              },
              {
                tag: "li",
                children: [
                  " 我们有义务与政府或司法当局共享您的个人数据（例如税务机关、警察或司法机关）。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2.我们将您的个人数据发送到欧洲经济区 (EEA) 之外（欧洲经济区由欧盟、列支敦士登、挪威和冰岛组成）。我们会将这些个人数据传输至 EEA 之外，以便与第 3 条中定义的个人数据接收者类别进行沟通。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3.我们将采取适当的保护措施来在传输过程中保护您的个人数据，例如仅与位于欧盟委员会充分性决定或经过欧盟-美国等批准框架认证的国家/地区的处理者合作。数据隐私框架。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4.如果欧盟委员会没有针对目的地国家/地区做出充分性决定，我们将在传输个人数据时使用 GDPR 第 46 条所述的适当保护措施，并且将根据 GDPR 第 30 条记录此类传输以及技术和组织安全措施。例如，我们使用标准合同条款来保护向欧洲经济区 (EEA) 以外的国家/地区传输个人数据，从而确保即使欧盟数据保护法不直接适用，也能确保您的个人数据获得同等级别的数据保护。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. Agora 可能会将匿名和/或汇总数据传输给您提供数据所在司法管辖区之外的组织。如果发生此类传输，Agora 将确保采取适当的保障措施，以确保您的数据的安全性和完整性，以及您根据适用的强制性法律可能享有的与您的个人数据相关的所有权利。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["4. 我们会将您的个人数据保留多长时间？"],
          },
          {
            tag: "p",
            children: [
              " 4.1.您的个人数据只会在实现上述目的所需的时间内进行处理，或者当我们征求您的同意时，直到您撤回同意为止。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2.作为一般规则，当上述目的不再需要您的个人数据时，我们将对其进行去识别化处理。但是，如果法律或监管义务或法院或行政命令阻止我们删除您的个人数据，我们将无法删除您的个人数据。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3.我们会保留通过我们的网站或移动应用程序收集的所有个人数据，保留时间为保护第 2 条所述合法利益所需的时间，或直至您撤回同意为止。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4.我们通过社交媒体、电话、电子邮件或其他数字通信渠道与您互动时收集的所有个人数据将在与您通信所需的时间内保留，同时也会保留我们通信的历史记录。当您向我们提出新问题、请求、评论或其他意见时，这使我们能够返回到之前的通信。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. 我们如何保证您的个人数据安全？"],
          },
          {
            tag: "p",
            children: [
              " 5.1.在 Agora，保护您的个人数据是首要任务。我们实施了一系列技术和组织措施，以确保处理的所有个人数据保持安全。这些措施包括： ",
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
                    children: ["数据最小化和隐私设计："],
                  },
                  " 我们仅收集平台功能所需的最少个人数据，尽可能避免存储敏感信息。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["加密和假名化："],
                  },
                  " 个人数据经过加密，并应用假名技术来保护用户身份。例如，电话号码永远不会以明文形式存储；相反，我们应用加密“pepper”并对它们进行哈希处理以防止未经授权的访问。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["零知识证明认证："],
                  },
                  " Agora 利用零知识证明（ZKP）进行护照验证，确保用户可以在不泄露敏感个人信息的情况下证明自己的资格。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["去中心化密码学证明："],
                  },
                  " 某些用户交互（例如帐户创建和参与）可以通过加密证明公开验证，而不会泄露用户身份。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["安全认证："],
                  },
                  " 我们不存储密码。相反，身份验证是通过一次性验证码或加密密钥来处理的，从而降低了凭证泄露的风险。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["基础设施保护："],
                  },
                  " 我们的平台使用 DDoS 保护、访问控制和网络监控来检测和减轻攻击，从而抵御网络威胁。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["透明度和用户控制："],
                  },
                  " 用户能够管理他们的个人数据、删除他们的帐户并控制他们的信息的处理方式。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["定期安全评估："],
                  },
                  " 我们的安全措施会定期审查和更新，以应对新出现的威胁并改善数据保护。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["对日志和分析的受控访问："],
                  },
                  " 仅聚合和匿名分析数据用于性能监控和改善用户体验。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["数据冗余和备份："],
                  },
                  " 数据安全地存储在爱尔兰都柏林的 AWS 服务器上，并在法国巴黎进行复制以用于灾难恢复，并采取严格的访问控制和加密措施。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["有限的元数据收集："],
                  },
                  " Agora 应用日志不会刻意记录 IP 地址。基础设施和错误监控提供商（包括 Cloudflare、云服务提供商和 Sentry）可能会出于安全、操作或调试目的处理 IP 地址。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["匿名人工智能翻译："],
                  },
                  " 发送到 Google Cloud Platform 进行翻译的内容按原样传输，不附带任何元数据（用户标识符等），并在美国（us-central1 区域）进行处理。我们使用的基于 Google Cloud LLM 的翻译服务目前在欧盟地区不可用。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "使用 ",
                      {
                        tag: "a",
                        children: ["Sentry.io"],
                        href: "https://sentry.io/privacy/",
                        external: true,
                      },
                      " 对于隐私减少的崩溃报告：",
                    ],
                  },
                  " Agora 利用 Sentry（托管在欧盟服务器上）进行错误跟踪和崩溃报告。常规会话不会上传用于会话重放；当发生错误时，可以上传缓冲的最近交互数据以帮助诊断故障。重放会在录制前屏蔽文本和输入、阻止媒体、禁用网络正文捕获以及屏蔽配置的文本和表单属性。导航和网络自定义记录事件会被清除，并且重播事件的访问 URL 列表会在上传前进行清理。第一方 Agora 和 ZKorum URL 可能会保留路径和假名路由标识符，但凭证、查询字符串和片段将被删除。外部 URL 被简化为原始 URL，而不安全的 URL 方案则被编辑。错误事件还会删除请求 URL 和任意额外数据，仅保留明确的技术上下文允许列表，并省略控制台和用户界面面包屑。对于一种特定的堆栈溢出诊断，严格限制的附件可能包括结构页面布局标志，但不包括 OTP 状态、草稿、载入状态、标识符或用户生成的内容。重播和错误报告仍然可以包含结构 DOM、假名路由路径、资源来源、技术和交互元数据，并且 Sentry 可以按照其隐私政策中的描述处理 IP 地址。 Sentry 不使用跟踪 cookie。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["用于监控的假名日志记录："],
                  },
                  " Agora 收集匿名技术数据用于系统监控、调试和性能优化目的。这包括用户 UUID、用户名、请求元数据和错误日志。我们不会在应用程序日志中记录敏感的 PII，例如电话号码。但是，Twilio、AWS、Cloudflare 等第三方服务可能会根据自己的隐私政策和保留时间表保留数据（包括 IP 地址，就 Twilio 而言，还包括电话号码）。 ",
                ],
              },
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. 您对个人数据的权利"],
          },
          {
            tag: "p",
            children: [
              " 6.1.当我们收集和使用您的个人数据时，您将享有多项权利，您可以通过下述方式行使这些权利。请注意，当您希望行使某项权利时，我们会要求您提供身份证明。我们这样做是为了防止个人数据泄露（例如，未经授权的人冒充您并以您的名义行使权利）。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2.根据处理方式和法律依据，作为数据主体，您有多种可能性来控制您的个人数据： ",
            ],
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
                children: ["修改您的数据的权利"],
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
                children: ["删除您的数据的权利"],
              },
              {
                tag: "li",
                children: ["撤回您先前给予的同意的权利"],
              },
              {
                tag: "li",
                children: ["传输您的数据的权利"],
              },
              {
                tag: "li",
                children: [" 向主管数据保护机构提出投诉的权利。 "],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3.我们应该向您指出，这些权利并不总是绝对的，在某些情况下，我们有权甚至法律要求进一步处理您的个人数据，因此我们可能并不总是能够（完全）遵守您的请求。在这种情况下，我们会相应地通知您。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4.您可以免费行使这些权利，但滥用情况除外，在这种情况下，我们有权收取管理费来满足您的要求。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5.请注意，您可以删除自己的反应、鼓掌、赞成/反对、调查回复、同意/不同意操作、对话、意见、回复、“观点”信息和所说的语言（至少必须保留一项）。 ",
            ],
          },
          {
            tag: "h3",
            children: ["6.6。安全记录："],
          },
          {
            tag: "p",
            children: [" 帐户删除后会保留一些安全记录以保护服务： "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " 用于重放攻击保护的短期用户控制授权网络 (UCAN) 令牌哈希 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [" 这些记录仅在防止重复使用授权令牌所需的时间内保留。 "],
          },
          {
            tag: "h3",
            children: ["6.7.如何删除您的帐户："],
          },
          {
            tag: "p",
            children: [
              " 当您删除帐户时， ",
              {
                tag: "strong",
                children: ["立即无法访问"],
              },
              " 并且无法恢复。删除过程遵循以下时间表： ",
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
                    children: ["即时："],
                  },
                  " 您的帐户已被软删除并且无法访问。所有设备均已注销。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["15 天后："],
                  },
                  " 您的帐户数据将从我们的数据库中永久删除（硬删除）。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["此后最多 30 天："],
                  },
                  " 出于灾难恢复目的，数据可能会保留在加密备份中。 ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["删除后会发生什么："],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [" 您的帐户立即无法访问且无法恢复 "],
              },
              {
                tag: "li",
                children: ["所有设备均已注销，您的会话也将终止"],
              },
              {
                tag: "li",
                children: [
                  " 您的验证凭据（电话号码、护照证明、活动门票）已失效 ",
                ],
              },
              {
                tag: "li",
                children: [
                  " 您的内容（帖子、投票、意见）保留在平台上，但不再与您的帐户公开关联 ",
                ],
              },
              {
                tag: "li",
                children: [" 15 天后，您的帐户数据将从我们的数据库中永久删除 "],
              },
              {
                tag: "li",
                children: [" 验证后不会保留帐户操作的密码证明 "],
              },
            ],
          },
          {
            tag: "h4",
            children: ["第三方数据保留："],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["数据库备份："],
                  },
                  " 15 天硬删除后，数据可能会在加密的 AWS 备份中保留最多 30 天 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["特维利奥："],
                  },
                  " 电话验证记录根据 ",
                  {
                    tag: "a",
                    children: ["Twilio 的隐私政策"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["第三方服务："],
                  },
                  " Sentry、Cloudflare、AWS 和 Google Cloud 中的日志和数据可能会根据各自的隐私政策保留 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["重要的："],
              },
              " 删除是立即且不可逆转的。请求删除后您将无法恢复您的帐户。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8。如果您对我们处理您的个人数据有任何投诉，您可以随时通过以下方式联系我们： ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              "。如果您对我们的答复不满意，您可以向数据保护主管机构，即法国国家信息和自由委员会提出投诉（",
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
            children: ["7. 加州居民的重要信息"],
          },
          {
            tag: "p",
            children: [
              " 7.1.根据 2018 年《加州消费者隐私法》（“CCPA”），我们向加州居民提供以下附加详细信息。在过去 12 个月内，我们出于运营业务目的收集、使用和共享本隐私政策中上述类别的您的个人信息。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2.我们没有出售您的个人信息，这意味着我们没有出于金钱或其他有价值的考虑而披露您的个人信息。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3.您有权要求访问或删除您的个人信息，并要求我们的隐私惯例透明化。如果您想行使 CCPA 规定的权利，请参阅第 6 条。收到您的请求后，我们将通过请求信息来确认您的身份（包括要求您提供其他信息）来验证您的请求。如果您想使用在加州国务卿处注册的代理人来行使您的权利，我们可能会要求您提供证据，证明您已向该代理人提供了授权书，或者该代理人拥有有效的书面授权，可以代表您提交行使权利的请求。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4.如果您选择行使您的权利，我们不会因您行使权利而向您收取不同的价格或提供不同质量的服务，除非法律允许这些差异。 ",
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
              " 8.1.我们可以随时主动更改本隐私政策。如果本隐私政策的重大变更可能会影响您个人数据的处理，我们将通过通常与您沟通的方式（例如通过电子邮件或通过平台上的消息）向您传达这些变更。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 8.2.我们邀请您在我们的网站 (https://agoracitizen.network/) 上阅读本隐私政策的最新版本。隐私政策注明了我们的隐私政策上次更改的日期。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. 您还有什么问题吗？"],
          },
          {
            tag: "p",
            children: [
              " 9.1.如果您对个人数据的处理有任何其他疑问，请随时联系我们的隐私经理。您可以通过电子邮件联系我们的隐私经理： ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              "。 ",
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
        "本隱私權政策由自動翻譯產生。英文版本是唯一具有權威性的版本，如有任何差異，應僅以英文版本為準。",
      viewEnglish: "查看具有權威性的英文版本",
      returnToTranslation: "返回翻譯版本",
    },
    nodes: [
      {
        tag: "p",
        children: [
          {
            tag: "strong",
            children: ["最後更新於"],
          },
          ": 2025/11/11 (年/月/日)",
        ],
      },
      {
        tag: "p",
        children: [
          " Agora 公民網絡由以下公司開發 ",
          {
            tag: "a",
            children: ["ZKorum SAS"],
            href: "https://www.societe.com/societe/zkorum-984736173.html",
            external: true,
          },
          "。在 ZKorum，我們相信隱私是一項基本權利。我們的使命是讓使用者參與政治和社會討論，同時保持對其身分和個人資訊的控制。 ",
        ],
      },
      {
        tag: "p",
        children: [
          " 本隱私權政策說明了當您使用我們的網站和行動應用程式（統稱為「服務」）或以其他方式與我們互動時，Agora Citizen Network（「Agora」、「我們」、「我們」或「ZKorum」）如何以及為何收集、使用和分享有關您的資訊。我們負責按照本隱私權政策中說明的方式收集和使用您的個人資料。 ",
        ],
      },
      {
        tag: "p",
        children: [
          " 如果您對此有任何疑問，請透過電子郵件聯絡我們： ",
          {
            tag: "a",
            children: ["legal@zkorum.com"],
            href: "mailto:legal@zkorum.com",
          },
          "。如果您是加州居民，我們希望提請您注意第 7 條。 ",
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["Agora是一個公共平台"],
          },
          {
            tag: "p",
            children: [
              " Agora 上的大多數內容都是可公開存取的，這意味著任何人都可以查看您的個人資料、貼文、投票和意見，即使沒有帳戶。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 您無需建立帳戶即可瀏覽 Agora。要參與討論並與內容互動，您可以： ",
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
                    children: ["以訪客身份瀏覽："],
                  },
                  " 您無需註冊即可探索內容並參與有限的互動。當您首次與平台互動（例如發佈、投票）時，系統會自動產生裝置特定的加密識別碼 (DID) 並將其儲存在您的裝置上，然後連結到我們伺服器上的使用者帳戶。此 DID 用作您裝置的永久會話識別碼。訪客帳戶未經驗證，只能從原始裝置存取。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["軟體登入（基於會話的驗證）："],
                  },
                  " 驗證使用 ",
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " 使用團體憑證證明 (GPC) 進行活動門票驗證。這會為您的帳戶添加臨時的基於事件的驗證，但不會建立註冊帳戶。軟體登入可讓您在不透露門票詳細資訊的情況下證明活動參與情況。您可以隨時透過新增電話或護照驗證來升級為永久註冊帳戶。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["硬登入（永久註冊帳號）："],
                  },
                  " 使用下列方法之一建立永久驗證帳戶： ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          {
                            tag: "strong",
                            children: ["電話號碼："],
                          },
                          " 透過簡訊發送的一次性代碼進行驗證 ",
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
                          "：基於護照的零知識證明（ZKP）驗證 ",
                        ],
                      },
                    ],
                  },
                  " 這些方法建立一個註冊帳戶並確保您的身分得到驗證，同時維護隱私。 Agora 僅收到確認唯一性和資格的加密證明，而不會收到底層身分證明文件或票證資訊。 ",
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
              " 當您從訪客或軟體登入升級到硬體驗證（電話或護照）時，您現有的所有內容（貼文、投票、追蹤、事件驗證）將自動轉移到您已驗證的帳戶，並且您先前未經驗證的帳戶將被刪除。此合併是永久性的且無法撤銷。出於安全原因，您無法合併兩個經過驗證的帳戶。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 您的 Agora 帳戶將​​有一個用戶名，可以手動選擇或自動產生。使用者名稱是公開的，但不需要與您的真實身分相關聯。您還可以提供可選的個人資料詳細信息，例如首選主題，這些詳細信息可以隨時修改或刪除。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " Agora Citizen Network 上的大部分內容都是公開的。當您提交內容（例如貼文、意見或反應）時，所有使用者都可以看到該內容，並且可能會被搜尋引擎編入索引。 Agora 還利用密碼學證明來提供資料可驗證性，這意味著某些互動（例如帳戶創建和參與）以去中心化的方式公開記錄。 ",
            ],
          },
          {
            tag: "h3",
            children: ["您的 Agora 個人資料"],
          },
          {
            tag: "p",
            children: [" 您的 Agora 個人資料預設是公開的，包含以下資訊： "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["使用者名稱"],
              },
              {
                tag: "li",
                children: ["唯一使用者識別碼 (UUID)"],
              },
              {
                tag: "li",
                children: [
                  " 活動歷史記錄（貼文、意見、互動（表情符號、同意/不同意操作、鼓掌、贊成/反對）、調查回覆和標記/報告的內容 ",
                ],
              },
              {
                tag: "li",
                children: ["有興趣的社區和主題"],
              },
              {
                tag: "li",
                children: [
                  " 驗證狀態： ",
                  {
                    tag: "ul",
                    children: [
                      {
                        tag: "li",
                        children: [
                          " 透過護照證明進行驗證（使用者無效和雙向身分證明） ",
                        ],
                      },
                      {
                        tag: "li",
                        children: [
                          " 透過電話號碼驗證（Agora 簽名證明綁定 did:keys to user UUID） ",
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
              " 用戶可以選擇匿名發文。使用此功能時，使用者名稱和個人資料圖片將替換為通用標識符，內容不會公開連結到使用者的個人資料。 ",
            ],
          },
          {
            tag: "h3",
            children: ["第三方服務"],
          },
          {
            tag: "p",
            children: [
              " Agora 使用可能處理 IP 位址和其他個人資料的第三方服務。在可能的情況下，Agora 將服務配置為使用歐盟區域端點或使用基於歐盟的提供者。這些服務有自己的隱私權政策，鼓勵使用者查看它們。 ",
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
                  " （全局）用於零知識身分證明。可以處理 IP 位址以實現安全和服務操作。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "a",
                    children: ["Zupass"],
                    href: "https://zupass.org",
                    external: true,
                  },
                  " （全球，開源）使用團體憑證證明 (GPC) 進行活動門票和身份驗證。可以處理 IP 位址以進行服務操作。 Zupass 使用 Simple Analytics 進行隱私友善的網路分析。 ",
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
                  " （全球）用於電話號碼驗證。 Twilio 以明文儲存電話號碼並處理 IP 位址以防止詐欺。請注意，Agora 僅在我們的資料庫中儲存雜湊電話號碼（從不以明文形式），但 Twilio 根據其自己的隱私權政策保留電話號碼。 ",
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
                  " （全球）DDoS 防護與安全。處理 IP 位址。 ",
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
                  " （歐盟：都柏林和巴黎）用於託管基礎設施、資料儲存和運算資源。處理基礎設施操作的 IP 位址。 ",
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
                  " （位於美國，us-central1 區域）用於對使用者貼文和平台產生的內容進行人工智慧翻譯。可以處理基礎設施操作的 IP 位址。 ",
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
                  " （基於歐盟）用於隱私友善的網路分析。暫時處理 IP 位址以進行訪客計數，但不儲存它們（有關詳細信息，請參閱其資料政策）。 ",
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
                  " （歐盟伺服器）用於錯誤追蹤和崩潰報告。出於調試目的處理 IP 位址。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 標示為「全球」的服務是依照第 3 條所述的適當 GDPR 保障措施運作。鼓勵關注 IP 位址隱私的使用者在存取 Agora 時使用 Tor 或其他 mixnet 解決方案。 ",
            ],
          },
          {
            tag: "h3",
            children: ["Cookie 和分析"],
          },
          {
            tag: "p",
            children: [
              " Agora 不使用廣告或跨站追蹤 cookie，也不出售廣告資料。我們使用 Plausible Analytics（一項基於歐盟的分析服務，不使用 cookie）和 Sentry 來限制錯誤和效能遙測。欲了解更多詳情，請訪問 ",
              {
                tag: "a",
                children: ["Plausible Analytics"],
                href: "https://plausible.io/about",
                external: true,
              },
              "。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 我們僅使用會話/身份驗證 cookie，這是網站正常運作所必需的。 ",
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
              "1.1.當您執行以下操作時，我們會收集和使用您的個人資料：",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["使用我們的網站 (https://agoracitizen.network/)；"],
              },
              {
                tag: "li",
                children: ["使用我們的行動應用程式；和"],
              },
              {
                tag: "li",
                children: [" 透過電子郵件或任何其他數位通訊管道與我們溝通。 "],
              },
            ],
          },
          {
            tag: "p",
            children: [" 1.2.本隱私權政策可依第 8 條的規定進行修訂。 "],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["2. 我們處理哪些個人資料以及為什麼？"],
          },
          {
            tag: "p",
            children: [
              " 我們只會出於特定目的並在法律允許的範圍內處理您的個人資料。我們在下面進一步解釋我們在哪些情況下收集和使用您的個人資料。如果我們沒有直接從您收到您的個人數據，我們也會在下面通知您。 ",
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
                        children: ["什麼個人資料？"],
                      },
                      {
                        tag: "th",
                        children: ["為什麼？"],
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
                            children: ["裝置識別碼（DID - 去中心化識別碼）"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 產生並儲存在您的裝置上的加密公鑰（did:key 格式），然後連結到您在我們伺服器上的使用者帳戶。 DID 可作為將您的裝置連接到您的帳戶的永久會話識別碼。為所有使用者（訪客、軟體登入和硬登入）儲存 DID，以維護基於裝置的會話。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法權益"],
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
                            children: ["軟體登入 - 活動門票驗證 (Zupass)"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 當您使用 Zupass 進行驗證時，我們會儲存特定於事件的無效符（從您的票證派生的隱私權保護識別碼）和事件 slug。這證明了活動的參與，而無需透露門票詳細資訊。軟體登入不會建立註冊帳戶，但允許基於會話的驗證，該驗證可以升級為永久註冊。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法權益"],
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
                            children: ["身份驗證資料 - 電話號碼"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 對使用者進行身份驗證並提供一次性驗證碼。電話號碼以加密雜湊形式儲存在我們的資料庫中。 Twilio（我們的簡訊提供者）以明文形式處理和儲存電話號碼以提供驗證碼。電話驗證建立永久註冊帳戶。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法權益"],
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
                            children: ["身分驗證資料-護照零知識證明（Rarimo）"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 透過保護隱私的護照驗證來驗證用戶的資格。我們儲存源自護照的無效符、公民身份國家/地區代碼和性別。 Agora 僅收到確認唯一性和資格的加密證明，而不會收到您的護照號碼、姓名、照片或其他護照詳細資訊。護照驗證建立永久註冊帳戶。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法權益"],
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
                            children: ["帳號資訊"],
                          },
                          " （使用者名稱、首選語言、性別和國籍（如果護照已驗證）） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 若要建立和管理使用者帳戶，自訂使用者體驗。這些數據將被匯總以用於分析、洞察和貨幣化目的。 ",
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
                            children: ["您採取的行動"],
                          },
                          " （貼文、意見、回覆、反應、調查） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 促進平台上的討論、使用者互動和參與。這些數據將被匯總以用於分析、洞察和貨幣化目的。 ",
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
                            children: ["IP位址"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 保護平台基礎設施、防止惡意活動並確保營運安全（例如防止分散式阻斷服務 (DDoS) 攻擊）。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法權益"],
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
                            children: ["化名技術數據"],
                          },
                          " （使用者 UUID、使用者名稱、請求元資料、錯誤日誌、時間戳記） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 用於系統監控、調試、效能最佳化、提高服務可靠性。我們不會在應用程式日誌中記錄敏感的 PII，例如電話號碼。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["合法權益"],
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
                            children: ["溝通"],
                          },
                          " （您提供給我們的身份和聯絡資訊、通訊內容、通訊本身的技術細節（例如日期和時間） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 為了實現您和我們之間的溝通（例如，當您透過社群媒體、電話或電子郵件與我們聯繫）。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 我們的合法權益是能夠回覆要求、問題或評論，或就任何類型的問題主動與您聯繫。 ",
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
                            children: ["上述個人資料。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 遵守我們的法律義務或遵守主管警察機關、司法機關、政府機構或團體（包括主管資料保護機關）的任何合理要求。 ",
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
                          " 防止、發現和打擊詐欺或其他非法或未經授權的活動。 ",
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
                        children: ["在法律訴訟中為自己辯護。"],
                      },
                      {
                        tag: "td",
                        children: [
                          " 我們在這些訴訟中使用您的個人資料的合法權益。 ",
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
                            children: ["上述個人資料。"],
                          },
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 在可能與第三方合併、收購或分拆的情況下通知第三方，即使該第三方位於歐盟境外。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [" 我們進行商業交易的合法權益。 "],
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
                            children: ["帳戶升級/合併數據"],
                          },
                          " （使用者內容、設備、活動門票、偏好） ",
                        ],
                      },
                      {
                        tag: "td",
                        children: [
                          " 當您從訪客或軟體登入升級到硬驗證（電話或護照）時，您的所有資料都會轉移到您已驗證的帳戶，並且您先前的帳戶將被刪除。這可以確保您的內容和活動歷史記錄的連續性，同時添加永久驗證。 ",
                        ],
                      },
                      {
                        tag: "td",
                        children: ["您的同意和我們的合法利益。"],
                      },
                    ],
                  },
                ],
              },
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
            children: [
              " 3.1.原則上，我們不會與為我們工作的人員以及幫助我們處理您的個人資料的供應商以外的任何人共享您的個人資料。任何有權存取您個人資料的人都將始終受到嚴格的法律或合約義務的約束，以確保您的個人資料安全和保密。這意味著只有以下類別的收件者才會收到您的個人資料： ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["你;"],
              },
              {
                tag: "li",
                children: ["我們的員工和供應商；和"],
              },
              {
                tag: "li",
                children: [
                  " 我們有義務與政府或司法機關分享您的個人資料（例如稅務機關、警察或司法機關）。 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 3.2.我們將您的個人資料傳送到歐洲經濟區 (EEA) 以外（歐洲經濟區由歐盟、列支敦士登、挪威和冰島組成）。我們會將這些個人資料傳輸至 EEA 之外，以便與第 3 條中定義的個人資料接收者類別進行溝通。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.3.我們將採取適當的保護措施來在傳輸過程中保護您的個人數據，例如僅與位於歐盟委員會充分性決定或經過歐盟-美國等批准框架認證的國家/地區的處理者合作。資料隱私框架。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.4.如果歐盟委員會沒有針對目的地國家/地區做出充分性決定，我們將在傳輸個人資料時使用 GDPR 第 46 條所述的適當保護措施，並且將根據 GDPR 第 30 條記錄此類傳輸以及技術和組織安全措施。例如，我們使用標準合約條款來保護向歐洲經濟區 (EEA) 以外的國家/地區傳輸個人數據，從而確保即使歐盟資料保護法不直接適用，也能確保您的個人資料獲得同等程度的資料保護。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 3.5. Agora 可能會將匿名和/或匯總資料傳輸給您提供資料所在司法管轄區以外的組織。如果發生此類傳輸，Agora 將確保採取適當的保障措施，以確保您的資料的安全性和完整性，以及您根據適用的強制性法律可能享有的與您的個人資料相關的所有權利。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["4. 我們會將您的個人資料保留多久？"],
          },
          {
            tag: "p",
            children: [
              " 4.1.您的個人資料只會在實現上述目的所需的時間內進行處理，或當我們徵求您的同意時，直到您撤回同意為止。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.2.作為一般規則，當上述目的不再需要您的個人資料時，我們將對其進行去識別化處理。但是，如果法律或監管義務或法院或行政命令阻止我們刪除您的個人數據，我們將無法刪除您的個人資料。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.3.我們會保留透過我們的網站或行動應用程式收集的所有個人數據，保留時間為保護第 2 條所述合法利益所需的時間，或直至您撤回同意為止。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 4.4.我們透過社群媒體、電話、電子郵件或其他數位通訊管道與您互動時收集的所有個人資料將在與您通訊所需的時間內保留，同時也會保留我們通訊的歷史記錄。當您向我們提出新問題、請求、評論或其他意見時，這使我們能夠返回到先前的通訊。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["5. 我們如何確保您的個人資料安全？"],
          },
          {
            tag: "p",
            children: [
              " 5.1.在 Agora，保護您的個人資料是首要任務。我們實施了一系列技術和組織措施，以確保處理的所有個人資料保持安全。這些措施包括： ",
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
                    children: ["資料最小化和隱私設計："],
                  },
                  " 我們只收集平台功能所需的最少個人數據，盡可能避免儲存敏感資訊。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["加密和假名化："],
                  },
                  " 個人資料經過加密，並應用假名技術來保護使用者身分。例如，電話號碼永遠不會以明文形式儲存；相反，我們會應用加密「pepper」並對它們進行雜湊處理以防止未經授權的存取。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["零知識證明認證："],
                  },
                  " Agora 利用零知識證明（ZKP）進行護照驗證，確保用戶可以在不洩露敏感個人資訊的情況下證明自己的資格。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["去中心化密碼學證明："],
                  },
                  " 某些用戶互動（例如帳戶創建和參與）可以透過加密證明公開驗證，而不會洩露用戶身份。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["安全認證："],
                  },
                  " 我們不儲存密碼。相反，身份驗證是透過一次性驗證碼或加密金鑰來處理的，從而降低了憑證洩露的風險。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["基礎設施保護："],
                  },
                  " 我們的平台使用 DDoS 保護、存取控制和網路監控來偵測和減輕攻擊，從而抵禦網路威脅。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["透明度和用戶控制："],
                  },
                  " 用戶能夠管理他們的個人資料、刪除他們的帳戶並控制他們的資訊的處理方式。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["定期安全評估："],
                  },
                  " 我們的安全措施會定期審查和更新，以應對新出現的威脅並改善資料保護。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["對日誌和分析的受控存取："],
                  },
                  " 僅聚合和匿名分析資料用於效能監控和改善使用者體驗。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["資料冗餘和備份："],
                  },
                  " 資料安全地儲存在愛爾蘭都柏林的 AWS 伺服器上，並在法國巴黎進行複製以用於災難恢復，並採取嚴格的存取控制和加密措施。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["有限的元資料收集："],
                  },
                  " Agora 應用程式日誌不會刻意記錄 IP 位址。基礎設施和錯誤監控提供者（包括 Cloudflare、雲端服務提供者和 Sentry）可能會出於安全、操作或調試目的處理 IP 位址。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["匿名人工智慧翻譯："],
                  },
                  " 傳送至 Google Cloud Platform 進行翻譯的內容原樣傳輸，不附帶任何元資料（使用者識別碼等），並在美國（us-central1 區域）進行處理。我們使用的基於 Google Cloud LLM 的翻譯服務目前在歐盟地區不可用。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: [
                      "使用 ",
                      {
                        tag: "a",
                        children: ["Sentry.io"],
                        href: "https://sentry.io/privacy/",
                        external: true,
                      },
                      " 對於隱私減少的崩潰報告：",
                    ],
                  },
                  " Agora 利用 Sentry（託管在歐盟伺服器上）進行錯誤追蹤和崩潰報告。常規會話不會上傳用於會話重播；當發生錯誤時，可以上傳緩衝的最近交互數據以幫助診斷故障。重播會在錄製前封鎖文字和輸入、封鎖媒體、停用網路內文擷取以及封鎖配置的文字和表單屬性。導航和網路自訂記錄事件會被清除，重播事件的存取 URL 清單會在上傳前進行清理。第一方 Agora 和 ZKorum URL 可能會保留路徑和假名路由標識符，但憑證、查詢字串和片段將被刪除。外部 URL 被簡化為原始 URL，而不安全的 URL 方案則被編輯。錯誤事件還會刪除請求 URL 和任意額外數據，僅保留明確的技術上下文允許列表，並省略控制台和使用者介面麵包屑。對於特定的堆疊溢位診斷，嚴格限制的附件可能包括結構頁面佈局標誌，但不包括 OTP 狀態、草稿、載入狀態、識別碼或使用者產生的內容。重播和錯誤報告仍然可以包含結構 DOM、假名路由路徑、資源來源、技術和交互元數據，並且 Sentry 可以按照其隱私權政策中的描述處理 IP 位址。 Sentry 不使用追蹤 cookie。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["用於監控的假名日誌記錄："],
                  },
                  " Agora 收集匿名技術資料用於系統監控、調試和效能優化目的。這包括用戶 UUID、用戶名、請求元資料和錯誤日誌。我們不會在應用程式日誌中記錄敏感的 PII，例如電話號碼。但是，Twilio、AWS、Cloudflare 等第三方服務可能會根據自己的隱私權政策和保留時間表保留資料（包括 IP 位址，就 Twilio 而言，還包括電話號碼）。 ",
                ],
              },
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["6. 您對個人資料的權利"],
          },
          {
            tag: "p",
            children: [
              " 6.1.當我們收集和使用您的個人資料時，您將享有多項權利，您可以透過下述方式行使這些權利。請注意，當您希望行使某項權利時，我們會要求您提供身分證明。我們這樣做是為了防止個人資料外洩（例如，未經授權的人冒充您並以您的名義行使權利）。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.2.根據處理方式和法律依據，作為資料主體，您有多種可能性來控制您的個人資料： ",
            ],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: ["存取您的資料的權利"],
              },
              {
                tag: "li",
                children: ["修改您的資料的權利"],
              },
              {
                tag: "li",
                children: ["反對處理您的個人資料的權利"],
              },
              {
                tag: "li",
                children: ["限制資料處理的權利"],
              },
              {
                tag: "li",
                children: ["刪除您的資料的權利"],
              },
              {
                tag: "li",
                children: ["撤回您先前給予的同意的權利"],
              },
              {
                tag: "li",
                children: ["傳輸您的資料的權利"],
              },
              {
                tag: "li",
                children: [" 向主管資料保護機構提出申訴的權利。 "],
              },
            ],
          },
          {
            tag: "p",
            children: [
              " 6.3.我們應該向您指出，這些權利並不總是絕對的，在某些情況下，我們有權甚至法律要求進一步處理您的個人數據，因此我們可能並不總是能夠（完全）遵守您的請求。在這種情況下，我們會相應地通知您。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.4.您可以免費行使這些權利，但濫用情況除外，在這種情況下，我們有權收取管理費來滿足您的要求。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.5.請注意，您可以刪除自己的反應、鼓掌、贊成/反對、調查回應、同意/不同意操作、對話、意見、回應、「觀點」訊息和所說的語言（至少必須保留一項）。 ",
            ],
          },
          {
            tag: "h3",
            children: ["6.6。安全記錄："],
          },
          {
            tag: "p",
            children: [" 帳戶刪除後會保留一些安全記錄以保護服務： "],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  " 用於重播攻擊保護的短期使用者控制授權網路 (UCAN) 令牌哈希 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [" 這些記錄僅在防止重複使用授權令牌所需的時間內保留。 "],
          },
          {
            tag: "h3",
            children: ["6.7.如何刪除您的帳號："],
          },
          {
            tag: "p",
            children: [
              " 當您刪除帳戶時， ",
              {
                tag: "strong",
                children: ["立即無法訪問"],
              },
              " 並且無法恢復。刪除過程遵循以下時間表： ",
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
                    children: ["即時："],
                  },
                  " 您的帳戶已被軟體刪除並且無法存取。所有設備均已登出。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["15 天後："],
                  },
                  " 您的帳戶資料將從我們的資料庫中永久刪除（硬刪除）。 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["此後最多 30 天："],
                  },
                  " 出於災難復原目的，資料可能會保留在加密備份中。 ",
                ],
              },
            ],
          },
          {
            tag: "h4",
            children: ["刪除後會發生什麼事："],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [" 您的帳戶立即無法存取且無法恢復 "],
              },
              {
                tag: "li",
                children: ["所有設備均已註銷，您的會話也將終止"],
              },
              {
                tag: "li",
                children: [
                  " 您的驗證憑證（電話號碼、護照證明、活動門票）已失效 ",
                ],
              },
              {
                tag: "li",
                children: [
                  " 您的內容（貼文、投票、意見）保留在平台上，但不再與您的帳戶公開關聯 ",
                ],
              },
              {
                tag: "li",
                children: [" 15 天後，您的帳戶資料將從我們的資料庫中永久刪除 "],
              },
              {
                tag: "li",
                children: [" 驗證後不會保留帳戶操作的密碼證明 "],
              },
            ],
          },
          {
            tag: "h4",
            children: ["第三方資料保留："],
          },
          {
            tag: "ul",
            children: [
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["資料庫備份："],
                  },
                  " 15 天硬刪除後，資料可能會在加密的 AWS 備份中保留最多 30 天 ",
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["特維利奧："],
                  },
                  " 電話驗證記錄根據 ",
                  {
                    tag: "a",
                    children: ["Twilio 的隱私權政策"],
                    href: "https://www.twilio.com/en-us/legal/privacy",
                    external: true,
                  },
                ],
              },
              {
                tag: "li",
                children: [
                  {
                    tag: "strong",
                    children: ["第三方服務："],
                  },
                  " Sentry、Cloudflare、AWS 和 Google Cloud 中的日誌和資料可能會根據各自的隱私權政策保留 ",
                ],
              },
            ],
          },
          {
            tag: "p",
            children: [
              {
                tag: "strong",
                children: ["重要的："],
              },
              " 刪除是立即且不可逆轉的。請求刪除後您將無法恢復您的帳戶。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 6.8。如果您對我們處理您的個人資料有任何投訴，您可以隨時透過以下方式與我們聯絡： ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              "。如果您對我們的答覆不滿意，您可以向資料保護主管機構，即法國國家資訊與自由委員會提出申訴（",
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
            children: ["7. 加州居民的重要訊息"],
          },
          {
            tag: "p",
            children: [
              " 7.1.根據 2018 年《加州消費者隱私法》（「CCPA」），我們向加州居民提供以下附加詳細資訊。在過去 12 個月內，我們出於營運業務目的收集、使用和分享本隱私權政策中上述類別的您的個人資訊。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.2.我們沒有出售您的個人資訊，這意味著我們沒有出於金錢或其他有價值的考慮而披露您的個人資訊。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.3.您有權要求存取或刪除您的個人資訊，並要求我們的隱私權慣例透明化。如果您想行使 CCPA 規定的權利，請參閱第 6 條。收到您的要求後，我們將透過要求資訊來確認您的身分（包括要求您提供其他資訊）來驗證您的要求。如果您想使用在加州州務卿處註冊的代理人來行使您的權利，我們可能會要求您提供證據，證明您已向該代理人提供了授權書，或者該代理人擁有有效的書面授權，可以代表您提交行使權利的請求。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 7.4.如果您選擇行使您的權利，我們不會因您行使權利而向您收取不同的價格或提供不同品質的服務，除非法律允許這些差異。 ",
            ],
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
              " 8.1.我們可以隨時主動更改本隱私權政策。如果本隱私權政策的重大變更可能會影響您個人資料的處理，我們將透過通常與您溝通的方式（例如透過電子郵件或透過平台上的訊息）向您傳達這些變更。 ",
            ],
          },
          {
            tag: "p",
            children: [
              " 8.2.我們邀請您在我們的網站 (https://agoracitizen.network/) 上閱讀本隱私權政策的最新版本。隱私權政策註明了我們的隱私權政策上次變更的日期。 ",
            ],
          },
        ],
      },
      {
        tag: "section",
        children: [
          {
            tag: "h2",
            children: ["9. 您還有什麼問題嗎？"],
          },
          {
            tag: "p",
            children: [
              " 9.1.如果您對個人資料的處理有任何其他疑問，請隨時聯絡我們的隱私經理。您可以透過電子郵件聯絡我們的隱私經理： ",
              {
                tag: "a",
                children: ["legal@zkorum.com"],
                href: "mailto:legal@zkorum.com",
              },
              "。 ",
            ],
          },
        ],
      },
    ],
  },
} satisfies Record<SupportedDisplayLanguageCodes, PrivacyPolicyContent>;
