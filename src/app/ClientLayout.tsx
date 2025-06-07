'use client';

import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import Header from '../components/Header/header';
import Footer from '@/components/Footer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  return (
    <HelmetProvider>
      <div className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-b from-black via-blue-900/20 to-black">
          {children}
        </main>
        <Footer />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </div>
    </HelmetProvider>
  );
};

export default ClientLayout; 