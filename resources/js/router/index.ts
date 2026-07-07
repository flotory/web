import { createRouter, createWebHistory } from 'vue-router'

import AnalyticsPage from '@/pages/AnalyticsPage.vue'
import CampaignsPage from '@/pages/CampaignsPage.vue'
import CustomersPage from '@/pages/CustomersPage.vue'
import CustomerProfilePage from '@/pages/CustomerProfilePage.vue'
import DashboardPage from '@/pages/DashboardPage.vue'
import BookDemoPage from '@/pages/BookDemoPage.vue'
import ContactPage from '@/pages/ContactPage.vue'
import FaqPage from '@/pages/FaqPage.vue'
import PricingPage from '@/pages/PricingPage.vue'
import LandingPage from '@/pages/LandingPage.vue'
import LoginPage from '@/pages/LoginPage.vue'
import MobileAppPage from '@/pages/MobileAppPage.vue'
import MyVenuesPage from '@/pages/MyVenuesPage.vue'
import RegisterPage from '@/pages/RegisterPage.vue'
import RewardsPage from '@/pages/RewardsPage.vue'
import AccountPage from '@/pages/AccountPage.vue'
import AdminActivityPage from '@/pages/AdminActivityPage.vue'
import AdminOwnerOnboardingPage from '@/pages/AdminOwnerOnboardingPage.vue'
import AdminPalettePage from '@/pages/AdminPalettePage.vue'
import AdminManageVenuesPage from '@/pages/AdminManageVenuesPage.vue'
import AdminVenueEditPage from '@/pages/AdminVenueEditPage.vue'
import AdminVenuesPage from '@/pages/AdminVenuesPage.vue'
import VenueSetupFilesPage from '@/pages/VenueSetupFilesPage.vue'
import VenueSettingsPage from '@/pages/VenueSettingsPage.vue'
import VenueAppBridgePage from '@/pages/VenueAppBridgePage.vue'
import OwnerOnboardingPage from '@/pages/OwnerOnboardingPage.vue'
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage.vue'
import TermsOfServicePage from '@/pages/TermsOfServicePage.vue'
import { MOBILE_APP_PATH } from '@/lib/mobileApp'
import { sanitizeRedirect } from '@/lib/redirect'
import { resolveScrollBehavior } from '@/lib/scrollReset'
import {
  ADMIN_HOME_PATH,
  hasOwnerMembership,
  isPlatformAdmin,
  ownerBootstrapPath,
  resolveAuthenticatedHomePath,
  resolvePostLoginDestination,
} from '@/lib/venueRoles'
import { shouldUseOwnerOnboarding, isOnboardingStep } from '@/lib/ownerOnboarding'
import { bootstrapWorkspaceOrSignOut } from '@/lib/sessionGuard'
import { isOwnerVenueInWorkspace } from '@/lib/venueWorkspace'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

