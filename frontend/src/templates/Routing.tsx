import { Dashboard } from '../pages/Dashboard/Dashboard';
import { Layout } from './Layout';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Historical } from '../pages/Historical/Historical';
import { Settings } from '../pages/Settings/Settings';
import { About } from '../pages/About/About';

function Redirect() {
  return <Navigate to="/" replace />;
}

export function Routing() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/settings" element={<Settings />} />
          <Route path="/insights" element={<Historical />} />
          <Route path="/about" element={<About />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="*" element={<Redirect />} />;
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
