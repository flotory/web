import { createRouter, createWebHistory } from 'vue-router'

import AnalyticsPage from '@/pages/AnalyticsPage.vue'
import CampaignsPage from '@/pages/CampaignsPage.vue'
import CustomersPage from '@/pages/CustomersPage.vue'
import CustomerProfilePage from '@/pages/CustomerProfilePage.vue'
import DashboardPage from '@/pages/DashboardPage.vue'
import LandingPage from '@/pages/LandingPage.vue'
import LoginPage from '@/pages/LoginPage.vue'
import MobileAppPage from '@/pages/MobileAppPage.vue'
import MyVenuesPage from '@/pages/MyVenuesPage.vue'
import RegisterPage from '@/pages/RegisterPage.vue'
import RewardsPage from '@/pages/RewardsPage.vue'
import AccountPage from '@/pages/AccountPage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'
import StaffInvitePage from '@/pages/StaffInvitePage.vue'
import AdminActivityPage from '@/pages/AdminActivityPage.vue'
import AdminPalettePage from '@/pages/AdminPalettePage.vue'
import AdminManageVenuesPage from '@/pages/AdminManageVenuesPage.vue'
import AdminVenueEditPage from '@/pages/AdminVenueEditPage.vue'
import AdminVenuesPage from '@/pages/AdminVenuesPage.vue'
import TeamPage from '@/pages/TeamPage.vue'
import VenueDesignPreviewPage from '@/pages/VenueDesignPreviewPage.vue'
import VenueSetupFilesPage from '@/pages/VenueSetupFilesPage.vue'
import VenueSettingsPage from '@/pages/VenueSettingsPage.vue'
import VenueAppBridgePage from '@/pages/VenueAppBridgePage.vue'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import { sanitizeRedirect } from '@/lib/redirect'
import { isOwnerVenueInWorkspace } from '@/lib/venueWorkspace'
import { MOBILE_APP_PATH } from '@/lib/mobileApp'
import {
  ADMIN_HOME_PATH,
  hasOwnerMembership,
  hasTeamMembership,
  isPlatformAdmin,
  isStaffOnlyMember,
  ownerBootstrapPath,
  resolveAuthenticatedHomePath,
  resolvePostLoginDestination,
} from '@/lib/venueRoles'

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
    { path: '/app', name: 'mobile-app', component: MobileAppPage, meta: { guest: true } },
    { path: '/login', name: 'login', component: LoginPage, meta: { guest: true } },
    { path: '/register', name: 'register', component: RegisterPage, meta: { guest: true } },
    { path: '/forgot-password', name: 'forgot-password', component: () => import('@/pages/ForgotPasswordPage.vue'), meta: { guest: true } },
    { path: '/reset-password', name: 'reset-password', component: () => import('@/pages/ResetPasswordPage.vue'), meta: { guest: true } },
    { path: '/invite/:token', name: 'staff-invite', component: StaffInvitePage },
    { path: '/v/:slug', name: 'venue-landing', component: VenueAppBridgePage, meta: { guest: true } },
    { path: '/onboarding', redirect: { path: '/my-venues', query: { create: '1' } } },
    { path: '/onboarding/create-venue', redirect: { path: '/my-venues', query: { create: '1' } } },
    { path: '/dashboard', name: 'dashboard', component: DashboardPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/my-venues', name: 'my-venues', component: MyVenuesPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true, allowWithoutMembership: true } },
    { path: '/my-venues/:id/settings', name: 'venue-settings', component: VenueSettingsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/my-venues/:id/design', name: 'venue-design', component: VenueDesignPreviewPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/my-venues/:id/setup-files', name: 'venue-setup-files', component: VenueSetupFilesPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/customers', name: 'customers', component: CustomersPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/customers/:customerId', name: 'customer-profile', component: CustomerProfilePage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/rewards', name: 'rewards', component: RewardsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/campaigns', name: 'campaigns', component: CampaignsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/analytics', name: 'analytics', component: AnalyticsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/team', name: 'team', component: TeamPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/settings', name: 'settings', component: SettingsPage, meta: { requiresAuth: true, workspace: true, ownerOnly: true } },
    { path: '/account', name: 'account', component: AccountPage, meta: { requiresAuth: true, workspace: true, allowWithoutMembership: true } },
    { path: '/admin/activity', name: 'admin-activity', component: AdminActivityPage, meta: { requiresAuth: true, adminOnly: true, workspace: true, allowWithoutMembership: true } },
    { path: '/admin/venues', name: 'admin-venues', component: AdminVenuesPage, meta: { requiresAuth: true, adminOnly: true, workspace: true, allowWithoutMembership: true } },
    { path: '/admin/manage-venues', name: 'admin-manage-venues', component: AdminManageVenuesPage, meta: { requiresAuth: true, adminOnly: true, workspace: true, allowWithoutMembership: true } },
    { path: '/admin/manage-venues/:id', name: 'admin-venue-edit', component: AdminVenueEditPage, meta: { requiresAuth: true, adminOnly: true, workspace: true, allowWithoutMembership: true } },
    { path: '/admin/manage-venues/:id/design', name: 'admin-venue-design', component: VenueDesignPreviewPage, meta: { requiresAuth: true, adminOnly: true, workspace: true, allowWithoutMembership: true } },
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
})

