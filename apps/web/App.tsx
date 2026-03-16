
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { ProjectList } from './pages/ProjectList';
import { ProjectDetail } from './pages/ProjectDetail';
import { IndicatorDetail } from './pages/IndicatorDetail';
import { Settings } from './pages/Settings';
import { DataEntry } from './pages/DataEntry';
import { Register } from './pages/Register';

import { PrivateRoute } from './components/PrivateRoute';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/projects" element={<PrivateRoute><ProjectList /></PrivateRoute>} />
        <Route path="/projects/:id" element={<PrivateRoute><ProjectDetail /></PrivateRoute>} />
        <Route path="/indicators/:id" element={<PrivateRoute><IndicatorDetail /></PrivateRoute>} />
        <Route path="/data-entry" element={<PrivateRoute><DataEntry /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        
        <Route path="/indicators" element={<PrivateRoute><Navigate to="/projects" replace /></PrivateRoute>} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
