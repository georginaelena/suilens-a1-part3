import router from '../router';
import {createPinia} from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

// Types
import type { App } from 'vue'

// Plugins
import vuetify from './vuetify'

export function registerPlugins (app: App) {
 app.use(vuetify)
 app.use(createPinia());
 app.use(VueQueryPlugin);
 app.use(router);
}