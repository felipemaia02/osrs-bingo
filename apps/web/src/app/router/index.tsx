import { Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from '../../features/bingo/pages/HomePage'
import { EventsPage } from '../../features/events/pages/EventsPage'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { TeamsPage } from '../../features/teams/pages/TeamsPage'

import { AdminRoute } from '../../features/administration/components/AdminRoute'
import { AdministratorsPage } from '../../features/administration/pages/AdministratorsPage'
import { AdminHomePage } from '../../features/administration/pages/AdminHomePage'
import { AdminRankingPage } from '../../features/administration/pages/AdminRankingPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/teams" element={<Navigate to="/admin/teams" replace />} />
      <Route path="/admin" element={<AdminRoute />}>
        <Route index element={<AdminHomePage />} />
        <Route path="events" element={<EventsPage management />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="administrators" element={<AdministratorsPage />} />
        <Route path="ranking" element={<AdminRankingPage />} />
      </Route>
    </Routes>
  )
}
