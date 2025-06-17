<script setup lang="ts">
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
</script>

<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          title="Where do I stand"
          :show-choice="'infoButton'"
        />
      </template>

      <template #body>
        <div>
          You agree with Fiscal Reform - Fiscal reformists push for reforms
          related to how the government collects revenue (taxation) and how it
          spends money (public spending or budget allocation)
        </div>
      </template>
    </AnalysisSectionWrapper>
  </div>
</template>
