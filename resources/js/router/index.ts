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
import AccountPage from '@/pages/AccountPage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'
import StaffInvitePage from '@/pages/StaffInvitePage.vue'
import TeamPage from '@/pages/TeamPage.vue'
import VenueSettingsPage from '@/pages/VenueSettingsPage.vue'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import { sanitizeRedirect } from '@/lib/redirect'
import {
  hasOwnerMembership,
  hasTeamMembership,
  resolveAuthenticatedHomePath,
  staffScannerPath,
} from '@/lib/venueRoles'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'landing', component: LandingPage },
    { path: '/login', name: 'login', component: LoginPage, meta: { guest: true } },
    { path: '/register', name: 'register', component: RegisterPage, meta: { guest: true } },
    { path: '/v/:slug', name: 'venue-landing', component: VenueLandingPage, meta: { guest: true } },
    { path: '/onboarding', name: 'onboarding', component: OnboardingPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/onboarding/create-venue', name: 'onboarding-create-venue', component: OnboardingPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/dashboard', name: 'dashboard', component: DashboardPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/my-venues', name: 'my-venues', component: MyVenuesPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/my-venues/:id/settings', name: 'venue-settings', component: VenueSettingsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/cafes', name: 'cafes', component: CafesPage, meta: { requiresAuth: true, workspace: false } },
    { path: '/scanner', name: 'scanner', component: ScannerPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/customers', name: 'customers', component: CustomersPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/rewards', name: 'rewards', component: RewardsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/analytics', name: 'analytics', component: AnalyticsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/team', name: 'team', component: TeamPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/settings', name: 'settings', component: SettingsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/account', name: 'account', component: AccountPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/card', name: 'customer-card', component: CustomerCardPage, meta: { requiresAuth: true, workspace: false } },
  ],
})

async function workspaceHomePath() {
  const auth = useAuthStore()
  const workspace = useWorkspaceStore()
  await workspace.bootstrap()

  return resolveAuthenticatedHomePath(auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId)
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

  if (auth.isAuthenticated) {
    const needsWorkspaceContext = to.meta.workspace === true || to.meta.workspace === 'auto'

    if (needsWorkspaceContext) {
      await workspace.bootstrap()
    }

    const teamMember = hasTeamMembership(workspace.activeVenues)
    const ownerMember = hasOwnerMembership(workspace.activeVenues)
    const home = needsWorkspaceContext
      ? resolveAuthenticatedHomePath(auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId)
      : await workspaceHomePath()

    if (needsWorkspaceContext && !teamMember && !auth.user?.is_admin) {
      return { path: home }
    }

    if (to.meta.ownerOnly && !auth.user?.is_admin && !ownerMember) {
      return { path: home }
    }

    const ownerOnboarding =
      to.name === 'onboarding' || to.name === 'onboarding-create-venue' || to.name === 'my-venues'

    if (ownerOnboarding && !auth.user?.is_admin && !ownerMember && to.query.intent !== 'owner') {
      return { path: home }
    }
  }

  if (to.name === 'landing' && auth.isAuthenticated) {
    return { path: await workspaceHomePath() }
  }

  if (to.meta.guest && auth.isAuthenticated && to.name !== 'venue-landing' && !to.meta.inviteFlow) {
    return { path: await workspaceHomePath() }
  }
})

export default router
