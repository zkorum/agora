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
      <StandardMenuBar :title="t('privacyPolicy')" :center-content="true" />
    </template>

    <article class="privacy-content">
      <p><strong>Last updated on</strong>: 2025/11/11 (YYYY/MM/DD)</p>

      <p>
        Agora Citizen Network is developed by
        <a
          href="https://www.societe.com/societe/zkorum-984736173.html"
          target="_blank"
          rel="noopener"
          >ZKorum SAS</a
        >. At ZKorum, we believe that privacy is a fundamental right. Our
        mission is to empower users to engage in political and social discourse
        while maintaining control over their identity and personal information.
      </p>

      <p>
        This Privacy Policy explains how and why Agora Citizen Network ("Agora",
        "we", "us" or "ZKorum") collects, uses, and shares information about you
        when you use our website and mobile applications (collectively, the
        "Services") or when you otherwise interact with us. We are responsible
        for the collection and use of your personal data in the manner explained
        in this privacy policy.
      </p>

      <p>
        If you have any questions about this, please contact us by e-mail:
        <a href="mailto:legal@zkorum.com">legal@zkorum.com</a>. If you are a
        California resident, we would like to draw your attention to Article 7.
      </p>

      <section>
        <h2>Agora is a public platform</h2>
        <p>
          Most content on Agora is publicly accessible, meaning your profile,
          posts, votes and opinions can be viewed by anyone, even without an
          account.
        </p>
        <p>
          You are not required to create an account to browse Agora. To
          participate in discussions and interact with content, you can:
        </p>
        <ul>
          <li>
            <strong>Browse as a guest:</strong> You can explore content and
            participate in limited interactions without registering. When you
            first interact with the platform (e.g., posting, voting), a
            device-specific cryptographic identifier (DID) is automatically
            generated and stored on your device, then linked to a user account
            on our servers. This DID serves as a permanent session identifier
            for your device. Guest accounts are not verified and can only be
            accessed from the original device.
          </li>
          <li>
            <strong>Soft login (session-based verification):</strong> Verify
            using
            <a href="https://zupass.org" target="_blank" rel="noopener"
              >Zupass</a
            >
            for event ticket verification using Group Proof of Credentials
            (GPC). This adds temporary event-based verification to your account
            but does NOT create a registered account. Soft login allows you to
            prove event participation without revealing ticket details. You can
            upgrade to a permanent registered account at any time by adding
            phone or passport verification.
          </li>
          <li>
            <strong>Hard login (permanent registered account):</strong> Create a
            permanent verified account using one of the following methods:
            <ul>
              <li>
                <strong>Phone number:</strong> Verified through a one-time code
                sent via SMS
              </li>
              <li>
                <a
                  href="https://rarimo.com/privacy-notice.html"
                  target="_blank"
                  rel="noopener"
                  >Rarimo</a
                >: Passport-based Zero-Knowledge Proof (ZKP) verification
              </li>
            </ul>
            These methods create a registered account and ensure that your
            identity is validated while maintaining privacy. Agora receives only
            cryptographic proofs confirming uniqueness and eligibility, never
            the underlying identity documents or ticket information.
          </li>
        </ul>
        <p>
          <strong>Account upgrades:</strong> When you upgrade from guest or soft
          login to hard verification (phone or passport), all your existing
          content (posts, votes, follows, event verifications) is automatically
          transferred to your verified account, and your previous unverified
          account is deleted. This merge is permanent and cannot be undone. You
          cannot merge two verified accounts for security reasons.
        </p>
        <p>
          Your Agora account will have a username, which can be manually
          selected or automatically generated. Usernames are public but do not
          need to be linked to your real identity. You may also provide optional
          profile details such as preferred topics, which can be modified or
          removed at any time.
        </p>
        <p>
          Most content on Agora Citizen Network is public. When you submit
          content (e.g. a post, opinion or reaction), it is visible to all users
          and may be indexed by search engines. Agora also utilizes
          cryptographic proofs to provide data verifiability, which means
          certain interactions (such as account creation and participation) are
          publicly recorded in a decentralized manner.
        </p>

        <h3>Your Agora profile</h3>
        <p>
          Your Agora profile is public by default and contains information such
          as:
        </p>
        <ul>
          <li>Username</li>
          <li>Unique User Identifier (UUID)</li>
          <li>
            Activity history (posts, opinions, interactions (emojis,
            agree/disagree actions, claps, upvotes/downvotes), poll responses
            and flagged/reported content
          </li>
          <li>Communities and topics of interest</li>
          <li>
            Verification status:
            <ul>
              <li>
                Verified via passport proof (user nullifier & bidirectional
                identity proofs)
              </li>
              <li>
                Verified via phone number (Agora-signed proof binding did:keys
                to user UUID)
              </li>
            </ul>
          </li>
        </ul>
        <p>
          Users have the option to post anonymously. When using this feature,
          usernames and profile pictures are replaced with generic identifiers,
          and content is not linked publicly to the user's profile.
        </p>

        <h3>Third-party services</h3>
        <p>
          Agora uses third-party services that may process IP addresses and
          other personal data. Where possible, Agora configures services to use
          EU regional endpoints or uses EU-based providers. These services have
          their own privacy policies, and users are encouraged to review them.
        </p>
        <ul>
          <li>
            <a
              href="https://rarimo.com/privacy-notice.html"
              target="_blank"
              rel="noopener"
              >Rarimo</a
            >
            (global) for zero-knowledge identity proofs. May process IP
            addresses for security and service operations.
          </li>
          <li>
            <a href="https://zupass.org" target="_blank" rel="noopener"
              >Zupass</a
            >
            (global, open-source) for event ticket and identity verification
            using Group Proof of Credentials (GPC). May process IP addresses
            for service operations. Zupass uses Simple Analytics for
            privacy-friendly web analytics.
          </li>
          <li>
            <a
              href="https://www.twilio.com/en-us/legal/privacy"
              target="_blank"
              rel="noopener"
              >Twilio</a
            >
            (global) for phone number verification. Twilio stores phone numbers
            in cleartext and processes IP addresses for fraud prevention. Note
            that Agora only stores hashed phone numbers (never in cleartext) in
            our database, but Twilio retains phone numbers according to their
            own privacy policy.
          </li>
          <li>
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              target="_blank"
              rel="noopener"
              >Cloudflare</a
            >
            (global) for DDoS protection and security. Processes IP addresses.
          </li>
          <li>
            <a
              href="https://aws.amazon.com/privacy/"
              target="_blank"
              rel="noopener"
              >Amazon Web Services</a
            >
            (EU: Dublin and Paris) for hosting infrastructure, data storage, and
            computing resources. Processes IP addresses for infrastructure
            operations.
          </li>
          <li>
            <a
              href="https://cloud.google.com/terms/cloud-privacy-notice"
              target="_blank"
              rel="noopener"
              >Google Cloud Platform</a
            >
            (U.S. based, us-central1 region) for AI-powered translation of user
            posts and platform-generated content. May process IP addresses for
            infrastructure operations.
          </li>
          <li>
            <a
              href="https://plausible.io/data-policy"
              target="_blank"
              rel="noopener"
              >Plausible Analytics</a
            >
            (EU-based) for privacy-friendly web analytics. Temporarily processes
            IP addresses for visitor counting but does not store them (see their
            data policy for details).
          </li>
          <li>
            <a href="https://sentry.io/privacy/" target="_blank" rel="noopener"
              >Sentry</a
            >
            (EU servers) for error tracking and crash reporting. Processes IP
            addresses for debugging purposes.
          </li>
        </ul>
        <p>
          Services marked as "global" operate with appropriate GDPR safeguards
          as described in Article 3. Users concerned about IP address privacy
          are encouraged to use Tor or other mixnet solutions when accessing
          Agora.
        </p>

        <h3>Cookies and analytics</h3>
        <p>
          Agora does not track users with cookies, nor do we share tracking data
          with third parties. For analytics purposes, Agora uses Plausible
          Analytics, an EU-based solution that does not employ cookies. For more
          details, visit
          <a href="https://plausible.io/about" target="_blank" rel="noopener"
            >Plausible Analytics</a
          >.
        </p>
        <p>
          We only use session/authentication cookies, which are strictly
          necessary for the functioning of the website.
        </p>
      </section>

      <section>
        <h2>1. When does this privacy policy apply?</h2>
        <p>1.1. We collect and use your personal data when you:</p>
        <ul>
          <li>use our website (https://agoracitizen.network/);</li>
          <li>use our mobile app; and</li>
          <li>
            communicate with us by email or any other digital communication
            channel.
          </li>
        </ul>
        <p>
          1.2. This privacy policy may be amended as set forth in Article 8.
        </p>
      </section>

      <section>
        <h2>2. Which personal data do we process and why?</h2>
        <p>
          We will only process your personal data for a specific purpose and to
          the extent permitted by law. We further explain below in which cases
          we collect and use your personal data. If we do not receive your
          personal data directly from you, we will also inform you of this
          below.
        </p>

        <table>
          <thead>
            <tr>
              <th>What personal data?</th>
              <th>Why?</th>
              <th>Legal basis?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong
                  >Device Identifier (DID - Decentralized Identifier)</strong
                >
              </td>
              <td>
                A cryptographic public key (did:key format) generated and stored
                on your device, then linked to your user account on our servers.
                DIDs serve as permanent session identifiers that connect your
                device to your account. DIDs are stored for all users (guest,
                soft login, and hard login) to maintain device-based sessions.
              </td>
              <td>Legitimate interest</td>
            </tr>
            <tr>
              <td>
                <strong>Soft Login - Event Ticket Verification (Zupass)</strong>
              </td>
              <td>
                When you verify using Zupass, we store an event-specific
                nullifier (privacy-preserving identifier derived from your
                ticket) and the event slug. This proves event participation
                without revealing ticket details. Soft login does NOT create a
                registered account but allows session-based verification that can
                be upgraded to permanent registration.
              </td>
              <td>Legitimate interest</td>
            </tr>
            <tr>
              <td>
                <strong>Authentication Data - Phone Number</strong>
              </td>
              <td>
                To authenticate users and deliver one-time verification codes.
                Phone numbers are stored as cryptographic hashes in our
                database. Twilio (our SMS provider) processes and stores phone
                numbers in cleartext to deliver verification codes. Phone
                verification creates a permanent registered account.
              </td>
              <td>Legitimate interest</td>
            </tr>
            <tr>
              <td>
                <strong
                  >Authentication Data - Passport Zero-Knowledge Proof
                  (Rarimo)</strong
                >
              </td>
              <td>
                To verify user eligibility through privacy-preserving passport
                verification. We store a passport-derived nullifier, citizenship
                country code, and sex. Agora receives only the cryptographic
                proof confirming uniqueness and eligibility, never your passport
                number, name, photo, or other passport details. Passport
                verification creates a permanent registered account.
              </td>
              <td>Legitimate interest</td>
            </tr>
            <tr>
              <td>
                <strong>Account Information</strong> (Username, Preferred
                Language, Gender and Nationality (if passport verified))
              </td>
              <td>
                To create and manage user accounts, customize user experience.
                This data will be aggregated for analytics, insights, and
                monetization purposes.
              </td>
              <td>Your consent</td>
            </tr>
            <tr>
              <td>
                <strong>Actions you take</strong> (Posts, Opinions, Replies,
                Reactions, polls)
              </td>
              <td>
                To facilitate discussions, user interactions and engagement on
                the platform. This data will be aggregated for analytics,
                insights, and monetization purposes.
              </td>
              <td>Your consent</td>
            </tr>
            <tr>
              <td><strong>IP address</strong></td>
              <td>
                To safeguard platform infrastructure, prevent malicious
                activities and ensure operational security (e.g. protection
                against Distributed Denial-of-Service (DDoS) attacks).
              </td>
              <td>Legitimate interest</td>
            </tr>
            <tr>
              <td>
                <strong>Pseudonymous Technical Data</strong> (User UUIDs,
                usernames, request metadata, error logs, timestamps)
              </td>
              <td>
                For system monitoring, debugging, performance optimization, and
                improving service reliability. We do NOT log sensitive PII such
                as phone numbers in application logs.
              </td>
              <td>Legitimate interest</td>
            </tr>
            <tr>
              <td>
                <strong>Communication</strong> (Identity and contact details
                provided by you to us, the content of the communication, the
                technical details of the communication itself (e.g. date and
                time)
              </td>
              <td>
                To enable communication between you and us (e.g. when you
                contact us via social media, telephone or email).
              </td>
              <td>
                Our legitimate interest in being able to respond to requests,
                questions or comments or to contact you proactively for
                questions of any kind.
              </td>
            </tr>
            <tr>
              <td><strong>Above-mentioned personal data.</strong></td>
              <td>
                To comply with our legal obligations or to comply with any
                reasonable request from competent police authorities, judicial
                authorities, government institutions or bodies, including
                competent data protection authorities.
              </td>
              <td>Our legal obligation.</td>
            </tr>
            <tr>
              <td><strong>Above-mentioned personal data.</strong></td>
              <td>
                To prevent, detect and combat fraud or other illegal or
                unauthorized activities.
              </td>
              <td>Our legal obligation.</td>
            </tr>
            <tr>
              <td><strong>Above-mentioned personal data.</strong></td>
              <td>To defend ourselves in legal proceedings.</td>
              <td>
                Our legitimate interest in using your personal data in these
                proceedings.
              </td>
            </tr>
            <tr>
              <td><strong>Above-mentioned personal data.</strong></td>
              <td>
                To inform a third party in the context of a possible merger
                with, acquisition of/by or demerger by that third party, even if
                that third party is located outside the EU.
              </td>
              <td>
                Our legitimate interest in entering into business transactions.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Account Upgrade/Merge Data</strong> (User content,
                devices, event tickets, preferences)
              </td>
              <td>
                When you upgrade from guest or soft login to hard verification
                (phone or passport), all your data is transferred to your
                verified account and your previous account is deleted. This
                ensures continuity of your content and activity history while
                adding permanent verification.
              </td>
              <td>Your consent and our legitimate interest.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>3. With whom do we share your personal data?</h2>
        <p>
          3.1. In principle, we do not share your personal data with anyone
          other than the persons who work for us, as well as with the suppliers
          who help us process your personal data. Anyone who has access to your
          personal data will always be bound by strict legal or contractual
          obligations to keep your personal data safe and confidential. This
          means that only the following categories of recipients will receive
          your personal data:
        </p>
        <ul>
          <li>You;</li>
          <li>Our employees and suppliers; and</li>
          <li>
            Government or judicial authorities to the extent that we are obliged
            to share your personal data with them (e.g. tax authorities, police
            or judicial authorities).
          </li>
        </ul>
        <p>
          3.2. We send your personal data outside the European Economic Area
          (EEA) (the European Economic Area consists of the EU, Liechtenstein,
          Norway and Iceland). We will transfer this personal data outside the
          EEA to communicate with the categories of recipients of your personal
          data as defined in this Article 3.
        </p>
        <p>
          3.3. We will apply appropriate safeguards to protect your personal
          data during transfers, such as working only with processors located in
          countries that have an European Commission adequacy decision or are
          certified under an approved framework like the EU-U.S. Data Privacy
          Framework.
        </p>
        <p>
          3.4. If there is no European Commission adequacy decision for the
          destination country, we will use appropriate safeguards, as described
          in Article 46 of the GDPR, when transferring personal data, and such
          transfers and technical and organisational security measures will be
          documented in accordance with Article 30 of the GDPR. For example, we
          use standard contractual clauses to protect the transfer of personal
          data to countries outside the European Economic Area (EEA), thus
          insuring that an equivalent level of data protection applies to your
          personal data even if EU data protection law is not directly
          applicable.
        </p>
        <p>
          3.5. Agora may transfer anonymized and/or aggregated data to
          organizations outside the jurisdiction in which you provide it. Should
          such transfer take place, Agora will ensure that there are safeguards
          in place to ensure the safety and integrity of your data and all
          rights with respect to your personal data you might enjoy under
          applicable mandatory law.
        </p>
      </section>

      <section>
        <h2>4. How long do we keep your personal data?</h2>
        <p>
          4.1. Your personal data will only be processed for as long as
          necessary to achieve the purposes described above or, when we have
          asked you for your consent, until you withdraw your consent.
        </p>
        <p>
          4.2. As a general rule, we will de-identify your personal data when it
          is no longer needed for the purposes described above. However, we
          cannot delete your personal data if there is a legal or regulatory
          obligation or a court or administrative order preventing us from doing
          so.
        </p>
        <p>
          4.3. We retain all personal data collected through our website or
          mobile app, for as long as necessary to protect the legitimate
          interests stated in Article 2 or until your consent is withdrawn.
        </p>
        <p>
          4.4. All personal data we collect through our interactions with you
          through social media, telephone, email or other digital communication
          channels will be retained for as long as necessary to communicate with
          you, but also to maintain a historical record of our communications.
          This allows us to return to previous communications when you come back
          to us with new questions, requests, comments or other input.
        </p>
      </section>

      <section>
        <h2>5. How do we keep your personal data secure?</h2>
        <p>
          5.1. At Agora, safeguarding your personal data is a top priority. We
          have implemented a range of technical and organizational measures to
          ensure that all personal data processed remains secure. These measures
          include:
        </p>
        <ul>
          <li>
            <strong>Data minimization and privacy by design:</strong> We only
            collect the minimum personal data necessary for platform
            functionality, avoiding the storage of sensitive information
            whenever possible.
          </li>
          <li>
            <strong>Encryption and pseudonymization:</strong> Personal data is
            encrypted, and pseudonymization techniques are applied to protect
            user identities. For example, phone numbers are never stored in
            plaintext; instead, we apply a cryptographic "pepper" and hash them
            to prevent unauthorized access.
          </li>
          <li>
            <strong>Zero-knowledge proof authentication:</strong> Agora
            leverages zero-knowledge proofs (ZKP) for passport verification,
            ensuring that users can prove their eligibility without revealing
            sensitive personal information.
          </li>
          <li>
            <strong>Decentralized cryptographic proofs:</strong> Certain user
            interactions (such as account creation and participation) are
            publicly verifiable through cryptographic proofs without revealing
            user identities.
          </li>
          <li>
            <strong>Secure authentication:</strong> We do not store passwords.
            Instead, authentication is handled through one-time verification
            codes or cryptographic keys, reducing the risk of credential leaks.
          </li>
          <li>
            <strong>Infrastructure protection:</strong> Our platform is secured
            against cyber threats using DDoS protection, access controls, and
            network monitoring to detect and mitigate attacks.
          </li>
          <li>
            <strong>Transparency and user control:</strong> Users have the
            ability to manage their personal data, delete their account and
            control how their information is processed.
          </li>
          <li>
            <strong>Regular security evaluations:</strong> Our security measures
            are periodically reviewed and updated to address emerging threats
            and improve data protection.
          </li>
          <li>
            <strong>Controlled access to logs and analytics:</strong> Only
            aggregated and anonymized analytics data is used for performance
            monitoring and improving user experience.
          </li>
          <li>
            <strong>Data redundancy and backups:</strong> Data is securely
            stored on AWS servers in Dublin, Ireland and replicated in Paris,
            France for disaster recovery purposes, with strict access controls
            and encryption measures.
          </li>
          <li>
            <strong>Limited metadata collection:</strong> IP addresses are not
            actively logged or stored by Agora, except as required by Cloudflare
            and cloud service providers for DDoS protection.
          </li>
          <li>
            <strong>Anonymized AI translation:</strong> Content sent to Google
            Cloud Platform for translation is transmitted as-is without any
            accompanying metadata (user identifiers, etc.) and processed in the
            U.S. (us-central1 region). The Google Cloud LLM-based translation
            service we use is currently not available in the EU region.
          </li>
          <li>
            <strong
              >Use of
              <a
                href="https://sentry.io/privacy/"
                target="_blank"
                rel="noopener"
                >Sentry.io</a
              >
              for anonymized crash reports:</strong
            >
            Agora utilizes Sentry (hosted on EU servers) for error tracking and
            crash reporting purposes. Session Replay is enabled with full text
            masking and media blocking to prevent capture of user input or
            visual content. Application state data (Vue Pinia stores) is
            automatically transformed to redact all personal information
            (including phone numbers, usernames, draft content, followed topics,
            and user-generated content) before transmission to Sentry, ensuring
            that logs remain anonymized and do not contain personal data. Sentry
            does not use tracking cookies.
          </li>
          <li>
            <strong>Pseudonymous logging for monitoring:</strong> Agora collects
            pseudonymous technical data for system monitoring, debugging, and
            performance optimization purposes. This includes user UUIDs,
            usernames, request metadata, and error logs. We do NOT log sensitive
            PII such as phone numbers in our application logs. However,
            third-party services like Twilio, AWS, Cloudflare, and others may
            retain data (including IP addresses and, in Twilio's case, phone
            numbers) according to their own privacy policies and retention
            schedules.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Your rights regarding your personal data</h2>
        <p>
          6.1. When we collect and use your personal data, you will enjoy a
          number of rights that you can exercise in the manner described below.
          Please note that when you wish to exercise a right, we will ask you
          for proof of identity. We do this to prevent a personal data breach
          (e.g. because an unauthorized person is impersonating you and is
          exercising a right in your name).
        </p>
        <p>
          6.2. Depending on the processing and the legal basis, as a data
          subject you have a number of possibilities to keep control over your
          personal data:
        </p>
        <ul>
          <li>right to access your data</li>
          <li>right to amend your data</li>
          <li>right to object to the processing of your personal data</li>
          <li>right to restrict data processing</li>
          <li>right to have your data erased</li>
          <li>right to withdraw your previously given consent</li>
          <li>right to transfer your data</li>
          <li>
            right to lodge complaints with the competent data protection
            authority.
          </li>
        </ul>
        <p>
          6.3. We should point out to you that these rights are not always
          absolute, that in certain circumstances we are entitled or even
          required by law to further process your personal data and that we may
          therefore not always be able to comply (fully) with your request. In
          such cases, we will inform you accordingly.
        </p>
        <p>
          6.4. You may exercise these rights free of charge, except in cases of
          abuse and in which case we are entitled to charge an administration
          fee to comply with your request.
        </p>
        <p>
          6.5. Note that you can delete your own reactions, claps,
          upvote/downvote, poll responses, agree/disagree actions,
          conversations, opinions, replies, "views" information and the language
          spoken (at least one must remain).
        </p>

        <h3>6.6. Cryptographic accountability records:</h3>
        <p>
          Some cryptographic records are retained after account deletion to ensure accountability:
        </p>
        <ul>
          <li>
            Zero-Knowledge Proofs (ZKP) and User Controlled Authorization Network (UCAN) proofs
            associated with your account actions
          </li>
          <li>
            Cryptographic proofs of deletion requests, verifying that deletions were user-initiated
          </li>
        </ul>
        <p>
          These cryptographic records exist to prove to third-party auditors
          that Agora did not censor accounts or data but rather processed deletions
          only upon user request. This ensures transparency and trust in the system.
        </p>

        <h3>6.7. How to delete your account:</h3>
        <p>
          When you delete your account, it is <strong>immediately inaccessible</strong> and cannot be recovered.
          The deletion process follows this timeline:
        </p>
        <ul>
          <li><strong>Immediate:</strong> Your account is soft-deleted and becomes inaccessible. All devices are logged out.</li>
          <li><strong>After 15 days:</strong> Your account data is permanently deleted (hard-deleted) from our database.</li>
          <li><strong>Up to 30 days after that:</strong> Data may persist in encrypted backups for disaster recovery purposes.</li>
        </ul>

        <h4>What happens upon deletion:</h4>
        <ul>
          <li>Your account becomes immediately inaccessible and cannot be restored</li>
          <li>All devices are logged out and your session is terminated</li>
          <li>Your verification credentials (phone number, passport proof, event tickets) are invalidated</li>
          <li>Your content (posts, votes, opinions) remains on the platform but is no longer publicly associated with your account</li>
          <li>After 15 days, your account data is permanently removed from our database</li>
          <li>Cryptographic proofs of the deletion request are retained for accountability and audit purposes</li>
        </ul>


        <h4>Third-party data retention:</h4>
        <ul>
          <li>
            <strong>Database backups:</strong> Data may persist in encrypted AWS backups for up to 30 days after the 15-day hard deletion
          </li>
          <li>
            <strong>Twilio:</strong> Phone verification records are retained according to
            <a href="https://www.twilio.com/en-us/legal/privacy" target="_blank" rel="noopener">Twilio's privacy policy</a>
          </li>
          <li>
            <strong>Third-party services:</strong> Logs and data in Sentry, Cloudflare, AWS, and Google Cloud may be retained according to their respective privacy policies
          </li>
        </ul>

        <p>
          <strong>Important:</strong> Deletion is immediate and irreversible. You cannot recover your account after requesting deletion.
        </p>

        <p>
          6.8. If you have a complaint about the processing of your personal
          data by us, you can always contact us at
          <a href="mailto:legal@zkorum.com">legal@zkorum.com</a>. If you are not
          satisfied with our response, you may lodge a complaint with the
          competent data protection authority, i.e. the French Commission
          nationale de l'informatique et des libertés (<a
            href="http://www.cnil.fr/"
            target="_blank"
            rel="noopener"
            >www.cnil.fr</a
          >).
        </p>
      </section>

      <section>
        <h2>7. Important information for California residents</h2>
        <p>
          7.1. Pursuant to the California Consumer Privacy Act of 2018 ("the
          CCPA"), we provide the following additional details to California
          residents. During the preceding 12 months, we have collected, used,
          and shared the categories of your personal information described above
          in this privacy policy for our operational business purposes.
        </p>
        <p>
          7.2. We have not sold your personal information, meaning that we have
          not disclosed your personal information for monetary or other valuable
          consideration.
        </p>
        <p>
          7.3. You have the right to request access or deletion of your personal
          information and to request transparency about our privacy practices.
          If you would like to exercise your rights under the CCPA, please see
          Article 6. Once we receive your request, we will verify it by
          requesting information to confirm your identity, including by asking
          you for additional information. If you would like to use an agent
          registered with the California Secretary of State to exercise your
          rights, we may request evidence that you have provided such agent with
          power of attorney or that the agent otherwise has valid written
          authority to submit requests to exercise rights on your behalf.
        </p>
        <p>
          7.4. If you choose to exercise your rights, we will not charge you
          different prices or provide different quality of services for
          exercising your rights unless those differences are permitted by law.
        </p>
      </section>

      <section>
        <h2>8. Changes to this privacy policy</h2>
        <p>
          8.1. We can change this privacy policy on our own initiative at any
          time. If material changes to this privacy policy may affect the
          processing of your personal data, we will communicate these changes to
          you in a way that we normally communicate with you (e.g. via e-mail or
          via a message on the platform).
        </p>
        <p>
          8.2. We invite you to read the latest version of this privacy policy
          on our website (https://agoracitizen.network/). The privacy policy
          states the date our privacy policy was last changed.
        </p>
      </section>

      <section>
        <h2>9. Do you have any questions?</h2>
        <p>
          9.1. Should you have any further questions about the processing of
          your personal data, please do not hesitate to contact our privacy
          manager. You can contact our privacy manager by e-mail:
          <a href="mailto:legal@zkorum.com">legal@zkorum.com</a>.
        </p>
      </section>
    </article>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { StandardMenuBar } from "src/components/navigation/header/variants";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import DrawerLayout from "src/layouts/DrawerLayout.vue";

import {
  type PrivacyPolicyTranslations,
  privacyPolicyTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<PrivacyPolicyTranslations>(
  privacyPolicyTranslations
);
</script>

<style scoped lang="scss">
.privacy-content {
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

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1.5rem;

    th,
    td {
      border: 1px solid #ddd;
      padding: 0.75rem;
      text-align: left;
      vertical-align: top;
    }

    th {
      background-color: rgba($primary, 0.1);
      font-weight: 600;
    }
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
