```
erDiagram
%% Supabase Auth Integration
AUTH_USERS {
uuid id PK "supabase auth.users"
string email UK
string phone UK
timestamp created_at
timestamp updated_at
}

    %% Role Management

    ROLE {
        uuid id PK
        string code UK "superadmin, admin-head, admin-officers, household-head, household-member, household-beneficial-user, security-head, security-officer"
        string name "Display name"
        text description
        enum scope "platform, tenant, household, security"
        jsonb permissions "default permissions JSON"
        int hierarchy_level "role precedence: 1=highest"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    %% Core Multi-Tenant Entities

    TENANT {
        uuid id PK
        string name
        string slug UK "URL-safe identifier"
        string region "nullable - PH region (e.g., NCR, Region IV-A)"
        string province "nullable - PH province"
        string municipality "nullable - PH city/municipality"
        string barangay "nullable - PH barangay"
        jsonb coordinates "nullable - {lat: number, lng: number, accuracy?: string, source?: string}"
        enum status "active, trial, suspended, cancelled"
        string contact_person
        string contact_phone
        timestamp created_at
        timestamp updated_at
    }

    RESIDENTIAL_COMMUNITY_CONFIG {
        uuid id PK
        uuid tenant_id FK "one config per tenant"
        jsonb rules_and_guidelines "village rules, policies, bylaws"
        jsonb curfew_settings "enabled, start_time, end_time, exceptions"
        jsonb gate_operating_hours "weekday, weekend, holidays"
        jsonb visitor_policies "max_visit_duration, guest_limits"
        jsonb emergency_contacts "name, role, phone, email"
        jsonb maintenance_schedule
        jsonb notification_preferences
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }

    USER_PROFILE {
        uuid id PK
        uuid auth_user_id FK "links to auth.users"
        string first_name
        string last_name
        string avatar_url "supabase storage path"
        jsonb preferences
        timestamp created_at
        timestamp updated_at
    }

    TENANT_USER {
        uuid id PK
        uuid tenant_id FK
        uuid user_profile_id FK
        uuid role_id FK
        boolean is_active
        jsonb permissions "role-specific permission overrides"
        timestamp joined_at
        timestamp created_at
        timestamp updated_at
    }

    HOUSEHOLD {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        string address
        string block "nullable"
        string lot "nullable"
        string street_number "nullable"
        string house_number "nullable"
        int sticker_quota
        enum status "active, inactive, suspended"
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }

    RESIDENT {
        uuid id PK
        uuid household_id FK
        uuid tenant_user_id FK
        boolean has_visiting_rights
        boolean has_signatory_rights
        boolean is_primary_contact
        string id_type "nullable - type of ID document (e.g., passport, drivers_license, national_id)"
        string id_url "nullable - supabase storage path to ID document"
        timestamp created_at
        timestamp updated_at
    }

    %% Access & Security Entities

    VEHICLE_STICKER {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        string rfid_code UK
        uuid household_id FK "nullable - for non-household members like employees"
        uuid issued_to FK
        string vehicle_plate_number
        string holder_name
        enum sticker_type "beneficial_user, resident"
        string vehicle_make
        string vehicle_color
        string vehicle_model
        string vehicle_year
        string vehicle_registered_to
        date issue_date
        date expiry_date
        enum status "active, expired, revoked, pending_renewal"
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }

    VEHICLE_STICKER_DOCUMENT {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        uuid vehicle_sticker_id FK
        enum document_type "or, cr, insurance, drivers_license, deed_of_sale, other"
        string storage_url "supabase storage path"
        string file_name "original file name"
        string mime_type "application/pdf, image/jpeg, etc"
        date expiry_date "nullable - for insurance, registration, etc"
        timestamp created_at
        timestamp updated_at
    }

    TRAFFIC_VIOLATION {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        uuid sticker_id FK
        uuid household_id FK
        text description
        timestamp violation_time
        string location
        uuid reported_by FK
        jsonb evidence_urls "supabase storage paths"
        enum severity "minor, moderate, major"
        timestamp created_at
    }

    GATE_ENTRY_LOG {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        string gate "south gate, gate 1, main gate, etc"
        enum entry_type "vehicle_rfid, guest, delivery, permit_holder, visitor"
        uuid vehicle_sticker_id FK "nullable"
        uuid guest_id FK "nullable"
        uuid delivery_id FK "nullable"
        uuid permit_id FK "nullable"
        string visitor_name
        string plate_number
        text purpose
        enum verification_method "rfid_auto, manual, guest_list, phone_call, qr_code"
        uuid verified_by FK
        enum outcome "allowed, denied"
        timestamp entry_time
        timestamp exit_time "nullable"
        jsonb metadata "temperature check, photo_url, etc"
        timestamp created_at
    }

    %% Guest Management

    GUESTS {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        uuid household_id FK
        uuid announced_by FK
        string guest_name
        string guest_phone
        string guest_email
        string vehicle_plate
        enum visit_duration "day_visit, multi_day, extended_stay"
        date visit_date_start
        date visit_date_end "nullable"
        text visit_purpose
        string qr_code "generated for contactless entry"
        enum status "pending, confirmed, arrived, completed, cancelled"
        timestamp notified_guards_at
        timestamp confirmed_at
        uuid confirmed_by FK "nullable"
        timestamp created_at
        timestamp updated_at
    }

    %% Permits & Approvals

    PERMIT {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        uuid household_id FK
        uuid requested_by FK
        string permit_number UK
        text project_description
        date start_date
        date end_date
        enum permit_type "construction, renovation, maintenance, miscellaneous"
        enum status "draft, submitted, pending_payment, approved, rejected, in_progress, completed, cancelled"
        decimal fee_amount
        boolean fee_paid
        timestamp fee_paid_at
        string fee_receipt_url "supabase storage"
        text rejection_reason "nullable"
        uuid approved_by FK "nullable"
        timestamp approved_at
        timestamp distributed_to_guardhouse_at
        jsonb documents "permit docs, plans, etc - storage URLs"
        timestamp created_at
        timestamp updated_at
    }

    PERMIT_PAYMENT {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        uuid permit_id FK
        decimal amount
        string receipt_number UK
        timestamp payment_date
        uuid collected_by FK
        enum payment_method "cash, bank_transfer, gcash, paymaya, card"
        string receipt_url "supabase storage"
        jsonb payment_metadata
        timestamp created_at
    }

    %% Incident Management

    INCIDENT {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        string incident_number UK
        enum source "resident_report, guard_report, anonymous"
        enum type "security_threat, disturbance, fire, medical, theft, vandalism, other"
        text description
        string location
        enum severity "low, medium, high, critical"
        uuid reported_by FK "nullable"
        enum status "reported, acknowledged, dispatched, in_progress, resolved, false_alarm, cancelled"
        timestamp incident_time
        timestamp reported_at
        timestamp acknowledged_at
        timestamp dispatched_at
        timestamp resolved_at
        uuid assigned_to FK "nullable"
        text resolution_notes
        timestamp created_at
        timestamp updated_at
    }

    INCIDENT_RESPONSE {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        uuid incident_id FK
        uuid responded_by FK
        enum action_type "acknowledged, dispatched, arrived_on_scene, contained, resolved, escalated, requested_backup"
        text notes
        timestamp action_time
        jsonb metadata
        timestamp created_at
    }

    INCIDENT_EVIDENCE {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        uuid incident_id FK
        enum evidence_type "photo, document, audio, video"
        string storage_url "supabase storage path"
        timestamp evidence_timestamp
        jsonb metadata "duration, size, format, etc"
        timestamp created_at
    }

    %% Delivery Management

    DELIVERY {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        uuid household_id FK
        string tracking_number
        string delivery_service "Grab, LBC, J&T, etc"
        enum item_type "regular, perishable, fragile, valuable"
        enum status "announced, arrived, stored_at_gate, in_transit_to_house, received, returned, excessive_wait"
        text delivery_instructions
        timestamp announced_at "nullable - if pre-announced"
        timestamp arrival_time
        timestamp stored_at_gate_time "nullable"
        timestamp received_time "nullable"
        uuid received_by FK
        uuid delivered_to FK "nullable"
        boolean recipient_available
        int wait_duration_minutes
        string photo_url "proof of delivery - supabase storage"
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }

    %% Administration

    ASSOCIATION_FEE {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        uuid household_id FK
        string fee_reference_number UK
        enum fee_type "monthly_dues, annual_dues, special_assessment, penalty"
        decimal amount
        date billing_period_start
        date billing_period_end
        date due_date
        boolean paid
        timestamp paid_at
        decimal amount_paid
        string receipt_number "nullable"
        string receipt_url "supabase storage"
        uuid collected_by FK "nullable"
        enum payment_method "cash, bank_transfer, gcash, paymaya, card"
        timestamp created_at
        timestamp updated_at
    }

    ANNOUNCEMENT {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        uuid created_by FK
        enum type "event, maintenance, emergency, rule_change, general"
        enum priority "low, normal, high, urgent"
        string title
        text content
        date event_date "nullable"
        string event_location "nullable"
        boolean notify_households
        boolean notify_guards
        boolean is_pinned
        jsonb attachments "document URLs from supabase storage"
        timestamp published_at
        timestamp expires_at "nullable"
        timestamp created_at
        timestamp updated_at
    }

    TENANT_RULES_DOCUMENT {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        string version
        text content_markdown
        string document_url "PDF in supabase storage"
        uuid created_by FK
        timestamp effective_date
        boolean is_current
        jsonb change_summary "what changed in this version"
        timestamp created_at
    }


    %% Communication

    COMMUNICATION_THREAD {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        uuid household_id FK "nullable - if household-specific"
        enum thread_type "household_to_admin, guard_to_household, incident_related, general"
        string subject
        uuid created_by FK
        timestamp last_message_at
        boolean is_archived
        timestamp created_at
        timestamp updated_at
    }

    COMMUNICATION_MESSAGE {
        uuid id PK
        uuid thread_id FK
        uuid sender_id FK
        text message
        jsonb attachments "file URLs from supabase storage"
        boolean is_read
        timestamp read_at "nullable"
        timestamp created_at
    }

    %% Audit & System Tables

    AUDIT_LOG {
        uuid id PK
        uuid tenant_id FK "tenant isolation"
        uuid tenant_user_id FK "nullable - system actions may not have user"
        string entity_type
        uuid entity_id
        enum action "insert, update, delete, auth, export"
        string ip_address
        string user_agent
        timestamp created_at
    }

    %% Supabase Storage Buckets Reference (Not a table, but documented)
    STORAGE_BUCKETS {
        string bucket_name "Reference only"
        string description "Reference only"
    }

    %% Relationships

    AUTH_USERS ||--o{ USER_PROFILE : "has"
    USER_PROFILE ||--o{ TENANT_USER : "belongs_to_tenants"

    ROLE ||--o{ TENANT_USER : "has_role"

    TENANT ||--o{ RESIDENTIAL_COMMUNITY_CONFIG : "has_config"
    TENANT ||--o{ TENANT_USER : "has_users"
    TENANT ||--o{ HOUSEHOLD : "contains"
    TENANT ||--o{ VEHICLE_STICKER_DOCUMENT : "stores"
    TENANT ||--o{ GATE_ENTRY_LOG : "tracks"
    TENANT ||--o{ INCIDENT : "has"
    TENANT ||--o{ ANNOUNCEMENT : "publishes"
    TENANT ||--o{ TENANT_RULES_DOCUMENT : "maintains"
    TENANT ||--o{ GUESTS : "manages"
    TENANT ||--o{ DELIVERY : "processes"
    TENANT ||--o{ PERMIT : "approves"
    TENANT ||--o{ ASSOCIATION_FEE : "bills"
    TENANT ||--o{ AUDIT_LOG : "logs"

    TENANT_USER ||--o{ RESIDENT : "is_member_of"
    TENANT_USER ||--o{ VEHICLE_STICKER : "issued_to"
    TENANT_USER ||--o{ GUESTS : "announces"
    TENANT_USER ||--o{ PERMIT : "requests"
    TENANT_USER ||--o{ INCIDENT : "reports"
    TENANT_USER ||--o{ ANNOUNCEMENT : "creates"
    TENANT_USER ||--o{ COMMUNICATION_THREAD : "participates"
    TENANT_USER ||--o{ AUDIT_LOG : "performs"
    TENANT_USER ||--o{ RESIDENTIAL_COMMUNITY_CONFIG : "updates"
    TENANT_USER ||--o{ GATE_ENTRY_LOG : "verifies"
    TENANT_USER ||--o{ GUESTS : "confirms"
    TENANT_USER ||--o{ INCIDENT_RESPONSE : "responds_to"
    TENANT_USER ||--o{ DELIVERY : "receives"
    TENANT_USER ||--o{ TRAFFIC_VIOLATION : "reports"

    HOUSEHOLD ||--o{ RESIDENT : "has"
    HOUSEHOLD o|--o{ VEHICLE_STICKER : "allocated"
    HOUSEHOLD ||--o{ GUESTS : "announces"
    HOUSEHOLD ||--o{ PERMIT : "requests"
    HOUSEHOLD ||--o{ DELIVERY : "receives"
    HOUSEHOLD ||--o{ ASSOCIATION_FEE : "owes"
    HOUSEHOLD ||--o{ COMMUNICATION_THREAD : "communicates"
    HOUSEHOLD ||--o{ TRAFFIC_VIOLATION : "associated_with"

    VEHICLE_STICKER ||--o{ VEHICLE_STICKER_DOCUMENT : "has_documents"
    VEHICLE_STICKER ||--o{ GATE_ENTRY_LOG : "used_for"
    VEHICLE_STICKER ||--o{ TRAFFIC_VIOLATION : "has"

    GUESTS ||--o{ GATE_ENTRY_LOG : "results_in"

    PERMIT ||--o{ GATE_ENTRY_LOG : "authorizes"
    PERMIT ||--o| PERMIT_PAYMENT : "has"

    INCIDENT ||--o{ INCIDENT_RESPONSE : "has"
    INCIDENT ||--o{ INCIDENT_EVIDENCE : "has"

    DELIVERY ||--o{ GATE_ENTRY_LOG : "logged_as"

    COMMUNICATION_THREAD ||--o{ COMMUNICATION_MESSAGE : "contains"
```
