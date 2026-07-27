import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { Route, Switch } from "wouter";
import { SessionProvider, useSession } from "@/contexts/AuthContext";

// Pages
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import ProfileEditPage from "@/pages/ProfileEditPage";
import QRPage from "@/pages/QRPage";
import SettingsPage from "@/pages/SettingsPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import SMSPage from "@/pages/SMSPage";
import SubAccountsPage from "@/pages/SubAccountsPage";
import MoveAccountPage from "@/pages/MoveAccountPage";
import PrintPage from "@/pages/PrintPage";
import SystemAdminPage from "@/pages/SystemAdminPage";
import PublicProfilePage from "@/pages/PublicProfilePage";
import RenewPage from "@/pages/RenewPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({
  component: Component,
  role,
}: {
  component: React.ComponentType;
  role?: string;
}) {
  const { session, loading } = useSession();
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) {
    window.location.replace("/login");
    return null;
  }
  if (role && session.user.role !== role) {
    window.location.replace("/dashboard");
    return null;
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/profile/:profileId" component={PublicProfilePage} />
      <Route path="/renew/:profileId" component={RenewPage} />

      {/* Protected dashboard */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/dashboard/profile-edit">
        {() => <ProtectedRoute component={ProfileEditPage} />}
      </Route>
      <Route path="/dashboard/qr">
        {() => <ProtectedRoute component={QRPage} />}
      </Route>
      <Route path="/dashboard/settings">
        {() => <ProtectedRoute component={SettingsPage} />}
      </Route>
      <Route path="/dashboard/change-password">
        {() => <ProtectedRoute component={ChangePasswordPage} />}
      </Route>
      <Route path="/dashboard/sms">
        {() => <ProtectedRoute component={SMSPage} />}
      </Route>
      <Route path="/dashboard/sub-accounts">
        {() => <ProtectedRoute component={SubAccountsPage} />}
      </Route>
      <Route path="/dashboard/move-account">
        {() => <ProtectedRoute component={MoveAccountPage} />}
      </Route>
      <Route path="/dashboard/print">
        {() => <ProtectedRoute component={PrintPage} />}
      </Route>
      <Route path="/system-admin">
        {() => <ProtectedRoute component={SystemAdminPage} role="system_admin" />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Router />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: "12px", padding: "12px 16px", fontSize: "14px" },
          }}
        />
      </SessionProvider>
    </QueryClientProvider>
  );
}

export default App;
