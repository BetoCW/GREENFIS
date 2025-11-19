/* Minimal Supabase REST client with generic CRUD and filtering */

export type FilterOp = 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'like'|'ilike'|'is'|'in'|'cs'|'cd'|'ov'|'fts'|'plfts'|'phfts'|'wfts';

export type Filter = { column: string; op: FilterOp; value: any };

export type Order = { column: string; ascending?: boolean; nullsFirst?: boolean };

export type ListOptions = {
  select?: string;
  filters?: Filter[];
  order?: Order;
  limit?: number;
  offset?: number;
};

export class SupabaseCRUD {
  private url: string;
  private key: string;

  constructor(url?: string, key?: string) {
    const u = url ?? (import.meta as any).env?.VITE_SUPABASE_URL;
    const k = key ?? (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
    if (!u || !k) throw new Error('Supabase env not configured (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
    this.url = String(u).replace(/\/$/, '');
    this.key = String(k);
  }

  private headers(method: string) {
    const h: Record<string, string> = {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
    };
    if (method !== 'GET') {
      h['Content-Type'] = 'application/json';
      h['Prefer'] = 'return=representation';
    }
    return h;
  }

  private encodeValue(op: FilterOp, value: any): string {
    if (op === 'in') {
      const arr = Array.isArray(value) ? value : String(value).split(',');
      return `in.(${arr.map(v => encodeURIComponent(String(v))).join(',')})`;
    }
    if (typeof value === 'boolean') return `${op}.${value ? 'true' : 'false'}`;
    if (value === null) return `${op}.null`;
    return `${op}.${encodeURIComponent(String(value))}`;
  }

  private buildQuery(opts?: ListOptions): string {
    const params: string[] = [];
    const sel = opts?.select ?? '*';
    params.push(`select=${encodeURIComponent(sel)}`);
    if (opts?.filters) {
      for (const f of opts.filters) {
        params.push(`${encodeURIComponent(f.column)}=${this.encodeValue(f.op, f.value)}`);
      }
    }
    if (opts?.order?.column) {
      const dir = opts.order.ascending === false ? 'desc' : 'asc';
      const nulls = opts.order.nullsFirst ? '.nullsfirst' : '.nullslast';
      params.push(`order=${encodeURIComponent(opts.order.column)}.${dir}${nulls}`);
    }
    if (opts?.limit != null) params.push(`limit=${opts.limit}`);
    if (opts?.offset != null) params.push(`offset=${opts.offset}`);
    return params.length ? `?${params.join('&')}` : '';
  }

  async list(table: string, opts?: ListOptions): Promise<{ ok: boolean; data: any[]; error?: any }>{
    const qs = this.buildQuery(opts);
    const res = await fetch(`${this.url}/rest/v1/${table}${qs}`, { headers: this.headers('GET') });
    if (!res.ok) {
      const err = await this.safeJson(res);
      return { ok: false, data: [], error: err || { status: res.status } };
    }
    return { ok: true, data: await res.json() };
  }

  async findOne(table: string, filters: Filter[], select = '*') {
    const r = await this.list(table, { select, filters, limit: 1 });
    return { ok: r.ok, data: r.data[0] ?? null, error: r.error };
  }

  async insert(table: string, payload: any | any[]) {
    const res = await fetch(`${this.url}/rest/v1/${table}`, {
      method: 'POST', headers: this.headers('POST'), body: JSON.stringify(payload)
    });
    if (!res.ok) return { ok: false, data: null, error: await this.safeJson(res) };
    return { ok: true, data: await res.json() };
  }

  async update(table: string, payload: any, filters: Filter[]) {
    const qs = this.buildQuery({ select: '*', filters });
    const res = await fetch(`${this.url}/rest/v1/${table}${qs}`, {
      method: 'PATCH', headers: this.headers('PATCH'), body: JSON.stringify(payload)
    });
    if (!res.ok) return { ok: false, data: null, error: await this.safeJson(res) };
    return { ok: true, data: await res.json() };
  }

  async remove(table: string, filters: Filter[]) {
    const qs = this.buildQuery({ filters });
    const res = await fetch(`${this.url}/rest/v1/${table}${qs}`, {
      method: 'DELETE', headers: this.headers('DELETE')
    });
    if (!res.ok) return { ok: false, error: await this.safeJson(res) } as any;
    // PostgREST may return empty; signal ok
    return { ok: true } as any;
  }

  private async safeJson(res: Response) {
    try { return await res.json(); } catch { return { status: res.status, statusText: res.statusText }; }
  }
}
