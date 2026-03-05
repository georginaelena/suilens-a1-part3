<template>
  <div>
    <div v-if="stockQuery.isPending.value" class="text-caption text-grey">
      Loading stock...
    </div>
    <div v-else-if="stockQuery.isError.value" class="text-caption text-error">
      Unable to load stock
    </div>
    <div v-else-if="!stocks || stocks.length === 0" class="text-caption text-grey">
      No stock available
    </div>
    <div v-else>
      <!-- Summary format: "4 available at Kebayoran Baru, 3 at Jatinegara, 2 at Kelapa Gading" -->
      <div class="text-caption">
        <strong>Available Stock:</strong>
        <div v-for="(stock, idx) in stocks" :key="stock.branchCode" class="d-inline">
          <v-chip
            size="x-small"
            class="mr-2 mb-1"
            :color="getStockColor(stock.availableQuantity)"
            text-color="white"
          >
            {{ stock.availableQuantity }} at {{ stock.branchName }}
          </v-chip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLensStock } from '@/composables/useInventory';

const props = defineProps<{
  lensId: string;
}>();

const stockQuery = useLensStock(props.lensId);

const stocks = computed(() => {
  return stockQuery.data.value || [];
});

const getStockColor = (quantity: number) => {
  if (quantity === 0) return 'error';
  if (quantity <= 2) return 'warning';
  return 'success';
};
</script>

