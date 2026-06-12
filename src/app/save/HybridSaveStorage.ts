import type { AuthClient } from '../auth/AuthClient';
import { HttpError } from '../http/HttpClient';
import type { SaveStorage } from './SaveStorage';

/**
 * Uses remote storage when logged in; otherwise uses local storage.
 *
 * This keeps autosave working even before the user registers/logs in.
 */
export class HybridSaveStorage implements SaveStorage 
{
  private readonly _local: SaveStorage;
  private readonly _remote: SaveStorage;
  private readonly _auth: AuthClient;

  constructor(local: SaveStorage, remote: SaveStorage, auth: AuthClient) 
  {
    this._local = local;
    this._remote = remote;
    this._auth = auth;
  }

  async load(slot: string): Promise<string | null> 
  {
    if (!this._auth.isLoggedIn()) 
    {
      return this._local.load(slot);
    }
    try 
    {
      return await this._remote.load(slot);
    }
    catch (e) 
    {
      if (HybridSaveStorage.isUnauthorized(e))
      {
        this._auth.clearSession();
      }
      return this._local.load(slot);
    }
  }

  async save(slot: string, data: string): Promise<void> 
  {
    if (!this._auth.isLoggedIn()) 
    {
      return this._local.save(slot, data);
    }
    try 
    {
      await this._remote.save(slot, data);
    }
    catch (e) 
    {
      if (HybridSaveStorage.isUnauthorized(e))
      {
        this._auth.clearSession();
      }
      await this._local.save(slot, data);
    }
  }

  async remove(slot: string): Promise<void> 
  {
    if (!this._auth.isLoggedIn()) 
    {
      return this._local.remove(slot);
    }
    try 
    {
      await this._remote.remove(slot);
    }
    catch (e) 
    {
      if (HybridSaveStorage.isUnauthorized(e))
      {
        this._auth.clearSession();
      }
      await this._local.remove(slot);
    }
  }

  private static isUnauthorized(e: unknown): boolean
  {
    return e instanceof HttpError && e.status === 401;
  }
}
