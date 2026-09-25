// Hand-written to match supabase/migrations/0001_init.sql.
// Regenerate/reconcile with `supabase gen types typescript` once the
// project is linked to a live Supabase instance.
//
// `Relationships: []` is required on every table/view (even though we
// don't use it) so supabase-js's GenericSchema constraint resolves — without
// it, every insert/update/rpc call silently infers as `never`.

export type UserRole = "minimum" | "maximum";
export type ReservationStatus = "active" | "cancelled";

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role?: UserRole;
        };
        Update: {
          name?: string;
          role?: UserRole;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          name: string;
          parent_location_id: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          parent_location_id?: string | null;
        };
        Update: {
          name?: string;
          parent_location_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "locations_parent_location_id_fkey";
            columns: ["parent_location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      items: {
        Row: {
          id: string;
          name: string;
          identification_number: string | null;
          quantity: number;
          // What's being counted ("bundles", "rolls", ...) and whether the
          // number is an estimate rather than an exact count — the count
          // itself stays a required integer either way (see 0006).
          unit: string | null;
          is_approximate: boolean;
          condition: string | null;
          location_id: string;
          notes: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          identification_number?: string | null;
          quantity: number;
          unit?: string | null;
          is_approximate?: boolean;
          condition?: string | null;
          location_id: string;
          notes?: string | null;
        };
        Update: {
          name?: string;
          identification_number?: string | null;
          quantity?: number;
          unit?: string | null;
          is_approximate?: boolean;
          condition?: string | null;
          location_id?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "items_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      item_photos: {
        Row: {
          id: string;
          item_id: string;
          storage_path: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          storage_path: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "item_photos_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      reservations: {
        Row: {
          id: string;
          // Nullable: ON DELETE SET NULL when the referenced item/user is
          // deleted, so the reservation stays on record as history instead
          // of being deleted or blocking the delete (see migrations 0004
          // and 0005).
          item_id: string | null;
          user_id: string | null;
          quantity: number;
          contact_info: string | null;
          // Optional free-text message to the material's owner (pick-up
          // arrangements, drop-off, who it's assigned to...) — see 0014.
          comments: string | null;
          status: ReservationStatus;
          created_at: string;
          cancelled_at: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          user_id: string;
          quantity: number;
          contact_info?: string | null;
          comments?: string | null;
        };
        Update: {
          status?: ReservationStatus;
          cancelled_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
        };
        Update: {
          user_id?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pending_item_notifications: {
        Row: {
          id: string;
          item_name: string;
          created_at: string;
          sent: boolean;
        };
        Insert: {
          id?: string;
          item_name: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: {
      item_availability: {
        Row: {
          item_id: string;
          total_quantity: number;
          reserved_quantity: number;
          available_quantity: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      reserve_item: {
        Args: {
          p_item_id: string;
          p_quantity: number;
          p_contact_info?: string | null;
          p_comments?: string | null;
        };
        Returns: Database["public"]["Tables"]["reservations"]["Row"];
      };
      cancel_reservation: {
        Args: { p_reservation_id: string };
        Returns: Database["public"]["Tables"]["reservations"]["Row"];
      };
      register_push_token: {
        Args: { p_token: string };
        Returns: undefined;
      };
      is_max_tier: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Location = Database["public"]["Tables"]["locations"]["Row"];
export type Item = Database["public"]["Tables"]["items"]["Row"];
export type ItemPhoto = Database["public"]["Tables"]["item_photos"]["Row"];
export type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
export type ItemAvailability = Database["public"]["Views"]["item_availability"]["Row"];

export type ItemWithDetails = Item & {
  location: Location;
  item_photos: ItemPhoto[];
  // Computed client-side from embedded reservations (see normalizeItemWithDetails
  // in queries/items.ts) — always present, never null.
  availability: ItemAvailability;
  // Null for items added before ownership was tracked (created_by null) —
  // shown to browsing users so they can contact the adder before reserving.
  creator: Pick<Profile, "name" | "email"> | null;
};

export type ReservationWithDetails = Reservation & {
  // null when the material or user was since deleted — the reservation
  // itself still exists as history.
  item: (Pick<Item, "id" | "name" | "identification_number" | "unit"> & { item_photos: Pick<ItemPhoto, "storage_path">[] }) | null;
  user: Pick<Profile, "id" | "name" | "email"> | null;
};
