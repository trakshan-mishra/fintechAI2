import React, { useState } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import Header from './Header';

const AppLayout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="bg-orb-1" />
      <div className="bg-orb-2" />
      
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileNav />
      
      <main className="md:ml-64 p-3 sm:p-4 md:p-8 relative z-10 pb-20 md:pb-8 safe-bottom">
        <div className="max-w-7xl mx-auto">
          {title && <Header title={title} onMenuClick={() => setSidebarOpen(true)} />}
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
