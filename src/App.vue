<script setup lang="ts">
import Todos from './components/Todos.vue'
import DashboardView from './views/Admin/Dashboard.vue'
import { Authenticator } from "@aws-amplify/ui-vue";
import "@aws-amplify/ui-vue/styles.css";
import { Dashboard } from 'aws-cdk-lib/aws-cloudwatch';
</script>

<template>
  <main>
    <authenticator>
      <template v-slot="{ signOut }">
        <h1>Welcome to the Admin Dashboard</h1>
        <DashboardView />
        <button @click="signOut">Sign Out</button>
      </template>
    </authenticator>
  </main>
</template>

