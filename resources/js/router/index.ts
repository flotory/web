import { createRouter, createWebHistory } from 'vue-router'

import AnalyticsPage from '@/pages/AnalyticsPage.vue'
import CafesPage from '@/pages/CafesPage.vue'
import CustomerCardPage from '@/pages/CustomerCardPage.vue'
import VenueLandingPage from '@/pages/VenueLandingPage.vue'
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
import { useWorkspaceStore } from '@/stores/workspace'
import { sanitizeRedirect } from '@/lib/redirect'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'landing', component: LandingPage },
    { path: '/login', name: 'login', component: LoginPage, meta: { guest: true } },
    { path: '/register', name: 'register', component: RegisterPage, meta: { guest: true } },
    { path: '/v/:slug', name: 'venue-landing', component: VenueLandingPage, meta: { guest: true } },
    { path: '/onboarding', name: 'onboarding', component: OnboardingPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/onboarding/create-venue', name: 'onboarding-create-venue', component: OnboardingPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/dashboard', name: 'dashboard', component: DashboardPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/my-venues', name: 'my-venues', component: MyVenuesPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/my-venues/:id/settings', name: 'venue-settings', component: VenueSettingsPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/cafes', name: 'cafes', component: CafesPage, meta: { requiresAuth: true, workspace: false } },
    { path: '/scanner', name: 'scanner', component: ScannerPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/customers', name: 'customers', component: CustomersPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/rewards', name: 'rewards', component: RewardsPage, meta: { requiresAuth: true, workspace: 'auto' } },
    { path: '/analytics', name: 'analytics', component: AnalyticsPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/team', name: 'team', component: TeamPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/settings', name: 'settings', component: SettingsPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/card', name: 'customer-card', component: CustomerCardPage, meta: { requiresAuth: true, workspace: false } },
  ],
})

async function staffHomePath() {
  const workspace = useWorkspaceStore()
  await workspace.bootstrap()

  return workspace.hasMembership ? '/dashboard' : '/card'
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const workspace = useWorkspaceStore()

  if (!auth.booted && auth.token) {
    await auth.fetchUser()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: sanitizeRedirect(to.fullPath) } }
  }

  if (auth.isAuthenticated && (to.meta.workspace === true || to.meta.workspace === 'auto')) {
    await workspace.bootstrap()

    if (!workspace.hasMembership && auth.user?.role !== 'admin') {
      if (to.name !== 'my-venues' && to.name !== 'onboarding') {
        return { name: 'onboarding' }
      }
    }
  }

  if (to.name === 'landing' && auth.isAuthenticated) {
    return auth.user?.role === 'admin' ? { name: 'dashboard' } : { path: await staffHomePath() }
  }

  if (to.meta.guest && auth.isAuthenticated && to.name !== 'venue-landing') {
    return auth.user?.role === 'admin' ? { name: 'dashboard' } : { path: await staffHomePath() }
  }
})

export default router
