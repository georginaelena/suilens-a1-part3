<template>
  <v-container max-width="1200" class="pa-6">
    <div class="text-center mb-8">
      <h1 class="text-h3 font-weight-bold mb-2">Studio Komet Biru</h1>
      <p class="text-subtitle-1 text-grey">Professional Lens Rental Service</p>
    </div>

    <!--Lens Catalog -->
    <v-card class="mb-8" elevation="2">
      <v-card-title class="text-h5 bg-primary">
        <v-icon left>mdi-camera</v-icon>
        Available Lenses
      </v-card-title>
      <v-card-text>
        <div v-if="lensesQuery.isPending.value" class="text-center py-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-4">Loading lenses...</p>
        </div>

        <div v-else-if="lensesQuery.isError.value" class="text-center py-8 text-error">
          Failed to load lenses. Please try again.
        </div>

        <v-row v-else>
          <v-col v-for="lens in lensesQuery.data.value" :key="lens.id" cols="12" md="6" lg="4">
            <v-card elevation="1" hover @click="selectLens(lens)" class="cursor-pointer">
              <v-card-title class="text-h6">{{ lens.modelName }}</v-card-title>
              <v-card-subtitle>{{ lens.manufacturerName }}</v-card-subtitle>
              <v-card-text>
                <div class="text-body-2 mb-2">
                  <strong>{{ lens.minFocalLength }}mm - {{ lens.maxFocalLength }}mm</strong> | f/{{ lens.maxAperture }}
                </div>
                <div class="text-body-2 mb-2">
                  Mount: <strong>{{ lens.mountType }}</strong>
                </div>
                
                <!-- Description -->
                <div v-if="lens.description" class="text-caption text-grey mb-3">
                  {{ lens.description }}
                </div>
                
                <div class="text-h6 text-primary mt-2">
                  Rp {{ Number(lens.dayPrice).toLocaleString('id-ID') }}/day
                </div>

                <!-- Stock per branch -->
                <v-divider class="my-3"></v-divider>
                <div class="text-caption font-weight-bold mb-2">Stock Availability:</div>
                <LensStockDisplay :lensId="lens.id" />
              </v-card-text>
              <v-card-actions>
                <v-btn color="primary" variant="outlined" block>
                  Select This Lens
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Order Form Dialog -->
    <v-dialog v-model="orderDialog" max-width="600">
      <v-card>
        <v-card-title class="text-h5 bg-primary">Create Order</v-card-title>
        <v-card-text class="pt-4">
          <div>
            <div v-if="selectedLens" class="mb-4 pa-4 bg-grey-lighten-4 rounded">
              <div class="font-weight-bold text-h6">{{ selectedLens.modelName }}</div>
              <div class="text-caption text-grey mb-2">{{ selectedLens.manufacturerName }}</div>
              <div v-if="selectedLens.description" class="text-caption mb-2">
                {{ selectedLens.description }}
              </div>
              <div class="text-subtitle-2 text-primary mt-2">
                Rp {{ Number(selectedLens.dayPrice).toLocaleString('id-ID') }}/day
              </div>
            </div>

            <!-- Check if lens has stock in any branch -->
            <v-alert
              v-if="selectedLens && !hasAvailableStock"
              type="error"
              class="mb-4"
              variant="tonal"
            >
              ❌ This lens is currently <strong>out of stock</strong> at all branches
            </v-alert>

            <v-text-field
              v-model="orderForm.customerName"
              label="Your Name"
              :rules="[v => !!v || 'Name is required']"
              required
            ></v-text-field>

            <v-text-field
              v-model="orderForm.customerEmail"
              label="Email"
              type="email"
              :rules="[v => !!v || 'Email is required', v => /.+@.+\..+/.test(v) || 'Email must be valid']"
              required
            ></v-text-field>

            <!-- Branch Selector with Stock Info -->
            <v-select
              v-model="orderForm.branchCode"
              :items="branchOptions"
              item-title="label"
              item-value="value"
              label="Pickup Branch *"
              :rules="[v => !!v || 'Branch is required']"
              required
            />

            <!-- Show stock status for selected branch -->
            <v-alert
              v-if="orderForm.branchCode && selectedBranchStock"
              :type="selectedBranchStock.availableQuantity > 0 ? 'info' : 'error'"
              class="mt-3"
              variant="tonal"
            >
              <strong>{{ selectedBranchStock.branchName }}</strong>
              {{ selectedBranchStock.availableQuantity === 0
                ? '❌ Out of Stock'
                : `✅ ${selectedBranchStock.availableQuantity} available for rental`
              }}
            </v-alert>

            <v-text-field
              v-model="orderForm.startDate"
              label="Start Date"
              type="date"
              :rules="[v => !!v || 'Start date is required']"
              required
            ></v-text-field>

            <v-text-field
              v-model="orderForm.endDate"
              label="End Date"
              type="date"
              :rules="[v => !!v || 'End date is required']"
              required
            ></v-text-field>

            <v-alert v-if="orderError" type="error" class="mt-4">
              {{ orderError }}
            </v-alert>

            <v-alert v-if="orderSuccess" type="success" class="mt-4">
              <div>
                <div class="font-weight-bold mb-1">✅ Order created successfully!</div>
                <div class="text-caption">Order ID: {{ orderSuccess }}</div>
                <div class="text-caption">Stock has been reserved. Check your order in <router-link to="/orders" class="text-white font-weight-bold">My Orders</router-link> page.</div> 
              </div>
            </v-alert>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="orderDialog = false" variant="text">Cancel</v-btn>
          <v-btn
            @click="submitOrder"
            color="primary"
            :loading="createOrderMutation.isPending.value"
            :disabled="!canSubmitOrder || !hasAvailableStock"
          >
            Create Order
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useLenses, type Lens } from '@/composables/useLenses';
import { useBranches, useLensStock } from '@/composables/useInventory';
import { useCreateOrder } from '@/composables/useOrders';
import LensStockDisplay from './LensStockDisplay.vue';

