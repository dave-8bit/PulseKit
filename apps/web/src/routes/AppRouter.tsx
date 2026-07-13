import { Navigate, Route, Routes } from 'react-router-dom'

import { AnalyticsDashboardPage } from '../pages/analytics/AnalyticsDashboardPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/analytics" replace />} />
      <Route path="/analytics" element={<AnalyticsDashboardPage />} />
    </Routes>
  )
}

