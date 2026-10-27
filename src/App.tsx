import React, { useState, useEffect } from 'react';
import { CustomerMenuPage } from './pages/CustomerMenuPage';
import { StorePanelPage } from './pages/admin/StorePanelPage';
import { SuperAdminPage } from './pages/admin/SuperAdminPage';
import { StoreLoginPage } from './pages/auth/StoreLoginPage';
import { SuperAdminLoginPage } from './pages/auth/SuperAdminLoginPage';
import { Store } from './types';
import { api } from './services/api';

type RouteState =
  | { type: 'customer'; slug: string }
  | { type: 'store_admin' }
  | { type: 'superadmin' };

function parseCurrentRoute(): RouteState {
  const pathname = window.location.pathname.toLowerCase();

  if (pathname === '/superadmin' || pathname.startsWith('/superadmin/')) {
    return { type: 'superadmin' };
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return { type: 'store_admin' };
  }

  if (pathname.startsWith('/loja/')) {
    const slug = pathname.replace('/loja/', '').split('/')[0] || 'burger-co';
    return { type: 'customer', slug };
  }

  if (pathname.startsWith('/cardapio/')) {
    const slug = pathname.replace('/cardapio/', '').split('/')[0] || 'burger-co';
    return { type: 'customer', slug };
  }

  // Root or other: check query parameter ?loja=slug or default to burger-co
  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get('loja') || params.get('store');

  return { type: 'customer', slug: querySlug || 'burger-co' };
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(parseCurrentRoute());
  const [stores, setStores] = useState<Store[]>([]);

  // Authentication states with localStorage persistence
  const [storeAuth, setStoreAuth] = useState<{ token: string; storeSlug: string } | null>(() => {
    try {
      const raw = localStorage.getItem('cardapiopro_store_auth');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [superAdminAuth, setSuperAdminAuth] = useState<string | null>(() => {
    return localStorage.getItem('cardapiopro_superadmin_auth');
  });

  // Load stores list
  useEffect(() => {
    api.getStores()
      .then((data) => setStores(data))
      .catch((err) => console.error('Error fetching stores', err));
  }, []);

  // Listen to browser popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseCurrentRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setRoute(parseCurrentRoute());
  };

  // Auth Handlers
  const handleStoreLoginSuccess = (storeSlug: string, email: string) => {
    const authData = { token: `auth-${Date.now()}`, storeSlug, email };
    localStorage.setItem('cardapiopro_store_auth', JSON.stringify(authData));
    setStoreAuth({ token: authData.token, storeSlug });
  };

  const handleStoreLogout = () => {
    localStorage.removeItem('cardapiopro_store_auth');
    setStoreAuth(null);
  };

  const handleSuperAdminLoginSuccess = (token: string) => {
    localStorage.setItem('cardapiopro_superadmin_auth', token);
    setSuperAdminAuth(token);
  };

  const handleSuperAdminLogout = () => {
    localStorage.removeItem('cardapiopro_superadmin_auth');
    setSuperAdminAuth(null);
  };

  // 1. ROTA DO CLIENTE (/ ou /loja/:slug ou /cardapio/:slug)
  if (route.type === 'customer') {
    return (
      <CustomerMenuPage
        currentStoreSlug={route.slug}
        onSelectStoreSlug={(newSlug) => navigateTo(`/cardapio/${newSlug}`)}
      />
    );
  }

  // 2. ROTA DO LOJISTA (/admin)
  if (route.type === 'store_admin') {
    if (!storeAuth) {
      return (
        <StoreLoginPage
          stores={stores}
          onLoginSuccess={handleStoreLoginSuccess}
          onGoToCustomerMenu={() => navigateTo('/')}
        />
      );
    }

    return (
      <StorePanelPage
        currentStoreSlug={storeAuth.storeSlug}
        onSelectStoreSlug={(slug) => {
          const updatedAuth = { ...storeAuth, storeSlug: slug };
          localStorage.setItem('cardapiopro_store_auth', JSON.stringify(updatedAuth));
          setStoreAuth(updatedAuth);
        }}
        onNavigateToCustomerMenu={(slug) => window.open(`/cardapio/${slug}`, '_blank')}
        onLogout={handleStoreLogout}
      />
    );
  }

  // 3. ROTA DO DONO DO SAAS (/superadmin)
  if (route.type === 'superadmin') {
    if (!superAdminAuth) {
      return (
        <SuperAdminLoginPage
          onLoginSuccess={handleSuperAdminLoginSuccess}
          onGoToCustomerMenu={() => navigateTo('/')}
        />
      );
    }

    return (
      <SuperAdminPage
        onNavigateToStorePanel={(slug) => {
          handleStoreLoginSuccess(slug, `admin@${slug}.com`);
          navigateTo('/admin');
        }}
        onNavigateToCustomerMenu={(slug) => window.open(`/cardapio/${slug}`, '_blank')}
        onLogout={handleSuperAdminLogout}
      />
    );
  }

  return null;
}
