<template>
  <v-app>
    <v-app-bar color="primary" prominent>
      <v-app-bar-title>
        <v-icon size="large" class="mr-2">mdi-camera-iris</v-icon>
        Suilens - Studio Komet Biru
      </v-app-bar-title>

      <template v-slot:append>
        <v-btn icon="mdi-package-variant" @click="router.push('/orders')"></v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';

const router = useRouter();
</script>
