import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { OrgProvider } from './hooks/useOrg';

export default function WorkspaceApp() {
  return <AuthProvider><OrgProvider><App /></OrgProvider></AuthProvider>;
}
