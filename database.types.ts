export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      gate_entry_log: {
        Row: {
          created_at: string
          delivery_id: string | null
          entry_time: string
          entry_type: Database['public']['Enums']['entry_type']
          exit_time: string | null
          gate: string
          guest_id: string | null
          id: string
          metadata: Json | null
          outcome: Database['public']['Enums']['entry_outcome']
          permit_id: string | null
          plate_number: string | null
          purpose: string | null
          tenant_id: string
          vehicle_sticker_id: string | null
          verification_method: Database['public']['Enums']['verification_method']
          verified_by: string | null
          visitor_name: string | null
        }
        Insert: {
          created_at?: string
          delivery_id?: string | null
          entry_time?: string
          entry_type: Database['public']['Enums']['entry_type']
          exit_time?: string | null
          gate: string
          guest_id?: string | null
          id?: string
          metadata?: Json | null
          outcome: Database['public']['Enums']['entry_outcome']
          permit_id?: string | null
          plate_number?: string | null
          purpose?: string | null
          tenant_id: string
          vehicle_sticker_id?: string | null
          verification_method: Database['public']['Enums']['verification_method']
          verified_by?: string | null
          visitor_name?: string | null
        }
        Update: {
          created_at?: string
          delivery_id?: string | null
          entry_time?: string
          entry_type?: Database['public']['Enums']['entry_type']
          exit_time?: string | null
          gate?: string
          guest_id?: string | null
          id?: string
          metadata?: Json | null
          outcome?: Database['public']['Enums']['entry_outcome']
          permit_id?: string | null
          plate_number?: string | null
          purpose?: string | null
          tenant_id?: string
          vehicle_sticker_id?: string | null
          verification_method?: Database['public']['Enums']['verification_method']
          verified_by?: string | null
          visitor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'gate_entry_log_permit_id_fkey'
            columns: ['permit_id']
            isOneToOne: false
            referencedRelation: 'permit'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'gate_entry_log_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'gate_entry_log_vehicle_sticker_id_fkey'
            columns: ['vehicle_sticker_id']
            isOneToOne: false
            referencedRelation: 'vehicle_sticker'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'gate_entry_log_verified_by_fkey'
            columns: ['verified_by']
            isOneToOne: false
            referencedRelation: 'tenant_user'
            referencedColumns: ['id']
          },
        ]
      }
      household: {
        Row: {
          address: string
          alias: string | null
          block: string | null
          created_at: string
          house_number: string | null
          id: string
          lot: string | null
          metadata: Json
          status: Database['public']['Enums']['household_status']
          sticker_quota: number
          street_number: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address: string
          alias?: string | null
          block?: string | null
          created_at?: string
          house_number?: string | null
          id?: string
          lot?: string | null
          metadata?: Json
          status?: Database['public']['Enums']['household_status']
          sticker_quota?: number
          street_number?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string
          alias?: string | null
          block?: string | null
          created_at?: string
          house_number?: string | null
          id?: string
          lot?: string | null
          metadata?: Json
          status?: Database['public']['Enums']['household_status']
          sticker_quota?: number
          street_number?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'household_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      permit: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          distributed_to_guardhouse_at: string | null
          documents: Json | null
          end_date: string
          fee_amount: number
          fee_paid: boolean
          fee_paid_at: string | null
          fee_receipt_url: string | null
          household_id: string
          id: string
          permit_number: string
          permit_type: Database['public']['Enums']['permit_type']
          project_description: string
          rejection_reason: string | null
          requested_by: string
          start_date: string
          status: Database['public']['Enums']['permit_status']
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          distributed_to_guardhouse_at?: string | null
          documents?: Json | null
          end_date: string
          fee_amount?: number
          fee_paid?: boolean
          fee_paid_at?: string | null
          fee_receipt_url?: string | null
          household_id: string
          id?: string
          permit_number: string
          permit_type: Database['public']['Enums']['permit_type']
          project_description: string
          rejection_reason?: string | null
          requested_by: string
          start_date: string
          status?: Database['public']['Enums']['permit_status']
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          distributed_to_guardhouse_at?: string | null
          documents?: Json | null
          end_date?: string
          fee_amount?: number
          fee_paid?: boolean
          fee_paid_at?: string | null
          fee_receipt_url?: string | null
          household_id?: string
          id?: string
          permit_number?: string
          permit_type?: Database['public']['Enums']['permit_type']
          project_description?: string
          rejection_reason?: string | null
          requested_by?: string
          start_date?: string
          status?: Database['public']['Enums']['permit_status']
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'permit_approved_by_fkey'
            columns: ['approved_by']
            isOneToOne: false
            referencedRelation: 'tenant_user'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'permit_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'household'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'permit_requested_by_fkey'
            columns: ['requested_by']
            isOneToOne: false
            referencedRelation: 'tenant_user'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'permit_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      permit_payment: {
        Row: {
          amount: number
          collected_by: string
          created_at: string
          id: string
          payment_date: string
          payment_metadata: Json | null
          payment_method: Database['public']['Enums']['payment_method']
          permit_id: string
          receipt_number: string
          receipt_url: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          collected_by: string
          created_at?: string
          id?: string
          payment_date?: string
          payment_metadata?: Json | null
          payment_method: Database['public']['Enums']['payment_method']
          permit_id: string
          receipt_number: string
          receipt_url?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          collected_by?: string
          created_at?: string
          id?: string
          payment_date?: string
          payment_metadata?: Json | null
          payment_method?: Database['public']['Enums']['payment_method']
          permit_id?: string
          receipt_number?: string
          receipt_url?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'permit_payment_collected_by_fkey'
            columns: ['collected_by']
            isOneToOne: false
            referencedRelation: 'tenant_user'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'permit_payment_permit_id_fkey'
            columns: ['permit_id']
            isOneToOne: false
            referencedRelation: 'permit'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'permit_payment_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      resident: {
        Row: {
          created_at: string
          has_signatory_rights: boolean
          has_visiting_rights: boolean
          household_id: string
          id: string
          id_type: string | null
          id_url: string | null
          is_primary_contact: boolean
          tenant_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          has_signatory_rights?: boolean
          has_visiting_rights?: boolean
          household_id: string
          id?: string
          id_type?: string | null
          id_url?: string | null
          is_primary_contact?: boolean
          tenant_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          has_signatory_rights?: boolean
          has_visiting_rights?: boolean
          household_id?: string
          id?: string
          id_type?: string | null
          id_url?: string | null
          is_primary_contact?: boolean
          tenant_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'resident_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'household'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'resident_tenant_user_id_fkey'
            columns: ['tenant_user_id']
            isOneToOne: false
            referencedRelation: 'tenant_user'
            referencedColumns: ['id']
          },
        ]
      }
      residential_community_config: {
        Row: {
          created_at: string
          curfew_settings: Json
          emergency_contacts: Json
          gate_operating_hours: Json
          id: string
          maintenance_schedule: Json
          notification_preferences: Json
          rules_and_guidelines: Json
          tenant_id: string
          updated_at: string
          updated_by: string | null
          visitor_policies: Json
        }
        Insert: {
          created_at?: string
          curfew_settings?: Json
          emergency_contacts?: Json
          gate_operating_hours?: Json
          id?: string
          maintenance_schedule?: Json
          notification_preferences?: Json
          rules_and_guidelines?: Json
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          visitor_policies?: Json
        }
        Update: {
          created_at?: string
          curfew_settings?: Json
          emergency_contacts?: Json
          gate_operating_hours?: Json
          id?: string
          maintenance_schedule?: Json
          notification_preferences?: Json
          rules_and_guidelines?: Json
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          visitor_policies?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'residential_community_config_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: true
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'residential_community_config_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'tenant_user'
            referencedColumns: ['id']
          },
        ]
      }
      role: {
        Row: {
          code: string
          created_at: string
          description: string | null
          hierarchy_level: number
          id: string
          is_active: boolean
          name: string
          permissions: Json
          scope: Database['public']['Enums']['role_scope']
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          hierarchy_level: number
          id?: string
          is_active?: boolean
          name: string
          permissions?: Json
          scope: Database['public']['Enums']['role_scope']
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          hierarchy_level?: number
          id?: string
          is_active?: boolean
          name?: string
          permissions?: Json
          scope?: Database['public']['Enums']['role_scope']
          updated_at?: string
        }
        Relationships: []
      }
      tenant: {
        Row: {
          barangay: string | null
          contact_person: string | null
          contact_phone: string | null
          coordinates: Json | null
          created_at: string
          id: string
          municipality: string | null
          name: string
          province: string | null
          region: string | null
          slug: string
          status: Database['public']['Enums']['tenant_status']
          updated_at: string
        }
        Insert: {
          barangay?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          coordinates?: Json | null
          created_at?: string
          id?: string
          municipality?: string | null
          name: string
          province?: string | null
          region?: string | null
          slug: string
          status?: Database['public']['Enums']['tenant_status']
          updated_at?: string
        }
        Update: {
          barangay?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          coordinates?: Json | null
          created_at?: string
          id?: string
          municipality?: string | null
          name?: string
          province?: string | null
          region?: string | null
          slug?: string
          status?: Database['public']['Enums']['tenant_status']
          updated_at?: string
        }
        Relationships: []
      }
      tenant_user: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          joined_at: string
          permissions: Json
          role_id: string
          tenant_id: string
          updated_at: string
          user_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          permissions?: Json
          role_id: string
          tenant_id: string
          updated_at?: string
          user_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          permissions?: Json
          role_id?: string
          tenant_id?: string
          updated_at?: string
          user_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tenant_user_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'role'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tenant_user_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tenant_user_user_profile_id_fkey'
            columns: ['user_profile_id']
            isOneToOne: false
            referencedRelation: 'user_profile'
            referencedColumns: ['id']
          },
        ]
      }
      user_profile: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          preferences: Json
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          preferences?: Json
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          preferences?: Json
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_sticker: {
        Row: {
          created_at: string
          expiry_date: string
          holder_name: string
          household_id: string | null
          id: string
          issue_date: string
          issued_to: string
          rfid_code: string
          status: Database['public']['Enums']['sticker_status']
          sticker_type: Database['public']['Enums']['sticker_type']
          tenant_id: string
          updated_at: string
          vehicle_color: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_plate_number: string
          vehicle_registered_to: string | null
          vehicle_year: string | null
        }
        Insert: {
          created_at?: string
          expiry_date: string
          holder_name: string
          household_id?: string | null
          id?: string
          issue_date?: string
          issued_to: string
          rfid_code: string
          status?: Database['public']['Enums']['sticker_status']
          sticker_type: Database['public']['Enums']['sticker_type']
          tenant_id: string
          updated_at?: string
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_plate_number: string
          vehicle_registered_to?: string | null
          vehicle_year?: string | null
        }
        Update: {
          created_at?: string
          expiry_date?: string
          holder_name?: string
          household_id?: string | null
          id?: string
          issue_date?: string
          issued_to?: string
          rfid_code?: string
          status?: Database['public']['Enums']['sticker_status']
          sticker_type?: Database['public']['Enums']['sticker_type']
          tenant_id?: string
          updated_at?: string
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_plate_number?: string
          vehicle_registered_to?: string | null
          vehicle_year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'vehicle_sticker_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'household'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehicle_sticker_issued_to_fkey'
            columns: ['issued_to']
            isOneToOne: false
            referencedRelation: 'tenant_user'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehicle_sticker_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      vehicle_sticker_document: {
        Row: {
          created_at: string
          document_type: Database['public']['Enums']['vehicle_document_type']
          expiry_date: string | null
          file_name: string
          id: string
          mime_type: string
          storage_url: string
          tenant_id: string
          updated_at: string
          vehicle_sticker_id: string
        }
        Insert: {
          created_at?: string
          document_type: Database['public']['Enums']['vehicle_document_type']
          expiry_date?: string | null
          file_name: string
          id?: string
          mime_type: string
          storage_url: string
          tenant_id: string
          updated_at?: string
          vehicle_sticker_id: string
        }
        Update: {
          created_at?: string
          document_type?: Database['public']['Enums']['vehicle_document_type']
          expiry_date?: string | null
          file_name?: string
          id?: string
          mime_type?: string
          storage_url?: string
          tenant_id?: string
          updated_at?: string
          vehicle_sticker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vehicle_sticker_document_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehicle_sticker_document_vehicle_sticker_id_fkey'
            columns: ['vehicle_sticker_id']
            isOneToOne: false
            referencedRelation: 'vehicle_sticker'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_user_to_tenant: {
        Args: {
          p_permissions?: Json
          p_role_id: string
          p_tenant_id: string
          p_user_profile_id: string
        }
        Returns: Json
      }
      check_user_permission: {
        Args: { p_permission_key: string }
        Returns: boolean
      }
      check_user_permissions: {
        Args: { p_permission_keys: string[] }
        Returns: {
          has_permission: boolean
          permission_key: string
        }[]
      }
      clear_tenant_context: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_current_role_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_permissions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_current_user_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_tenants: {
        Args: Record<PropertyKey, never>
        Returns: {
          is_active: boolean
          joined_at: string
          role_code: string
          role_id: string
          role_name: string
          tenant_id: string
          tenant_name: string
          tenant_slug: string
          tenant_status: string
        }[]
      }
      initialize_tenant_context: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      is_superadmin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      switch_tenant_context: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      validate_current_session: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      entry_outcome: 'allowed' | 'denied'
      entry_type: 'vehicle_rfid' | 'guest' | 'delivery' | 'permit_holder' | 'visitor'
      household_status: 'active' | 'inactive' | 'suspended'
      payment_method: 'cash' | 'bank_transfer' | 'gcash' | 'paymaya' | 'card'
      permit_status:
        | 'draft'
        | 'submitted'
        | 'pending_payment'
        | 'approved'
        | 'rejected'
        | 'in_progress'
        | 'completed'
        | 'cancelled'
      permit_type: 'construction' | 'renovation' | 'maintenance' | 'miscellaneous'
      role_scope: 'platform' | 'tenant' | 'household' | 'security'
      sticker_status: 'active' | 'expired' | 'revoked' | 'pending_renewal'
      sticker_type: 'beneficial_user' | 'resident'
      tenant_status: 'active' | 'inactive'
      vehicle_document_type:
        | 'or'
        | 'cr'
        | 'insurance'
        | 'drivers_license'
        | 'deed_of_sale'
        | 'other'
      verification_method: 'rfid_auto' | 'manual' | 'guest_list' | 'phone_call' | 'qr_code'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database['storage']['Enums']['buckettype']
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database['storage']['Enums']['buckettype']
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database['storage']['Enums']['buckettype']
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          format: string
          id: string
          type: Database['storage']['Enums']['buckettype']
          updated_at: string
        }
        Insert: {
          created_at?: string
          format?: string
          id: string
          type?: Database['storage']['Enums']['buckettype']
          updated_at?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          type?: Database['storage']['Enums']['buckettype']
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'iceberg_namespaces_bucket_id_fkey'
            columns: ['bucket_id']
            isOneToOne: false
            referencedRelation: 'buckets_analytics'
            referencedColumns: ['id']
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'iceberg_tables_bucket_id_fkey'
            columns: ['bucket_id']
            isOneToOne: false
            referencedRelation: 'buckets_analytics'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'iceberg_tables_namespace_id_fkey'
            columns: ['namespace_id']
            isOneToOne: false
            referencedRelation: 'iceberg_namespaces'
            referencedColumns: ['id']
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'objects_bucketId_fkey'
            columns: ['bucket_id']
            isOneToOne: false
            referencedRelation: 'buckets'
            referencedColumns: ['id']
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'prefixes_bucketId_fkey'
            columns: ['bucket_id']
            isOneToOne: false
            referencedRelation: 'buckets'
            referencedColumns: ['id']
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_bucket_id_fkey'
            columns: ['bucket_id']
            isOneToOne: false
            referencedRelation: 'buckets'
            referencedColumns: ['id']
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_parts_bucket_id_fkey'
            columns: ['bucket_id']
            isOneToOne: false
            referencedRelation: 'buckets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 's3_multipart_uploads_parts_upload_id_fkey'
            columns: ['upload_id']
            isOneToOne: false
            referencedRelation: 's3_multipart_uploads'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: 'STANDARD' | 'ANALYTICS'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      entry_outcome: ['allowed', 'denied'],
      entry_type: ['vehicle_rfid', 'guest', 'delivery', 'permit_holder', 'visitor'],
      household_status: ['active', 'inactive', 'suspended'],
      payment_method: ['cash', 'bank_transfer', 'gcash', 'paymaya', 'card'],
      permit_status: [
        'draft',
        'submitted',
        'pending_payment',
        'approved',
        'rejected',
        'in_progress',
        'completed',
        'cancelled',
      ],
      permit_type: ['construction', 'renovation', 'maintenance', 'miscellaneous'],
      role_scope: ['platform', 'tenant', 'household', 'security'],
      sticker_status: ['active', 'expired', 'revoked', 'pending_renewal'],
      sticker_type: ['beneficial_user', 'resident'],
      tenant_status: ['active', 'inactive'],
      vehicle_document_type: ['or', 'cr', 'insurance', 'drivers_license', 'deed_of_sale', 'other'],
      verification_method: ['rfid_auto', 'manual', 'guest_list', 'phone_call', 'qr_code'],
    },
  },
  storage: {
    Enums: {
      buckettype: ['STANDARD', 'ANALYTICS'],
    },
  },
} as const
