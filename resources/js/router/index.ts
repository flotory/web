import { createRouter, createWebHistory } from 'vue-router'

import AnalyticsPage from '@/pages/AnalyticsPage.vue'
import CafesPage from '@/pages/CafesPage.vue'
import CustomerCardPage from '@/pages/CustomerCardPage.vue'
import CustomersPage from '@/pages/CustomersPage.vue'
import DashboardPage from '@/pages/DashboardPage.vue'
import LandingPage from '@/pages/LandingPage.vue'
import LoginPage from '@/pages/LoginPage.vue'
import MyVenuesPage from '@/pages/MyVenuesPage.vue'
import OnboardingPage from '@/pages/OnboardingPage.vue'
import RegisterPage from '@/pages/RegisterPage.vue'
import RewardsPage from '@/pages/RewardsPage.vue'
import ScannerPage from '@/pages/ScannerPage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'
import TeamPage from '@/pages/TeamPage.vue'
import VenueSettingsPage from '@/pages/VenueSettingsPage.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'landing', component: LandingPage },
    { path: '/login', name: 'login', component: LoginPage, meta: { guest: true } },
    { path: '/register', name: 'register', component: RegisterPage, meta: { guest: true } },
    { path: '/onboarding', name: 'onboarding', component: OnboardingPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/dashboard', name: 'dashboard', component: DashboardPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/my-venues', name: 'my-venues', component: MyVenuesPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/my-venues/:id/settings', name: 'venue-settings', component: VenueSettingsPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/cafes', name: 'cafes', component: CafesPage, meta: { requiresAuth: true, workspace: false } },
    { path: '/scanner', name: 'scanner', component: ScannerPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/customers', name: 'customers', component: CustomersPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/rewards', name: 'rewards', component: RewardsPage, meta: { requiresAuth: true } },
    { path: '/analytics', name: 'analytics', component: AnalyticsPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/team', name: 'team', component: TeamPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/settings', name: 'settings', component: SettingsPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/card', name: 'customer-card', component: CustomerCardPage, meta: { requiresAuth: true, workspace: false } },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.booted && auth.token) {
    await auth.fetchUser()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.workspace === true && auth.user?.role !== 'admin' && !auth.user?.active_venue_id) {
    if (to.name !== 'my-venues' && to.name !== 'onboarding') {
      return { name: 'my-venues' }
    }
  }

  if (to.name === 'landing' && auth.isAuthenticated) {
    return auth.user?.role === 'admin' || auth.user?.active_venue_id ? { name: 'dashboard' } : { name: 'customer-card' }
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return auth.user?.role === 'admin' || auth.user?.active_venue_id ? { name: 'dashboard' } : { name: 'customer-card' }
  }
})

export default router
