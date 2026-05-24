import type { AdminLoginAudit, AdminRun, AdminSave, AdminUser } from '../../admin/AdminClient';
import type { AuthUser } from '../../auth/AuthClient';
import { uiButton, uiHint, uiPill, uiRow, uiSection, uiSmallButton } from './UiKit';

export type AdminPanelAdmin = {
  isAdmin: () => boolean;
  getUser: () => AuthUser | null;
  listUsers: () => Promise<AdminUser[]>;
  listSaves: (userId: number) => Promise<AdminSave[]>;
  listRuns: (userId: number) => Promise<AdminRun[]>;
  listLoginAudit: () => Promise<AdminLoginAudit[]>;
  setBan: (userId: number, banned: boolean, reason?: string) => Promise<void>;
};

export class AdminPanel 
{
  private readonly _admin: AdminPanelAdmin;
  private readonly _onBack: () => void;
  private readonly _onNeedRender: () => void;
  private _busy = false;
  private _status = '';
  private _users: AdminUser[] = [];
  private _saves: AdminSave[] = [];
  private _runs: AdminRun[] = [];
  private _audit: AdminLoginAudit[] = [];
  private _selectedUserId: number | null = null;

  constructor(admin: AdminPanelAdmin, onBack: () => void, onNeedRender: () => void) 
  {
    this._admin = admin;
    this._onBack = onBack;
    this._onNeedRender = onNeedRender;
  }

  resetState(): void 
  {
    this._status = '';
    this._busy = false;
    this._audit = [];
  }

  async loadUsers(): Promise<void> 
  {
    await this._runBusy('Failed to load users', async () => 
    {
      await this._doLoadUsers();
      this._status = `Loaded ${this._users.length} user(s).`;
    });
  }

  render(): HTMLDivElement 
  {
    const rows: HTMLElement[] = [];

    const user = this._admin.getUser();
    rows.push(uiHint(user ? `Signed in as ${user.email} (${user.role})` : 'Not signed in.'));

    const refreshBtn = uiSmallButton({
      label: this._busy ? 'Working…' : 'Refresh',
      onClick: () => void this.loadUsers(),
    });
    refreshBtn.disabled = this._busy;
    rows.push(uiRow('Users', refreshBtn));

    if (this._users.length === 0) 
    {
      rows.push(uiHint('No users loaded yet.'));
    }
    else 
    {
      for (const u of this._users) 
      {
        const inspectSaves = uiSmallButton({
          label: this._busy ? 'Working…' : 'Inspect Saves',
          onClick: () => void this._inspectSaves(u.id),
        });
        inspectSaves.disabled = this._busy;

        const inspectRuns = uiSmallButton({
          label: this._busy ? 'Working…' : 'Inspect Runs',
          onClick: () => void this._inspectRuns(u.id),
        });
        inspectRuns.disabled = this._busy;

        const banBtn = uiSmallButton({
          label: this._busy ? 'Working…' : u.bannedAt ? 'Unban' : 'Ban',
          onClick: () => void this._toggleBan(u.id, !u.bannedAt),
        });
        banBtn.disabled = this._busy;

        const pills: HTMLElement[] = [
          uiPill(u.email),
          uiPill(u.role),
          uiPill(u.bannedAt ? 'Banned' : 'Active'),
          ...(u.bannedAt && u.bannedReason ? [uiPill(u.bannedReason)] : []),
          inspectSaves,
          inspectRuns,
          banBtn,
        ];
        rows.push(uiRow(`#${u.id}`, ...pills));
      }
    }

    rows.push(
      uiSection(
        this._selectedUserId != null ? `Saves for userId=${this._selectedUserId}` : 'Saves',
        this._buildSaveRows(),
      ),
    );

    rows.push(
      uiSection(
        this._selectedUserId != null ? `Runs for userId=${this._selectedUserId}` : 'Runs',
        this._buildRunRows(),
      ),
    );

    rows.push(uiSection('Login audit', this._buildAuditRows()));

    if (this._status) 
    {
      rows.push(uiHint(this._status));
    }

    rows.push(uiButton({ label: 'Back', onClick: () => this._onBack() }));

    return uiSection('Admin', rows);
  }

  private _buildSaveRows(): HTMLElement[] 
  {
    if (this._selectedUserId == null) 
    {
      return [uiHint('Pick a user to inspect their save slots.')];
    }
    if (this._saves.length === 0) 
    {
      return [uiHint('No saves found.')];
    }
    return this._saves.map((s) => uiRow(s.slot, uiPill(`v${s.version}`), uiPill(s.updatedAt)));
  }

  private _buildRunRows(): HTMLElement[] 
  {
    if (this._selectedUserId == null) 
    {
      return [uiHint('Pick a user to inspect their runs.')];
    }
    if (this._runs.length === 0) 
    {
      return [uiHint('No runs found.')];
    }
    return this._runs.map((r) => 
    {
      const accuracy = r.shotsFired <= 0 ? 0 : r.shotsHit / r.shotsFired;
      return uiRow(
        r.createdAt,
        uiPill(`t=${r.timeSeconds}s`),
        uiPill(`Lv ${r.level}`),
        uiPill(`XP ${r.xp}`),
        uiPill(`Kills ${r.kills}`),
        uiPill(`Acc ${Math.round(accuracy * 100)}%`),
      );
    });
  }

  private _buildAuditRows(): HTMLElement[] 
  {
    if (this._audit.length === 0) 
    {
      return [uiHint('No audit events loaded yet.')];
    }
    return this._audit.map((entry) => 
    {
      const pills: HTMLElement[] = [uiPill(entry.email), uiPill(entry.reason)];
      if (entry.ip) 
      {
        pills.push(uiPill(entry.ip));
      }
      return uiRow(entry.attempted_at, ...pills);
    });
  }

  private async _runBusy(errorLabel: string, fn: () => Promise<void>): Promise<void> 
  {
    this._busy = true;
    this._status = '';
    this._onNeedRender();
    try 
    {
      await fn();
    }
    catch (e) 
    {
      this._status = `${errorLabel}: ${e instanceof Error ? e.message : 'unknown_error'}`;
    }
    finally 
    {
      this._busy = false;
      this._onNeedRender();
    }
  }

  private async _doLoadUsers(): Promise<void> 
  {
    this._users = await this._admin.listUsers();
    this._audit = await this._admin.listLoginAudit();
  }

  private async _toggleBan(userId: number, banned: boolean): Promise<void> 
  {
    let reason: string | undefined;
    if (banned) 
    {
      const r = window.prompt('Ban reason (optional):', '');
      if (r !== null) 
      {
        reason = r;
      }
    }

    await this._runBusy('Failed', async () => 
    {
      await this._admin.setBan(userId, banned, reason);
      this._selectedUserId = null;
      this._saves = [];
      await this._doLoadUsers();
      this._status = banned ? 'User banned.' : 'User unbanned.';
    });
  }

  private async _inspectSaves(userId: number): Promise<void> 
  {
    await this._runBusy('Failed to load saves', async () => 
    {
      this._selectedUserId = userId;
      this._runs = [];
      this._saves = await this._admin.listSaves(userId);
      this._status = `Loaded ${this._saves.length} save slot(s).`;
    });
  }

  private async _inspectRuns(userId: number): Promise<void> 
  {
    await this._runBusy('Failed to load runs', async () => 
    {
      this._selectedUserId = userId;
      this._saves = [];
      this._runs = await this._admin.listRuns(userId);
      this._status = `Loaded ${this._runs.length} run(s).`;
    });
  }
}
