import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedLayout from './components/layout/ProtectedLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PropertiesPage from './pages/PropertiesPage';
import BuildingFormPage from './pages/BuildingFormPage';
import BuildingDetailPage from './pages/BuildingDetailPage';
import CompaniesPage from './pages/CompaniesPage';
import PersonsPage from './pages/PersonsPage';
import DealsPage from './pages/DealsPage';
import DealDetailPage from './pages/DealDetailPage';

import UsersPage from './pages/UsersPage';
import AuditLogPage from './pages/AuditLogPage';
import SettingsPage from './pages/SettingsPage';
import PlatformPage from './pages/PlatformPage';
import ReassignPage from './pages/ReassignPage';

function App() {
  return (
    <>
    <Toaster position="top-center" toastOptions={{ duration: 3000, style: { fontSize: '14px' } }} />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/inregistrare" element={<RegisterPage />} />
      <Route path="/*" element={<ProtectedLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="proprietati" element={<PropertiesPage />} />
        <Route path="proprietati/nou" element={<BuildingFormPage />} />
        <Route path="proprietati/:id" element={<BuildingDetailPage />} />
        <Route path="proprietati/:id/edit" element={<BuildingFormPage />} />
        <Route path="companii" element={<CompaniesPage />} />
        <Route path="persoane" element={<PersonsPage />} />
        <Route path="deals" element={<DealsPage />} />
        <Route path="deals/:id" element={<DealDetailPage />} />
        <Route path="utilizatori" element={<UsersPage />} />
        <Route path="jurnal" element={<AuditLogPage />} />
        <Route path="reasignare" element={<ReassignPage />} />
        <Route path="setari" element={<SettingsPage />} />
        <Route path="platform" element={<PlatformPage />} />
      </Route>
    </Routes>
    </>
  );
}

export default App;
