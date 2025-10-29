<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: true,
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: true,
    }"
  >
    <template #header>
      <StandardMenuBar :title="t('termsOfService')" :center-content="true" />
    </template>

    <article class="terms-content">
      <p><strong>Last updated on</strong>: 2025/10/07 (YYYY/MM/DD)</p>

      <p>
        Welcome to Agora Citizen Network ("Agora")! These Terms and Conditions
        ("Terms") govern your access to and use of the Agora platform, including
        our website, mobile applications and other services (collectively, the
        "Services"). By accessing or using the Services, you agree to be bound
        by these Terms. If you do not agree, you may not access or use the
        Services.
      </p>

      <section>
        <h2>1. Your access to the services</h2>
        <p>
          Agora is only available to users aged 16 years or older. By using
          Agora, you confirm that you meet this age requirement and that you are
          over the minimum age required by the laws of your country of residence
          to access and use the Services.
        </p>
        <p>
          You are not required to create an account to browse Agora. However, to
          participate in discussions and interact with content ("Content"), you
          may need to register using one of the following methods:
        </p>
        <ul>
          <li>Log-in via phone number (verified through a one-time code)</li>
          <li>
            Log-in via cryptographic proof from a third-party verification app
            (RariMe), which verifies your identity using a passport-based
            Zero-Knowledge Proof (ZKP). This method ensures that your identity
            is validated while maintaining privacy. Agora does not have access
            to your passport details, only the cryptographic proof confirming
            uniqueness and eligibility. Note that is not possible to register
            via
            <a
              href="https://rarime.com/general-terms.html"
              target="_blank"
              rel="noopener"
              >RariMe</a
            >
            if you're not 18 years or older.
          </li>
        </ul>
        <p>You must not use the Services if:</p>
        <ul>
          <li>You have been suspended or removed from Agora.</li>
          <li>
            You are legally prohibited from using the Services in your
            jurisdiction.
          </li>
          <li>
            You cannot form a binding contract with Agora, or if you are under
            the age of majority in your jurisdiction, unless your legal guardian
            has reviewed and agreed to these Terms.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Privacy Policy</h2>
        <p>
          Agora's Privacy Policy explains how we collect, use and protect your
          personal data. By using the Services, you consent to the collection
          and processing of your information as described in the Privacy Policy.
          For more details, visit the
          <a href="/legal/privacy">Agora Privacy Policy</a>.
        </p>
      </section>

      <section>
        <h2>3. Your use of the services</h2>
        <p>
          Subject to these Terms, Agora grants you a non-exclusive,
          non-transferable, revocable license to use the Services. You may not:
        </p>
        <ul>
          <li>
            Use Agora to spread misinformation, hate speech or harassment.
          </li>
          <li>Engage in illegal activities.</li>
          <li>
            Engage in or promote fraudulent activities, scams or deceptive
            practices.
          </li>
          <li>
            Distribute or promote sexually explicit, violent or otherwise
            inappropriate content.
          </li>
          <li>
            Use Agora to stalk, intimidate or threaten individuals or groups.
          </li>
          <li>
            Attempt to manipulate or exploit Agora's platform, algorithms or
            features for personal or commercial gain.
          </li>
          <li>
            Engage in activities that encourage self-harm, suicide or any form
            of endangerment.
          </li>
          <li>
            Violate intellectual property rights, including unauthorized
            distribution of copyrighted material.
          </li>
          <li>
            License, sell, transfer, assign, distribute, host or otherwise
            commercially exploit the Services or Content
          </li>
          <li>
            Attempt to hack, disrupt, or reverse-engineer Agora's
            infrastructure.
          </li>
          <li>Use automated tools to scrape or extract content.</li>
          <li>Impersonate another user, entity or organization.</li>
          <li>
            Share or distribute malicious software, phishing attempts or
            fraudulent schemes.
          </li>
          <li>
            Violate the privacy of other users by disclosing personal or
            sensitive information without consent, including but not limited to
            sharing personal addresses, phone numbers, financial details, or any
            private communications without explicit permission.
          </li>
        </ul>
        <p>
          Agora retains the right to modify or remove features at any time
          without prior notice. Any future enhancements, updates, or additions
          to the Services will be governed by these Terms, which may be revised
          periodically. You acknowledge that Agora is not liable to you or any
          third party for any modifications, suspensions or discontinuations of
          the Services or any of their components.
        </p>
      </section>

      <section>
        <h2>4. Your Content</h2>
        <p>
          The Services may contain various types of content, including text,
          links, images, videos, audio, and other materials submitted by users
          ("Content"). Agora does not guarantee the accuracy, completeness or
          reliability of any Content and assumes no responsibility for it.
        </p>
        <p>
          By submitting Content, you confirm that you have all necessary rights
          to share it and that it does not violate any applicable laws or
          third-party rights. You are solely responsible for your content and
          any consequences arising from sharing it on Agora.
        </p>
        <p>
          By using the Services, you retain ownership of your content but grant
          Agora a worldwide, non-exclusive, royalty-free, perpetual and
          sublicensable license to store, use, modify, distribute and display
          your content for platform functionality, compliance and operational
          purposes. This includes the right for Agora to make your Content
          available for syndication, distribution, aggregation or publication by
          third-party partners.
        </p>
        <p>
          Agora reserves the right to remove or restrict content at its
          discretion if it violates these Terms, applicable laws or platform
          policies.
        </p>
      </section>

      <section>
        <h2>5. Content and moderation policies</h2>
        <p>You may not post Content that:</p>
        <ul>
          <li>Promotes violence or illegal activities.</li>
          <li>Contains hate speech, harassment or personal attacks.</li>
          <li>Spreads misinformation or manipulative content.</li>
          <li>Violates intellectual property rights.</li>
        </ul>
        <p>
          Agora employs a content moderation system based on user reports,
          automated detection and
          <a href="/legal/guidelines">Community Guidelines</a>. Content
          violating these Terms may be removed and repeat offenders may face
          suspension or bans.
        </p>
        <p>
          To report illegal content or address moderation and legal concerns,
          please reach out to us at
          <a href="mailto:legal@zkorum.com">legal@zkorum.com</a>.
        </p>
      </section>

      <section>
        <h2>6. Third party content and advertisements</h2>
        <p>
          Agora may contain links to third-party websites, products, or
          services, which may be shared by advertisers, partners, affiliates or
          other users ("Third Party Content"). Agora does not control, endorse
          or assume any responsibility for the accuracy, legality or reliability
          of such external sources.
        </p>
        <p>
          Accessing or engaging with Third Party Content is at your own risk and
          we encourage you to review any relevant terms, policies or conditions
          before interacting with external sources or completing transactions.
        </p>
        <p>
          Agora may display advertisements or sponsored content. The type,
          targeting and frequency of advertisements may change, and we reserve
          the right to place advertisements in connection with any content or
          services provided on Agora. Your interactions with sponsored content
          or advertisements are solely at your own risk, and we do not guarantee
          the accuracy, quality, or legitimacy of any advertised products or
          services.
        </p>
      </section>

      <section>
        <h2>7. Intellectual property</h2>
        <p>
          All intellectual property associated with Agora, including but not
          limited to patents, trademarks, trade names, copyrights, trade
          secrets, proprietary data, know-how, moral rights, database rights,
          design rights, algorithms, software, computer code, visual interfaces
          and any other proprietary rights—whether registered or
          unregistered—are owned or licensed by Agora. This also includes any
          applications or rights to apply for registration of such intellectual
          property under the laws of any jurisdiction.
        </p>
        <p>
          Unauthorized use, reproduction, modification, distribution, or
          exploitation of Agora's intellectual property is strictly prohibited.
          This includes, but is not limited to, reverse-engineering software,
          selling proprietary materials or using any proprietary content without
          prior written permission from Agora.
        </p>
        <p>
          Any infringement of these intellectual property rights may result in
          legal action. Agora reserves all rights not explicitly granted under
          these Terms.
        </p>
      </section>

      <section>
        <h2>8. Termination of the services</h2>
        <p>
          You may terminate these Terms at any time and for any reason by
          deleting your Account and discontinuing use of all Services. If you
          stop using the Services without deactivating your Account, your
          Account may be deactivated due to prolonged inactivity.
        </p>
        <p>
          The following sections will survive any termination of these Terms or
          of your Account:
        </p>
        <ul>
          <li>3. Your use of the Services,</li>
          <li>4. Your Content,</li>
          <li>8. Termination of the Services,</li>
          <li>9. Disclaimers and limitation liability,</li>
          <li>10. Indemnity</li>
          <li>14. Miscellaneous.</li>
        </ul>

        <h3>How to delete your account:</h3>
        <ul>
          <li>
            If you verified your account using RariMe (passport verification),
            you must generate a new proof containing only the nullifier
            (excluding nationality and sex) before proceeding with deletion.
          </li>
          <li>
            If you verified your account using only a phone number, you must
            re-verify your phone number to confirm and complete the account
            deletion.
          </li>
          <li>Upon success, your account will be deleted within 30 days.</li>
        </ul>

        <h3>
          To delete the passport proof (if a phone number has already been
          entered) but keep your account:
        </h3>
        <ol>
          <li>
            <strong>Generate a new proof with RariMe:</strong> You'll need to
            create a fresh verification proof, but this time it will contain
            only your nullifier and not your nationality or sex.
          </li>
          <li>
            <strong>Confirm the deletion:</strong> Once confirmed, your previous
            passport proof, including nationality and sex, will be permanently
            deleted.
          </li>
        </ol>

        <p>
          Some cryptographic records will still be kept, even if you delete your
          account, to ensure accountability:
        </p>
        <ul>
          <li>
            The Zero-Knowledge Proof (ZKP) used for deletion, which contains
            only the nullifier and cryptographic data (not nationality or sex).
          </li>
          <li>
            The User Controlled Authorization Network (UCAN) proof that signs
            this ZKP, verifying the request from your device.
          </li>
          <li>
            The UCAN proof confirming the deletion request, ensuring that the
            request was processed correctly.
          </li>
        </ul>
        <p>
          These cryptographic records exist to prove to third-party auditors
          that Agora did not censor accounts or data but rather deleted the
          information only upon user request. This ensures transparency and
          trust in the system.
        </p>
        <p>
          Agora reserves the right to suspend or terminate accounts that violate
          these Terms.
        </p>
      </section>

      <section>
        <h2>9. Disclaimers and limitation of liability</h2>
        <p>
          The Services are provided "as is" without warranties of any kind.
          Agora makes no representations or warranties of any kind, whether
          express, implied, statutory or otherwise, including but not limited to
          warranties of merchantability, fitness for a particular purpose,
          non-infringement or availability of the Services.
        </p>
        <p>
          Agora does not warrant that the Services will be error-free,
          uninterrupted, secure or that defects will be corrected. Users assume
          all risks associated with the use of the Services.
        </p>
        <p>
          To the fullest extent permitted by law, Agora is not responsible for
          any indirect, incidental, consequential, punitive or special damages
          arising out of or related to your use of the Services, whether based
          on contract, tort, strict liability or any other legal theory, even if
          Agora has been advised of the possibility of such damages. This
          includes, but is not limited to, damages for lost profits, loss of
          data, personal injury, property damage or business interruption.
        </p>
        <p>
          Some jurisdictions do not allow the exclusion or limitation of certain
          damages, so some of these limitations may not apply to you.
        </p>
        <p>
          While Agora implements Zero-Knowledge Proof (ZKP) technology to
          enhance privacy and security, users acknowledge that no technology is
          infallible. There may be unforeseen vulnerabilities or flaws in the
          implementation of ZKP that could potentially lead to unauthorized data
          exposure or privacy breaches. Agora makes no guarantees regarding the
          absolute security or reliability of ZKP and assumes no liability for
          any unintended consequences arising from its use.
        </p>
        <p>
          Users are encouraged to take additional precautions, such as using
          anonymity tools like Tor to mask their IP address, avoiding sharing
          excessive personal information in their writing, and being mindful of
          writing styles and shared attributes that could inadvertently reveal
          their identity through correlation with their passport and other
          recorded actions.
        </p>
      </section>

      <section>
        <h2>10. Indemnity</h2>
        <p>
          Except where prohibited by law, you agree to defend, indemnify and
          hold harmless Agora, its affiliates, and their respective directors,
          officers, employees, agents, contractors, third-party service
          providers, and licensors from and against any claims, demands,
          liabilities, damages, losses and expenses (including legal fees and
          costs) arising out of or related to:
        </p>
        <ol type="a">
          <li>your use of Agora and its Services;</li>
          <li>your violation of these Terms;</li>
          <li>your violation of any applicable laws or regulations; or</li>
          <li>any Content you submit, post, or share on Agora.</li>
        </ol>
        <p>
          Agora reserves the right to assume control of the defense of any
          matter for which you are required to indemnify us, and you agree to
          cooperate fully with our defense of such claims. Your indemnification
          obligations will survive any termination or suspension of your use of
          Agora and its Services.
        </p>
      </section>

      <section>
        <h2>11. Severability</h2>
        <p>
          Whenever possible, the provisions of these Terms shall be interpreted
          in such a manner as to be valid and enforceable under the governing
          law. However, if one or more provisions of these Terms are found to be
          invalid, illegal or unenforceable, in whole or in part, the remainder
          of any such provision and of these Terms shall not be affected and
          shall continue in full force and effect as if such invalid, illegal,
          or unenforceable provision had never been contained herein.
        </p>
      </section>

      <section>
        <h2>12. Governing law and dispute resolution</h2>
        <p>
          These Terms, including any issues related to their validity,
          interpretation, enforcement, performance, or termination, as well as
          any disputes arising from tort claims, pre-contractual obligations, or
          extra-contractual liability, shall be governed by and construed in
          accordance with the laws of France. No effect shall be given to any
          other choice of law principles or conflict-of-laws rules that would
          apply the laws of any jurisdiction other than France.
        </p>
        <p>
          We want you to have a positive experience on Agora. If you have any
          issues or disputes, you agree to first attempt to resolve them with us
          informally. You can reach out to us with any feedback or concerns at
          <a href="mailto:legal@zkorum.com">legal@zkorum.com</a>.
        </p>
        <p>
          Any disputes that cannot be resolved informally shall be subject to
          the exclusive jurisdiction of the courts of Neuilly Sur Seine.
        </p>
      </section>

      <section>
        <h2>13. Changes to these Terms</h2>
        <p>
          Agora may update these Terms from time to time to reflect changes in
          our services, legal requirements, or other operational needs. If we
          make significant modifications, we will notify users through in-app
          notifications, banners or prompts requiring acknowledgment before the
          changes take effect.
        </p>
        <p>
          By continuing to access or use Agora after the revised Terms take
          effect, you agree to be bound by the updated Terms. If you do not
          agree to the modifications, you must discontinue your use of Agora
          before the changes become effective.
        </p>
        <p>
          We encourage users to review these Terms regularly to stay informed
          about their rights and obligations when using Agora.
        </p>
      </section>

      <section>
        <h2>14. Miscellaneous</h2>
        <p>
          These Terms, along with the Privacy Policy, constitute the entire
          agreement governing your access to and use of Agora. Our failure to
          exercise or enforce any right or provision under these Terms shall not
          be considered a waiver of such right or provision.
        </p>
        <p>
          If any provision of these Terms is found to be invalid or
          unenforceable, it shall be enforced to the maximum extent permissible,
          and the remaining provisions shall continue in full force and effect.
        </p>
        <p>
          You may not assign or transfer any of your rights or obligations under
          these Terms without our prior consent. However, we reserve the right
          to freely assign our rights and obligations under these Terms without
          restriction.
        </p>
      </section>

      <section>
        <h2>15. Contact information</h2>
        <p>
          For questions or concerns regarding these Terms, contact us at:
          <a href="mailto:legal@zkorum.com">legal@zkorum.com</a>
        </p>
        <p>
          By using Agora, you acknowledge and agree to these Terms and any
          future modifications.
        </p>
        <address>
          ZKORUM SAS<br />
          99 AVENUE ACHILLE PERETTI<br />
          92200 NEUILLY-SUR-SEINE<br />
          FRANCE
        </address>
      </section>
    </article>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import {
  termsOfServiceTranslations,
  type TermsOfServiceTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<TermsOfServiceTranslations>(
  termsOfServiceTranslations
);
</script>

<style scoped lang="scss">
.terms-content {
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.6;

  h2 {
    margin-top: 2rem;
    margin-bottom: 1rem;
    font-size: 1.5rem;
    font-weight: 600;
  }

  h3 {
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    font-size: 1.2rem;
    font-weight: 600;
  }

  section {
    margin-bottom: 2rem;
  }

  p {
    margin-bottom: 1rem;
  }

  ul,
  ol {
    margin-bottom: 1rem;
    padding-left: 1.5rem;

    li {
      margin-bottom: 0.5rem;
    }
  }

  address {
    font-style: normal;
    margin-top: 1rem;
  }

  a {
    color: $primary;
    text-decoration: underline;

    &:hover {
      opacity: 0.8;
    }
  }
}
</style>
