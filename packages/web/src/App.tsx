import { Routes, Route } from 'react-router-dom';
import ProtectedLayout from './components/layout/ProtectedLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PropertiesPage from './pages/PropertiesPage';
import BuildingFormPage from './pages/BuildingFormPage';
import BuildingDetailPage from './pages/BuildingDetailPage';
import CompaniesPage from './pages/CompaniesPage';
import PersonsPage from './pages/PersonsPage';
import DealsPage from './pages/DealsPage';
import DealDetailPage from './pages/DealDetailPage';
import ActivitiesPage from './pages/ActivitiesPage';
import UsersPage from './pages/UsersPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
        <Route path="activitati" element={<ActivitiesPage />} />
        <Route path="utilizatori" element={<UsersPage />} />
      </Route>
    </Routes>
  );
}

export default App;
