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
  en: {
    termsOfService: "Terms of Service",
    automatedTranslationNoticeTitle: "Automated translation notice",
    automatedTranslationNotice:
      "This translation was generated automatically. If there is any discrepancy, inconsistency, or conflict, the English version exclusively prevails and is the authoritative version.",
    viewAuthoritativeEnglishVersion: "View authoritative English version",
    returnToTranslatedVersion: "Return to translated version",
    lastUpdatedLabel: "Last updated on",
    lastUpdatedDate: "2025/10/07 (YYYY/MM/DD)",
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
                text: 'You are not required to create an account to browse Agora. However, to participate in discussions and interact with content ("Content"), you may need to register using one of the following methods:',
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
                    text: "Log-in via phone number (verified through a one-time code)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Log-in via cryptographic proof from third-party verification apps (Rarimo, Zupass), which verify your identity using Zero-Knowledge Proofs (ZKP). These methods ensure that your identity is validated while maintaining privacy. Agora receives only cryptographic proofs confirming uniqueness and eligibility, never the underlying identity documents or ticket information. Note that it is not possible to register via ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  { text: " if you're not 18 years or older." },
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
                text: "Agora's Privacy Policy explains how we collect, use and protect your personal data. By using the Services, you consent to the collection and processing of your information as described in the Privacy Policy. For more details, visit the ",
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
                  { text: "Use automated tools to scrape or extract content." },
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
                text: "You may terminate these Terms at any time and for any reason by deleting your Account and discontinuing use of all Services. If you stop using the Services without deactivating your Account, your Account may be deactivated due to prolonged inactivity.",
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
                    text: "If you verified your account using Rarimo (passport verification), you must generate a new proof containing only the nullifier (excluding nationality and sex) before proceeding with deletion.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "If you verified your account using only a phone number, you must re-verify your phone number to confirm and complete the account deletion.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Upon success, your account will be deleted within 30 days.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "To delete the passport proof (if a phone number has already been entered) but keep your account:",
              },
            ],
          },
          {
            type: "list",
            ordered: true,
            items: [
              {
                content: [
                  { text: "Generate a new proof with Rarimo:", kind: "strong" },
                  {
                    text: " You'll need to create a fresh verification proof, but this time it will contain only your nullifier and not your nationality or sex.",
                  },
                ],
              },
              {
                content: [
                  { text: "Confirm the deletion:", kind: "strong" },
                  {
                    text: " Once confirmed, your previous passport proof, including nationality and sex, will be permanently deleted.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Some cryptographic records will still be kept, even if you delete your account, to ensure accountability:",
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
                    text: "The Zero-Knowledge Proof (ZKP) used for deletion, which contains only the nullifier and cryptographic data (not nationality or sex).",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "The User Controlled Authorization Network (UCAN) proof that signs this ZKP, verifying the request from your device.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "The UCAN proof confirming the deletion request, ensuring that the request was processed correctly.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "These cryptographic records exist to prove to third-party auditors that Agora did not censor accounts or data but rather deleted the information only upon user request. This ensures transparency and trust in the system.",
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
    automatedTranslationNoticeTitle: "تنبيه بشأن الترجمة الآلية",
    automatedTranslationNotice:
      "تم إنشاء هذه الترجمة آليًا. في حال وجود أي اختلاف أو تعارض، تسود النسخة الإنجليزية حصريًا وتُعد النسخة المعتمدة.",
    viewAuthoritativeEnglishVersion: "عرض النسخة الإنجليزية المعتمدة",
    returnToTranslatedVersion: "العودة إلى النسخة المترجمة",
    lastUpdatedLabel: "آخر تحديث بتاريخ",
    lastUpdatedDate: "2025/10/07 (السنة/الشهر/اليوم)",
    introduction: [
      {
        text: 'مرحبًا بك في Agora Citizen Network ("Agora")! تحكم هذه الشروط والأحكام ("الشروط") وصولك إلى منصة Agora واستخدامها، بما في ذلك موقعنا الإلكتروني وتطبيقات الهاتف المحمول والخدمات الأخرى (يُشار إليها إجمالاً باسم "الخدمات"). من خلال الوصول إلى الخدمات أو استخدامها، فإنك توافق على الالتزام بهذه الشروط. إذا كنت لا توافق، فلا يجوز لك الوصول إلى الخدمات أو استخدامها.',
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
                text: "Agora متاح فقط للمستخدمين الذين تبلغ أعمارهم 16 عامًا أو أكثر. باستخدام Agora، فإنك تؤكد أنك تستوفي متطلبات العمر هذه وأنك تجاوزت الحد الأدنى للعمر الذي تتطلبه قوانين بلد إقامتك للوصول إلى الخدمات واستخدامها.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: 'ليس مطلوبًا منك إنشاء حساب لتصفح Agora. ومع ذلك، للمشاركة في المناقشات والتفاعل مع المحتوى ("المحتوى")، قد تحتاج إلى التسجيل باستخدام إحدى الطرق التالية:',
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
                    text: "تسجيل الدخول عبر رقم الهاتف (تم التحقق من خلال رمز لمرة واحدة)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "قم بتسجيل الدخول عبر إثبات التشفير من تطبيقات التحقق التابعة لجهات خارجية (Rarimo، Zupass)، والتي تتحقق من هويتك باستخدام Zero-Knowledge Proofs (ZKP). تضمن هذه الطرق التحقق من هويتك مع الحفاظ على الخصوصية. تتلقى Agora فقط أدلة التشفير التي تؤكد التفرد والأهلية، ولا تتلقى أبدًا وثائق الهوية الأساسية أو معلومات التذكرة. مع العلم أنه لا يمكن التسجيل عن طريق ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: " إذا لم يكن عمرك 18 عامًا أو أكبر.",
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
                    text: "لقد تم تعليقك أو إزالتك من Agora.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "أنت محظور قانونًا من استخدام الخدمات في ولايتك القضائية.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "لا يمكنك إبرام عقد ملزم مع Agora، أو إذا كنت دون سن الرشد في ولايتك القضائية، إلا إذا قام الوصي القانوني بمراجعة هذه الشروط والموافقة عليها.",
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
                text: "تشرح سياسة خصوصية Agora كيفية جمع بياناتك الشخصية واستخدامها وحمايتها. باستخدام الخدمات، فإنك توافق على جمع ومعالجة معلوماتك كما هو موضح في سياسة الخصوصية. لمزيد من التفاصيل، قم بزيارة ",
              },
              {
                text: "سياسة الخصوصية Agora",
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
                text: "بموجب هذه الشروط، تمنحك Agora ترخيصًا غير حصري وغير قابل للتحويل وقابل للإلغاء لاستخدام الخدمات. لا يجوز لك:",
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
                    text: "استخدم Agora لنشر المعلومات الخاطئة أو خطاب الكراهية أو المضايقات.",
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
                    text: "الانخراط في أنشطة احتيالية أو عمليات احتيال أو ممارسات خادعة أو الترويج لها.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "توزيع أو الترويج لمحتوى جنسي صريح أو عنيف أو غير لائق.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "استخدم Agora لمطاردة الأفراد أو المجموعات أو ترهيبهم أو تهديدهم.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "محاولة التلاعب أو استغلال منصة Agora أو خوارزمياتها أو ميزاتها لتحقيق مكاسب شخصية أو تجارية.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "الانخراط في الأنشطة التي تشجع على إيذاء النفس أو الانتحار أو أي شكل من أشكال تعريض نفسك للخطر.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "انتهاك حقوق الملكية الفكرية، بما في ذلك التوزيع غير المصرح به للمواد المحمية بحقوق الطبع والنشر.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "ترخيص أو بيع أو نقل أو تعيين أو توزيع أو استضافة أو استغلال الخدمات أو المحتوى تجاريًا",
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
                    text: "استخدم الأدوات الآلية لكشط المحتوى أو استخراجه.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "انتحال شخصية مستخدم أو كيان أو مؤسسة أخرى.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "مشاركة أو توزيع البرامج الضارة أو محاولات التصيد أو المخططات الاحتيالية.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "انتهاك خصوصية المستخدمين الآخرين من خلال الكشف عن معلومات شخصية أو حساسة دون موافقة، بما في ذلك على سبيل المثال لا الحصر، مشاركة العناوين الشخصية أو أرقام الهواتف أو التفاصيل المالية أو أي اتصالات خاصة دون إذن صريح.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "تحتفظ Agora بالحق في تعديل الميزات أو إزالتها في أي وقت دون إشعار مسبق. ستخضع أي تحسينات أو تحديثات أو إضافات مستقبلية للخدمات لهذه الشروط، والتي قد يتم مراجعتها بشكل دوري. أنت تقر بأن Agora ليست مسؤولة تجاهك أو تجاه أي طرف ثالث عن أي تعديلات أو تعليق أو توقف للخدمات أو أي من مكوناتها.",
              },
            ],
          },
        ],
      },
      {
        heading: "4. المحتوى الخاص بك",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'قد تحتوي الخدمات على أنواع مختلفة من المحتوى، بما في ذلك النصوص والروابط والصور ومقاطع الفيديو والصوت والمواد الأخرى المقدمة من قبل المستخدمين ("المحتوى"). لا تضمن Agora دقة أو اكتمال أو موثوقية أي محتوى ولا تتحمل أي مسؤولية عنه.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "من خلال تقديم المحتوى، فإنك تؤكد أن لديك جميع الحقوق اللازمة لمشاركته وأنه لا ينتهك أي قوانين معمول بها أو حقوق الجهات الخارجية. أنت وحدك المسؤول عن المحتوى الخاص بك وأي عواقب تنشأ عن مشاركته على Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "باستخدام الخدمات، فإنك تحتفظ بملكية المحتوى الخاص بك ولكنك تمنح Agora ترخيصًا عالميًا وغير حصري وخالي من حقوق الملكية ودائم وقابل للترخيص من الباطن لتخزين المحتوى الخاص بك واستخدامه وتعديله وتوزيعه وعرضه لوظائف النظام الأساسي والامتثال والأغراض التشغيلية. يتضمن ذلك حق Agora في إتاحة المحتوى الخاص بك للمشاركة أو التوزيع أو التجميع أو النشر بواسطة شركاء خارجيين.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "تحتفظ Agora بالحق في إزالة المحتوى أو تقييده وفقًا لتقديرها إذا كان ينتهك هذه الشروط أو القوانين المعمول بها أو سياسات النظام الأساسي.",
              },
            ],
          },
        ],
      },
      {
        heading: "5. سياسات المحتوى والاعتدال",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "لا يجوز لك نشر المحتوى الذي:",
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
                    text: "يشجع على العنف أو الأنشطة غير القانونية.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "يحتوي على خطاب يحض على الكراهية أو مضايقات أو هجمات شخصية.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "ينشر معلومات مضللة أو محتوى متلاعبًا.",
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
                text: "تستخدم Agora نظامًا للإشراف على المحتوى يعتمد على تقارير المستخدم والكشف الآلي والرصد ",
              },
              {
                text: "إرشادات المجتمع",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: ". قد تتم إزالة المحتوى الذي ينتهك هذه الشروط وقد يواجه المخالفون المتكررون التعليق أو الحظر.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "للإبلاغ عن محتوى غير قانوني أو معالجة الاعتدال والمخاوف القانونية، يرجى التواصل معنا على ",
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
        heading: "6. محتوى وإعلانات الطرف الثالث",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'قد تحتوي Agora على روابط لمواقع ويب أو منتجات أو خدمات تابعة لجهات خارجية، والتي قد تتم مشاركتها من قبل المعلنين أو الشركاء أو الشركات التابعة أو المستخدمين الآخرين ("محتوى الطرف الثالث"). لا تتحكم Agora أو تؤيد أو تتحمل أي مسؤولية عن دقة أو شرعية أو موثوقية هذه المصادر الخارجية.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "إن الوصول إلى محتوى الطرف الثالث أو التعامل معه هو على مسؤوليتك الخاصة، ونحن نشجعك على مراجعة أي شروط أو سياسات أو أحكام ذات صلة قبل التفاعل مع مصادر خارجية أو إكمال المعاملات.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "قد تعرض Agora إعلانات أو محتوى مدعومًا. قد يتغير نوع الإعلانات واستهدافها وتكرارها، ونحن نحتفظ بالحق في وضع إعلانات فيما يتعلق بأي محتوى أو خدمات مقدمة على Agora. إن تفاعلاتك مع المحتوى أو الإعلانات المدعومة تكون على مسؤوليتك الخاصة فقط، ونحن لا نضمن دقة أو جودة أو شرعية أي منتجات أو خدمات معلن عنها.",
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
                text: "جميع حقوق الملكية الفكرية المرتبطة بـ Agora، بما في ذلك على سبيل المثال لا الحصر، براءات الاختراع والعلامات التجارية والأسماء التجارية وحقوق النشر والأسرار التجارية وبيانات الملكية والمعرفة والحقوق الأخلاقية وحقوق قاعدة البيانات وحقوق التصميم والخوارزميات والبرمجيات ورموز الكمبيوتر والواجهات المرئية وأي حقوق ملكية أخرى - سواء كانت مسجلة أو غير مسجلة - مملوكة أو مرخصة من قبل Agora. ويشمل ذلك أيضًا أي طلبات أو حقوق لتقديم طلب لتسجيل هذه الملكية الفكرية بموجب قوانين أي ولاية قضائية.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "يُمنع منعًا باتًا الاستخدام أو إعادة الإنتاج أو التعديل أو التوزيع أو الاستغلال غير المصرح به للملكية الفكرية الخاصة بـ Agora. يتضمن ذلك، على سبيل المثال لا الحصر، برامج الهندسة العكسية أو بيع المواد المملوكة أو استخدام أي محتوى خاص دون الحصول على إذن كتابي مسبق من Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "وأي انتهاك لحقوق الملكية الفكرية هذه قد يؤدي إلى اتخاذ إجراء قانوني. تحتفظ Agora بجميع الحقوق غير الممنوحة صراحةً بموجب هذه الشروط.",
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
                text: "يجوز لك إنهاء هذه الشروط في أي وقت ولأي سبب عن طريق حذف حسابك والتوقف عن استخدام جميع الخدمات. إذا توقفت عن استخدام الخدمات دون إلغاء تنشيط حسابك، فقد يتم إلغاء تنشيط حسابك بسبب عدم النشاط لفترة طويلة.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "ستظل الأقسام التالية سارية بعد أي إنهاء لهذه الشروط أو لحسابك:",
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
                    text: "4. المحتوى الخاص بك،",
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
                    text: "9. إخلاء المسؤولية وتقييد المسؤولية،",
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
                    text: "14. متنوعة.",
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
                    text: "إذا قمت بالتحقق من حسابك باستخدام Rarimo (التحقق من جواز السفر)، فيجب عليك إنشاء إثبات جديد يحتوي فقط على المُبطل (باستثناء الجنسية والجنس) قبل متابعة الحذف.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "إذا قمت بالتحقق من حسابك باستخدام رقم هاتف فقط، فيجب عليك إعادة التحقق من رقم هاتفك لتأكيد حذف الحساب وإكماله.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "عند النجاح، سيتم حذف حسابك خلال 30 يومًا.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "لحذف إثبات جواز السفر (إذا تم إدخال رقم الهاتف بالفعل) مع الاحتفاظ بحسابك:",
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
                    text: "قم بإنشاء دليل جديد باستخدام Rarimo:",
                    kind: "strong",
                  },
                  {
                    text: " ستحتاج إلى إنشاء إثبات تحقق جديد، ولكن هذه المرة سيحتوي فقط على مُبطلك وليس جنسيتك أو جنسك.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "تأكيد الحذف:",
                    kind: "strong",
                  },
                  {
                    text: " بمجرد التأكيد، سيتم حذف إثبات جواز السفر السابق الخاص بك، بما في ذلك الجنسية والجنس، نهائيًا.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "سيتم الاحتفاظ ببعض سجلات التشفير، حتى لو قمت بحذف حسابك، لضمان المساءلة:",
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
                    text: "إثبات المعرفة الصفرية (ZKP) المستخدم للحذف، والذي يحتوي فقط على بيانات الإلغاء والبيانات المشفرة (وليس الجنسية أو الجنس).",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "دليل شبكة التفويض التي يتحكم فيها المستخدم (UCAN) الذي يوقع ZKP هذا، للتحقق من الطلب من جهازك.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "إثبات UCAN يؤكد طلب الحذف، ويضمن معالجة الطلب بشكل صحيح.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "توجد سجلات التشفير هذه لتثبت لمدققي الطرف الثالث أن Agora لم تقم بمراقبة الحسابات أو البيانات ولكنها حذفت المعلومات فقط بناءً على طلب المستخدم. وهذا يضمن الشفافية والثقة في النظام.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "تحتفظ Agora بالحق في تعليق أو إنهاء الحسابات التي تنتهك هذه الشروط.",
              },
            ],
          },
        ],
      },
      {
        heading: "9. إخلاء المسؤولية وحدودها",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'يتم توفير الخدمات "كما هي" دون أي ضمانات من أي نوع. لا تقدم Agora أي تعهدات أو ضمانات من أي نوع، سواء كانت صريحة أو ضمنية أو قانونية أو غير ذلك، بما في ذلك على سبيل المثال لا الحصر ضمانات قابلية التسويق أو الملاءمة لغرض معين أو عدم الانتهاك أو توفر الخدمات.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "لا تضمن Agora أن الخدمات ستكون خالية من الأخطاء أو غير منقطعة أو آمنة أو أنه سيتم تصحيح العيوب. يتحمل المستخدمون جميع المخاطر المرتبطة باستخدام الخدمات.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "إلى أقصى حد يسمح به القانون، Agora ليست مسؤولة عن أي أضرار غير مباشرة أو عرضية أو تبعية أو عقابية أو خاصة تنشأ عن أو تتعلق باستخدامك للخدمات، سواء كانت مستندة إلى العقد أو الضرر أو المسؤولية الصارمة أو أي نظرية قانونية أخرى، حتى لو تم إخطار Agora بإمكانية حدوث مثل هذه الأضرار. ويشمل ذلك، على سبيل المثال لا الحصر، الأضرار الناجمة عن خسارة الأرباح أو فقدان البيانات أو الإصابة الشخصية أو تلف الممتلكات أو انقطاع الأعمال.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "لا تسمح بعض السلطات القضائية باستثناء أو تقييد بعض الأضرار، لذلك قد لا تنطبق بعض هذه القيود عليك.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "بينما تطبق Agora تقنية Zero-Knowledge Proof (ZKP) لتعزيز الخصوصية والأمان، يقر المستخدمون بأنه لا توجد تقنية معصومة من الخطأ. قد تكون هناك نقاط ضعف أو عيوب غير متوقعة في تنفيذ ZKP والتي قد تؤدي إلى الكشف غير المصرح به عن البيانات أو انتهاكات الخصوصية. لا تقدم Agora أي ضمانات فيما يتعلق بالأمان المطلق أو موثوقية ZKP ولا تتحمل أي مسؤولية عن أي عواقب غير مقصودة تنشأ عن استخدامه.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "يتم تشجيع المستخدمين على اتخاذ احتياطات إضافية، مثل استخدام أدوات إخفاء الهوية مثل Tor لإخفاء عنوان IP الخاص بهم، وتجنب مشاركة معلومات شخصية زائدة في كتاباتهم، والوعي بأساليب الكتابة والسمات المشتركة التي يمكن أن تكشف عن غير قصد عن هويتهم من خلال الارتباط بجواز سفرهم والإجراءات المسجلة الأخرى.",
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
                text: "باستثناء ما يحظره القانون، فإنك توافق على الدفاع عن Agora والشركات التابعة لها وتعويضها وحمايتها ومديريها ومسؤوليها وموظفيها ووكلائها ومقاوليها ومقدمي الخدمات الخارجيين والمرخصين من وضد أي مطالبات وطلبات والتزامات وأضرار وخسائر ونفقات (بما في ذلك الرسوم والتكاليف القانونية) الناشئة عن أو المتعلقة بما يلي:",
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
                    text: "انتهاكك لهذه الشروط؛",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "انتهاكك لأي قوانين أو لوائح معمول بها؛ أو",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "أي محتوى ترسله أو تنشره أو تشاركه على Agora.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "تحتفظ Agora بالحق في تولي السيطرة على الدفاع عن أي مسألة يُطلب منك تعويضنا عنها، وأنت توافق على التعاون الكامل مع دفاعنا عن هذه المطالبات. ستظل التزامات التعويض الخاصة بك سارية بعد أي إنهاء أو تعليق لاستخدامك لـ Agora وخدماتها.",
              },
            ],
          },
        ],
      },
      {
        heading: "11. قابلية الفصل",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "كلما كان ذلك ممكنًا، يجب تفسير أحكام هذه الشروط بطريقة تكون صالحة وقابلة للتنفيذ بموجب القانون الحاكم. ومع ذلك، إذا تبين أن واحدًا أو أكثر من أحكام هذه الشروط غير صالح أو غير قانوني أو غير قابل للتنفيذ، كليًا أو جزئيًا، فلن يتأثر باقي أي حكم من هذا القبيل وهذه الشروط وسيظل ساريًا بكامل القوة والتأثير كما لو أن هذا الحكم غير الصالح أو غير القانوني أو غير القابل للتنفيذ لم يرد هنا مطلقًا.",
              },
            ],
          },
        ],
      },
      {
        heading: "12. القانون الحاكم وحل النزاعات",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "تخضع هذه الشروط، بما في ذلك أي مسائل تتعلق بصلاحيتها أو تفسيرها أو تنفيذها أو أدائها أو إنهائها، بالإضافة إلى أي نزاعات تنشأ عن مطالبات الضرر أو التزامات ما قبل العقد أو المسؤولية خارج العقد، لقوانين فرنسا وتفسر وفقًا لها. لن يتم تفعيل أي خيار آخر لمبادئ القانون أو قواعد تنازع القوانين التي من شأنها أن تطبق قوانين أي ولاية قضائية أخرى غير فرنسا.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "نريد منك أن تتمتع بتجربة إيجابية على Agora. إذا كانت لديك أية مشكلات أو نزاعات، فإنك توافق على محاولة حلها معنا أولاً بشكل غير رسمي. يمكنك التواصل معنا بخصوص أي تعليقات أو مخاوف على ",
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
                text: "أي نزاعات لا يمكن حلها بشكل غير رسمي تخضع للاختصاص القضائي الحصري لمحاكم نويي سور سين.",
              },
            ],
          },
        ],
      },
      {
        heading: "13. التغييرات في هذه الشروط",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "يجوز لشركة Agora تحديث هذه الشروط من وقت لآخر لتعكس التغييرات في خدماتنا أو المتطلبات القانونية أو الاحتياجات التشغيلية الأخرى. إذا أجرينا تعديلات كبيرة، فسنقوم بإخطار المستخدمين من خلال الإشعارات أو اللافتات أو المطالبات داخل التطبيق التي تتطلب الإقرار قبل أن تدخل التغييرات حيز التنفيذ.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "من خلال الاستمرار في الوصول إلى Agora أو استخدامه بعد سريان الشروط المعدلة، فإنك توافق على الالتزام بالشروط المحدثة. إذا كنت لا توافق على التعديلات، فيجب عليك التوقف عن استخدام Agora قبل أن تصبح التغييرات سارية المفعول.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "نحن نشجع المستخدمين على مراجعة هذه الشروط بانتظام للبقاء على اطلاع بحقوقهم والتزاماتهم عند استخدام Agora.",
              },
            ],
          },
        ],
      },
      {
        heading: "14. متنوعة",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "تشكل هذه الشروط، إلى جانب سياسة الخصوصية، الاتفاقية الكاملة التي تحكم وصولك إلى Agora واستخدامه. لا يعتبر فشلنا في ممارسة أو إنفاذ أي حق أو حكم بموجب هذه الشروط تنازلاً عن هذا الحق أو الحكم.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "إذا تبين أن أي بند من هذه الشروط غير صالح أو غير قابل للتنفيذ، فسيتم تنفيذه إلى الحد الأقصى المسموح به، وتظل الأحكام المتبقية سارية المفعول والتأثير الكامل.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "لا يجوز لك التنازل عن أو نقل أي من حقوقك أو التزاماتك بموجب هذه الشروط دون موافقتنا المسبقة. ومع ذلك، فإننا نحتفظ بالحق في التنازل عن حقوقنا والتزاماتنا بحرية بموجب هذه الشروط دون قيود.",
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
                text: "للأسئلة أو المخاوف بشأن هذه الشروط، اتصل بنا على: ",
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
                text: "باستخدام Agora، فإنك تقر وتوافق على هذه الشروط وأي تعديلات مستقبلية.",
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
    termsOfService: "Términos de servicio",
    automatedTranslationNoticeTitle: "Aviso sobre traducción automática",
    automatedTranslationNotice:
      "Esta traducción se ha generado automáticamente. En caso de discrepancia, incoherencia o conflicto, prevalecerá exclusivamente la versión en inglés, que es la versión oficial.",
    viewAuthoritativeEnglishVersion: "Ver la versión oficial en inglés",
    returnToTranslatedVersion: "Volver a la versión traducida",
    lastUpdatedLabel: "Última actualización el",
    lastUpdatedDate: "2025/10/07 (AAAA/MM/DD)",
    introduction: [
      {
        text: '¡Bienvenido a Agora Citizen Network ("Agora")! Estos Términos y condiciones ("Términos") rigen su acceso y uso de la plataforma Agora, incluido nuestro sitio web, aplicaciones móviles y otros servicios (colectivamente, los "Servicios"). Al acceder o utilizar los Servicios, usted acepta estar sujeto a estos Términos. Si no está de acuerdo, no podrá acceder ni utilizar los Servicios.',
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
                text: "Agora solo está disponible para usuarios mayores de 16 años. Al utilizar Agora, usted confirma que cumple con este requisito de edad y que tiene más de la edad mínima requerida por las leyes de su país de residencia para acceder y utilizar los Servicios.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: 'No es necesario crear una cuenta para navegar por Agora. Sin embargo, para participar en debates e interactuar con el contenido ("Contenido"), es posible que deba registrarse utilizando uno de los siguientes métodos:',
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
                    text: "Inicie sesión mediante número de teléfono (verificado mediante un código de un solo uso)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Inicie sesión mediante prueba criptográfica desde aplicaciones de verificación de terceros (Rarimo, Zupass), que verifican su identidad mediante pruebas de conocimiento cero (ZKP). Estos métodos garantizan que su identidad sea validada manteniendo la privacidad. Agora recibe únicamente pruebas criptográficas que confirman la unicidad y la elegibilidad, nunca los documentos de identidad subyacentes o la información del ticket. Tenga en cuenta que no es posible registrarse a través de ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: " si no tiene 18 años o más.",
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
                    text: "Ha sido suspendido o eliminado de Agora.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Tiene prohibido legalmente utilizar los Servicios en su jurisdicción.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "No puede formar un contrato vinculante con Agora, o si es menor de edad en su jurisdicción, a menos que su tutor legal haya revisado y aceptado estos Términos.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        heading: "2. Política de Privacidad",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "La Política de Privacidad de Agora explica cómo recopilamos, utilizamos y protegemos sus datos personales. Al utilizar los Servicios, usted acepta la recopilación y el procesamiento de su información como se describe en la Política de Privacidad. Para más detalles, visite el ",
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
                text: "Sujeto a estos Términos, Agora le otorga una licencia no exclusiva, intransferible y revocable para utilizar los Servicios. No puede:",
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
                    text: "Utilice Agora para difundir información errónea, discursos de odio o acoso.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Involucrarse en actividades ilegales.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Participar en o promover actividades fraudulentas, estafas o prácticas engañosas.",
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
                    text: "Utilice Agora para acechar, intimidar o amenazar a personas o grupos.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Intentar manipular o explotar la plataforma, los algoritmos o las funciones de Agora para beneficio personal o comercial.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Participar en actividades que fomenten la autolesión, el suicidio o cualquier forma de peligro.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Violar los derechos de propiedad intelectual, incluida la distribución no autorizada de material protegido por derechos de autor.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Licenciar, vender, transferir, asignar, distribuir, alojar o explotar comercialmente de otro modo los Servicios o el Contenido",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Intentar hackear, alterar o aplicar ingeniería inversa a la infraestructura de Agora.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Utilice herramientas automatizadas para raspar o extraer contenido.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Hacerse pasar por otro usuario, entidad u organización.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Comparta o distribuya software malicioso, intentos de phishing o esquemas fraudulentos.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Violar la privacidad de otros usuarios al revelar información personal o confidencial sin consentimiento, lo que incluye, entre otros, compartir direcciones personales, números de teléfono, detalles financieros o cualquier comunicación privada sin permiso explícito.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora se reserva el derecho de modificar o eliminar funciones en cualquier momento sin previo aviso. Cualquier mejora, actualización o adición futura a los Servicios se regirá por estos Términos, que pueden revisarse periódicamente. Usted reconoce que Agora no es responsable ante usted ni ante ningún tercero por ninguna modificación, suspensión o discontinuación de los Servicios o cualquiera de sus componentes.",
              },
            ],
          },
        ],
      },
      {
        heading: "4. Su contenido",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'Los Servicios pueden contener varios tipos de contenido, incluidos texto, enlaces, imágenes, videos, audio y otros materiales enviados por los usuarios ("Contenido"). Agora no garantiza la exactitud, integridad o confiabilidad de ningún Contenido y no asume ninguna responsabilidad por el mismo.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Al enviar Contenido, usted confirma que tiene todos los derechos necesarios para compartirlo y que no viola ninguna ley aplicable ni derechos de terceros. Usted es el único responsable de su contenido y de las consecuencias que surjan al compartirlo en Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Al utilizar los Servicios, usted conserva la propiedad de su contenido, pero otorga a Agora una licencia mundial, no exclusiva, libre de regalías, perpetua y sublicenciable para almacenar, usar, modificar, distribuir y mostrar su contenido para fines operativos, de cumplimiento y de funcionalidad de la plataforma. Esto incluye el derecho de Agora a hacer que su Contenido esté disponible para su sindicación, distribución, agregación o publicación por parte de socios externos.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora se reserva el derecho de eliminar o restringir contenido a su discreción si viola estos Términos, las leyes aplicables o las políticas de la plataforma.",
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
                    text: "Promueve la violencia o actividades ilegales.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Contiene discursos de odio, acoso o ataques personales.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Difunde información errónea o contenido manipulador.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Viola los derechos de propiedad intelectual.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora emplea un sistema de moderación de contenidos basado en informes de usuarios, detección automatizada y ",
              },
              {
                text: "Pautas de la comunidad",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: ". El contenido que infrinja estos Términos puede eliminarse y los infractores reincidentes pueden enfrentar suspensión o prohibiciones.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Para denunciar contenido ilegal o abordar inquietudes legales y de moderación, comuníquese con nosotros en ",
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
        heading: "6. Contenido y anuncios de terceros",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'Agora puede contener enlaces a sitios web, productos o servicios de terceros, que pueden ser compartidos por anunciantes, socios, afiliados u otros usuarios ("Contenido de terceros"). Agora no controla, respalda ni asume ninguna responsabilidad por la exactitud, legalidad o confiabilidad de dichas fuentes externas.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Acceder o interactuar con Contenido de terceros es bajo su propio riesgo y le recomendamos que revise los términos, políticas o condiciones relevantes antes de interactuar con fuentes externas o completar transacciones.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora puede mostrar anuncios o contenido patrocinado. El tipo, la orientación y la frecuencia de los anuncios pueden cambiar, y nos reservamos el derecho de colocar anuncios en relación con cualquier contenido o servicio proporcionado en Agora. Sus interacciones con contenido patrocinado o anuncios son únicamente bajo su propio riesgo y no garantizamos la exactitud, calidad o legitimidad de ningún producto o servicio anunciado.",
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
                text: "Toda la propiedad intelectual asociada con Agora, incluidas, entre otras, patentes, marcas comerciales, nombres comerciales, derechos de autor, secretos comerciales, datos de propiedad, conocimientos, derechos morales, derechos de bases de datos, derechos de diseño, algoritmos, software, códigos informáticos, interfaces visuales y cualquier otro derecho de propiedad, ya sea registrado o no, son propiedad de Agora o tienen licencia de esta. Esto también incluye cualquier solicitud o derecho a solicitar el registro de dicha propiedad intelectual según las leyes de cualquier jurisdicción.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "El uso, reproducción, modificación, distribución o explotación no autorizada de la propiedad intelectual de Agora está estrictamente prohibido. Esto incluye, entre otros, software de ingeniería inversa, venta de materiales propietarios o uso de cualquier contenido propietario sin el permiso previo por escrito de Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Cualquier infracción de estos derechos de propiedad intelectual puede dar lugar a acciones legales. Agora se reserva todos los derechos no otorgados explícitamente en estos Términos.",
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
                text: "Puede rescindir estos Términos en cualquier momento y por cualquier motivo eliminando su Cuenta e interrumpiendo el uso de todos los Servicios. Si deja de utilizar los Servicios sin desactivar su Cuenta, su Cuenta puede desactivarse debido a una inactividad prolongada.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Las siguientes secciones sobrevivirán a cualquier terminación de estos Términos o de su Cuenta:",
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
                    text: "4. Su contenido,",
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
                    text: "9. Renuncias y limitación de responsabilidad,",
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
                    text: "14. Varios.",
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
                    text: "Si verificó su cuenta usando Rarimo (verificación de pasaporte), debe generar una nueva prueba que contenga solo el anulador (excluyendo nacionalidad y sexo) antes de proceder con la eliminación.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Si verificó su cuenta usando solo un número de teléfono, debe volver a verificar su número de teléfono para confirmar y completar la eliminación de la cuenta.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Si tiene éxito, su cuenta se eliminará dentro de los 30 días.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Para eliminar el comprobante del pasaporte (si ya se ingresó un número de teléfono) pero conservar su cuenta:",
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
                    text: "Genere una nueva prueba con Rarimo:",
                    kind: "strong",
                  },
                  {
                    text: " Deberá crear una prueba de verificación nueva, pero esta vez contendrá solo su anulador y no su nacionalidad o sexo.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Confirmar la eliminación:",
                    kind: "strong",
                  },
                  {
                    text: " Una vez confirmado, su prueba de pasaporte anterior, incluida la nacionalidad y el sexo, se eliminará permanentemente.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Algunos registros criptográficos se seguirán conservando, incluso si elimina su cuenta, para garantizar la responsabilidad:",
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
                    text: "La Prueba de Conocimiento Cero (ZKP) utilizada para la eliminación, que contiene únicamente el anulador y los datos criptográficos (no nacionalidad ni sexo).",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "La Red de Autorización Controlada por el Usuario (UCAN) comprobante que firma este ZKP, verificando la solicitud desde su dispositivo.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "La prueba UCAN que confirma la solicitud de eliminación, asegurando que la solicitud fue procesada correctamente.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Estos registros criptográficos existen para demostrar a los auditores externos que Agora no censuró cuentas o datos, sino que eliminó la información solo a pedido del usuario. Esto garantiza la transparencia y la confianza en el sistema.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora se reserva el derecho de suspender o cancelar cuentas que violen estos Términos.",
              },
            ],
          },
        ],
      },
      {
        heading:
          "9. Exenciones de responsabilidad y limitación de responsabilidad",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'Los Servicios se proporcionan "tal cual" sin garantías de ningún tipo. Agora no hace representaciones ni garantías de ningún tipo, ya sean expresas, implícitas, legales o de otro tipo, incluidas, entre otras, garantías de comerciabilidad, idoneidad para un propósito particular, no infracción o disponibilidad de los Servicios.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora no garantiza que los Servicios estarán libres de errores, serán ininterrumpidos, seguros o que se corregirán los defectos. Los usuarios asumen todos los riesgos asociados con el uso de los Servicios.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "En la máxima medida permitida por la ley, Agora no es responsable de ningún daño indirecto, incidental, consecuente, punitivo o especial que surja de o esté relacionado con su uso de los Servicios, ya sea basado en contrato, agravio, responsabilidad estricta o cualquier otra teoría legal, incluso si se ha advertido a Agora de la posibilidad de dichos daños. Esto incluye, entre otros, daños por lucro cesante, pérdida de datos, lesiones personales, daños a la propiedad o interrupción del negocio.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Algunas jurisdicciones no permiten la exclusión o limitación de ciertos daños, por lo que es posible que algunas de estas limitaciones no se apliquen a usted.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Si bien Agora implementa la tecnología Zero-Knowledge Proof (ZKP) para mejorar la privacidad y la seguridad, los usuarios reconocen que ninguna tecnología es infalible. Puede haber vulnerabilidades o fallas imprevistas en la implementación de ZKP que podrían conducir a una exposición no autorizada de datos o violaciones de la privacidad. Agora no ofrece garantías con respecto a la seguridad o confiabilidad absoluta de ZKP y no asume ninguna responsabilidad por las consecuencias no deseadas que surjan de su uso.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Se anima a los usuarios a tomar precauciones adicionales, como utilizar herramientas de anonimato como Tor para enmascarar su dirección IP, evitar compartir información personal excesiva en sus escritos y ser conscientes de los estilos de escritura y los atributos compartidos que podrían revelar inadvertidamente su identidad a través de la correlación con su pasaporte y otras acciones registradas.",
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
                text: "Excepto donde lo prohíba la ley, usted acepta defender, indemnizar y eximir de responsabilidad a Agora, sus afiliados y sus respectivos directores, funcionarios, empleados, agentes, contratistas, proveedores de servicios externos y licenciantes de y contra cualquier reclamo, demanda, responsabilidad, daño, pérdida y gasto (incluidos honorarios y costos legales) que surjan de o estén relacionados con:",
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
                    text: "su uso de Agora y sus Servicios;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "su violación de estos Términos;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "su violación de cualquier ley o reglamento aplicable; o",
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
                text: "Agora se reserva el derecho de asumir el control de la defensa de cualquier asunto por el cual usted deba indemnizarnos, y usted acepta cooperar plenamente con nuestra defensa de dichos reclamos. Sus obligaciones de indemnización sobrevivirán a cualquier terminación o suspensión de su uso de Agora y sus Servicios.",
              },
            ],
          },
        ],
      },
      {
        heading: "11. Divisibilidad",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Siempre que sea posible, las disposiciones de estos Términos se interpretarán de tal manera que sean válidas y ejecutables según la ley vigente. Sin embargo, si se determina que una o más disposiciones de estos Términos son inválidas, ilegales o inaplicables, en su totalidad o en parte, el resto de dicha disposición y de estos Términos no se verá afectado y continuará en pleno vigor y efecto como si dicha disposición inválida, ilegal o inaplicable nunca hubiera estado contenida en este documento.",
              },
            ],
          },
        ],
      },
      {
        heading: "12. Ley aplicable y resolución de disputas",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Estos Términos, incluidas cualquier cuestión relacionada con su validez, interpretación, cumplimiento, ejecución o terminación, así como cualquier disputa que surja de reclamos por agravios, obligaciones precontractuales o responsabilidad extracontractual, se regirán e interpretarán de conformidad con las leyes de Francia. No se dará efecto a ningún otro principio de elección de ley o norma de conflicto de leyes que aplicaría las leyes de cualquier jurisdicción que no sea Francia.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Queremos que tenga una experiencia positiva en Agora. Si tiene algún problema o disputa, acepta intentar primero resolverlo con nosotros de manera informal. Puede comunicarse con nosotros si tiene algún comentario o inquietud en ",
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
                text: "Cualquier disputa que no pueda resolverse informalmente estará sujeta a la jurisdicción exclusiva de los tribunales de Neuilly Sur Seine.",
              },
            ],
          },
        ],
      },
      {
        heading: "13. Cambios a estos Términos",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora puede actualizar estos Términos de vez en cuando para reflejar cambios en nuestros servicios, requisitos legales u otras necesidades operativas. Si realizamos modificaciones significativas, notificaremos a los usuarios a través de notificaciones en la aplicación, pancartas o mensajes que requieran reconocimiento antes de que los cambios entren en vigor.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Al continuar accediendo o utilizando Agora después de que los Términos revisados ​​entren en vigencia, usted acepta estar sujeto a los Términos actualizados. Si no está de acuerdo con las modificaciones, debe interrumpir el uso de Agora antes de que los cambios entren en vigor.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Alentamos a los usuarios a revisar estos Términos con regularidad para mantenerse informados sobre sus derechos y obligaciones al utilizar Agora.",
              },
            ],
          },
        ],
      },
      {
        heading: "14. Varios",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Estos Términos, junto con la Política de Privacidad, constituyen el acuerdo completo que rige su acceso y uso de Agora. Nuestra incapacidad para ejercer o hacer cumplir cualquier derecho o disposición bajo estos Términos no se considerará una renuncia a dicho derecho o disposición.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Si se determina que alguna disposición de estos Términos es inválida o inaplicable, se aplicará en la medida máxima permitida y las disposiciones restantes continuarán en pleno vigor y efecto.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "No puede ceder ni transferir ninguno de sus derechos u obligaciones en virtud de estos Términos sin nuestro consentimiento previo. Sin embargo, nos reservamos el derecho de ceder libremente nuestros derechos y obligaciones bajo estos Términos sin restricción.",
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
                text: "Si tiene preguntas o inquietudes sobre estos Términos, contáctenos en: ",
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
                text: "Al utilizar Agora, usted reconoce y acepta estos Términos y cualquier modificación futura.",
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
    automatedTranslationNoticeTitle: "اطلاعیه ترجمه خودکار",
    automatedTranslationNotice:
      "این ترجمه به‌صورت خودکار ایجاد شده است. در صورت هرگونه مغایرت، ناسازگاری یا تعارض، صرفاً نسخه انگلیسی ملاک و نسخه معتبر خواهد بود.",
    viewAuthoritativeEnglishVersion: "مشاهده نسخه معتبر انگلیسی",
    returnToTranslatedVersion: "بازگشت به نسخه ترجمه‌شده",
    lastUpdatedLabel: "آخرین به روز رسانی در",
    lastUpdatedDate: "2025/10/07 (سال/ماه/روز)",
    introduction: [
      {
        text: 'به Agora Citizen Network ("Agora") خوش آمدید! این شرایط و ضوابط ("شرایط") بر دسترسی و استفاده شما از پلت فرم Agora، از جمله وب سایت، برنامه های کاربردی تلفن همراه و سایر خدمات ما (در مجموع، "سرویس ها") حاکم است. با دسترسی یا استفاده از خدمات، موافقت می کنید که به این شرایط متعهد باشید. اگر موافق نیستید، نمی توانید به خدمات دسترسی داشته باشید یا از آن استفاده کنید.',
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
                text: "Agora فقط برای کاربران 16 سال یا بالاتر در دسترس است. با استفاده از Agora، تأیید می‌کنید که این شرط سنی را دارید و از حداقل سنی که قوانین کشور محل سکونت خود برای دسترسی و استفاده از خدمات لازم است، بالاتر هستید.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: 'برای مرور Agora نیازی به ایجاد حساب کاربری ندارید. با این حال، برای شرکت در بحث ها و تعامل با محتوا ("محتوا")، ممکن است لازم باشد با استفاده از یکی از روش های زیر ثبت نام کنید:',
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
                    text: "ورود از طریق شماره تلفن (تأیید شده از طریق کد یکبار مصرف)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "از طریق اثبات رمزنگاری از برنامه‌های تأیید شخص ثالث (Rarimo، Zupass)، که هویت شما را با استفاده از اثبات‌های دانش صفر (ZKP) تأیید می‌کنند، وارد شوید. این روش‌ها تضمین می‌کنند که هویت شما با حفظ حریم خصوصی تأیید می‌شود. Agora فقط مدارک رمزنگاری را دریافت می کند که منحصر به فرد بودن و واجد شرایط بودن را تأیید می کند، نه اسناد هویتی اساسی یا اطلاعات بلیط. توجه داشته باشید که امکان ثبت نام از طریق وجود ندارد ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: " اگر 18 سال یا بیشتر ندارید.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "شما نباید از خدمات استفاده کنید اگر:",
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
                    text: "شما به حالت تعلیق درآمده یا از Agora حذف شده اید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "شما از نظر قانونی از استفاده از خدمات در حوزه قضایی خود منع شده اید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "شما نمی توانید با Agora قرارداد الزام آور ببندید، یا اگر در حوزه قضایی خود زیر سن بلوغ هستید، مگر اینکه قیم قانونی شما این شرایط را بررسی کرده و با آن موافقت کرده باشد.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        heading: "2. سیاست حفظ حریم خصوصی",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "سیاست حفظ حریم خصوصی Agora نحوه جمع آوری، استفاده و محافظت از داده های شخصی شما را توضیح می دهد. با استفاده از خدمات، با جمع‌آوری و پردازش اطلاعات خود همانطور که در سیاست حفظ حریم خصوصی توضیح داده شده است، موافقت می‌کنید. برای جزئیات بیشتر، به سایت مراجعه کنید ",
              },
              {
                text: "سیاست حفظ حریم خصوصی Agora",
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
        heading: "3. استفاده شما از خدمات",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "با رعایت این شرایط، Agora مجوزی غیر انحصاری، غیرقابل انتقال و باطل برای استفاده از خدمات به شما اعطا می کند. شما ممکن است:",
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
                    text: "از Agora برای انتشار اطلاعات نادرست، سخنان مشوق تنفر یا آزار و اذیت استفاده کنید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "شرکت در فعالیت های غیرقانونی.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "درگیر شدن یا ترویج فعالیت های تقلبی، کلاهبرداری یا شیوه های فریبنده.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "محتوای جنسی صریح، خشونت‌آمیز یا نامناسب را توزیع یا تبلیغ کنید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "از Agora برای تعقیب، ارعاب یا تهدید افراد یا گروه ها استفاده کنید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "تلاش برای دستکاری یا سوء استفاده از پلتفرم، الگوریتم ها یا ویژگی های Agora برای منافع شخصی یا تجاری.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "در فعالیت‌هایی شرکت کنید که خودآزاری، خودکشی یا هر شکلی از به خطر انداختن را تشویق می‌کنند.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "نقض حقوق مالکیت معنوی، از جمله توزیع غیرمجاز مطالب دارای حق چاپ.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "مجوز، فروش، انتقال، واگذاری، توزیع، میزبانی یا بهره برداری تجاری از خدمات یا محتوا",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "تلاش برای هک کردن، مختل کردن، یا مهندسی معکوس زیرساخت Agora.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "از ابزارهای خودکار برای خراش دادن یا استخراج محتوا استفاده کنید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "جعل هویت کاربر، نهاد یا سازمان دیگری.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "به اشتراک گذاری یا توزیع نرم افزارهای مخرب، تلاش های فیشینگ یا طرح های تقلبی.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "با افشای اطلاعات شخصی یا حساس بدون رضایت، از جمله به اشتراک گذاری آدرس های شخصی، شماره تلفن، جزئیات مالی، یا هرگونه ارتباط خصوصی بدون اجازه صریح، حریم خصوصی سایر کاربران را نقض کنید.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora این حق را برای خود محفوظ می دارد که در هر زمان بدون اطلاع قبلی، ویژگی ها را تغییر داده یا حذف کند. هر گونه پیشرفت، به‌روزرسانی یا افزوده‌ای به سرویس‌ها در آینده تحت کنترل این شرایط خواهد بود که ممکن است به‌طور دوره‌ای بازنگری شوند. شما تصدیق می‌کنید که Agora در قبال شما یا هیچ شخص ثالثی مسئولیتی در قبال هرگونه تغییر، تعلیق یا قطع سرویس‌ها یا هر یک از اجزای آن ندارد.",
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
                text: 'سرویس‌ها ممکن است حاوی انواع مختلفی از محتوا، از جمله متن، پیوندها، تصاویر، ویدئوها، صدا و سایر مطالب ارسال شده توسط کاربران ("محتوا") باشد. Agora صحت، کامل بودن یا قابلیت اطمینان هیچ یک از مطالب را تضمین نمی کند و هیچ مسئولیتی در قبال آن بر عهده نمی گیرد.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "با ارسال محتوا، تأیید می‌کنید که تمام حقوق لازم برای اشتراک‌گذاری آن را دارید و هیچ‌یک از قوانین قابل اجرا یا حقوق شخص ثالث را نقض نمی‌کند. شما تنها مسئول محتوای خود و هرگونه عواقب ناشی از اشتراک گذاری آن در Agora هستید.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "با استفاده از خدمات، مالکیت محتوای خود را حفظ می کنید اما به Agora یک مجوز جهانی، غیر انحصاری، بدون حق امتیاز، دائمی و قابل مجوز فرعی برای ذخیره، استفاده، تغییر، توزیع و نمایش محتوای خود برای عملکرد پلت فرم، مطابقت و اهداف عملیاتی می دهید. این شامل حق Agora برای در دسترس قرار دادن محتوای شما برای توزیع، توزیع، تجمیع یا انتشار توسط شرکای شخص ثالث است.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora این حق را برای خود محفوظ می‌دارد که در صورت نقض این شرایط، قوانین قابل اجرا یا خط‌مشی‌های پلت فرم، محتوا را به صلاحدید خود حذف یا محدود کند.",
              },
            ],
          },
        ],
      },
      {
        heading: "5. محتوا و سیاست های اعتدال",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "شما نمی توانید مطالبی را ارسال کنید که:",
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
                    text: "خشونت یا فعالیت های غیرقانونی را ترویج می کند.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "حاوی سخنان نفرت انگیز، آزار و اذیت یا حملات شخصی است.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "اطلاعات نادرست یا محتوای دستکاری را منتشر می کند.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "حقوق مالکیت معنوی را نقض می کند.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora از یک سیستم تعدیل محتوا بر اساس گزارش های کاربر، تشخیص خودکار و ",
              },
              {
                text: "دستورالعمل های انجمن",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: ". محتوای ناقض این شرایط ممکن است حذف شود و متخلفان مکرر ممکن است با تعلیق یا ممنوعیت مواجه شوند.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "برای گزارش محتوای غیرقانونی یا رفع نگرانی‌های اعتدال و قانونی، لطفاً با ما تماس بگیرید ",
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
        heading: "6. محتوا و تبلیغات شخص ثالث",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'Agora ممکن است حاوی پیوندهایی به وب سایت ها، محصولات یا خدمات شخص ثالث باشد که ممکن است توسط تبلیغ کنندگان، شرکا، شرکت های وابسته یا سایر کاربران به اشتراک گذاشته شود ("محتوای شخص ثالث"). Agora هیچ گونه مسئولیتی در قبال صحت، قانونی بودن یا قابل اعتماد بودن چنین منابع خارجی را کنترل، تأیید یا بر عهده نمی گیرد.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "دسترسی یا درگیر شدن با محتوای شخص ثالث به عهده شماست و ما شما را تشویق می‌کنیم تا قبل از تعامل با منابع خارجی یا تکمیل تراکنش‌ها، هرگونه شرایط، خط‌مشی یا شرایط مرتبط را بررسی کنید.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora ممکن است تبلیغات یا محتوای حمایت شده را نمایش دهد. نوع، هدف گذاری و تعداد دفعات تبلیغات ممکن است تغییر کند، و ما این حق را برای خود محفوظ می داریم که در رابطه با هر گونه محتوا یا خدمات ارائه شده در Agora، تبلیغات را درج کنیم. تعامل شما با محتوای حمایت شده یا تبلیغات صرفاً به عهده خودتان است و ما صحت، کیفیت یا مشروعیت هیچ یک از محصولات یا خدمات تبلیغ شده را تضمین نمی کنیم.",
              },
            ],
          },
        ],
      },
      {
        heading: "7. مالکیت معنوی",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "تمام حقوق مالکیت معنوی مرتبط با Agora، از جمله اما نه محدود به اختراعات، علائم تجاری، نام‌های تجاری، حق تکثیر، اسرار تجاری، داده‌های اختصاصی، دانش فنی، حقوق معنوی، حقوق پایگاه داده، حقوق طراحی، الگوریتم‌ها، نرم‌افزار، کد رایانه، رابط‌های بصری و هر حق اختصاصی دیگر، اعم از ثبت‌شده یا ثبت‌نشده، متعلق به Agora است یا مجوز آن به Agora اعطا شده است. این موارد همچنین هرگونه درخواست یا حق درخواست ثبت چنین مالکیت معنوی را طبق قوانین هر حوزه قضایی شامل می‌شود.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "استفاده، بازتولید، اصلاح، توزیع یا بهره برداری غیرمجاز از مالکیت معنوی Agora اکیداً ممنوع است. این شامل، اما نه محدود به، نرم افزارهای مهندسی معکوس، فروش مواد اختصاصی یا استفاده از هر گونه محتوای اختصاصی بدون اجازه کتبی قبلی از Agora است.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "هرگونه نقض این حقوق مالکیت معنوی ممکن است منجر به پیگرد قانونی شود. Agora کلیه حقوقی را که به صراحت تحت این شرایط اعطا نشده است محفوظ می دارد.",
              },
            ],
          },
        ],
      },
      {
        heading: "8. خاتمه خدمات",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "شما می توانید این شرایط را در هر زمان و به هر دلیلی با حذف حساب خود و قطع استفاده از کلیه خدمات خاتمه دهید. اگر استفاده از خدمات را بدون غیرفعال کردن حساب خود متوقف کنید، ممکن است حساب شما به دلیل عدم فعالیت طولانی مدت غیرفعال شود.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "بخش‌های زیر در صورت فسخ این شرایط یا حساب شما باقی خواهند ماند:",
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
                    text: "3. استفاده شما از خدمات،",
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
                    text: "8. خاتمه خدمات،",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. سلب مسئولیت و مسئولیت محدودیت،",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "10. غرامت",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "14. متفرقه.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "چگونه اکانت خود را حذف کنیم:",
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
                    text: "اگر حساب خود را با استفاده از Rarimo (تأیید گذرنامه) تأیید کرده‌اید، باید قبل از ادامه حذف، یک مدرک جدید حاوی فقط باطل کننده (به استثنای ملیت و جنسیت) ایجاد کنید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "اگر حساب خود را فقط با استفاده از یک شماره تلفن تأیید کرده اید، برای تأیید و تکمیل حذف حساب، باید شماره تلفن خود را دوباره تأیید کنید.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "پس از موفقیت، حساب شما ظرف 30 روز حذف خواهد شد.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "برای حذف مدرک پاسپورت (اگر شماره تلفن قبلا وارد شده باشد) اما حساب خود را نگه دارید:",
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
                    text: "یک اثبات جدید با Rarimo ایجاد کنید:",
                    kind: "strong",
                  },
                  {
                    text: " شما باید یک مدرک تأیید جدید ایجاد کنید، اما این بار فقط حاوی ابطال کننده شما خواهد بود و نه ملیت یا جنسیت شما.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "حذف را تایید کنید:",
                    kind: "strong",
                  },
                  {
                    text: " پس از تایید، مدارک گذرنامه قبلی شما، از جمله ملیت و جنسیت، برای همیشه حذف خواهد شد.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "برخی از سوابق رمزنگاری همچنان حفظ خواهند شد، حتی اگر حساب خود را حذف کنید، برای اطمینان از پاسخگویی:",
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
                    text: "اثبات دانش صفر (ZKP) مورد استفاده برای حذف، که فقط حاوی اطلاعات باطل کننده و رمزنگاری (نه ملیت یا جنسیت) است.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "شبکه مجوز کنترل شده توسط کاربر (UCAN) اثبات می کند که این ZKP را امضا می کند و درخواست دستگاه شما را تأیید می کند.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "گواهی UCAN درخواست حذف را تأیید می کند و اطمینان می دهد که درخواست به درستی پردازش شده است.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "این سوابق رمزنگاری وجود دارد تا به حسابرسان شخص ثالث ثابت کند که Agora حساب‌ها یا داده‌ها را سانسور نکرده است، بلکه اطلاعات را فقط در صورت درخواست کاربر حذف کرده است. این امر شفافیت و اعتماد در سیستم را تضمین می کند.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora این حق را برای خود محفوظ می‌دارد که حساب‌هایی را که این شرایط را نقض می‌کنند، متوقف یا فسخ کند.",
              },
            ],
          },
        ],
      },
      {
        heading: "9. سلب مسئولیت و محدودیت مسئولیت",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'خدمات "همانطور که هست" بدون هیچ گونه ضمانتی ارائه می شود. Agora هیچ گونه نمایندگی یا ضمانت نامه ای، اعم از صریح، ضمنی، قانونی یا غیر آن، شامل اما نه محدود به ضمانت های تجاری بودن، مناسب بودن برای یک هدف خاص، عدم نقض یا در دسترس بودن خدمات ارائه نمی دهد.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora تضمین نمی‌کند که سرویس‌ها بدون خطا، بدون وقفه، ایمن باشند یا نقص‌ها اصلاح شوند. کاربران تمام خطرات مرتبط با استفاده از خدمات را به عهده می گیرند.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "تا حدی که قانون مجاز بداند، Agora مسئولیتی در قبال خسارات غیرمستقیم، اتفاقی، تبعی، مجازاتی یا خاص ناشی از یا مرتبط با استفاده شما از خدمات، اعم از قرارداد، تخلف، مسئولیت اکید یا هر نظریه حقوقی دیگر ندارد، حتی اگر Agora در مورد احتمال چنین آسیب‌هایی توصیه شده باشد. این شامل، اما نه محدود به، خسارات ناشی از سود از دست رفته، از دست دادن داده ها، آسیب های شخصی، آسیب اموال یا وقفه در تجارت است.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "برخی از حوزه‌های قضایی استثنا یا محدودیت برخی خسارت‌ها را مجاز نمی‌دانند، بنابراین برخی از این محدودیت‌ها ممکن است برای شما اعمال نشود.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "در حالی که Agora فناوری اثبات دانش صفر (ZKP) را برای افزایش حریم خصوصی و امنیت پیاده‌سازی می‌کند، کاربران اذعان دارند که هیچ فناوری خطاناپذیر نیست. ممکن است آسیب‌پذیری‌ها یا نقص‌های پیش‌بینی‌نشده‌ای در اجرای ZKP وجود داشته باشد که به طور بالقوه می‌تواند منجر به قرار گرفتن در معرض داده‌های غیرمجاز یا نقض حریم خصوصی شود. Agora هیچ تضمینی در مورد امنیت یا قابلیت اطمینان مطلق ZKP نمی دهد و هیچ مسئولیتی در قبال عواقب ناخواسته ناشی از استفاده از آن نمی پذیرد.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "به کاربران توصیه می شود اقدامات احتیاطی بیشتری انجام دهند، مانند استفاده از ابزارهای ناشناس مانند Tor برای پنهان کردن آدرس IP خود، اجتناب از به اشتراک گذاری اطلاعات شخصی بیش از حد در نوشته های خود، و توجه به سبک های نوشتن و ویژگی های مشترک که می تواند به طور ناخواسته هویت آنها را از طریق ارتباط با پاسپورت و سایر اقدامات ضبط شده نشان دهد.",
              },
            ],
          },
        ],
      },
      {
        heading: "10. غرامت",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "به جز مواردی که توسط قانون منع شده باشد، شما موافقت می کنید که از Agora بی ضرر، شرکت های وابسته به آن و مدیران مربوطه، افسران، کارکنان، نمایندگان، پیمانکاران، ارائه دهندگان خدمات شخص ثالث، و مجوز دهندگان از و علیه هرگونه ادعا، مطالبات، تعهدات، خسارات، زیان ها و هزینه های مربوط به آنها دفاع کنید، غرامت بدهید و نگه دارید.",
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
                    text: "استفاده شما از Agora و خدمات آن؛",
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
                    text: "نقض قوانین یا مقررات قابل اجرا توسط شما؛ یا",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "هر محتوایی که در Agora ارسال می کنید، پست می کنید یا به اشتراک می گذارید.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora این حق را برای خود محفوظ می دارد که کنترل دفاع از هر موضوعی را که به خاطر آن ملزم به پرداخت غرامت از ما هستید را به عهده بگیرد و شما موافقت می کنید که به طور کامل در دفاع از این ادعاها همکاری کنید. تعهدات پرداخت غرامت شما از هر گونه خاتمه یا تعلیق استفاده شما از Agora و خدمات آن باقی خواهد ماند.",
              },
            ],
          },
        ],
      },
      {
        heading: "11. قابلیت جداسازی",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "در صورت امکان، مفاد این شرایط باید به گونه ای تفسیر شود که بر اساس قانون حاکم معتبر و قابل اجرا باشد. با این حال، اگر یک یا چند مفاد این شرایط به طور کلی یا جزئی نامعتبر، غیرقانونی یا غیرقابل اجرا تشخیص داده شود، باقیمانده هر یک از این مقررات و این شرایط تحت تأثیر قرار نخواهد گرفت و به طور کامل به قوت خود باقی خواهد ماند، گویی که چنین مفاد نامعتبر، غیرقانونی یا غیرقابل اجرا هرگز در اینجا وجود نداشته است.",
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
                text: "این شرایط، از جمله مسائل مربوط به اعتبار، تفسیر، اجرا، اجرا، یا خاتمه آنها، و همچنین هر گونه اختلاف ناشی از ادعای جرم، تعهدات قبل از قرارداد، یا مسئولیت خارج از قرارداد، تحت کنترل و تفسیر خواهد بود که مطابق با قوانین فرانسه است. هیچ تأثیری به هیچ انتخاب دیگری از اصول قانون یا قواعد تضاد قوانینی که قوانین هر حوزه قضایی دیگری غیر از فرانسه را اعمال می کند، اعمال نمی شود.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "ما می خواهیم شما یک تجربه مثبت در Agora داشته باشید. اگر مشکل یا اختلافی دارید، موافقت می کنید که ابتدا سعی کنید آنها را به صورت غیررسمی با ما حل کنید. شما می توانید با هر گونه بازخورد یا نگرانی با ما تماس بگیرید ",
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
                text: "هرگونه اختلافی که به طور غیررسمی قابل حل نباشد، در صلاحیت انحصاری دادگاه های Neuilly Sur Seine خواهد بود.",
              },
            ],
          },
        ],
      },
      {
        heading: "13. تغییرات در این شرایط",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora ممکن است هر از چند گاهی این شرایط را به روز کند تا تغییرات در خدمات، الزامات قانونی یا سایر نیازهای عملیاتی ما را منعکس کند. اگر تغییرات قابل توجهی انجام دهیم، قبل از اعمال تغییرات، از طریق اعلان‌های درون‌برنامه، بنرها یا درخواست‌هایی که نیاز به تأیید دارند، کاربران را مطلع خواهیم کرد.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "با ادامه دسترسی یا استفاده از Agora پس از اعمال شرایط اصلاح شده، موافقت می کنید که به شرایط به روز شده متعهد باشید. اگر با تغییرات موافق نیستید، باید قبل از اعمال تغییرات، استفاده از Agora را متوقف کنید.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "ما کاربران را تشویق می کنیم که به طور منظم این شرایط را مرور کنند تا از حقوق و تعهدات خود در هنگام استفاده از Agora مطلع شوند.",
              },
            ],
          },
        ],
      },
      {
        heading: "14. متفرقه",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "این شرایط، همراه با سیاست حفظ حریم خصوصی، کل توافقنامه حاکم بر دسترسی و استفاده شما از Agora را تشکیل می دهد. عدم اعمال یا اجرای هر یک از حقوق یا مقررات تحت این شرایط به منزله چشم پوشی از چنین حق یا شرطی نیست.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "در صورتی که هر یک از مفاد این شرایط نامعتبر یا غیرقابل اجرا تشخیص داده شود، باید حداکثر تا حد مجاز اجرا شود و بقیه مفاد به قوت خود و اثر خود ادامه خواهند داد.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "شما نمی توانید هیچ یک از حقوق یا تعهدات خود را تحت این شرایط بدون رضایت قبلی ما واگذار یا انتقال دهید. با این حال، ما این حق را برای خود محفوظ می داریم که آزادانه حقوق و تعهدات خود را تحت این شرایط بدون محدودیت واگذار کنیم.",
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
                text: "برای سؤال یا نگرانی در مورد این شرایط، با ما تماس بگیرید: ",
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
                text: "با استفاده از Agora، شما این شرایط و هر گونه تغییر آتی را تأیید کرده و با آن موافقت می کنید.",
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
  fr: {
    termsOfService: "Conditions d'utilisation",
    automatedTranslationNoticeTitle:
      "Avis concernant la traduction automatique",
    automatedTranslationNotice:
      "Cette traduction a été générée automatiquement. En cas de divergence, incohérence ou conflit, seule la version anglaise prévaut et fait foi.",
    viewAuthoritativeEnglishVersion:
      "Consulter la version anglaise faisant foi",
    returnToTranslatedVersion: "Revenir à la version traduite",
    lastUpdatedLabel: "Dernière mise à jour le",
    lastUpdatedDate: "2025/10/07 (AAAA/MM/JJ)",
    introduction: [
      {
        text: "Bienvenue sur Agora Citizen Network (« Agora ») ! Les présentes Conditions générales (« Conditions ») régissent votre accès et votre utilisation de la plateforme Agora, y compris notre site Web, nos applications mobiles et autres services (collectivement, les « Services »). En accédant ou en utilisant les Services, vous acceptez d'être lié par ces Conditions. Si vous n'êtes pas d'accord, vous ne pouvez pas accéder ou utiliser les Services.",
      },
    ],
    sections: [
      {
        heading: "1. Votre accès aux services",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora n'est disponible que pour les utilisateurs âgés de 16 ans ou plus. En utilisant Agora, vous confirmez que vous remplissez cette condition d'âge et que vous avez dépassé l'âge minimum requis par les lois de votre pays de résidence pour accéder et utiliser les Services.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Vous n'êtes pas obligé de créer un compte pour parcourir Agora. Cependant, pour participer aux discussions et interagir avec le contenu (« Contenu »), vous devrez peut-être vous inscrire en utilisant l'une des méthodes suivantes :",
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
                    text: "Connectez-vous via un numéro de téléphone (vérifié via un code à usage unique)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Connectez-vous via une preuve cryptographique provenant d'applications de vérification tierces (Rarimo, Zupass), qui vérifient votre identité à l'aide de preuves à connaissance nulle (ZKP). Ces méthodes garantissent que votre identité est validée tout en préservant la confidentialité. Agora reçoit uniquement des preuves cryptographiques confirmant l'unicité et l'éligibilité, jamais les documents d'identité sous-jacents ou les informations sur le billet. Notez qu'il n'est pas possible de s'inscrire via ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: " si vous n'avez pas 18 ans ou plus.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Vous ne devez pas utiliser les Services si :",
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
                    text: "Vous avez été suspendu ou supprimé de Agora.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Il vous est légalement interdit d'utiliser les Services dans votre juridiction.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Vous ne pouvez pas conclure de contrat contraignant avec Agora, ou si vous n'avez pas atteint l'âge de la majorité dans votre juridiction, à moins que votre tuteur légal n'ait examiné et accepté ces conditions.",
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
                text: "La politique de confidentialité de Agora explique comment nous collectons, utilisons et protégeons vos données personnelles. En utilisant les Services, vous consentez à la collecte et au traitement de vos informations comme décrit dans la Politique de confidentialité. Pour plus de détails, visitez le ",
              },
              {
                text: "Politique de confidentialité de Agora",
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
        heading: "3. Votre utilisation des services",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Sous réserve des présentes Conditions, Agora vous accorde une licence non exclusive, non transférable et révocable pour utiliser les Services. Vous ne pouvez pas :",
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
                    text: "Utilisez Agora pour diffuser des informations erronées, des discours de haine ou du harcèlement.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Se livrer à des activités illégales.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Se livrer à ou promouvoir des activités frauduleuses, des escroqueries ou des pratiques trompeuses.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Distribuer ou promouvoir du contenu sexuellement explicite, violent ou autrement inapproprié.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Utilisez Agora pour traquer, intimider ou menacer des individus ou des groupes.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Tenter de manipuler ou d'exploiter la plateforme, les algorithmes ou les fonctionnalités de Agora à des fins personnelles ou commerciales.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Participez à des activités qui encouragent l’automutilation, le suicide ou toute forme de mise en danger.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Violer les droits de propriété intellectuelle, y compris la distribution non autorisée de matériel protégé par le droit d'auteur.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Licence, vendre, transférer, céder, distribuer, héberger ou exploiter commercialement de toute autre manière les services ou le contenu",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Tentative de piratage, de perturbation ou de rétro-ingénierie de l'infrastructure de Agora.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Utilisez des outils automatisés pour récupérer ou extraire du contenu.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Usurper l'identité d'un autre utilisateur, entité ou organisation.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Partagez ou distribuez des logiciels malveillants, des tentatives de phishing ou des stratagèmes frauduleux.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Violer la vie privée d'autres utilisateurs en divulguant des informations personnelles ou sensibles sans consentement, y compris, mais sans s'y limiter, en partageant des adresses personnelles, des numéros de téléphone, des détails financiers ou toute communication privée sans autorisation explicite.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora se réserve le droit de modifier ou de supprimer des fonctionnalités à tout moment et sans préavis. Toutes les améliorations, mises à jour ou ajouts futurs aux Services seront régis par les présentes Conditions, qui peuvent être révisées périodiquement. Vous reconnaissez que Agora n'est pas responsable envers vous ou tout tiers de toute modification, suspension ou interruption des Services ou de l'un de leurs composants.",
              },
            ],
          },
        ],
      },
      {
        heading: "4. Votre contenu",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Les Services peuvent contenir différents types de contenu, notamment du texte, des liens, des images, des vidéos, de l'audio et d'autres éléments soumis par les utilisateurs (« Contenu »). Agora ne garantit pas l’exactitude, l’exhaustivité ou la fiabilité de tout contenu et n’en assume aucune responsabilité.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "En soumettant du Contenu, vous confirmez que vous disposez de tous les droits nécessaires pour le partager et qu'il ne viole aucune loi applicable ni aucun droit de tiers. Vous êtes seul responsable de votre contenu et de toutes les conséquences découlant de son partage sur Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "En utilisant les Services, vous conservez la propriété de votre contenu mais accordez à Agora une licence mondiale, non exclusive, libre de droits, perpétuelle et pouvant faire l'objet d'une sous-licence pour stocker, utiliser, modifier, distribuer et afficher votre contenu à des fins de fonctionnalité, de conformité et d'exploitation de la plateforme. Cela inclut le droit pour Agora de rendre votre contenu disponible pour la syndication, la distribution, l'agrégation ou la publication par des partenaires tiers.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora se réserve le droit de supprimer ou de restreindre le contenu à sa discrétion s'il viole les présentes conditions, les lois applicables ou les politiques de la plateforme.",
              },
            ],
          },
        ],
      },
      {
        heading: "5. Politiques de contenu et de modération",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Vous ne pouvez pas publier de Contenu qui :",
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
                    text: "Favorise la violence ou les activités illégales.",
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
                    text: "Diffuse des informations erronées ou du contenu manipulateur.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Viole les droits de propriété intellectuelle.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora utilise un système de modération de contenu basé sur les rapports des utilisateurs, la détection automatisée et ",
              },
              {
                text: "Lignes directrices de la communauté",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: ". Le contenu violant ces conditions peut être supprimé et les récidivistes peuvent être suspendus ou bannis.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Pour signaler un contenu illégal ou répondre à des problèmes de modération et d'ordre juridique, veuillez nous contacter à ",
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
        heading: "6. Contenu et publicités de tiers",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora peut contenir des liens vers des sites Web, des produits ou des services tiers, qui peuvent être partagés par des annonceurs, des partenaires, des sociétés affiliées ou d'autres utilisateurs (« Contenu tiers »). Agora ne contrôle, n’approuve ni n’assume aucune responsabilité quant à l’exactitude, la légalité ou la fiabilité de ces sources externes.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "L'accès ou l'interaction avec le contenu tiers se fait à vos propres risques et nous vous encourageons à consulter tous les termes, politiques ou conditions pertinents avant d'interagir avec des sources externes ou d'effectuer des transactions.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora peut afficher des publicités ou du contenu sponsorisé. Le type, le ciblage et la fréquence des publicités peuvent changer, et nous nous réservons le droit de placer des publicités en relation avec tout contenu ou service fourni sur Agora. Vos interactions avec du contenu ou des publicités sponsorisés se font uniquement à vos propres risques et nous ne garantissons pas l'exactitude, la qualité ou la légitimité des produits ou services annoncés.",
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
                text: "Toute propriété intellectuelle associée à Agora, y compris, mais sans s'y limiter, les brevets, marques commerciales, noms commerciaux, droits d'auteur, secrets commerciaux, données exclusives, savoir-faire, droits moraux, droits de base de données, droits de conception, algorithmes, logiciels, codes informatiques, interfaces visuelles et tout autre droit de propriété, qu'il soit enregistré ou non, est la propriété ou sous licence de Agora. Cela inclut également toute demande ou droit de demander l'enregistrement d'une telle propriété intellectuelle en vertu des lois de toute juridiction.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "L'utilisation, la reproduction, la modification, la distribution ou l'exploitation non autorisée de la propriété intellectuelle de Agora est strictement interdite. Cela inclut, sans toutefois s'y limiter, l'ingénierie inverse des logiciels, la vente de matériel exclusif ou l'utilisation de tout contenu exclusif sans l'autorisation écrite préalable de Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Toute violation de ces droits de propriété intellectuelle pourra donner lieu à des poursuites judiciaires. Agora se réserve tous les droits non explicitement accordés en vertu des présentes Conditions.",
              },
            ],
          },
        ],
      },
      {
        heading: "8. Résiliation des prestations",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Vous pouvez résilier ces Conditions à tout moment et pour quelque raison que ce soit en supprimant votre compte et en cessant d'utiliser tous les services. Si vous arrêtez d'utiliser les Services sans désactiver votre Compte, votre Compte peut être désactivé en raison d'une inactivité prolongée.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Les sections suivantes survivront à toute résiliation des présentes Conditions ou de votre Compte :",
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
                    text: "4. Votre contenu,",
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
                    text: "9. Avis de non-responsabilité et limitation de responsabilité,",
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
                    text: "14. Divers.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Comment supprimer votre compte :",
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
                    text: "Si vous avez vérifié votre compte à l'aide de Rarimo (vérification du passeport), vous devez générer une nouvelle preuve contenant uniquement l'annuleur (hors nationalité et sexe) avant de procéder à la suppression.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Si vous avez vérifié votre compte en utilisant uniquement un numéro de téléphone, vous devez revérifier votre numéro de téléphone pour confirmer et terminer la suppression du compte.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "En cas de succès, votre compte sera supprimé dans les 30 jours.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Pour supprimer le justificatif du passeport (si un numéro de téléphone a déjà été renseigné) mais conserver votre compte :",
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
                    text: "Générez une nouvelle preuve avec Rarimo :",
                    kind: "strong",
                  },
                  {
                    text: " Vous devrez créer une nouvelle preuve de vérification, mais cette fois, elle contiendra uniquement votre annulateur et non votre nationalité ou votre sexe.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Confirmez la suppression :",
                    kind: "strong",
                  },
                  {
                    text: " Une fois confirmée, votre précédente preuve de passeport, y compris votre nationalité et votre sexe, sera définitivement supprimée.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Certains enregistrements cryptographiques seront toujours conservés, même si vous supprimez votre compte, pour garantir la responsabilité :",
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
                    text: "La preuve à connaissance nulle (ZKP) utilisée pour la suppression, qui contient uniquement l'annulateur et les données cryptographiques (pas de nationalité ni de sexe).",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "La preuve du réseau d'autorisation contrôlée par l'utilisateur (UCAN) qui signe ce ZKP, vérifiant la demande de votre appareil.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Le justificatif UCAN confirmant la demande de suppression, garantissant que la demande a été correctement traitée.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Ces enregistrements cryptographiques existent pour prouver aux auditeurs tiers que Agora n'a pas censuré les comptes ou les données, mais a plutôt supprimé les informations uniquement à la demande de l'utilisateur. Cela garantit la transparence et la confiance dans le système.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora se réserve le droit de suspendre ou de résilier les comptes qui violent les présentes Conditions.",
              },
            ],
          },
        ],
      },
      {
        heading:
          "9. Avis de non-responsabilité et limitation de responsabilité",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Les Services sont fournis « tels quels » sans garantie d'aucune sorte. Agora ne fait aucune déclaration ou garantie d'aucune sorte, qu'elle soit expresse, implicite, légale ou autre, y compris, mais sans s'y limiter, les garanties de qualité marchande, d'adéquation à un usage particulier, de non-contrefaçon ou de disponibilité des Services.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora ne garantit pas que les Services seront sans erreurs, ininterrompus, sécurisés ou que les défauts seront corrigés. Les Utilisateurs assument tous les risques liés à l'utilisation des Services.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Dans toute la mesure permise par la loi, Agora n'est pas responsable de tout dommage indirect, accessoire, consécutif, punitif ou spécial découlant de ou lié à votre utilisation des Services, qu'il soit basé sur un contrat, un délit, une responsabilité stricte ou toute autre théorie juridique, même si Agora a été informé de la possibilité de tels dommages. Cela inclut, sans s'y limiter, les dommages pour perte de profits, perte de données, blessures corporelles, dommages matériels ou interruption d'activité.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Certaines juridictions n'autorisent pas l'exclusion ou la limitation de certains dommages, de sorte que certaines de ces limitations peuvent ne pas s'appliquer à vous.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Alors que Agora met en œuvre la technologie Zero-Knowledge Proof (ZKP) pour améliorer la confidentialité et la sécurité, les utilisateurs reconnaissent qu'aucune technologie n'est infaillible. Il peut y avoir des vulnérabilités ou des défauts imprévus dans la mise en œuvre de ZKP qui pourraient potentiellement conduire à une exposition non autorisée de données ou à des violations de la vie privée. Agora ne donne aucune garantie concernant la sécurité ou la fiabilité absolue de ZKP et n'assume aucune responsabilité pour les conséquences imprévues découlant de son utilisation.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Les utilisateurs sont encouragés à prendre des précautions supplémentaires, comme utiliser des outils d'anonymat comme Tor pour masquer leur adresse IP, éviter de partager trop d'informations personnelles dans leurs écrits et être attentifs aux styles d'écriture et aux attributs partagés qui pourraient révéler par inadvertance leur identité par corrélation avec leur passeport et d'autres actions enregistrées.",
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
                text: "Sauf là où la loi l'interdit, vous acceptez de défendre, d'indemniser et de dégager de toute responsabilité Agora, ses sociétés affiliées et leurs administrateurs, dirigeants, employés, agents, sous-traitants, prestataires de services tiers et concédants de licence respectifs contre toute réclamation, demande, responsabilité, dommage, perte et dépense (y compris les frais et frais juridiques) découlant de ou liés à :",
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
                    text: "votre utilisation de Agora et de ses services ;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "votre violation de ces Conditions ;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "votre violation de toute loi ou réglementation applicable ; ou",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "tout contenu que vous soumettez, publiez ou partagez sur Agora.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora se réserve le droit d'assumer le contrôle de la défense de toute affaire pour laquelle vous êtes tenu de nous indemniser, et vous acceptez de coopérer pleinement avec notre défense face à de telles réclamations. Vos obligations d'indemnisation survivront à toute résiliation ou suspension de votre utilisation de Agora et de ses services.",
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
                text: "Dans la mesure du possible, les dispositions des présentes Conditions doivent être interprétées de manière à être valides et exécutoires en vertu de la loi en vigueur. Cependant, si une ou plusieurs dispositions des présentes Conditions s'avèrent invalides, illégales ou inapplicables, en tout ou en partie, le reste de cette disposition et des présentes Conditions ne seront pas affectés et resteront pleinement en vigueur comme si une telle disposition invalide, illégale ou inapplicable n'avait jamais été contenue dans les présentes.",
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
                text: "Les présentes Conditions, y compris toutes les questions liées à leur validité, leur interprétation, leur application, leur exécution ou leur résiliation, ainsi que tout litige découlant de réclamations délictuelles, d'obligations précontractuelles ou de responsabilité extracontractuelle, seront régies et interprétées conformément aux lois de la France. Aucun effet ne sera donné aux autres principes de choix de lois ou règles de conflit de lois qui appliqueraient les lois d’une juridiction autre que la France.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Nous voulons que vous ayez une expérience positive sur Agora. Si vous avez des problèmes ou des litiges, vous acceptez de tenter d'abord de les résoudre avec nous de manière informelle. Vous pouvez nous contacter pour tout commentaire ou préoccupation à ",
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
                text: "Tous les litiges qui ne pourraient être résolus à l’amiable seront soumis à la compétence exclusive des tribunaux de Neuilly Sur Seine.",
              },
            ],
          },
        ],
      },
      {
        heading: "13. Modifications de ces Conditions",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora peut mettre à jour ces Conditions de temps à autre pour refléter les changements dans nos services, les exigences légales ou d'autres besoins opérationnels. Si nous apportons des modifications importantes, nous informerons les utilisateurs via des notifications dans l'application, des bannières ou des invites nécessitant un accusé de réception avant que les modifications prennent effet.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "En continuant à accéder ou à utiliser Agora après l'entrée en vigueur des Conditions révisées, vous acceptez d'être lié par les Conditions mises à jour. Si vous n'acceptez pas les modifications, vous devez cesser d'utiliser Agora avant que les modifications n'entrent en vigueur.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Nous encourageons les utilisateurs à consulter régulièrement ces Conditions pour rester informés de leurs droits et obligations lorsqu'ils utilisent Agora.",
              },
            ],
          },
        ],
      },
      {
        heading: "14. Divers",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Ces conditions, ainsi que la politique de confidentialité, constituent l'intégralité de l'accord régissant votre accès et votre utilisation de Agora. Notre incapacité à exercer ou à appliquer un droit ou une disposition en vertu des présentes Conditions ne sera pas considérée comme une renonciation à ce droit ou à cette disposition.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Si une disposition des présentes Conditions s’avère invalide ou inapplicable, elle sera appliquée dans toute la mesure permise, et les dispositions restantes resteront pleinement en vigueur.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Vous ne pouvez céder ou transférer aucun de vos droits ou obligations en vertu des présentes Conditions sans notre consentement préalable. Cependant, nous nous réservons le droit de céder librement nos droits et obligations en vertu des présentes Conditions sans restriction.",
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
                text: "Pour toute question ou préoccupation concernant ces conditions, contactez-nous à : ",
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
                text: "En utilisant Agora, vous reconnaissez et acceptez ces conditions et toute modification future.",
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
    termsOfService: "תנאים והגבלות",
    automatedTranslationNoticeTitle: "הודעה בדבר תרגום אוטומטי",
    automatedTranslationNotice:
      "תרגום זה נוצר באופן אוטומטי. במקרה של אי-התאמה, סתירה או מחלוקת, הנוסח באנגלית בלבד יגבר ויהיה הנוסח המחייב.",
    viewAuthoritativeEnglishVersion: "הצגת הנוסח האנגלי המחייב",
    returnToTranslatedVersion: "חזרה לנוסח המתורגם",
    lastUpdatedLabel: "עודכן לאחרונה ב",
    lastUpdatedDate: "2025/10/07 (שנה/חודש/יום)",
    introduction: [
      {
        text: 'ברוכים הבאים ל-Agora Citizen Network ("Agora")! תנאים והגבלות אלה ("תנאים") מסדירים את הגישה והשימוש שלך בפלטפורמת Agora, לרבות האתר שלנו, האפליקציות לנייד ושירותים אחרים (יחד, "השירותים"). על ידי גישה או שימוש בשירותים, אתה מסכים להיות כפוף לתנאים אלה. אם אינך מסכים, אינך רשאי לגשת לשירותים או להשתמש בהם.',
      },
    ],
    sections: [
      {
        heading: "1. הגישה שלך לשירותים",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora זמין רק למשתמשים בני 16 ומעלה. על ידי שימוש ב-Agora, אתה מאשר שאתה עומד בדרישת גיל זו ושאתה מעל הגיל המינימלי הנדרש על פי חוקי מדינת המגורים שלך כדי לגשת לשירותים ולהשתמש בהם.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: 'אינך נדרש ליצור חשבון כדי לגלוש ב-Agora. עם זאת, כדי להשתתף בדיונים וליצור אינטראקציה עם תוכן ("תוכן"), ייתכן שיהיה עליך להירשם באחת מהשיטות הבאות:',
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
                    text: "כניסה באמצעות מספר טלפון (מאומת באמצעות קוד חד פעמי)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "התחבר באמצעות הוכחה קריפטוגרפית מאפליקציות אימות של צד שלישי (Rarimo, Zupass), המאמתות את זהותך באמצעות הוכחות אפס ידע (ZKP). שיטות אלו מבטיחות שהזהות שלך מאומתת תוך שמירה על פרטיות. Agora מקבל רק הוכחות קריפטוגרפיות המאשרות את הייחודיות והזכאות, לעולם לא את מסמכי הזהות הבסיסיים או פרטי הכרטיסים. שימו לב שלא ניתן להירשם דרך ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: " אם אתה לא בן 18 ומעלה.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "אין להשתמש בשירותים אם:",
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
                    text: "הושעת או הוצאת מ-Agora.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "חל איסור חוקי להשתמש בשירותים בתחום השיפוט שלך.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "אינך יכול ליצור חוזה מחייב עם Agora, או אם אתה מתחת לגיל הבגרות בתחום השיפוט שלך, אלא אם האפוטרופוס החוקי שלך בדק והסכים לתנאים אלה.",
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
                text: "מדיניות הפרטיות של Agora מסבירה כיצד אנו אוספים, משתמשים ומגנים על הנתונים האישיים שלך. על ידי שימוש בשירותים, אתה מסכים לאיסוף ועיבוד המידע שלך כמתואר במדיניות הפרטיות. לפרטים נוספים, בקר באתר ",
              },
              {
                text: "Agora מדיניות הפרטיות",
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
        heading: "3. השימוש שלך בשירותים",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "בכפוף לתנאים אלה, Agora מעניקה לך רישיון לא בלעדי, בלתי ניתן להעברה, שניתן לביטול לשימוש בשירותים. ייתכן שלא:",
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
                    text: "השתמש ב-Agora כדי להפיץ מידע מוטעה, דברי שטנה או הטרדה.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "לעסוק בפעילויות לא חוקיות.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "לעסוק או לקדם פעילויות הונאה, הונאות או שיטות הונאה.",
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
                    text: "השתמש ב-Agora כדי לעקוב, להפחיד או לאיים על יחידים או קבוצות.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "ניסיון לתמרן או לנצל את הפלטפורמה, האלגוריתמים או התכונות של Agora למטרות רווח אישי או מסחרי.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "עסוק בפעילויות המעודדות פגיעה עצמית, התאבדות או כל צורה של סכנה.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "הפרת זכויות קניין רוחני, לרבות הפצה לא מורשית של חומר המוגן בזכויות יוצרים.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "לתת רישיון, למכור, להעביר, להקצות, להפיץ, לארח או לנצל באופן מסחרי את השירותים או התוכן",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "נסה לפרוץ, לשבש או להנדס לאחור את התשתית של Agora.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "השתמש בכלים אוטומטיים כדי לגרד או לחלץ תוכן.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "התחזות למשתמש אחר, ישות או ארגון אחר.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "שתף או הפץ תוכנות זדוניות, ניסיונות דיוג או תוכניות הונאה.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "הפרת פרטיותם של משתמשים אחרים על ידי חשיפת מידע אישי או רגיש ללא הסכמה, לרבות אך לא רק שיתוף כתובות אישיות, מספרי טלפון, פרטים פיננסיים או כל תקשורת פרטית ללא רשות מפורשת.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora שומרת לעצמה את הזכות לשנות או להסיר תכונות בכל עת ללא הודעה מוקדמת. כל שיפורים, עדכונים או תוספות עתידיים לשירותים יהיו כפופים לתנאים אלה, אשר עשויים להשתנות מעת לעת. אתה מאשר כי Agora אינה אחראית כלפיך או כלפי צד שלישי כלשהו בגין כל שינויים, השעיות או הפסקות של השירותים או כל אחד ממרכיביהם.",
              },
            ],
          },
        ],
      },
      {
        heading: "4. התוכן שלך",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'השירותים עשויים להכיל סוגים שונים של תוכן, לרבות טקסט, קישורים, תמונות, סרטונים, אודיו וחומרים אחרים שנשלחו על ידי המשתמשים ("תוכן"). Agora אינה מבטיחה את הדיוק, השלמות או המהימנות של כל תוכן ואינה נושאת באחריות לגביו.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "על ידי שליחת תוכן, אתה מאשר שיש לך את כל הזכויות הדרושות כדי לשתף אותו וכי הוא אינו מפר חוקים או זכויות של צד שלישי כלשהם. אתה האחראי הבלעדי לתוכן שלך ולכל ההשלכות הנובעות משיתוףו ב-Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "על ידי שימוש בשירותים, אתה שומר בעלות על התוכן שלך אך מעניק ל-Agora רישיון כלל עולמי, לא בלעדי, ללא תמלוגים, תמידי וניתן לרישיון משנה לאחסן, להשתמש, לשנות, להפיץ ולהציג את התוכן שלך למטרות פונקציונליות, תאימות ותפעול של הפלטפורמה. זה כולל את הזכות של Agora להפוך את התוכן שלך לזמין להפצה, הפצה, צבירה או פרסום על ידי שותפים של צד שלישי.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora שומרת לעצמה את הזכות להסיר או להגביל תוכן לפי שיקול דעתה אם הוא מפר את התנאים הללו, החוקים החלים או מדיניות הפלטפורמה.",
              },
            ],
          },
        ],
      },
      {
        heading: "5. מדיניות תוכן והתנהלות",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "אינך רשאי לפרסם תוכן ש:",
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
                    text: "מקדם אלימות או פעילויות לא חוקיות.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "מכיל דברי שטנה, הטרדה או התקפות אישיות.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "מפיץ מידע שגוי או תוכן מניפולטיבי.",
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
                text: "Agora מעסיקה מערכת ניהול תוכן המבוססת על דוחות משתמשים, זיהוי אוטומטי ו ",
              },
              {
                text: "הנחיות הקהילה",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: ". תוכן המפר תנאים אלה עשוי להיות מוסר ועבריינים חוזרים עלולים לעמוד בפני השעיה או איסורים.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "כדי לדווח על תוכן לא חוקי או להתייחס למתינות ולחששות משפטיים, אנא פנה אלינו בכתובת ",
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
        heading: "6. תוכן ופרסומות של צד שלישי",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'Agora עשויה להכיל קישורים לאתרי אינטרנט, מוצרים או שירותים של צד שלישי, אשר עשויים להיות משותפים על ידי מפרסמים, שותפים, שותפים עצמאיים או משתמשים אחרים ("תוכן צד שלישי"). Agora אינה שולטת, תומכת או נוטלת אחריות כלשהי על הדיוק, החוקיות או המהימנות של מקורות חיצוניים כאלה.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "הגישה לתוכן של צד שלישי או התקשרות אליו היא באחריותך בלבד ואנו ממליצים לך לעיין בתנאים, מדיניות או תנאים רלוונטיים לפני אינטראקציה עם מקורות חיצוניים או השלמת עסקאות.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora עשויה להציג פרסומות או תוכן ממומן. סוג, מיקוד ותדירות הפרסומות עשויים להשתנות, ואנו שומרים לעצמנו את הזכות לפרסם פרסומות בקשר לכל תוכן או שירות הניתנים ב-Agora. האינטראקציות שלך עם תוכן ממומן או פרסומות הן באחריותך בלבד, ואיננו מבטיחים את הדיוק, האיכות או הלגיטימיות של כל מוצר או שירות שפורסמו.",
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
                text: "כל הקניין הרוחני הקשור ל-Agora, לרבות אך לא רק פטנטים, סימני מסחר, שמות מסחריים, זכויות יוצרים, סודות מסחריים, נתונים קנייניים, ידע, זכויות מוסריות, זכויות במאגרי מידע, זכויות עיצוב, אלגוריתמים, תוכנה, קוד מחשב, ממשקים חזותיים וכל זכות קניינית אחרת, בין אם נרשמה ובין אם לאו, נמצא בבעלות Agora או ניתן לה ברישיון. הדבר כולל גם כל בקשה או זכות להגיש בקשה לרישום קניין רוחני כאמור לפי דיני כל תחום שיפוט.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "שימוש בלתי מורשה, שכפול, שינוי, הפצה או ניצול של הקניין הרוחני של Agora אסור בהחלט. זה כולל, בין היתר, תוכנה להנדסה לאחור, מכירת חומרים קנייניים או שימוש בתוכן קנייני כלשהו ללא אישור מראש ובכתב מ-Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "כל הפרה של זכויות קניין רוחני אלה עלולה להוביל לתביעה משפטית. Agora שומרת לעצמה את כל הזכויות שלא ניתנו במפורש במסגרת תנאים אלה.",
              },
            ],
          },
        ],
      },
      {
        heading: "8. הפסקת השירותים",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "אתה רשאי לסיים תנאים אלה בכל עת ומכל סיבה על ידי מחיקת חשבונך והפסקת השימוש בכל השירותים. אם תפסיק להשתמש בשירותים מבלי לבטל את הפעלת חשבונך, ייתכן שהחשבון שלך יושבת עקב חוסר פעילות ממושך.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "הסעיפים הבאים ישרדו כל סיום של תנאים אלה או של חשבונך:",
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
                    text: "3. השימוש שלך בשירותים,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "4. התוכן שלך,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "8. הפסקת השירותים,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. כתבי ויתור ואחריות הגבלה,",
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
                    text: "14. שונות.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "כיצד למחוק את החשבון שלך:",
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
                    text: "אם אימתת את חשבונך באמצעות Rarimo (אימות דרכון), עליך ליצור הוכחה חדשה המכילה רק את המבטל (לא כולל לאום ומין) לפני שתמשיך עם המחיקה.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "אם אימתת את חשבונך באמצעות מספר טלפון בלבד, עליך לאמת מחדש את מספר הטלפון שלך כדי לאשר ולהשלים את מחיקת החשבון.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "לאחר הצלחה, חשבונך יימחק תוך 30 יום.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "כדי למחוק את הוכחת הדרכון (אם כבר הוזן מספר טלפון) אך שמור את החשבון שלך:",
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
                    text: "צור הוכחה חדשה עם Rarimo:",
                    kind: "strong",
                  },
                  {
                    text: " תצטרך ליצור הוכחת אימות חדשה, אבל הפעם היא תכיל רק את המבטל שלך ולא את הלאום או המין שלך.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "אשר את המחיקה:",
                    kind: "strong",
                  },
                  {
                    text: " לאחר אישור, הוכחת הדרכון הקודמת שלך, כולל אזרחות ומין, תימחק לצמיתות.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "כמה רשומות קריפטוגרפיות עדיין יישמרו, גם אם תמחק את חשבונך, כדי להבטיח אחריות:",
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
                    text: "הוכחת אפס ידע (ZKP) המשמשת למחיקה, המכילה רק את הנתונים המבטלים והצפנה (לא לאום או מין).",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "הוכחת רשת הרשאות מבוקרת משתמש (UCAN) החותמת על ZKP זה, המאמתת את הבקשה מהמכשיר שלך.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "ההוכחה UCAN המאשרת את בקשת המחיקה, המבטיחה שהבקשה טופלה כהלכה.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "רשומות קריפטוגרפיות אלו קיימות כדי להוכיח למבקרים של צד שלישי ש-Agora לא צנזרה חשבונות או נתונים אלא מחק את המידע רק לפי בקשת המשתמש. זה מבטיח שקיפות ואמון במערכת.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora שומרת לעצמה את הזכות להשעות או לסיים חשבונות המפרים תנאים אלה.",
              },
            ],
          },
        ],
      },
      {
        heading: "9. כתבי ויתור והגבלת אחריות",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'השירותים ניתנים "כמות שהם" ללא אחריות מכל סוג שהוא. Agora אינה מציגה מצגים או אחריות מכל סוג, בין אם מפורשת, משתמעת, סטטוטורית או אחרת, לרבות אך לא רק אחריות של סחירות, התאמה למטרה מסוימת, אי-הפרה או זמינות של השירותים.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora אינה מתחייבת שהשירותים יהיו נקיים מטעויות, ללא הפרעות, מאובטחים או שפגמים יתוקנו. המשתמשים לוקחים על עצמם את כל הסיכונים הכרוכים בשימוש בשירותים.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "במידה המרבית המותרת בחוק, Agora אינה אחראית לכל נזק עקיף, מקרי, תוצאתי, עונשי או מיוחד הנובע או קשור לשימוש שלך בשירותים, בין אם מבוסס על חוזה, עוולה, אחריות קפדנית או כל תיאוריה משפטית אחרת, גם אם ל-Agora הודע על האפשרות של נזקים כאלה. זה כולל, בין היתר, פיצויים בגין אובדן רווחים, אובדן נתונים, פגיעה אישית, נזק לרכוש או הפרעה עסקית.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "תחומי שיפוט מסוימים אינם מאפשרים החרגה או הגבלה של נזקים מסוימים, ולכן ייתכן שחלק מהמגבלות אלו לא חלות עליך.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "בעוד Agora מיישמת טכנולוגיית Zero-Knowledge Proof (ZKP) כדי לשפר את הפרטיות והאבטחה, המשתמשים מכירים בכך ששום טכנולוגיה אינה ניתנת לטעייה. ייתכנו פגיעויות או פגמים בלתי צפויים ביישום ZKP שעלולים להוביל לחשיפה לא מורשית של נתונים או להפרות פרטיות. Agora אינה מתחייבת לגבי האבטחה או האמינות המוחלטת של ZKP ואינה נושאת באחריות לכל תוצאה בלתי מכוונת הנובעת מהשימוש בה.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "מומלץ למשתמשים לנקוט באמצעי זהירות נוספים, כגון שימוש בכלי אנונימיות כמו Tor כדי להסוות את כתובת ה-IP שלהם, הימנעות משיתוף מידע אישי מוגזם בכתיבתם, ותשומת לב לסגנונות כתיבה ותכונות משותפות שעלולים לחשוף בטעות את זהותם באמצעות מתאם עם הדרכון שלהם ופעולות מוקלטות אחרות.",
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
                text: "למעט במקומות האסורים על פי חוק, אתה מסכים להגן, לשפות ולחזק את Agora, החברות המסונפות שלה, והדירקטורים, נושאי המשרה, העובדים, הסוכנים, הקבלנים, נותני השירותים של צד שלישי ומעניקי הרישיונות בהתאמה, מפני ונגד כל תביעה, דרישה, חבות, נזקים, הפסדים והוצאות הקשורות להוצאות משפטיות (כולל או עלויות):",
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
                    text: "השימוש שלך ב-Agora ובשירותיה;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "הפרתך של תנאים אלה;",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "הפרתך של כל חוקים או תקנות החלים; אוֹ",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "כל תוכן שאתה שולח, מפרסם או משתף ב-Agora.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora שומרת לעצמה את הזכות לקבל את השליטה בהגנה על כל עניין שבגינו אתה נדרש לשפות אותנו, ואתה מסכים לשתף פעולה באופן מלא עם ההגנה שלנו על תביעות כאלה. התחייבויות השיפוי שלך ישרדו כל סיום או השעיה של השימוש שלך ב-Agora ובשירותיה.",
              },
            ],
          },
        ],
      },
      {
        heading: "11. ניתוק",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "במידת האפשר, הוראות תנאים אלה יתפרשו באופן שיהיו תקפים וניתנים לאכיפה על פי החוק החל. עם זאת, אם תנאי אחד או יותר של תנאים אלה יימצאו כבלתי חוקיים, בלתי חוקיים או בלתי ניתנים לאכיפה, כולם או חלקם, שאר כל הוראה כזו ושל תנאים אלה לא יושפעו וימשיכו בתוקף ובתוקף כאילו הוראה כזו לא חוקית, בלתי חוקית או בלתי אכיפה מעולם לא הייתה כלולה כאן.",
              },
            ],
          },
        ],
      },
      {
        heading: "12. חוק חל ויישוב סכסוכים",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "תנאים אלה, לרבות כל נושא הקשור לתוקפם, פרשנותם, אכיפה, ביצועם או סיומם, וכן כל מחלוקת הנובעת מתביעות נזיקין, התחייבויות טרום חוזיות או אחריות חוץ חוזית, יהיו כפופים לחוקי צרפת ויתפרשו בהתאם. לא תינתן השפעה לכל עקרונות בחירה אחרים של חוק או כללי ניגוד חוק שיחילו את החוקים של כל תחום שיפוט מלבד צרפת.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "אנו רוצים שתהיה לך חוויה חיובית ב-Agora. אם יש לך בעיות או מחלוקות, אתה מסכים לנסות תחילה לפתור אותן איתנו באופן לא פורמלי. אתה יכול לפנות אלינו עם כל משוב או דאגה בכתובת ",
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
                text: "כל מחלוקת שלא ניתנת לפתרון פורמלית תהיה כפופה לסמכות השיפוט הבלעדית של בתי המשפט של Neuilly Sur Seine.",
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
                text: "Agora עשויה לעדכן תנאים אלה מעת לעת כדי לשקף שינויים בשירותים שלנו, בדרישות החוקיות או בצרכים תפעוליים אחרים. אם נבצע שינויים משמעותיים, נודיע למשתמשים באמצעות התראות בתוך האפליקציה, באנרים או הנחיות הדורשות אישור לפני שהשינויים ייכנסו לתוקף.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "על ידי המשך גישה או שימוש ב-Agora לאחר שהתנאים המתוקנים ייכנסו לתוקף, אתה מסכים להיות מחויב לתנאים המעודכנים. אם אינך מסכים לשינויים, עליך להפסיק את השימוש שלך ב-Agora לפני שהשינויים ייכנסו לתוקף.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "אנו ממליצים למשתמשים לעיין בתנאים אלה באופן קבוע כדי להישאר מעודכנים לגבי זכויותיהם וחובותיהם בעת השימוש ב-Agora.",
              },
            ],
          },
        ],
      },
      {
        heading: "14. שונות",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "תנאים אלה, יחד עם מדיניות הפרטיות, מהווים את ההסכם המלא המסדיר את הגישה והשימוש שלך ב-Agora. אי מימוש או אכיפה של כל זכות או הוראה לפי תנאים אלה לא ייחשב כוויתור על זכות או הוראה כאמור.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "אם הוראה כלשהי בתנאים אלה תימצא בלתי חוקית או בלתי ניתנת לאכיפה, היא תיאכף במידה המרבית המותרת, ושאר ההוראות ימשיכו בתוקף ובתוקף.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "אינך רשאי להמחות או להעביר אף אחת מהזכויות או התחייבויותיך לפי תנאים אלה ללא הסכמתנו מראש. עם זאת, אנו שומרים לעצמנו את הזכות להקצות באופן חופשי את הזכויות והחובות שלנו על פי תנאים אלה ללא הגבלה.",
              },
            ],
          },
        ],
      },
      {
        heading: "15. פרטי התקשרות",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "לשאלות או חששות בנוגע לתנאים אלה, צור איתנו קשר בכתובת: ",
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
                text: "על ידי שימוש ב-Agora, אתה מאשר ומסכים לתנאים אלה ולכל שינוי עתידי.",
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
    automatedTranslationNoticeTitle: "自動翻訳に関する注意",
    automatedTranslationNotice:
      "この翻訳は自動生成されたものです。相違、不一致または矛盾がある場合は、英語版のみが優先され、正式な版となります。",
    viewAuthoritativeEnglishVersion: "正式な英語版を表示",
    returnToTranslatedVersion: "翻訳版に戻る",
    lastUpdatedLabel: "最終更新日",
    lastUpdatedDate: "2025/10/07（年/月/日）",
    introduction: [
      {
        text: "Agora Citizen Network (「Agora」) へようこそ!これらの利用規約 (「規約」) は、当社の Web サイト、モバイル アプリケーション、その他のサービス (総称して「サービス」) を含む、Agora プラットフォームへのアクセスおよび使用を規定します。サービスにアクセスまたは使用することにより、お客様は本規約に拘束されることに同意したものとみなされます。同意しない場合は、サービスにアクセスしたり、サービスを使用したりすることはできません。",
      },
    ],
    sections: [
      {
        heading: "1. サービスへのアクセス",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora は 16 歳以上のユーザーのみが利用できます。 Agora を使用すると、この年齢要件を満たしていること、およびサービスにアクセスして使用するために居住国の法律で要求される最低年齢を超えていることを確認したことになります。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora を閲覧するためにアカウントを作成する必要はありません。ただし、ディスカッションに参加し、コンテンツ (「コンテンツ」) と対話するには、次のいずれかの方法を使用して登録する必要がある場合があります。",
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
                    text: "電話番号によるログイン（ワンタイムコードで認証）",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "サードパーティ検証アプリ (Rarimo、Zupass) からの暗号証明を介してログインします。このアプリは、ゼロ知識証明 (ZKP) を使用して本人確認を行います。これらの方法により、プライバシーを維持しながら ID が確実に検証されます。 Agora は、一意性と適格性を確認する暗号証明のみを受け取り、基礎となる身分証明書やチケット情報は決して受け取りません。からは登録できないので注意してください ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: " 18歳以上でない場合。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "次の場合はサービスを使用してはなりません。",
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
                    text: "あなたは Agora から一時停止または削除されました。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "お客様の管轄区域では、サービスを使用することは法的に禁止されています。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "法的保護者が本規約を確認して同意しない限り、お客様が Agora と拘束力のある契約を結ぶことはできません。また、お客様が管轄区域内で成人年齢に達していない場合も同様です。",
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
                text: "Agora のプライバシー ポリシーでは、当社がお客様の個人データをどのように収集、使用、保護するかについて説明しています。サービスを使用することにより、お客様はプライバシー ポリシーに記載されているとおりにお客様の情報が収集および処理されることに同意したものとみなされます。詳細については、次のサイトを参照してください。 ",
              },
              {
                text: "Agora プライバシー ポリシー",
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
        heading: "3. お客様によるサービスの利用",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本規約に従い、Agora は、サービスを使用するための非独占的、譲渡不可、取消可能なライセンスをお客様に付与します。次のことは禁止されています:",
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
                    text: "Agora を使用して、誤った情報、ヘイトスピーチ、嫌がらせを広めてください。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "違法行為に従事する。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "詐欺行為、詐欺、または欺瞞的な行為に関与したり、それらを促進したりすること。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "露骨な性的、暴力的、または不適切なコンテンツを配布または宣伝する。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Agora を使用して、個人またはグループをストーキング、脅迫、または脅迫します。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "個人的または商業的利益を目的として、Agora のプラットフォーム、アルゴリズム、または機能を操作または悪用しようと試みる。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "自傷行為、自殺、またはあらゆる形態の危険を助長する活動に従事すること。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "著作権で保護された素材の無許可配布を含む、知的財産権の侵害。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "サービスまたはコンテンツのライセンス供与、販売、譲渡、譲渡、配布、ホスト、またはその他の商業的利用",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Agora のインフラストラクチャをハッキング、破壊、またはリバース エンジニアリングしようとします。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "自動ツールを使用してコンテンツをスクレイピングまたは抽出します。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "別のユーザー、エンティティ、または組織になりすます。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "悪意のあるソフトウェア、フィッシングの試み、または詐欺的な計画を共有または配布する。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "同意なしに個人情報や機密情報を開示することにより、他のユーザーのプライバシーを侵害すること。これには、明示的な許可なしに個人の住所、電話番号、財務情報、またはプライベートな通信を共有することが含まれますが、これらに限定されません。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora は、予告なくいつでも機能を変更または削除する権利を保有します。サービスに対する将来の機能拡張、更新、または追加には、本規約が適用され、定期的に改訂される場合があります。お客様は、Agora が、本サービスまたはそのコンポーネントの変更、一時停止、または中止について、お客様または第三者に対して責任を負わないことを承認するものとします。",
              },
            ],
          },
        ],
      },
      {
        heading: "4.あなたのコンテンツ",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本サービスには、テキスト、リンク、画像、ビデオ、オーディオ、およびユーザーが送信したその他の素材を含む、さまざまな種類のコンテンツ (「コンテンツ」) が含まれる場合があります。 Agora は、コンテンツの正確性、完全性、信頼性を保証せず、一切の責任を負いません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "コンテンツを送信することにより、コンテンツを共有するために必要なすべての権利を有しており、適用される法律や第三者の権利を侵害していないことを確認したことになります。ご自身のコンテンツと、それを Agora で共有することで生じる結果については、お客様が単独で責任を負います。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "本サービスを使用することにより、お客様はご自身のコンテンツの所有権を保持しますが、プラットフォームの機能、コンプライアンス、および運用目的でお客様のコンテンツを保存、使用、変更、配布、表示するための世界的、非独占的、ロイヤルティフリー、永久かつサブライセンス可能なライセンスを Agora に付与します。これには、Agora がお客様のコンテンツをサードパーティ パートナーによるシンジケーション、配布、集約、または出版に利用できるようにする権利が含まれます。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora は、コンテンツが本規約、適用される法律、またはプラットフォーム ポリシーに違反する場合、その裁量でコンテンツを削除または制限する権利を留保します。",
              },
            ],
          },
        ],
      },
      {
        heading: "5. コンテンツとモデレーションのポリシー",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "次のようなコンテンツを投稿することはできません。",
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
                    text: "暴力や違法行為を助長するもの。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "ヘイトスピーチ、ハラスメント、個人攻撃が含まれます。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "誤った情報や操作的なコンテンツを広めます。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "知的財産権を侵害します。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora は、ユーザーレポート、自動検出、および ",
              },
              {
                text: "コミュニティガイドライン",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: "。これらの規約に違反するコンテンツは削除される場合があり、違反を繰り返す場合は停止または禁止に処される場合があります。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "違法なコンテンツを報告したり、モデレーションや法的問題に対処したりするには、次のアドレスまでご連絡ください。 ",
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
        heading: "6. 第三者のコンテンツと広告",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora には、広告主、パートナー、関連会社、または他のユーザーによって共有される第三者の Web サイト、製品、またはサービスへのリンクが含まれる場合があります (「第三者コンテンツ」)。 Agora は、そのような外部情報源の正確性、合法性、または信頼性について管理、承認、または責任を負うことはありません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "サードパーティのコンテンツへのアクセスまたは関与はお客様自身の責任で行われます。外部ソースとのやり取りや取引の完了前に、関連する規約、ポリシー、または条件を確認することをお勧めします。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora は、広告またはスポンサー付きコンテンツを表示する場合があります。広告の種類、ターゲティング、および頻度は変更される場合があり、当社は、Agora で提供されるコンテンツまたはサービスに関連して広告を掲載する権利を留保します。スポンサー付きのコンテンツまたは広告とのやり取りは、お客様ご自身の責任で行うものとし、当社は、宣伝された製品またはサービスの正確性、品質、正当性を保証しません。",
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
                text: "特許、商標、商号、著作権、企業秘密、専有データ、ノウハウ、著作者人格権、データベース権、意匠権、アルゴリズム、ソフトウェア、コンピュータ コード、ビジュアル インターフェイス、およびその他の所有権（登録済みか未登録かを問わず）を含むがこれらに限定されない、Agora に関連するすべての知的財産は、Agora が所有またはライセンスを付与されています。これには、管轄区域の法律に基づいてかかる知的財産の登録を申請するための申請または権利も含まれます。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora の知的財産の不正使用、複製、変更、配布、または悪用は固く禁じられています。これには、Agora からの事前の書面による許可なしに、ソフトウェアのリバース エンジニアリング、専有マテリアルの販売、または専有コンテンツの使用が含まれますが、これらに限定されません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "これらの知的財産権を侵害した場合、法的措置が講じられる可能性があります。 Agora は、本規約に基づいて明示的に付与されていないすべての権利を留保します。",
              },
            ],
          },
        ],
      },
      {
        heading: "8. サービスの終了",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "お客様は、アカウントを削除し、すべてのサービスの使用を中止することにより、いつでも理由を問わず本規約を終了できます。アカウントを非アクティブ化せずにサービスの使用を停止した場合、長期間非アクティブな状態が続いたためにアカウントが非アクティブ化される場合があります。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "以下のセクションは、本規約またはアカウントの終了後も存続します。",
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
                    text: "3. お客様によるサービスの使用、",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "4.あなたのコンテンツ、",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "8. サービスの終了",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. 免責事項および制限責任、",
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
                    text: "14. その他。",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "アカウントを削除する方法:",
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
                    text: "Rarimo (パスポート認証) を使用してアカウントを認証した場合は、削除を続行する前に、無効化文字 (国籍と性別を除く) のみを含む新しい証明を生成する必要があります。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "電話番号のみを使用してアカウントを認証した場合は、電話番号を再認証して確認し、アカウントの削除を完了する必要があります。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "成功すると、アカウントは 30 日以内に削除されます。",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "パスポート証明を削除するには (電話番号がすでに入力されている場合)、アカウントは保持します。",
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
                    text: "Rarimo を使用して新しいプルーフを生成します。",
                    kind: "strong",
                  },
                  {
                    text: " 新しい検証証明を作成する必要がありますが、今回は無効化する文字のみが含まれ、国籍や性別は含まれません。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "削除を確認します。",
                    kind: "strong",
                  },
                  {
                    text: " 確認が完了すると、国籍と性別を含む以前のパスポート証明は完全に削除されます。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "アカウントを削除した場合でも、説明責任を確保するために、一部の暗号記録は引き続き保持されます。",
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
                    text: "削除に使用されるゼロ知識証明 (ZKP)。これには無効化子と暗号化データ (国籍や性別は含まれません) のみが含まれます。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "この ZKP に署名し、デバイスからのリクエストを検証する User Controlled Authorization Network (UCAN) 証明。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "UCAN 証明は削除リクエストを確認し、リクエストが正しく処理されたことを保証します。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "これらの暗号記録は、Agora がアカウントやデータを検閲しておらず、ユーザーの要求に応じてのみ情報を削除したことを第三者の監査人に証明するために存在します。これにより、システムの透明性と信頼性が確保されます。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora は、本規約に違反したアカウントを一時停止または終了する権利を留保します。",
              },
            ],
          },
        ],
      },
      {
        heading: "9. 免責事項と責任の制限",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "サービスは「現状のまま」提供され、いかなる種類の保証もありません。 Agora は、明示的、黙示的、法的またはその他を問わず、商品性、特定の目的への適合性、権利侵害のないこと、またはサービスの可用性の保証を含むがこれらに限定されない、いかなる種類の表明または保証も行いません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora は、サービスにエラーがないこと、中断がないこと、安全であること、または欠陥が修正されることを保証しません。ユーザーは、サービスの使用に関連するすべてのリスクを負います。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "法律で認められる最大限の範囲で、Agora は、契約、不法行為、厳格責任、またはその他の法理論に基づくかどうかにかかわらず、お客様による本サービスの使用に起因または関連して生じる間接的、付随的、結果的、懲罰的または特別な損害については、たとえ Agora がそのような損害の可能性について知らされていたとしても、責任を負いません。これには、逸失利益、データの損失、人身傷害、物的損害、または事業の中断による損害が含まれますが、これらに限定されません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "一部の管轄区域では、特定の損害の除外または制限が認められていないため、これらの制限の一部がお客様に適用されない場合があります。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora はプライバシーとセキュリティを強化するためにゼロ知識証明 (ZKP) テクノロジーを実装していますが、ユーザーは、確実なテクノロジーはないことを認識しています。 ZKP の実装には予期せぬ脆弱性や欠陥が存在し、不正なデータ漏洩やプライバシー侵害につながる可能性があります。 Agora は、ZKP の絶対的な安全性または信頼性についていかなる保証もせず、その使用から生じるいかなる予期せぬ結果についても責任を負いません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "ユーザーには、Tor などの匿名性ツールを使用して自分の IP アドレスをマスクすること、文章の中で過剰な個人情報を共有することを避けること、パスポートやその他の記録された行動との相関関係によって意図せずに身元が明らかになる可能性のある書き方や共有属性に注意することなど、追加の予防措置を講じることが推奨されます。",
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
                text: "法律で禁止されている場合を除き、お客様は、Agora、その関連会社、およびそれぞれの取締役、役員、従業員、代理店、請負業者、サードパーティのサービスプロバイダー、およびライセンサーを、以下に起因または関連して生じるあらゆる請求、要求、責任、損害、損失および費用 (弁護士費用および費用を含む) から防御し、補償し、免責することに同意するものとします。",
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
                    text: "Agora とそのサービスの使用。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "本規約への違反。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "適用される法律または規制への違反。または",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Agora で送信、投稿、または共有するコンテンツ。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora は、お客様が当社を補償する必要があるあらゆる事項の弁護を主導する権利を留保し、お客様はかかる請求に対する当社の弁護に全面的に協力することに同意します。お客様の補償義務は、Agora およびそのサービスの使用が終了または一時停止された後も存続します。",
              },
            ],
          },
        ],
      },
      {
        heading: "11. 可分性",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "可能な限り、本規約の規定は、準拠法に基づいて有効かつ執行可能となるように解釈されるものとします。ただし、本規約の 1 つ以上の条項の全部または一部が無効、違法、または法的強制力がないことが判明した場合でも、当該条項および本規約の残りの部分は影響を受けず、そのような無効、違法、または法的強制力のない条項が本規約に含まれていないかのように完全に有効に存続します。",
              },
            ],
          },
        ],
      },
      {
        heading: "12. 準拠法と紛争解決",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本規約は、その有効性、解釈、施行、履行、終了に関する問題、および不法行為請求、契約前の義務、または契約外責任から生じるあらゆる紛争を含め、フランスの法律に準拠し、フランスの法律に従って解釈されるものとします。フランス以外の法域の法律を適用する他の法の選択原則または法の抵触規則は、いかなる効果も与えられないものとします。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora でポジティブな体験をしていただきたいと考えています。問題や紛争がある場合は、まず当社と非公式に解決を試みることに同意するものとします。フィードバックや懸念がある場合は、次のアドレスまでご連絡ください。 ",
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
                text: "非公式に解決できない紛争は、ヌイイ シュル セーヌの裁判所の専属管轄権に従うものとします。",
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
                text: "Agora は、当社のサービス、法的要件、またはその他の運営上のニーズの変更を反映するために、本規約を随時更新することがあります。大幅な変更を行った場合は、アプリ内通知、バナー、または変更が有効になる前に承認を求めるプロンプトを通じてユーザーに通知します。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "改訂された規約の発効後も引き続き Agora にアクセスまたは使用することにより、更新された規約に拘束されることに同意したものとみなされます。変更に同意しない場合は、変更が有効になる前に Agora の使用を中止する必要があります。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora を使用する際には、ユーザーが本規約を定期的に確認し、権利と義務について常に最新の情報を把握することをお勧めします。",
              },
            ],
          },
        ],
      },
      {
        heading: "14. その他",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "これらの規約は、プライバシー ポリシーとともに、Agora へのアクセスと使用を管理する完全な合意を構成します。当社が本規約に基づく権利または条項を行使または強制しなかったとしても、かかる権利または条項の放棄とはみなされません。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "本規約のいずれかの条項が無効または執行不能であると判明した場合、その条項は許容される最大限の範囲で執行されるものとし、残りの条項は引き続き完全に効力を有するものとします。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "当社の事前の同意なしに、本規約に基づく権利または義務を譲渡または移転することはできません。ただし、当社は、本規約に基づく権利および義務を制限なく自由に譲渡する権利を留保します。",
              },
            ],
          },
        ],
      },
      {
        heading: "15. 連絡先情報",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "本規約に関するご質問またはご不明な点については、以下までお問い合わせください。 ",
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
                text: "Agora を使用すると、これらの規約および今後の変更に同意したことになります。",
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
    termsOfService: "Тейлөө шарттары",
    automatedTranslationNoticeTitle: "Автоматтык котормо жөнүндө эскертүү",
    automatedTranslationNotice:
      "Бул котормо автоматтык түрдө түзүлгөн. Ар кандай айырмачылык, дал келбестик же карама-каршылык болгон учурда англис тилиндеги версия гана артыкчылыкка ээ жана расмий нуска болуп саналат.",
    viewAuthoritativeEnglishVersion: "Расмий англис версиясын көрүү",
    returnToTranslatedVersion: "Которулган версияга кайтуу",
    lastUpdatedLabel: "Акыркы жолу жаңыртылган",
    lastUpdatedDate: "2025/10/07 (ЖЖЖЖ/АА/КК)",
    introduction: [
      {
        text: 'Agora Citizen Network ("Agora") кош келиңиз! Бул жоболор жана шарттар ("Шарттар") Agora платформасына, анын ичинде биздин веб-сайтка, мобилдик тиркемелерге жана башка кызматтарга (жалпысынан "Кызматтар") кирүүңүздү жана колдонууну жөнгө салат. Кызматтарга кирүү же колдонуу менен, сиз ушул Шарттарга баш ийүүгө макул болосуз. Эгер макул болбосоңуз, Кызматтарга кире албай же пайдалана албайсыз.',
      },
    ],
    sections: [
      {
        heading: "1. Кызматтарга кирүү мүмкүнчүлүгүңүз",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 16 жаштан улуу колдонуучуларга гана жеткиликтүү. Agora колдонуу менен, сиз бул курактык талапка жооп берээриңизди жана Кызматтарга кирүү жана пайдалануу үчүн жашаган өлкөнүн мыйзамдары талап кылган минималдуу жаштан жогору экениңизди ырастайсыз.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: 'Agora серептөө үчүн каттоо эсебин түзүү талап кылынбайт. Бирок, талкууларга катышуу жана мазмун менен ("Мазмун") өз ара аракеттенүү үчүн, сиз төмөнкү ыкмалардын бирин колдонуу менен каттоодон өтүшүңүз керек болушу мүмкүн:',
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
                    text: "Телефон номери аркылуу кирүү (бир жолку код аркылуу текшерилген)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Zero-Knowledge Proofs (ZKP) аркылуу инсандыгыңызды ырастаган үчүнчү тараптын текшерүү колдонмолорунун (Rarimo, Zupass) криптографиялык далили аркылуу кириңиз. Бул ыкмалар купуялуулукту сактоо менен сиздин инсандыгыңыз ырасталышын камсыздайт. Agora уникалдуулугун жана жарамдуулугун тастыктаган криптографиялык далилдерди гана алат, эч качан негизги инсандыгын тастыктаган документтерди же билет маалыматын албайт. аркылуу катталуу мүмкүн эмес экенин белгилей кетүү керек ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: " эгерде сиз 18 жашта же андан улуу эмес болсоңуз.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Кызматтарды колдонбошуңуз керек, эгерде:",
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
                    text: "Сиз Agora кызматынан убактылуу токтотулдуңуз же чыгарылдыңыз.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Сиздин юрисдикцияңызда Кызматтарды колдонууга мыйзамдуу түрдө тыюу салынган.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Agora менен милдеттүү келишим түзө албайсыз, же эгерде сиз юрисдикцияңызда жашы жете элек болсоңуз, мыйзамдуу камкорчуңуз бул Шарттарды карап чыгып, макул болмоюнча.",
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
                text: "Agora'дин Купуялык саясаты жеке маалыматыңызды кантип чогултуп, колдонобуз жана коргойбуз. Кызматтарды колдонуу менен, сиз Купуялык саясатында сүрөттөлгөндөй маалыматыңызды чогултууга жана иштетүүгө макулдугуңузду билдиресиз. Көбүрөөк маалымат алуу үчүн, баш багыңыз ",
              },
              {
                text: "Agora Купуялык саясаты",
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
        heading: "3. Кызматтарды колдонууңуз",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Ушул Шарттарга ылайык, Agora сизге Кызматтарды колдонуу үчүн эксклюзивдүү эмес, өткөрүп берилбей турган, кайра чакыртып алынуучу лицензияны берет. Сиз кыла албайт:",
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
                    text: "Туура эмес маалыматты, жек көрүү сөздөрдү же куугунтуктоолорду жайылтуу үчүн Agora колдонуңуз.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Мыйзамсыз иштер менен алектенүү.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Алдамчылык аракеттерге, шылуундарга же алдамчылык аракеттерге катышуу же илгерилетүү.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Ачык-айкын сексуалдык, зордук-зомбулук же башка ылайыксыз мазмунду жайылтуу же жайылтуу.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Жеке адамдарды же топторду аңдып, коркутуп же коркутуу үчүн Agora колдонуңуз.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Agora платформасын, алгоритмдерин же функцияларын жеке же коммерциялык пайда үчүн манипуляциялоо же пайдалануу аракети.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Өзүнө зыян келтирүүгө, өзүн өзү өлтүрүүгө же кандайдыр бир коркунучка түрткөн иш-аракеттерге катышуу.",
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
                    text: "Кызматтарды же Мазмунду лицензиялоо, сатуу, өткөрүп берүү, дайындоо, жайылтуу, хостинг же башка коммерциялык максатта пайдалануу",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Agora инфраструктурасын бузуп, үзгүлтүккө учуратууга же тескери инженериялоого аракет кылуу.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Мазмунду кырып же алуу үчүн автоматташтырылган куралдарды колдонуңуз.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Башка колдонуучунун, мекеменин же уюмдун атынан өтүү.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Зыяндуу программалык камсыздоону, фишинг аракеттерин же алдамчылык схемаларды бөлүшүңүз же таратыңыз.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Жеке же купуя маалыматты макулдугусуз ачыкка чыгаруу менен башка колдонуучулардын купуялыгын бузуу, анын ичинде жеке даректерди, телефон номерлерин, каржылык маалыматтарды же кандайдыр бир жеке байланыштарды ачык уруксатсыз бөлүшүү.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora алдын ала эскертүүсүз каалаган убакта функцияларды өзгөртүү же алып салуу укугун сактайт. Кызматтарга келечектеги бардык өркүндөтүүлөр, жаңыртуулар же толуктоолор мезгил-мезгили менен кайра каралышы мүмкүн болгон ушул Шарттар менен жөнгө салынат. Сиз Agora сиздин же үчүнчү тараптын алдында Кызматтардын же алардын компоненттеринин ар кандай өзгөртүүлөрү, убактылуу токтотулушу же токтотулушу үчүн жооптуу эмес экенин моюнга аласыз.",
              },
            ],
          },
        ],
      },
      {
        heading: "4. Мазмунуңуз",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'Кызматтар мазмундун ар кандай түрлөрүн, анын ичинде текстти, шилтемелерди, сүрөттөрдү, видеолорду, аудиолорду жана колдонуучулар тарабынан берилген башка материалдарды камтышы мүмкүн ("Мазмун"). Agora эч кандай Мазмундун тактыгына, толуктугуна же ишенимдүүлүгүнө кепилдик бербейт жана ал үчүн эч кандай жоопкерчиликти өзүнө албайт.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Мазмунду тапшыруу менен, сиз аны бөлүшүүгө бардык зарыл укуктарыңыз бар экенин жана ал тиешелүү мыйзамдарды же үчүнчү тараптын укуктарын бузбасын ырастайсыз. Мазмунуңузга жана аны Agora сайтында бөлүшүүдөн келип чыккан кесепеттерге жалгыз сиз жооптуусуз.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Кызматтарды колдонуу менен сиз мазмунуңуздун ээлигин сактап каласыз, бирок Agoraга дүйнө жүзү боюнча, эксклюзивдүү эмес, роялтисиз, түбөлүктүү жана сублицензиялануучу лицензияны платформаңыздын иштеши, шайкештик жана операциялык максаттар үчүн сактоо, колдонуу, өзгөртүү, жайылтуу жана көрсөтүү үчүн бересиз. Бул Agora үчүн Мазмунуңузду синдикациялоо, жайылтуу, бириктирүү же үчүнчү тараптын өнөктөштөрү тарабынан жарыялоо үчүн жеткиликтүү кылуу укугун камтыйт.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora бул Шарттарды, тиешелүү мыйзамдарды же платформа саясатын бузса, мазмунду өзүнүн кароосу боюнча алып салуу же чектөө укугун өзүнө калтырат.",
              },
            ],
          },
        ],
      },
      {
        heading: "5. Мазмун жана модерация саясаты",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Сиз Мазмунду жайгаштыра албайсыз:",
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
                    text: "Зордук-зомбулукту же мыйзамсыз иш-аракеттерди үндөйт.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Жек көрүү сөздөрүн, куугунтуктоолорду же жеке чабуулдарды камтыйт.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Туура эмес маалыматты же манипуляциялык мазмунду таратат.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Интеллектуалдык менчик укуктарын бузат.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora колдонуучунун отчетторуна, автоматташтырылган аныктоого негизделген мазмунду модерациялоо тутумун колдонот ",
              },
              {
                text: "Коомчулуктун эрежелери",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: ". Бул Шарттарды бузган мазмун алынып салынышы мүмкүн жана кайталанган укук бузуучулар убактылуу токтотулушу же тыюу салынышы мүмкүн.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Мыйзамсыз мазмунду кабарлоо же модерация жана мыйзамдуу көйгөйлөрдү чечүү үчүн, биз менен байланышыңыз ",
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
        heading: "6. Үчүнчү тараптын мазмуну жана жарнактары",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'Agora жарнамачылар, өнөктөштөр, филиалдар же башка колдонуучулар ("Үчүнчү Тарап Мазмуну") бөлүшө турган үчүнчү тараптын веб-сайттарына, продуктыларына же кызматтарына шилтемелерди камтышы мүмкүн. Agora мындай тышкы булактардын тактыгы, мыйзамдуулугу же ишенимдүүлүгү үчүн эч кандай жоопкерчиликти өз мойнуна албайт, колдобойт.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Үчүнчү Тараптын Мазмунуна кирүү же алар менен иштөө сиздин тобокелиңизде жана биз тышкы булактар ​​менен иштешүүдөн же транзакцияларды аяктоодон мурда тиешелүү шарттарды, саясаттарды же шарттарды карап чыгууну сунуштайбыз.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora жарнамаларды же демөөрчү мазмунду көрсөтө алат. Жарнамалардын түрү, максаттуулугу жана жыштыгы өзгөрүшү мүмкүн жана биз Agora сайтында көрсөтүлгөн ар кандай мазмунга же кызматтарга байланыштуу жарнамаларды жайгаштыруу укугун өзүнө калтырабыз. Сиздин демөөрчү мазмун же жарнамалар менен болгон өз ара аракеттенүүңүздүн тобокелдиги өзүңүзгө гана жүктөлөт жана биз жарнамаланган өнүмдөрдүн же кызматтардын тактыгына, сапатына же мыйзамдуулугуна кепилдик бербейбиз.",
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
                text: "Agora менен байланышкан бардык интеллектуалдык менчик, анын ичинде патенттер, соода белгилери, фирмалык аталыштар, автордук укуктар, коммерциялык сырлар, менчик маалыматтары, ноу-хау, моралдык укуктар, маалымат базасына болгон укуктар, дизайн укуктары, алгоритмдер, программалык камсыздоо, компьютер коду, визуалдык интерфейстер жана башка менчик укуктар, катталганына же катталбаганына карабастан, Agoraга таандык же ага лицензияланган. Бул ошондой эле ар кандай юрисдикциянын мыйзамдарына ылайык мындай интеллектуалдык менчикти каттоого арыздарды же арыз берүү укуктарын камтыйт.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agoraтин интеллектуалдык менчигин уруксатсыз пайдаланууга, кайра чыгарууга, өзгөртүүгө, таратууга же эксплуатациялоого катуу тыюу салынат. Бул Agoraдин алдын ала жазуу жүзүндөгү уруксатысыз тескери инженердик программалык камсыздоону, менчик материалдарды сатууну же кандайдыр бир менчик мазмунду колдонууну камтыйт, бирок алар менен чектелбейт.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Бул интеллектуалдык менчик укуктарынын ар кандай бузулушу мыйзамдуу аракеттерге алып келиши мүмкүн. Agora ушул Шарттарда ачык берилбеген бардык укуктарды өзүнө калтырат.",
              },
            ],
          },
        ],
      },
      {
        heading: "8. Кызмат көрсөтүүнү токтотуу",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Каттоо эсебиңизди жок кылуу жана бардык Кызматтарды колдонууну токтотуу менен бул Шарттарды каалаган убакта жана каалаган себеп менен токтото аласыз. Эгер сиз Каттоо эсебиңизди өчүрбөстөн Кызматтарды колдонууну токтотсоңуз, каттоо эсебиңиз узакка созулган аракетсиздиктен улам өчүрүлүшү мүмкүн.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Төмөнкү бөлүмдөр бул Шарттар же Каттоо эсебиңиз токтотулган учурда да сакталып калат:",
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
                    text: "3. Кызматтарды колдонууңуз,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "4. Мазмунуңуз,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "8. Кызмат көрсөтүүлөрдү токтотуу,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. Жоопкерчиликтен баш тартуу жана чектөөлөр,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "10. ордун толтуруу",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "14. Ар кандай.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Каттоо эсебиңизди кантип жок кылса болот:",
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
                    text: "Эгер сиз каттоо эсебиңизди Rarimo (паспортту текшерүү) аркылуу ырастаган болсоңуз, жок кылууну улантуудан мурун жокко чыгаруучу гана (улуту жана жынысын кошпогондо) камтыган жаңы далилди түзүшүңүз керек.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Каттоо эсебиңизди телефон номери менен гана ырастаган болсоңуз, каттоо эсебин жок кылууну ырастоо жана бүтүрүү үчүн телефон номериңизди кайра ырасташыңыз керек.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Ийгиликке жеткенден кийин, аккаунтуңуз 30 күндүн ичинде жок кылынат.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Паспорттун далилин жок кылуу үчүн (эгер телефон номери мурунтан эле киргизилген болсо), бирок аккаунтуңузду сактап калыңыз:",
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
                    text: "Rarimo менен жаңы далил жаратыңыз:",
                    kind: "strong",
                  },
                  {
                    text: " Сиз жаңы текшерүү далилин түзүшүңүз керек, бирок бул жолу анда улутуңуз же жынысыңыз эмес, жокко чыгаруучу гана камтылат.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Жок кылууну ырастаңыз:",
                    kind: "strong",
                  },
                  {
                    text: " Ырасталгандан кийин, мурунку паспортуңуздун далили, анын ичинде улуту жана жынысы биротоло жок кылынат.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Каттоо эсебиңизди жок кылсаңыз дагы, жоопкерчиликти камсыз кылуу үчүн кээ бир криптографиялык жазуулар сакталат:",
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
                    text: "Жок кылуу үчүн колдонулган Нөлдүк билим далили (ZKP), анда жокко чыгаруучу жана криптографиялык маалыматтар гана камтылган (улуту же жынысы эмес).",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Колдонуучунун көзөмөлүндөгү авторизация тармагы (UCAN) бул ZKPге кол койгон, түзмөгүңүздөн келген сурамды ырастаган далил.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Өчүрүү өтүнүчүн ырастаган UCAN далили, сурамдын туура иштетилгенин камсыз кылуу.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Бул криптографиялык жазуулар үчүнчү тараптын аудиторлоруна Agora эсептерди же маалыматтарды цензура кылбаганын, тескерисинче маалыматты колдонуучунун өтүнүчү боюнча гана жок кылганын далилдөө үчүн бар. Бул системанын ачыктыгын жана ишенимин камсыздайт.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora ушул Шарттарды бузган эсептерди токтотуу же жабуу укугун өзүнө калтырат.",
              },
            ],
          },
        ],
      },
      {
        heading: "9. Жоопкерчиликтен баш тартуу жана чектөө",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: 'Кызматтар эч кандай кепилдиксиз "кандай болсо, ошондой" берилет. Agora ачык, кыйыр түрдө, мыйзамдуу же башка түрдөгү эч кандай билдирүүлөрдү же кепилдиктерди бербейт, анын ичинде сатууга жарамдуулугуна, белгилүү бир максатка ылайыктуулугуна, укук бузуусуздугуна же Кызматтардын жеткиликтүүлүгүнө кепилдиктер менен чектелбейт.',
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora Кызматтар катасыз, үзгүлтүксүз, коопсуз болот же кемчиликтер оңдолот деп кепилдик бербейт. Колдонуучулар Кызматтарды колдонуу менен байланышкан бардык тобокелдиктерди өзүнө алышат.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Мыйзам жол берген толук көлөмдө, Agora келишимге, укук бузууга, катуу жоопкерчиликке же башка юридикалык теорияга негизделип, Кызматтарды колдонуудан келип чыккан же ага байланыштуу болгон кыйыр, кокустук, кесепеттүү, жазалоочу же өзгөчө зыяндар үчүн жооптуу эмес, Agora мындай зыяндар жөнүндө эскертилген болсо да. Бул, бирок алар менен эле чектелбестен, жоголгон пайда, маалыматтарды жоготуу, жеке жаракат, мүлктүк зыян же бизнестин үзгүлтүккө учурашы кирет.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Кээ бир юрисдикциялар белгилүү бир зыянды алып салууга же чектөөгө жол бербейт, андыктан бул чектөөлөрдүн айрымдары сизге колдонулбашы мүмкүн.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora купуялуулукту жана коопсуздукту жогорулатуу үчүн Zero-Knowledge Proof (ZKP) технологиясын ишке ашырса да, колдонуучулар эч кандай технология жаңылбас экенин моюнга алышат. ZKP ишке ашырууда күтүлбөгөн алсыздыктар же мүчүлүштүктөр болушу мүмкүн, алар уруксатсыз маалыматтардын ачыкка чыгышына же купуялыктын бузулушуна алып келиши мүмкүн. Agora ZKP абсолюттук коопсуздугуна же ишенимдүүлүгүнө эч кандай кепилдик бербейт жана аны колдонуудан келип чыккан күтүлбөгөн кесепеттер үчүн эч кандай жоопкерчиликти өзүнө албайт.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Колдонуучуларга кошумча сактык чараларын көрүүгө чакырылат, мисалы, Tor сыяктуу анонимдүүлүк куралдарын колдонуп, IP даректерин жаап-жашыруу, алардын жазууларында ашыкча жеке маалымат менен бөлүшүүдөн качуу жана алардын паспорту жана башка жазылган аракеттери менен алардын инсандыгын байкабай ачып бере турган жазуу стилдерин жана бөлүшүлгөн атрибуттарды эске алуу.",
              },
            ],
          },
        ],
      },
      {
        heading: "10. ордун толтуруу",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Мыйзам тарабынан тыюу салынган учурларды кошпогондо, сиз Agora, анын филиалдары жана алардын тиешелүү директорлорун, кызматкерлерин, кызматкерлерин, агенттерин, подрядчыларын, үчүнчү тараптын кызмат көрсөтүүчүлөрүн жана лицензиарларын ар кандай дооматтардан, талаптардан, милдеттенмелерден, зыяндардан, жоготуулардан жана чыгымдардан (жана төмөнкүлөргө байланыштуу) коргоого, ордун толтурууга жана зыянсыз кармоого макул болосуз:",
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
                    text: "Agora жана анын Кызматтарын колдонууңуз;",
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
                    text: "колдонуудагы мыйзамдарды же эрежелерди бузууңуз; же",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Agora сайтында тапшырган, жайгаштырган же бөлүшкөн бардык Мазмун.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora сизден зыяндын ордун толтурууга милдеттүү болгон ар кандай маселенин корголушун көзөмөлдөө укугун өзүнө калтырат жана сиз мындай дооматтарды коргообуз менен толук кызматташууга макул болосуз. Сиздин зыяндын ордун толтуруу боюнча милдеттенмелериңиз Agora жана анын Кызматтарын колдонууңуз токтотулганда же токтотулганда да сакталып калат.",
              },
            ],
          },
        ],
      },
      {
        heading: "11. Бөлүнүү мүмкүнчүлүгү",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Мүмкүн болушунча, бул Шарттардын жоболору мыйзамга ылайык жарактуу жана аткарыла тургандай чечмеленүүгө тийиш. Бирок, эгерде бул Шарттардын бир же бир нече жоболору толугу менен же жарым-жартылай жараксыз, мыйзамсыз же аткарылууга мүмкүн эмес деп табылса, мындай жобонун жана ушул Шарттардын калган бөлүгү эч кандай таасир этпейт жана мындай жараксыз, мыйзамсыз же аткарылууга мүмкүн болбогон жоболор бул жерде эч качан камтылбагандай толук күчүндө жана күчүндө кала берет.",
              },
            ],
          },
        ],
      },
      {
        heading: "12. Башкаруучу мыйзам жана талаш-тартыштарды чечүү",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Бул Шарттар, анын ичинде алардын жарактуулугу, чечмелөөсү, аткарылышы, аткарылышы же токтотулушу менен байланышкан бардык маселелер, ошондой эле укук бузуулар боюнча дооматтардан, келишимге чейинки милдеттенмелерден же келишимден тышкаркы жоопкерчиликтен келип чыккан талаштар Франциянын мыйзамдарына ылайык жөнгө салынат жана чечмеленет. Франциядан башка юрисдикциянын мыйзамдарын колдоно турган мыйзам принциптеринин же коллизия эрежелеринин башка тандоосуна эч кандай таасир берилбейт.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora боюнча позитивдүү тажрыйбага ээ болушуңузду каалайбыз. Эгерде сизде кандайдыр бир маселелер же талаштар болсо, аларды биз менен расмий эмес түрдө чечүү аракетине макул болосуз. Каалаган пикириңиз же тынчсызданууларыңыз менен биз менен байланыша аласыз ",
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
                text: "Бейрасмий түрдө чечилбей турган ар кандай талаш-тартыштар Нойли Сюр Сен сотторунун өзгөчө юрисдикциясында болот.",
              },
            ],
          },
        ],
      },
      {
        heading: "13. Ушул Шарттарга өзгөртүүлөр",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora кызматтарыбыздагы, мыйзамдуу талаптардагы же башка операциялык муктаждыктардагы өзгөрүүлөрдү чагылдыруу үчүн бул Шарттарды мезгил-мезгили менен жаңыртып турат. Эгер олуттуу өзгөртүүлөрдү киргизсек, өзгөртүүлөр күчүнө киргенге чейин колдонуучуларга колдонмодогу эскертмелер, баннерлер же ырастоону талап кылган эскертүүлөр аркылуу кабарлайбыз.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Кайра каралган Шарттар күчүнө киргенден кийин Agora мүмкүнчүлүгүн же колдонууну улантуу менен, сиз жаңыртылган Шарттарга баш ийүүгө макул болосуз. Эгерде сиз өзгөртүүлөргө макул болбосоңуз, өзгөртүүлөр күчүнө киргенге чейин Agora колдонууну токтотушуңуз керек.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Биз колдонуучуларды Agora колдонууда алардын укуктары жана милдеттери тууралуу кабардар болуп туруу үчүн бул Шарттарды үзгүлтүксүз карап чыгууга чакырабыз.",
              },
            ],
          },
        ],
      },
      {
        heading: "14. Ар кандай",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Бул Шарттар Купуялык саясаты менен бирге Agoraге кирүүңүздү жана колдонууну жөнгө салуучу бүтүндөй келишимди түзөт. Бул Шарттарга ылайык кандайдыр бир укукту же жобону ишке ашырбай же аткарбообуз мындай укуктан же жободон баш тартуу болуп эсептелбейт.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Эгерде ушул Шарттардын кайсы бир жобосу жараксыз же аткарылууга мүмкүн эмес деп табылса, ал максималдуу жол берилген өлчөмдө аткарылууга тийиш, ал эми калган жоболор толук күчүндө жана күчүндө болот.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Сиз биздин алдын ала макулдугубузсуз ушул Шарттарга ылайык өз укуктарыңызды же милдеттериңизди башкага өткөрүп же өткөрүп бере албайсыз. Бирок, биз бул Шарттарга ылайык өз укуктарыбыз менен милдеттерибизди чектөөсүз эркин өткөрүп берүү укугуна ээбиз.",
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
                text: "Бул Шарттарга байланыштуу суроолор же тынчсыздануулар үчүн биз менен байланышыңыз: ",
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
                text: "Agora колдонуу менен, сиз бул Шарттарды жана келечектеги бардык өзгөртүүлөрдү тааныйсыз жана макулдугуңузду билдиресиз.",
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
    termsOfService: "Условия использования",
    automatedTranslationNoticeTitle: "Уведомление об автоматическом переводе",
    automatedTranslationNotice:
      "Этот перевод создан автоматически. В случае любых расхождений, несоответствий или противоречий преимущественную силу имеет исключительно версия на английском языке, которая является официальной.",
    viewAuthoritativeEnglishVersion:
      "Открыть официальную версию на английском языке",
    returnToTranslatedVersion: "Вернуться к переведённой версии",
    lastUpdatedLabel: "Последнее обновление:",
    lastUpdatedDate: "2025/10/07 (ГГГГ/ММ/ДД)",
    introduction: [
      {
        text: "Добро пожаловать в Agora Citizen Network («Agora»)! Настоящие Условия («Условия») регулируют ваш доступ к платформе Agora и ее использование, включая наш веб-сайт, мобильные приложения и другие услуги (совместно именуемые «Услуги»). Получая доступ к Услугам или используя их, вы соглашаетесь соблюдать настоящие Условия. Если вы не согласны, вы не имеете права получать доступ к Услугам или использовать их.",
      },
    ],
    sections: [
      {
        heading: "1. Ваш доступ к услугам",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora доступен только пользователям в возрасте 16 лет и старше. Используя Agora, вы подтверждаете, что соответствуете этому возрастному требованию и что вы старше минимального возраста, требуемого законодательством вашей страны проживания для доступа к Услугам и их использования.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Вам не требуется создавать учетную запись для просмотра Agora. Однако для участия в обсуждениях и взаимодействия с контентом («Контент») вам может потребоваться зарегистрироваться одним из следующих способов:",
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
                    text: "Вход по номеру телефона (подтвержден через одноразовый код)",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Войдите в систему с помощью криптографического подтверждения из сторонних приложений проверки (Rarimo, Zupass), которые подтверждают вашу личность с помощью доказательства с нулевым разглашением (ZKP). Эти методы гарантируют проверку вашей личности при сохранении конфиденциальности. Agora получает только криптографические доказательства, подтверждающие уникальность и право на участие, а не соответствующие документы, удостоверяющие личность или информацию о билете. Обратите внимание, что зарегистрироваться через ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: " если вам нет 18 лет или старше.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Вы не должны использовать Услуги, если:",
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
                    text: "Вы были заблокированы или удалены из Agora.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Вам запрещено использовать Услуги в вашей юрисдикции по закону.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Вы не можете заключить обязывающий договор с Agora или если вы не достигли совершеннолетия в соответствии с вашей юрисдикцией, если только ваш законный опекун не ознакомился и не согласился с настоящими Условиями.",
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
                text: "Политика конфиденциальности Agora объясняет, как мы собираем, используем и защищаем ваши личные данные. Используя Сервисы, вы соглашаетесь на сбор и обработку вашей информации, как описано в Политике конфиденциальности. Для получения более подробной информации посетите ",
              },
              {
                text: "Политика конфиденциальности",
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
        heading: "3. Использование вами услуг",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "В соответствии с настоящими Условиями Agora предоставляет вам неисключительную, непередаваемую и отзывную лицензию на использование Услуг. Вы не можете:",
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
                    text: "Используйте Agora для распространения дезинформации, разжигания ненависти или преследования.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Заниматься незаконной деятельностью.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Участвовать или поощрять мошенническую деятельность, мошенничество или обманные действия.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Распространять или продвигать контент откровенно сексуального, жестокого или иного неприемлемого характера.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Используйте Agora, чтобы преследовать, запугивать или угрожать отдельным лицам или группам.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Пытаться манипулировать или использовать платформу, алгоритмы или функции Agora для личной или коммерческой выгоды.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Занимайтесь деятельностью, которая поощряет членовредительство, самоубийство или любую форму угрозы.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Нарушать права интеллектуальной собственности, включая несанкционированное распространение материалов, защищенных авторским правом.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Лицензировать, продавать, передавать, переуступать, распространять, размещать или иным образом использовать в коммерческих целях Услуги или Контент.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Попытаться взломать, разрушить или перепроектировать инфраструктуру Agora.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Используйте автоматизированные инструменты для очистки или извлечения контента.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Выдавать себя за другого пользователя, объект или организацию.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Делитесь или распространяйте вредоносное программное обеспечение, попытки фишинга или мошеннические схемы.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Нарушать конфиденциальность других пользователей, раскрывая личную или конфиденциальную информацию без согласия, включая, помимо прочего, передачу личных адресов, номеров телефонов, финансовых данных или любых частных сообщений без явного разрешения.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora сохраняет за собой право изменять или удалять функции в любое время без предварительного уведомления. Любые будущие улучшения, обновления или дополнения к Услугам будут регулироваться настоящими Условиями, которые могут периодически пересматриваться. Вы признаете, что Agora не несет ответственности перед вами или какой-либо третьей стороной за любые изменения, приостановку или прекращение Услуг или любого из их компонентов.",
              },
            ],
          },
        ],
      },
      {
        heading: "4. Ваш контент",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Сервисы могут содержать различные типы контента, включая текст, ссылки, изображения, видео, аудио и другие материалы, предоставленные пользователями («Контент»). Agora не гарантирует точность, полноту или надежность любого Контента и не несет за него ответственности.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Отправляя Контент, вы подтверждаете, что у вас есть все необходимые права на его распространение и что он не нарушает какие-либо применимые законы или права третьих лиц. Вы несете единоличную ответственность за свой контент и любые последствия, возникающие в результате его публикации на Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Используя Сервисы, вы сохраняете право собственности на свой контент, но предоставляете Agora глобальную, неисключительную, бесплатную, бессрочную и сублицензируемую лицензию на хранение, использование, изменение, распространение и отображение вашего контента для функциональности платформы, соблюдения требований и эксплуатационных целей. Это включает в себя право Agora предоставлять ваш Контент для распространения, распространения, агрегирования или публикации сторонними партнерами.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora оставляет за собой право удалять или ограничивать контент по своему усмотрению, если он нарушает настоящие Условия, применимое законодательство или политику платформы.",
              },
            ],
          },
        ],
      },
      {
        heading: "5. Политика содержания и модерации",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Вы не можете публиковать Контент, который:",
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
                    text: "Содержит разжигание ненависти, оскорбления или личные нападки.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Распространяет дезинформацию или манипулятивный контент.",
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
                text: "Agora использует систему модерации контента, основанную на отчетах пользователей, автоматическом обнаружении и ",
              },
              {
                text: "Правила сообщества",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: ". Контент, нарушающий настоящие Условия, может быть удален, а повторным нарушителям может грозить приостановка или бан.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Чтобы сообщить о незаконном контенте или решить модерацию и решить юридические проблемы, свяжитесь с нами по адресу: ",
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
        heading: "6. Сторонний контент и реклама.",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora может содержать ссылки на сторонние веб-сайты, продукты или услуги, которыми могут делиться рекламодатели, партнеры, аффилированные лица или другие пользователи («Сторонний контент»). Agora не контролирует, не подтверждает и не несет никакой ответственности за точность, законность или надежность таких внешних источников.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Доступ к Контенту третьих лиц или взаимодействие с ним осуществляется на ваш страх и риск, и мы рекомендуем вам ознакомиться со всеми соответствующими положениями, политиками и условиями, прежде чем взаимодействовать с внешними источниками или совершать транзакции.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora может отображать рекламу или спонсируемый контент. Тип, таргетинг и частота рекламы могут меняться, и мы оставляем за собой право размещать рекламу в связи с любым контентом или услугами, предоставляемыми на Agora. Вы взаимодействуете со спонсируемым контентом или рекламой исключительно на свой страх и риск, и мы не гарантируем точность, качество или законность любых рекламируемых продуктов или услуг.",
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
                text: "Вся интеллектуальная собственность, связанная с Agora, включая, помимо прочего, патенты, товарные знаки, торговые наименования, авторские права, коммерческую тайну, данные собственности, ноу-хау, моральные права, права на базы данных, права на дизайн, алгоритмы, программное обеспечение, компьютерный код, визуальные интерфейсы и любые другие права собственности — зарегистрированные или незарегистрированные — принадлежат или лицензируются Agora. Сюда также входят любые заявки или права подать заявку на регистрацию такой интеллектуальной собственности в соответствии с законодательством любой юрисдикции.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Несанкционированное использование, воспроизведение, модификация, распространение или эксплуатация интеллектуальной собственности Agora строго запрещены. Это включает, помимо прочего, обратное проектирование программного обеспечения, продажу запатентованных материалов или использование любого запатентованного контента без предварительного письменного разрешения от Agora.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Любое нарушение этих прав интеллектуальной собственности может привести к судебному иску. Agora оставляет за собой все права, не предоставленные явно в соответствии с настоящими Условиями.",
              },
            ],
          },
        ],
      },
      {
        heading: "8. Прекращение оказания услуг",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Вы можете прекратить действие настоящих Условий в любое время и по любой причине, удалив свою Учетную запись и прекратив использование всех Услуг. Если вы прекратите использовать Услуги, не деактивировав свою Учетную запись, ваша Учетная запись может быть деактивирована из-за длительного бездействия.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Следующие разделы остаются в силе после прекращения действия настоящих Условий или вашей Учетной записи:",
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
                    text: "3. Использование вами Услуг,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "4. Ваш контент,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "8. Прекращение предоставления Услуг,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. Отказ от ответственности и ограничение ответственности,",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "10. Возмещение ущерба",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "14. Разное.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Как удалить свою учетную запись:",
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
                    text: "Если вы подтвердили свою учетную запись с помощью Rarimo (проверка паспорта), вам необходимо создать новое подтверждение, содержащее только нуллификатор (исключая национальность и пол), прежде чем приступить к удалению.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Если вы подтвердили свою учетную запись, используя только номер телефона, вам необходимо повторно подтвердить свой номер телефона, чтобы подтвердить и завершить удаление учетной записи.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "В случае успеха ваша учетная запись будет удалена в течение 30 дней.",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "Чтобы удалить подтверждение паспорта (если номер телефона уже был введен), но сохранить свою учетную запись:",
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
                    text: "Создайте новое доказательство с помощью Rarimo:",
                    kind: "strong",
                  },
                  {
                    text: " Вам нужно будет создать новое подтверждение проверки, но на этот раз оно будет содержать только ваш нуллификатор, а не вашу национальность или пол.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Подтвердите удаление:",
                    kind: "strong",
                  },
                  {
                    text: " После подтверждения ваши предыдущие паспортные данные, включая гражданство и пол, будут окончательно удалены.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Некоторые криптографические записи по-прежнему будут сохраняться, даже если вы удалите свою учетную запись, чтобы обеспечить подотчетность:",
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
                    text: "Доказательство с нулевым разглашением (ZKP), используемое для удаления, содержит только обнулитель и криптографические данные (без национальности или пола).",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Сеть авторизации, контролируемая пользователем (UCAN), подписывает этот ZKP, проверяя запрос с вашего устройства.",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "Доказательство UCAN, подтверждающее запрос на удаление, гарантирующее, что запрос был обработан правильно.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Эти криптографические записи существуют для того, чтобы доказать сторонним аудиторам, что Agora не подвергал цензуре учетные записи или данные, а удалял информацию только по запросу пользователя. Это обеспечивает прозрачность и доверие к системе.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora оставляет за собой право приостановить или прекратить действие учетных записей, которые нарушают настоящие Условия.",
              },
            ],
          },
        ],
      },
      {
        heading: "9. Отказ от ответственности и ограничение ответственности",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Услуги предоставляются «как есть», без каких-либо гарантий. Agora не делает никаких заявлений и не дает никаких гарантий, явных, подразумеваемых, установленных законом или иных, включая, помимо прочего, гарантии коммерческой ценности, пригодности для определенной цели, ненарушения прав или доступности Услуг.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora не гарантирует, что Услуги будут работать без ошибок, бесперебойно, безопасно или что дефекты будут исправлены. Пользователи принимают на себя все риски, связанные с использованием Сервисов.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "В максимальной степени, разрешенной законом, Agora не несет ответственности за любые косвенные, случайные, косвенные, штрафные или особые убытки, возникающие в результате или в связи с использованием вами Услуг, будь то на основании контракта, правонарушения, строгой ответственности или любой другой юридической теории, даже если Agora был уведомлен о возможности таких убытков. Это включает, помимо прочего, ущерб в виде упущенной выгоды, потери данных, телесных повреждений, материального ущерба или перерыва в производстве.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "В некоторых юрисдикциях не допускается исключение или ограничение определенных убытков, поэтому некоторые из этих ограничений могут к вам не относиться.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Хотя Agora реализует технологию доказательства с нулевым разглашением (ZKP) для повышения конфиденциальности и безопасности, пользователи признают, что ни одна технология не является непогрешимой. В реализации ZKP могут существовать непредвиденные уязвимости или недостатки, которые потенциально могут привести к несанкционированному раскрытию данных или нарушению конфиденциальности. Agora не дает никаких гарантий относительно абсолютной безопасности или надежности ZKP и не несет ответственности за любые непредвиденные последствия, возникающие в результате его использования.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Пользователям рекомендуется принимать дополнительные меры предосторожности, например, использовать инструменты анонимности, такие как Tor, для маскировки своего IP-адреса, избегать раскрытия чрезмерной личной информации в своих письмах, а также помнить о стилях письма и общих атрибутах, которые могут непреднамеренно раскрыть их личность из-за корреляции с их паспортом и другими записанными действиями.",
              },
            ],
          },
        ],
      },
      {
        heading: "10. Возмещение ущерба",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "За исключением случаев, когда это запрещено законом, вы соглашаетесь защищать, возмещать убытки и ограждать Agora, ее аффилированные лица и их соответствующих директоров, должностных лиц, сотрудников, агентов, подрядчиков, сторонних поставщиков услуг и лицензиаров от любых претензий, требований, обязательств, ущерба, потерь и расходов (включая судебные издержки и издержки), возникающих из или связанных с:",
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
                    text: "использование вами Agora и его Услуг;",
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
                    text: "нарушение вами любых применимых законов или правил; или",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "любой Контент, который вы отправляете, публикуете или делитесь на Agora.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora оставляет за собой право взять на себя защиту по любому вопросу, по которому вы обязаны возместить нам ущерб, и вы соглашаетесь полностью сотрудничать с нашей защитой от таких претензий. Ваши обязательства по возмещению убытков остаются в силе после любого прекращения или приостановки использования вами Agora и его Услуг.",
              },
            ],
          },
        ],
      },
      {
        heading: "11. Делимость",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "По мере возможности положения настоящих Условий должны интерпретироваться таким образом, чтобы они были действительными и подлежащими исполнению в соответствии с применимым законодательством. Однако, если одно или несколько положений настоящих Условий будут признаны недействительными, незаконными или не имеющими исковой силы полностью или частично, остальная часть любого такого положения и настоящих Условий не будет затронута и будет продолжать действовать в полную силу, как если бы такое недействительное, незаконное или не имеющее исковой силы положение никогда не содержалось в настоящем документе.",
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
                text: "Настоящие Условия, включая любые вопросы, связанные с их действительностью, толкованием, исполнением, исполнением или прекращением действия, а также любые споры, возникающие из деликтных исков, преддоговорных обязательств или внедоговорной ответственности, регулируются и толкуются в соответствии с законодательством Франции. Никакой другой выбор правовых принципов или коллизионных норм, к которым применимы законы любой юрисдикции, кроме Франции, не применяется.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Мы хотим, чтобы у вас остались положительные впечатления от Agora. Если у вас возникнут какие-либо проблемы или споры, вы соглашаетесь сначала попытаться разрешить их с нами неофициально. Вы можете связаться с нами с любыми отзывами или проблемами по адресу: ",
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
                text: "Любые споры, которые не могут быть решены неофициальным путем, подлежат исключительной юрисдикции судов Нейи-сюр-Сен.",
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
                text: "Agora может время от времени обновлять настоящие Условия, чтобы отражать изменения в наших услугах, юридических требованиях или других эксплуатационных потребностях. Если мы внесем существенные изменения, мы уведомим пользователей с помощью уведомлений, баннеров или подсказок в приложении, требующих подтверждения, прежде чем изменения вступят в силу.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Продолжая получать доступ к Agora или использовать его после вступления в силу пересмотренных Условий, вы соглашаетесь соблюдать обновленные Условия. Если вы не согласны с изменениями, вы должны прекратить использование Agora до того, как изменения вступят в силу.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Мы рекомендуем пользователям регулярно просматривать настоящие Условия, чтобы быть в курсе своих прав и обязанностей при использовании Agora.",
              },
            ],
          },
        ],
      },
      {
        heading: "14. Разное",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Настоящие Условия вместе с Политикой конфиденциальности представляют собой полное соглашение, регулирующее ваш доступ к Agora и его использование. Наша неспособность реализовать или обеспечить соблюдение какого-либо права или положения в соответствии с настоящими Условиями не считается отказом от такого права или положения.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Если какое-либо положение настоящих Условий будет признано недействительным или не имеющим исковой силы, оно должно быть приведено в исполнение в максимально допустимой степени, а остальные положения продолжат действовать в полную силу.",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Вы не можете переуступать или передавать какие-либо свои права или обязанности по настоящим Условиям без нашего предварительного согласия. Однако мы оставляем за собой право свободно передавать наши права и обязанности в соответствии с настоящими Условиями без ограничений.",
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
                text: "Если у вас есть вопросы или сомнения относительно настоящих Условий, свяжитесь с нами по адресу: ",
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
                text: "Используя Agora, вы признаете и соглашаетесь с настоящими Условиями и любыми будущими изменениями.",
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
  "zh-Hans": {
    termsOfService: "服务条款",
    automatedTranslationNoticeTitle: "自动翻译声明",
    automatedTranslationNotice:
      "本译文由自动翻译生成。如有任何差异、不一致或冲突，应仅以英文版本为准，英文版本为权威版本。",
    viewAuthoritativeEnglishVersion: "查看权威英文版本",
    returnToTranslatedVersion: "返回译文",
    lastUpdatedLabel: "最后更新于",
    lastUpdatedDate: "2025/10/07（年/月/日）",
    introduction: [
      {
        text: "欢迎来到Agora Citizen Network（“Agora”）！这些条款和条件（“条款”）管辖您对 Agora 平台的访问和使用，包括我们的网站、移动应用程序和其他服务（统称为“服务”）。通过访问或使用服务，您同意受这些条款的约束。如果您不同意，您不得访问或使用服务。",
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
                text: "Agora仅适用于16岁或以上的用户。通过使用 Agora，您确认您符合此年龄要求，并且您已超过您居住国家/地区法律规定的访问和使用服务所需的最低年龄。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "您无需创建帐户即可浏览 Agora。但是，要参与讨论并与内容（“内容”）互动，您可能需要使用以下方法之一进行注册：",
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
                    text: "通过电话号码登录（通过一次性代码验证）",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "通过第三方验证应用程序（Rarimo、Zupass）的加密证明登录，该应用程序使用零知识证明（ZKP）验证您的身份。这些方法可确保您的身份得到验证，同时维护隐私。 Agora 仅收到确认唯一性和资格的加密证明，而不是基础身份文件或票据信息。请注意，无法通过以下方式注册 ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: " 如果您未满 18 岁。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "如果出现以下情况，您不得使用服务：",
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
                    text: "您已被暂停或从 Agora 中除名。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您所在司法管辖区法律禁止您使用服务。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "除非您的法定监护人已审阅并同意这些条款，否则您无法与 Agora 签订具有约束力的合同，或者如果您未满您所在司法管辖区的法定成年年龄。",
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
                text: "Agora 的隐私政策解释了我们如何收集、使用和保护您的个人数据。使用服务即表示您同意按照隐私政策中的规定收集和处理您的信息。欲了解更多详情，请访问 ",
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
        heading: "3.您对服务的使用",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "根据这些条款，Agora 授予您非独占、不可转让、可撤销的服务使用许可。你不可以：",
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
                    text: "使用 Agora 传播错误信息、仇恨言论或骚扰。",
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
                    text: "参与或宣扬欺诈活动、骗局或欺骗行为。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "传播或宣传色情、暴力或其他不当内容。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "使用 Agora 跟踪、恐吓或威胁个人或团体。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "试图操纵或利用 Agora 的平台、算法或功能来获取个人或商业利益。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "从事鼓励自残、自杀或任何形式的危险活动。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "侵犯知识产权，包括未经授权分发受版权保护的材料。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "许可、出售、转让、转让、分发、托管或以其他方式商业利用服务或内容",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "尝试破解、破坏或逆向工程 Agora 的基础设施。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "使用自动化工具来抓取或提取内容。",
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
                    text: "共享或分发恶意软件、网络钓鱼尝试或欺诈计划。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "未经同意披露个人或敏感信息，侵犯其他用户的隐私，包括但不限于未经明确许可共享个人地址、电话号码、财务详细信息或任何私人通信。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora保留随时修改或删除功能的权利，恕不另行通知。未来对服务的任何增强、更新或添加都将受这些条款的约束，这些条款可能会定期修订。您承认，Agora 不对您或任何第三方对服务或其任何组件的任何修改、暂停或终止承担责任。",
              },
            ],
          },
        ],
      },
      {
        heading: "4.您的内容",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "服务可能包含各种类型的内容，包括文本、链接、图像、视频、音频和用户提交的其他材料（“内容”）。 Agora 不保证任何内容的准确性、完整性或可靠性，且不承担任何责任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "通过提交内容，您确认您拥有共享该内容的所有必要权利，并且该内容不违反任何适用的法律或第三方权利。您对您的内容以及在 Agora 上分享该内容所产生的任何后果承担全部责任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "通过使用服务，您保留对内容的所有权，但授予 Agora 全球范围内的、非排他性的、免版税的、永久的和可再许可的许可，以出于平台功能、合规性和运营目的存储、使用、修改、分发和显示您的内容。这包括 Agora 使您的内容可供第三方合作伙伴联合、分发、聚合或发布的权利。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "如果内容违反本条款、适用法律或平台政策，Agora 保留自行决定删除或限制内容的权利。",
              },
            ],
          },
        ],
      },
      {
        heading: "5. 内容和审核政策",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "您不得发布以下内容：",
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
                    text: "宣扬暴力或非法活动。",
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
                    text: "传播错误信息或操纵性内容。",
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
                text: "Agora 采用基于用户报告、自动检测和 ",
              },
              {
                text: "社区准则",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: "。违反这些条款的内容可能会被删除，屡犯者可能会面临暂停或禁令。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "要举报非法内容或解决审核和法律问题，请通过以下方式联系我们： ",
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
        heading: "6. 第三方内容和广告",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 可能包含第三方网站、产品或服务的链接，这些链接可能由广告商、合作伙伴、附属公司或其他用户共享（“第三方内容”）。 Agora 不控制、认可此类外部来源的准确性、合法性或可靠性，也不承担任何责任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "访问或参与第三方内容的风险由您自行承担，我们鼓励您在与外部来源互动或完成交易之前查看任何相关条款、政策或条件。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 可能会显示广告或赞助内容。广告的类型、目标和频率可能会发生变化，我们保留在 Agora 上提供的任何内容或服务中投放广告的权利。您与赞助内容或广告的互动完全由您自行承担风险，我们不保证任何广告产品或服务的准确性、质量或合法性。",
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
                text: "与 Agora 相关的所有知识产权，包括但不限于专利、商标、商号、版权、商业秘密、专有数据、专有技术、精神权利、数据库权利、设计权、算法、软件、计算机代码、可视化界面和任何其他专有权利（无论注册或未注册）均由 Agora 拥有或许可。这还包括根据任何司法管辖区的法律申请注册此类知识产权的任何申请或权利。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "严禁未经授权使用、复制、修改、分发或利用 Agora 的知识产权。这包括但不限于逆向工程软件、销售专有材料或未经 Agora 事先书面许可使用任何专有内容。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "任何侵犯这些知识产权的行为都可能导致法律诉讼。 Agora 保留本条款中未明确授予的所有权利。",
              },
            ],
          },
        ],
      },
      {
        heading: "8. 服务的终止",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "您可以随时以任何理由通过删除您的帐户并停止使用所有服务来终止这些条款。如果您在未停用帐户的情况下停止使用服务，您的帐户可能会因长时间不活动而被停用。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "本条款或您的帐户终止后，以下部分将继续有效：",
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
                    text: "4.您的内容，",
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
                    text: "9. 免责声明和责任限制，",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "10. 赔偿",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "14. 杂项。",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "如何删除您的帐户：",
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
                    text: "如果您使用 Rarimo（护照验证）验证了您的帐户，则在继续删除之前，您必须生成仅包含无效符（不包括国籍和性别）的新证明。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "如果您仅使用电话号码验证帐户，则必须重新验证电话号码以确认并完成帐户删除。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "成功后，您的帐户将在 30 天内被删除。",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "要删除护照证明（如果已输入电话号码）但保留您的帐户：",
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
                    text: "使用 Rarimo 生成新证明：",
                    kind: "strong",
                  },
                  {
                    text: " 您需要创建一个新的验证证明，但这次它将仅包含您的无效符，而不包含您的国籍或性别。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "确认删除：",
                    kind: "strong",
                  },
                  {
                    text: " 一旦确认，您之前的护照证明，包括国籍和性别，将被永久删除。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "即使您删除帐户，一些加密记录仍将被保留，以确保责任：",
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
                    text: "用于删除的零知识证明（ZKP），仅包含无效符和密码数据（不包含国籍或性别）。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "用户控制授权网络 (UCAN) 证明签署此 ZKP，验证来自您设备的请求。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "UCAN 证明确认删除请求，确保请求得到正确处理。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "这些加密记录的存在是为了向第三方审计员证明 Agora 没有审查帐户或数据，而是仅根据用户请求删除信息。这确保了系统的透明度和信任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora保留暂停或终止违反本条款的账户的权利。",
              },
            ],
          },
        ],
      },
      {
        heading: "9. 免责声明和责任限制",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "服务按“原样”提供，不提供任何形式的保证。 Agora 不做出任何形式的陈述或保证，无论是明示的、暗示的、法定的还是其他形式，包括但不限于适销性、特定用途的适用性、不侵权或服务的可用性的保证。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 不保证服务无错误、不间断、安全或缺陷将得到纠正。用户承担与使用服务相关的所有风险。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "在法律允许的最大范围内，Agora 不对因您使用服务而产生的或与之相关的任何间接、偶然、后果性、惩罚性或特殊损害负责，无论是基于合同、侵权、严格责任还是任何其他法律理论，即使 Agora 已被告知发生此类损害的可能性。这包括但不限于利润损失、数据丢失、人身伤害、财产损失或业务中断。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "某些司法管辖区不允许排除或限制某些损害，因此其中一些限制可能对您不适用。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "虽然Agora实施零知识证明（ZKP）技术来增强隐私和安全性，但用户承认没有任何技术是绝对可靠的。 ZKP 的实施中可能存在不可预见的漏洞或缺陷，可能导致未经授权的数据泄露或隐私泄露。 Agora对ZKP的绝对安全性或可靠性不做任何保证，并对因使用其而产生的任何意外后果不承担任何责任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "我们鼓励用户采取额外的预防措施，例如使用 Tor 等匿名工具来掩盖他们的 IP 地址，避免在写作中分享过多的个人信息，并注意写作风格和共享属性，这些属性可能会通过与护照和其他记录的行为相关联而无意中泄露他们的身份。",
              },
            ],
          },
        ],
      },
      {
        heading: "10. 赔偿",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "除法律禁止的情况外，您同意为 Agora、其关联公司及其各自的董事、管理人员、员工、代理、承包商、第三方服务提供商和许可方辩护、赔偿并使其免受因以下原因引起或与之相关的任何索赔、要求、责任、损害、损失和开支（包括法律费用和成本）：",
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
                    text: "您对 Agora 及其服务的使用；",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您违反这些条款；",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您违反任何适用的法律或法规；或者",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您在 Agora 上提交、发布或分享的任何内容。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 保留对您需要赔偿我们的任何事项的辩护进行控制的权利，并且您同意充分配合我们对此类索赔的辩护。即使您终止或暂停使用 Agora 及其服务，您的赔偿义务仍将继续有效。",
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
                text: "只要有可能，这些条款的规定应按照适用法律有效且可执行的方式进行解释。但是，如果发现这些条款的一项或多项规定全部或部分无效、非法或无法执行，则任何此类规定和这些条款的其余部分不应受到影响，并应继续完全有效，就好像此类无效、非法或无法执行的规定从未包含在本条款中一样。",
              },
            ],
          },
        ],
      },
      {
        heading: "12. 适用法律和争议解决",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "这些条款，包括与其有效性、解释、执行、履行或终止相关的任何问题，以及因侵权索赔、合同前义务或合同外责任引起的任何争议，均应受法国法律管辖并根据法国法律解释。适用于法国以外任何司法管辖区法律的任何其他法律选择原则或法律冲突规则均不产生任何影响。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "我们希望您在 Agora 上获得积极的体验。如果您有任何问题或争议，您同意首先尝试以非正式方式与我们解决。如果您有任何反馈或疑虑，可以通过以下方式联系我们： ",
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
                text: "任何无法非正式解决的争议均受塞纳河畔纳伊法院的专属管辖。",
              },
            ],
          },
        ],
      },
      {
        heading: "13. 这些条款的变更",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 可能会不时更新这些条款，以反映我们的服务、法律要求或其他运营需求的变化。如果我们进行重大修改，我们将通过应用内通知、横幅或提示来通知用户，要求用户在更改生效之前进行确认。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "在修订后的条款生效后继续访问或使用Agora，即表示您同意受更新后的条款的约束。如果您不同意修改，您必须在修改生效前停止使用Agora。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "我们鼓励用户在使用 Agora 时定期查看这些条款，以了解自己的权利和义务。",
              },
            ],
          },
        ],
      },
      {
        heading: "14. 其他",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "这些条款与隐私政策一起构成管理您访问和使用 Agora 的完整协议。我们未能行使或执行这些条款下的任何权利或规定不应被视为放弃此类权利或规定。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "如果发现这些条款的任何条款无效或无法执行，则应在允许的最大范围内执行该条款，其余条款应继续完全有效。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "未经我们事先同意，您不得转让或转移您在这些条款下的任何权利或义务。但是，我们保留不受限制地自由转让我们在这些条款下的权利和义务的权利。",
              },
            ],
          },
        ],
      },
      {
        heading: "15. 联系方式",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "如果对这些条款有疑问或疑虑，请通过以下方式联系我们： ",
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
                text: "通过使用 Agora，您承认并同意这些条款以及任何未来的修改。",
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
    automatedTranslationNoticeTitle: "自動翻譯聲明",
    automatedTranslationNotice:
      "本譯文由自動翻譯產生。如有任何差異、不一致或衝突，應僅以英文版本為準，英文版本為權威版本。",
    viewAuthoritativeEnglishVersion: "查看具權威性的英文版本",
    returnToTranslatedVersion: "返回譯文",
    lastUpdatedLabel: "最後更新於",
    lastUpdatedDate: "2025/10/07（年/月/日）",
    introduction: [
      {
        text: "歡迎來到Agora Citizen Network（“Agora”）！這些條款和條件（「條款」）管轄您對 Agora 平台的存取和使用，包括我們的網站、行動應用程式和其他服務（統稱為「服務」）。透過存取或使用服務，您同意受這些條款的約束。如果您不同意，您不得存取或使用本服務。",
      },
    ],
    sections: [
      {
        heading: "1. 您對服務的訪問",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora僅適用於16歲或以上的用戶。透過使用 Agora，您確認您符合此年齡要求，並且您已超過您居住國家/地區法律規定的存取和使用服務所需的最低年齡。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "您無需建立帳戶即可瀏覽 Agora。但是，要參與討論並與內容（「內容」）互動，您可能需要使用以下方法之一進行註冊：",
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
                    text: "透過電話號碼登入（透過一次性代碼驗證）",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "透過第三方驗證應用程式（Rarimo、Zupass）的加密證明登錄，該應用程式使用零知識證明（ZKP）驗證您的身分。這些方法可確保您的身分得到驗證，同時維護隱私。 Agora 僅收到確認唯一性和資格的加密證明，而不是基礎身分文件或票據資訊。請注意，無法透過以下方式註冊 ",
                  },
                  {
                    text: "Rarimo",
                    kind: "link",
                    href: "https://rarimo.com/general-terms.html",
                    external: true,
                  },
                  {
                    text: " 如果您未滿 18 歲。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "若出現以下情況，您不得使用本服務：",
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
                    text: "您已被暫停或從 Agora 中除名。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您所在司法管轄區法律禁止您使用本服務。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "除非您的法定監護人已審閱並同意這些條款，否則您無法與 Agora 簽訂具有約束力的合同，或者如果您未滿您所在司法管轄區的法定成年年齡。",
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
                text: "Agora 的隱私權政策解釋了我們如何收集、使用和保護您的個人資料。使用服務即表示您同意依照隱私權政策中的規定收集和處理您的資訊。欲了解更多詳情，請訪問 ",
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
        heading: "3. 您對服務的使用",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "根據本條款，Agora 授予您非獨佔、不可轉讓、可撤銷的服務使用許可。你不能：",
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
                    text: "使用 Agora 傳播錯誤訊息、仇恨言論或騷擾。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "從事非法活動。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "參與或宣揚欺詐活動、騙局或欺騙行為。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "散播或宣傳色情、暴力或其他不當內容。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "使用 Agora 追蹤、恐嚇或威脅個人或團體。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "試圖操縱或利用 Agora 的平台、演算法或功能來獲取個人或商業利益。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "從事鼓勵自殘、自殺或任何形式的危險活動。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "侵害智慧財產權，包括未經授權散佈受版權保護的資料。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "授權、出售、轉讓、轉讓、散佈、託管或以其他方式商業利用服務或內容",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "嘗試破解、破壞或逆向工程 Agora 的基礎設施。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "使用自動化工具來抓取或擷取內容。",
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
                    text: "分享或散佈惡意軟體、網路釣魚嘗試或詐騙計畫。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "未經同意披露個人或敏感訊息，侵犯其他使用者的隱私，包括但不限於未經明確許可共享個人地址、電話號碼、財務詳細資訊或任何私人通訊。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora保留隨時修改或刪除功能的權利，恕不另行通知。未來對服務的任何增強、更新或添加都將受這些條款的約束，這些條款可能會定期修訂。您承認，Agora 不對您或任何第三方對服務或其任何元件的任何修改、暫停或終止承擔責任。",
              },
            ],
          },
        ],
      },
      {
        heading: "4.您的內容",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "服務可能包含各種類型的內容，包括文字、連結、圖像、影片、音訊和使用者提交的其他資料（「內容」）。 Agora 不保證任何內容的準確性、完整性或可靠性，且不承擔任何責任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "透過提交內容，您確認您擁有共享該內容的所有必要權利，且該內容不違反任何適用的法律或第三方權利。您對您的內容以及在 Agora 上分享該內容所產生的任何後果承擔全部責任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "透過使用本服務，您保留對內容的所有權，但授予 Agora 全球範圍內的、非排他性的、免版稅的、永久的和可再許可的許可，以出於平台功能、合規性和運營目的存儲、使用、修改、分發和顯示您的內容。這包括 Agora 讓您的內容可供第三方合作夥伴聯合、分發、聚合或發布的權利。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "若內容違反本條款、適用法律或平台政策，Agora 保留自行決定刪除或限制內容的權利。",
              },
            ],
          },
        ],
      },
      {
        heading: "5. 內容和審核政策",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "您不得發布以下內容：",
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
                    text: "宣揚暴力或非法活動。",
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
                    text: "傳播錯誤訊息或操縱性內容。",
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
                text: "Agora 採用基於使用者報告、自動偵測和 ",
              },
              {
                text: "社群守則",
                kind: "link",
                href: "/legal/guidelines",
              },
              {
                text: "。違反本條款的內容可能會被移除，屢次違規者可能會遭到停權或封禁。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "若要通報非法內容或解決審核和法律問題，請透過以下方式聯絡我們： ",
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
        heading: "6. 第三方內容和廣告",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 可能包含第三方網站、產品或服務的鏈接，這些鏈接可能由廣告商、合作夥伴、附屬公司或其他用戶共享（「第三方內容」）。 Agora 不控制、認可此類外部來源的準確性、合法性或可靠性，也不承擔任何責任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "存取或參與第三方內容的風險由您自行承擔，我們鼓勵您在與外部來源互動或完成交易之前查看任何相關條款、政策或條件。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 可能會顯示廣告或贊助內容。廣告的類型、目標和頻率可能會發生變化，我們保留在 Agora 上提供的任何內容或服務中投放廣告的權利。您與贊助內容或廣告的互動完全由您自行承擔風險，我們不保證任何廣告產品或服務的準確性、品質或合法性。",
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
                text: "與 Agora 相關的所有智慧財產權，包括但不限於專利、商標、商號、著作權、營業秘密、專有資料、專有技術、人格權、資料庫權利、設計權、演算法、軟體、電腦程式碼、視覺介面及任何其他專有權利，無論是否註冊，均由 Agora 擁有或取得授權。這也包括依任何司法管轄區法律申請註冊此類智慧財產權的任何申請或權利。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "嚴禁未經授權使用、複製、修改、散佈或利用 Agora 的智慧財產權。這包括但不限於逆向工程軟體、銷售專有資料或未經 Agora 事先書面許可使用任何專有內容。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "任何侵犯這些智慧財產權的行為都可能導致法律訴訟。 Agora 保留本條款中未明確授予的所有權利。",
              },
            ],
          },
        ],
      },
      {
        heading: "8. 服務的終止",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "您可以隨時以任何理由透過刪除您的帳戶並停止使用所有服務來終止這些條款。如果您在未停用帳戶的情況下停止使用本服務，您的帳戶可能會因長時間不活動而停用。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "本條款或您的帳戶終止後，以下部分將繼續有效：",
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
                    text: "3. 您對服務的使用，",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "4.您的內容，",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "8. 服務終止，",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "9. 免責聲明和責任限制，",
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
                    text: "14. 雜項。",
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
                    text: "如果您使用 Rarimo（護照驗證）驗證了您的帳戶，則在繼續刪除之前，您必須產生僅包含無效符（不包括國籍和性別）的新證明。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "如果您僅使用電話號碼驗證帳戶，則必須重新驗證電話號碼以確認並完成帳戶刪除。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "成功後，您的帳戶將在 30 天內被刪除。",
                  },
                ],
              },
            ],
          },
          {
            type: "subheading",
            content: [
              {
                text: "要刪除護照證明（如果已輸入電話號碼）但保留您的帳戶：",
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
                    text: "使用 Rarimo 產生新證明：",
                    kind: "strong",
                  },
                  {
                    text: " 您需要建立一個新的驗證證明，但這次它將只包含您的無效符，而不包含您的國籍或性別。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "確認刪除：",
                    kind: "strong",
                  },
                  {
                    text: " 一旦確認，您之前的護照證明，包括國籍和性別，將永久刪除。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "即使您刪除帳戶，某些加密記錄仍將被保留，以確保責任：",
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
                    text: "用於刪除的零知識證明（ZKP），僅包含無效符號和密碼資料（不包含國籍或性別）。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "使用者控制授權網路 (UCAN) 證明簽署此 ZKP，驗證來自您裝置的請求。",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "UCAN 證明確認刪除要求，確保請求得到正確處理。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "這些加密記錄的存在是為了向第三方審計員證明 Agora 沒有審查帳戶或數據，而是僅根據用戶請求刪除資訊。這確保了系統的透明度和信任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora保留暫停或終止違反本條款的帳戶的權利。",
              },
            ],
          },
        ],
      },
      {
        heading: "9. 免責聲明和責任限制",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "服務以「現況」提供，不提供任何形式的保證。 Agora 不做出任何形式的陳述或保證，無論是明示的、暗示的、法定的或其他形式，包括但不限於適銷性、特定用途的適用性、不侵權或服務的可用性的保證。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 不保證服務無錯誤、不間斷、安全或缺陷將會修正。使用者承擔與使用服務相關的所有風險。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "在法律允許的最大範圍內，Agora 不對因您使用服務而產生的或與之相關的任何間接、偶然、後果性、懲罰性或特殊損害負責，無論是基於合約、侵權、嚴格責任或任何其他法律理論，即使 Agora 已被告知發生此類損害的可能性。這包括但不限於利潤損失、資料遺失、人身傷害、財產損失或業務中斷。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "某些司法管轄區不允許排除或限制某些損害，因此其中一些限制可能不適用於您。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "雖然Agora實施零知識證明（ZKP）技術來增強隱私和安全性，但使用者承認沒有任何技術是絕對可靠的。 ZKP 的實施中可能存在不可預見的漏洞或缺陷，可能導致未經授權的資料外洩或隱私外洩。 Agora對ZKP的絕對安全性或可靠性不做任何保證，並對因使用其而產生的任何意外後果不承擔任何責任。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "我們鼓勵使用者採取額外的預防措施，例如使用 Tor 等匿名工具來掩蓋他們的 IP 位址，避免在寫作中分享過多的個人信息，並注意寫作風格和共享屬性，這些屬性可能會透過與護照和其他記錄的行為相關聯而無意中洩露他們的身份。",
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
                text: "除法律禁止的情況外，您同意為 Agora、其關聯公司及其各自的董事、管理人員、員工、代理商、承包商、第三方服務提供者和授權人辯護、賠償並使其免受因以下原因引起或與之相關的任何索賠、要求、責任、損害、損失和開支（包括法律費用和成本）：",
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
                    text: "您對 Agora 及其服務的使用；",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您違反這些條款；",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您違反任何適用的法律或法規；或者",
                  },
                ],
              },
              {
                content: [
                  {
                    text: "您在 Agora 上提交、發佈或分享的任何內容。",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 保留對您需要賠償我們的任何事項的辯護進行控制的權利，並且您同意充分配合我們對此類索賠的辯護。即使您終止或暫停使用 Agora 及其服務，您的賠償義務仍將繼續有效。",
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
                text: "只要有可能，這些條款的規定應依照適用法律有效且可執行的方式進行解釋。但是，如果發現這些條款的一項或多項規定全部或部分無效、非法或無法執行，則任何此類規定和這些條款的其餘部分不應受到影響，並應繼續完全有效，就好像此類無效、非法或無法執行的規定從未包含在本條款中一樣。",
              },
            ],
          },
        ],
      },
      {
        heading: "12. 適用法律和爭議解決",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "這些條款，包括與其有效性、解釋、執行、履行或終止相關的任何問題，以及因侵權索賠、合約前義務或合約外責任引起的任何爭議，均應受法國法律管轄並根據法國法律解釋。適用於法國以外任何司法管轄區法律的任何其他法律選擇原則或法律衝突規則均不產生任何影響。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "我們希望您在 Agora 上獲得積極的體驗。如果您有任何問題或爭議，您同意先嘗試以非正式方式與我們解決。如果您有任何回饋或疑慮，可以透過以下方式與我們聯繫： ",
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
                text: "任何無法非正式解決的爭議均受塞納河畔納伊法院的專屬管轄。",
              },
            ],
          },
        ],
      },
      {
        heading: "13. 這些條款的變更",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "Agora 可能會不時更新這些條款，以反映我們的服務、法律要求或其他營運需求的變更。如果我們進行重大修改，我們將透過應用程式內通知、橫幅或提示來通知用戶，要求用戶在更改生效之前進行確認。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "在修訂後的條款生效後繼續存取或使用Agora，即表示您同意受更新後的條款的約束。如果您不同意修改，您必須在修改生效前停止使用Agora。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "我們鼓勵使用者在使用 Agora 時定期查看這些條款，以了解自己的權利和義務。",
              },
            ],
          },
        ],
      },
      {
        heading: "14. 其他",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "這些條款與隱私權政策一起構成管理您存取和使用 Agora 的完整協議。我們未行使或執行這些條款下的任何權利或規定不應被視為放棄此類權利或規定。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "如果發現這些條款的任何條款無效或無法執行，則應在允許的最大範圍內執行該條款，其餘條款應繼續完全有效。",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                text: "未經我們事先同意，您不得轉讓或轉移您在本條款下的任何權利或義務。但是，我們保留不受限制地自由轉讓我們在這些條款下的權利和義務的權利。",
              },
            ],
          },
        ],
      },
      {
        heading: "15. 聯絡方式",
        blocks: [
          {
            type: "paragraph",
            content: [
              {
                text: "如果對這些條款有疑問或疑慮，請透過以下方式與我們聯絡： ",
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
                text: "透過使用 Agora，您承認並同意這些條款以及任何未來的修改。",
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