const REMOVED_CUSTOMER_STAFF_PATHS = [
  '/home',
  '/wallet',
  '/my-qr',
  '/scanner',
  '/venues',
  '/customer/rewards',
  '/customer/notifications',
  '/customer/settings',
]

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'landing', component: LandingPage },
    { path: '/book-demo', name: 'book-demo', component: BookDemoPage, meta: { guest: true } },
    { path: '/contact', name: 'contact', component: ContactPage, meta: { guest: true } },
    { path: '/faq', name: 'faq', component: FaqPage, meta: { guest: true } },
    { path: '/pricing', name: 'pricing', component: PricingPage, meta: { guest: true } },
    { path: '/demo', redirect: '/book-demo' },
    { path: '/app', name: 'mobile-app', component: MobileAppPage, meta: { guest: true } },
    { path: '/privacy', name: 'privacy', component: PrivacyPolicyPage, meta: { guest: true } },
    { path: '/terms', name: 'terms', component: TermsOfServicePage, meta: { guest: true } },
    { path: '/login', name: 'login', component: LoginPage, meta: { guest: true } },
    { path: '/register', name: 'register', component: RegisterPage, meta: { guest: true, inviteFlow: true } },
    { path: '/forgot-password', name: 'forgot-password', component: () => import('@/pages/ForgotPasswordPage.vue'), meta: { guest: true } },
    { path: '/reset-password', name: 'reset-password', component: () => import('@/pages/ResetPasswordPage.vue'), meta: { guest: true } },
    { path: '/v/:slug', name: 'venue-landing', component: VenueAppBridgePage, meta: { guest: true } },
    { path: '/t/:token', name: 'nfc-tap', component: () => import('@/pages/NfcTapBridgePage.vue'), meta: { guest: true } },
    { path: '/onboarding/:step?', name: 'owner-onboarding', component: OwnerOnboardingPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true, allowWithoutMembership: true } },
    { path: '/dashboard', name: 'dashboard', component: DashboardPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/my-venues', name: 'my-venues', component: MyVenuesPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true, allowWithoutMembership: true } },
    { path: '/my-venues/:id/settings', name: 'venue-settings', component: VenueSettingsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/my-venues/:id/design', redirect: (to) => `/my-venues/${to.params.id}/settings` },
    { path: '/my-venues/:id/setup-files', name: 'venue-setup-files', component: VenueSetupFilesPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/customers', name: 'customers', component: CustomersPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/customers/:customerId', name: 'customer-profile', component: CustomerProfilePage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/rewards', name: 'rewards', component: RewardsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/campaigns', name: 'campaigns', component: CampaignsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/analytics', name: 'analytics', component: AnalyticsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/settings', redirect: '/my-venues' },
    { path: '/account', name: 'account', component: AccountPage, meta: { requiresAuth: true, workspace: true, allowWithoutMembership: true } },
    { path: '/admin/activity', name: 'admin-activity', component: AdminActivityPage, meta: { requiresAuth: true, adminOnly: true, workspace: true, allowWithoutMembership: true } },
    { path: '/admin/venues', name: 'admin-venues', component: AdminVenuesPage, meta: { requiresAuth: true, adminOnly: true, workspace: true, allowWithoutMembership: true } },
    { path: '/admin/owner-onboarding', name: 'admin-owner-onboarding', component: AdminOwnerOnboardingPage, meta: { requiresAuth: true, adminOnly: true, workspace: true, allowWithoutMembership: true } },
    { path: '/admin/manage-venues', name: 'admin-manage-venues', component: AdminManageVenuesPage, meta: { requiresAuth: true, adminOnly: true, workspace: true, allowWithoutMembership: true } },
    { path: '/admin/manage-venues/:id', name: 'admin-venue-edit', component: AdminVenueEditPage, meta: { requiresAuth: true, adminOnly: true, workspace: true, allowWithoutMembership: true } },
    { path: '/admin/manage-venues/:id/design', redirect: (to) => `/admin/manage-venues/${to.params.id}` },
    { path: '/admin/palette', name: 'admin-palette', component: AdminPalettePage, meta: { requiresAuth: true, adminOnly: true, workspace: true, allowWithoutMembership: true } },
    { path: '/cafes', redirect: MOBILE_APP_PATH },
    { path: '/home', redirect: MOBILE_APP_PATH },
    { path: '/wallet', redirect: MOBILE_APP_PATH },
    { path: '/my-qr', redirect: MOBILE_APP_PATH },
    { path: '/scanner', redirect: MOBILE_APP_PATH },
    { path: '/venues', redirect: MOBILE_APP_PATH },
    { path: '/customer/rewards', redirect: MOBILE_APP_PATH },
    { path: '/customer/notifications', redirect: MOBILE_APP_PATH },
    { path: '/customer/settings', redirect: MOBILE_APP_PATH },
    { path: '/card/:cardId', redirect: MOBILE_APP_PATH },
    { path: '/claim/:unlockId', redirect: MOBILE_APP_PATH },
  ],
  scrollBehavior: resolveScrollBehavior,
})

async function workspaceHomePath() {
  const auth = useAuthStore()
  const workspace = useWorkspaceStore()

  if (!await bootstrapWorkspaceOrSignOut(auth, workspace)) {
    return '/login'
  }

  return resolveAuthenticatedHomePath(auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId, auth.mayCreateVenue)
}

