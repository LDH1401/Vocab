import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import { DataGate } from './components/DataGate'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout'
import { useIsDark } from './hooks/useTheme'
import HomePage from './pages/HomePage'
import PracticePage from './pages/PracticePage'
import ReviewPage from './pages/ReviewPage'
import SettingsPage from './pages/SettingsPage'
import StatsPage from './pages/StatsPage'
import WordEditPage from './pages/WordEditPage'
import WordsPage from './pages/WordsPage'

export default function App() {
  const dark = useIsDark()
  return (
    <ErrorBoundary>
      <DataGate>
        <BrowserRouter>
          <Routes>
            <Route path="/review" element={<ReviewPage />} />
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="words" element={<WordsPage />} />
              <Route path="words/new" element={<WordEditPage />} />
              <Route path="words/:id" element={<WordEditPage />} />
              <Route path="practice" element={<PracticePage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DataGate>
      <Toaster position="top-center" theme={dark ? 'dark' : 'light'} richColors closeButton />
    </ErrorBoundary>
  )
}
