<template>
  <v-chip v-if="stock" size="small" :color="stockColor">
    {{ stock.availableQuantity }} available
  </v-chip>
  <v-chip v-else size="small" color="grey">
    Loading...
  </v-chip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLensStock } from '@/composables/useInventory';

const props = defineProps<{
  lensId?: string;
  branchCode: string;
}>();

const stockQuery = useLensStock(props.lensId || '');

const stock = computed(() => {
  if (!stockQuery.data.value) return null;
  return stockQuery.data.value.find(s => s.branchCode === props.branchCode);
});

const stockColor = computed(() => {
  if (!stock.value) return 'grey';
  const qty = stock.value.availableQuantity;
  if (qty === 0) return 'error';
  if (qty <= 2) return 'warning';
  return 'success';
});
</script>
