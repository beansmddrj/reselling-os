export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; created_at: string; updated_at: string };
        Insert: { id: string; display_name?: string | null; created_at?: string; updated_at?: string };
        Update: { display_name?: string | null; updated_at?: string };
        Relationships: [];
      };
      products: {
        Row: { id: string; owner_id: string; name: string; brand: string | null; category: string | null; size: string | null; color: string | null; condition: string | null; description: string | null; is_template: boolean; restock_status: string; default_asking_price_cents: number | null; default_cost_cents: number | null; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; name: string; brand?: string | null; category?: string | null; size?: string | null; color?: string | null; condition?: string | null; description?: string | null; is_template?: boolean; restock_status?: string; default_asking_price_cents?: number | null; default_cost_cents?: number | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      inventory_units: {
        Row: { id: string; owner_id: string; product_id: string; sku: string; status: Database["public"]["Enums"]["inventory_status"]; acquisition_cost_cents: number; acquired_at: string; storage_location: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; product_id: string; sku: string; status?: Database["public"]["Enums"]["inventory_status"]; acquisition_cost_cents: number; acquired_at?: string; storage_location?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["inventory_units"]["Insert"]>;
        Relationships: [];
      };
      listings: {
        Row: { id: string; owner_id: string; product_id: string; platform: Database["public"]["Enums"]["marketplace_platform"]; status: Database["public"]["Enums"]["listing_status"]; external_listing_id: string | null; external_url: string | null; title: string; description: string | null; asking_price_cents: number; minimum_price_cents: number | null; original_ai_title: string | null; original_ai_description: string | null; original_ai_asking_price_cents: number | null; posted_at: string | null; ended_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; product_id: string; platform: Database["public"]["Enums"]["marketplace_platform"]; status?: Database["public"]["Enums"]["listing_status"]; external_listing_id?: string | null; external_url?: string | null; title: string; description?: string | null; asking_price_cents: number; minimum_price_cents?: number | null; original_ai_title?: string | null; original_ai_description?: string | null; original_ai_asking_price_cents?: number | null; posted_at?: string | null; ended_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["listings"]["Insert"]>;
        Relationships: [];
      };
      sales: {
        Row: { id: string; owner_id: string; inventory_unit_id: string; listing_id: string | null; platform: Database["public"]["Enums"]["marketplace_platform"]; sale_price_cents: number; cogs_cents: number; platform_fee_cents: number; payment_fee_cents: number; shipping_cost_cents: number; other_cost_cents: number; sold_at: string; created_at: string };
        Insert: { id?: string; owner_id: string; inventory_unit_id: string; listing_id?: string | null; platform: Database["public"]["Enums"]["marketplace_platform"]; sale_price_cents: number; cogs_cents: number; platform_fee_cents?: number; payment_fee_cents?: number; shipping_cost_cents?: number; other_cost_cents?: number; sold_at?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["sales"]["Insert"]>;
        Relationships: [];
      };
      business_events: {
        Row: { id: string; owner_id: string; event_type: string; entity_type: string | null; entity_id: string | null; metadata: Json; occurred_at: string };
        Insert: { id?: string; owner_id: string; event_type: string; entity_type?: string | null; entity_id?: string | null; metadata?: Json; occurred_at?: string };
        Update: Partial<Database["public"]["Tables"]["business_events"]["Insert"]>;
        Relationships: [];
      };
      intake_drafts: {
        Row: { id: string; owner_id: string; step: Database["public"]["Enums"]["intake_step"]; name: string; brand: string | null; category: string | null; size: string | null; color: string | null; condition: string | null; description: string | null; acquisition_cost_cents: number | null; asking_price_cents: number | null; storage_location: string | null; photo_paths: string[]; created_at: string; updated_at: string };
        Insert: { id?: string; owner_id: string; step?: Database["public"]["Enums"]["intake_step"]; name?: string; brand?: string | null; category?: string | null; size?: string | null; color?: string | null; condition?: string | null; description?: string | null; acquisition_cost_cents?: number | null; asking_price_cents?: number | null; storage_location?: string | null; photo_paths?: string[]; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["intake_drafts"]["Insert"]>;
        Relationships: [];
      };
      product_photos: {
        Row: { id: string; owner_id: string; product_id: string; storage_path: string; position: number; created_at: string };
        Insert: { id?: string; owner_id: string; product_id: string; storage_path: string; position: number; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["product_photos"]["Insert"]>;
        Relationships: [];
      };
      business_members: {
        Row: { business_owner_id: string; user_id: string; role: Database["public"]["Enums"]["business_role"]; joined_at: string };
        Insert: { business_owner_id: string; user_id: string; role: Database["public"]["Enums"]["business_role"]; joined_at?: string };
        Update: Partial<Database["public"]["Tables"]["business_members"]["Insert"]>;
        Relationships: [];
      };
      business_invites: {
        Row: { id: string; business_owner_id: string; email: string; invited_by: string; accepted_at: string | null; created_at: string };
        Insert: { id?: string; business_owner_id: string; email: string; invited_by: string; accepted_at?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["business_invites"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      finalize_intake_draft: {
        Args: { draft_id: string };
        Returns: { product_id: string; inventory_unit_id: string; listing_id: string }[];
      };
      update_inventory_item: {
        Args: {
          target_unit_id: string;
          product_name: string;
          product_brand: string;
          product_category: string;
          product_size: string;
          product_color: string;
          product_condition: string;
          product_description: string;
          product_sell_multiple: boolean;
          unit_cost_cents: number;
          unit_storage_location: string;
          listing_title: string;
          listing_description: string;
          listing_asking_price_cents: number;
        };
        Returns: undefined;
      };
      delete_inventory_item: {
        Args: { target_unit_id: string };
        Returns: string[];
      };
      transition_inventory_item: {
        Args: { target_unit_id: string; target_status: Database["public"]["Enums"]["inventory_status"]; listing_external_url?: string | null };
        Returns: undefined;
      };
      accept_business_invite: {
        Args: { invite_id: string };
        Returns: undefined;
      };
      record_inventory_sale: {
        Args: {
          target_unit_id: string;
          sale_platform: Database["public"]["Enums"]["marketplace_platform"];
          sale_price_cents: number;
          platform_fee_cents: number;
          payment_fee_cents: number;
          shipping_cost_cents: number;
          other_cost_cents: number;
          sale_sold_at: string;
        };
        Returns: string;
      };
      set_product_restock_status: {
        Args: { target_unit_id: string; new_restock_status: string };
        Returns: undefined;
      };
    };
    Enums: {
      inventory_status: "draft" | "ready" | "active" | "sold";
      listing_status: "draft" | "ready" | "active" | "ended" | "sold";
      marketplace_platform: "facebook" | "ebay" | "other";
      intake_step: "photos" | "review";
      business_role: "owner" | "member";
    };
    CompositeTypes: Record<string, never>;
  };
};
