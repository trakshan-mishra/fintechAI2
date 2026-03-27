import React from 'react';
import Sidebar from './Sidebar';

const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-orb-1" />
      <div className="bg-orb-2" />
      
      <Sidebar />
      
      <main className="md:ml-64 p-4 md:p-8 relative z-10">
        {children}
      </main>
      
     
    </div>
  );
};

export default AppLayout;