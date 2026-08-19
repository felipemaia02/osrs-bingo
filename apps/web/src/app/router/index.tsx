import { Routes, Route } from 'react-router-dom'
import { HomePage } from '../../features/bingo/pages/HomePage'

export function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
        </Routes>
    )
}
