import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AdminRoute } from './AdminRoute'

import { PublicLayout } from '@/components/layout/PublicLayout'
import { ClientLayout } from '@/components/layout/ClientLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'

import { HomePage } from '@/pages/public/HomePage'

import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'

import { DashboardPage } from '@/pages/client/DashboardPage'
import { OpportunitiesPage } from '@/pages/client/OpportunitiesPage'
import { OpportunityDetailPage } from '@/pages/client/OpportunityDetailPage'
import { NewApplicationPage } from '@/pages/client/NewApplicationPage'
import { MyApplicationsPage } from '@/pages/client/MyApplicationsPage'
import { ApplicationDetailPage } from '@/pages/client/ApplicationDetailPage'
import { NotificationsPage } from '@/pages/client/NotificationsPage'
import { ConsultingPage } from '@/pages/client/ConsultingPage'
import { ProfilePage } from '@/pages/client/ProfilePage'

import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { ApplicationsReviewPage } from '@/pages/admin/ApplicationsReviewPage'
import { AdminOpportunitiesPage } from '@/pages/admin/OpportunitiesPage'
import { OpportunityFormPage } from '@/pages/admin/OpportunityFormPage'
import { ExcelImportPage } from '@/pages/admin/ExcelImportPage'
import { ScrapingDashboardPage } from '@/pages/admin/ScrapingDashboardPage'
import { ScrapingAlertsPage } from '@/pages/admin/ScrapingAlertsPage'
import { ConsultingRequestsPage } from '@/pages/admin/ConsultingRequestsPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { AnalyticsPage } from '@/pages/admin/AnalyticsPage'
import { AuditLogsPage } from '@/pages/admin/AuditLogsPage'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute><ClientLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
        <Route path="/opportunities/:id/apply" element={<NewApplicationPage />} />
        <Route path="/applications" element={<MyApplicationsPage />} />
        <Route path="/applications/:id" element={<ApplicationDetailPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/consulting" element={<ConsultingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route element={<ProtectedRoute><AdminRoute><AdminLayout /></AdminRoute></ProtectedRoute>}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/applications" element={<ApplicationsReviewPage />} />
        <Route path="/admin/opportunities" element={<AdminOpportunitiesPage />} />
        <Route path="/admin/opportunities/new" element={<OpportunityFormPage />} />
        <Route path="/admin/opportunities/:id/edit" element={<OpportunityFormPage />} />
        <Route path="/admin/excel-import" element={<ExcelImportPage />} />
        <Route path="/admin/scraping" element={<ScrapingDashboardPage />} />
        <Route path="/admin/scraping/alerts" element={<ScrapingAlertsPage />} />
        <Route path="/admin/consulting" element={<ConsultingRequestsPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/analytics" element={<AnalyticsPage />} />
        <Route path="/admin/audit" element={<AuditLogsPage />} />
      </Route>
    </Routes>
  )
}