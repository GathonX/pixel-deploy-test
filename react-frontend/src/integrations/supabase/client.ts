/**
 * Fake Supabase client — redirige vers l'API Laravel.
 * Utilisé pour rendre compatible mada-booking sans Supabase.
 */
import axiosApi from "@/services/api";

function getSiteIdFromUrl(): string | null {
  const match = window.location.pathname.match(/\/mada-booking\/vue-site\/([^/]+)/);
  return match ? match[1] : null;
}

class QueryBuilder {
  private table: string;
  private filters: { col: string; val: any }[] = [];
  private _operation: "select" | "update" | "insert" | "delete" = "select";
  private _updateData: any = null;
  private _insertData: any = null;
  private _orderCol: string | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(_cols = "*") {
    this._operation = "select";
    return this;
  }

  update(data: any) {
    this._operation = "update";
    this._updateData = data;
    return this;
  }

  insert(data: any) {
    this._operation = "insert";
    this._insertData = data;
    return this;
  }

  delete() {
    this._operation = "delete";
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ col, val });
    return this;
  }

  neq(_col: string, _val: any) { return this; }
  lt(_col: string, _val: any) { return this; }
  gt(_col: string, _val: any) { return this; }
  is(_col: string, _val: any) { return this; }
  in(_col: string, _vals: any[]) { return this; }

  order(_col: string, _opts?: any) {
    return this;
  }

  private getFilter(col: string): any {
    return this.filters.find(f => f.col === col)?.val;
  }

  private async exec(): Promise<{ data: any; error: any }> {
    const siteId =
      this.getFilter("site_id") ||
      (this._insertData?.site_id) ||
      getSiteIdFromUrl();

    const key = this.getFilter("key");
    const id = this.getFilter("id");

    try {
      // ── SETTINGS (CGV) ──────────────────────────────────────────────────
      if (this.table === "settings") {
        if (this._operation === "select") {
          if (!siteId) return { data: null, error: null };
          try {
            const { data } = await axiosApi.get(`/booking/${siteId}/settings/cgv_content`);
            const value = data?.value ?? null;
            if (!value) return { data: null, error: null };
            return {
              data: { id: `${siteId}__cgv`, key: "cgv", value, site_id: siteId },
              error: null,
            };
          } catch {
            return { data: null, error: null };
          }
        }

        if (this._operation === "update") {
          // id est de la forme "{siteId}__cgv"
          const resolvedSiteId = id?.toString().split("__")[0] || siteId;
          if (!resolvedSiteId) return { data: null, error: null };
          await axiosApi.put(`/booking/${resolvedSiteId}/settings/cgv_content`, {
            value: this._updateData?.value,
          });
          return { data: null, error: null };
        }

        if (this._operation === "insert") {
          const s = this._insertData?.site_id || siteId;
          if (!s) return { data: null, error: null };
          await axiosApi.put(`/booking/${s}/settings/cgv_content`, {
            value: this._insertData?.value,
          });
          return { data: null, error: null };
        }
      }

      // ── EMAIL TEMPLATES ─────────────────────────────────────────────────
      if (this.table === "email_templates") {
        if (this._operation === "select") {
          if (!siteId) return { data: [], error: null };
          const { data } = await axiosApi.get(`/booking/${siteId}/email-templates`);
          return { data: Array.isArray(data) ? data : [], error: null };
        }

        if (this._operation === "insert") {
          const s = this._insertData?.site_id || siteId;
          if (!s) return { data: null, error: null };
          const { data } = await axiosApi.post(`/booking/${s}/email-templates`, this._insertData);
          return { data, error: null };
        }

        if (this._operation === "update") {
          if (!siteId || !id) return { data: null, error: null };
          await axiosApi.post(`/booking/${siteId}/email-templates`, {
            ...this._updateData,
            id,
          });
          return { data: null, error: null };
        }
      }
    } catch (err: any) {
      return {
        data: null,
        error: {
          message: err?.message || "Erreur API",
          status: err?.response?.status,
          required_plan: err?.response?.data?.required_plan,
          current_plan: err?.response?.data?.current_plan,
        },
      };
    }

    return { data: null, error: null };
  }

  then(resolve: (v: any) => any, reject?: (e: any) => any) {
    return this.exec().then(resolve as any, reject);
  }

  async maybeSingle() {
    const res = await this.exec();
    const data = Array.isArray(res.data) ? (res.data[0] ?? null) : res.data;
    return { data, error: res.error };
  }

  async single() {
    return this.maybeSingle();
  }
}

class FakeAuth {
  async getUser() {
    return { data: { user: { id: "pixel-rise-user" } }, error: null };
  }
  async signInWithPassword(_creds: any) {
    return { data: null, error: { message: "Auth gérée par Pixel Rise" } };
  }
  async signOut() {
    return { error: null };
  }
}

class FakeStorage {
  from(_bucket: string) {
    return {
      upload: async () => ({ error: null }),
      getPublicUrl: (_path: string) => ({ data: { publicUrl: "" } }),
      remove: async () => ({ error: null }),
    };
  }
}

class FakeSupabase {
  auth = new FakeAuth();
  storage = new FakeStorage();

  from(table: string) {
    return new QueryBuilder(table);
  }

  channel(_name: string) {
    return {
      on: () => ({ subscribe: () => null }),
      subscribe: () => null,
    };
  }

  removeChannel(_channel: any) {}
}

export const supabase = new FakeSupabase() as any;
