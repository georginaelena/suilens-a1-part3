<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <v-btn icon="mdi-arrow-left" variant="text" @click="router.push('/')"></v-btn>
          <h1 class="text-h4 ml-3">My Orders</h1>
        </div>

        <v-alert v-if="ordersQuery.isPending.value" type="info" variant="tonal">
          Loading orders...
        </v-alert>

        <v-alert v-else-if="ordersQuery.isError.value" type="error" variant="tonal">
          Failed to load orders: {{ ordersQuery.error.value?.message }}
        </v-alert>

        <v-card v-else-if="orders.length === 0" class="pa-6 text-center">
          <v-icon size="64" color="grey-lighten-1" class="mb-3">mdi-package-variant</v-icon>
          <div class="text-h6 text-grey">No orders yet</div>
          <div class="text-caption text-grey mt-2">Start by browsing our lens catalog</div>
          <v-btn color="primary" class="mt-4" @click="router.push('/')">
            Browse Catalog
          </v-btn>
        </v-card>

        <div v-else>
          <v-card v-for="order in orders" :key="order.id" class="mb-4">
            <v-card-text>
              <v-row>
                <v-col cols="12" md="8">
                  <div class="text-h6">{{ order.lensSnapshot.modelName }}</div>
                  <div class="text-caption text-grey">{{ order.lensSnapshot.manufacturerName }}</div>
                  
                  <v-divider class="my-3"></v-divider>
                  
                  <div class="text-body-2">
                    <div><strong>Customer:</strong> {{ order.customerName }} ({{ order.customerEmail }})</div>
                    <div><strong>Branch:</strong> {{ order.branchCode }}</div>
                    <div><strong>Rental Period:</strong> {{ formatDate(order.startDate) }} - {{ formatDate(order.endDate) }}</div>
                    <div><strong>Total Price:</strong> Rp{{ formatPrice(order.totalPrice) }}</div>
                    <div><strong>Order ID:</strong> <code class="text-caption">{{ order.id }}</code></div>
                  </div>
                </v-col>

                <v-col cols="12" md="4" class="d-flex flex-column align-end justify-space-between">
                  <v-chip 
                    :color="getStatusColor(order.status)" 
                    variant="flat"
                    size="small"
                    class="mb-2"
                  >
                    {{ order.status.toUpperCase() }}
                  </v-chip>

                  <v-btn
                    v-if="order.status === 'confirmed'"
                    color="error"
                    variant="outlined"
                    prepend-icon="mdi-cancel"
                    :loading="cancelMutation.isPending.value"
                    @click="handleCancel(order.id)"
                  >
                    Cancel Order
                  </v-btn>

                  <div v-else-if="order.status === 'cancelled'" class="text-caption text-grey">
                    Order cancelled
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </div>

        <v-snackbar v-model="showSuccess" color="success" timeout="3000">
          Order cancelled successfully! Stock has been released.
        </v-snackbar>

        <v-snackbar v-model="showError" color="error" timeout="5000">
          {{ errorMessage }}
        </v-snackbar>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useFetchOrders, useCancelOrder } from '@/composables/useOrders';

const router = useRouter();
const ordersQuery = useFetchOrders();
const cancelMutation = useCancelOrder();

const showSuccess = ref(false);
const showError = ref(false);
const errorMessage = ref('');

const orders = computed(() => {
  const data = ordersQuery.data.value;
  if (!data) return [];
  // Sort by createdAt descending (newest first)
  return [...data].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
});

function getStatusColor(status: string) {
  switch (status) {
    case 'confirmed': return 'success';
    case 'cancelled': return 'error';
    case 'pending': return 'warning';
    default: return 'grey';
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatPrice(price: string) {
  return parseFloat(price).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

async function handleCancel(orderId: string) {
  if (!confirm('Are you sure you want to cancel this order? Stock will be released back to inventory.')) {
    return;
  }

  try {
    await cancelMutation.mutateAsync(orderId);
    showSuccess.value = true;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to cancel order';
    showError.value = true;
  }
}
</script>
