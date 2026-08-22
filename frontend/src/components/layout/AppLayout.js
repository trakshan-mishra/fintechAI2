import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="bg-orb-1" />
      <div className="bg-orb-2" />
      
      <Sidebar />
      <MobileNav />
      
      <main className="md:ml-64 p-3 sm:p-4 md:p-8 relative z-10 pb-20 md:pb-8 safe-bottom">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
