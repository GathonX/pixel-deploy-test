// Stub de types Supabase — les vrais types viennent de Laravel

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Tables<T extends string> = Record<string, any>;

export type Database = {
  public: {
    Tables: Record<string, any>;
  };
};