async function workspaceHomePath() {
  const auth = useAuthStore()
  const workspace = useWorkspaceStore()
  await workspace.bootstrap()

  return resolveAuthenticatedHomePath(auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId)
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

  if (!auth.booted && auth.token) {
    await auth.fetchUser()
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
      await workspace.bootstrap()
    }

    const teamMember = hasTeamMembership(workspace.activeVenues)
    const ownerMember = hasOwnerMembership(workspace.activeVenues)
    const staffOnly = isStaffOnlyMember(workspace.activeVenues)
    const home = needsWorkspaceContext
      ? resolveAuthenticatedHomePath(auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId)
      : await workspaceHomePath()

    const allowWithoutMembership = to.meta.allowWithoutMembership === true

    if (staffOnly && to.meta.ownerOnly) {
      return { path: MOBILE_APP_PATH }
    }

    const platformAdminRedirect = redirectPlatformAdminFromOwnerRoute()
    if (platformAdminRedirect && needsWorkspaceContext && !to.meta.adminOnly && !allowWithoutMembership) {
      return { path: platformAdminRedirect }
    }

    if (needsWorkspaceContext && !teamMember && !allowWithoutMembership && !to.meta.adminOnly) {
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
      || to.name === 'venue-design'
      || to.name === 'venue-setup-files'
    ) {
      const venueId = Number(to.params.id)

      if (!isOwnerVenueInWorkspace(venueId, workspace.activeVenues)) {
        return { path: '/my-venues' }
      }
    }
  }

  if (to.name === 'landing' && auth.isAuthenticated) {
    await workspace.bootstrap()

    let destination = MOBILE_APP_PATH

    if (auth.user?.is_admin) {
      destination = ADMIN_HOME_PATH
    } else if (hasOwnerMembership(workspace.activeVenues) || hasTeamMembership(workspace.activeVenues)) {
      destination = ownerBootstrapPath(false, workspace.activeVenues, workspace.effectiveVenueId)
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
    && !to.meta.inviteFlow
  ) {
    await workspace.bootstrap()

    const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : null
    if (to.name === 'login' && redirect) {
      if (isRemovedCustomerStaffPath(redirect)) {
        return { path: resolveAuthenticatedHomePath(auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId) }
      }

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
      if (hasOwnerMembership(workspace.activeVenues)) {
        return { path: '/dashboard' }
      }

      return { path: '/my-venues', query: { create: '1' } }
    }

    const destination = ownerBootstrapPath(auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId)
    if (destination === to.path) {
      return true
    }

    return { path: destination }
  }
})

export default router
