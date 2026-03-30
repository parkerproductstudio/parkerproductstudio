import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminRoute } from './auth/AdminRoute'
import { SignedInRoute } from './auth/SignedInRoute'
import { EmbedHomeServicesPage, HomeServicesAppPage } from './projects/home-services-app'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { UpdatePasswordPage } from './pages/UpdatePasswordPage'
import { ProjectsHubPage } from './pages/ProjectsHubPage'
import { ProjectsLayout } from './pages/ProjectsLayout'

import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/confirm" element={<AuthCallbackPage />} />
      <Route path="/auth/update-password" element={<UpdatePasswordPage />} />
      <Route
        path="/embed/home-services/:companySlug"
        element={<EmbedHomeServicesPage />}
      />
      <Route element={<SignedInRoute />}>
        <Route path="projects" element={<ProjectsLayout />}>
          <Route index element={<ProjectsHubPage />} />
          <Route element={<AdminRoute />}>
            <Route path="home-services-app" element={<HomeServicesAppPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
