'use client';

import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import Header from '../components/Header/header';
import Footer from '../components/Footer/Footer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  return (
    <HelmetProvider>
      <div id="root"> {/* Add id="root" */}
        <Header />
        <main className="content-wrapper"> {/* Use content-wrapper class */}
          {children}
        </main>
        <Footer />
      </div>
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
    </HelmetProvider>
  );
};

export default ClientLayout;