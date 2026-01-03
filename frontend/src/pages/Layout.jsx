import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">
            © {new Date().getFullYear()} Combatrix MMA Gym Management. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;