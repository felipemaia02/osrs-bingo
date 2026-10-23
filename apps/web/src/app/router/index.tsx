import { Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from '../../features/bingo/pages/HomePage'
import { AdminEventsPage } from '../../features/events/pages/AdminEventsPage'
import { PlayerEventsPage } from '../../features/events/pages/PlayerEventsPage'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { TeamsPage } from '../../features/teams/pages/TeamsPage'

import { AdminRoute } from '../../features/administration/components/AdminRoute'
import { AdministratorsPage } from '../../features/administration/pages/AdministratorsPage'
import { AdminHomePage } from '../../features/administration/pages/AdminHomePage'
import { AdminRankingPage } from '../../features/administration/pages/AdminRankingPage'
import { BoardBuilderPage } from '../../features/boards/pages/BoardBuilderPage'
import { CardCatalogPage } from '../../features/cards/pages/CardCatalogPage'
import { MySubmissionsPage } from '../../features/submissions/pages/MySubmissionsPage'
import { ReviewPage } from '../../features/submissions/pages/ReviewPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/events" element={<PlayerEventsPage />} />
      <Route path="/submissions" element={<MySubmissionsPage />} />
      <Route path="/teams" element={<Navigate to="/admin/teams" replace />} />
      <Route path="/admin" element={<AdminRoute />}>
        <Route index element={<AdminHomePage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="events" element={<AdminEventsPage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="cards" element={<CardCatalogPage />} />
        <Route path="boards" element={<BoardBuilderPage />} />
        <Route path="administrators" element={<AdministratorsPage />} />
        <Route path="ranking" element={<AdminRankingPage />} />
      </Route>
    </Routes>
  )
}
