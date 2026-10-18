import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Verify from './pages/Verify.jsx';
import Forgot from './pages/Forgot.jsx';
import Requests from './components/Requests.jsx';
import Messages from './components/Messages.jsx';
import Chat from './components/Chat.jsx';
import MyProfile from './components/MyProfile.jsx';
import Browse from './components/Browse.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateProfile from './components/CreateProfile.jsx';

const Splash = () => <div className="splash" aria-busy="true">Loading…</div>;

function Protected({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <Splash />;
  return user ? children : <Navigate to="/" replace state={{ notice: 'Sign in to continue.' }} />;
}
function PublicOnly() {
  const { user } = useAuth();
  if (user === undefined) return <Splash />;
  return user ? <Navigate to="/dashboard.html" replace /> : <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/forgot" element={<Forgot />} />
        

      </Route>
      <Route path="/dashboard.html" element={<Protected><Dashboard /></Protected>} />
      <Route path="/profile" element={<Protected><MyProfile /></Protected>} />
       <Route path="/create-profile" element={<Protected><CreateProfile /></Protected>} />
       <Route path="/requests" element={<Protected><Requests /></Protected>} />
<Route path="/messages" element={<Protected><Messages /></Protected>} />
<Route path="/messages/:id" element={<Protected><Chat /></Protected>} />
       <Route path="/browse" element={<Protected><Browse /></Protected>} />
      <Route path="/dashboard" element={<Navigate to="/dashboard.html" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
