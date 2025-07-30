import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { OrdersProvider } from "@/context/OrdersContext";
import { TableProvider } from "@/context/TableContext";
import { AuthProvider } from "@/context/AuthContext";
import { GroupOrderProvider } from "@/context/GroupOrderContext";
import { ThemeProvider } from "next-themes";
import ProtectedRoute from "@/components/ProtectedRoute";

import Layout from "./pages/Layout";
import Index from "./pages/Index";
import Menu from "./pages/Menu";
import MenuItemDetail from "./pages/MenuItemDetail";
import MyOrders from "./pages/MyOrders";
import CallWaiter from "./pages/CallWaiter";
import Bill from "./pages/Bill";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Login from "./pages/Login";
import LoginSuccess from "./pages/LoginSuccess";
import Signup from "./pages/Signup";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import CategoryDetail from "./pages/CategoryDetail";
import ScanTable from "./pages/ScanTable";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import GroupOrderPage from "./pages/GroupOrderPage";

// Create a new client with proper configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <BrowserRouter>
            <AuthProvider>
              <TableProvider>
                <GroupOrderProvider>
                  <CartProvider>
                    <OrdersProvider>
                      <FavoritesProvider>
                        <TooltipProvider>
                        <Toaster />
                        <Sonner position="top-right" closeButton />
                        <Routes>
                          <Route element={<Layout />}>
                            <Route path="/" element={<Index />} />
                            <Route path="/scan" element={<ScanTable />} />
                            <Route path="/menu" element={<Menu />} />
                            <Route path="/menu/:id" element={<MenuItemDetail />} />
                            <Route path="/category/:categoryId" element={<CategoryDetail />} />
                            <Route path="/call-waiter" element={<CallWaiter />} />
                            <Route path="/my-orders" element={
                              <ProtectedRoute>
                                <MyOrders />
                              </ProtectedRoute>
                            } />
                            <Route path="/bill" element={
                              <ProtectedRoute>
                                <Bill />
                              </ProtectedRoute>
                            } />
                            <Route path="/checkout" element={
                              <ProtectedRoute>
                                <Checkout />
                              </ProtectedRoute>
                            } />
                            <Route path="/order-confirmation" element={
                              <ProtectedRoute>
                                <OrderConfirmation />
                              </ProtectedRoute>
                            } />
                            <Route path="/payment/success" element={<PaymentSuccess />} />
                            <Route path="/payment/cancel" element={<PaymentCancel />} />
                            <Route path="/group-order/:joinCode" element={<GroupOrderPage />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/login/success" element={<LoginSuccess />} />
                            <Route path="/signup" element={<Signup />} />
                            <Route path="/account" element={
                              <ProtectedRoute>
                                <Account />
                              </ProtectedRoute>
                            } />
                            <Route path="*" element={<NotFound />} />
                          </Route>
                        </Routes>
                        </TooltipProvider>
                      </FavoritesProvider>
                    </OrdersProvider>
                  </CartProvider>
                </GroupOrderProvider>
              </TableProvider>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
// 
// 
// 
