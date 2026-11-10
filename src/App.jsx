import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Landing from './pages/Landing.jsx'
import Results from './pages/Results.jsx'
import Profile from './pages/Profile.jsx'
import Booking from './pages/Booking.jsx'
import Confirmation from './pages/Confirmation.jsx'
import { SignUp, LogIn } from './pages/Auth.jsx'
import TextPage from './pages/TextPage.jsx'
import Bookings from './pages/photographer/Bookings.jsx'
import Rules from './pages/photographer/Rules.jsx'
import ProfileSettings from './pages/photographer/ProfileSettings.jsx'
import { Empty } from './components/ui.jsx'

// HashRouter: GitHub Pages serves static files only, so routes live after the #.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="search" element={<Results />} />
          <Route path="photographer/bookings" element={<Bookings />} />
          <Route path="photographer/rules" element={<Rules />} />
          <Route path="photographer/profile" element={<ProfileSettings />} />
          <Route path="photographer/:id" element={<Profile />} />
          <Route path="book" element={<Booking />} />
          <Route path="confirmation/:id" element={<Confirmation />} />
          <Route path="signup" element={<SignUp />} />
          <Route path="login" element={<LogIn />} />
          <Route path="terms" element={<TextPage kind="terms" />} />
          <Route path="privacy" element={<TextPage kind="privacy" />} />
          <Route path="*" element={<div className="container page"><Empty>Page not found.</Empty></div>} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
