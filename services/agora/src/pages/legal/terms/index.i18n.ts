import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export type TermsText =
  | { text: string; kind?: undefined }
  | { text: string; kind: "strong" }
  | { text: string; kind: "link"; href: string; external?: boolean };

export interface TermsListItem {
  content: readonly TermsText[];
}

export type TermsBlock =
  | { type: "paragraph"; content: readonly TermsText[] }
  | {
      type: "list";
      ordered: boolean;
      marker?: "lower-alpha";
      items: readonly TermsListItem[];
    }
  | { type: "subheading"; content: readonly TermsText[] }
  | { type: "address"; lines: readonly string[] };

export interface TermsSection {
  heading: string;
  blocks: readonly TermsBlock[];
}

export interface TermsOfServiceContent {
  termsOfService: string;
  automatedTranslationNoticeTitle: string;
  automatedTranslationNotice: string;
  viewAuthoritativeEnglishVersion: string;
  returnToTranslatedVersion: string;
  lastUpdatedLabel: string;
  lastUpdatedDate: string;
  introduction: readonly TermsText[];
  sections: readonly TermsSection[];
}

export const termsOfServiceContent: Record<
  SupportedDisplayLanguageCodes,
  TermsOfServiceContent
> = {
  // Multilingual review draft: legal-basis and operational checks remain publication gates.
  en: {
    termsOfService: "Terms of Service",
    automatedTranslationNoticeTitle: "Automated translation notice",
    automatedTranslationNotice:
      "This translation was generated automatically. If there is any discrepancy, inconsistency, or conflict, the English version exclusively prevails and is the authoritative version.",
    viewAuthoritativeEnglishVersion: "View authoritative English version",
    returnToTranslatedVersion: "Return to translated version",
    lastUpdatedLabel: "Last updated on",
    lastUpdatedDate: "2026/10/14 (YYYY/MM/DD)",
    introduction: [
      {
        text: 'Welcome to Agora Citizen Network ("Agora")! These Terms and Conditions ("Terms") govern your access to and use of the Agora platform, including our website, mobile applications and other services (collectively, the "Services"). By accessing or using the Services, you agree to be bound by these Terms. If you do not agree, you may not access or use the Services.',
      },
    ],
    sections: [
      {
        heading: "1. Your access to the services",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora is only available to users aged 16 years or older. By using Agora, you confirm that you meet this age requirement and that you are over the minimum age required by the laws of your country of residence to access and use the Services.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: 'You can browse published Agora content without registering. Participation in conversations, surveys or prioritization activities ("Content") may require a device-based guest account or a particular verification method. Available methods include:',
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Device-based guest participation where permitted. Access and recovery depend on retaining the original device keys.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Email verification using a one-time code. This proves control of the email address, rather than real-world identity or uniqueness.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Log-in via phone number (verified through a one-time code)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Passport-based eligibility verification through ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: ". Agora receives the disclosed proof signals rather than the underlying passport through this flow. Rarimo registration is subject to its additional age requirement: you must be 18 years or older. The provider's applicable terms also govern its verification service.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [{ text: "You must not use the Services if:" }],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  { text: "You have been suspended or removed from Agora." },
                ],
              },
              {
                content: [
                  {
                    text: "You are legally prohibited from using the Services in your jurisdiction.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "You cannot form a binding contract with Agora, or if you are under the age of majority in your jurisdiction, unless your legal guardian has reviewed and agreed to these Terms.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        heading: "2. Privacy Policy",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora's Privacy Policy explains how we collect, use and protect your personal data. By accessing or using the Services, you agree to these Terms. Your personal data is processed as described in the Privacy Policy, and we request your consent where required for particular processing activities. For more details, visit the ",
              },
              {
                text: "Agora Privacy Policy",
                kind: "link",
                href: "/legal/privacy",
              },
              { text: "." },
            ],
          },
        ],
      },
      {
        heading: "3. Your use of the services",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Subject to these Terms, Agora grants you a non-exclusive, non-transferable, revocable license to use the Services. You may not:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Use Agora to spread misinformation, hate speech or harassment.",
                  },
                ],
              },
              { content: [{ text: "Engage in illegal activities." }] },
              {
                content: [
                  {
                    text: "Engage in or promote fraudulent activities, scams or deceptive practices.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Distribute or promote sexually explicit, violent or otherwise inappropriate content.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Use Agora to stalk, intimidate or threaten individuals or groups.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Attempt to manipulate or exploit Agora's platform, algorithms or features for personal or commercial gain.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Engage in activities that encourage self-harm, suicide or any form of endangerment.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Violate intellectual property rights, including unauthorized distribution of copyrighted material.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "License, sell, transfer, assign, distribute, host or otherwise commercially exploit the Services or Content",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Attempt to hack, disrupt, or reverse-engineer Agora's infrastructure.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Use automated tools to bypass access restrictions or abusively extract content. This does not prohibit authorized use of enabled exports.",
                  },
                ],
              },
              {
                content: [
                  { text: "Impersonate another user, entity or organization." },
                ],
              },
              {
                content: [
                  {
                    text: "Share or distribute malicious software, phishing attempts or fraudulent schemes.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Violate the privacy of other users by disclosing personal or sensitive information without consent, including but not limited to sharing personal addresses, phone numbers, financial details, or any private communications without explicit permission.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora retains the right to modify or remove features at any time without prior notice. Any future enhancements, updates, or additions to the Services will be governed by these Terms, which may be revised periodically. You acknowledge that Agora is not liable to you or any third party for any modifications, suspensions or discontinuations of the Services or any of their components.",
              },
            ],
          },
        ],
      },
      {
        heading: "4. Your Content",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'The Services may contain various types of content, including text, links, images, videos, audio, and other materials submitted by users ("Content"). Agora does not guarantee the accuracy, completeness or reliability of any Content and assumes no responsibility for it.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "By submitting Content, you confirm that you have all necessary rights to share it and that it does not violate any applicable laws or third-party rights. You are solely responsible for your content and any consequences arising from sharing it on Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "By using the Services, you retain ownership of your content but grant Agora a worldwide, non-exclusive, royalty-free, perpetual and sublicensable license to store, use, modify, distribute and display your content for platform functionality, compliance and operational purposes. This includes the right for Agora to make your Content available for syndication, distribution, aggregation or publication by third-party partners.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora reserves the right to remove or restrict content at its discretion if it violates these Terms, applicable laws or platform policies.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "This licence does not override applicable data-protection or erasure rights or expand access to private participation. Accepted account deletion hides personal statements and makes participation ineligible for new live calculations. Necessary recovery data remain private during the 15-day recovery period. We keep saved results' individual numerical inputs (Polis matrices, BWS/pairwise choices and QV allocations) indefinitely for voting analysis and recalculation, removing account links during permanent cleanup. This is not a history of every save or QV calculation. Ordinary deletion does not recalculate saved numbers; separate corrections or re-analysis may change them. Historical AI descriptions are not automatically rewritten by ordinary deletion; applicable erasure rights remain. Existing-export downloads expire at most 30 days after generation; new exports use current deletion state. Unlinking does not guarantee anonymity.",
              },
            ],
          },
        ],
      },
      {
        heading: "5. Content and moderation policies",
        blocks: [
          {
            type: "paragraph",
            content: [{ text: "You may not post Content that:" }],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [{ text: "Promotes violence or illegal activities." }],
              },
              {
                content: [
                  {
                    text: "Contains hate speech, harassment or personal attacks.",
                  },
                ],
              },
              {
                content: [
                  { text: "Spreads misinformation or manipulative content." },
                ],
              },
              { content: [{ text: "Violates intellectual property rights." }] },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora employs a content moderation system based on user reports, automated detection and ",
              },
              {
                text: "Community Guidelines",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: ". Content violating these Terms may be removed and repeat offenders may face suspension or bans.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "To report illegal content or address moderation and legal concerns, please reach out to us at ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              { text: "." },
            ],
          },
        ],
      },
      {
        heading: "6. Third party content and advertisements",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'Agora may contain links to third-party websites, products, or services, which may be shared by advertisers, partners, affiliates or other users ("Third Party Content"). Agora does not control, endorse or assume any responsibility for the accuracy, legality or reliability of such external sources.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Accessing or engaging with Third Party Content is at your own risk and we encourage you to review any relevant terms, policies or conditions before interacting with external sources or completing transactions.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora may display advertisements or sponsored content. The type, targeting and frequency of advertisements may change, and we reserve the right to place advertisements in connection with any content or services provided on Agora. Your interactions with sponsored content or advertisements are solely at your own risk, and we do not guarantee the accuracy, quality, or legitimacy of any advertised products or services.",
              },
            ],
          },
        ],
      },
      {
        heading: "7. Intellectual property",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "All intellectual property associated with Agora, including but not limited to patents, trademarks, trade names, copyrights, trade secrets, proprietary data, know-how, moral rights, database rights, design rights, algorithms, software, computer code, visual interfaces and any other proprietary rights—whether registered or unregistered—are owned or licensed by Agora. This also includes any applications or rights to apply for registration of such intellectual property under the laws of any jurisdiction.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Unauthorized use, reproduction, modification, distribution, or exploitation of Agora's intellectual property is strictly prohibited. This includes, but is not limited to, reverse-engineering software, selling proprietary materials or using any proprietary content without prior written permission from Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Any infringement of these intellectual property rights may result in legal action. Agora reserves all rights not explicitly granted under these Terms.",
              },
            ],
          },
        ],
      },
      {
        heading: "8. Termination of the services",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "You may request deletion of your Account and discontinue use of the Services at any time. Once your deletion request is accepted, ordinary account access stops and the 15-day recovery window starts. A refused request does not close your account or start that window. You may explicitly cancel an accepted ordinary account-deletion request during that window; permanent erasure and retained records follow the Privacy Policy.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "The following sections will survive any termination of these Terms or of your Account:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              { content: [{ text: "3. Your use of the Services," }] },
              { content: [{ text: "4. Your Content," }] },
              { content: [{ text: "8. Termination of the Services," }] },
              {
                content: [{ text: "9. Disclaimers and limitation liability," }],
              },
              { content: [{ text: "10. Indemnity" }] },
              { content: [{ text: "14. Miscellaneous." }] },
            ],
          },
          {
            type: "subheading",
            content: [{ text: "How to delete your account:" }],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Use the available authenticated account-deletion control or contact legal@zkorum.com for assistance. If organization responsibilities prevent account deletion through those controls, contact us. We verify ownership using supported credentials or device-key proof as appropriate to the account type; this does not imply a requirement to send us a passport image or an indefinite collection of signed proofs.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Accepted deletion disables ordinary access, revokes sessions and hides personal statements. Open results may refresh asynchronously; retained numerical results and existing exports follow the Privacy Policy. Necessary recovery data remain private. Recovery requires explicit cancellation and verified ownership, strictly before the stored 15-day deadline and before irreversible purge starts. Guests need their original device keys; lost keys can prevent recovery. Successful recovery creates a fresh session, not renewed access through previously revoked sessions.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Recovery ends at the 15-day deadline and private account data become eligible for permanent cleanup without undue delay. Cleanup delays do not extend recovery or restart applicable legal deadlines. Retained inputs, restricted records and backups follow the Privacy Policy. A later registration cannot reclaim detached participation.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Individual content, credentials and shared projects:",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            items: [
              {
                content: [
                  { text: "Individual content:", kind: "strong" },
                  {
                    text: " Authorized content deletion hides affected text, versions, translations and attribution immediately, including in retained checkpoints, without the account's recovery window. Account deletion hides personal statements from live views but may retain permitted historical text without public account attribution. Manage content separately before deleting your account if you want that text removed too; applicable erasure requests do not require manually deleting every contribution. Withdrawal controls follow the activity's open/closed rules and do not rewrite retained results. After permanent unlinking, account controls cannot retrieve, change or withdraw detached numerical records.",
                  },
                ],
              },
              {
                content: [
                  { text: "Recovery scope:", kind: "strong" },
                  {
                    text: " Account recovery can restore permitted text, translations, attribution and current eligibility of statements hidden solely by account deletion, including in our checkpoints. It does not restore independently deleted content/projects/documents, withdrawn votes, irreversible guest merges, intervening moderation or separately erased outputs, or duplicate retained votes. Guests must retain the original device keys to prove ownership. Recovery is unavailable after the exact deadline or once irreversible purge has begun.",
                  },
                ],
              },
              {
                content: [
                  { text: "Organizations and projects:", kind: "strong" },
                  {
                    text: " Delete actions require the relevant permissions and are not reversible archives. Project deletion removes contained conversations, documents and exclusively owned retained numerical inputs and reports under the applicable cleanup rules. Before an organization is deleted, any remaining solely owned projects must be transferred to another surviving owner. Co-owned projects remain with their surviving owners, with the deleted organization's relationships removed. Separately authorized deletion of a project is handled as that project's own deletion, not an account-recovery action.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Applicable personal-data requests follow the Privacy Policy's general rights provisions without requiring the product recovery period. Limited records may remain after deletion for the purposes described in the Privacy Policy:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Short-lived replay-protection hashes and necessary restriction/suppression state for their protective purpose, rather than an indefinite archive of full authentication or deletion proofs.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Operational/security event records under the applicable retention policy, including the 180-day CloudWatch log-group policy. These records are limited to their purpose and are distinct from retained account data or the backup period.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Minimal erasure instructions needed to prevent restoration of deleted information from backups, and narrowly scoped evidence for a specific incident, legal obligation or claim where justified.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "These restricted records do not create a general licence or justification to keep deleted content, individual participation patterns or credentials indefinitely. Downloaded or independently held copies and processor/recipient handling are explained in the Privacy Policy. Nothing in this section limits applicable statutory data-protection rights.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora reserves the right to suspend or terminate accounts that violate these Terms.",
              },
            ],
          },
        ],
      },
      {
        heading: "9. Disclaimers and limitation of liability",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'The Services are provided "as is" without warranties of any kind. Agora makes no representations or warranties of any kind, whether express, implied, statutory or otherwise, including but not limited to warranties of merchantability, fitness for a particular purpose, non-infringement or availability of the Services.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora does not warrant that the Services will be error-free, uninterrupted, secure or that defects will be corrected. Users assume all risks associated with the use of the Services.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "To the fullest extent permitted by law, Agora is not responsible for any indirect, incidental, consequential, punitive or special damages arising out of or related to your use of the Services, whether based on contract, tort, strict liability or any other legal theory, even if Agora has been advised of the possibility of such damages. This includes, but is not limited to, damages for lost profits, loss of data, personal injury, property damage or business interruption.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of these limitations may not apply to you.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "While Agora implements Zero-Knowledge Proof (ZKP) technology to enhance privacy and security, users acknowledge that no technology is infallible. There may be unforeseen vulnerabilities or flaws in the implementation of ZKP that could potentially lead to unauthorized data exposure or privacy breaches. Agora makes no guarantees regarding the absolute security or reliability of ZKP and assumes no liability for any unintended consequences arising from its use.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Users are encouraged to take additional precautions, such as using anonymity tools like Tor to mask their IP address, avoiding sharing excessive personal information in their writing, and being mindful of writing styles and shared attributes that could inadvertently reveal their identity through correlation with their passport and other recorded actions.",
              },
            ],
          },
        ],
      },
      {
        heading: "10. Indemnity",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Except where prohibited by law, you agree to defend, indemnify and hold harmless Agora, its affiliates, and their respective directors, officers, employees, agents, contractors, third-party service providers, and licensors from and against any claims, demands, liabilities, damages, losses and expenses (including legal fees and costs) arising out of or related to:",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            marker: "lower-alpha",
            items: [
              { content: [{ text: "your use of Agora and its Services;" }] },
              { content: [{ text: "your violation of these Terms;" }] },
              {
                content: [
                  {
                    text: "your violation of any applicable laws or regulations; or",
                  },
                ],
              },
              {
                content: [
                  { text: "any Content you submit, post, or share on Agora." },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora reserves the right to assume control of the defense of any matter for which you are required to indemnify us, and you agree to cooperate fully with our defense of such claims. Your indemnification obligations will survive any termination or suspension of your use of Agora and its Services.",
              },
            ],
          },
        ],
      },
      {
        heading: "11. Severability",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Whenever possible, the provisions of these Terms shall be interpreted in such a manner as to be valid and enforceable under the governing law. However, if one or more provisions of these Terms are found to be invalid, illegal or unenforceable, in whole or in part, the remainder of any such provision and of these Terms shall not be affected and shall continue in full force and effect as if such invalid, illegal, or unenforceable provision had never been contained herein.",
              },
            ],
          },
        ],
      },
      {
        heading: "12. Governing law and dispute resolution",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "These Terms, including any issues related to their validity, interpretation, enforcement, performance, or termination, as well as any disputes arising from tort claims, pre-contractual obligations, or extra-contractual liability, shall be governed by and construed in accordance with the laws of France. No effect shall be given to any other choice of law principles or conflict-of-laws rules that would apply the laws of any jurisdiction other than France.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "We want you to have a positive experience on Agora. If you have any issues or disputes, you agree to first attempt to resolve them with us informally. You can reach out to us with any feedback or concerns at ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              { text: "." },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Any disputes that cannot be resolved informally shall be subject to the exclusive jurisdiction of the courts of Neuilly Sur Seine.",
              },
            ],
          },
        ],
      },
      {
        heading: "13. Changes to these Terms",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora may update these Terms from time to time to reflect changes in our services, legal requirements, or other operational needs. If we make significant modifications, we will notify users through in-app notifications, banners or prompts requiring acknowledgment before the changes take effect.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "By continuing to access or use Agora after the revised Terms take effect, you agree to be bound by the updated Terms. If you do not agree to the modifications, you must discontinue your use of Agora before the changes become effective.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "We encourage users to review these Terms regularly to stay informed about their rights and obligations when using Agora.",
              },
            ],
          },
        ],
      },
      {
        heading: "14. Miscellaneous",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "These Terms, along with the Privacy Policy, constitute the entire agreement governing your access to and use of Agora. Our failure to exercise or enforce any right or provision under these Terms shall not be considered a waiver of such right or provision.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "If any provision of these Terms is found to be invalid or unenforceable, it shall be enforced to the maximum extent permissible, and the remaining provisions shall continue in full force and effect.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "You may not assign or transfer any of your rights or obligations under these Terms without our prior consent. However, we reserve the right to freely assign our rights and obligations under these Terms without restriction.",
              },
            ],
          },
        ],
      },
      {
        heading: "15. Contact information",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "For questions or concerns regarding these Terms, contact us at: ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "By using Agora, you acknowledge and agree to these Terms and any future modifications.",
              },
            ],
          },
          {
            type: "address",
            lines: [
              "ZKORUM SAS",
              "99 AVENUE ACHILLE PERETTI",
              "92200 NEUILLY-SUR-SEINE",
              "FRANCE",
            ],
          },
        ],
      },
    ],
  },
  ar: {
    termsOfService: "شروط الخدمة",
    automatedTranslationNoticeTitle: "إشعار بالترجمة الآلية",
    automatedTranslationNotice:
      "أُنشئت هذه الترجمة آليًا. وفي حال وجود أي اختلاف أو عدم اتساق أو تعارض، تكون للنسخة الإنجليزية وحدها الأولوية، وهي النسخة المعتمدة.",
    viewAuthoritativeEnglishVersion: "عرض النسخة الإنجليزية المعتمدة",
    returnToTranslatedVersion: "العودة إلى النسخة المترجمة",
    lastUpdatedLabel: "تاريخ آخر تحديث",
    lastUpdatedDate: "2026/10/14 (YYYY/MM/DD)",
    introduction: [
      {
        text: "مرحبًا بك في Agora Citizen Network («Agora»)! تحكم هذه الشروط والأحكام («الشروط») وصولك إلى منصة Agora واستخدامك لها، بما في ذلك موقعنا الإلكتروني وتطبيقاتنا للأجهزة المحمولة والخدمات الأخرى (ويُشار إليها مجتمعة باسم «الخدمات»). وبوصولك إلى الخدمات أو استخدامها، فإنك توافق على الالتزام بهذه الشروط. وإذا لم توافق، فلا يجوز لك الوصول إلى الخدمات أو استخدامها.",
      },
    ],
    sections: [
      {
        heading: "1. وصولك إلى الخدمات",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "لا تتاح Agora إلا للمستخدمين الذين تبلغ أعمارهم 16 سنة أو أكثر. وباستخدام Agora، تؤكد استيفاءك هذا الشرط العمري وأنك تتجاوز الحد الأدنى للسن الذي تقتضيه قوانين بلد إقامتك للوصول إلى الخدمات واستخدامها.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "يمكنك تصفّح محتوى Agora المنشور دون تسجيل. وقد تتطلب المشاركة في المحادثات أو الاستبيانات أو أنشطة تحديد الأولويات («المحتوى») حساب ضيف قائمًا على الجهاز أو وسيلة تحقّق معيّنة. وتشمل الوسائل المتاحة:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "مشاركة الضيف القائمة على الجهاز حيثما تكون مسموحة. ويعتمد الوصول والاسترداد على الاحتفاظ بمفاتيح الجهاز الأصلية.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "التحقّق من البريد الإلكتروني باستخدام رمز يُستخدم مرة واحدة. ويُثبت ذلك التحكم في عنوان البريد الإلكتروني، لا الهوية الحقيقية للشخص أو تفرّده.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "تسجيل الدخول عبر رقم الهاتف (المتحقّق منه بواسطة رمز يُستخدم مرة واحدة)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "التحقّق من الأهلية بناءً على جواز السفر من خلال ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: ". وتتلقى Agora إشارات الإثبات المكشوف عنها بدلًا من جواز السفر الأصلي. ويخضع التسجيل لدى Rarimo لشرطها العمري الإضافي: يجب أن تبلغ 18 سنة أو أكثر. وتحكم شروط مقدّم الخدمة المنطبقة خدمة التحقّق الخاصة به أيضًا.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "يجب ألا تستخدم الخدمات إذا:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "عُلّق حسابك أو أُزيلت من Agora.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "كنت ممنوعًا قانونًا من استخدام الخدمات في نطاق اختصاصك القضائي.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "لم تكن أهلًا لإبرام عقد ملزم مع Agora، أو كنت دون سن الرشد في نطاق اختصاصك القضائي، إلا إذا راجع وليّك القانوني هذه الشروط ووافق عليها.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        heading: "2. سياسة الخصوصية",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "توضّح سياسة خصوصية Agora كيفية جمع بياناتك الشخصية واستخدامها وحمايتها. وبوصولك إلى الخدمات أو استخدامها، فإنك توافق على هذه الشروط. وتُعالج بياناتك الشخصية على النحو الموضّح في سياسة الخصوصية، ونطلب موافقتك حيثما تكون مطلوبة لأنشطة معالجة معيّنة. ولمزيد من التفاصيل، تفضّل بزيارة ",
              },
              {
                text: "سياسة خصوصية Agora",
                kind: "link",
                href: "/legal/privacy",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "3. استخدامك للخدمات",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "مع مراعاة هذه الشروط، تمنحك Agora ترخيصًا غير حصري وغير قابل للنقل وقابلًا للإلغاء لاستخدام الخدمات. ولا يجوز لك:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "استخدام Agora لنشر معلومات مضللة أو خطاب كراهية أو مضايقات.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "الانخراط في أنشطة غير قانونية.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "الانخراط في أنشطة احتيالية أو عمليات نصب أو ممارسات خداعية، أو الترويج لها.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "توزيع محتوى جنسي صريح أو عنيف أو غير ملائم بأي وجه آخر، أو الترويج له.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "استخدام Agora لملاحقة أفراد أو مجموعات أو ترهيبهم أو تهديدهم.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "محاولة التلاعب بمنصة Agora أو خوارزمياتها أو ميزاتها أو استغلالها لتحقيق مكاسب شخصية أو تجارية.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "الانخراط في أنشطة تشجّع على إيذاء النفس أو الانتحار أو أي شكل من أشكال التعريض للخطر.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "انتهاك حقوق الملكية الفكرية، بما في ذلك التوزيع غير المصرّح به لمواد محمية بحقوق المؤلف.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "ترخيص الخدمات أو المحتوى أو بيعها أو نقلها أو التنازل عنها أو توزيعها أو استضافتها أو استغلالها تجاريًا بأي طريقة أخرى",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "محاولة اختراق البنية التحتية لـ Agora أو تعطيلها أو إجراء هندسة عكسية لها.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "استخدام أدوات آلية لتجاوز قيود الوصول أو استخراج المحتوى بصورة مسيئة. ولا يحظر ذلك الاستخدام المصرّح به لميزات التصدير المفعّلة.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "انتحال شخصية مستخدم آخر أو هوية كيان أو منظمة.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "مشاركة برمجيات خبيثة أو محاولات تصيّد احتيالي أو مخططات احتيالية، أو توزيعها.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "انتهاك خصوصية المستخدمين الآخرين بالكشف عن معلومات شخصية أو حساسة دون موافقة، بما في ذلك، على سبيل المثال لا الحصر، مشاركة العناوين الشخصية أو أرقام الهاتف أو التفاصيل المالية أو أي مراسلات خاصة دون إذن صريح.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "تحتفظ Agora بحق تعديل الميزات أو إزالتها في أي وقت دون إشعار مسبق. وتخضع أي تحسينات أو تحديثات أو إضافات مستقبلية إلى الخدمات لهذه الشروط، التي قد تُراجع دوريًا. وتقر بأن Agora ليست مسؤولة تجاهك أو تجاه أي طرف ثالث عن أي تعديلات على الخدمات أو أي من مكوّناتها، أو تعليقها أو إيقافها.",
              },
            ],
          },
        ],
      },
      {
        heading: "4. محتواك",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "قد تتضمن الخدمات أنواعًا مختلفة من المحتوى، بما في ذلك النصوص والروابط والصور والفيديوهات والصوتيات وغيرها من المواد التي يقدّمها المستخدمون («المحتوى»). ولا تضمن Agora دقة أي محتوى أو اكتماله أو موثوقيته، ولا تتحمل أي مسؤولية عنه.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "بتقديم المحتوى، تؤكد امتلاكك جميع الحقوق اللازمة لمشاركته، وأنه لا يخالف أي قوانين منطبقة أو حقوق لأطراف ثالثة. وتكون وحدك مسؤولًا عن محتواك وأي عواقب تنشأ عن مشاركته على Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "باستخدام الخدمات، تحتفظ بملكية محتواك، لكنك تمنح Agora ترخيصًا عالميًا وغير حصري وخاليًا من الإتاوات ودائمًا وقابلًا للترخيص من الباطن لتخزين محتواك واستخدامه وتعديله وتوزيعه وعرضه لأغراض وظائف المنصة والامتثال والتشغيل. ويشمل ذلك حق Agora في إتاحة محتواك لإعادة توزيعه أو توزيعه أو تجميعه أو نشره بواسطة شركاء من أطراف ثالثة.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "تحتفظ Agora بحق إزالة المحتوى أو تقييده وفق تقديرها إذا خالف هذه الشروط أو القوانين المنطبقة أو سياسات المنصة.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "لا يتجاوز هذا الترخيص حقوق حماية البيانات أو المحو المنطبقة، ولا يوسّع الوصول إلى المشاركة الخاصة. ويؤدي قبول حذف الحساب إلى إخفاء المقترحات الشخصية واستبعاد المشاركة من الحسابات المباشرة الجديدة. وتبقى بيانات الاسترداد الضرورية خاصة خلال مهلة الاسترداد البالغة 15 يومًا. ونحتفظ بالمدخلات الرقمية الفردية للنتائج المحفوظة (مصفوفات Polis وخيارات BWS/pairwise وتوزيعات QV) إلى أجل غير مسمى لتحليل التصويت وإعادة الحساب، مع إزالة روابط الحساب أثناء التنظيف النهائي. وليس هذا سجلًا لكل عملية حفظ أو حساب QV. ولا يعيد الحذف المعتاد حساب الأرقام المحفوظة؛ وقد تغيّرها تصحيحات أو إعادة تحليل منفصلة. ولا يعيد الحذف المعتاد كتابة أوصاف الذكاء الاصطناعي التاريخية تلقائيًا؛ وتظل حقوق المحو المنطبقة سارية. وتنتهي صلاحية تنزيل الملفات المصدّرة القائمة خلال 30 يومًا على الأكثر من إنشائها؛ وتعتمد الصادرات الجديدة حالة الحذف الحالية. ولا يضمن فك الارتباط إخفاء الهوية.",
              },
            ],
          },
        ],
      },
      {
        heading: "5. سياسات المحتوى والإشراف عليه",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "لا يجوز لك نشر محتوى:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "يروّج للعنف أو الأنشطة غير القانونية.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "يتضمن خطاب كراهية أو مضايقات أو هجمات شخصية.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "ينشر معلومات مضللة أو محتوى تلاعبيًا.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "ينتهك حقوق الملكية الفكرية.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "تستخدم Agora نظامًا للإشراف على المحتوى يقوم على بلاغات المستخدمين والكشف الآلي و ",
              },
              {
                text: "إرشادات المجتمع",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: ". وقد يُزال المحتوى المخالف لهذه الشروط، وقد يواجه المخالفون المتكررون تعليق الحساب أو الحظر.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "للإبلاغ عن محتوى غير قانوني أو طرح مسائل تتعلق بالإشراف على المحتوى أو مسائل قانونية، يُرجى التواصل معنا على ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "6. محتوى الأطراف الثالثة والإعلانات",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "قد تتضمن Agora روابط إلى مواقع إلكترونية أو منتجات أو خدمات لأطراف ثالثة، وقد يشاركها معلنون أو شركاء أو جهات منتسبة أو مستخدمون آخرون («محتوى الأطراف الثالثة»). ولا تتحكم Agora في هذه المصادر الخارجية أو تؤيّدها أو تتحمل أي مسؤولية عن دقتها أو مشروعيتها أو موثوقيتها.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "يكون الوصول إلى محتوى الأطراف الثالثة أو التفاعل معه على مسؤوليتك الخاصة، ونشجّعك على مراجعة أي شروط أو سياسات أو أحكام ذات صلة قبل التفاعل مع المصادر الخارجية أو إتمام المعاملات.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "قد تعرض Agora إعلانات أو محتوى ممولًا. وقد يتغيّر نوع الإعلانات واستهدافها وتكرارها، ونحتفظ بحق وضع إعلانات مرتبطة بأي محتوى أو خدمات تُقدّم على Agora. وتكون تفاعلاتك مع المحتوى الممول أو الإعلانات على مسؤوليتك الخاصة وحدك، ولا نضمن دقة أي منتجات أو خدمات معلن عنها أو جودتها أو مشروعيتها.",
              },
            ],
          },
        ],
      },
      {
        heading: "7. الملكية الفكرية",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "جميع حقوق الملكية الفكرية المرتبطة بـ Agora، بما في ذلك، على سبيل المثال لا الحصر، براءات الاختراع والعلامات التجارية والأسماء التجارية وحقوق المؤلف والأسرار التجارية والبيانات المملوكة والمعرفة الفنية والحقوق الأدبية وحقوق قواعد البيانات وحقوق التصميم والخوارزميات والبرمجيات والشيفرة الحاسوبية والواجهات المرئية وأي حقوق ملكية أخرى، سواء كانت مسجّلة أم غير مسجّلة، مملوكة لـ Agora أو مرخّصة لها. ويشمل ذلك أيضًا أي طلبات تسجيل لهذه الملكية الفكرية أو حقوق في طلب تسجيلها بموجب قوانين أي نطاق اختصاص قضائي.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "يُحظر حظرًا صارمًا أي استخدام أو نسخ أو تعديل أو توزيع أو استغلال غير مصرّح به للملكية الفكرية الخاصة بـ Agora. ويشمل ذلك، على سبيل المثال لا الحصر، إجراء هندسة عكسية للبرمجيات أو بيع مواد مملوكة أو استخدام أي محتوى مملوك دون إذن كتابي مسبق من Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "قد يؤدي أي انتهاك لهذه الحقوق في الملكية الفكرية إلى اتخاذ إجراءات قانونية. وتحتفظ Agora بجميع الحقوق التي لم تُمنح صراحة بموجب هذه الشروط.",
              },
            ],
          },
        ],
      },
      {
        heading: "8. إنهاء الخدمات",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "يجوز لك طلب حذف حسابك والتوقف عن استخدام الخدمات في أي وقت. وعند قبول طلب الحذف، يتوقف الوصول المعتاد إلى الحساب وتبدأ مهلة الاسترداد البالغة 15 يومًا. ولا يغلق الطلب المرفوض حسابك ولا يبدأ تلك المهلة. ويمكنك إلغاء طلب حذف الحساب المعتاد المقبول صراحة خلال تلك المهلة؛ ويخضع المحو النهائي والسجلات المحتفظ بها لسياسة الخصوصية.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "تظل الأقسام التالية سارية بعد أي إنهاء لهذه الشروط أو لحسابك:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "3. استخدامك للخدمات،",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "4. محتواك،",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "8. إنهاء الخدمات،",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. إخلاء المسؤولية وحدودها،",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "10. التعويض",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "14. أحكام متفرقة.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "كيفية حذف حسابك:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "استخدم أداة حذف الحساب المتاحة بعد المصادقة، أو تواصل مع legal@zkorum.com للمساعدة. وإذا حالت مسؤولياتك في منظمة دون حذف الحساب عبر تلك الأدوات، فتواصل معنا. ونتحقق من الملكية باستخدام بيانات اعتماد مدعومة أو إثبات بمفتاح الجهاز بحسب نوع الحساب؛ ولا يعني ذلك اشتراط إرسال صورة جواز سفر إلينا أو جمع إثباتات موقّعة إلى أجل غير مسمى.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "يعطّل الحذف المقبول الوصول المعتاد، ويلغي الجلسات ويخفي المقترحات الشخصية. وقد تتحدّث النتائج المفتوحة بصورة غير متزامنة؛ وتخضع النتائج الرقمية المحتفظ بها والصادرات القائمة لسياسة الخصوصية. وتبقى بيانات الاسترداد الضرورية خاصة. ويتطلب الاسترداد إلغاءً صريحًا والتحقق من الملكية، حصرًا قبل الموعد النهائي المخزّن البالغ 15 يومًا وقبل بدء المحو غير القابل للعكس. ويحتاج الضيوف إلى مفاتيح أجهزتهم الأصلية؛ وقد يمنع فقدانها الاسترداد. وينشئ الاسترداد الناجح جلسة جديدة، لا وصولًا متجددًا عبر الجلسات الملغاة سابقًا.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "ينتهي الاسترداد عند انقضاء مهلة 15 يومًا، وتصبح بيانات الحساب الخاصة مؤهلة للتنظيف النهائي دون تأخير غير مبرر. ولا تمدّد تأخيرات التنظيف الاسترداد ولا تعيد بدء المهل القانونية المنطبقة. وتخضع المدخلات المحتفظ بها والسجلات المقيّدة والنسخ الاحتياطية لسياسة الخصوصية. ولا يمكن لتسجيل لاحق استعادة المشاركة المفصولة عن الحساب.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "المحتوى الفردي وبيانات الاعتماد والمشاريع المشتركة:",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            items: [
              {
                content: [
                  {
                    text: "المحتوى الفردي:",
                    kind: "strong",
                  },
                  {
                    text: " يخفي حذف المحتوى المصرّح به النص ونسخه وترجماته ونسبته إلى صاحبه فورًا، بما في ذلك في نقاط التحقق المحفوظة، دون مهلة استرداد الحساب. يخفي حذف الحساب المقترحات الشخصية من العروض الحالية، لكنه قد يحتفظ بالنص التاريخي المسموح دون نسبته علنًا إلى الحساب. أدِر المحتوى منفصلًا قبل حذف الحساب إذا أردت إزالة ذلك النص أيضًا؛ ولا تتطلب طلبات المحو المنطبقة حذف كل مساهمة يدويًا. وتتبع أدوات سحب المشاركة قواعد النشاط المفتوح أو المغلق، ولا تعيد كتابة النتائج المحتفظ بها. وبعد فك الارتباط نهائيًا، لا تستطيع أدوات الحساب استرجاع السجلات الرقمية المفصولة أو تغييرها أو سحبها.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "نطاق الاسترداد:",
                    kind: "strong",
                  },
                  {
                    text: " يمكن لاسترداد الحساب استعادة النص والترجمات وبيانات النسبة والأهلية الحالية المسموح بها للمقترحات التي أُخفيت بسبب حذف الحساب وحده، بما في ذلك في نقاط الحفظ لدينا. ولا يستعيد المحتوى أو المشاريع أو المستندات المحذوفة بصورة مستقلة، أو الأصوات المسحوبة، أو عمليات دمج الضيوف غير القابلة للعكس، أو قرارات الإشراف المتخذة في الفترة الفاصلة، أو المخرجات الممحوة بصورة منفصلة، ولا يكرّر الأصوات المحتفظ بها. ويجب على الضيوف الاحتفاظ بمفاتيح الجهاز الأصلية لإثبات الملكية. ولا يتاح الاسترداد بعد الموعد النهائي الدقيق أو بمجرد بدء المحو غير القابل للعكس.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "المنظمات والمشاريع:",
                    kind: "strong",
                  },
                  {
                    text: " تتطلب إجراءات الحذف الصلاحيات ذات الصلة، وليست أرشفة قابلة للعكس. ويزيل حذف المشروع ما يحتويه من محادثات ومستندات ومدخلات رقمية محتفظ بها وتقارير يملكها حصريًا، وفق قواعد التنظيف المنطبقة. وقبل حذف منظمة، يجب نقل أي مشاريع متبقية مملوكة لها وحدها إلى مالك آخر يستمر وجوده. وتبقى المشاريع المشتركة مع مالكيها المتبقين، مع إزالة علاقات المنظمة المحذوفة. ويُعالج الحذف المصرّح به بصورة منفصلة لمشروع بوصفه حذفًا لذلك المشروع ذاته، لا إجراءً لاسترداد الحساب.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "تخضع طلبات البيانات الشخصية المنطبقة لأحكام الحقوق العامة في سياسة الخصوصية دون اشتراط مهلة الاسترداد الخاصة بالمنتج. وقد تبقى سجلات محدودة بعد الحذف للأغراض الموضّحة في سياسة الخصوصية:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "تجزئات قصيرة الأجل للحماية من إعادة الاستخدام، وحالة التقييد ومنع الإرسال الضرورية لغرضها الوقائي، بدلًا من أرشيف غير محدّد المدة لإثباتات المصادقة أو الحذف الكاملة.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "سجلات الأحداث التشغيلية والأمنية بموجب سياسة الاحتفاظ المنطبقة، بما في ذلك سياسة مجموعات سجلات CloudWatch البالغة 180 يومًا. وتقتصر هذه السجلات على غرضها، وتختلف عن بيانات الحساب المحتفظ بها أو مدة النسخ الاحتياطية.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "الحد الأدنى من تعليمات المحو اللازمة لمنع استعادة المعلومات المحذوفة من النسخ الاحتياطية، وأدلة محدودة النطاق تتعلق بحادث معيّن أو التزام قانوني أو مطالبة، حيثما يكون ذلك مبرّرًا.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "لا تنشئ هذه السجلات المقيّدة ترخيصًا عامًا أو مبرّرًا للاحتفاظ بالمحتوى المحذوف أو أنماط المشاركة الفردية أو بيانات الاعتماد إلى أجل غير مسمى. وتوضّح سياسة الخصوصية النسخ المنزّلة أو المحتفظ بها بصورة مستقلة وكيفية التعامل معها لدى جهات المعالجة والمتلقين. ولا يحد أي حكم في هذا القسم من حقوق حماية البيانات القانونية المنطبقة.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "تحتفظ Agora بحق تعليق الحسابات التي تخالف هذه الشروط أو إنهائها.",
              },
            ],
          },
        ],
      },
      {
        heading: "9. إخلاء المسؤولية وحدود المسؤولية",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "تُقدّم الخدمات «كما هي» دون ضمانات من أي نوع. ولا تقدّم Agora أي إقرارات أو ضمانات من أي نوع، سواء كانت صريحة أو ضمنية أو مقرّرة قانونًا أو غير ذلك، بما في ذلك، على سبيل المثال لا الحصر، ضمانات القابلية للتسويق أو الملاءمة لغرض معيّن أو عدم التعدّي على الحقوق أو توافر الخدمات.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "لا تضمن Agora أن تكون الخدمات خالية من الأخطاء أو متصلة دون انقطاع أو آمنة، أو أن تُصحّح العيوب. ويتحمل المستخدمون جميع المخاطر المرتبطة باستخدام الخدمات.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "إلى أقصى حد يسمح به القانون، لا تكون Agora مسؤولة عن أي أضرار غير مباشرة أو عرضية أو تبعية أو عقابية أو خاصة تنشأ عن استخدامك للخدمات أو تتعلق به، سواء استندت إلى العقد أو المسؤولية التقصيرية أو المسؤولية دون خطأ أو أي نظرية قانونية أخرى، حتى إذا أُبلغت Agora باحتمال وقوع تلك الأضرار. ويشمل ذلك، على سبيل المثال لا الحصر، الأضرار الناشئة عن فوات الأرباح أو فقدان البيانات أو الإصابة الشخصية أو الأضرار بالممتلكات أو انقطاع الأعمال.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "لا تسمح بعض النطاقات القضائية باستبعاد المسؤولية عن أضرار معيّنة أو الحد منها، ولذلك قد لا تنطبق عليك بعض هذه القيود.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "مع أن Agora تطبّق تقنية الإثبات عديم المعرفة (ZKP) لتعزيز الخصوصية والأمن، فإن المستخدمين يقرّون بأنه لا توجد تقنية معصومة من الخطأ. وقد توجد ثغرات أو عيوب غير متوقعة في تنفيذ ZKP يمكن أن تؤدي إلى كشف غير مصرّح به للبيانات أو انتهاكات للخصوصية. ولا تقدّم Agora أي ضمانات بشأن الأمن المطلق أو الموثوقية المطلقة لـ ZKP، ولا تتحمل أي مسؤولية عن عواقب غير مقصودة تنشأ عن استخدامه.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "نشجّع المستخدمين على اتخاذ احتياطات إضافية، مثل استخدام أدوات إخفاء الهوية كـ Tor لإخفاء عنوان IP، وتجنّب مشاركة معلومات شخصية مفرطة في كتاباتهم، والانتباه إلى أساليب الكتابة والسمات المشتركة التي قد تكشف هويتهم دون قصد من خلال الربط بجواز سفرهم وبالإجراءات الأخرى المسجّلة.",
              },
            ],
          },
        ],
      },
      {
        heading: "10. التعويض",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "باستثناء ما يحظره القانون، توافق على الدفاع عن Agora والجهات التابعة لها ومديريهم ومسؤوليهم وموظفيهم ووكلائهم ومتعاقديهم ومقدّمي الخدمات من الأطراف الثالثة ومانحي التراخيص لهم، وتعويضهم وإعفائهم من تبعات أي مطالبات أو طلبات أو مسؤوليات أو أضرار أو خسائر أو نفقات (بما في ذلك الأتعاب والمصاريف القانونية) تنشأ عن أو تتعلق بما يلي:",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            marker: "lower-alpha",
            items: [
              {
                content: [
                  {
                    text: "استخدامك لـ Agora وخدماتها؛",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "مخالفتك لهذه الشروط؛",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "مخالفتك لأي قوانين أو لوائح منطبقة؛ أو",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "أي محتوى تقدّمه أو تنشره أو تشاركه على Agora.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "تحتفظ Agora بحق تولي إدارة الدفاع في أي مسألة تكون ملزمًا بتعويضنا بشأنها، وتوافق على التعاون الكامل معنا في الدفاع عن هذه المطالبات. وتظل التزاماتك بالتعويض سارية بعد أي إنهاء أو تعليق لاستخدامك لـ Agora وخدماتها.",
              },
            ],
          },
        ],
      },
      {
        heading: "11. قابلية فصل الأحكام",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "كلما أمكن، تُفسّر أحكام هذه الشروط على نحو يجعلها صحيحة وقابلة للإنفاذ بموجب القانون الحاكم. ومع ذلك، إذا تبيّن أن حكمًا أو أكثر من هذه الشروط باطل أو غير قانوني أو غير قابل للإنفاذ، كليًا أو جزئيًا، فلا يتأثر باقي ذلك الحكم أو باقي هذه الشروط، ويظل نافذًا بكامل قوته وأثره كما لو لم يرد فيها قط ذلك الحكم الباطل أو غير القانوني أو غير القابل للإنفاذ.",
              },
            ],
          },
        ],
      },
      {
        heading: "12. القانون الحاكم وتسوية النزاعات",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "تخضع هذه الشروط، بما في ذلك أي مسائل تتعلق بصحتها أو تفسيرها أو إنفاذها أو تنفيذها أو إنهائها، وكذلك أي نزاعات ناشئة عن دعاوى المسؤولية التقصيرية أو الالتزامات السابقة للتعاقد أو المسؤولية غير التعاقدية، لقوانين فرنسا وتُفسّر وفقًا لها. ولا يُعتد بأي مبادئ أخرى لاختيار القانون أو قواعد لتنازع القوانين من شأنها تطبيق قوانين أي نطاق اختصاص قضائي غير فرنسا.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "نرغب في أن تكون تجربتك على Agora إيجابية. وإذا كانت لديك أي مشكلات أو نزاعات، فإنك توافق على محاولة حلّها معنا بصورة غير رسمية أولًا. ويمكنك التواصل معنا بشأن أي ملاحظات أو شواغل على ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "تخضع أي نزاعات لا يمكن حلّها بصورة غير رسمية للاختصاص القضائي الحصري لمحاكم Neuilly Sur Seine.",
              },
            ],
          },
        ],
      },
      {
        heading: "13. التغييرات على هذه الشروط",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "يجوز لـ Agora تحديث هذه الشروط من وقت إلى آخر لتعكس التغييرات في خدماتنا أو المتطلبات القانونية أو الاحتياجات التشغيلية الأخرى. وإذا أجرينا تعديلات مهمة، فسنُخطر المستخدمين من خلال إشعارات داخل التطبيق أو لافتات أو رسائل تطلب الإقرار قبل دخول التغييرات حيّز النفاذ.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "بمواصلة الوصول إلى Agora أو استخدامها بعد دخول الشروط المعدّلة حيّز النفاذ، فإنك توافق على الالتزام بالشروط المحدّثة. وإذا لم توافق على التعديلات، فيجب عليك التوقف عن استخدام Agora قبل سريان التغييرات.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "نشجّع المستخدمين على مراجعة هذه الشروط بانتظام ليظلوا على علم بحقوقهم والتزاماتهم عند استخدام Agora.",
              },
            ],
          },
        ],
      },
      {
        heading: "14. أحكام متفرقة",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "تشكّل هذه الشروط، إلى جانب سياسة الخصوصية، كامل الاتفاق الذي يحكم وصولك إلى Agora واستخدامك لها. ولا يُعد عدم ممارستنا أو إنفاذنا لأي حق أو حكم بموجب هذه الشروط تنازلًا عن ذلك الحق أو الحكم.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "إذا تبيّن أن أي حكم من هذه الشروط باطل أو غير قابل للإنفاذ، فيُنفّذ إلى أقصى حد مسموح به، وتظل الأحكام المتبقية نافذة بكامل قوتها وأثرها.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "لا يجوز لك التنازل عن أي من حقوقك أو التزاماتك بموجب هذه الشروط أو نقلها دون موافقتنا المسبقة. ومع ذلك، نحتفظ بحق التنازل بحرية عن حقوقنا والتزاماتنا بموجب هذه الشروط دون قيد.",
              },
            ],
          },
        ],
      },
      {
        heading: "15. معلومات الاتصال",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "للأسئلة أو الشواغل المتعلقة بهذه الشروط، تواصل معنا على: ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "باستخدام Agora، تقر بهذه الشروط وبأي تعديلات مستقبلية عليها وتوافق عليها.",
              },
            ],
          },
          {
            type: "address",
            lines: [
              "ZKORUM SAS",
              "99 AVENUE ACHILLE PERETTI",
              "92200 NEUILLY-SUR-SEINE",
              "FRANCE",
            ],
          },
        ],
      },
    ],
  },
  es: {
    termsOfService: "Condiciones de servicio",
    automatedTranslationNoticeTitle: "Aviso de traducción automática",
    automatedTranslationNotice:
      "Esta traducción se ha generado automáticamente. En caso de discrepancia, incoherencia o conflicto, prevalece exclusivamente la versión en inglés, que es la versión autorizada.",
    viewAuthoritativeEnglishVersion: "Ver la versión autorizada en inglés",
    returnToTranslatedVersion: "Volver a la versión traducida",
    lastUpdatedLabel: "Última actualización",
    lastUpdatedDate: "2026/10/14 (YYYY/MM/DD)",
    introduction: [
      {
        text: "¡Bienvenido a Agora Citizen Network («Agora»)! Estas condiciones generales («Condiciones») rigen su acceso a la plataforma Agora y su uso, incluidos nuestro sitio web, nuestras aplicaciones móviles y otros servicios (conjuntamente, los «Servicios»). Al acceder a los Servicios o utilizarlos, acepta quedar vinculado por estas Condiciones. Si no las acepta, no podrá acceder a los Servicios ni utilizarlos.",
      },
    ],
    sections: [
      {
        heading: "1. Su acceso a los servicios",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora solo está disponible para usuarios de 16 años o más. Al utilizar Agora, confirma que cumple este requisito de edad y que supera la edad mínima exigida por las leyes de su país de residencia para acceder a los Servicios y utilizarlos.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Puede navegar por el contenido publicado de Agora sin registrarse. La participación en conversaciones, encuestas o actividades de priorización («Contenido») puede requerir una cuenta de invitado basada en el dispositivo o un método de verificación determinado. Los métodos disponibles incluyen:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Participación como invitado basada en el dispositivo cuando esté permitida. El acceso y la recuperación dependen de que conserve las claves originales del dispositivo.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Verificación por correo electrónico mediante un código de un solo uso. Esto acredita el control de la dirección de correo electrónico, no la identidad real ni la unicidad de la persona.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Inicio de sesión mediante número de teléfono (verificado con un código de un solo uso)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Verificación del cumplimiento de requisitos basada en el pasaporte mediante ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: ". Agora recibe las señales reveladas por las pruebas, no el pasaporte subyacente. El registro en Rarimo está sujeto a su requisito adicional de edad: debe tener 18 años o más. Las condiciones aplicables del proveedor también rigen su servicio de verificación.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "No debe utilizar los Servicios si:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Su cuenta ha sido suspendida o se le ha expulsado de Agora.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Tiene legalmente prohibido utilizar los Servicios en su jurisdicción.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "No puede celebrar un contrato vinculante con Agora o, si no ha alcanzado la mayoría de edad en su jurisdicción, su tutor legal no ha revisado y aceptado estas Condiciones.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        heading: "2. Política de privacidad",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "La Política de privacidad de Agora explica cómo recopilamos, utilizamos y protegemos sus datos personales. Al acceder a los Servicios o utilizarlos, acepta estas Condiciones. Sus datos personales se tratan conforme a lo descrito en la Política de privacidad, y solicitamos su consentimiento cuando sea necesario para actividades concretas de tratamiento. Para obtener más información, consulte la ",
              },
              {
                text: "Política de privacidad de Agora",
                kind: "link",
                href: "/legal/privacy",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "3. Su uso de los servicios",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Con sujeción a estas Condiciones, Agora le concede una licencia no exclusiva, intransferible y revocable para utilizar los Servicios. No puede:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Utilizar Agora para difundir desinformación, discursos de odio o acoso.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Realizar actividades ilegales.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Realizar o promover actividades fraudulentas, estafas o prácticas engañosas.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Distribuir o promover contenido sexualmente explícito, violento o de otro modo inapropiado.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Utilizar Agora para acechar, intimidar o amenazar a personas o grupos.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Intentar manipular o explotar la plataforma, los algoritmos o las funcionalidades de Agora para obtener beneficios personales o comerciales.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Realizar actividades que fomenten la autolesión, el suicidio o cualquier forma de puesta en peligro.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Vulnerar derechos de propiedad intelectual, incluida la distribución no autorizada de material protegido por derechos de autor.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Conceder licencias, vender, transferir, ceder, distribuir, alojar o explotar comercialmente de cualquier otra forma los Servicios o el Contenido",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Intentar acceder ilícitamente a la infraestructura de Agora, perturbarla o someterla a ingeniería inversa.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Utilizar herramientas automatizadas para eludir restricciones de acceso o extraer contenido de forma abusiva. Esto no prohíbe el uso autorizado de las exportaciones habilitadas.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Suplantar a otro usuario, entidad u organización.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Compartir o distribuir programas maliciosos, intentos de suplantación para obtener datos o planes fraudulentos.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Vulnerar la privacidad de otros usuarios revelando información personal o sensible sin consentimiento, lo que incluye, entre otros supuestos, compartir domicilios particulares, números de teléfono, datos financieros o comunicaciones privadas sin autorización explícita.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora se reserva el derecho a modificar o retirar funcionalidades en cualquier momento sin previo aviso. Las futuras mejoras, actualizaciones o incorporaciones a los Servicios se regirán por estas Condiciones, que podrán revisarse periódicamente. Usted reconoce que Agora no responde frente a usted ni frente a terceros por las modificaciones, suspensiones o interrupciones definitivas de los Servicios o de cualquiera de sus componentes.",
              },
            ],
          },
        ],
      },
      {
        heading: "4. Su Contenido",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Los Servicios pueden contener diversos tipos de contenido, incluidos textos, enlaces, imágenes, vídeos, audio y otros materiales enviados por los usuarios («Contenido»). Agora no garantiza la exactitud, integridad ni fiabilidad de ningún Contenido y no asume responsabilidad por él.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Al enviar Contenido, confirma que dispone de todos los derechos necesarios para compartirlo y que no infringe ninguna ley aplicable ni derechos de terceros. Usted es el único responsable de su contenido y de las consecuencias derivadas de compartirlo en Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Al utilizar los Servicios, conserva la titularidad de su contenido, pero concede a Agora una licencia mundial, no exclusiva, libre de regalías, perpetua y sublicenciable para almacenar, utilizar, modificar, distribuir y mostrar su contenido con fines de funcionamiento de la plataforma, cumplimiento normativo y operaciones. Esto incluye el derecho de Agora a poner su Contenido a disposición de terceros colaboradores para su sindicación, distribución, agregación o publicación.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora se reserva el derecho a retirar contenido o restringirlo a su discreción si infringe estas Condiciones, las leyes aplicables o las políticas de la plataforma.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Esta licencia no prevalece sobre los derechos aplicables de protección de datos o supresión ni amplía el acceso a la participación privada. La eliminación aceptada de la cuenta oculta las proposiciones personales y excluye la participación de nuevos cálculos en vivo. Los datos necesarios para la recuperación permanecen privados durante el plazo de 15 días. Conservamos indefinidamente los datos numéricos individuales de entrada de los resultados guardados (matrices Polis, elecciones BWS/pairwise y asignaciones QV) para analizar las votaciones y recalcular los resultados, eliminando los vínculos con la cuenta durante la limpieza permanente. Esto no constituye un historial de cada guardado ni de cada cálculo QV. La eliminación ordinaria no recalcula las cifras guardadas; las correcciones o los nuevos análisis independientes pueden modificarlas. La eliminación ordinaria no reescribe automáticamente las descripciones históricas de IA; los derechos de supresión aplicables siguen vigentes. Las descargas de exportaciones existentes caducan como máximo 30 días después de su generación; las nuevas exportaciones utilizan el estado de eliminación actual. La desvinculación no garantiza el anonimato.",
              },
            ],
          },
        ],
      },
      {
        heading: "5. Políticas de contenido y moderación",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "No puede publicar Contenido que:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Promueva la violencia o actividades ilegales.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Contenga discursos de odio, acoso o ataques personales.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Difunda desinformación o contenido manipulador.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Vulnere derechos de propiedad intelectual.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora utiliza un sistema de moderación de contenido basado en denuncias de usuarios, detección automatizada y las ",
              },
              {
                text: "Normas de la comunidad",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: ". El contenido que infrinja estas Condiciones puede retirarse, y los infractores reincidentes pueden ser suspendidos o expulsados.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Para denunciar contenido ilegal o plantear cuestiones de moderación o jurídicas, póngase en contacto con nosotros en ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "6. Contenido de terceros y publicidad",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora puede contener enlaces a sitios web, productos o servicios de terceros, que pueden ser compartidos por anunciantes, colaboradores, entidades afiliadas u otros usuarios («Contenido de terceros»). Agora no controla ni avala dichas fuentes externas, ni asume responsabilidad por su exactitud, legalidad o fiabilidad.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "El acceso al Contenido de terceros o la interacción con él se realizan por su cuenta y riesgo, y le recomendamos que revise las condiciones o políticas pertinentes antes de interactuar con fuentes externas o realizar operaciones.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora puede mostrar anuncios o contenido patrocinado. El tipo, la segmentación y la frecuencia de los anuncios pueden cambiar, y nos reservamos el derecho a insertar anuncios en relación con cualquier contenido o servicio ofrecido en Agora. Sus interacciones con contenido patrocinado o anuncios se realizan exclusivamente por su cuenta y riesgo, y no garantizamos la exactitud, calidad ni legitimidad de los productos o servicios anunciados.",
              },
            ],
          },
        ],
      },
      {
        heading: "7. Propiedad intelectual",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Todos los derechos de propiedad intelectual asociados a Agora, incluidos, entre otros, las patentes, las marcas, los nombres comerciales, los derechos de autor, los secretos empresariales, los datos de carácter propietario, los conocimientos técnicos, los derechos morales, los derechos sobre bases de datos, los derechos sobre diseños, los algoritmos, el software, el código informático, las interfaces visuales y cualesquiera otros derechos exclusivos, estén o no registrados, pertenecen a Agora o son objeto de una licencia a su favor. Esto también incluye las solicitudes o los derechos a solicitar el registro de dicha propiedad intelectual conforme a las leyes de cualquier jurisdicción.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Se prohíbe estrictamente el uso, la reproducción, la modificación, la distribución o la explotación no autorizados de la propiedad intelectual de Agora. Esto incluye, entre otros supuestos, someter el software a ingeniería inversa, vender materiales de carácter propietario o utilizar cualquier contenido de carácter propietario sin la autorización previa y por escrito de Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Cualquier infracción de estos derechos de propiedad intelectual puede dar lugar a acciones legales. Agora se reserva todos los derechos que no se concedan expresamente en estas Condiciones.",
              },
            ],
          },
        ],
      },
      {
        heading: "8. Terminación de los servicios",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Puede solicitar la eliminación de su Cuenta y dejar de utilizar los Servicios en cualquier momento. Cuando se acepta su solicitud de eliminación, cesa el acceso ordinario a la cuenta y comienza el plazo de recuperación de 15 días. Una solicitud rechazada no cierra la cuenta ni inicia ese plazo. Durante dicho plazo puede cancelar explícitamente una solicitud ordinaria de eliminación de cuenta aceptada; la supresión permanente y los registros conservados se rigen por la Política de privacidad.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Las siguientes secciones seguirán vigentes tras cualquier terminación de estas Condiciones o de su Cuenta:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "3. Su uso de los Servicios,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "4. Su Contenido,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "8. Terminación de los Servicios,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. Exclusiones de garantías y limitación de responsabilidad,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "10. Indemnización",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "14. Disposiciones diversas.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Cómo eliminar su cuenta:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Utilice el control autenticado de eliminación de cuenta disponible o contacte con legal@zkorum.com para obtener ayuda. Si sus responsabilidades en una organización impiden eliminar la cuenta mediante esos controles, contacte con nosotros. Verificamos la titularidad mediante credenciales admitidas o una prueba basada en las claves del dispositivo, según el tipo de cuenta; esto no implica la obligación de enviarnos una imagen de su pasaporte ni una colección indefinida de pruebas firmadas.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "La eliminación aceptada deshabilita el acceso ordinario, revoca las sesiones y oculta las proposiciones personales. Los resultados abiertos pueden actualizarse de forma asíncrona; los resultados numéricos conservados y las exportaciones existentes se rigen por la Política de privacidad. Los datos necesarios para la recuperación permanecen privados. La recuperación exige cancelar explícitamente la eliminación y verificar la titularidad, estrictamente antes del vencimiento almacenado de 15 días y antes del inicio de la supresión irreversible. Los invitados necesitan las claves originales de su dispositivo; perderlas puede impedir la recuperación. Una recuperación satisfactoria crea una nueva sesión, no restablece el acceso mediante sesiones ya revocadas.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "La recuperación finaliza al vencer el plazo de 15 días y los datos privados de la cuenta pueden someterse a limpieza permanente sin dilación indebida. Los retrasos en la limpieza no amplían la recuperación ni reinician los plazos legales aplicables. Los datos de entrada conservados, los registros restringidos y las copias de seguridad se rigen por la Política de privacidad. Un registro posterior no puede reclamar la participación desvinculada.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Contenido individual, credenciales y proyectos compartidos:",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            items: [
              {
                content: [
                  {
                    text: "Contenido individual:",
                    kind: "strong",
                  },
                  {
                    text: " La eliminación autorizada de contenido oculta inmediatamente el texto, sus versiones, traducciones y atribución, también en los puntos de control conservados, sin el plazo de recuperación de la cuenta. Eliminar la cuenta oculta las proposiciones personales en las vistas actuales, pero puede conservar el texto histórico permitido sin atribución pública a la cuenta. Gestione el contenido por separado antes de eliminar la cuenta si también desea retirar ese texto; las solicitudes de supresión aplicables no requieren eliminar manualmente cada contribución. Los controles de retirada siguen las reglas de apertura o cierre de la actividad y no reescriben los resultados conservados. Tras la desvinculación permanente, los controles de cuenta no pueden recuperar, modificar ni retirar los registros numéricos desvinculados.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Alcance de la recuperación:",
                    kind: "strong",
                  },
                  {
                    text: " La recuperación de la cuenta puede restablecer, cuando esté permitido, el texto, las traducciones, la atribución y la aptitud actual para su inclusión de las proposiciones ocultadas únicamente por eliminar la cuenta, incluso en nuestros puntos de control. No restablece contenido, proyectos o documentos eliminados de forma independiente, votos retirados, fusiones irreversibles de invitados, medidas de moderación posteriores ni resultados suprimidos por separado, ni duplica los votos conservados. Los invitados deben conservar las claves originales del dispositivo para acreditar la titularidad. La recuperación no está disponible una vez cumplido el plazo exacto o iniciada la supresión irreversible.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Organizaciones y proyectos:",
                    kind: "strong",
                  },
                  {
                    text: " Las acciones de eliminación requieren los permisos pertinentes y no constituyen un archivado reversible. Eliminar un proyecto elimina las conversaciones y los documentos que contiene y los datos numéricos de entrada conservados y los informes de su propiedad exclusiva, conforme a las reglas de limpieza aplicables. Antes de eliminar una organización, los proyectos restantes de su propiedad exclusiva deben transferirse a otro propietario que siga existiendo. Los proyectos compartidos permanecen con sus otros propietarios y se retiran las relaciones de la organización eliminada. La eliminación de un proyecto autorizada por separado se gestiona como la eliminación de ese proyecto, no como una acción de recuperación de cuenta.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Las solicitudes aplicables sobre datos personales se rigen por las disposiciones generales sobre derechos de la Política de privacidad, sin exigir el plazo de recuperación del producto. Tras la eliminación pueden permanecer registros limitados para las finalidades descritas en la Política de privacidad:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Hashes de protección contra la reutilización de solicitudes de corta duración y datos de estado necesarios de restricción o bloqueo para su finalidad protectora, en lugar de un archivo indefinido de pruebas completas de autenticación o eliminación.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Registros de eventos operativos o de seguridad conforme a la política de conservación aplicable, incluida la política de 180 días de los grupos de registros de CloudWatch. Estos registros se limitan a su finalidad y son distintos de los datos de cuenta conservados o del plazo de las copias de seguridad.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Instrucciones mínimas de supresión necesarias para impedir la restauración de información eliminada desde copias de seguridad y pruebas de alcance limitado para un incidente, una obligación legal o una reclamación específicos cuando estén justificadas.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Estos registros restringidos no crean una licencia general ni una justificación para conservar indefinidamente contenido eliminado, patrones de participación individuales o credenciales. Las copias descargadas o conservadas de manera independiente y la gestión por parte de encargados del tratamiento y destinatarios se explican en la Política de privacidad. Nada de lo dispuesto en esta sección limita los derechos legales aplicables de protección de datos.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora se reserva el derecho a suspender o cerrar las cuentas que infrinjan estas Condiciones.",
              },
            ],
          },
        ],
      },
      {
        heading: "9. Exclusiones de garantías y limitación de responsabilidad",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Los Servicios se prestan «tal cual», sin garantías de ningún tipo. Agora no realiza declaraciones ni otorga garantías de ningún tipo, ya sean expresas, implícitas, legales o de otra naturaleza, incluidas, entre otras, las garantías de comerciabilidad, idoneidad para un fin determinado, ausencia de infracción de derechos o disponibilidad de los Servicios.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora no garantiza que los Servicios estén libres de errores, sean ininterrumpidos o seguros, ni que se corrijan los defectos. Los usuarios asumen todos los riesgos asociados al uso de los Servicios.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "En la máxima medida permitida por la ley, Agora no responde por daños indirectos, incidentales, consecuenciales, punitivos o especiales derivados de su uso de los Servicios o relacionados con él, ya se fundamenten en un contrato, responsabilidad extracontractual, responsabilidad objetiva o cualquier otro fundamento jurídico, incluso si se ha advertido a Agora de la posibilidad de tales daños. Esto incluye, entre otros, daños por lucro cesante, pérdida de datos, lesiones personales, daños materiales o interrupción de la actividad empresarial.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Algunas jurisdicciones no permiten excluir o limitar determinados daños, por lo que es posible que algunas de estas limitaciones no le sean aplicables.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Aunque Agora implementa tecnología de pruebas de conocimiento cero (ZKP) para mejorar la privacidad y la seguridad, los usuarios reconocen que ninguna tecnología es infalible. Pueden existir vulnerabilidades o fallos imprevistos en la implementación de ZKP que podrían dar lugar a una exposición no autorizada de datos o a vulneraciones de la privacidad. Agora no ofrece garantías sobre la seguridad o fiabilidad absolutas de ZKP y no asume responsabilidad por las consecuencias no previstas derivadas de su uso.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Se recomienda a los usuarios que adopten precauciones adicionales, como utilizar herramientas de anonimato como Tor para ocultar su dirección IP, evitar compartir información personal excesiva en sus textos y prestar atención a los estilos de escritura y a los atributos compartidos que podrían revelar inadvertidamente su identidad mediante su correlación con su pasaporte y otras acciones registradas.",
              },
            ],
          },
        ],
      },
      {
        heading: "10. Indemnización",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Salvo cuando lo prohíba la ley, usted acepta defender, indemnizar y mantener indemnes a Agora, sus entidades afiliadas y sus respectivos consejeros, directivos, empleados, representantes, contratistas, proveedores externos de servicios y licenciantes frente a cualesquiera reclamaciones, requerimientos, responsabilidades, daños, pérdidas y gastos (incluidos honorarios y costas legales) derivados de los siguientes supuestos o relacionados con ellos:",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            marker: "lower-alpha",
            items: [
              {
                content: [
                  {
                    text: "su uso de Agora y de sus Servicios;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "su incumplimiento de estas Condiciones;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "su incumplimiento de las leyes o los reglamentos aplicables; o",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "cualquier Contenido que envíe, publique o comparta en Agora.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora se reserva el derecho a asumir el control de la defensa de cualquier asunto por el que usted esté obligado a indemnizarnos, y usted acepta cooperar plenamente con nuestra defensa frente a dichas reclamaciones. Sus obligaciones de indemnización seguirán vigentes tras cualquier terminación o suspensión de su uso de Agora y de sus Servicios.",
              },
            ],
          },
        ],
      },
      {
        heading: "11. Nulidad parcial",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Siempre que sea posible, las disposiciones de estas Condiciones se interpretarán de manera que sean válidas y exigibles conforme a la ley aplicable. No obstante, si una o varias disposiciones de estas Condiciones se consideran inválidas, ilegales o inexigibles, total o parcialmente, el resto de dicha disposición y de estas Condiciones no se verá afectado y continuará plenamente vigente y eficaz como si la disposición inválida, ilegal o inexigible nunca se hubiera incluido en ellas.",
              },
            ],
          },
        ],
      },
      {
        heading: "12. Ley aplicable y resolución de controversias",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Estas Condiciones, incluidas las cuestiones relativas a su validez, interpretación, exigibilidad, cumplimiento o terminación, así como las controversias derivadas de reclamaciones por actos ilícitos, obligaciones precontractuales o responsabilidad extracontractual, se regirán e interpretarán conforme a las leyes de Francia. No se dará efecto a otros principios de elección de ley ni a normas de conflicto de leyes que determinen la aplicación de las leyes de una jurisdicción distinta de Francia.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Queremos que tenga una experiencia positiva en Agora. Si tiene algún problema o controversia, acepta intentar primero resolverlo con nosotros de manera informal. Puede ponerse en contacto con nosotros para transmitirnos comentarios o inquietudes en ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Las controversias que no puedan resolverse de manera informal quedarán sometidas a la competencia exclusiva de los tribunales de Neuilly Sur Seine.",
              },
            ],
          },
        ],
      },
      {
        heading: "13. Cambios en estas Condiciones",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora puede actualizar estas Condiciones periódicamente para reflejar cambios en nuestros servicios, requisitos legales u otras necesidades operativas. Si realizamos modificaciones significativas, notificaremos a los usuarios mediante notificaciones en la aplicación, avisos destacados o mensajes que requieran confirmación de lectura antes de que los cambios entren en vigor.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Si continúa accediendo a Agora o utilizándolo después de la entrada en vigor de las Condiciones revisadas, acepta quedar vinculado por las Condiciones actualizadas. Si no acepta las modificaciones, deberá dejar de utilizar Agora antes de que los cambios entren en vigor.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Recomendamos a los usuarios que revisen estas Condiciones periódicamente para mantenerse informados sobre sus derechos y obligaciones al utilizar Agora.",
              },
            ],
          },
        ],
      },
      {
        heading: "14. Disposiciones diversas",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Estas Condiciones, junto con la Política de privacidad, constituyen el acuerdo íntegro que rige su acceso a Agora y su uso. El hecho de que no ejerzamos o hagamos valer algún derecho o disposición de estas Condiciones no se considerará una renuncia a dicho derecho o disposición.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Si alguna disposición de estas Condiciones se considera inválida o inexigible, se hará valer en la máxima medida permitida, y las disposiciones restantes seguirán plenamente vigentes y eficaces.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "No puede ceder ni transferir ninguno de sus derechos u obligaciones conforme a estas Condiciones sin nuestro consentimiento previo. No obstante, nos reservamos el derecho a ceder libremente nuestros derechos y obligaciones conforme a estas Condiciones sin restricciones.",
              },
            ],
          },
        ],
      },
      {
        heading: "15. Información de contacto",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Si tiene preguntas o inquietudes sobre estas Condiciones, póngase en contacto con nosotros en: ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Al utilizar Agora, reconoce y acepta estas Condiciones y sus futuras modificaciones.",
              },
            ],
          },
          {
            type: "address",
            lines: [
              "ZKORUM SAS",
              "99 AVENUE ACHILLE PERETTI",
              "92200 NEUILLY-SUR-SEINE",
              "FRANCE",
            ],
          },
        ],
      },
    ],
  },
  fa: {
    termsOfService: "شرایط خدمات",
    automatedTranslationNoticeTitle: "اطلاعیهٔ ترجمهٔ خودکار",
    automatedTranslationNotice:
      "این ترجمه به‌صورت خودکار تولید شده است. در صورت هرگونه مغایرت، ناسازگاری یا تعارض، منحصراً نسخهٔ انگلیسی ملاک و نسخهٔ معتبر است.",
    viewAuthoritativeEnglishVersion: "مشاهدهٔ نسخهٔ انگلیسی معتبر",
    returnToTranslatedVersion: "بازگشت به نسخهٔ ترجمه‌شده",
    lastUpdatedLabel: "آخرین به‌روزرسانی",
    lastUpdatedDate: "2026/10/14 (YYYY/MM/DD)",
    introduction: [
      {
        text: "به Agora Citizen Network («Agora») خوش آمدید! این شرایط و ضوابط («شرایط») بر دسترسی شما به پلتفرم Agora و استفاده از آن، از جمله وب‌سایت، برنامه‌های تلفن همراه و دیگر خدمات ما (مجموعاً «خدمات») حاکم است. با دسترسی به خدمات یا استفاده از آن‌ها، تعهد به این شرایط را می‌پذیرید. اگر موافق نیستید، مجاز به دسترسی به خدمات یا استفاده از آن‌ها نیستید.",
      },
    ],
    sections: [
      {
        heading: "1. دسترسی شما به خدمات",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora فقط در دسترس کاربران 16 ساله و بالاتر است. با استفاده از Agora تأیید می‌کنید که این شرط سنی را دارید و سنتان از حداقل سن لازم طبق قوانین کشور محل اقامتتان برای دسترسی به خدمات و استفاده از آن‌ها بیشتر است.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "می‌توانید محتوای منتشرشدهٔ Agora را بدون ثبت‌نام مرور کنید. مشارکت در گفت‌وگوها، نظرسنجی‌ها یا فعالیت‌های اولویت‌بندی («محتوا») ممکن است به حساب مهمان مبتنی بر دستگاه یا روش تأیید خاصی نیاز داشته باشد. روش‌های موجود عبارت‌اند از:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "مشارکت مهمان مبتنی بر دستگاه، در صورت مجاز بودن. دسترسی و بازیابی به نگهداری کلیدهای اصلی دستگاه بستگی دارد.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "تأیید ایمیل با کد یک‌بارمصرف. این روش اختیار داشتن نشانی ایمیل را اثبات می‌کند، نه هویت واقعی یا یکتایی شخص را.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "ورود با شمارهٔ تلفن (تأییدشده با کد یک‌بارمصرف)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "تأیید صلاحیت مبتنی بر گذرنامه از طریق ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: ". در این فرایند Agora سیگنال‌های افشاشدهٔ اثبات را دریافت می‌کند، نه خود گذرنامه را. ثبت‌نام در Rarimo مشمول شرط سنی اضافی آن است: باید 18 ساله یا بالاتر باشید. شرایط قابل اعمال ارائه‌دهنده نیز بر خدمات تأیید آن حاکم است.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "در این موارد نباید از خدمات استفاده کنید:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "دسترسی شما به Agora تعلیق شده یا از آن حذف شده‌اید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "طبق قوانین حوزهٔ قضایی خود از استفاده از خدمات منع شده‌اید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "اهلیت بستن قرارداد الزام‌آور با Agora را ندارید، یا در حوزهٔ قضایی خود به سن قانونی نرسیده‌اید، مگر آنکه سرپرست قانونی شما این شرایط را بررسی و تأیید کرده باشد.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        heading: "2. سیاست حریم خصوصی",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "سیاست حریم خصوصی Agora شیوهٔ گردآوری، استفاده و حفاظت از داده‌های شخصی شما را توضیح می‌دهد. با دسترسی به خدمات یا استفاده از آن‌ها، این شرایط را می‌پذیرید. داده‌های شخصی شما طبق سیاست حریم خصوصی پردازش می‌شوند و در صورت لزوم برای فعالیت‌های پردازشی مشخص رضایتتان را می‌خواهیم. برای جزئیات بیشتر، به این سند مراجعه کنید: ",
              },
              {
                text: "سیاست حریم خصوصی Agora",
                kind: "link",
                href: "/legal/privacy",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "3. استفادهٔ شما از خدمات",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "با رعایت این شرایط، Agora مجوزی غیرانحصاری، غیرقابل انتقال و قابل لغو برای استفاده از خدمات به شما می‌دهد. مجاز نیستید:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "از Agora برای انتشار اطلاعات نادرست، گفتار نفرت‌انگیز یا آزار استفاده کنید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "فعالیت غیرقانونی انجام دهید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "در فعالیت‌های متقلبانه، کلاهبرداری یا شیوه‌های فریبکارانه مشارکت یا آن‌ها را ترویج کنید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "محتوای جنسی صریح، خشونت‌آمیز یا به هر شکل نامناسب را توزیع یا ترویج کنید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "از Agora برای تعقیب آزارگرانه، ارعاب یا تهدید افراد یا گروه‌ها استفاده کنید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "برای منفعت شخصی یا تجاری، به دست‌کاری یا بهره‌برداری از پلتفرم، الگوریتم‌ها یا قابلیت‌های Agora اقدام کنید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "در فعالیت‌هایی مشارکت کنید که خودآزاری، خودکشی یا هر نوع به‌خطرانداختن را تشویق می‌کنند.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "حقوق مالکیت فکری را نقض کنید، از جمله با توزیع غیرمجاز آثار دارای حق مؤلف.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "خدمات یا محتوا را مجوزدهی، فروش، انتقال، واگذاری، توزیع یا میزبانی کنید یا به شکل تجاری دیگری از آن‌ها بهره‌برداری کنید",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "برای هک، اختلال یا مهندسی معکوس زیرساخت Agora اقدام کنید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "از ابزارهای خودکار برای دور زدن محدودیت‌های دسترسی یا استخراج سوءاستفاده‌گرانهٔ محتوا استفاده کنید. این امر استفادهٔ مجاز از خروجی‌گیری فعال را منع نمی‌کند.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "خود را به‌جای کاربر، نهاد یا سازمان دیگری جا بزنید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "بدافزار، تلاش‌های فیشینگ یا طرح‌های کلاهبرداری را به اشتراک بگذارید یا توزیع کنید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "با افشای اطلاعات شخصی یا حساس بدون رضایت، حریم خصوصی دیگر کاربران را نقض کنید؛ از جمله انتشار نشانی‌های شخصی، شماره‌های تلفن، جزئیات مالی یا هر ارتباط خصوصی بدون اجازهٔ صریح.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora حق دارد در هر زمان و بدون اطلاع قبلی قابلیت‌ها را تغییر دهد یا حذف کند. هر بهبود، به‌روزرسانی یا افزودهٔ آیندهٔ خدمات تابع این شرایط است که ممکن است دوره‌ای بازبینی شوند. می‌پذیرید که Agora در برابر شما یا اشخاص ثالث بابت تغییر، تعلیق یا توقف خدمات یا هر جزء آن مسئول نیست.",
              },
            ],
          },
        ],
      },
      {
        heading: "4. محتوای شما",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "خدمات ممکن است انواع محتوا، از جمله متن، پیوند، تصویر، ویدئو، صدا و دیگر مطالب ارسالی کاربران («محتوا») را داشته باشند. Agora درستی، کامل بودن یا قابل اعتماد بودن هیچ محتوایی را تضمین نمی‌کند و مسئولیتی در قبال آن ندارد.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "با ارسال محتوا تأیید می‌کنید که همهٔ حقوق لازم برای اشتراک‌گذاری آن را دارید و محتوا ناقض قوانین قابل اعمال یا حقوق اشخاص ثالث نیست. مسئولیت محتوا و پیامدهای اشتراک‌گذاری آن در Agora تنها بر عهدهٔ شماست.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "با استفاده از خدمات، مالکیت محتوای خود را حفظ می‌کنید، اما به Agora مجوزی جهانی، غیرانحصاری، بدون حق امتیاز، دائمی و قابل اعطای مجوز فرعی برای ذخیره، استفاده، تغییر، توزیع و نمایش محتوای خود به‌منظور کارکرد پلتفرم، رعایت الزامات و عملیات می‌دهید. این شامل حق Agora برای در دسترس گذاشتن محتوای شما جهت بازتوزیع، توزیع، تجمیع یا انتشار توسط شرکای ثالث است.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora حق دارد بنا به صلاحدید خود محتوای ناقض این شرایط، قوانین قابل اعمال یا سیاست‌های پلتفرم را حذف یا محدود کند.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "این مجوز بر حقوق قابل اعمال حفاظت از داده‌ها یا محو آن‌ها مقدم نیست و دسترسی به مشارکت خصوصی را گسترش نمی‌دهد. پذیرش حذف حساب، گزاره‌های شخصی را پنهان و مشارکت را از محاسبات زندهٔ جدید خارج می‌کند. داده‌های ضروری بازیابی در مهلت 15 روزه خصوصی می‌مانند. ورودی‌های عددی فردی نتایج ذخیره‌شده (ماتریس‌های Polis، انتخاب‌های BWS/pairwise و تخصیص‌های QV) را برای تحلیل رأی‌دهی و محاسبهٔ مجدد به‌مدت نامحدود نگه می‌داریم و در پاک‌سازی دائمی پیوند حساب را قطع می‌کنیم. این سابقهٔ همهٔ ذخیره‌ها یا محاسبات QV نیست. حذف عادی اعداد ذخیره‌شده را دوباره محاسبه نمی‌کند؛ اصلاحات جداگانه یا تحلیل مجدد ممکن است آن‌ها را تغییر دهند. حذف عادی توصیف‌های تاریخی هوش مصنوعی را خودکار بازنویسی نمی‌کند؛ حقوق قابل اعمال محو پابرجاست. مهلت دانلود خروجی‌های موجود حداکثر 30 روز پس از تولید پایان می‌یابد؛ خروجی‌های جدید وضعیت فعلی حذف را لحاظ می‌کنند. قطع پیوند، ناشناس بودن را تضمین نمی‌کند.",
              },
            ],
          },
        ],
      },
      {
        heading: "5. سیاست‌های محتوا و نظارت بر آن",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "نباید محتوایی منتشر کنید که:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "خشونت یا فعالیت غیرقانونی را ترویج کند.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "شامل گفتار نفرت‌انگیز، آزار یا حملهٔ شخصی باشد.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "اطلاعات نادرست یا محتوای دست‌کاری‌گرانه منتشر کند.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "حقوق مالکیت فکری را نقض کند.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora از سامانهٔ نظارت بر محتوا بر پایهٔ گزارش کاربران، تشخیص خودکار و ",
              },
              {
                text: "رهنمودهای جامعه",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: " استفاده می‌کند. محتوای ناقض این شرایط ممکن است حذف شود و متخلفان تکراری با تعلیق یا ممنوعیت روبه‌رو شوند.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "برای گزارش محتوای غیرقانونی یا طرح نگرانی‌های نظارت بر محتوا و مسائل حقوقی، با ما تماس بگیرید: ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "6. محتوای اشخاص ثالث و تبلیغات",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora ممکن است پیوندهایی به وب‌سایت‌ها، محصولات یا خدمات اشخاص ثالث داشته باشد که تبلیغ‌دهندگان، شرکا، وابستگان یا دیگر کاربران به اشتراک می‌گذارند («محتوای اشخاص ثالث»). Agora این منابع خارجی را کنترل یا تأیید نمی‌کند و مسئولیتی در قبال درستی، قانونی بودن یا قابل اعتماد بودن آن‌ها ندارد.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "دسترسی یا تعامل با محتوای اشخاص ثالث با مسئولیت خود شماست و توصیه می‌کنیم پیش از تعامل با منابع خارجی یا انجام معامله، شرایط و سیاست‌های مرتبط را بررسی کنید.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora ممکن است تبلیغات یا محتوای حمایت‌شده نمایش دهد. نوع، هدف‌گیری و بسامد تبلیغات ممکن است تغییر کند و حق داریم تبلیغات را در ارتباط با هر محتوا یا خدمت ارائه‌شده در Agora قرار دهیم. تعامل شما با محتوای حمایت‌شده یا تبلیغات تنها با مسئولیت خودتان است و درستی، کیفیت یا مشروعیت محصولات یا خدمات تبلیغ‌شده را تضمین نمی‌کنیم.",
              },
            ],
          },
        ],
      },
      {
        heading: "7. مالکیت فکری",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "همهٔ حقوق مالکیت فکری مرتبط با Agora، از جمله اختراع‌ها، علائم تجاری، نام‌های تجاری، حقوق مؤلف، اسرار تجاری، داده‌های اختصاصی، دانش فنی، حقوق معنوی، حقوق پایگاه داده، حقوق طراحی، الگوریتم‌ها، نرم‌افزار، کد رایانه‌ای، رابط‌های بصری و دیگر حقوق اختصاصی، ثبت‌شده یا ثبت‌نشده، متعلق به Agora هستند یا مجوز آن‌ها در اختیار Agora است. این شامل هر درخواست ثبت یا حق درخواست ثبت چنین مالکیت فکری طبق قوانین هر حوزهٔ قضایی نیز می‌شود.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "استفاده، تکثیر، تغییر، توزیع یا بهره‌برداری غیرمجاز از مالکیت فکری Agora اکیداً ممنوع است؛ از جمله مهندسی معکوس نرم‌افزار، فروش مطالب اختصاصی یا استفاده از محتوای اختصاصی بدون اجازهٔ کتبی قبلی Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "نقض این حقوق مالکیت فکری ممکن است به اقدام قضایی منجر شود. همهٔ حقوقی که صریحاً در این شرایط اعطا نشده‌اند برای Agora محفوظ‌اند.",
              },
            ],
          },
        ],
      },
      {
        heading: "8. پایان خدمات",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "هر زمان می‌توانید حذف حساب خود را درخواست و استفاده از خدمات را متوقف کنید. با پذیرش درخواست حذف، دسترسی عادی به حساب متوقف و مهلت بازیابی 15 روزه آغاز می‌شود. درخواست ردشده حساب شما را نمی‌بندد و این مهلت را آغاز نمی‌کند. در این مدت می‌توانید درخواست پذیرفته‌شدهٔ حذف عادی حساب را صریحاً لغو کنید؛ محو دائمی و سوابق نگهداری‌شده تابع سیاست حریم خصوصی‌اند.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "بخش‌های زیر پس از هرگونه پایان این شرایط یا حساب شما همچنان معتبر می‌مانند:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "3. استفادهٔ شما از خدمات،",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "4. محتوای شما،",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "8. پایان خدمات،",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. سلب تضمین‌ها و محدودیت مسئولیت،",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "10. جبران خسارت",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "14. سایر مقررات.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "روش حذف حساب:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "از ابزار موجود حذف حساب پس از احراز هویت استفاده کنید یا برای کمک با legal@zkorum.com تماس بگیرید. اگر مسئولیت‌های سازمانی مانع حذف حساب از طریق این ابزارها هستند، با ما تماس بگیرید. مالکیت را بسته به نوع حساب با اعتبارنامه‌های پشتیبانی‌شده یا اثبات کلید دستگاه تأیید می‌کنیم؛ این به معنای الزام به ارسال تصویر گذرنامه یا گردآوری نامحدود اثبات‌های امضاشده نیست.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "پذیرش حذف، دسترسی عادی را غیرفعال، نشست‌ها را لغو و گزاره‌های شخصی را پنهان می‌کند. نتایج باز ممکن است به‌صورت ناهمگام به‌روز شوند؛ نتایج عددی نگهداری‌شده و خروجی‌های موجود تابع سیاست حریم خصوصی‌اند. داده‌های ضروری بازیابی خصوصی می‌مانند. بازیابی مستلزم لغو صریح درخواست و تأیید مالکیت، حتماً پیش از مهلت 15 روزهٔ ثبت‌شده و پیش از آغاز پاک‌سازی برگشت‌ناپذیر است. مهمانان به کلیدهای اصلی دستگاه خود نیاز دارند؛ گم شدن کلیدها ممکن است مانع بازیابی شود. بازیابی موفق نشست تازه‌ای ایجاد می‌کند، نه دسترسی دوباره از طریق نشست‌های لغوشدهٔ قبلی.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "بازیابی در پایان مهلت 15 روزه تمام می‌شود و داده‌های خصوصی حساب مشمول پاک‌سازی دائمی بدون تأخیر ناروا می‌شوند. تأخیر پاک‌سازی، بازیابی را تمدید یا مهلت‌های قانونی قابل اعمال را از نو آغاز نمی‌کند. ورودی‌های نگهداری‌شده، سوابق با دسترسی محدود و پشتیبان‌ها تابع سیاست حریم خصوصی‌اند. ثبت‌نام بعدی نمی‌تواند مشارکت جداشده را دوباره به خود نسبت دهد.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "محتوای فردی، اعتبارنامه‌ها و پروژه‌های مشترک:",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            items: [
              {
                content: [
                  {
                    text: "محتوای فردی:",
                    kind: "strong",
                  },
                  {
                    text: " حذف مجاز محتوا، متن، نسخه‌ها، ترجمه‌ها و انتساب را فوراً، از جمله در نقاط ثبت وضعیت نگهداری‌شده، بدون مهلت بازیابی حساب پنهان می‌کند. حذف حساب گزاره‌های شخصی را از نمایش‌های جاری پنهان می‌کند، اما ممکن است متن تاریخی مجاز را بدون انتساب عمومی به حساب نگه دارد. اگر حذف آن متن را نیز می‌خواهید، پیش از حذف حساب محتوا را جداگانه مدیریت کنید؛ درخواست‌های قابل اعمال محو، نیازمند حذف دستی تک‌تک مشارکت‌ها نیستند. ابزارهای پس‌گرفتن مشارکت تابع قواعد باز/بسته بودن فعالیت‌اند و نتایج نگهداری‌شده را بازنویسی نمی‌کنند. پس از قطع دائمی پیوند، ابزارهای حساب نمی‌توانند سوابق عددی جداشده را بازیابی، تغییر یا پس بگیرند.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "دامنهٔ بازیابی:",
                    kind: "strong",
                  },
                  {
                    text: " بازیابی حساب می‌تواند متن، ترجمه‌ها، انتساب و صلاحیت فعلی مجازِ گزاره‌هایی را که فقط به‌دلیل حذف حساب پنهان شده‌اند، از جمله در نقاط ثبت وضعیت ما، برگرداند. محتوا/پروژه‌ها/اسناد مستقلاً حذف‌شده، رأی‌های پس‌گرفته‌شده، ادغام‌های برگشت‌ناپذیر مهمان، اقدامات نظارتی میانی یا خروجی‌های جداگانه محوشده را برنمی‌گرداند و رأی‌های نگهداری‌شده را دوبرابر نمی‌کند. مهمانان برای اثبات مالکیت باید کلیدهای اصلی دستگاه را نگه دارند. پس از مهلت دقیق یا آغاز پاک‌سازی برگشت‌ناپذیر، بازیابی ممکن نیست.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "سازمان‌ها و پروژه‌ها:",
                    kind: "strong",
                  },
                  {
                    text: " عملیات حذف به مجوزهای مربوط نیاز دارند و بایگانی برگشت‌پذیر نیستند. حذف پروژه، گفت‌وگوها، اسناد و ورودی‌های عددی و گزارش‌های نگهداری‌شدهٔ تحت مالکیت انحصاری آن را طبق قواعد پاک‌سازی قابل اعمال حذف می‌کند. پیش از حذف سازمان، پروژه‌های باقی‌ماندهٔ تحت مالکیت انحصاری آن باید به مالک دیگری که باقی می‌ماند منتقل شوند. پروژه‌های مشترک نزد مالکان باقی‌مانده می‌مانند و ارتباط سازمان حذف‌شده با آن‌ها قطع می‌شود. حذفِ جداگانه و مجازِ پروژه به‌عنوان حذف خود آن پروژه رسیدگی می‌شود، نه اقدام بازیابی حساب.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "درخواست‌های قابل اعمال داده‌های شخصی تابع مقررات عمومی حقوق در سیاست حریم خصوصی‌اند و نیازمند مهلت بازیابی محصول نیستند. سوابق محدودی ممکن است پس از حذف، برای اهداف شرح‌داده‌شده در سیاست حریم خصوصی باقی بمانند:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "هش‌های کوتاه‌عمر جلوگیری از بازپخش و وضعیت ضروری محدودسازی/عدم ارسال برای هدف حفاظتی خود، نه بایگانی نامحدود اثبات‌های کامل احراز هویت یا حذف.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "سوابق رویدادهای عملیاتی/امنیتی طبق سیاست نگهداری قابل اعمال، از جمله سیاست 180 روزهٔ گروه گزارش‌های CloudWatch. این سوابق محدود به هدف خود و جدا از داده‌های نگهداری‌شدهٔ حساب یا دورهٔ پشتیبان‌اند.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "حداقل دستورهای محو لازم برای پیشگیری از بازگرداندن اطلاعات حذف‌شده از پشتیبان‌ها و شواهد با دامنهٔ محدود برای حادثه، تعهد قانونی یا دعوای مشخص در صورت وجود توجیه.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "این سوابق محدود، مجوز یا توجیه کلی برای نگهداری نامحدود محتوای حذف‌شده، الگوهای مشارکت فردی یا اعتبارنامه‌ها ایجاد نمی‌کنند. نسخه‌های دانلودشده یا مستقلاً نگهداری‌شده و نحوهٔ رسیدگی پردازشگر/دریافت‌کننده در سیاست حریم خصوصی توضیح داده شده‌اند. هیچ چیز در این بخش حقوق قانونی قابل اعمال حفاظت از داده‌ها را محدود نمی‌کند.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora حق دارد حساب‌های ناقض این شرایط را تعلیق یا خاتمه دهد.",
              },
            ],
          },
        ],
      },
      {
        heading: "9. سلب تضمین‌ها و محدودیت مسئولیت",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "خدمات «به همان شکل موجود» و بدون هیچ‌گونه تضمینی ارائه می‌شوند. Agora هیچ‌گونه اظهار یا تضمین صریح، ضمنی، قانونی یا غیره، از جمله تضمین قابلیت عرضهٔ تجاری، تناسب برای هدفی خاص، عدم نقض حقوق یا دسترس‌پذیری خدمات ارائه نمی‌کند.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora تضمین نمی‌کند که خدمات بدون خطا، بی‌وقفه یا امن باشند یا نقص‌ها اصلاح شوند. کاربران همهٔ خطرهای مرتبط با استفاده از خدمات را می‌پذیرند.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "تا بیشترین حد مجاز قانونی، Agora مسئول خسارت‌های غیرمستقیم، اتفاقی، تبعی، تنبیهی یا خاص ناشی از یا مرتبط با استفادهٔ شما از خدمات نیست؛ خواه بر پایهٔ قرارداد، مسئولیت مدنی، مسئولیت محض یا هر مبنای حقوقی دیگر، حتی اگر از احتمال چنین خسارت‌هایی آگاه شده باشد. این شامل زیان سود، از دست رفتن داده، آسیب بدنی، خسارت مالی یا اختلال کسب‌وکار نیز می‌شود.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "برخی حوزه‌های قضایی استثنا یا محدودسازی بعضی خسارت‌ها را مجاز نمی‌دانند؛ بنابراین ممکن است برخی از این محدودیت‌ها دربارهٔ شما اعمال نشوند.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "هرچند Agora برای بهبود حریم خصوصی و امنیت از فناوری اثبات دانش صفر (ZKP) استفاده می‌کند، کاربران می‌پذیرند که هیچ فناوری بی‌نقص نیست. ممکن است آسیب‌پذیری‌ها یا نقص‌های پیش‌بینی‌نشده در پیاده‌سازی ZKP به افشای غیرمجاز داده یا نقض حریم خصوصی منجر شوند. Agora امنیت یا قابلیت اطمینان مطلق ZKP را تضمین نمی‌کند و مسئولیتی بابت پیامدهای ناخواستهٔ استفاده از آن ندارد.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "به کاربران توصیه می‌شود احتیاط‌های بیشتری کنند؛ مانند استفاده از ابزارهای ناشناس‌ماندن نظیر Tor برای پنهان کردن نشانی IP، خودداری از ارائهٔ اطلاعات شخصی بیش از حد در نوشته‌ها، و توجه به سبک نگارش و ویژگی‌های مشترکی که ممکن است با تطبیق با گذرنامه و دیگر اقدامات ثبت‌شده، ناخواسته هویتشان را آشکار کنند.",
              },
            ],
          },
        ],
      },
      {
        heading: "10. جبران خسارت",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "جز در موارد منع قانونی، موافقت می‌کنید از Agora، وابستگان آن و مدیران، مسئولان، کارکنان، نمایندگان، پیمانکاران، ارائه‌دهندگان ثالث خدمات و اعطاکنندگان مجوزِ آن‌ها در برابر هر ادعا، مطالبه، مسئولیت، خسارت، زیان و هزینه (از جمله حق‌الوکاله و هزینه‌های حقوقی) ناشی از یا مرتبط با موارد زیر دفاع کنید، خسارتشان را جبران کنید و آن‌ها را مصون نگه دارید:",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            marker: "lower-alpha",
            items: [
              {
                content: [
                  {
                    text: "استفادهٔ شما از Agora و خدمات آن؛",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "نقض این شرایط توسط شما؛",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "نقض هر قانون یا مقررات قابل اعمال توسط شما؛ یا",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "هر محتوایی که در Agora ارسال، منتشر یا به اشتراک می‌گذارید.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora حق دارد دفاع در هر موضوعی را که ملزم به جبران خسارت آن هستید در اختیار بگیرد و می‌پذیرید در دفاع از این دعاوی همکاری کامل کنید. تعهدات جبران خسارت شما پس از پایان یا تعلیق استفاده از Agora و خدمات آن نیز پابرجا می‌مانند.",
              },
            ],
          },
        ],
      },
      {
        heading: "11. تفکیک‌پذیری",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "تا حد امکان، مفاد این شرایط باید به‌گونه‌ای تفسیر شوند که طبق قانون حاکم معتبر و قابل اجرا باشند. بااین‌حال، اگر یک یا چند مفاد، کلاً یا جزئاً، نامعتبر، غیرقانونی یا غیرقابل اجرا شناخته شوند، باقی آن مفاد و این شرایط متأثر نمی‌شوند و همچنان کاملاً معتبر و لازم‌الاجرا خواهند بود، گویی مفاد نامعتبر، غیرقانونی یا غیرقابل اجرا هرگز در آن‌ها نبوده‌اند.",
              },
            ],
          },
        ],
      },
      {
        heading: "12. قانون حاکم و حل اختلاف",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "این شرایط، از جمله مسائل اعتبار، تفسیر، اجرا، انجام یا پایان آن‌ها، و اختلافات ناشی از دعاوی مسئولیت مدنی، تعهدات پیش‌قراردادی یا مسئولیت خارج از قرارداد، تابع قوانین فرانسه‌اند و بر همان اساس تفسیر می‌شوند. هیچ اصل انتخاب قانون یا قاعدهٔ تعارض قوانینی که به اجرای قوانین حوزه‌ای جز فرانسه منجر شود، اعمال نمی‌شود.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "می‌خواهیم تجربهٔ خوبی در Agora داشته باشید. در صورت هر مشکل یا اختلاف، می‌پذیرید ابتدا برای حل غیررسمی آن با ما تلاش کنید. برای بازخورد یا طرح نگرانی با ما تماس بگیرید: ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "اختلافاتی که غیررسمی حل نشوند در صلاحیت انحصاری دادگاه‌های Neuilly Sur Seine خواهند بود.",
              },
            ],
          },
        ],
      },
      {
        heading: "13. تغییرات این شرایط",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora ممکن است گاه این شرایط را برای انعکاس تغییر خدمات، الزامات قانونی یا دیگر نیازهای عملیاتی به‌روز کند. در صورت تغییرات مهم، پیش از اجرا از طریق اعلان درون‌برنامه‌ای، بنر یا پیام نیازمند تأیید اطلاع می‌دهیم.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "با ادامهٔ دسترسی به Agora یا استفاده از آن پس از اجرای شرایط بازنگری‌شده، تعهد به شرایط به‌روزشده را می‌پذیرید. اگر با تغییرات موافق نیستید، باید پیش از اجرای آن‌ها استفاده از Agora را متوقف کنید.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "توصیه می‌کنیم این شرایط را منظم بررسی کنید تا از حقوق و تعهدات خود هنگام استفاده از Agora آگاه بمانید.",
              },
            ],
          },
        ],
      },
      {
        heading: "14. سایر مقررات",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "این شرایط همراه با سیاست حریم خصوصی، کل توافق حاکم بر دسترسی شما به Agora و استفاده از آن را تشکیل می‌دهند. اعمال نکردن یا اجرا نکردن هر حق یا مفاد این شرایط از سوی ما به معنای صرف‌نظر از آن نیست.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "اگر هر مفاد این شرایط نامعتبر یا غیرقابل اجرا شناخته شود، تا بیشترین حد مجاز اجرا می‌شود و سایر مفاد همچنان کاملاً معتبر و لازم‌الاجرا می‌مانند.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "نمی‌توانید بدون رضایت قبلی ما هیچ‌یک از حقوق یا تعهدات خود در این شرایط را واگذار یا منتقل کنید. بااین‌حال، حق داریم حقوق و تعهدات خود را آزادانه و بدون محدودیت واگذار کنیم.",
              },
            ],
          },
        ],
      },
      {
        heading: "15. اطلاعات تماس",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "برای پرسش یا نگرانی دربارهٔ این شرایط، با ما تماس بگیرید: ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "با استفاده از Agora تأیید می‌کنید که این شرایط و تغییرات آیندهٔ آن را پذیرفته‌اید.",
              },
            ],
          },
          {
            type: "address",
            lines: [
              "ZKORUM SAS",
              "99 AVENUE ACHILLE PERETTI",
              "92200 NEUILLY-SUR-SEINE",
              "فرانسه",
            ],
          },
        ],
      },
    ],
  },
  fr: {
    termsOfService: "Conditions générales d’utilisation",
    automatedTranslationNoticeTitle: "Avis de traduction automatique",
    automatedTranslationNotice:
      "Cette traduction a été générée automatiquement. En cas de divergence, d’incohérence ou de conflit, la version anglaise prévaut exclusivement et fait foi.",
    viewAuthoritativeEnglishVersion:
      "Consulter la version anglaise faisant foi",
    returnToTranslatedVersion: "Revenir à la version traduite",
    lastUpdatedLabel: "Dernière mise à jour le",
    lastUpdatedDate: "2026/10/14 (YYYY/MM/DD)",
    introduction: [
      {
        text: "Bienvenue sur Agora Citizen Network (« Agora ») ! Les présentes conditions générales d’utilisation (les « Conditions ») régissent votre accès à la plateforme Agora et son utilisation, notamment notre site web, nos applications mobiles et nos autres services (ensemble, les « Services »). En accédant aux Services ou en les utilisant, vous acceptez d’être lié par les présentes Conditions. Si vous ne les acceptez pas, vous n’êtes pas autorisé à accéder aux Services ni à les utiliser.",
      },
    ],
    sections: [
      {
        heading: "1. Votre accès aux Services",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora est réservé aux utilisateurs âgés de 16 ans ou plus. En utilisant Agora, vous confirmez satisfaire à cette condition d’âge et avoir dépassé l’âge minimal requis par la législation de votre pays de résidence pour accéder aux Services et les utiliser.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Vous pouvez consulter les contenus publiés sur Agora sans vous inscrire. La participation aux conversations, questionnaires ou activités de priorisation (« Contenu ») peut nécessiter un compte invité lié à l’appareil ou une méthode de vérification particulière. Les méthodes disponibles comprennent :",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "La participation en tant qu’invité au moyen d’un compte lié à l’appareil, lorsqu’elle est autorisée. L’accès et la récupération dépendent de la conservation des clés d’origine de l’appareil.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "La vérification par e-mail au moyen d’un code à usage unique. Elle prouve le contrôle de l’adresse e-mail, et non l’identité réelle ou l’unicité d’une personne.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "La connexion par numéro de téléphone (vérifié au moyen d’un code à usage unique)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "La vérification de l’admissibilité fondée sur un passeport par l’intermédiaire de ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: ". Agora reçoit les signaux divulgués par la preuve, plutôt que le passeport sous-jacent. L’inscription auprès de Rarimo est soumise à sa condition d’âge supplémentaire : vous devez avoir 18 ans ou plus. Les conditions applicables du prestataire régissent également son service de vérification.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Vous ne devez pas utiliser les Services si :",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Vous avez fait l’objet d’une suspension ou d’une exclusion d’Agora.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "La législation applicable dans votre juridiction vous interdit d’utiliser les Services.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Vous n’avez pas la capacité de conclure un contrat juridiquement contraignant avec Agora ou, si vous n’avez pas atteint l’âge de la majorité dans votre juridiction, votre représentant légal n’a pas examiné et accepté les présentes Conditions.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        heading: "2. Politique de confidentialité",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "La Politique de confidentialité d’Agora explique comment nous collectons, utilisons et protégeons vos données à caractère personnel. En accédant aux Services ou en les utilisant, vous acceptez les présentes Conditions. Vos données à caractère personnel sont traitées selon les modalités décrites dans la Politique de confidentialité, et nous sollicitons votre consentement lorsqu’il est requis pour des opérations de traitement particulières. Pour en savoir plus, consultez la ",
              },
              {
                text: "Politique de confidentialité d’Agora",
                kind: "link",
                href: "/legal/privacy",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "3. Votre utilisation des Services",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Sous réserve des présentes Conditions, Agora vous accorde une licence non exclusive, non transférable et révocable d’utilisation des Services. Il vous est interdit de :",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Utiliser Agora pour diffuser de fausses informations ou des propos haineux, ou pour harceler autrui.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Vous livrer à des activités illégales.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Vous livrer à des activités frauduleuses, des escroqueries ou des pratiques trompeuses, ou en faire la promotion.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Diffuser ou promouvoir des contenus sexuellement explicites, violents ou autrement inappropriés.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Utiliser Agora pour traquer, intimider ou menacer des personnes ou des groupes.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Tenter de manipuler ou d’exploiter la plateforme, les algorithmes ou les fonctionnalités d’Agora pour en tirer un avantage personnel ou commercial.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Vous livrer à des activités qui encouragent l’automutilation, le suicide ou toute forme de mise en danger.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Porter atteinte aux droits de propriété intellectuelle, notamment par la diffusion non autorisée d’œuvres protégées par le droit d’auteur.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Concéder sous licence, vendre, transférer, céder, distribuer, héberger ou exploiter de toute autre manière à des fins commerciales les Services ou le Contenu",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Tenter de pirater ou de perturber l’infrastructure d’Agora, ou d’en effectuer l’ingénierie inverse.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Utiliser des outils automatisés pour contourner les restrictions d’accès ou extraire des contenus de manière abusive. Cela n’interdit pas l’utilisation autorisée des exports activés.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Usurper l’identité d’un autre utilisateur, d’une entité ou d’une organisation.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Partager ou diffuser des logiciels malveillants, des tentatives d’hameçonnage ou des dispositifs frauduleux.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Porter atteinte à la vie privée d’autres utilisateurs en divulguant des informations personnelles ou sensibles sans consentement, notamment en partageant des adresses personnelles, des numéros de téléphone, des informations financières ou des communications privées sans autorisation explicite.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora se réserve le droit de modifier ou de supprimer des fonctionnalités à tout moment sans préavis. Toute amélioration, mise à jour ou adjonction future aux Services sera régie par les présentes Conditions, qui peuvent être révisées périodiquement. Vous reconnaissez qu’Agora n’est pas responsable envers vous ni envers un tiers des modifications, suspensions ou interruptions définitives des Services ou de l’un quelconque de leurs composants.",
              },
            ],
          },
        ],
      },
      {
        heading: "4. Votre Contenu",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Les Services peuvent contenir divers types de contenus, notamment des textes, liens, images, vidéos, contenus audio et autres éléments soumis par les utilisateurs (le « Contenu »). Agora ne garantit ni l’exactitude, ni l’exhaustivité, ni la fiabilité d’un quelconque Contenu et n’assume aucune responsabilité à son égard.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "En soumettant du Contenu, vous confirmez disposer de tous les droits nécessaires pour le partager et qu’il ne contrevient à aucune loi applicable ni à aucun droit de tiers. Vous êtes seul responsable de votre contenu et de toute conséquence découlant de son partage sur Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "En utilisant les Services, vous conservez la propriété de votre contenu, mais accordez à Agora une licence mondiale, non exclusive, sans redevance, perpétuelle et susceptible de sous-licence pour stocker, utiliser, modifier, distribuer et afficher votre contenu aux fins du fonctionnement de la plateforme, de la conformité et de l’exploitation. Cette licence comprend le droit pour Agora de mettre votre Contenu à disposition aux fins de syndication, de distribution, d’agrégation ou de publication par des partenaires tiers.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora se réserve le droit, à sa discrétion, de supprimer ou de restreindre un contenu s’il contrevient aux présentes Conditions, aux lois applicables ou aux règles de la plateforme.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Cette licence ne prime pas sur les droits applicables en matière de protection des données ou d’effacement et n’élargit pas l’accès aux participations privées. La suppression acceptée du compte masque les propositions personnelles et exclut la participation des nouveaux calculs des résultats courants. Les données nécessaires à la récupération restent privées pendant le délai de récupération de 15 jours. Nous conservons indéfiniment les données numériques individuelles ayant servi aux résultats enregistrés (matrices Polis, choix BWS/pairwise et allocations QV) pour l’analyse des votes et leur recalcul, en supprimant les liens avec le compte lors du nettoyage définitif. Il ne s’agit pas d’un historique de chaque enregistrement ou calcul QV. La suppression ordinaire ne recalcule pas les chiffres enregistrés ; des corrections ou une nouvelle analyse distinctes peuvent les modifier. Les descriptions historiques produites par IA ne sont pas automatiquement réécrites lors d’une suppression ordinaire ; les droits d’effacement applicables demeurent. Le téléchargement des exports existants expire au plus tard 30 jours après leur génération ; les nouveaux exports tiennent compte de l’état actuel des suppressions. La suppression des liens ne garantit pas l’anonymat.",
              },
            ],
          },
        ],
      },
      {
        heading: "5. Règles relatives aux contenus et à la modération",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Vous ne pouvez pas publier de Contenu qui :",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Encourage la violence ou les activités illégales.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Contient des propos haineux, du harcèlement ou des attaques personnelles.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Diffuse de fausses informations ou des contenus manipulateurs.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Porte atteinte aux droits de propriété intellectuelle.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora utilise un système de modération des contenus fondé sur les signalements des utilisateurs, la détection automatisée et les ",
              },
              {
                text: "Règles de la communauté",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: ". Les contenus contrevenant aux présentes Conditions peuvent être supprimés, et les auteurs d’infractions répétées peuvent faire l’objet d’une suspension ou d’une exclusion.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Pour signaler un contenu illégal ou nous saisir de questions de modération ou d’ordre juridique, veuillez nous contacter à l’adresse ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "6. Contenus de tiers et publicités",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora peut contenir des liens vers des sites web, produits ou services de tiers, qui peuvent être partagés par des annonceurs, des partenaires, des entités affiliées ou d’autres utilisateurs (les « Contenus de tiers »). Agora ne contrôle ni n’approuve ces sources externes et n’assume aucune responsabilité quant à leur exactitude, leur légalité ou leur fiabilité.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "L’accès aux Contenus de tiers ou l’interaction avec ceux-ci se fait à vos propres risques, et nous vous invitons à consulter les conditions et politiques pertinentes avant d’interagir avec des sources externes ou de réaliser des transactions.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora peut afficher des publicités ou des contenus sponsorisés. Le type, le ciblage et la fréquence des publicités peuvent évoluer, et nous nous réservons le droit d’associer des publicités à tout contenu ou service fourni sur Agora. Vos interactions avec les contenus sponsorisés ou les publicités se font exclusivement à vos propres risques, et nous ne garantissons ni l’exactitude, ni la qualité, ni la légitimité des produits ou services faisant l’objet de la publicité.",
              },
            ],
          },
        ],
      },
      {
        heading: "7. Propriété intellectuelle",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "L’ensemble des droits de propriété intellectuelle associés à Agora, notamment les brevets, marques, noms commerciaux, droits d’auteur, secrets d’affaires, données propriétaires, savoir-faire, droits moraux, droits sur les bases de données, droits sur les dessins et modèles, algorithmes, logiciels, codes informatiques, interfaces visuelles et tous autres droits de propriété, enregistrés ou non, appartiennent à Agora ou lui sont concédés sous licence. Sont également compris les demandes d’enregistrement et les droits de demander l’enregistrement de cette propriété intellectuelle en vertu des lois de toute juridiction.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Toute utilisation, reproduction, modification, distribution ou exploitation non autorisée de la propriété intellectuelle d’Agora est strictement interdite. Cela comprend notamment l’ingénierie inverse des logiciels, la vente d’éléments propriétaires ou l’utilisation de tout contenu propriétaire sans l’autorisation écrite préalable d’Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Toute atteinte à ces droits de propriété intellectuelle peut donner lieu à des poursuites judiciaires. Agora se réserve tous les droits qui ne sont pas expressément accordés par les présentes Conditions.",
              },
            ],
          },
        ],
      },
      {
        heading: "8. Résiliation des Services",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Vous pouvez demander la suppression de votre Compte et cesser d’utiliser les Services à tout moment. Dès l’acceptation de votre demande, l’accès ordinaire au compte cesse et le délai de récupération de 15 jours commence. Une demande refusée ne clôture pas votre compte et ne déclenche pas ce délai. Vous pouvez annuler explicitement une demande ordinaire de suppression de compte acceptée pendant ce délai ; l’effacement définitif et les données conservées suivent la Politique de confidentialité.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Les sections suivantes continueront de s’appliquer après toute résiliation des présentes Conditions ou clôture de votre Compte :",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "3. Votre utilisation des Services,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "4. Votre Contenu,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "8. Résiliation des Services,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. Exclusions de garantie et limitation de responsabilité,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "10. Indemnisation",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "14. Dispositions diverses.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Comment supprimer votre compte :",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Utilisez la commande disponible de suppression de compte après authentification ou contactez legal@zkorum.com pour obtenir de l’aide. Si vos responsabilités au sein d’une organisation empêchent la suppression par ces commandes, contactez-nous. Nous vérifions la titularité au moyen de données d’authentification prises en charge ou d’une preuve de possession des clés de l’appareil, selon le type de compte ; cela n’implique pas que vous deviez nous envoyer une image de passeport ni que nous conservions indéfiniment un ensemble de preuves signées.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "La suppression acceptée désactive l’accès ordinaire, révoque les sessions et masque les propositions personnelles. Les résultats des activités ouvertes peuvent être actualisés de manière asynchrone ; les résultats numériques conservés et les exports existants suivent la Politique de confidentialité. Les données nécessaires à la récupération restent privées. La récupération exige une annulation explicite et la vérification de la titularité, strictement avant l’échéance enregistrée des 15 jours et avant le début de la purge irréversible. Les invités ont besoin des clés d’origine de leur appareil ; leur perte peut empêcher la récupération. Une récupération réussie crée une nouvelle session, sans rétablir l’accès par les sessions précédemment révoquées.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "La récupération prend fin à l’échéance des 15 jours, et les données privées du compte deviennent admissibles au nettoyage définitif dans les meilleurs délais. Les retards de nettoyage ne prolongent pas la récupération et ne font pas repartir les délais légaux applicables. Les données d’entrée conservées, les enregistrements à accès restreint et les sauvegardes suivent la Politique de confidentialité. Une inscription ultérieure ne permet pas de récupérer les participations dissociées.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Contenus individuels, moyens d’authentification et projets partagés :",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            items: [
              {
                content: [
                  {
                    text: "Contenus individuels :",
                    kind: "strong",
                  },
                  {
                    text: " La suppression autorisée d’un contenu masque immédiatement le texte, ses versions, ses traductions et son attribution, y compris dans les points de contrôle conservés, sans le délai de récupération du compte. La suppression du compte masque les propositions personnelles dans les vues courantes, mais peut conserver le texte historique autorisé sans attribution publique au compte. Gérez vos contenus séparément avant de supprimer votre compte si vous souhaitez aussi retirer ce texte ; les demandes d’effacement applicables n’exigent pas de supprimer manuellement chaque contribution. Les commandes de retrait suivent les règles d’ouverture et de clôture de l’activité et ne réécrivent pas les résultats conservés. Après la suppression définitive des liens, les commandes du compte ne permettent plus de retrouver, modifier ou retirer les données numériques dissociées.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Portée de la récupération :",
                    kind: "strong",
                  },
                  {
                    text: " La récupération du compte peut rétablir le texte autorisé, les traductions, l’attribution et l’admissibilité actuelle des propositions masquées du seul fait de la suppression du compte, y compris dans nos instantanés. Elle ne rétablit pas les contenus, projets ou documents supprimés indépendamment, les votes retirés, les fusions irréversibles de comptes invités, les décisions de modération intervenues entre-temps ni les résultats effacés séparément, et ne duplique pas les votes conservés. Les invités doivent conserver les clés d’origine de l’appareil pour prouver la titularité du compte. La récupération n’est plus disponible à partir de l’échéance exacte ou dès que la purge irréversible a commencé.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Organisations et projets :",
                    kind: "strong",
                  },
                  {
                    text: " Les actions de suppression nécessitent les autorisations pertinentes et ne constituent pas un archivage réversible. La suppression d’un projet supprime les conversations et documents qu’il contient ainsi que les données numériques d’entrée conservées et les rapports dont il est l’unique propriétaire, selon les règles de nettoyage applicables. Avant la suppression d’une organisation, tout projet subsistant dont elle est l’unique propriétaire doit être transféré à un autre propriétaire subsistant. Les projets détenus en commun restent avec leurs propriétaires subsistants, et les relations de l’organisation supprimée sont retirées. La suppression d’un projet autorisée séparément est traitée comme la suppression propre à ce projet, et non comme une action de récupération de compte.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Les demandes applicables relatives aux données personnelles suivent les dispositions générales de la Politique de confidentialité concernant vos droits, sans imposer le délai de récupération du produit. Certains enregistrements limités peuvent subsister après la suppression pour les finalités décrites dans la Politique de confidentialité :",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Des hachages de courte durée protégeant contre le rejeu et l’état nécessaire de restriction ou de blocage pour leur finalité de protection, plutôt qu’une archive indéfinie de preuves complètes d’authentification ou de suppression.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Des enregistrements d’événements opérationnels ou de sécurité soumis à la politique de conservation applicable, notamment la politique de 180 jours des groupes de journaux CloudWatch. Ces enregistrements sont limités à leur finalité et sont distincts des données de compte conservées ou de la durée de conservation des sauvegardes.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Des instructions minimales d’effacement nécessaires pour empêcher la restauration d’informations supprimées depuis les sauvegardes, et des éléments de preuve strictement délimités relatifs à un incident, une obligation légale ou une réclamation particulière lorsque cela est justifié.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Ces enregistrements à accès restreint ne créent pas d’autorisation générale ni de justification pour conserver indéfiniment les contenus supprimés, les profils de participation individuels ou les moyens d’authentification. Les copies téléchargées ou détenues de manière indépendante et le traitement par les sous-traitants ou destinataires sont expliqués dans la Politique de confidentialité. Aucune disposition de la présente section ne limite les droits légaux applicables en matière de protection des données.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora se réserve le droit de suspendre ou de clôturer les comptes qui contreviennent aux présentes Conditions.",
              },
            ],
          },
        ],
      },
      {
        heading: "9. Exclusions de garantie et limitation de responsabilité",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Les Services sont fournis « en l’état », sans garantie d’aucune sorte. Agora ne fait aucune déclaration et n’accorde aucune garantie, expresse, implicite, légale ou autre, notamment aucune garantie de qualité marchande, d’adéquation à un usage particulier, d’absence de contrefaçon ou de disponibilité des Services.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora ne garantit pas que les Services seront exempts d’erreurs, ininterrompus ou sécurisés, ni que les défauts seront corrigés. Les utilisateurs assument tous les risques liés à l’utilisation des Services.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Dans toute la mesure permise par la loi, Agora n’est pas responsable des dommages indirects, accessoires, consécutifs, punitifs ou spéciaux découlant de votre utilisation des Services ou s’y rapportant, qu’ils soient fondés sur la responsabilité contractuelle, délictuelle, sans faute ou sur tout autre fondement juridique, même si Agora a été informé de la possibilité de tels dommages. Sont notamment compris les dommages liés à la perte de bénéfices, à la perte de données, aux préjudices corporels, aux dommages matériels ou à l’interruption d’activité.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Certaines juridictions n’autorisent pas l’exclusion ou la limitation de certains dommages ; certaines de ces limitations peuvent donc ne pas vous être applicables.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Bien qu’Agora mette en œuvre la technologie des preuves à divulgation nulle de connaissance (ZKP) pour renforcer la confidentialité et la sécurité, les utilisateurs reconnaissent qu’aucune technologie n’est infaillible. Des vulnérabilités ou défauts imprévus peuvent exister dans la mise en œuvre des ZKP et pourraient entraîner une divulgation non autorisée de données ou des atteintes à la vie privée. Agora ne donne aucune garantie quant à la sécurité ou à la fiabilité absolue des ZKP et n’assume aucune responsabilité pour les conséquences involontaires découlant de leur utilisation.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Les utilisateurs sont invités à prendre des précautions supplémentaires, notamment à utiliser des outils d’anonymat tels que Tor pour masquer leur adresse IP, à éviter de partager un excès d’informations personnelles dans leurs écrits et à prêter attention à leur style d’écriture et aux attributs divulgués qui pourraient involontairement révéler leur identité par recoupement avec leur passeport et d’autres actions enregistrées.",
              },
            ],
          },
        ],
      },
      {
        heading: "10. Indemnisation",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Sauf interdiction légale, vous vous engagez à assurer la défense d’Agora, de ses entités affiliées et de leurs administrateurs, dirigeants, salariés, mandataires, prestataires, fournisseurs de services tiers et concédants de licence respectifs, à les indemniser et à les garantir contre l’ensemble des réclamations, demandes, responsabilités, dommages, pertes et dépenses (y compris les honoraires et frais juridiques) découlant des éléments suivants ou s’y rapportant :",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            marker: "lower-alpha",
            items: [
              {
                content: [
                  {
                    text: "votre utilisation d’Agora et de ses Services ;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "votre violation des présentes Conditions ;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "votre violation de toute loi ou réglementation applicable ; ou",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "tout Contenu que vous soumettez, publiez ou partagez sur Agora.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora se réserve le droit de prendre le contrôle de la défense de toute affaire pour laquelle vous êtes tenu de nous indemniser, et vous vous engagez à coopérer pleinement à notre défense contre ces réclamations. Vos obligations d’indemnisation subsisteront après toute cessation ou suspension de votre utilisation d’Agora et de ses Services.",
              },
            ],
          },
        ],
      },
      {
        heading: "11. Divisibilité",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Dans la mesure du possible, les dispositions des présentes Conditions doivent être interprétées de manière à être valables et opposables au regard du droit applicable. Toutefois, si une ou plusieurs dispositions des présentes Conditions sont déclarées nulles, illégales ou inapplicables, en tout ou partie, le reste de la disposition concernée et des présentes Conditions n’en sera pas affecté et continuera de produire pleinement ses effets comme si la disposition nulle, illégale ou inapplicable n’y avait jamais figuré.",
              },
            ],
          },
        ],
      },
      {
        heading: "12. Droit applicable et règlement des litiges",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Les présentes Conditions, y compris toute question relative à leur validité, leur interprétation, leur application, leur exécution ou leur résiliation, ainsi que tout litige découlant de demandes de nature délictuelle, d’obligations précontractuelles ou de la responsabilité extracontractuelle, sont régies et interprétées conformément au droit français. Il ne sera donné effet à aucun autre principe de choix de loi ni à aucune règle de conflit de lois qui conduirait à l’application des lois d’une juridiction autre que la France.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Nous souhaitons que votre expérience sur Agora soit positive. En cas de difficulté ou de litige, vous acceptez de tenter d’abord de le résoudre avec nous à l’amiable. Vous pouvez nous faire part de vos observations ou préoccupations à l’adresse ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Tout litige qui ne peut être résolu à l’amiable relève de la compétence exclusive des tribunaux de Neuilly Sur Seine.",
              },
            ],
          },
        ],
      },
      {
        heading: "13. Modifications des présentes Conditions",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora peut mettre à jour les présentes Conditions périodiquement afin de refléter l’évolution de nos services, des exigences légales ou d’autres besoins opérationnels. En cas de modifications importantes, nous en informerons les utilisateurs au moyen de notifications dans l’application, de bandeaux ou de messages exigeant une confirmation de prise de connaissance avant l’entrée en vigueur des modifications.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "En continuant d’accéder à Agora ou de l’utiliser après l’entrée en vigueur des Conditions révisées, vous acceptez d’être lié par les Conditions mises à jour. Si vous n’acceptez pas les modifications, vous devez cesser d’utiliser Agora avant leur entrée en vigueur.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Nous invitons les utilisateurs à consulter régulièrement les présentes Conditions afin de rester informés de leurs droits et obligations lors de l’utilisation d’Agora.",
              },
            ],
          },
        ],
      },
      {
        heading: "14. Dispositions diverses",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Les présentes Conditions, conjointement avec la Politique de confidentialité, constituent l’intégralité de l’accord régissant votre accès à Agora et son utilisation. Le fait pour nous de ne pas exercer un droit ou de ne pas faire appliquer une disposition des présentes Conditions ne saurait être considéré comme une renonciation à ce droit ou à cette disposition.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Si une disposition des présentes Conditions est déclarée nulle ou inapplicable, elle sera appliquée dans toute la mesure permise, et les autres dispositions continueront de produire pleinement leurs effets.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Vous ne pouvez céder ni transférer aucun de vos droits ou obligations au titre des présentes Conditions sans notre consentement préalable. Nous nous réservons toutefois le droit de céder librement, sans restriction, nos droits et obligations au titre des présentes Conditions.",
              },
            ],
          },
        ],
      },
      {
        heading: "15. Coordonnées",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Pour toute question ou préoccupation concernant les présentes Conditions, contactez-nous à l’adresse : ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "En utilisant Agora, vous reconnaissez les présentes Conditions et toute modification future et les acceptez.",
              },
            ],
          },
          {
            type: "address",
            lines: [
              "ZKORUM SAS",
              "99 AVENUE ACHILLE PERETTI",
              "92200 NEUILLY-SUR-SEINE",
              "FRANCE",
            ],
          },
        ],
      },
    ],
  },
  he: {
    termsOfService: "תנאי השירות",
    automatedTranslationNoticeTitle: "הודעה על תרגום אוטומטי",
    automatedTranslationNotice:
      "תרגום זה נוצר באופן אוטומטי. במקרה של אי־התאמה, חוסר עקביות או סתירה כלשהם, הנוסח באנגלית הוא הנוסח המחייב והוא בלבד גובר.",
    viewAuthoritativeEnglishVersion: "הצגת הנוסח המחייב באנגלית",
    returnToTranslatedVersion: "חזרה לנוסח המתורגם",
    lastUpdatedLabel: "עודכן לאחרונה בתאריך",
    lastUpdatedDate: "2026/10/14 (YYYY/MM/DD)",
    introduction: [
      {
        text: 'ברוכים הבאים ל־Agora Citizen Network ("Agora")! תנאים אלה (להלן: "התנאים") מסדירים את גישתכם לפלטפורמת Agora ואת השימוש שלכם בה, לרבות אתר האינטרנט, היישומים למכשירים ניידים ושירותים אחרים שלנו (יחד, להלן: "השירותים"). בגישה לשירותים או בשימוש בהם, אתם מסכימים להיות מחויבים לתנאים אלה. אם אינכם מסכימים, אינכם רשאים לגשת לשירותים או להשתמש בהם.',
      },
    ],
    sections: [
      {
        heading: "1. גישתכם לשירותים",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora זמינה רק למשתמשים בני 16 ומעלה. בשימוש ב־Agora אתם מאשרים שאתם עומדים בדרישת גיל זו ושגילכם עולה על הגיל המזערי הנדרש לפי דיני מדינת מגוריכם כדי לגשת לשירותים ולהשתמש בהם.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: 'תוכלו לעיין בתוכן שפורסם ב־Agora ללא הרשמה. השתתפות בשיחות, בסקרים או בפעילויות לקביעת סדרי עדיפויות ("תוכן") עשויה לחייב חשבון אורח המבוסס על מכשיר או שיטת אימות מסוימת. השיטות הזמינות כוללות:',
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "השתתפות אורח המבוססת על מכשיר, כאשר היא מותרת. הגישה והשחזור תלויים בשמירת המפתחות המקוריים של המכשיר.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "אימות בדואר אלקטרוני באמצעות קוד חד־פעמי. הדבר מוכיח שליטה בכתובת הדואר האלקטרוני, ולא זהות בעולם האמיתי או ייחודיות.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "התחברות באמצעות מספר טלפון (המאומת באמצעות קוד חד־פעמי)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "אימות זכאות המבוסס על דרכון באמצעות ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: ". Agora מקבלת את אותות ההוכחה שנחשפו, ולא את הדרכון שעליו הם מבוססים. הרשמה ב־Rarimo כפופה לדרישת הגיל הנוספת שלה: עליכם להיות בני 18 ומעלה. גם התנאים החלים של הספק מסדירים את שירות האימות שלו.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "אסור לכם להשתמש בשירותים אם:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "הושעיתם מ־Agora או הורחקתם ממנה.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "חל עליכם איסור חוקי להשתמש בשירותים בתחום השיפוט שלכם.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "אינכם יכולים להתקשר בחוזה מחייב עם Agora, או אם טרם הגעתם לגיל הבגירות בתחום השיפוט שלכם, אלא אם האפוטרופוס החוקי שלכם עיין בתנאים אלה והסכים להם.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        heading: "2. מדיניות פרטיות",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "מדיניות הפרטיות של Agora מסבירה כיצד אנו אוספים את נתוניכם האישיים, משתמשים בהם ומגינים עליהם. בגישה לשירותים או בשימוש בהם אתם מסכימים לתנאים אלה. נתוניכם האישיים מעובדים כמתואר במדיניות הפרטיות, ואנו מבקשים את הסכמתכם כאשר היא נדרשת לפעילויות עיבוד מסוימות. לפרטים נוספים, עיינו ב־ ",
              },
              {
                text: "מדיניות הפרטיות של Agora",
                kind: "link",
                href: "/legal/privacy",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "3. השימוש שלכם בשירותים",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "בכפוף לתנאים אלה, Agora מעניקה לכם רישיון לא בלעדי, שאינו ניתן להעברה וניתן לביטול, להשתמש בשירותים. אינכם רשאים:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "להשתמש ב־Agora להפצת מידע כוזב, דברי שנאה או הטרדה.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "לעסוק בפעילויות בלתי חוקיות.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "לעסוק בפעילויות הונאה, תרמיות או פרקטיקות מטעות, או לקדמן.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "להפיץ או לקדם תוכן מיני מפורש, אלים או בלתי הולם בדרך אחרת.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "להשתמש ב־Agora כדי לעקוב באופן מטריד אחר יחידים או קבוצות, להפחידם או לאיים עליהם.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "לנסות לתמרן או לנצל את הפלטפורמה, האלגוריתמים או התכונות של Agora לצורך רווח אישי או מסחרי.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "לעסוק בפעילויות המעודדות פגיעה עצמית, התאבדות או כל צורה של העמדה בסכנה.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "להפר זכויות קניין רוחני, לרבות הפצה בלתי מורשית של חומר המוגן בזכויות יוצרים.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "להעניק רישיון לשירותים או לתוכן, למוכרם, להעבירם, להמחותם, להפיצם, לארחם או לנצלם באופן מסחרי בכל דרך אחרת",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "לנסות לפרוץ לתשתית Agora, לשבש אותה או לבצע בה הנדסה לאחור.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "להשתמש בכלים אוטומטיים כדי לעקוף הגבלות גישה או לחלץ תוכן תוך שימוש לרעה. אין בכך איסור על שימוש מורשה בייצואים שהופעלו.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "להתחזות למשתמש, לישות או לארגון אחרים.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "לשתף או להפיץ תוכנות זדוניות, ניסיונות דיוג או תוכניות הונאה.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "לפגוע בפרטיותם של משתמשים אחרים באמצעות חשיפת מידע אישי או רגיש ללא הסכמה, לרבות, אך לא רק, שיתוף כתובות אישיות, מספרי טלפון, פרטים פיננסיים או תקשורת פרטית כלשהי ללא רשות מפורשת.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora שומרת לעצמה את הזכות לשנות או להסיר תכונות בכל עת ללא הודעה מוקדמת. כל שיפור, עדכון או תוספת עתידיים לשירותים יהיו כפופים לתנאים אלה, העשויים להתעדכן מעת לעת. אתם מכירים בכך ש־Agora אינה אחראית כלפיכם או כלפי צד שלישי כלשהו לשינויים, להשעיות או להפסקות של השירותים או של כל אחד מרכיביהם.",
              },
            ],
          },
        ],
      },
      {
        heading: "4. התוכן שלכם",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'השירותים עשויים לכלול סוגים שונים של תוכן, לרבות טקסט, קישורים, תמונות, סרטונים, שמע וחומרים אחרים שנשלחו בידי משתמשים ("תוכן"). Agora אינה מבטיחה את דיוקו, שלמותו או אמינותו של תוכן כלשהו ואינה נוטלת אחריות לגביו.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "בשליחת תוכן אתם מאשרים שיש לכם את כל הזכויות הנחוצות לשתפו ושהוא אינו מפר דין חל או זכויות של צד שלישי. אתם נושאים באחריות הבלעדית לתוכן שלכם ולכל תוצאה הנובעת משיתופו ב־Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "בשימוש בשירותים אתם שומרים על הבעלות בתוכן שלכם, אך מעניקים ל־Agora רישיון כלל־עולמי, לא בלעדי, ללא תמלוגים, לצמיתות וניתן למתן רישיונות משנה, לאחסן, להשתמש, לשנות, להפיץ ולהציג את התוכן שלכם לצורך תפקוד הפלטפורמה, עמידה בדרישות ותפעול. הדבר כולל את זכותה של Agora להעמיד את התוכן שלכם לרשות שותפים שהם צדדים שלישיים לצורך הפצה חוזרת, הפצה, איגוד או פרסום.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora שומרת לעצמה את הזכות להסיר תוכן או להגביל אותו לפי שיקול דעתה אם הוא מפר תנאים אלה, דין חל או את מדיניות הפלטפורמה.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "רישיון זה אינו גובר על זכויות להגנת נתונים או למחיקה לפי דין ואינו מרחיב גישה להשתתפות פרטית. בקשת מחיקת חשבון שאושרה מסתירה הצהרות אישיות ומוציאה השתתפות מקלט לחישובים חיים חדשים. נתוני השחזור הנחוצים נשארים פרטיים בתקופת השחזור בת 15 הימים. אנו שומרים ללא הגבלת זמן את הקלט המספרי האישי ששימש לתוצאות שנשמרו (מטריצות Polis, בחירות BWS/pairwise והקצאות QV), לצורך ניתוח הצבעות וחישוב מחדש, ומסירים קישורים לחשבון בניקוי הסופי. אין זו היסטוריה של כל שמירה או חישוב QV. מחיקה רגילה אינה מחשבת מחדש מספרים שנשמרו; תיקונים נפרדים או ניתוח חוזר עשויים לשנותם. תיאורי AI היסטוריים אינם נכתבים מחדש אוטומטית בעקבות מחיקה רגילה; זכויות המחיקה לפי דין נשמרות. הורדת ייצואים קיימים פוקעת לכל המאוחר 30 ימים לאחר יצירתם; ייצואים חדשים משקפים את מצב המחיקה הנוכחי. ניתוק קישורים אינו מבטיח אנונימיות.",
              },
            ],
          },
        ],
      },
      {
        heading: "5. מדיניות תוכן ופיקוח על תוכן",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "אינכם רשאים לפרסם תוכן אשר:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "מקדם אלימות או פעילויות בלתי חוקיות.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "כולל דברי שנאה, הטרדה או התקפות אישיות.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "מפיץ מידע כוזב או תוכן מניפולטיבי.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "מפר זכויות קניין רוחני.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora מפעילה מערכת לפיקוח על תוכן המבוססת על דיווחי משתמשים, זיהוי אוטומטי ו־ ",
              },
              {
                text: "כללי הקהילה",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: ". תוכן המפר תנאים אלה עשוי להיות מוסר, ומפרים חוזרים עשויים להיות מושעים או חסומים.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "כדי לדווח על תוכן בלתי חוקי או לפנות בענייני פיקוח על תוכן וסוגיות משפטיות, אנא צרו עמנו קשר ב־ ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "6. תוכן של צדדים שלישיים ופרסומות",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'Agora עשויה לכלול קישורים לאתרי אינטרנט, למוצרים או לשירותים של צדדים שלישיים, העשויים להיות משותפים בידי מפרסמים, שותפים, גורמים מסונפים או משתמשים אחרים ("תוכן של צדדים שלישיים"). Agora אינה שולטת במקורות חיצוניים אלה, אינה מאמצת אותם ואינה נוטלת אחריות לדיוקם, לחוקיותם או לאמינותם.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "גישה לתוכן של צדדים שלישיים או אינטראקציה עמו נעשות על אחריותכם בלבד, ואנו ממליצים לעיין בכל תנאי או מדיניות רלוונטיים לפני אינטראקציה עם מקורות חיצוניים או השלמת עסקאות.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora עשויה להציג פרסומות או תוכן ממומן. סוג הפרסומות, מיקודן ותדירותן עשויים להשתנות, ואנו שומרים לעצמנו את הזכות להציב פרסומות בקשר לכל תוכן או שירות המסופקים ב־Agora. האינטראקציות שלכם עם תוכן ממומן או פרסומות נעשות על אחריותכם בלבד, ואיננו מבטיחים את הדיוק, האיכות או הלגיטימיות של מוצרים או שירותים מפורסמים כלשהם.",
              },
            ],
          },
        ],
      },
      {
        heading: "7. קניין רוחני",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "כל הקניין הרוחני הקשור ל־Agora, לרבות, אך לא רק, פטנטים, סימני מסחר, שמות מסחריים, זכויות יוצרים, סודות מסחריים, נתונים קנייניים, ידע מקצועי, זכויות מוסריות, זכויות במסדי נתונים, זכויות בעיצובים, אלגוריתמים, תוכנה, קוד מחשב, ממשקים חזותיים וכל זכות קניינית אחרת — רשומה או בלתי רשומה — הוא בבעלות Agora או בשימושה מכוח רישיון. הדבר כולל גם כל בקשה לרישום קניין רוחני כאמור או זכות להגיש בקשה כזו לפי דיני כל תחום שיפוט.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "שימוש, העתקה, שינוי, הפצה או ניצול של הקניין הרוחני של Agora ללא הרשאה אסורים בתכלית. בכלל זה, בין היתר, ביצוע הנדסה לאחור של תוכנה, מכירת חומרים קנייניים או שימוש בתוכן קנייני כלשהו ללא רשות מראש ובכתב מ־Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "כל הפרה של זכויות קניין רוחני אלה עשויה להוביל לנקיטת הליכים משפטיים. Agora שומרת לעצמה את כל הזכויות שלא הוענקו במפורש בתנאים אלה.",
              },
            ],
          },
        ],
      },
      {
        heading: "8. סיום השירותים",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "תוכלו לבקש את מחיקת חשבונכם ולהפסיק להשתמש בשירותים בכל עת. עם אישור בקשת המחיקה, הגישה הרגילה לחשבון נפסקת ומתחיל חלון שחזור בן 15 ימים. בקשה שנדחתה אינה סוגרת את החשבון ואינה מתחילה חלון זה. במהלך החלון תוכלו לבטל במפורש בקשה רגילה למחיקת חשבון שאושרה; מחיקה לצמיתות ורשומות שנשמרו כפופות למדיניות הפרטיות.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "הסעיפים הבאים ימשיכו לחול לאחר כל סיום של תנאים אלה או של חשבונכם:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "3. השימוש שלכם בשירותים,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "4. התוכן שלכם,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "8. סיום השירותים,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. היעדר אחריות והגבלת חבות,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "10. שיפוי",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "14. הוראות שונות.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "כיצד למחוק את חשבונכם:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "השתמשו בבקרה הזמינה למחיקת חשבון לאחר אימות, או פנו ל־legal@zkorum.com לסיוע. אם אחריותכם בארגון מונעת מחיקה באמצעות הבקרות, פנו אלינו. אנו מאמתים בעלות באמצעות אמצעי אימות נתמכים או הוכחה במפתח מכשיר, לפי סוג החשבון; אין בכך דרישה לשלוח לנו תמונת דרכון או לאסוף הוכחות חתומות ללא הגבלת זמן.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "מחיקה שאושרה משביתה גישה רגילה, מבטלת מושבים ומסתירה הצהרות אישיות. תוצאות פתוחות עשויות להתעדכן באופן אסינכרוני; תוצאות מספריות שנשמרו וייצואים קיימים כפופים למדיניות הפרטיות. נתוני השחזור הנחוצים נשארים פרטיים. שחזור מחייב ביטול מפורש ואימות בעלות, אך ורק לפני המועד השמור במערכת בתום 15 הימים ולפני תחילת מחיקה בלתי הפיכה. אורחים זקוקים למפתחות המכשיר המקוריים; אובדנם עלול למנוע שחזור. שחזור מוצלח יוצר מושב חדש ואינו מחזיר גישה באמצעות מושבים שבוטלו.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "השחזור מסתיים במועד האחרון בתום 15 הימים, ונתוני החשבון הפרטיים נעשים מיועדים לניקוי סופי ללא דיחוי בלתי מוצדק. עיכוב בניקוי אינו מאריך את השחזור או מתחיל מחדש מועדים חוקיים החלים. קלט שנשמר, רשומות מוגבלות וגיבויים כפופים למדיניות הפרטיות. הרשמה מאוחרת יותר אינה מאפשרת להשיב השתתפות שקישורה נותק.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "תוכן בודד, פרטי אימות ומיזמים משותפים:",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            items: [
              {
                content: [
                  {
                    text: "תוכן בודד:",
                    kind: "strong",
                  },
                  {
                    text: " מחיקת תוכן מורשית מסתירה מיד את הטקסט, הגרסאות, התרגומים והייחוס, גם בנקודות ביקורת שנשמרו, ללא חלון שחזור החשבון. מחיקת חשבון מסתירה הצהרות אישיות מהתצוגות העדכניות, אך עשויה לשמור טקסט היסטורי מותר ללא ייחוס פומבי לחשבון. נהלו את התוכן בנפרד לפני מחיקת החשבון אם ברצונכם להסיר גם טקסט זה; בקשות מחיקה לפי דין אינן מחייבות מחיקה ידנית של כל תרומה. בקרות ביטול השתתפות כפופות לכללי פעילות פתוחה או סגורה ואינן משנות תוצאות שנשמרו. לאחר ניתוק סופי, בקרות החשבון אינן מאפשרות לאחזר, לשנות או לבטל רשומות מספריות שקישורן נותק.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "היקף השחזור:",
                    kind: "strong",
                  },
                  {
                    text: " שחזור חשבון יכול להשיב טקסט מותר, תרגומים, ייחוס וזכאות נוכחית של הצהרות שהוסתרו אך ורק עקב מחיקת החשבון, לרבות בנקודות הביקורת שלנו. הוא אינו משחזר תוכן, מיזמים או מסמכים שנמחקו בנפרד, הצבעות שבוטלו, מיזוגי אורח בלתי הפיכים, פעולות פיקוח על תוכן שנעשו בינתיים או פלטים שנמחקו בנפרד, ואינו משכפל הצבעות שנשמרו. אורחים חייבים לשמור את המפתחות המקוריים של המכשיר כדי להוכיח בעלות. שחזור אינו זמין לאחר המועד האחרון המדויק או לאחר שהחלה מחיקה בלתי הפיכה.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "ארגונים ומיזמים:",
                    kind: "strong",
                  },
                  {
                    text: " פעולות מחיקה מחייבות הרשאות מתאימות ואינן העברה הפיכה לארכיון. מחיקת מיזם מסירה את השיחות והמסמכים שבתוכו ואת הקלט המספרי שנשמר והדוחות שבבעלותו הבלעדית, לפי כללי הניקוי החלים. לפני מחיקת ארגון יש להעביר כל מיזם שנותר בבעלותו הבלעדית לבעלים אחר שיישאר קיים. מיזמים בבעלות משותפת נשארים בידי הבעלים הנותרים, והקשרים של הארגון שנמחק מוסרים. מחיקת מיזם בהרשאה נפרדת מטופלת כמחיקת אותו מיזם, ולא כפעולת שחזור חשבון.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "בקשות לפי דין בעניין נתונים אישיים מטופלות לפי הוראות הזכויות הכלליות שבמדיניות הפרטיות, ללא חובה להמתין לתקופת השחזור של המוצר. רשומות מוגבלות עשויות להישאר לאחר מחיקה למטרות המתוארות במדיניות הפרטיות:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "גיבובים קצרי־מועד להגנה מפני שימוש חוזר ומצב נחוץ של הגבלות וחסימת פעולות למטרת ההגנה שלהם, במקום ארכיון בלתי מוגבל בזמן של הוכחות אימות או מחיקה מלאות.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "רשומות אירועים תפעוליים ואבטחתיים בהתאם למדיניות השמירה החלה, לרבות מדיניות קבוצות היומנים של CloudWatch למשך 180 ימים. רשומות אלה מוגבלות למטרתן ונבדלות מנתוני חשבון שנשמרו או מתקופת הגיבויים.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "הוראות מחיקה מינימליות הנחוצות למניעת שחזור מידע שנמחק מגיבויים, וראיות בהיקף מצומצם לאירוע מסוים, לחובה חוקית או לתביעה, ככל שיש לכך הצדקה.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "רשומות אלה בעלות הגישה המוגבלת אינן יוצרות רישיון כללי או הצדקה לשמירת תוכן שנמחק, דפוסי השתתפות אישיים או פרטי אימות ללא הגבלת זמן. עותקים שהורדו או המוחזקים באופן עצמאי והטיפול של מעבדי נתונים או מקבלי מידע מוסברים במדיניות הפרטיות. אין באמור בסעיף זה כדי להגביל זכויות להגנת נתונים החלות מכוח דין.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora שומרת לעצמה את הזכות להשעות או לסגור חשבונות המפרים תנאים אלה.",
              },
            ],
          },
        ],
      },
      {
        heading: "9. היעדר אחריות והגבלת חבות",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'השירותים ניתנים "כמות שהם" ללא אחריות מכל סוג. Agora אינה מציגה מצגים ואינה מעניקה התחייבויות או אחריות מכל סוג, בין מפורשות, משתמעות, מכוח חוק או אחרות, לרבות, אך לא רק, אחריות לסחירות, להתאמה למטרה מסוימת, לאי־הפרת זכויות או לזמינות השירותים.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora אינה מתחייבת שהשירותים יהיו נקיים משגיאות, רציפים או מאובטחים, או שליקויים יתוקנו. המשתמשים נוטלים על עצמם את כל הסיכונים הכרוכים בשימוש בשירותים.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "במידה המרבית המותרת לפי דין, Agora אינה אחראית לנזקים עקיפים, נלווים, תוצאתיים, עונשיים או מיוחדים הנובעים מהשימוש שלכם בשירותים או הקשורים אליו, בין מכוח חוזה, עוולה, אחריות קפידה או כל עילה משפטית אחרת, גם אם נמסר ל־Agora על האפשרות לנזקים אלה. בכלל זה, בין היתר, נזקים בגין אובדן רווחים, אובדן נתונים, נזקי גוף, נזקי רכוש או הפרעה לפעילות עסקית.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "תחומי שיפוט מסוימים אינם מתירים החרגה או הגבלה של נזקים מסוימים, ולכן ייתכן שחלק מהגבלות אלה לא יחולו עליכם.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "אף ש־Agora מיישמת טכנולוגיית הוכחת אפס־ידע (ZKP) לשיפור הפרטיות והאבטחה, המשתמשים מכירים בכך שאין טכנולוגיה חסינה לחלוטין מפני תקלות. ייתכנו פגיעויות או ליקויים בלתי צפויים ביישום ZKP, העלולים להביא לחשיפת נתונים בלתי מורשית או לפגיעה בפרטיות. Agora אינה מעניקה כל התחייבות בנוגע לאבטחה או לאמינות המוחלטות של ZKP ואינה נושאת בחבות לתוצאות בלתי מכוונות הנובעות מהשימוש בו.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "אנו ממליצים למשתמשים לנקוט אמצעי זהירות נוספים, כגון שימוש בכלים לאנונימיות כמו Tor להסתרת כתובת ה־IP שלהם, הימנעות משיתוף מופרז של מידע אישי בכתיבתם, ותשומת לב לסגנונות כתיבה ולמאפיינים משותפים העלולים לחשוף את זהותם שלא במכוון באמצעות הצלבה עם דרכונם ועם פעולות מתועדות אחרות.",
              },
            ],
          },
        ],
      },
      {
        heading: "10. שיפוי",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "למעט כאשר הדבר אסור לפי דין, אתם מסכימים להגן על Agora, על הגורמים המסונפים אליה ועל הדירקטורים, נושאי המשרה, העובדים, הנציגים, הקבלנים, ספקי השירותים שהם צדדים שלישיים ונותני הרישיונות שלהם, לשפותם ולפטור אותם מאחריות בגין כל תביעה, דרישה, חבות, נזק, הפסד או הוצאה (לרבות שכר טרחה והוצאות משפט) הנובעים מהעניינים הבאים או הקשורים אליהם:",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            marker: "lower-alpha",
            items: [
              {
                content: [
                  {
                    text: "השימוש שלכם ב־Agora ובשירותיה;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "הפרה שלכם של תנאים אלה;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "הפרה שלכם של דין או תקנה חלים; או",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "כל תוכן שאתם שולחים, מפרסמים או משתפים ב־Agora.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora שומרת לעצמה את הזכות ליטול לידיה את ניהול ההגנה בכל עניין שבגינו אתם נדרשים לשפות אותנו, ואתם מסכימים לשתף פעולה באופן מלא עם הגנתנו מפני תביעות אלה. חובות השיפוי שלכם ימשיכו לחול לאחר כל סיום או השעיה של השימוש שלכם ב־Agora ובשירותיה.",
              },
            ],
          },
        ],
      },
      {
        heading: "11. הפרדת הוראות",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "ככל האפשר, הוראות תנאים אלה יפורשו באופן שיהיה תקף וניתן לאכיפה לפי הדין החל. עם זאת, אם הוראה אחת או יותר בתנאים אלה תיקבע כבלתי תקפה, בלתי חוקית או בלתי ניתנת לאכיפה, כולה או חלקה, לא ייפגע תוקפן של יתרת אותה הוראה ושל יתר התנאים, והן ימשיכו לעמוד בתוקפן המלא כאילו ההוראה הבלתי תקפה, הבלתי חוקית או הבלתי ניתנת לאכיפה לא נכללה בהם מעולם.",
              },
            ],
          },
        ],
      },
      {
        heading: "12. הדין החל ויישוב סכסוכים",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "תנאים אלה, לרבות כל עניין הנוגע לתוקפם, לפרשנותם, לאכיפתם, לביצועם או לסיומם, וכן כל סכסוך הנובע מתביעות נזיקיות, מחובות טרום־חוזיות או מאחריות חוץ־חוזית, יהיו כפופים לדיני צרפת ויפורשו לפיהם. לא יינתן תוקף לעקרונות ברירת דין אחרים או לכללי התנגשות דינים שיחילו את דיני תחום שיפוט כלשהו מלבד צרפת.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "אנו מעוניינים שתהיה לכם חוויה חיובית ב־Agora. אם יש לכם בעיות או סכסוכים, אתם מסכימים לנסות תחילה לפתור אותם עמנו באופן בלתי פורמלי. תוכלו לפנות אלינו עם כל משוב או חשש ב־ ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "כל סכסוך שלא ניתן לפתור באופן בלתי פורמלי יהיה כפוף לסמכות השיפוט הבלעדית של בתי המשפט ב־Neuilly Sur Seine.",
              },
            ],
          },
        ],
      },
      {
        heading: "13. שינויים בתנאים אלה",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora עשויה לעדכן תנאים אלה מעת לעת כדי לשקף שינויים בשירותים שלנו, בדרישות הדין או בצרכים תפעוליים אחרים. אם נערוך שינויים משמעותיים, נודיע למשתמשים באמצעות הודעות בתוך היישום, כרזות או הודעות המחייבות אישור לפני כניסת השינויים לתוקף.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "בהמשך הגישה ל־Agora או השימוש בה לאחר כניסת התנאים המתוקנים לתוקף, אתם מסכימים להיות מחויבים לתנאים המעודכנים. אם אינכם מסכימים לשינויים, עליכם להפסיק את השימוש ב־Agora לפני כניסתם לתוקף.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "אנו ממליצים למשתמשים לעיין בתנאים אלה בקביעות כדי להישאר מעודכנים בזכויותיהם ובחובותיהם בעת השימוש ב־Agora.",
              },
            ],
          },
        ],
      },
      {
        heading: "14. הוראות שונות",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "תנאים אלה, יחד עם מדיניות הפרטיות, מהווים את מלוא ההסכם המסדיר את גישתכם ל־Agora ואת השימוש שלכם בה. אי־מימוש או אי־אכיפה מצידנו של זכות או הוראה כלשהי לפי תנאים אלה לא ייחשבו לוויתור על אותה זכות או הוראה.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "אם הוראה כלשהי בתנאים אלה תיקבע כבלתי תקפה או בלתי ניתנת לאכיפה, היא תיאכף במידה המרבית המותרת, ויתר ההוראות ימשיכו לעמוד בתוקפן המלא.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "אינכם רשאים להמחות או להעביר זכויות או חובות שלכם לפי תנאים אלה ללא הסכמתנו מראש. עם זאת, אנו שומרים לעצמנו את הזכות להמחות בחופשיות את זכויותינו וחובותינו לפי תנאים אלה ללא הגבלה.",
              },
            ],
          },
        ],
      },
      {
        heading: "15. פרטי קשר",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "לשאלות או לחששות בנוגע לתנאים אלה, פנו אלינו בכתובת: ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "בשימוש ב־Agora אתם מאשרים ומסכימים לתנאים אלה ולכל שינוי עתידי בהם.",
              },
            ],
          },
          {
            type: "address",
            lines: [
              "ZKORUM SAS",
              "99 AVENUE ACHILLE PERETTI",
              "92200 NEUILLY-SUR-SEINE",
              "FRANCE",
            ],
          },
        ],
      },
    ],
  },
  ja: {
    termsOfService: "利用規約",
    automatedTranslationNoticeTitle: "自動翻訳に関する通知",
    automatedTranslationNotice:
      "この翻訳は自動的に生成されたものです。相違、不一致または抵触がある場合には、英語版のみが優先して適用され、正文となります。",
    viewAuthoritativeEnglishVersion: "正文である英語版を表示",
    returnToTranslatedVersion: "翻訳版に戻る",
    lastUpdatedLabel: "最終更新日",
    lastUpdatedDate: "2026/10/14 (YYYY/MM/DD)",
    introduction: [
      {
        text: "Agora Citizen Network（「Agora」）へようこそ。本利用規約（「本規約」）は、当社のウェブサイト、モバイルアプリケーションおよびその他のサービス（総称して「本サービス」）を含むAgoraプラットフォームへのアクセスおよび利用に適用されます。本サービスにアクセスし、またはこれを利用することにより、利用者は本規約に拘束されることに同意するものとします。同意しない場合、本サービスにアクセスし、またはこれを利用することはできません。",
      },
    ],
    sections: [
      {
        heading: "1. 本サービスへのアクセス",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraは、16歳以上の利用者のみが利用できます。Agoraを利用することにより、利用者は、この年齢要件を満たしていること、および本サービスへのアクセスと利用について居住国の法律が要求する最低年齢を超えていることを確認するものとします。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "登録せずに、公開されたAgoraのコンテンツを閲覧できます。対話、アンケートまたは優先順位付けの活動（「コンテンツ」）への参加には、端末ベースのゲストアカウントまたは特定の確認方法が必要となる場合があります。利用可能な方法には、次のものがあります：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "許可されている場合の端末ベースのゲスト参加。アクセスおよび復旧には、元の端末鍵を保持していることが必要です。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "ワンタイムコードによるメールアドレスの確認。これはメールアドレスを管理していることの証明であり、実際の身元や一人につき一つであることの証明ではありません。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "電話番号によるログイン（ワンタイムコードで確認）",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "パスポートに基づく参加資格の確認（提供元： ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: "）。Agoraが受け取るのは開示された証明シグナルであり、元のパスポートではありません。Rarimoでの登録には、追加の年齢要件が適用され、18歳以上でなければなりません。事業者の確認サービスには、その事業者の適用される規約も適用されます。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "次の場合、本サービスを利用してはなりません：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Agoraでの利用を停止され、またはAgoraから排除されている場合。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "利用者の法域で、本サービスの利用が法律上禁止されている場合。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Agoraと法的拘束力を有する契約を締結できない場合、または利用者の法域で成年に達していない場合。ただし、法定保護者が本規約を確認し、同意している場合を除きます。",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        heading: "2. プライバシーポリシー",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraのプライバシーポリシーは、当社が個人データを収集、使用および保護する方法を説明しています。本サービスにアクセスし、またはこれを利用することにより、利用者は本規約に同意します。個人データは、プライバシーポリシーに記載するとおり処理され、特定の処理行為について必要な場合には同意を求めます。詳細については、次をご参照ください： ",
              },
              {
                text: "Agoraのプライバシーポリシー",
                kind: "link",
                href: "/legal/privacy",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "3. 本サービスの利用",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraは、本規約に従うことを条件として、本サービスを利用するための非独占的、譲渡不能かつ撤回可能な使用許諾を利用者に付与します。次の行為は禁止されます：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Agoraを用いて、誤情報、ヘイトスピーチまたは嫌がらせを広めること。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "違法な活動を行うこと。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "不正行為、詐欺または欺瞞的な行為を行い、もしくは助長すること。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "性的に露骨な、暴力的な、またはその他の不適切なコンテンツを配布し、もしくは助長すること。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Agoraを用いて、個人または集団につきまとい、威圧し、または脅迫すること。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "個人的または商業的な利益のため、Agoraのプラットフォーム、アルゴリズムまたは機能を不正に操作し、もしくは不当に利用しようとすること。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "自傷、自殺またはあらゆる形態の危険をもたらす行為を奨励する活動を行うこと。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "著作物の無許可の配布を含め、知的財産権を侵害すること。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "本サービスまたはコンテンツについて、使用許諾、販売、移転、譲渡、配布、ホスティング、またはその他の商業的利用を行うこと。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Agoraのインフラをハッキングし、妨害し、またはリバースエンジニアリングしようとすること。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "自動化ツールを用いてアクセス制限を回避し、またはコンテンツを濫用的に抽出すること。これは、有効にされたエクスポートを権限に基づいて利用することを禁止するものではありません。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "他の利用者、主体または組織になりすますこと。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "悪意あるソフトウェア、フィッシングの試み、または詐欺の仕組みを共有し、もしくは配布すること。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "同意なく個人情報または機微な情報を開示して、他の利用者のプライバシーを侵害すること。これには、明示的な許可なく個人の住所、電話番号、財務情報、または非公開の通信を共有することを含みますが、これらに限りません。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraは、事前の通知なく、いつでも機能を変更または削除する権利を有します。本サービスに将来行われる機能強化、更新または追加にも、随時改定されることがある本規約が適用されます。利用者は、本サービスまたはその構成要素の変更、停止または廃止について、Agoraが利用者または第三者に対して責任を負わないことを認めるものとします。",
              },
            ],
          },
        ],
      },
      {
        heading: "4. 利用者のコンテンツ",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本サービスには、利用者が提出するテキスト、リンク、画像、動画、音声およびその他の資料を含む、さまざまな種類のコンテンツ（「コンテンツ」）が含まれる場合があります。Agoraは、いかなるコンテンツの正確性、完全性または信頼性も保証せず、それについて責任を負いません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "コンテンツを提出することにより、利用者は、それを共有するために必要なすべての権利を有し、適用法令または第三者の権利に違反しないことを確認するものとします。利用者は、自身のコンテンツおよびAgoraでそれを共有することによって生じる結果について、単独で責任を負います。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "本サービスを利用する際、利用者は自身のコンテンツの所有権を保持しますが、プラットフォームの機能、法令遵守および運用の目的のために、Agoraに対し、コンテンツを保存、使用、変更、配布および表示する、全世界を対象とする非独占的、無償、永続的かつ再許諾可能な使用許諾を付与します。これには、第三者の提携先による配信連携、配布、集約または公開のため、Agoraが利用者のコンテンツを提供する権利が含まれます。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraは、コンテンツが本規約、適用法令またはプラットフォームの方針に違反する場合、自らの裁量でこれを削除または制限する権利を留保します。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "この使用許諾は、適用されるデータ保護・消去の権利に優先せず、非公開の参加情報へのアクセスを広げるものでもありません。アカウント削除が受理されると、個人の意見文は非表示となり、参加情報は新たな稼働中の計算の対象外になります。必要な復旧用データは15日間の復旧期間中、非公開で保持します。保存済み結果の個別の数値入力（Polis行列、BWS・pairwise（一対比較）の選択、QVの配分）は、投票の分析と再計算のため無期限に保持し、恒久的な消去処理の際にアカウントとの関連付けを除去します。これは、すべての保存やQV計算の履歴ではありません。通常の削除では保存済みの数値を再計算しませんが、別途の訂正や再分析により変わる場合があります。過去のAI説明は通常の削除では自動的に書き換えられず、適用される消去の権利は引き続き有効です。既存エクスポートのダウンロードは生成後最長30日で期限切れとなり、新しいエクスポートには現在の削除状態を反映します。関連付けの解除は匿名性を保証しません。",
              },
            ],
          },
        ],
      },
      {
        heading: "5. コンテンツおよびモデレーションに関する方針",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "次に該当するコンテンツを投稿してはなりません：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "暴力または違法な活動を助長するもの。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "ヘイトスピーチ、嫌がらせまたは個人攻撃を含むもの。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "誤情報や、人を不当に誘導するコンテンツを広めるもの。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "知的財産権を侵害するもの。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraは、コンテンツのモデレーションに、利用者の通報、自動検出、および ",
              },
              {
                text: "コミュニティガイドライン",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: "に基づく仕組みを用いています。本規約に違反するコンテンツは削除されることがあり、違反を繰り返す利用者は、利用停止または利用禁止となる場合があります。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "違法なコンテンツの通報、またはモデレーションおよび法律上の懸念への対応については、次の宛先までご連絡ください： ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "6. 第三者のコンテンツおよび広告",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraには、広告主、提携先、関連事業者または他の利用者が共有する場合がある、第三者のウェブサイト、製品またはサービスへのリンク（「第三者コンテンツ」）が含まれることがあります。Agoraは、これらの外部の情報源を管理または推奨せず、その正確性、適法性または信頼性について責任を負いません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "第三者コンテンツへのアクセスまたは関与は、利用者自身の責任で行うものとします。外部の情報源を利用し、または取引を完了する前に、関係する規約、方針または条件を確認することをお勧めします。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraは、広告またはスポンサー付きコンテンツを表示することがあります。広告の種類、対象の設定および頻度は変更される場合があり、当社は、Agoraで提供されるあらゆるコンテンツまたはサービスに関連して広告を掲載する権利を留保します。スポンサー付きコンテンツや広告とのやり取りは、利用者自身の責任でのみ行うものとし、当社は、広告される製品またはサービスの正確性、品質または正当性を保証しません。",
              },
            ],
          },
        ],
      },
      {
        heading: "7. 知的財産",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraに関連するすべての知的財産は、登録の有無を問わず、Agoraが所有し、または使用許諾を受けています。これには、特許、商標、商号、著作権、営業秘密、専有データ、ノウハウ、著作者人格権、データベース権、意匠権、アルゴリズム、ソフトウェア、コンピューターコード、視覚的インターフェース、およびその他の財産的権利が含まれますが、これらに限りません。また、いかなる法域の法律に基づくものであっても、そのような知的財産の登録出願および登録出願を行う権利が含まれます。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraの知的財産を、無許可で使用、複製、変更、配布または利用することは、厳格に禁止されています。これには、ソフトウェアのリバースエンジニアリング、専有資料の販売、またはAgoraの事前の書面による許可を得ずに専有コンテンツを使用することが含まれますが、これらに限りません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "これらの知的財産権の侵害に対しては、法的措置が取られる場合があります。Agoraは、本規約で明示的に付与されていないすべての権利を留保します。",
              },
            ],
          },
        ],
      },
      {
        heading: "8. 本サービスの終了",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "利用者はいつでもアカウントの削除を要求し、本サービスの利用を中止できます。削除要求が受理されると、通常のアカウントアクセスが停止し、15日間の復旧期間が始まります。拒否された要求では、アカウントは閉鎖されず、この期間も始まりません。受理された通常のアカウント削除要求は、この期間中に明示的に取り消すことができます。恒久的な消去と保持される記録は、プライバシーポリシーに従います。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "本規約に基づく契約またはアカウントが終了した後も、次の各節は引き続き有効です：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "3. 本サービスの利用、",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "4. 利用者のコンテンツ、",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "8. 本サービスの終了、",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. 免責事項および責任の制限、",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "10. 補償",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "14. その他の規定。",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "アカウントの削除方法：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "利用可能な認証済みのアカウント削除機能を使用するか、legal@zkorum.comまで支援をお求めください。組織に対する責務により、この機能から削除できない場合は当社にご連絡ください。当社はアカウントの種類に応じて、対応する資格情報または端末鍵による証明で所有者を確認します。これは、パスポート画像の送信や署名付き証明の無期限の収集を求めるものではありません。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "削除が受理されると、通常のアクセスが無効になり、セッションが失効し、個人の意見文が非表示になります。進行中の結果は非同期で更新される場合があり、保持される数値結果と既存のエクスポートはプライバシーポリシーに従います。必要な復旧用データは非公開で保持します。復旧には、保存された15日間の期限より厳密に前、かつ不可逆な消去が始まる前に、明示的な取消しと所有者確認が必要です。ゲストには元の端末鍵が必要で、紛失すると復旧できない場合があります。復旧が成功すると新しいセッションが作成され、失効したセッションからのアクセスは復活しません。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "15日間の期限で復旧は終了し、非公開のアカウントデータは、不当な遅滞なく恒久的な消去処理を行う対象となります。処理の遅延により復旧期間が延長されたり、適用される法定期限が再び起算されたりすることはありません。保持される入力、アクセス制限付きの記録およびバックアップはプライバシーポリシーに従います。後から登録しても、関連付けを解除した参加情報を取り戻すことはできません。",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "個々のコンテンツ、資格情報および共用のプロジェクト：",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            items: [
              {
                content: [
                  {
                    text: "個々のコンテンツ：",
                    kind: "strong",
                  },
                  {
                    text: " 権限に基づくコンテンツ削除では、保持されたチェックポイントを含め、本文、各版、翻訳、投稿者表示を直ちに非表示にし、アカウントの復旧期間は適用しません。アカウント削除では個人の意見文は現在の表示から非表示になりますが、許可される過去の本文はアカウントの公開表示なしで残る場合があります。その本文も削除したい場合は、アカウント削除前にコンテンツを別途管理してください。適用される消去請求に、すべての投稿の手動削除は必要ありません。撤回機能は活動の進行中・終了後のルールに従い、保持済みの結果を書き換えません。恒久的な関連付け解除後は、アカウント操作機能で切り離された数値記録を取得、変更または撤回することはできません。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "復旧の範囲：",
                    kind: "strong",
                  },
                  {
                    text: " アカウントの復旧では、アカウントの削除だけを理由として非表示になった意見文について、当社のチェックポイントを含め、許可される本文、翻訳、投稿者表示、および現在の分析対象としての資格を復元できる場合があります。別途削除されたコンテンツ・プロジェクト・文書、撤回された投票、取り消せないゲストの統合、その間に行われたモデレーション、または別途消去された出力を復元したり、保持された投票を重複させたりすることはありません。ゲストは、アカウント所有者であることを証明するため、元の端末鍵を保持していなければなりません。正確な期限到来後、または取り消せない消去が始まった後は、復旧できません。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "組織およびプロジェクト：",
                    kind: "strong",
                  },
                  {
                    text: " 削除には関係する権限が必要で、元に戻せるアーカイブではありません。プロジェクトの削除では、適用される消去処理ルールに従って、含まれる対話、文書、そのプロジェクトが単独で所有する保持済みの数値入力と報告書を削除します。組織の削除前に、残っている単独所有のプロジェクトを、存続する別の所有者へ移転しなければなりません。共同所有のプロジェクトは他の所有者の下に残り、削除された組織との関係を除去します。別途権限に基づいて行われるプロジェクト削除は、そのプロジェクト自体の削除であり、アカウントの復旧操作とは別に扱います。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "適用される個人データに関する要求は、製品上の復旧期間を必要とせず、プライバシーポリシーの一般的な権利の規定に従います。同ポリシーに記載する目的のため、限定された記録が削除後も残る場合があります：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "完全な認証または削除の証明の無期限のアーカイブではなく、保護目的のために保持される、有効期間が短いリプレイ防止用ハッシュおよび必要な制限・送信抑止の状態。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "180日間のCloudWatchロググループの方針を含む、適用される保持方針に従う運用・セキュリティイベントの記録。これらの記録はその目的に限定され、保持されるアカウントデータやバックアップ期間とは別です。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "削除された情報がバックアップから復元されるのを防ぐために必要な最小限の消去指示、および正当化される場合の、特定の事故、法的義務または請求に関する対象範囲を限定した証拠。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "これらのアクセス制限付きの記録は、削除されたコンテンツ、個々の参加パターンまたは資格情報を無期限に保持するための包括的な許諾や正当化の根拠を生むものではありません。ダウンロードされた、または独立して保持される複製、および処理者・受領者による取扱いについては、プライバシーポリシーに説明しています。本節のいかなる規定も、適用される法律上のデータ保護の権利を制限するものではありません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraは、本規約に違反するアカウントを停止または終了する権利を留保します。",
              },
            ],
          },
        ],
      },
      {
        heading: "9. 免責事項および責任の制限",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本サービスは、いかなる種類の保証も付さず、「現状有姿」で提供されます。Agoraは、明示、黙示、法定またはその他のいずれを問わず、いかなる種類の表明も保証も行いません。これには、商品性、特定目的への適合性、非侵害、または本サービスの利用可能性に関する保証が含まれますが、これらに限りません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraは、本サービスにエラーがないこと、中断しないこと、安全であること、または欠陥が修正されることを保証しません。利用者は、本サービスの利用に伴うすべてのリスクを負担します。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "法令で認められる最大限の範囲において、Agoraは、本サービスの利用に起因し、または関連する間接的、付随的、結果的、懲罰的または特別な損害について、契約、不法行為、厳格責任その他のいかなる法理に基づく場合も、そのような損害の可能性について知らされていたとしても、責任を負いません。これには、逸失利益、データの喪失、身体傷害、財産損害または事業の中断による損害が含まれますが、これらに限りません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "一部の法域では、特定の損害について免責または責任の制限が認められないため、これらの制限の一部が利用者に適用されない場合があります。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraは、プライバシーおよびセキュリティを強化するためゼロ知識証明（ZKP）技術を実装していますが、利用者は、絶対に失敗しない技術はないことを認めるものとします。ZKPの実装には、予期しない脆弱性または欠陥が存在し、無許可のデータ露出やプライバシー侵害につながる可能性があります。Agoraは、ZKPの絶対的な安全性または信頼性について保証せず、その利用に起因する意図しない結果について責任を負いません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "利用者には、IPアドレスを隠すためにTorなどの匿名化ツールを使用すること、文章内で過度な個人情報を共有しないこと、およびパスポートやその他の記録された行動との関連付けによって意図せず身元を明らかにする可能性のある文体や共通の属性に注意することなど、追加の予防措置を取ることをお勧めします。",
              },
            ],
          },
        ],
      },
      {
        heading: "10. 補償",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "法律で禁止される場合を除き、利用者は、次に起因し、または関連するあらゆる請求、要求、責任、損害、損失および費用（弁護士費用および法的手続きの費用を含みます）について、Agora、その関連会社、およびそれらの各取締役、役員、従業員、代理人、請負業者、第三者のサービス提供事業者およびライセンサーを防御し、補償し、損害を被らせないことに同意するものとします：",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            marker: "lower-alpha",
            items: [
              {
                content: [
                  {
                    text: "利用者によるAgoraおよび本サービスの利用。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "利用者による本規約の違反。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "利用者による適用法令または規制の違反。または",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "利用者がAgoraで提出、投稿または共有するコンテンツ。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraは、利用者が当社を補償する義務を負う事項について、その防御を主導する権利を留保し、利用者は、当社によるそのような請求への防御に全面的に協力することに同意するものとします。利用者の補償義務は、Agoraおよび本サービスの利用が終了または停止した後も存続します。",
              },
            ],
          },
        ],
      },
      {
        heading: "11. 分離可能性",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本規約の各規定は、可能な限り、準拠法の下で有効かつ執行可能となるように解釈されるものとします。ただし、本規約の一つまたは複数の規定の全部または一部が無効、違法または執行不能と判断された場合でも、その規定の残りの部分および本規約の残りの部分は影響を受けず、その無効、違法または執行不能な規定が当初から本規約に含まれていなかったものとして、完全な効力を維持します。",
              },
            ],
          },
        ],
      },
      {
        heading: "12. 準拠法および紛争解決",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本規約の有効性、解釈、執行、履行または終了に関する問題を含む本規約、および不法行為に基づく請求、契約締結前の義務または契約外責任から生じる紛争には、フランス法が適用され、同法に従って解釈されるものとします。フランス以外の法域の法律を適用することになる、その他の法選択の原則または抵触法の規則は適用しません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "当社は、Agoraが利用者にとって良好な体験となることを願っています。問題や紛争がある場合、利用者は、まず当社と非公式に解決を試みることに同意するものとします。ご意見や懸念は、次の宛先までお寄せください： ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "非公式に解決できない紛争は、Neuilly Sur Seineの裁判所の専属管轄に服するものとします。",
              },
            ],
          },
        ],
      },
      {
        heading: "13. 本規約の変更",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraは、サービスの変更、法的要件またはその他の運用上の必要性を反映するため、随時本規約を更新することがあります。重要な変更を行う場合、変更が効力を生じる前に、アプリ内通知、バナー、または確認を求める表示によって、利用者に通知します。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "改定された本規約の発効後もAgoraへのアクセスまたは利用を継続することにより、利用者は、更新された本規約に拘束されることに同意するものとします。変更に同意しない場合、変更が効力を生じる前に、Agoraの利用を中止しなければなりません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraの利用に関する権利と義務を把握するため、本規約を定期的に確認することをお勧めします。",
              },
            ],
          },
        ],
      },
      {
        heading: "14. その他の規定",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本規約およびプライバシーポリシーは、Agoraへのアクセスおよび利用に適用される完全な合意を構成します。当社が本規約に基づく権利を行使せず、または規定を執行しなかった場合でも、その権利または規定を放棄したものとはみなしません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "本規約の規定が無効または執行不能と判断された場合、その規定は認められる最大限の範囲で執行され、その他の規定は完全な効力を維持します。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "利用者は、当社の事前の同意なく、本規約に基づく権利または義務を譲渡または移転してはなりません。ただし、当社は、本規約に基づく当社の権利および義務を制限なく自由に譲渡する権利を留保します。",
              },
            ],
          },
        ],
      },
      {
        heading: "15. 連絡先",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本規約に関するご質問や懸念は、次の宛先までお問い合わせください： ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraを利用することにより、利用者は、本規約および将来の変更を確認し、同意するものとします。",
              },
            ],
          },
          {
            type: "address",
            lines: [
              "ZKORUM SAS",
              "99 AVENUE ACHILLE PERETTI",
              "92200 NEUILLY-SUR-SEINE",
              "FRANCE",
            ],
          },
        ],
      },
    ],
  },
  ky: {
    termsOfService: "Кызматтарды пайдалануу шарттары",
    automatedTranslationNoticeTitle: "Автоматтык котормо тууралуу билдирүү",
    automatedTranslationNotice:
      "Бул котормо автоматтык түрдө түзүлгөн. Кандайдыр бир айырмачылык, дал келбөө же карама-каршылык болсо, англис тилиндеги нуска гана артыкчылыкка ээ болуп, расмий күчкө ээ нуска болуп саналат.",
    viewAuthoritativeEnglishVersion:
      "Расмий күчкө ээ англис тилиндеги нусканы көрүү",
    returnToTranslatedVersion: "Которулган нускага кайтуу",
    lastUpdatedLabel: "Акыркы жаңыртылган күнү",
    lastUpdatedDate: "2026/10/14 (YYYY/MM/DD)",
    introduction: [
      {
        text: "Agora Citizen Network («Agora») тармагына кош келиңиз! Бул жоболор жана шарттар («Шарттар») Agora платформасына, анын ичинде биздин вебсайтка, мобилдик тиркемелерге жана башка кызматтарга (чогуу «Кызматтар») кирүүңүздү жана аларды пайдаланууңузду жөнгө салат. Кызматтарга кирүү же аларды пайдалануу менен бул Шарттарды аткарууга макул болосуз. Макул болбосоңуз, Кызматтарга кирүүгө же аларды пайдаланууга болбойт.",
      },
    ],
    sections: [
      {
        heading: "1. Кызматтарга кирүүңүз",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 16 жаштагы же андан улуу колдонуучулар үчүн гана жеткиликтүү. Agora платформасын пайдалануу менен ушул жаш талаптарына жооп берериңизди жана жашаган өлкөңүздүн мыйзамдары Кызматтарга кирүү жана аларды пайдалануу үчүн белгилеген эң төмөнкү жаштан улуу экениңизди ырастайсыз.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora платформасында жарыяланган мазмунду катталбастан карап чыга аласыз. Талкууларга, сурамжылоолорго же артыкчылыктарды аныктоо аракеттерине («Мазмун») катышуу түзмөккө негизделген конок аккаунтун же белгилүү бир текшерүү ыкмасын талап кылышы мүмкүн. Жеткиликтүү ыкмаларга төмөнкүлөр кирет:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Уруксат берилген жерде түзмөккө негизделген конок катышуусу. Кирүү жана калыбына келтирүү баштапкы түзмөк ачкычтарын сактап калууга байланыштуу.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Бир жолку код менен электрондук почтаны текшерүү. Бул чыныгы кимдикти же кайталангыс экенин эмес, электрондук почта дарегин көзөмөлдөөрүңүздү далилдейт.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Телефон номери аркылуу кирүү (бир жолку код менен текшерилет)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Паспортко негизделген жарамдуулукту текшерүү төмөнкү кызмат аркылуу: ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: ". Agora паспорттун өзүн эмес, ачылган далил сигналдарын алат. Rarimo аркылуу каттоого анын кошумча жаш талабы колдонулат: сиз 18 жашта же андан улуу болушуңуз керек. Кызмат көрсөтүүчүнүн текшерүү кызматына анын колдонулуучу шарттары да колдонулат.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Төмөнкү учурларда Кызматтарды пайдаланууга болбойт:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Agora платформасында сиздин жеткиликтүүлүгүңүз убактылуу токтотулган же сиз платформадан чыгарылгансыз.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Сиздин юрисдикцияңызда Кызматтарды пайдаланууга мыйзам боюнча тыюу салынган.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Agora менен юридикалык күчкө ээ келишим түзө албайсыз же юрисдикцияңызда бойго жете элексиз, мыйзамдуу камкорчуңуз бул Шарттарды карап чыгып, аларга макул болгон учурдан тышкары.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        heading: "2. Купуялык саясаты",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora купуялык саясаты жеке маалыматтарыңызды кантип чогултарыбызды, пайдаланарыбызды жана коргоорубузду түшүндүрөт. Кызматтарга кирүү же аларды пайдалануу менен бул Шарттарга макул болосуз. Жеке маалыматтарыңыз Купуялык саясатында сүрөттөлгөндөй иштетилет жана конкреттүү иштетүү аракеттери үчүн талап кылынган жерде макулдугуңузду сурайбыз. Кеңири маалымат үчүн төмөнкүнү караңыз: ",
              },
              {
                text: "Agora купуялык саясаты",
                kind: "link",
                href: "/legal/privacy",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "3. Кызматтарды пайдаланууңуз",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Бул Шарттарга ылайык, Agora сизге Кызматтарды пайдаланууга өзгөчө эмес, башка жакка өткөрүлбөөчү жана жокко чыгарылуучу лицензия берет. Төмөнкүлөргө болбойт:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Agora платформасын жалган маалымат, жек көрүүнү козуткан сөздөрдү же куугунтук таратуу үчүн пайдалануу.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Мыйзамсыз аракеттерге катышуу.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Алдамчылык аракеттерге, алдамчылык схемаларга же адаштыруучу ыкмаларга катышуу же аларды жайылтуу.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Ачык сексуалдык, зомбулук камтыган же башка орунсуз мазмунду таратуу же жайылтуу.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Agora платформасын адамдарды же топторду артынан аңдуу, коркутуу же опузалоо үчүн пайдалануу.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Жеке же коммерциялык пайда үчүн Agora платформасын, алгоритмдерин же мүмкүнчүлүктөрүн бурмалоого же кыянат пайдаланууга аракет кылуу.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Өзүнө зыян келтирүүгө, өз жанын кыюуга же кандай гана түрдө болбосун коркунучка дуушар кылууга үндөгөн аракеттерге катышуу.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Интеллектуалдык менчик укуктарын бузуу, анын ичинде автордук укук менен корголгон материалдарды уруксатсыз таратуу.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Кызматтарды же Мазмунду лицензиялоо, сатуу, өткөрүү, укуктарын башка жакка берүү, таратуу, жайгаштыруу же башкача коммерциялык пайдалануу",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Agora инфраструктурасын бузуп кирүүгө, анын ишин үзгүлтүккө учуратууга же тескери инженердик талдоо жүргүзүүгө аракет кылуу.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Жеткиликтүүлүк чектөөлөрүн айланып өтүү же мазмунду кыянаттык менен чыгарып алуу үчүн автоматташтырылган куралдарды колдонуу. Бул иштетилген экспортторду уруксаттуу пайдаланууга тыюу салбайт.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Өзүн башка колдонуучу, субъект же уюм катары көрсөтүү.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Зыяндуу программаларды, фишинг аракеттерин же алдамчылык схемаларды бөлүшүү же таратуу.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Башка колдонуучулардын жеке же сезимтал маалыматын макулдугусуз ачуу менен алардын купуялыгын бузуу, анын ичинде, бирок муну менен чектелбестен, жеке даректерди, телефон номерлерин, каржылык маалыматтарды же ар кандай купуя кат алышууларды ачык уруксатсыз бөлүшүү.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora мүмкүнчүлүктөрдү алдын ала кабарлоосуз каалаган убакта өзгөртүү же алып салуу укугун сактайт. Кызматтардын келечектеги бардык жакшыртууларына, жаңыртууларына же толуктоолоруна мезгил-мезгили менен өзгөртүлүшү мүмкүн болгон ушул Шарттар колдонулат. Кызматтардын же алардын кандайдыр бир бөлүктөрүнүн өзгөртүлүшү, убактылуу токтотулушу же биротоло токтотулушу үчүн Agora сиздин же үчүнчү тараптын алдында жооптуу эмес экенин тааныйсыз.",
              },
            ],
          },
        ],
      },
      {
        heading: "4. Сиздин мазмунуңуз",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Кызматтар ар кандай мазмунду, анын ичинде колдонуучулар тапшырган текстти, шилтемелерди, сүрөттөрдү, видеону, аудиону жана башка материалдарды («Мазмун») камтышы мүмкүн. Agora эч кандай Мазмундун тактыгын, толуктугун же ишенимдүүлүгүн кепилдебейт жана ал үчүн жоопкерчилик албайт.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Мазмунду тапшыруу менен аны бөлүшүүгө бардык зарыл укуктарыңыз бар экенин жана ал колдонулуучу мыйзамдарды же үчүнчү тараптардын укуктарын бузбай турганын ырастайсыз. Мазмунуңуз жана аны Agora платформасында бөлүшүүдөн келип чыккан бардык кесепеттер үчүн өзүңүз гана жооптуусуз.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Кызматтарды пайдаланууда мазмунуңузга ээликти сактайсыз, бирок Agora компаниясына платформанын иштеши, талаптарды аткаруу жана иштөө максаттары үчүн мазмунуңузду сактоого, пайдаланууга, өзгөртүүгө, таратууга жана көрсөтүүгө дүйнө жүзүндө колдонулуучу, өзгөчө эмес, лицензиялык төлөмсүз, мөөнөтсүз жана сублицензия берүүгө жол берген лицензия бересиз. Буга Agora компаниясынын Мазмунуңузду үчүнчү тарап өнөктөштөр аркылуу кайра таратуу, жайылтуу, топтоо же жарыялоо үчүн жеткиликтүү кылуу укугу да кирет.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Мазмун бул Шарттарды, колдонулуучу мыйзамдарды же платформанын саясаттарын бузса, Agora аны өз чечими боюнча алып салуу же чектөө укугун сактайт.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Бул лицензия колдонулуучу маалыматтарды коргоо же өчүрүү укуктарынан жогору турбайт жана купуя катышууга жеткиликтүүлүктү кеңейтпейт. Аккаунтту өчүрүү өтүнүчү кабыл алынганда жеке билдирүүлөр жашырылып, катышуу жаңы учурдагы эсептөөлөргө киргизилбейт. Зарыл калыбына келтирүү маалыматтары 15 күндүк калыбына келтирүү мөөнөтүндө купуя сакталат. Сакталган жыйынтыктардын жеке сандык киргизүүлөрүн (Polis матрицалары, BWS/pairwise тандоолору жана QV бөлүштүрүүлөрү) добуш берүүнү талдоо жана кайра эсептөө үчүн мөөнөтсүз сактайбыз; биротоло тазалоодо аккаунт менен байланыштар алынат. Бул ар бир сактоонун же QV эсептөөсүнүн тарыхы эмес. Кадимки өчүрүү сакталган сандарды кайра эсептебейт; өзүнчө оңдоолор же кайра талдоо аларды өзгөртүшү мүмкүн. Кадимки өчүрүү тарыхый AI сүрөттөмөлөрүн автоматтык түрдө кайра жазбайт; колдонулуучу өчүрүү укуктары сакталат. Учурдагы экспортторду жүктөө мүмкүнчүлүгү түзүлгөндөн кийин эң көп 30 күндө аяктайт; жаңы экспорттор өчүрүүнүн учурдагы абалын колдонот. Байланышты алып салуу анонимдүүлүктү кепилдебейт.",
              },
            ],
          },
        ],
      },
      {
        heading: "5. Мазмун жана модерация саясаттары",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Төмөнкүдөй Мазмунду жарыялоого болбойт:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Зомбулукту же мыйзамсыз аракеттерди жайылткан.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Жек көрүүнү козуткан сөздөрдү, куугунтуктоону же жеке адамга кол салууларды камтыган.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Жалган маалыматты же адамдардын түшүнүгүн бурмалоого багытталган мазмунду тараткан.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Интеллектуалдык менчик укуктарын бузган.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora колдонуучулардын даттанууларына, автоматтык аныктоого жана төмөнкү эрежелерге негизделген мазмунду модерациялоо тутумун колдонот: ",
              },
              {
                text: "Коомчулуктун эрежелери",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: ". Бул Шарттарды бузган мазмун алынып салынышы мүмкүн жана кайталап бузгандардын жеткиликтүүлүгү убактылуу токтотулушу же аларга тыюу салынышы мүмкүн.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Мыйзамсыз мазмун тууралуу билдирүү же модерация жана укуктук маселелер боюнча кайрылуу үчүн биз менен төмөнкү дарек аркылуу байланышыңыз: ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "6. Үчүнчү тараптын мазмуну жана жарнамалар",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora жарнама берүүчүлөр, өнөктөштөр, байланышкан жактар же башка колдонуучулар бөлүшүшү мүмкүн болгон үчүнчү тараптардын вебсайттарына, продуктуларына же кызматтарына шилтемелерди («Үчүнчү тараптын мазмуну») камтышы мүмкүн. Agora мындай тышкы булактарды көзөмөлдөбөйт, жактырганын билдирбейт жана алардын тактыгы, мыйзамдуулугу же ишенимдүүлүгү үчүн эч кандай жоопкерчилик албайт.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Үчүнчү тараптын мазмунуна кирүү же аны менен өз ара аракеттенүү өз тобокелдигиңиз менен жүргүзүлөт жана тышкы булактар менен аракеттенүүдөн же бүтүмдөрдү аяктоодон мурун тиешелүү шарттарды, саясаттарды же жоболорду окуп чыгууңузду сунуштайбыз.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora жарнамаларды же демөөрчүлүк мазмунду көрсөтүшү мүмкүн. Жарнамалардын түрү, багытталышы жана жыштыгы өзгөрүшү мүмкүн жана биз Agora платформасында берилген ар кандай мазмунга же кызматтарга байланыштуу жарнама жайгаштыруу укугун сактайбыз. Демөөрчүлүк мазмун же жарнамалар менен өз ара аракеттенүүңүз толугу менен өз тобокелдигиңизде жана биз жарнамаланган продуктулардын же кызматтардын тактыгын, сапатын же мыйзамдуулугун кепилдебейбиз.",
              },
            ],
          },
        ],
      },
      {
        heading: "7. Интеллектуалдык менчик",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora менен байланышкан бардык интеллектуалдык менчик, анын ичинде, бирок муну менен чектелбестен, патенттер, товардык белгилер, фирмалык аталыштар, автордук укуктар, коммерциялык сырлар, менчик маалыматтар, өндүрүштүк билимдер, автордун жеке мүлктүк эмес укуктары, маалымат базаларына укуктар, дизайн укуктары, алгоритмдер, программалык камсыздоо, компьютердик код, визуалдык интерфейстер жана башка бардык менчик укуктары — катталган же катталбаганына карабастан — Agora компаниясына таандык же ага лицензияланган. Буга ар кандай юрисдикциянын мыйзамдары боюнча мындай интеллектуалдык менчикти каттоого берилген бардык арыздар же каттоого арыз берүү укуктары да кирет.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora компаниясынын интеллектуалдык менчигин уруксатсыз пайдаланууга, көчүрүп чыгарууга, өзгөртүүгө, таратууга же иш жүзүндө пайдаланууга катуу тыюу салынат. Буга, бирок муну менен чектелбестен, программалык камсыздоого тескери инженердик талдоо жүргүзүү, менчик материалдарды сатуу же Agora компаниясынын алдын ала жазуу жүзүндөгү уруксатысыз кандайдыр бир менчик мазмунду пайдалануу кирет.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Бул интеллектуалдык менчик укуктарын бузуу соттук чараларга алып келиши мүмкүн. Agora ушул Шарттарда ачык берилбеген бардык укуктарын сактайт.",
              },
            ],
          },
        ],
      },
      {
        heading: "8. Кызматтарды токтотуу",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Аккаунтуңузду өчүрүүнү каалаган убакта сурап, Кызматтарды пайдаланууну токтото аласыз. Өчүрүү өтүнүчүңүз кабыл алынганда аккаунтка кадимки кирүү токтоп, 15 күндүк калыбына келтирүү мөөнөтү башталат. Четке кагылган өтүнүч аккаунтту жаппайт жана бул мөөнөттү баштабайт. Ушул мөөнөттө кабыл алынган кадимки аккаунтту өчүрүү өтүнүчүн ачык түрдө жокко чыгара аласыз; биротоло өчүрүүгө жана сакталган жазууларга Купуялык саясаты колдонулат.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Бул Шарттардын же Аккаунтуңуздун колдонулушу токтотулгандан кийин төмөнкү бөлүмдөр күчүндө кала берет:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "3. Кызматтарды пайдаланууңуз,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "4. Сиздин мазмунуңуз,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "8. Кызматтарды токтотуу,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. Кепилдиктерден баш тартуу жана жоопкерчиликти чектөө,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "10. Зыяндын ордун толтуруу",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "14. Башка жоболор.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Аккаунтуңузду кантип өчүрсө болот:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Аутентификациядан кийин жеткиликтүү болгон аккаунтту өчүрүү каражатын колдонуңуз же жардам үчүн legal@zkorum.com дарегине кайрылыңыз. Уюмдагы милдеттериңиз бул каражаттар аркылуу аккаунтту өчүрүүгө жол бербесе, биз менен байланышыңыз. Аккаунттун түрүнө ылайык, колдоого алынган ырастоочу маалыматтар же түзмөк ачкычынын далили аркылуу ээликти текшеребиз; бул паспорттун сүрөтүн жөнөтүү же кол коюлган далилдерди мөөнөтсүз чогултуу талабы бар дегенди билдирбейт.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Кабыл алынган өчүрүү кадимки кирүүнү токтотуп, сеанстарды жокко чыгарат жана жеке билдирүүлөрдү жашырат. Ачык жыйынтыктар асинхрондуу жаңырышы мүмкүн; сакталган сандык жыйынтыктарга жана учурдагы экспортторго Купуялык саясаты колдонулат. Зарыл калыбына келтирүү маалыматтары купуя сакталат. Калыбына келтирүү үчүн өчүрүүнү ачык түрдө жокко чыгаруу жана ээликти текшерүү сакталган 15 күндүк акыркы мөөнөт бүтө электе жана кайтарылгыс тазалоо баштала электе талап кылынат. Конокторго баштапкы түзмөк ачкычтары керек; аларды жоготуу калыбына келтирүүгө тоскоол болушу мүмкүн. Ийгиликтүү калыбына келтирүү мурда жокко чыгарылган сеанстарды жандандырбастан, жаңы сеанс түзөт.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "15 күндүк акыркы мөөнөттө калыбына келтирүү аяктап, купуя аккаунт маалыматтары негизсиз кечиктирбестен биротоло тазалоого жарамдуу болот. Тазалоонун кечигиши калыбына келтирүү мөөнөтүн узартпайт жана колдонулуучу мыйзамдык мөөнөттөрдү кайра баштабайт. Сакталган киргизүүлөргө, чектелген жазууларга жана камдык көчүрмөлөргө Купуялык саясаты колдонулат. Кийин кайра катталуу ажыратылган катышууну кайра өзүнө байланыштыра албайт.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Жеке мазмун, ырастоочу маалыматтар жана жалпы долбоорлор:",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            items: [
              {
                content: [
                  {
                    text: "Жеке мазмун:",
                    kind: "strong",
                  },
                  {
                    text: " Уруксат берилген мазмунду өчүрүү текстти, версияларды, котормолорду жана авторлук маалыматты, анын ичинде сакталган көзөмөлдүк кесиндилерде дароо жашырат; аккаунттун калыбына келтирүү мөөнөтү колдонулбайт. Аккаунтту өчүрүү жеке билдирүүлөрдү учурдагы көрүнүштөрдөн жашырат, бирок уруксат берилген тарыхый текстти аккаунтка ачык шилтемесиз сакташы мүмкүн. Ал текстти да алып салгыңыз келсе, аккаунтту өчүрүүдөн мурун мазмунду өзүнчө башкарыңыз; колдонулуучу өчүрүү өтүнүчтөрү ар бир салымды кол менен өчүрүүнү талап кылбайт. Катышууну кайтарып алуу каражаттарына аракеттин ачык/жабык эрежелери колдонулат жана алар сакталган жыйынтыктарды кайра жазбайт. Байланыш биротоло алынгандан кийин аккаунттун башкаруу каражаттары ажыратылган сандык жазууларды алууга, өзгөртүүгө же кайтарып алууга мүмкүндүк бербейт.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Калыбына келтирүүнүн көлөмү:",
                    kind: "strong",
                  },
                  {
                    text: " Аккаунтту калыбына келтирүү аккаунттун өчүрүлүшүнөн гана улам жашырылган билдирүүлөрдүн уруксат берилген текстин, котормолорун, авторлук маалыматын жана учурдагы жарамдуулугун, анын ичинде көзөмөлдүк кесиндилерибизде калыбына келтире алат. Ал өзүнчө өчүрүлгөн мазмунду/долбоорлорду/документтерди, кайтарылып алынган добуштарды, кайтарылгыс конок бириктирүүлөрүн, ортодогу модерациянын чечимдерин же өзүнчө өчүрүлгөн натыйжаларды калыбына келтирбейт жана сакталган добуштарды кайталап кошпойт. Коноктор ээликти далилдөө үчүн баштапкы түзмөк ачкычтарын сактап калууга тийиш. Так акыркы мөөнөттөн кийин же кайтарылгыс тазалоо башталгандан кийин калыбына келтирүү жеткиликсиз.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Уюмдар жана долбоорлор:",
                    kind: "strong",
                  },
                  {
                    text: " Өчүрүү аракеттери тиешелүү уруксаттарды талап кылат жана кайтарылуучу архивдер эмес. Долбоорду өчүрүү колдонулуучу тазалоо эрежелерине ылайык анын ичиндеги талкууларды, документтерди, өзүнө гана таандык сакталган сандык киргизүүлөрдү жана отчетторду алып салат. Уюм өчүрүлгөнгө чейин калган, жалгыз өзүнө таандык бардык долбоорлор башка, сакталып калган ээсине өткөрүлүшү керек. Биргелешип ээлик кылынган долбоорлор башка ээлеринде калат, ал эми өчүрүлгөн уюмдун байланыштары алынат. Долбоорду өзүнчө уруксат берилген өчүрүү аккаунтту калыбына келтирүү аракети эмес, ошол долбоордун өзүнүн өчүрүлүшү катары каралат.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Жеке маалымат боюнча колдонулуучу өтүнүчтөр продукттун калыбына келтирүү мөөнөтүн күтүүнү талап кылбастан, Купуялык саясатынын жалпы укуктар жөнүндө жоболоруна ылайык каралат. Купуялык саясатында сүрөттөлгөн максаттар үчүн өчүрүүдөн кийин чектелген жазуулар калышы мүмкүн:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Толук аутентификация же өчүрүү далилдеринин чексиз архивинин ордуна, коргоо максаты үчүн кыска мөөнөттүү кайталап колдонуудан коргоочу хэштер жана чектөөнүн/бөгөттөөнүн зарыл абалы.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Колдонулуучу сактоо саясатына, анын ичинде CloudWatch журнал топторунун 180 күндүк саясатына ылайык иштөө/коопсуздук окуяларынын жазуулары. Бул жазуулар өз максаты менен чектелет жана сакталган аккаунт маалыматтарынан же камдык көчүрмө мөөнөтүнөн өзүнчө.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Өчүрүлгөн маалыматтын камдык көчүрмөлөрдөн калыбына келтирилишинин алдын алуу үчүн зарыл минималдуу өчүрүү көрсөтмөлөрү жана негизделген жерде конкреттүү окуя, укуктук милдеттенме же талап үчүн тар көлөмдөгү далилдер.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Бул жеткиликтүүлүгү чектелген жазуулар өчүрүлгөн мазмунду, жеке катышуу үлгүлөрүн же ырастоочу маалыматтарды чексиз сактоого жалпы лицензия же негиз түзбөйт. Жүктөлгөн же өз алдынча сакталган көчүрмөлөр жана маалыматты иштетүүчүнүн/алуучунун иштетүүсү Купуялык саясатында түшүндүрүлгөн. Бул бөлүмдө эч нерсе мыйзамда каралган маалыматтарды коргоонун колдонулуучу укуктарын чектебейт.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora бул Шарттарды бузган аккаунттарды убактылуу токтотуу же жабуу укугун сактайт.",
              },
            ],
          },
        ],
      },
      {
        heading: "9. Кепилдиктерден баш тартуу жана жоопкерчиликти чектөө",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Кызматтар кандайдыр бир кепилдиксиз «кандай болсо, ошол бойдон» берилет. Agora ачык, болжолдонгон, мыйзамда каралган же башка түрдөгү эч кандай ырастоо же кепилдик бербейт, анын ичинде, бирок муну менен чектелбестен, сатууга жарамдуулук, белгилүү бир максатка ылайыктуулук, укуктарды бузбоо же Кызматтардын жеткиликтүүлүгү боюнча кепилдиктерди бербейт.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora Кызматтар катасыз, үзгүлтүксүз же коопсуз болот, же кемчиликтер оңдолот деп кепилдик бербейт. Колдонуучулар Кызматтарды пайдаланууга байланыштуу бардык тобокелдиктерди өзүнө алышат.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Мыйзам уруксат берген эң толук көлөмдө, Agora Кызматтарды пайдаланууңуздан келип чыккан же ага байланыштуу кандайдыр бир кыйыр, кошумча, натыйжалык, жазалоочу же өзгөчө зыяндар үчүн, келишимге, укук бузуудан келип чыккан жоопкерчиликке, күнөөнүн болушуна карабастан жоопкерчиликке же башка укуктук негизге таянганына карабастан жана мындай зыяндын болушу мүмкүн экени Agora компаниясына билдирилген болсо да, жооптуу эмес. Буга, бирок муну менен чектелбестен, алынбай калган пайда, маалыматтын жоголушу, ден соолукка зыян, мүлктүк зыян же ишкердиктин үзгүлтүккө учурашы үчүн зыяндар кирет.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Айрым юрисдикциялар белгилүү зыяндар үчүн жоопкерчиликти жокко чыгарууга же чектөөгө уруксат бербейт, ошондуктан бул чектөөлөрдүн айрымдары сизге колдонулбашы мүмкүн.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora купуялыкты жана коопсуздукту күчөтүү үчүн нөлдүк билим далили (ZKP) технологиясын ишке ашырганы менен, колдонуучулар эч бир технология жаңылбас эмес экенин тааныйт. ZKP ишке ашырылышында маалыматтын уруксатсыз ачылышына же купуялыктын бузулушуна алып келиши мүмкүн болгон күтүлбөгөн алсыздыктар же кемчиликтер болушу мүмкүн. Agora ZKP технологиясынын абсолюттук коопсуздугу же ишенимдүүлүгү боюнча эч кандай кепилдик бербейт жана аны пайдалануудан келип чыккан атайын көздөлбөгөн кесепеттер үчүн эч кандай жоопкерчилик албайт.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Колдонуучуларга IP дарегин жашыруу үчүн Tor сыяктуу анонимдүүлүк куралдарын колдонуу, жазгандарында ашыкча жеке маалымат бөлүшүүдөн алыс болуу жана паспорттук маалыматтарга жана башка катталган аракеттерге салыштыруу аркылуу кимдигин байкабай ачып коюшу мүмкүн болгон жазуу стилине жана бөлүшүлгөн белгилерге көңүл буруу сыяктуу кошумча сактык чараларын көрүү сунушталат.",
              },
            ],
          },
        ],
      },
      {
        heading: "10. Зыяндын ордун толтуруу",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Мыйзам тыюу салган учурлардан тышкары, сиз Agora компаниясын, ага байланышкан жактарды жана алардын тиешелүү директорлорун, жетекчилерин, кызматкерлерин, өкүлдөрүн, подрядчыларын, үчүнчү тарап кызмат көрсөтүүчүлөрүн жана лицензия берүүчүлөрүн төмөнкүлөрдөн келип чыккан же аларга байланыштуу бардык доолордон, талаптардан, милдеттенмелерден, зыяндардан, жоготуулардан жана чыгымдардан (анын ичинде юридикалык кызмат акысы жана чыгымдардан) коргоого, алардын ордун толтурууга жана аларды зыяндан жана жоопкерчиликтен коргоого макул болосуз:",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            marker: "lower-alpha",
            items: [
              {
                content: [
                  {
                    text: "Agora платформасын жана анын Кызматтарын пайдаланууңуз;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "бул Шарттарды бузууңуз;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "колдонулуучу мыйзамдарды же ченемдик талаптарды бузууңуз; же",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Agora платформасына тапшырган, жарыялаган же бөлүшкөн бардык Мазмунуңуз.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Биздин зыяндарыбыздын ордун толтурууга милдеттүү болгон ар кандай маселе боюнча коргоону өз көзөмөлүнө алуу укугун Agora сактайт жана сиз мындай доолор боюнча коргообузга толук кызматташууга макул болосуз. Agora платформасын жана анын Кызматтарын пайдаланууңуз токтотулганда же убактылуу токтотулганда да зыяндын ордун толтуруу милдеттенмелериңиз күчүндө кала берет.",
              },
            ],
          },
        ],
      },
      {
        heading: "11. Жоболордун бөлүнүүчүлүгү",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Мүмкүн болушунча бул Шарттардын жоболору колдонулуучу мыйзамга ылайык жарактуу жана аткарылууга тийиш болгон мааниде чечмеленет. Бирок бул Шарттардын бир же бир нече жобосу толугу менен же жарым-жартылай жараксыз, мыйзамсыз же аткарууга мүмкүн эмес деп табылса, ошол жобонун жана бул Шарттардын калган бөлүгүнө таасир этпейт жана мындай жараксыз, мыйзамсыз же аткарууга мүмкүн эмес жобо эч качан бул жерде камтылбагандай толук күчүндө кала берет.",
              },
            ],
          },
        ],
      },
      {
        heading: "12. Колдонулуучу укук жана талаштарды чечүү",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Бул Шарттар, анын ичинде алардын жарактуулугуна, чечмеленишине, мажбурлап аткарылышына, аткарылышына же токтотулушуна байланыштуу бардык маселелер, ошондой эле укук бузуудан келип чыккан талаптардан, келишимге чейинки милдеттенмелерден же келишимден тышкаркы жоопкерчиликтен келип чыккан бардык талаштар Франциянын мыйзамдары менен жөнгө салынып, аларга ылайык чечмеленет. Франциядан башка юрисдикциянын мыйзамдарын колдонууга алып келе турган укукту тандоо принциптерине же коллизиялык ченемдерге күч берилбейт.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora платформасын пайдаланууда жагымдуу тажрыйба алышыңызды каалайбыз. Маселелер же талаштар болсо, алгач аларды биз менен расмий эмес түрдө чечүүгө аракет кылууга макул болосуз. Ар кандай пикириңиз же тынчсызданууңуз боюнча бизге төмөнкү дарек аркылуу кайрыла аласыз: ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Расмий эмес түрдө чечилбеген бардык талаштар Neuilly Sur Seine сотторунун өзгөчө юрисдикциясына кирет.",
              },
            ],
          },
        ],
      },
      {
        heading: "13. Бул Шарттарга өзгөртүүлөр",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora кызматтарыбыздагы, укуктук талаптардагы же башка иштөө муктаждыктарындагы өзгөрүүлөрдү чагылдыруу үчүн бул Шарттарды мезгил-мезгили менен жаңыртышы мүмкүн. Олуттуу өзгөртүүлөрдү киргизсек, алар күчүнө киргенге чейин колдонуучуларга тиркемедеги эскертмелер, баннерлер же таанышканын ырастоону талап кылган билдирүүлөр аркылуу кабарлайбыз.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Кайра каралган Шарттар күчүнө киргенден кийин Agora платформасына кирүүнү же аны пайдаланууну улантуу менен жаңыртылган Шарттарды аткарууга макул болосуз. Өзгөртүүлөргө макул болбосоңуз, алар күчүнө киргенге чейин Agora платформасын пайдаланууну токтотууга тийишсиз.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora платформасын пайдалануудагы укуктары жана милдеттенмелери тууралуу кабардар болуп туруу үчүн колдонуучуларга бул Шарттарды үзгүлтүксүз карап чыгуу сунушталат.",
              },
            ],
          },
        ],
      },
      {
        heading: "14. Башка жоболор",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Бул Шарттар Купуялык саясаты менен бирге Agora платформасына кирүүңүздү жана аны пайдаланууңузду жөнгө салган толук келишимди түзөт. Ушул Шарттар боюнча кандайдыр бир укукту же жобону пайдаланбаганыбыз же анын аткарылышын талап кылбаганыбыз ошол укуктан же жободон баш тартуу болуп эсептелбейт.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Бул Шарттардын кандайдыр бир жобосу жараксыз же аткарууга мүмкүн эмес деп табылса, ал уруксат берилген эң толук көлөмдө аткарылат жана калган жоболор толук күчүндө кала берет.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Алдын ала макулдугубузсуз бул Шарттар боюнча укуктарыңыздын же милдеттенмелериңиздин эч бирин башка жакка берүүгө же өткөрүүгө болбойт. Бирок биз ушул Шарттар боюнча укуктарыбызды жана милдеттенмелерибизди чектөөсүз эркин өткөрүп берүү укугун сактайбыз.",
              },
            ],
          },
        ],
      },
      {
        heading: "15. Байланыш маалыматы",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Бул Шарттар боюнча суроолор же тынчсыздануулар үчүн бизге төмөнкү дарек аркылуу кайрылыңыз: ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora платформасын пайдалануу менен бул Шарттарды жана алардын келечектеги өзгөртүүлөрүн тааныйсыз жана аларга макул болосуз.",
              },
            ],
          },
          {
            type: "address",
            lines: [
              "ZKORUM SAS",
              "99 AVENUE ACHILLE PERETTI",
              "92200 NEUILLY-SUR-SEINE",
              "FRANCE",
            ],
          },
        ],
      },
    ],
  },
  ru: {
    termsOfService: "Условия предоставления услуг",
    automatedTranslationNoticeTitle: "Уведомление об автоматическом переводе",
    automatedTranslationNotice:
      "Этот перевод создан автоматически. При любых расхождениях, несоответствиях или противоречиях преимущественную силу имеет исключительно английская версия, являющаяся юридически определяющей.",
    viewAuthoritativeEnglishVersion:
      "Открыть юридически определяющую английскую версию",
    returnToTranslatedVersion: "Вернуться к переведённой версии",
    lastUpdatedLabel: "Дата последнего обновления",
    lastUpdatedDate: "2026/10/14 (YYYY/MM/DD)",
    introduction: [
      {
        text: "Добро пожаловать в Agora Citizen Network («Agora»)! Настоящие условия («Условия») регулируют ваш доступ к платформе Agora и её использование, включая наш веб-сайт, мобильные приложения и другие услуги (совместно — «Сервисы»). Получая доступ к Сервисам или используя их, вы соглашаетесь соблюдать настоящие Условия. Если вы не согласны, вы не вправе получать доступ к Сервисам или использовать их.",
      },
    ],
    sections: [
      {
        heading: "1. Ваш доступ к Сервисам",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora доступна только пользователям в возрасте 16 лет и старше. Используя Agora, вы подтверждаете, что соответствуете этому возрастному требованию и что ваш возраст превышает минимальный возраст, установленный законодательством страны вашего проживания для доступа к Сервисам и их использования.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Вы можете просматривать опубликованный контент Agora без регистрации. Для участия в обсуждениях, опросах или определении приоритетов («Контент») может потребоваться гостевая учётная запись, привязанная к устройству, или определённый способ проверки. Доступные способы включают:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Гостевое участие с привязкой к устройству, если оно разрешено. Доступ и восстановление зависят от сохранности исходных ключей устройства.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Проверка электронной почты одноразовым кодом. Она подтверждает контроль над адресом электронной почты, а не реальную личность или уникальность человека.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Вход по номеру телефона (подтверждённому одноразовым кодом)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Проверка соответствия условиям участия на основе паспорта через ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: ". Agora получает раскрываемые доказательствами сигналы, а не сам паспорт. Для регистрации через Rarimo действует дополнительное возрастное требование: вам должно быть 18 лет или больше. Сервис проверки также регулируется применимыми условиями поставщика.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Вы не вправе использовать Сервисы, если:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Доступ вашей учётной записи к Agora приостановлен или вы исключены из Agora.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Использование Сервисов запрещено вам законом в вашей юрисдикции.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Вы не можете заключить с Agora юридически обязательный договор либо не достигли возраста совершеннолетия в своей юрисдикции, если только ваш законный представитель не ознакомился с настоящими Условиями и не согласился с ними.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        heading: "2. Политика конфиденциальности",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Политика конфиденциальности Agora объясняет, как мы собираем, используем и защищаем ваши персональные данные. Получая доступ к Сервисам или используя их, вы соглашаетесь с настоящими Условиями. Ваши персональные данные обрабатываются в соответствии с Политикой конфиденциальности, и мы запрашиваем ваше согласие, когда оно требуется для конкретных операций обработки. Подробнее см. ",
              },
              {
                text: "Политику конфиденциальности Agora",
                kind: "link",
                href: "/legal/privacy",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "3. Использование вами Сервисов",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "При соблюдении настоящих Условий Agora предоставляет вам неисключительную, непередаваемую, отзывную лицензию на использование Сервисов. Вам запрещается:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Использовать Agora для распространения дезинформации, высказываний, разжигающих ненависть, или травли.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Осуществлять незаконную деятельность.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Участвовать в мошеннической деятельности, аферах или обманных практиках либо содействовать им.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Распространять или продвигать материалы откровенно сексуального характера, насильственный или иной недопустимый контент.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Использовать Agora для преследования, запугивания или угроз в отношении отдельных лиц или групп.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Пытаться манипулировать платформой, алгоритмами или функциями Agora либо недобросовестно использовать их для личной или коммерческой выгоды.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Осуществлять деятельность, поощряющую самоповреждение, самоубийство или любые формы создания опасности.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Нарушать права интеллектуальной собственности, в том числе несанкционированно распространять материалы, защищённые авторским правом.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Предоставлять лицензии на Сервисы или Контент, продавать, передавать, уступать, распространять, размещать их либо иным образом коммерчески использовать",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Пытаться взломать инфраструктуру Agora, нарушить её работу или осуществлять её обратную разработку.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Использовать автоматизированные средства для обхода ограничений доступа или недобросовестного извлечения контента. Это не запрещает разрешённое использование включённых функций экспорта.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Выдавать себя за другого пользователя, юридическое лицо или организацию.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Передавать или распространять вредоносное программное обеспечение, фишинговые материалы или мошеннические схемы.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Нарушать частную жизнь других пользователей, раскрывая персональную или чувствительную информацию без согласия, включая, помимо прочего, личные адреса, номера телефонов, финансовые сведения или любую непубличную переписку без явного разрешения.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora сохраняет право изменять или удалять функции в любое время без предварительного уведомления. Любые будущие улучшения, обновления или дополнения Сервисов регулируются настоящими Условиями, которые могут периодически пересматриваться. Вы признаёте, что Agora не несёт ответственности перед вами или третьими лицами за изменения, приостановление или прекращение Сервисов либо любых их компонентов.",
              },
            ],
          },
        ],
      },
      {
        heading: "4. Ваш Контент",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Сервисы могут содержать различные виды контента, включая текст, ссылки, изображения, видео, аудио и другие материалы, предоставленные пользователями («Контент»). Agora не гарантирует точность, полноту или надёжность какого-либо Контента и не несёт за него ответственности.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Предоставляя Контент, вы подтверждаете, что имеете все необходимые права для его распространения и что он не нарушает применимое законодательство или права третьих лиц. Вы несёте исключительную ответственность за свой контент и любые последствия его распространения в Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Используя Сервисы, вы сохраняете права на свой контент, но предоставляете Agora всемирную, неисключительную, безвозмездную, бессрочную лицензию с правом сублицензирования на хранение, использование, изменение, распространение и отображение вашего контента для функционирования платформы, соблюдения требований и эксплуатационных целей. Это включает право Agora предоставлять ваш Контент для синдикации, распространения, агрегирования или публикации сторонними партнёрами.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora оставляет за собой право по своему усмотрению удалять контент или ограничивать доступ к нему, если он нарушает настоящие Условия, применимое законодательство или правила платформы.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Эта лицензия не отменяет применимые права на защиту и удаление данных и не расширяет доступ к непубличному участию. Принятый запрос на удаление учётной записи скрывает личные утверждения и исключает участие из новых текущих расчётов. Необходимые данные восстановления хранятся непублично в течение 15-дневного срока восстановления. Мы бессрочно храним индивидуальные числовые входные данные сохранённых результатов (матрицы Polis, выборы BWS/pairwise и распределения QV) для анализа голосования и пересчёта, удаляя связи с учётной записью при окончательной очистке. Это не история каждого сохранения или расчёта QV. Обычное удаление не пересчитывает сохранённые показатели; отдельные исправления или повторный анализ могут их изменить. Исторические описания ИИ не переписываются автоматически при обычном удалении; применимые права на удаление сохраняются. Скачивание существующего экспорта прекращается не позднее чем через 30 дней после создания; новый экспорт учитывает текущее состояние удаления. Удаление связей не гарантирует анонимность.",
              },
            ],
          },
        ],
      },
      {
        heading: "5. Правила в отношении контента и модерации",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Вам запрещается публиковать Контент, который:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Пропагандирует насилие или незаконную деятельность.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Содержит высказывания, разжигающие ненависть, травлю или нападки на личность.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Распространяет дезинформацию или манипулятивные материалы.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Нарушает права интеллектуальной собственности.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora применяет систему модерации контента, основанную на жалобах пользователей, автоматическом обнаружении и документе ",
              },
              {
                text: "Правила сообщества",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: ". Контент, нарушающий настоящие Условия, может быть удалён, а к повторным нарушителям могут применяться приостановление доступа или блокировка.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Чтобы сообщить о незаконном контенте или обратиться по вопросам модерации и правовым вопросам, свяжитесь с нами по адресу ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "6. Контент третьих лиц и реклама",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora может содержать ссылки на сторонние веб-сайты, продукты или услуги, которые могут распространять рекламодатели, партнёры, аффилированные лица или другие пользователи («Контент третьих лиц»). Agora не контролирует и не одобряет такие внешние источники и не несёт ответственности за их точность, законность или надёжность.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Вы получаете доступ к Контенту третьих лиц и взаимодействуете с ним на свой риск; рекомендуем ознакомиться с соответствующими условиями и политиками до взаимодействия с внешними источниками или совершения сделок.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora может показывать рекламу или спонсируемый контент. Тип, таргетирование и частота рекламы могут меняться, и мы оставляем за собой право размещать рекламу в связи с любым контентом или услугами, предоставляемыми в Agora. Вы взаимодействуете со спонсируемым контентом или рекламой исключительно на свой риск, и мы не гарантируем точность, качество или легитимность рекламируемых продуктов или услуг.",
              },
            ],
          },
        ],
      },
      {
        heading: "7. Интеллектуальная собственность",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Все права интеллектуальной собственности, связанные с Agora, включая, помимо прочего, патенты, товарные знаки, фирменные наименования, авторские права, коммерческие тайны, данные, находящиеся в исключительном владении, ноу-хау, личные неимущественные права, права на базы данных, права на промышленные образцы, алгоритмы, программное обеспечение, программный код, визуальные интерфейсы и любые другие исключительные права, зарегистрированные или незарегистрированные, принадлежат Agora либо используются ею на основании лицензии. Это также включает любые заявки или права на подачу заявок на регистрацию такой интеллектуальной собственности по законодательству любой юрисдикции.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Несанкционированные использование, воспроизведение, изменение, распространение или эксплуатация интеллектуальной собственности Agora строго запрещены. Это включает, помимо прочего, обратную разработку программного обеспечения, продажу материалов, находящихся в исключительном владении, или использование любого защищённого контента без предварительного письменного разрешения Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Любое нарушение этих прав интеллектуальной собственности может повлечь судебное разбирательство. Agora сохраняет все права, прямо не предоставленные настоящими Условиями.",
              },
            ],
          },
        ],
      },
      {
        heading: "8. Прекращение предоставления Сервисов",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Вы можете в любое время запросить удаление своей Учётной записи и прекратить использование Сервисов. После принятия запроса обычный доступ прекращается и начинается 15-дневный срок восстановления. Отклонённый запрос не закрывает учётную запись и не запускает этот срок. В течение этого срока вы можете явно отменить принятый обычный запрос на удаление учётной записи; окончательное удаление данных и сохраняемые записи регулируются Политикой конфиденциальности.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Следующие разделы сохраняют силу после любого прекращения действия настоящих Условий или удаления вашей Учётной записи:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "3. Использование вами Сервисов,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "4. Ваш Контент,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "8. Прекращение предоставления Сервисов,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. Отказ от гарантий и ограничение ответственности,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "10. Возмещение потерь",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "14. Прочие положения.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Как удалить учётную запись:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Воспользуйтесь доступным средством удаления учётной записи после аутентификации или обратитесь за помощью по адресу legal@zkorum.com. Если обязанности в организации мешают удалению через эти средства, свяжитесь с нами. Мы проверяем владение с помощью поддерживаемых учётных данных или доказательства владения ключом устройства в соответствии с типом учётной записи; это не означает, что требуется присылать изображение паспорта или бессрочно собирать подписанные доказательства.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Принятый запрос на удаление отключает обычный доступ, отзывает сеансы и скрывает личные утверждения. Открытые результаты могут обновляться асинхронно; сохранённые числовые результаты и существующий экспорт регулируются Политикой конфиденциальности. Необходимые данные восстановления остаются непубличными. Для восстановления нужны явная отмена удаления и подтверждение владения строго до сохранённого 15-дневного предельного срока и до начала необратимой очистки. Гостям нужны исходные ключи устройства; их потеря может сделать восстановление невозможным. Успешное восстановление создаёт новый сеанс, а не возобновляет доступ через ранее отозванные сеансы.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Восстановление прекращается по истечении 15-дневного срока, и непубличные данные учётной записи подлежат окончательной очистке без неоправданной задержки. Задержки очистки не продлевают восстановление и не запускают применимые законные сроки заново. Сохранённые входные данные, записи с ограниченным доступом и резервные копии регулируются Политикой конфиденциальности. Более поздняя регистрация не позволяет вернуть отвязанное участие.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Отдельный контент, учётные данные и совместные проекты:",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            items: [
              {
                content: [
                  {
                    text: "Отдельный контент:",
                    kind: "strong",
                  },
                  {
                    text: " Разрешённое удаление контента немедленно скрывает текст, версии, переводы и авторство, в том числе в сохранённых контрольных точках, без срока восстановления учётной записи. Удаление учётной записи скрывает личные утверждения из текущих представлений, но может сохранять допустимый исторический текст без публичной привязки к учётной записи. Если вы хотите удалить и этот текст, управляйте контентом отдельно до удаления учётной записи; применимые запросы на удаление данных не требуют вручную удалять каждый вклад. Средства отзыва участия подчиняются правилам открытых и закрытых активностей и не переписывают сохранённые результаты. После окончательного удаления связей средства управления учётной записью не позволяют получать, изменять или отзывать отвязанные числовые записи.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Пределы восстановления:",
                    kind: "strong",
                  },
                  {
                    text: " Восстановление учётной записи может в допустимых случаях вернуть текст, переводы, указание авторства и допуск к текущему анализу утверждений, скрытых исключительно из-за удаления учётной записи, в том числе в наших контрольных снимках. Оно не восстанавливает независимо удалённые контент, проекты или документы, отозванные голоса, необратимые объединения гостевых учётных записей, принятые за это время решения модерации или отдельно удалённые результаты и не дублирует сохранённые голоса. Гости должны сохранять исходные ключи устройства, чтобы подтвердить принадлежность учётной записи. Восстановление недоступно после точного предельного срока или после начала необратимой очистки.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Организации и проекты:",
                    kind: "strong",
                  },
                  {
                    text: " Действия по удалению требуют соответствующих полномочий и не являются обратимым архивированием. Удаление проекта удаляет содержащиеся в нём обсуждения, документы и принадлежащие исключительно ему сохранённые числовые входные данные и отчёты по применимым правилам очистки. До удаления организации оставшиеся проекты, принадлежащие только ей, нужно передать другому сохраняющемуся владельцу. Совместные проекты остаются у сохранившихся владельцев, а связи удалённой организации удаляются. Отдельное разрешённое удаление проекта рассматривается как удаление самого проекта, а не как действие по восстановлению учётной записи.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Применимые запросы о персональных данных регулируются общими положениями о правах из Политики конфиденциальности без необходимости ждать предусмотренный продуктом срок восстановления. После удаления могут сохраняться ограниченные записи для целей, описанных в Политике конфиденциальности:",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "Кратковременные хеши защиты от повторного воспроизведения и необходимые сведения об ограничениях и блокировании для их защитной цели, а не бессрочный архив полных доказательств аутентификации или удаления.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Записи эксплуатационных событий и событий безопасности в соответствии с применимой политикой хранения, включая срок 180 дней для групп журналов CloudWatch. Эти записи ограничены своей целью и отличаются от сохраняемых данных учётной записи или периода хранения резервных копий.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Минимальные инструкции по удалению, необходимые для предотвращения восстановления удалённой информации из резервных копий, и доказательства строго ограниченного объёма по конкретному инциденту, юридической обязанности или правовому требованию, когда это обосновано.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Эти записи с ограниченным доступом не создают общего разрешения или обоснования для бессрочного хранения удалённого контента, индивидуальных закономерностей участия или учётных данных. Скачанные копии или копии у независимых владельцев и действия обработчиков и получателей объяснены в Политике конфиденциальности. Ничто в этом разделе не ограничивает применимые установленные законом права на защиту данных.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora оставляет за собой право приостанавливать действие или прекращать существование учётных записей, нарушающих настоящие Условия.",
              },
            ],
          },
        ],
      },
      {
        heading: "9. Отказ от гарантий и ограничение ответственности",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Сервисы предоставляются «как есть», без каких-либо гарантий. Agora не предоставляет никаких заверений или гарантий, явных, подразумеваемых, установленных законом или иных, включая, помимо прочего, гарантии товарной пригодности, пригодности для определённой цели, ненарушения прав или доступности Сервисов.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora не гарантирует, что Сервисы будут работать без ошибок, бесперебойно или безопасно либо что недостатки будут устранены. Пользователи принимают на себя все риски, связанные с использованием Сервисов.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "В максимальной степени, допускаемой законом, Agora не несёт ответственности за косвенные, случайные, последующие, штрафные или специальные убытки, возникающие из вашего использования Сервисов или связанные с ним, независимо от того, основаны ли требования на договоре, деликте, безвиновной ответственности или иной правовой конструкции, даже если Agora была уведомлена о возможности таких убытков. Это включает, помимо прочего, упущенную выгоду, потерю данных, вред жизни или здоровью, ущерб имуществу или перерыв в предпринимательской деятельности.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Некоторые юрисдикции не допускают исключения или ограничения ответственности за определённые виды ущерба, поэтому некоторые из этих ограничений могут к вам не применяться.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Хотя Agora использует технологию доказательств с нулевым разглашением (ZKP) для повышения конфиденциальности и безопасности, пользователи признают, что ни одна технология не является безошибочной. В реализации ZKP могут существовать непредвиденные уязвимости или недостатки, способные привести к несанкционированному раскрытию данных или нарушению конфиденциальности. Agora не даёт гарантий абсолютной безопасности или надёжности ZKP и не несёт ответственности за непреднамеренные последствия её использования.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Пользователям рекомендуется принимать дополнительные меры предосторожности: использовать средства анонимности, например Tor, для сокрытия своего IP-адреса, не раскрывать избыточную персональную информацию в своих текстах и учитывать, что стиль письма и раскрываемые атрибуты могут непреднамеренно позволить установить их личность путём сопоставления с данными паспорта и другими зарегистрированными действиями.",
              },
            ],
          },
        ],
      },
      {
        heading: "10. Возмещение потерь",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Кроме случаев, когда это запрещено законом, вы соглашаетесь обеспечивать правовую защиту Agora, её аффилированных лиц и их соответствующих директоров, должностных лиц, сотрудников, представителей, подрядчиков, сторонних поставщиков услуг и лицензиаров, возмещать им потери и ограждать их от любых претензий, требований, обязательств, ущерба, убытков и расходов (включая расходы на юридическую помощь и судебные издержки), возникающих из следующих обстоятельств или связанных с ними:",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            marker: "lower-alpha",
            items: [
              {
                content: [
                  {
                    text: "использование вами Agora и её Сервисов;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "нарушение вами настоящих Условий;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "нарушение вами любых применимых законов или нормативных актов; либо",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "любой Контент, который вы предоставляете, публикуете или распространяете в Agora.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora оставляет за собой право принять на себя руководство защитой по любому вопросу, по которому вы обязаны возмещать нам потери, а вы соглашаетесь в полной мере содействовать нашей защите от таких требований. Ваши обязательства по возмещению потерь сохраняют силу после любого прекращения или приостановления использования вами Agora и её Сервисов.",
              },
            ],
          },
        ],
      },
      {
        heading: "11. Делимость положений",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "По возможности положения настоящих Условий должны толковаться так, чтобы быть действительными и исполнимыми по применимому праву. Однако если одно или несколько положений полностью или частично признаются недействительными, незаконными или неисполнимыми, оставшаяся часть такого положения и настоящих Условий не затрагивается и сохраняет полную силу, как если бы такое недействительное, незаконное или неисполнимое положение никогда не включалось в них.",
              },
            ],
          },
        ],
      },
      {
        heading: "12. Применимое право и разрешение споров",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Настоящие Условия, включая любые вопросы их действительности, толкования, принудительного исполнения, выполнения или прекращения, а также любые споры из деликтных требований, преддоговорных обязательств или внедоговорной ответственности, регулируются и толкуются в соответствии с законодательством Франции. Никакие иные принципы выбора права или коллизионные нормы, которые привели бы к применению законодательства любой юрисдикции, кроме Франции, не применяются.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Мы хотим, чтобы ваш опыт использования Agora был положительным. При возникновении проблем или споров вы соглашаетесь сначала попытаться урегулировать их с нами неформально. Вы можете направить нам отзывы или сообщить о вызывающих обеспокоенность вопросах по адресу ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Любые споры, которые не удаётся урегулировать неформально, подлежат исключительной юрисдикции судов Нёйи-сюр-Сен.",
              },
            ],
          },
        ],
      },
      {
        heading: "13. Изменения настоящих Условий",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora может периодически обновлять настоящие Условия с учётом изменений наших сервисов, требований законодательства или иных эксплуатационных потребностей. При существенных изменениях мы уведомим пользователей через уведомления в приложении, баннеры или запросы, требующие подтверждения ознакомления до вступления изменений в силу.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Продолжая получать доступ к Agora или использовать её после вступления пересмотренных Условий в силу, вы соглашаетесь соблюдать обновлённые Условия. Если вы не согласны с изменениями, вы должны прекратить использование Agora до их вступления в силу.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Рекомендуем пользователям регулярно просматривать настоящие Условия, чтобы знать свои права и обязанности при использовании Agora.",
              },
            ],
          },
        ],
      },
      {
        heading: "14. Прочие положения",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Настоящие Условия вместе с Политикой конфиденциальности составляют полное соглашение, регулирующее ваш доступ к Agora и её использование. Неосуществление нами какого-либо права или неприменение положения настоящих Условий не считается отказом от такого права или положения.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Если какое-либо положение настоящих Условий признаётся недействительным или неисполнимым, оно применяется в максимально допустимой степени, а остальные положения сохраняют полную силу.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Вы не вправе уступать или передавать какие-либо свои права или обязанности по настоящим Условиям без нашего предварительного согласия. Однако мы оставляем за собой право свободно и без ограничений передавать свои права и обязанности по настоящим Условиям.",
              },
            ],
          },
        ],
      },
      {
        heading: "15. Контактная информация",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "По вопросам или обращениям, связанным с настоящими Условиями, свяжитесь с нами по адресу: ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Используя Agora, вы подтверждаете ознакомление и согласие с настоящими Условиями и любыми их будущими изменениями.",
              },
            ],
          },
          {
            type: "address",
            lines: [
              "ZKORUM SAS",
              "99 AVENUE ACHILLE PERETTI",
              "92200 NEUILLY-SUR-SEINE",
              "ФРАНЦИЯ",
            ],
          },
        ],
      },
    ],
  },
  "zh-Hans": {
    termsOfService: "服务条款",
    automatedTranslationNoticeTitle: "自动翻译声明",
    automatedTranslationNotice:
      "本译文由自动翻译生成。如有任何差异、不一致或冲突，仅以英文版本为准，英文版本具有权威效力。",
    viewAuthoritativeEnglishVersion: "查看具有权威效力的英文版本",
    returnToTranslatedVersion: "返回译文版本",
    lastUpdatedLabel: "最后更新日期",
    lastUpdatedDate: "2026/10/14 (YYYY/MM/DD)",
    introduction: [
      {
        text: "欢迎使用 Agora Citizen Network（“Agora”）！本条款及条件（“条款”）规范您对 Agora 平台的访问和使用，包括我们的网站、移动应用程序及其他服务（统称为“服务”）。访问或使用服务即表示您同意受本条款约束。如不同意，您不得访问或使用服务。",
      },
    ],
    sections: [
      {
        heading: "1. 您对服务的访问",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 仅面向年满16岁的用户提供。使用 Agora 即表示您确认自己符合该年龄要求，且您的年龄高于居住国法律规定的访问和使用服务所需的最低年龄。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "您可以无需注册浏览 Agora 已发布的内容。参与对话、问卷或优先级排序活动（“内容”）可能需要基于设备的访客账户或特定验证方式。可用方式包括：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "在允许的情况下，基于设备以访客身份参与。访问和恢复取决于原始设备密钥是否仍然保留。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "使用一次性验证码进行电子邮件验证。这证明的是您控制该电子邮件地址，而非现实身份或个人唯一性。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "通过电话号码登录（使用一次性验证码验证）",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "通过以下服务进行基于护照的资格验证： ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: "。Agora 接收所披露的证明信号，而非底层护照。Rarimo 注册须遵守其额外年龄要求：您必须年满18岁。该提供商的适用条款也规范其验证服务。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "存在下列情况时，您不得使用服务：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "您的 Agora 使用资格已被暂停或取消。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您所在司法管辖区的法律禁止您使用服务。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您无法与 Agora 订立具有约束力的合同，或您尚未达到所在司法管辖区的法定成年年龄，除非您的法定监护人已审阅并同意本条款。",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        heading: "2. 隐私政策",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 的隐私政策说明我们如何收集、使用和保护您的个人数据。访问或使用服务即表示您同意本条款。您的个人数据按照隐私政策所述进行处理；对于特定处理活动，我们会在法律要求时征求您的同意。更多详情请参阅 ",
              },
              {
                text: "Agora 隐私政策",
                kind: "link",
                href: "/legal/privacy",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "3. 您对服务的使用",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "在遵守本条款的前提下，Agora 授予您一项非独占、不可转让、可撤销的服务使用许可。您不得：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "使用 Agora 传播错误信息、仇恨言论或实施骚扰。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "从事非法活动。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "从事或推广欺诈活动、骗局或欺骗性行为。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "传播或推广含露骨性描写的内容、暴力内容或其他不当内容。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "使用 Agora 跟踪、恐吓或威胁个人或群体。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "试图操纵或不当利用 Agora 的平台、算法或功能获取个人或商业利益。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "从事鼓励自残、自杀或任何形式危害的活动。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "侵犯知识产权，包括未经授权传播受版权保护的材料。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "对服务或内容进行许可、出售、转移、转让、分发、托管或以其他方式进行商业利用",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "试图入侵、破坏 Agora 的基础设施，或对其进行逆向工程。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "使用自动化工具绕过访问限制或以滥用方式提取内容。这不禁止经授权使用已启用的导出功能。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "冒充其他用户、实体或组织。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "共享或传播恶意软件、网络钓鱼行为或欺诈方案。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "未经同意披露个人或敏感信息，侵犯其他用户的隐私，包括但不限于未经明确许可共享个人地址、电话号码、财务详情或任何私密通信。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 保留随时修改或移除功能的权利，无须事先通知。服务今后的任何改进、更新或新增内容均受本条款约束，本条款可能定期修订。您确认，Agora 不因服务或其任何组成部分的修改、暂停或停止而对您或任何第三方承担责任。",
              },
            ],
          },
        ],
      },
      {
        heading: "4. 您的内容",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "服务可能包含用户提交的各种类型内容，包括文本、链接、图像、视频、音频和其他材料（“内容”）。Agora 不保证任何内容的准确性、完整性或可靠性，也不对其承担责任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "提交内容即表示您确认拥有共享该内容所需的全部权利，且该内容不违反任何适用法律或第三方权利。您须独自对自己的内容及在 Agora 上共享该内容所产生的任何后果负责。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "使用服务时，您保留内容的所有权，但授予 Agora 一项全球范围、非独占、免许可使用费、永久且可再许可的许可，以便为平台功能、合规和运营目的存储、使用、修改、分发和展示您的内容。这包括 Agora 有权使您的内容可供第三方合作伙伴进行联合传播、分发、汇总或发布。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "如果内容违反本条款、适用法律或平台政策，Agora 保留酌情移除或限制该内容的权利。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "本许可不凌驾于适用的数据保护或删除权之上，也不扩大对私密参与信息的访问范围。账户删除请求获接受后，个人陈述会被隐藏，相关参与记录不再纳入新的实时计算。必要的恢复数据会在15天恢复期内以私密方式保留。我们无限期保留已保存结果的个人数值输入（Polis 矩阵、BWS/pairwise 选择和 QV 分配），用于投票分析和重新计算，并在永久清理时移除账户关联。这并非每次保存或 QV 计算的完整历史。常规删除不会重新计算已保存的数值；另行更正或重新分析可能使其改变。常规删除不会自动改写历史AI描述；适用的删除权仍然有效。现有导出文件的下载最迟在生成后30天到期；新导出文件按当前删除状态生成。解除关联不保证匿名性。",
              },
            ],
          },
        ],
      },
      {
        heading: "5. 内容与审核政策",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "您不得发布具有下列性质的内容：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "鼓吹暴力或非法活动。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "包含仇恨言论、骚扰或人身攻击。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "传播错误信息或具有操纵性的内容。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "侵犯知识产权。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 采用基于用户举报、自动检测和以下准则的内容审核系统： ",
              },
              {
                text: "社区准则",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: "。违反本条款的内容可能被移除，屡次违规者可能被暂停使用或封禁。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "如需举报非法内容或处理内容审核及法律问题，请通过以下方式联系我们： ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "6. 第三方内容与广告",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 可能包含指向第三方网站、产品或服务的链接，这些链接可能由广告主、合作伙伴、关联方或其他用户分享（“第三方内容”）。Agora 不控制、不认可这些外部来源，也不对其准确性、合法性或可靠性承担任何责任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "访问第三方内容或与其互动的风险由您自行承担；我们建议您在与外部来源互动或完成交易前，查阅任何相关条款、政策或条件。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 可能展示广告或赞助内容。广告的类型、定向方式和频率可能变化，我们保留在 Agora 提供的任何内容或服务中投放相关广告的权利。您与赞助内容或广告互动的风险完全由您自行承担，我们不保证所宣传产品或服务的准确性、质量或合法性。",
              },
            ],
          },
        ],
      },
      {
        heading: "7. 知识产权",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "与 Agora 有关的全部知识产权，包括但不限于专利、商标、商号、著作权、商业秘密、专有数据、专门知识、著作人身权、数据库权、外观设计权、算法、软件、计算机代码、视觉界面及任何其他专有权利，无论是否注册，均由 Agora 所有或经许可由 Agora 使用。这也包括依据任何司法管辖区法律就此类知识产权提出的任何注册申请或申请注册的权利。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "严禁未经授权使用、复制、修改、分发或利用 Agora 的知识产权。这包括但不限于对软件进行逆向工程、出售专有材料，或未经 Agora 事先书面许可使用任何专有内容。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "任何侵犯这些知识产权的行为均可能招致法律行动。Agora 保留本条款未明确授予的全部权利。",
              },
            ],
          },
        ],
      },
      {
        heading: "8. 服务终止",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "您可以随时请求删除账户并停止使用服务。删除请求获接受后，常规账户访问停止，15天恢复期开始。请求被拒绝不会关闭账户，也不会启动恢复期。您可以在该期限内明确取消已获接受的常规账户删除请求；永久删除和保留记录遵循隐私政策。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "本条款或您的账户终止后，以下章节继续有效：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "3. 您对服务的使用，",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "4. 您的内容，",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "8. 服务终止，",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. 免责声明与责任限制，",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "10. 赔偿义务",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "14. 其他条款。",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "如何删除您的账户：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "使用可用的、须经身份验证的账户删除功能，或联系 legal@zkorum.com 寻求协助。如果组织职责导致您无法通过该功能删除账户，请联系我们。我们根据账户类型，使用受支持的凭据或设备密钥证明验证所有权；这不意味着您必须向我们发送护照图像，也不意味着我们需要无限期收集已签名证明。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "删除请求获接受后，常规访问被禁用，会话被撤销，个人陈述被隐藏。开放活动的结果可能异步更新；保留的数值结果和现有导出文件遵循隐私政策。必要的恢复数据以私密方式保留。恢复须明确取消删除并验证所有权，且必须严格早于已记录的15天截止时间和不可逆清除的开始时间。访客需要原始设备密钥；密钥丢失可能导致无法恢复。恢复成功会创建新会话，而不会通过已撤销的会话重新获得访问权限。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "15天截止时间到达时，恢复期结束，私密账户数据可进入永久清理，清理不得无故拖延。清理延迟不会延长恢复期，也不会重新计算适用的法定期限。保留的输入、受限记录和备份遵循隐私政策。日后重新注册无法重新认领已解除关联的参与记录。",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "单项内容、凭据和共享项目：",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            items: [
              {
                content: [
                  {
                    text: "单项内容：",
                    kind: "strong",
                  },
                  {
                    text: " 经授权删除内容会立即隐藏文本、各版本、译文和署名，包括保留的检查点中的内容，不适用账户恢复期。删除账户会从当前视图中隐藏个人陈述，但允许保留的历史文本可能继续存在，而不公开关联账户。若您也希望移除该文本，请在删除账户前单独管理内容；适用的删除请求不要求您手动删除每项贡献。撤回功能遵循活动的开放/关闭规则，不会改写保留的结果。永久解除关联后，账户功能无法检索、更改或撤回已解除关联的数值记录。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "恢复范围：",
                    kind: "strong",
                  },
                  {
                    text: " 账户恢复可以还原完全因账户删除而隐藏的陈述所允许恢复的文本、译文、署名和当前资格，包括我们检查点中的这些内容。它不会恢复独立删除的内容/项目/文档、已撤回的投票、不可撤销的访客合并、期间实施的内容审核措施或另行删除的输出，也不会重复计入保留的投票。访客必须保留原始设备密钥才能证明所有权。超过精确截止时间后，或不可逆的清除已经开始后，无法恢复。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "组织和项目：",
                    kind: "strong",
                  },
                  {
                    text: " 删除操作需要相关权限，并非可撤销的归档。删除项目会按照适用的清理规则，移除其中的对话、文档以及该项目独占拥有的保留数值输入和报告。删除组织前，任何仍存在且由其单独拥有的项目都必须转移给另一位仍保留的所有者。共同拥有的项目继续由其余所有者持有，同时移除被删除组织的关联关系。另行授权的项目删除按该项目自身的删除处理，并非账户恢复操作。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "适用的个人数据请求遵循隐私政策的一般权利条款，无须经过产品恢复期。删除后，可能为隐私政策所述目的保留有限记录：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "短期防重放哈希值，以及实现保护目的所需的限制/屏蔽状态，而非无限期保留完整身份验证或删除证明的档案。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "按适用保留政策保留的运营/安全事件记录，包括 CloudWatch 日志组的180天政策。这些记录仅限其目的，与保留的账户数据或备份期限相互独立。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "防止从备份恢复已删除信息所需的最少限度删除指令，以及在有充分理由时针对特定事件、法律义务或法律主张而保留的范围严格限定的证据。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "这些受限记录并不形成无限期保留已删除内容、个人参与模式或凭据的一般许可或正当理由。下载或独立持有的副本以及处理者/接收者的处理，详见隐私政策。本节任何内容均不限制适用的法定数据保护权利。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 保留暂停或终止违反本条款的账户的权利。",
              },
            ],
          },
        ],
      },
      {
        heading: "9. 免责声明与责任限制",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "服务按“现状”提供，不附带任何形式的保证。Agora 不作任何形式的陈述或保证，无论是明示、默示、法定还是其他形式，包括但不限于有关适销性、特定用途适用性、不侵权或服务可用性的保证。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 不保证服务无错误、不间断、安全，也不保证缺陷会得到修正。用户自行承担与使用服务相关的全部风险。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "在法律允许的最大范围内，Agora 不对因您使用服务而产生或与之相关的任何间接、附带、后果性、惩罚性或特殊损害承担责任，无论依据合同、侵权、严格责任或任何其他法律理论，即使 Agora 已被告知可能发生此类损害。这包括但不限于利润损失、数据丢失、人身伤害、财产损害或业务中断所造成的损害。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "某些司法管辖区不允许排除或限制某些损害责任，因此部分限制可能不适用于您。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "虽然 Agora 采用零知识证明（ZKP）技术来增强隐私和安全，用户仍确认，没有任何技术绝对可靠。ZKP的实现可能存在未预见的漏洞或缺陷，进而可能导致未经授权的数据暴露或隐私侵犯。Agora 不对ZKP的绝对安全性或可靠性作出保证，也不对其使用产生的任何非预期后果承担责任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "我们建议用户采取额外预防措施，例如使用 Tor 等匿名工具隐藏IP地址，避免在文字中分享过多个人信息，并留意写作风格和共同属性，以免这些信息通过与护照及其他已记录操作的关联，意外暴露身份。",
              },
            ],
          },
        ],
      },
      {
        heading: "10. 赔偿义务",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "除法律禁止的情形外，您同意，就因下列事项产生或与之相关的任何索赔、要求、责任、损害、损失和费用（包括法律服务费用及相关支出），为 Agora、其关联方及其各自的董事、高级管理人员、员工、代理人、承包商、第三方服务提供商和许可方进行抗辩、作出赔偿并使其免受损害：",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            marker: "lower-alpha",
            items: [
              {
                content: [
                  {
                    text: "您使用 Agora 及其服务；",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您违反本条款；",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您违反任何适用法律或法规；或",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您在 Agora 上提交、发布或共享的任何内容。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "对于您有义务向我们赔偿的任何事项，Agora 保留接管其抗辩的权利，您同意充分配合我们对此类索赔的抗辩。您对 Agora 及其服务的使用终止或暂停后，您的赔偿义务继续有效。",
              },
            ],
          },
        ],
      },
      {
        heading: "11. 可分割性",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "在可行的情况下，本条款的规定应以使其在准据法下有效且可执行的方式解释。但是，如果本条款的一项或多项规定被认定全部或部分无效、违法或不可执行，该规定的其余部分及本条款的其余规定不受影响，并继续完全有效，如同本条款从未包含该无效、违法或不可执行的规定。",
              },
            ],
          },
        ],
      },
      {
        heading: "12. 准据法与争议解决",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本条款，包括与其效力、解释、执行、履行或终止有关的任何问题，以及由侵权请求、合同前义务或合同外责任产生的任何争议，均受法国法律管辖并依其解释。任何会导致适用法国以外司法管辖区法律的其他法律选择原则或法律冲突规则，均不予适用。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "我们希望您在 Agora 获得良好体验。如有任何问题或争议，您同意首先尝试与我们通过非正式方式解决。您可以通过以下方式向我们提出任何反馈或关切： ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "任何无法通过非正式方式解决的争议，均受 Neuilly Sur Seine 法院的专属管辖。",
              },
            ],
          },
        ],
      },
      {
        heading: "13. 本条款的变更",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 可能不时更新本条款，以反映服务、法律要求或其他运营需求的变化。如作出重大修改，我们会在变更生效前，通过应用内通知、横幅或要求确认的提示告知用户。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "修订后的条款生效后，继续访问或使用 Agora 即表示您同意受更新后的条款约束。如不同意修改，您必须在变更生效前停止使用 Agora。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "我们建议用户定期查阅本条款，了解使用 Agora 时享有的权利和承担的义务。",
              },
            ],
          },
        ],
      },
      {
        heading: "14. 其他条款",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本条款与隐私政策共同构成规范您访问和使用 Agora 的完整协议。我们未行使或执行本条款项下的任何权利或规定，不应被视为放弃该权利或规定。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "如本条款的任何规定被认定无效或不可执行，应在法律允许的最大范围内予以执行，其余规定继续完全有效。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "未经我们事先同意，您不得转让或转移本条款项下的任何权利或义务。但是，我们保留不受限制地自由转让本条款项下权利和义务的权利。",
              },
            ],
          },
        ],
      },
      {
        heading: "15. 联系信息",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "如对本条款有任何疑问或关切，请通过以下方式联系我们： ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "使用 Agora 即表示您确认并同意本条款及今后的任何修改。",
              },
            ],
          },
          {
            type: "address",
            lines: [
              "ZKORUM SAS",
              "99 AVENUE ACHILLE PERETTI",
              "92200 NEUILLY-SUR-SEINE",
              "FRANCE",
            ],
          },
        ],
      },
    ],
  },
  "zh-Hant": {
    termsOfService: "服務條款",
    automatedTranslationNoticeTitle: "自動翻譯通知",
    automatedTranslationNotice:
      "本翻譯係自動產生。如有任何差異、不一致或衝突，一律以英文版本為準，且英文版本為具權威效力的版本。",
    viewAuthoritativeEnglishVersion: "查看具權威效力的英文版本",
    returnToTranslatedVersion: "返回翻譯版本",
    lastUpdatedLabel: "最後更新日期",
    lastUpdatedDate: "2026/10/14 (YYYY/MM/DD)",
    introduction: [
      {
        text: "歡迎使用 Agora Citizen Network（「Agora」）！本條款及條件（「本條款」）規範您對 Agora 平台的存取及使用，包括我們的網站、行動應用程式及其他服務（合稱「本服務」）。存取或使用本服務，即表示您同意受本條款拘束。如您不同意，則不得存取或使用本服務。",
      },
    ],
    sections: [
      {
        heading: "1. 您對本服務的存取",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 僅供年滿 16 歲的使用者使用。使用 Agora，即表示您確認符合此年齡要求，且年齡高於您居住國法律對存取及使用本服務所要求的最低年齡。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "您可在不註冊的情況下瀏覽已發布的 Agora 內容。參與對話、問卷或優先排序活動（「內容」），可能需要以裝置為基礎的訪客帳戶或特定驗證方式。可用方式包括：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "在允許時，以裝置為基礎的訪客身分參與。存取及復原能力取決於是否保留原始裝置金鑰。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "使用一次性驗證碼進行電子郵件驗證。此方式證明您能控制該電子郵件地址，而非證明現實世界中的身分或唯一性。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "透過電話號碼登入（以一次性驗證碼驗證）",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "透過 ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: "進行以護照為基礎的資格驗證。Agora 收到的是已揭露的證明訊號，而非原始護照。Rarimo 註冊另有年齡要求：您必須年滿 18 歲。供應商適用的條款亦規範其驗證服務。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "有下列任一情況時，您不得使用本服務：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "您已遭 Agora 停權或移除。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您所在司法管轄區的法律禁止您使用本服務。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您無法與 Agora 締結具有拘束力的契約，或您未達所在司法管轄區的成年年齡；但您的法定監護人已審閱並同意本條款者除外。",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        heading: "2. 隱私權政策",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 的隱私權政策說明我們如何蒐集、使用及保護您的個人資料。存取或使用本服務，即表示您同意本條款。您的個人資料依隱私權政策所述方式處理，我們會在特定處理活動依法需要時，請求您的同意。詳情請參閱 ",
              },
              {
                text: "Agora 隱私權政策",
                kind: "link",
                href: "/legal/privacy",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "3. 您對本服務的使用",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "在遵守本條款的前提下，Agora 授予您非專屬、不可移轉且可撤銷的本服務使用授權。您不得：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "使用 Agora 散布不實資訊、仇恨言論或進行騷擾。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "從事違法活動。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "從事或推廣詐欺活動、騙局或欺騙行為。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "散布或推廣露骨色情、暴力或其他不當內容。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "使用 Agora 跟蹤、恐嚇或威脅個人或群體。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "企圖操控或不當利用 Agora 的平台、演算法或功能，以取得個人或商業利益。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "從事鼓勵自傷、自殺或任何危及安全行為的活動。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "侵害智慧財產權，包括未經授權散布受著作權保護的資料。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "授權、出售、移轉、讓與、散布、託管，或以其他方式將本服務或內容作商業利用",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "企圖入侵、干擾或對 Agora 的基礎設施進行逆向工程。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "使用自動化工具規避存取限制或濫用擷取內容。這不禁止經授權使用已啟用的匯出功能。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "冒充其他使用者、實體或組織。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "分享或散布惡意軟體、網路釣魚攻擊或詐欺計畫。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "在未經同意的情況下揭露個人或敏感資料，侵害其他使用者的隱私，包括但不限於未經明確許可分享個人地址、電話號碼、財務資訊或任何私密通訊。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 保留隨時修改或移除功能而不事先通知的權利。本服務未來的任何功能增強、更新或新增，均受本條款規範，而本條款可能定期修訂。您確認，對於本服務或其任何組成部分的修改、暫停或終止，Agora 不對您或任何第三方負責。",
              },
            ],
          },
        ],
      },
      {
        heading: "4. 您的內容",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本服務可能包含各類內容，包括使用者提交的文字、連結、影像、影片、音訊及其他資料（「內容」）。Agora 不保證任何內容的正確性、完整性或可靠性，亦不對其承擔責任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "提交內容，即表示您確認具備分享該內容所需的一切權利，且該內容不違反任何適用法律或第三方權利。您須自行對您的內容，以及在 Agora 分享該內容所產生的任何後果，負全部責任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "使用本服務時，您保留內容的所有權，但授予 Agora 全球性、非專屬、免權利金、永久且可再授權的授權，得為平台功能、法遵及營運目的，儲存、使用、修改、散布及展示您的內容。此授權包括 Agora 得使第三方合作夥伴取得您的內容，以進行聯播、散布、彙整或發布。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "如內容違反本條款、適用法律或平台政策，Agora 保留依其裁量移除或限制該內容的權利。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "本授權不凌駕適用的資料保護或刪除權利，也不擴大對私密參與資料的存取。帳戶刪除請求獲接受後，個人陳述會隱藏，參與資料不再符合新的即時計算資格。必要的復原資料會在 15 天復原期間內保持非公開。我們會無限期保留已儲存結果的個別數值輸入（Polis 矩陣、BWS／pairwise 選擇及 QV 分配），用於投票分析與重新計算，並在永久清理時移除帳戶連結。這並非每次儲存或 QV 計算的完整歷史。一般刪除不會重新計算已儲存數值；另行更正或重新分析可能改變這些數值。一般刪除不會自動改寫歷史 AI 描述；適用的刪除權利仍然有效。既有匯出資料的下載期限最遲於產生後 30 天屆滿；新匯出資料採用目前的刪除狀態。解除連結不保證匿名。",
              },
            ],
          },
        ],
      },
      {
        heading: "5. 內容與內容管理政策",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "您不得發布具有下列情形的內容：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "鼓吹暴力或違法活動。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "包含仇恨言論、騷擾或人身攻擊。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "散布不實資訊或操弄性內容。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "侵害智慧財產權。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 採用以使用者檢舉、自動偵測及以下規範為基礎的內容管理系統： ",
              },
              {
                text: "社群守則",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: "。違反本條款的內容可能被移除，多次違規者可能遭停權或封禁。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "如欲檢舉違法內容，或處理內容管理及法律方面的疑慮，請透過以下方式聯絡我們： ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
        ],
      },
      {
        heading: "6. 第三方內容與廣告",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 可能包含第三方網站、產品或服務的連結，由廣告商、合作夥伴、關係企業或其他使用者分享（「第三方內容」）。Agora 不控制或背書這些外部來源，也不對其正確性、合法性或可靠性承擔任何責任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "存取第三方內容或與其互動，風險由您自行承擔；我們建議您在與外部來源互動或完成交易前，先審閱相關條款、政策或條件。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 可能顯示廣告或贊助內容。廣告的類型、投放對象及頻率可能變更，我們保留在 Agora 提供的任何內容或服務中配置相關廣告的權利。您與贊助內容或廣告互動的風險，完全由您自行承擔；我們不保證任何廣告產品或服務的正確性、品質或正當性。",
              },
            ],
          },
        ],
      },
      {
        heading: "7. 智慧財產權",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "與 Agora 相關的一切智慧財產權，包括但不限於專利、商標、商業名稱、著作權、營業秘密、專有資料、專門技術、著作人格權、資料庫權、設計權、演算法、軟體、電腦程式碼、視覺介面及任何其他專有權利，無論是否登記，均由 Agora 擁有或取得授權。這亦包括依任何司法管轄區法律，就該等智慧財產提出登記申請，或申請登記的權利。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "嚴禁未經授權使用、重製、修改、散布或利用 Agora 的智慧財產。這包括但不限於對軟體進行逆向工程、出售專有資料，或未經 Agora 事先書面許可使用任何專有內容。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "侵害這些智慧財產權可能導致法律行動。Agora 保留本條款未明確授予的一切權利。",
              },
            ],
          },
        ],
      },
      {
        heading: "8. 本服務的終止",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "您可隨時請求刪除帳戶並停止使用本服務。刪除請求獲接受後，一般帳戶存取即停止，並開始 15 天復原期間。遭拒絕的請求不會關閉帳戶，也不會啟動該期間。您可在期間內明確取消已獲接受的一般帳戶刪除請求；永久刪除及保留紀錄依隱私權政策處理。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "本條款或您的帳戶終止後，下列各節仍繼續有效：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "3. 您對本服務的使用，",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "4. 您的內容，",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "8. 本服務的終止，",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. 免責聲明與責任限制，",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "10. 賠償",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "14. 其他規定。",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "如何刪除您的帳戶：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "請使用可用、經身分驗證的帳戶刪除控制項，或聯絡 legal@zkorum.com 取得協助。若組織責任使您無法透過控制項刪除帳戶，請聯絡我們。我們依帳戶類型，適當使用受支援的憑證或裝置金鑰證明驗證所有權；這不表示要求您傳送護照影像，也不表示會無限期蒐集已簽署的證明。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "刪除請求獲接受後，會停用一般存取、撤銷工作階段並隱藏個人陳述。開放中的結果可能非同步更新；保留的數值結果及既有匯出資料依隱私權政策處理。必要的復原資料保持非公開。復原須明確取消刪除並驗證所有權，且嚴格限於所儲存的 15 天期限屆滿前，以及不可逆清除開始前。訪客需要原始裝置金鑰；遺失金鑰可能使其無法復原。成功復原會建立新的工作階段，而非透過先前已撤銷的工作階段恢復存取。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "15 天期限屆滿時，復原結束，私密帳戶資料即符合永久清理條件，並會在無不當延誤的情況下清理。清理延遲不會延長復原期間，也不會重新起算適用的法定期限。保留的輸入、受限制紀錄及備份依隱私權政策處理。日後重新註冊無法取回已解除連結的參與資料。",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "個別內容、憑證及共用專案：",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            items: [
              {
                content: [
                  {
                    text: "個別內容：",
                    kind: "strong",
                  },
                  {
                    text: " 經授權刪除內容後，文字、各版本、翻譯及署名會立即隱藏，包括保留的檢查點中的內容，不適用帳戶復原期間。刪除帳戶會從目前檢視隱藏個人陳述，但獲准保留的歷史文字可能繼續存在，而不公開連結帳戶。若您也希望移除該文字，請在刪除帳戶前另行管理內容；適用的刪除請求不要求您手動刪除每項貢獻。撤回控制項依活動的開放／關閉規則運作，不會改寫保留的結果。永久解除連結後，帳戶控制項無法取回、更改或撤回已解除連結的數值紀錄。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "復原範圍：",
                    kind: "strong",
                  },
                  {
                    text: " 帳戶復原可還原完全因帳戶刪除而隱藏的陳述之允許恢復文字、翻譯、署名及目前資格，包括我們檢查點中的相應內容。它不會還原獨立刪除的內容／專案／文件、已撤回的投票、不可逆的訪客合併、其間作成的內容管理處置或另行刪除的輸出，也不會重複建立保留的投票。訪客必須保留原始裝置金鑰，以證明所有權。確切期限屆滿後，或不可逆的清除一旦開始，即無法復原。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "組織與專案：",
                    kind: "strong",
                  },
                  {
                    text: " 刪除操作需要相關權限，並非可還原的封存。刪除專案會依適用清理規則，移除其中的對話、文件，以及專案專屬的保留數值輸入和報告。刪除組織前，任何仍由其單獨擁有的專案，均須移轉予另一個仍存續的擁有者。共同擁有的專案仍由存續的擁有者保有，並移除已刪除組織的關係。另行授權的專案刪除，會作為該專案本身的刪除處理，而非帳戶復原操作。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "適用的個人資料請求依隱私權政策的一般權利規定處理，無須等待產品復原期間屆滿。刪除後，有限的紀錄可為隱私權政策所述目的保留：",
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            items: [
              {
                content: [
                  {
                    text: "為保護目的保留短期的防重播雜湊值及必要的限制／抑制狀態，而非無限期封存完整身分驗證或刪除證明。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "依適用保留政策保存的營運／安全事件紀錄，包括 CloudWatch 日誌群組的 180 天政策。這些紀錄限於其目的，且與保留的帳戶資料或備份期間不同。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "防止從備份還原已刪除資料所需的最低限度刪除指示，以及在有正當理由時，針對特定事件、法律義務或請求而範圍嚴格限縮的證據。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "這些受限制紀錄，不會產生無限期保留已刪除內容、個別參與模式或憑證的一般授權或正當理由。已下載或由他人獨立持有的副本，以及資料處理者／接收者的處理，於隱私權政策中說明。本節任何內容，均不限制適用的法定資料保護權利。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 保留暫停或終止違反本條款之帳戶的權利。",
              },
            ],
          },
        ],
      },
      {
        heading: "9. 免責聲明與責任限制",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本服務依「現狀」提供，不附任何種類的擔保。Agora 不作出任何明示、默示、法定或其他形式的聲明或擔保，包括但不限於適銷性、特定目的適用性、不侵權或本服務可用性的擔保。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 不保證本服務無錯誤、不中斷、安全，或缺陷會獲得修正。使用者承擔使用本服務相關的一切風險。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "在法律允許的最大範圍內，對於因您使用本服務所生或與之相關的任何間接、附帶、衍生、懲罰性或特殊損害，無論係基於契約、侵權、無過失責任或其他法律理論，即使 Agora 已被告知可能發生該等損害，Agora 亦不負責。這包括但不限於所失利益、資料遺失、人身傷害、財產損害或營業中斷所生損害。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "部分司法管轄區不允許排除或限制某些損害責任，因此其中部分限制可能不適用於您。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "雖然 Agora 採用零知識證明（ZKP）技術以增進隱私及安全，使用者仍確認任何技術均非絕對可靠。ZKP 的實作可能存在未預見的漏洞或缺陷，可能導致未經授權的資料暴露或隱私侵害。Agora 不保證 ZKP 的絕對安全或可靠性，亦不對使用該技術所生的任何非預期後果承擔責任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "建議使用者採取額外預防措施，例如使用 Tor 等匿名工具隱藏 IP 位址、避免在撰寫內容中分享過多個人資料，並留意寫作風格及共同屬性，因為這些資訊可能與護照及其他已記錄行動進行關聯比對，意外揭露其身分。",
              },
            ],
          },
        ],
      },
      {
        heading: "10. 賠償",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "除法律禁止者外，您同意就因下列事項所生或與之相關的任何請求、要求、責任、損害、損失及費用（包括法律服務費用及支出），為 Agora、其關係企業，以及其各自的董事、主管、員工、代理人、承包商、第三方服務供應商及授權人辯護、提供賠償，並使其免受損害：",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            marker: "lower-alpha",
            items: [
              {
                content: [
                  {
                    text: "您使用 Agora 及其服務；",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您違反本條款；",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您違反任何適用法律或法規；或",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您在 Agora 提交、發布或分享的任何內容。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "就您有義務賠償我們的任何事項，Agora 保留主導辯護的權利；您同意充分配合我們就此類請求進行辯護。您使用 Agora 及其服務遭終止或暫停後，您的賠償義務仍繼續有效。",
              },
            ],
          },
        ],
      },
      {
        heading: "11. 可分割性",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "在可能範圍內，本條款各項規定應以在準據法下有效且可執行的方式解釋。然而，如本條款一項或多項規定被認定全部或部分無效、違法或不可執行，該規定的其餘部分及本條款其餘規定均不受影響，並繼續完全有效，如同本條款從未包含該無效、違法或不可執行規定。",
              },
            ],
          },
        ],
      },
      {
        heading: "12. 準據法與爭議解決",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本條款，包括與其效力、解釋、執行、履行或終止相關的任何問題，以及因侵權請求、締約前義務或契約外責任所生的任何爭議，均以法國法律為準據法，並依其解釋。任何將導致適用法國以外司法管轄區法律的法律選擇原則或法律衝突規則，均不予適用。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "我們希望您在 Agora 擁有良好體驗。如您有任何問題或爭議，您同意先嘗試與我們以非正式方式解決。如有任何意見或疑慮，您可透過以下方式聯絡我們： ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
              {
                text: ".",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "任何無法以非正式方式解決的爭議，均由 Neuilly Sur Seine 的法院專屬管轄。",
              },
            ],
          },
        ],
      },
      {
        heading: "13. 本條款的變更",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 可能不時更新本條款，以反映服務變更、法律要求或其他營運需要。如我們作出重大修改，會在變更生效前，透過應用程式內通知、橫幅或要求確認的提示通知使用者。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "修訂條款生效後，您繼續存取或使用 Agora，即表示您同意受更新後的條款拘束。如您不同意修改，必須在變更生效前停止使用 Agora。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "我們建議使用者定期審閱本條款，以了解使用 Agora 時的權利與義務。",
              },
            ],
          },
        ],
      },
      {
        heading: "14. 其他規定",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本條款與隱私權政策，共同構成規範您存取及使用 Agora 的完整協議。我們未行使或執行本條款下的任何權利或規定，不視為放棄該權利或規定。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "如本條款任何規定被認定無效或不可執行，應在法律允許的最大範圍內予以執行，其餘規定仍繼續完全有效。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "未經我們事先同意，您不得讓與或移轉本條款下的任何權利或義務。然而，我們保留不受限制、自由讓與本條款下權利及義務的權利。",
              },
            ],
          },
        ],
      },
      {
        heading: "15. 聯絡資訊",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "如對本條款有任何問題或疑慮，請透過以下方式聯絡我們： ",
              },
              {
                text: "legal@zkorum.com",
                kind: "link",
                href: "mailto:legal@zkorum.com",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "使用 Agora，即表示您確認並同意本條款及其未來的任何修改。",
              },
            ],
          },
          {
            type: "address",
            lines: [
              "ZKORUM SAS",
              "99 AVENUE ACHILLE PERETTI",
              "92200 NEUILLY-SUR-SEINE",
              "FRANCE",
            ],
          },
        ],
      },
    ],
  },
};
