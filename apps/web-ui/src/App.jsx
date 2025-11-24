import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useOrgStore } from './store'

// Layouts
import MainLayout from './components/layouts/MainLayout'
import AuthLayout from './components/layouts/AuthLayout'

// Pages
import SelectOrganization from './pages/auth/SelectOrganization'
import ManufacturerDashboard from './pages/manufacturer/Dashboard'
import ShipperDashboard from './pages/shipper/Dashboard'
import WarehouseDashboard from './pages/warehouse/Dashboard'
import RetailerDashboard from './pages/retailer/Dashboard'
import ProductDetail from './pages/products/ProductDetail'
import ProductList from './pages/products/ProductList'
import CreateProduct from './pages/products/CreateProduct'
import HandoverList from './pages/handovers/HandoverList'
import HandoverDetail from './pages/handovers/HandoverDetail'

// Protected route wrapper
const ProtectedRoute = ({ children, allowedOrgs }) => {
  const { selectedOrg } = useOrgStore()
  
  if (!selectedOrg) {
    return <Navigate to="/auth/select-org" replace />
  }
  
  if (allowedOrgs && !allowedOrgs.includes(selectedOrg)) {
    return <Navigate to="/" replace />
  }
  
  return children
}

function App() {
  const { selectedOrg } = useOrgStore()

  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="select-org" element={<SelectOrganization />} />
      </Route>

      {/* Protected main routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard routes based on organization */}
        <Route
          index
          element={
            selectedOrg === 'manufacturer' ? (
              <ManufacturerDashboard />
            ) : selectedOrg === 'shipper' ? (
              <ShipperDashboard />
            ) : selectedOrg === 'warehouse' ? (
              <WarehouseDashboard />
            ) : selectedOrg === 'retailer' ? (
              <RetailerDashboard />
            ) : (
              <Navigate to="/auth/select-org" replace />
            )
          }
        />

        {/* Product routes */}
        <Route path="products">
          <Route index element={<ProductList />} />
          <Route path="create" element={<CreateProduct />} />
          <Route path=":productId" element={<ProductDetail />} />
        </Route>

        {/* Handover routes */}
        <Route path="handovers">
          <Route index element={<HandoverList />} />
          <Route path=":handoverId" element={<HandoverDetail />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
