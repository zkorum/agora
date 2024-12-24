<template>
  <div>
    <form @submit.prevent="submitForm()">
      <div class="container">
        <div class="title">Report an issue</div>

        <div>
          User reports are fully anonymous and they will not be associated to
          your account. Please make sure you do not include any personal
          information in the report.
        </div>

        <Select
          v-model="selectedProblem"
          :options="problemList"
          option-label="name"
          placeholder="Select a problem to report"
        />

        <Textarea
          v-model="description"
          class="textAreaStyle"
          placeholder="Describe the problem"
        />

        <Button
          label="Submit"
          type="submit"
          :disabled="selectedProblem == '' || description.length == 0"
        />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import Textarea from "primevue/textarea";
import Select from "primevue/select";
import Button from "primevue/button";
import { ref } from "vue";
import { useDialog } from "src/utils/ui/dialog";

const description = ref("");

const dialog = useDialog();

const selectedProblem = ref();
const problemList = ref([
  { name: "Report a bug", code: "1" },
  { name: "App performance", code: "2" },
  { name: "Privacy inquiries", code: "3" },
  { name: "Feature request", code: "4" },
  { name: "Other reports", code: "3" },
]);

function submitForm() {
  dialog.showMessage("Report Submitted", "Thank you for your feedback!");
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-top: 2rem;
  padding-left: 1rem;
  padding-right: 1rem;
}

.textAreaStyle {
  width: 100%;
  min-height: 10rem;
}

.title {
  font-size: 1.5rem;
}
</style>