function isRemovedCustomerStaffPath(path: string): boolean {
  const base = path.split('?')[0] ?? path

  return REMOVED_CUSTOMER_STAFF_PATHS.some((prefix) => base === prefix || base.startsWith(`${prefix}/`))
    || base.startsWith('/card/')
    || base.startsWith('/claim/')
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const workspace = useWorkspaceStore()

  if (auth.loggingOut && to.name === 'login') {
    return true
  }

  if (to.name === 'register' && to.query.intent === 'owner') {
    return { path: '/book-demo' }
  }

  if (to.name === 'register' && typeof to.query.invite !== 'string') {
    return { path: '/app' }
  }

  if (!auth.booted && auth.token) {
    await auth.fetchUser()
  }

  if (to.name === 'my-venues' && to.query.create === '1' && !auth.mayCreateVenue) {
    return { path: '/book-demo' }
  }

  if (to.name === 'my-venues' && to.query.create === '1' && auth.mayCreateVenue) {
    return { path: '/onboarding' }
  }

  if (to.name === 'owner-onboarding') {
    const step = typeof to.params.step === 'string' ? to.params.step : undefined
    if (step && !isOnboardingStep(step)) {
      return { path: '/onboarding' }
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: sanitizeRedirect(to.fullPath) } }
  }

  if (to.meta.adminOnly && auth.isAuthenticated && !auth.isAdmin) {
    return { path: '/dashboard' }
  }

  function redirectPlatformAdminFromOwnerRoute(): string | null {
    if (!isPlatformAdmin(auth.isAdmin) || to.meta.adminOnly) {
      return null
    }

    return ADMIN_HOME_PATH
  }

  if (auth.isAuthenticated) {
    const needsWorkspaceContext = to.meta.workspace === true || to.meta.workspace === 'auto'

    if (needsWorkspaceContext) {
      if (!await bootstrapWorkspaceOrSignOut(auth, workspace)) {
        return { name: 'login', query: { redirect: sanitizeRedirect(to.fullPath) } }
      }
    }

    const ownerMember = hasOwnerMembership(workspace.activeVenues)
    const home = needsWorkspaceContext
      ? resolveAuthenticatedHomePath(auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId, auth.mayCreateVenue)
      : await workspaceHomePath()

    if (!auth.isAuthenticated) {
      return { name: 'login', query: { redirect: sanitizeRedirect(to.fullPath) } }
    }

    if (
      !auth.isAdmin
      && to.name !== 'owner-onboarding'
      && shouldUseOwnerOnboarding(auth.mayCreateVenue, workspace.activeVenues)
      && (to.meta.ownerOnly === true || to.name === 'my-venues')
    ) {
      return { path: '/onboarding' }
    }

    const allowWithoutMembership = to.meta.allowWithoutMembership === true

    const platformAdminRedirect = redirectPlatformAdminFromOwnerRoute()
    if (platformAdminRedirect && needsWorkspaceContext && !to.meta.adminOnly && !allowWithoutMembership) {
      return { path: platformAdminRedirect }
    }

    if (needsWorkspaceContext && !ownerMember && !allowWithoutMembership && !to.meta.adminOnly) {
      if (auth.isAdmin) {
        return { path: ADMIN_HOME_PATH }
      }

      return { path: home }
    }

    if (to.meta.ownerOnly && !ownerMember && !allowWithoutMembership) {
      if (auth.isAdmin) {
        return { path: ADMIN_HOME_PATH }
      }

      return { path: home }
    }

    if (
      to.name === 'my-venues'
      && !ownerMember
      && !auth.mayCreateVenue
      && to.query.intent !== 'owner'
      && to.query.create !== '1'
    ) {
      if (auth.isAdmin) {
        return { path: ADMIN_HOME_PATH }
      }

      return { path: home }
    }

    if (
      to.name === 'venue-settings'
      || to.name === 'venue-setup-files'
    ) {
      const venueId = Number(to.params.id)

      if (!isOwnerVenueInWorkspace(venueId, workspace.activeVenues)) {
        return { path: '/my-venues' }
      }
    }
  }

  if (to.name === 'landing' && auth.isAuthenticated && to.query.public !== '1') {
    if (!await bootstrapWorkspaceOrSignOut(auth, workspace)) {
      return { name: 'login' }
    }

    let destination = MOBILE_APP_PATH

    if (auth.user?.is_admin) {
      destination = ADMIN_HOME_PATH
    } else if (hasOwnerMembership(workspace.activeVenues)) {
      destination = ownerBootstrapPath(false, workspace.activeVenues, workspace.effectiveVenueId, auth.mayCreateVenue)
    }

    if (destination === to.path) {
      return true
    }

    return { path: destination }
  }

  if (
    to.meta.guest
    && auth.isAuthenticated
    && to.name !== 'venue-landing'
    && to.name !== 'mobile-app'
    && to.name !== 'book-demo'
    && to.name !== 'contact'
    && to.name !== 'faq'
    && to.name !== 'pricing'
    && !to.meta.inviteFlow
  ) {
    if (!await bootstrapWorkspaceOrSignOut(auth, workspace)) {
      return { name: 'login' }
    }

    const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : null
    if (to.name === 'login' && redirect) {
      if (isRemovedCustomerStaffPath(redirect)) {
        return { path: resolveAuthenticatedHomePath(auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId, auth.mayCreateVenue) }
      }

      return {
        path: resolvePostLoginDestination(
          redirect,
          auth.user?.is_admin,
          workspace.activeVenues,
          workspace.effectiveVenueId,
          auth.mayCreateVenue,
        ),
      }
    }

    if (to.query.intent === 'owner') {
      if (hasOwnerMembership(workspace.activeVenues)) {
        return { path: '/dashboard' }
      }

      if (auth.mayCreateVenue) {
        return { path: '/my-venues', query: { create: '1' } }
      }

      return { path: '/book-demo' }
    }

    const destination = ownerBootstrapPath(auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId, auth.mayCreateVenue)
    if (destination === to.path) {
      return true
    }

    return { path: destination }
  }
})

export default router
