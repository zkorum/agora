<template>
  <div class="skeleton-feed">
    <div v-for="i in 3" :key="i" class="skeleton-card">
      <!-- Post metadata: avatar + username/timestamp -->
      <div class="skeleton-metadata">
        <q-skeleton type="circle" size="36px" />
        <div class="skeleton-user-info">
          <q-skeleton type="text" width="8rem" height="0.9rem" />
          <q-skeleton type="text" width="5rem" height="0.7rem" />
        </div>
      </div>

      <!-- Title -->
      <div class="skeleton-title">
        <q-skeleton type="text" width="90%" height="1.1rem" />
        <q-skeleton type="text" width="60%" height="1.1rem" />
      </div>

      <!-- Body -->
      <div class="skeleton-body">
        <q-skeleton type="text" width="100%" height="0.9rem" />
        <q-skeleton type="text" width="95%" height="0.9rem" />
        <q-skeleton type="text" width="70%" height="0.9rem" />
      </div>

      <!-- Action bar -->
      <div class="skeleton-action-bar">
        <q-skeleton type="text" width="6rem" height="1.5rem" />
        <div class="skeleton-action-right">
          <q-skeleton type="text" width="3rem" height="1rem" />
          <q-skeleton type="text" width="3rem" height="1rem" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.skeleton-feed {
  display: flex;
  flex-direction: column;
  gap: $feed-flex-gap;
}

.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1rem;
  background-color: white;
  border-radius: 16px;
}

.skeleton-metadata {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.skeleton-user-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.skeleton-title {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.skeleton-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.3rem;
}

.skeleton-action-right {
  display: flex;
  gap: 1rem;
  align-items: center;
}
</style>
