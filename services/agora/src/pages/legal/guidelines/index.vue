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
      <StandardMenuBar :title="t('guidelines')" :center-content="true" />
    </template>

    <article class="guidelines-content">
      <section>
        <h2>1. Principles of Moderation</h2>
        <p>
          Agora Citizen Network is a space for open and constructive political and social discussions.
          To ensure a fair, respectful, and inclusive environment, our moderation system follows these
          principles:
        </p>
        <ul>
          <li><strong>Transparency:</strong> All moderation actions are logged and publicly reviewable.</li>
          <li><strong>Inclusivity:</strong> Diverse perspectives are welcome, provided they adhere to respectful discourse.</li>
          <li><strong>Verifiability:</strong> Users can review moderation history and appeal decisions.</li>
        </ul>
      </section>

      <section>
        <h2>2. Community Standards</h2>
        <p>To participate in Agora, users must follow these guidelines:</p>

        <h3>2.1 Respectful Discourse</h3>
        <ul>
          <li>Engage in discussions with mutual respect.</li>
          <li>No personal attacks, insults, or harassment.</li>
          <li>Disagreements should be expressed constructively.</li>
        </ul>

        <h3>2.2 No Hate Speech or Extremism</h3>
        <ul>
          <li>No content promoting racism, sexism, xenophobia, homophobia, or discrimination.</li>
          <li>No advocacy of violence, extremism, or radicalization.</li>
        </ul>

        <h3>2.3 No Misinformation or Manipulation</h3>
        <ul>
          <li>No intentional spreading of false information or conspiracy theories.</li>
          <li>No use of bots, astroturfing, or deceptive behavior.</li>
        </ul>

        <h3>2.4 No Spam or Unsolicited Promotions</h3>
        <ul>
          <li>No excessive self-promotion, ads, or irrelevant content.</li>
          <li>No repetitive posting of the same content across discussions.</li>
        </ul>

        <h3>2.5 Privacy and Safety Protection</h3>
        <ul>
          <li>No sharing of private or personally identifiable information without consent.</li>
          <li>No doxxing, threats, or incitement to violence.</li>
        </ul>
      </section>

      <section>
        <h2>3. Moderation Process</h2>

        <h3>3.1 Community Moderation & Reporting</h3>
        <p>Users can report content under the following categories:</p>
        <ul>
          <li><strong>Antisocial:</strong> Offensive, hateful, or targeted harassment.</li>
          <li><strong>Misleading:</strong> False or misleading claims, deceptive content.</li>
          <li><strong>Illegal:</strong> Violations of laws or promotion of illegal activities.</li>
          <li><strong>Doxxing:</strong> Unauthorized sharing of private information.</li>
          <li><strong>Sexual:</strong> Sexually explicit or inappropriate material.</li>
          <li><strong>Spam:</strong> Repetitive, off-topic, or promotional content.</li>
        </ul>

        <h3>3.2 Moderation Review & Appeal System</h3>
        <ul>
          <li>Moderation actions (warnings, removals, suspensions) are logged and publicly reviewable.</li>
          <li>Users may appeal moderation decisions through an open review process.</li>
          <li>Repeated violations result in escalating consequences.</li>
        </ul>
      </section>

      <section>
        <h2>4. Consequences for Violations</h2>
        <table>
          <thead>
            <tr>
              <th>Violation Level</th>
              <th>Consequence</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>First Violation</strong></td>
              <td>Warning and content removal.</td>
            </tr>
            <tr>
              <td><strong>Second Violation</strong></td>
              <td>Temporary suspension.</td>
            </tr>
            <tr>
              <td><strong>Severe Violations (e.g., threats, doxxing)</strong></td>
              <td>Permanent suspension.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>5. Feedback & Adaptation</h2>
        <ul>
          <li>Users may appeal moderation decisions through a transparent review system.</li>
          <li>Feedback on moderation policies is encouraged and reviewed regularly to adapt to community needs.</li>
        </ul>
        <p>
          These guidelines are designed to foster a space for meaningful, respectful, and impactful discussions.
          Thank you for being a part of Agora Citizen Network!
        </p>
        <p>
          If you have any questions or concerns about our Community Guidelines, please contact us at
          <a href="mailto:legal@zkorum.com">legal@zkorum.com</a>.
        </p>
      </section>
    </article>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import {
  guidelinesTranslations,
  type GuidelinesTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<GuidelinesTranslations>(
  guidelinesTranslations
);
</script>

<style scoped lang="scss">
.guidelines-content {
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

    th, td {
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
