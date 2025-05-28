import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import App from './App';
import './index.css';
import { StagewiseToolbar } from '@stagewise/toolbar-react';

// Create a new client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Stagewise configuration
const stagewiseConfig = {
  plugins: []
};

// Only include StagewiseToolbar in development
const ToolbarWrapper = import.meta.env.DEV ? () => (
  <StagewiseToolbar config={stagewiseConfig} />
) : () => null;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <App />
        <ToolbarWrapper />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
