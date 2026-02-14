import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { seedDatabase } from './db';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InBody from './pages/InBody';
import Diet from './pages/Diet';
import Training from './pages/Training';
import Settings from './pages/Settings';

export default function App() {
  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inbody" element={<InBody />} />
            <Route path="/diet" element={<Diet />} />
            <Route path="/training" element={<Training />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
