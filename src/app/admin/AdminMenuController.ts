import type { AuthUser } from '../auth/AuthClient';
import type { AdminPanelAdmin } from '../ui/components/AdminPanel';
import { AdminClient, type AdminUser, type AdminSave, type AdminRun, type AdminLoginAudit } from './AdminClient';

/** Adapts AdminClient to the AdminPanel's expected interface. */
export class AdminMenuController implements AdminPanelAdmin
{
  private readonly _admin: AdminClient;

  constructor(admin: AdminClient)
  {
    this._admin = admin;
  }

  isAdmin(): boolean
  {
    return this._admin.isAdminUser();
  }

  getUser(): AuthUser | null
  {
    return this._admin.currentUser();
  }

  listUsers(): Promise<AdminUser[]>
  {
    return this._admin.listUsers();
  }

  listSaves(userId: number): Promise<AdminSave[]>
  {
    return this._admin.listSaves(userId);
  }

  listRuns(userId: number): Promise<AdminRun[]>
  {
    return this._admin.listRuns(userId);
  }

  listLoginAudit(): Promise<AdminLoginAudit[]>
  {
    return this._admin.listLoginAudit();
  }

  setBan(userId: number, banned: boolean, reason?: string): Promise<void>
  {
    return this._admin.setBan(userId, banned, reason);
  }
}
