import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from './components/ui/sonner'
import { useAuth } from './hooks/useAuth'
import { BottomNav } from './components/layout/BottomNav'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { ListsPage } from './pages/ListsPage'
import { ListPage } from './pages/ListPage'
import { NewListPage } from './pages/NewListPage'
import { RecipesPage } from './pages/RecipesPage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { RecipeEditPage } from './pages/RecipeEditPage'
import { HjemmelagerPage } from './pages/HjemmelagerPage'
import { SettingsPage } from './pages/SettingsPage'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 30,
            retry: 1,
        },
    },
})

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AppRoutes />
                <Toaster position="top-center" />
            </BrowserRouter>
        </QueryClientProvider>
    )
}

function AppRoutes() {
    const { session, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-dvh bg-neutral-50 dark:bg-neutral-950">
                <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-700 rounded-full animate-spin" />
            </div>
        )
    }

    if (!session) {
        return <AuthPage />
    }

    return (
        <div className="flex flex-col min-h-dvh bg-neutral-50 dark:bg-neutral-950 ">
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/lister" element={<ListsPage />} />
                <Route path="/liste/:id" element={<ListPage />} />
                <Route path="/ny-liste" element={<NewListPage />} />
                <Route path="/oppskrifter" element={<RecipesPage />} />
                <Route path="/oppskrifter/ny" element={<RecipeEditPage />} />
                <Route path="/oppskrifter/:id" element={<RecipeDetailPage />} />
                <Route path="/oppskrifter/:id/rediger" element={<RecipeEditPage />} />
                <Route path="/hjemmelager" element={<HjemmelagerPage />} />
                <Route path="/innstillinger" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <BottomNav />
        </div>
    )
}
