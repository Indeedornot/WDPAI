import type { AdminLoginAudit, AdminRun, AdminSave, AdminUser } from '../../admin/AdminClient';
import type { AuthUser } from '../../auth/AuthClient';
import { UiKit } from './UiKit';

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
    rows.push(UiKit.hint(user ? `Signed in as ${user.email} (${user.role})` : 'Not signed in.'));

    const refreshBtn = UiKit.smallButton({
      label: this._busy ? 'Working…' : 'Refresh',
      onClick: () => void this.loadUsers(),
    });
    refreshBtn.disabled = this._busy;
    rows.push(UiKit.row('Users', refreshBtn));

    if (this._users.length === 0) 
    {
      rows.push(UiKit.hint('No users loaded yet.'));
    }
    else 
    {
      for (const u of this._users) 
      {
        const inspectSaves = UiKit.smallButton({
          label: this._busy ? 'Working…' : 'Inspect Saves',
          onClick: () => void this._inspectSaves(u.id),
        });
        inspectSaves.disabled = this._busy;

        const inspectRuns = UiKit.smallButton({
          label: this._busy ? 'Working…' : 'Inspect Runs',
          onClick: () => void this._inspectRuns(u.id),
        });
        inspectRuns.disabled = this._busy;

        const banBtn = UiKit.smallButton({
          label: this._busy ? 'Working…' : u.bannedAt ? 'Unban' : 'Ban',
          onClick: () => void this._toggleBan(u.id, !u.bannedAt),
        });
        banBtn.disabled = this._busy;

        const pills: HTMLElement[] = [
          UiKit.pill(u.email),
          UiKit.pill(u.role),
          UiKit.pill(u.bannedAt ? 'Banned' : 'Active'),
          ...(u.bannedAt && u.bannedReason ? [UiKit.pill(u.bannedReason)] : []),
          inspectSaves,
          inspectRuns,
          banBtn,
        ];
        rows.push(UiKit.row(`#${u.id}`, ...pills));
      }
    }

    rows.push(
      UiKit.section(
        this._selectedUserId != null ? `Saves for userId=${this._selectedUserId}` : 'Saves',
        this._buildSaveRows(),
      ),
    );

    rows.push(
      UiKit.section(
        this._selectedUserId != null ? `Runs for userId=${this._selectedUserId}` : 'Runs',
        this._buildRunRows(),
      ),
    );

    rows.push(UiKit.section('Login audit', this._buildAuditRows()));

    if (this._status) 
    {
      rows.push(UiKit.hint(this._status));
    }

    rows.push(UiKit.button({ label: 'Back', onClick: () => this._onBack() }));

    return UiKit.section('Admin', rows);
  }

  private _buildSaveRows(): HTMLElement[] 
  {
    if (this._selectedUserId == null) 
    {
      return [UiKit.hint('Pick a user to inspect their save slots.')];
    }
    if (this._saves.length === 0) 
    {
      return [UiKit.hint('No saves found.')];
    }
    return this._saves.map((s) => UiKit.row(s.slot, UiKit.pill(`v${s.version}`), UiKit.pill(s.updatedAt)));
  }

  private _buildRunRows(): HTMLElement[] 
  {
    if (this._selectedUserId == null) 
    {
      return [UiKit.hint('Pick a user to inspect their runs.')];
    }
    if (this._runs.length === 0) 
    {
      return [UiKit.hint('No runs found.')];
    }
    return this._runs.map((r) => 
    {
      const accuracy = r.shotsFired <= 0 ? 0 : r.shotsHit / r.shotsFired;
      return UiKit.row(
        r.createdAt,
        UiKit.pill(`t=${r.timeSeconds}s`),
        UiKit.pill(`Lv ${r.level}`),
        UiKit.pill(`XP ${r.xp}`),
        UiKit.pill(`Kills ${r.kills}`),
        UiKit.pill(`Acc ${Math.round(accuracy * 100)}%`),
      );
    });
  }

  private _buildAuditRows(): HTMLElement[] 
  {
    if (this._audit.length === 0) 
    {
      return [UiKit.hint('No audit events loaded yet.')];
    }
    return this._audit.map((entry) => 
    {
      const pills: HTMLElement[] = [UiKit.pill(entry.email), UiKit.pill(entry.reason)];
      if (entry.ip) 
      {
        pills.push(UiKit.pill(entry.ip));
      }
      return UiKit.row(entry.attempted_at, ...pills);
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
