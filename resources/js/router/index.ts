import { createRouter, createWebHistory } from 'vue-router'

import AnalyticsPage from '@/pages/AnalyticsPage.vue'
import CampaignsPage from '@/pages/CampaignsPage.vue'
import CustomerMyQrPage from '@/pages/customer/CustomerMyQrPage.vue'
import CustomerRewardsPage from '@/pages/CustomerRewardsPage.vue'
import CustomerSettingsPage from '@/pages/CustomerSettingsPage.vue'
import CustomerVenuesPage from '@/pages/CustomerVenuesPage.vue'
import CustomerWalletPage from '@/pages/customer/CustomerWalletPage.vue'
import VenueLandingPage from '@/pages/VenueLandingPage.vue'
import CustomersPage from '@/pages/CustomersPage.vue'
import CustomerProfilePage from '@/pages/CustomerProfilePage.vue'
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
import AdminActivityPage from '@/pages/AdminActivityPage.vue'
import TeamPage from '@/pages/TeamPage.vue'
import VenueSettingsPage from '@/pages/VenueSettingsPage.vue'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import { sanitizeRedirect } from '@/lib/redirect'
import { clearOwnerOnboardingIntent, hasOwnerOnboardingIntent, markOwnerOnboardingIntent } from '@/lib/ownerIntent'
import {
  hasOwnerMembership,
  hasTeamMembership,
  ownerBootstrapPath,
  resolveAuthenticatedHomePath,
  resolvePostLoginDestination,
  staffScannerPath,
} from '@/lib/venueRoles'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'landing', component: LandingPage },
    { path: '/login', name: 'login', component: LoginPage, meta: { guest: true } },
    { path: '/register', name: 'register', component: RegisterPage, meta: { guest: true } },
    { path: '/forgot-password', name: 'forgot-password', component: () => import('@/pages/ForgotPasswordPage.vue'), meta: { guest: true } },
    { path: '/reset-password', name: 'reset-password', component: () => import('@/pages/ResetPasswordPage.vue'), meta: { guest: true } },
    { path: '/invite/:token', name: 'staff-invite', component: StaffInvitePage },
    { path: '/v/:slug', name: 'venue-landing', component: VenueLandingPage, meta: { guest: true } },
    { path: '/onboarding', name: 'onboarding', component: OnboardingPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true, allowWithoutMembership: true } },
    { path: '/onboarding/create-venue', name: 'onboarding-create-venue', component: OnboardingPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true, allowWithoutMembership: true } },
    { path: '/dashboard', name: 'dashboard', component: DashboardPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/my-venues', name: 'my-venues', component: MyVenuesPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/my-venues/:id/settings', name: 'venue-settings', component: VenueSettingsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/cafes', redirect: '/wallet' },
    { path: '/scanner', name: 'scanner', component: ScannerPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/customers', name: 'customers', component: CustomersPage, meta: { requiresAuth: true, workspace: true } },
    { path: '/customers/:customerId', name: 'customer-profile', component: CustomerProfilePage, meta: { requiresAuth: true, workspace: true } },
    { path: '/rewards', name: 'rewards', component: RewardsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/campaigns', name: 'campaigns', component: CampaignsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/analytics', name: 'analytics', component: AnalyticsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/team', name: 'team', component: TeamPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/settings', name: 'settings', component: SettingsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/account', name: 'account', component: AccountPage, meta: { requiresAuth: true, workspace: true, allowWithoutMembership: true } },
    { path: '/admin/activity', name: 'admin-activity', component: AdminActivityPage, meta: { requiresAuth: true, adminOnly: true, workspace: true } },
    { path: '/wallet', name: 'customer-wallet', component: CustomerWalletPage, meta: { requiresAuth: true, workspace: false, flush: true } },
    { path: '/my-qr', name: 'customer-my-qr', component: CustomerMyQrPage, meta: { requiresAuth: true, workspace: false } },
    { path: '/card', redirect: (to) => ({ path: '/wallet', query: to.query }) },
    { path: '/customer/rewards', name: 'customer-rewards', component: CustomerRewardsPage, meta: { requiresAuth: true, workspace: false } },
    { path: '/venues', name: 'customer-venues', component: CustomerVenuesPage, meta: { requiresAuth: true, workspace: false } },
    { path: '/customer/settings', name: 'customer-settings', component: CustomerSettingsPage, meta: { requiresAuth: true, workspace: false } },
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

  if (to.meta.adminOnly && auth.isAuthenticated && !auth.isAdmin) {
    return { path: '/dashboard' }
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

    const allowWithoutMembership = to.meta.allowWithoutMembership === true

    if (needsWorkspaceContext && !teamMember && !auth.user?.is_admin && !allowWithoutMembership) {
      return { path: home }
    }

    if (to.meta.ownerOnly && !auth.user?.is_admin && !ownerMember && !allowWithoutMembership) {
      return { path: home }
    }

    if (
      (to.name === 'onboarding' || to.name === 'onboarding-create-venue')
      && ownerMember
    ) {
      return { path: '/dashboard' }
    }

    if (
      (to.name === 'onboarding' || to.name === 'onboarding-create-venue')
      && !ownerMember
    ) {
      if (to.query.intent === 'owner') {
        markOwnerOnboardingIntent()
      } else if (!hasOwnerOnboardingIntent()) {
        return { path: home }
      }
    }

    if (to.name === 'my-venues' && !auth.user?.is_admin && !ownerMember && to.query.intent !== 'owner') {
      return { path: home }
    }
  }

  if (to.name === 'landing' && auth.isAuthenticated) {
    const workspace = useWorkspaceStore()
    await workspace.bootstrap()

    if (hasOwnerOnboardingIntent() || hasOwnerMembership(workspace.activeVenues) || hasTeamMembership(workspace.activeVenues) || auth.user?.is_admin) {
      return {
        path: ownerBootstrapPath(auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId),
      }
    }

    return true
  }

  if (to.meta.guest && auth.isAuthenticated && to.name !== 'venue-landing' && !to.meta.inviteFlow) {
    const workspace = useWorkspaceStore()
    await workspace.bootstrap()

    const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : null
    if (to.name === 'login' && redirect) {
      return {
        path: resolvePostLoginDestination(
          redirect,
          auth.user?.is_admin,
          workspace.activeVenues,
          workspace.effectiveVenueId,
        ),
      }
    }

    if (to.query.intent === 'owner') {
      markOwnerOnboardingIntent()
      return { path: '/onboarding/create-venue' }
    }

    return {
      path: ownerBootstrapPath(auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId),
    }
  }
})

export default router
