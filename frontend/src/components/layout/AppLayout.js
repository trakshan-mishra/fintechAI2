import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-orb-1" />
      <div className="bg-orb-2" />
      
      <Sidebar />
      
      <main className="md:ml-20 lg:ml-64 p-4 md:p-8 pb-24 md:pb-8 relative z-10" data-testid="main-content">
        {children}
      </main>
      
      <MobileNav />
    </div>
  );
};

export default AppLayout;