const lensesQuery = useLenses();
const branchesQuery = useBranches();
const createOrderMutation = useCreateOrder();

const orderDialog = ref(false);
const selectedLens = ref<Lens | null>(null);
const orderError = ref('');
const orderSuccess = ref('');

const orderForm = ref({
  customerName: '',
  customerEmail: '',
  branchCode: '',
  startDate: '',
  endDate: '',
});

// Get stock for selected lens - properly constructed
const selectedLensStockQuery = computed(() => {
  if (!selectedLens.value?.id) return null;
  // Store the query result for use in other computeds
  return useLensStock(selectedLens.value.id);
});

// Format branch options with stock info
const branchOptions = computed(() => {
  const stocks = selectedLensStockQuery.value?.data?.value || [];
  
  return (branchesQuery.data.value || []).map(branch => {
    const stock = stocks.find(s => s.branchCode === branch.code);
    const qty = stock?.availableQuantity ?? 0;
    return {
      label: `${branch.name} (${qty} available)`,
      value: branch.code,
    };
  });
});

// Get selected branch stock info
const selectedBranchStock = computed(() => {
  if (!orderForm.value.branchCode) return null;
  const stocks = selectedLensStockQuery.value?.data?.value || [];
  return stocks.find(s => s.branchCode === orderForm.value.branchCode) ?? null;
});

// Check if any branch has stock
const hasAvailableStock = computed(() => {
  const stocks = selectedLensStockQuery.value?.data?.value || [];
  return stocks.length > 0 && stocks.some(s => s.availableQuantity > 0);
});

const selectLens = (lens: Lens) => {
  selectedLens.value = lens;
  orderDialog.value = true;
  orderError.value = '';
  orderSuccess.value = '';
};

const canSubmitOrder = computed(() => {
  // Check form is complete
  const formComplete = orderForm.value.customerName &&
         orderForm.value.customerEmail &&
         orderForm.value.branchCode &&
         orderForm.value.startDate &&
         orderForm.value.endDate;

  // Check selected branch has stock
  const branchHasStock = selectedBranchStock.value && selectedBranchStock.value.availableQuantity > 0;

  return formComplete && branchHasStock;
});

const submitOrder = async () => {
  if (!selectedLens.value || !canSubmitOrder.value) return;

  orderError.value = '';
  orderSuccess.value = '';

  try {
    const result = await createOrderMutation.mutateAsync({
      customerName: orderForm.value.customerName,
      customerEmail: orderForm.value.customerEmail,
      lensId: selectedLens.value.id,
      branchCode: orderForm.value.branchCode,
      startDate: orderForm.value.startDate,
      endDate: orderForm.value.endDate,
    });

    orderSuccess.value = result.id;
    
    // Reset form after 2 seconds
    setTimeout(() => {
      orderDialog.value = false;
      orderForm.value = {
        customerName: '',
        customerEmail: '',
        branchCode: '',
        startDate: '',
        endDate: '',
      };
      orderSuccess.value = '';
    }, 2000);
  } catch (error: any) {
    orderError.value = error.message || 'Failed to create order';
  }
};
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
