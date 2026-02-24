import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import AttendanceScanner from './components/AttendanceScanner';
import Reports from './components/Reports';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'students':
        return <Students />;
      case 'scanner':
        return <AttendanceScanner onExit={() => setActiveTab('dashboard')} />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  // If scanner is active, we might want to handle it differently if it's full screen
  // but for now, the component itself handles the fixed positioning.
  
  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}
