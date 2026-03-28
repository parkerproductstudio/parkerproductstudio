import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './auth/ProtectedRoute'
import { HomeServicesAppPage } from './projects/home-services-app'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { ProjectsHubPage } from './pages/ProjectsHubPage'
import { ProjectsLayout } from './pages/ProjectsLayout'

import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="projects" element={<ProjectsLayout />}>
          <Route index element={<ProjectsHubPage />} />
          <Route path="home-services-app" element={<HomeServicesAppPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
