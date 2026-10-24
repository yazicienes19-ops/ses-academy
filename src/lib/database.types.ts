
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "applications": {
                  Row: {
                    "birth_year": number | null,"city": string | null,"cohort_id": string,"consent_at": string,"country": string | null,"created_at": string,"email": string,"first_name": string,"id": string,"language": string,"languages": (string)[],"last_name": string,"motivation": string,"participant_id": string | null,"phone": string | null,"review_note": string,"reviewed_at": string | null,"reviewed_by": string | null,"source": string | null,"status": Database["public"]['Enums']["application_status"]
                  }
                  Insert: {
                    "birth_year"?: number | null,"city"?: string | null,"cohort_id": string,"consent_at": string,"country"?: string | null,"created_at"?: string,"email": string,"first_name": string,"id"?: string,"language"?: string,"languages"?: (string)[],"last_name": string,"motivation"?: string,"participant_id"?: string | null,"phone"?: string | null,"review_note"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source"?: string | null,"status"?: Database["public"]['Enums']["application_status"]
                  }
                  Update: {
                    "birth_year"?: number | null,"city"?: string | null,"cohort_id"?: string,"consent_at"?: string,"country"?: string | null,"created_at"?: string,"email"?: string,"first_name"?: string,"id"?: string,"language"?: string,"languages"?: (string)[],"last_name"?: string,"motivation"?: string,"participant_id"?: string | null,"phone"?: string | null,"review_note"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source"?: string | null,"status"?: Database["public"]['Enums']["application_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "applications_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "applications_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    }
                  ]
                },"assignment_excusals": {
                  Row: {
                    "assignment_id": string,"created_at": string,"created_by": string | null,"id": string,"note": string,"participant_id": string
                  }
                  Insert: {
                    "assignment_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string,"participant_id": string
                  }
                  Update: {
                    "assignment_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string,"participant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignment_excusals_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignment_excusals_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    }
                  ]
                },"assignments": {
                  Row: {
                    "cohort_id": string,"created_at": string,"description": string,"due_at": string | null,"due_date": string | null,"id": string,"module_id": string | null,"number": number,"title": string
                  }
                  Insert: {
                    "cohort_id": string,"created_at"?: string,"description"?: string,"due_at"?: string | null,"due_date"?: string | null,"id"?: string,"module_id"?: string | null,"number": number,"title": string
                  }
                  Update: {
                    "cohort_id"?: string,"created_at"?: string,"description"?: string,"due_at"?: string | null,"due_date"?: string | null,"id"?: string,"module_id"?: string | null,"number"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignments_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    }
                  ]
                },"attendances": {
                  Row: {
                    "checked_in_at": string,"checked_in_by": string | null,"id": string,"method": Database["public"]['Enums']["checkin_method"],"module_day_id": string,"registration_id": string
                  }
                  Insert: {
                    "checked_in_at": string,"checked_in_by"?: string | null,"id"?: string,"method": Database["public"]['Enums']["checkin_method"],"module_day_id": string,"registration_id": string
                  }
                  Update: {
                    "checked_in_at"?: string,"checked_in_by"?: string | null,"id"?: string,"method"?: Database["public"]['Enums']["checkin_method"],"module_day_id"?: string,"registration_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendances_module_day_id_fkey"
      columns: ["module_day_id"]
isOneToOne: false
      referencedRelation: "module_days"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendances_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registrations"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"entity_id": string | null,"entity_type": string,"id": number,"metadata": NonNullable<Json>,"target_participant_id": string | null
                  }
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type": string,"id"?: never,"metadata"?: NonNullable<Json>,"target_participant_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string,"id"?: never,"metadata"?: NonNullable<Json>,"target_participant_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_target_participant_id_fkey"
      columns: ["target_participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    }
                  ]
                },"cohorts": {
                  Row: {
                    "created_at": string,"id": string,"is_current": boolean,"name": string,"year": number
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_current"?: boolean,"name": string,"year": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_current"?: boolean,"name"?: string,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"contributions": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"outlet": string | null,"participant_id": string,"published_on": string | null,"title": string,"url": string | null,"website_slug": string | null
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": string,"outlet"?: string | null,"participant_id": string,"published_on"?: string | null,"title": string,"url"?: string | null,"website_slug"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"outlet"?: string | null,"participant_id"?: string,"published_on"?: string | null,"title"?: string,"url"?: string | null,"website_slug"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contributions_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    }
                  ]
                },"email_log": {
                  Row: {
                    "created_at": string,"error": string | null,"id": number,"kind": string,"participant_id": string | null,"recipient": string,"status": string,"triggered_by": string | null
                  }
                  Insert: {
                    "created_at"?: string,"error"?: string | null,"id"?: never,"kind": string,"participant_id"?: string | null,"recipient": string,"status": string,"triggered_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"error"?: string | null,"id"?: never,"kind"?: string,"participant_id"?: string | null,"recipient"?: string,"status"?: string,"triggered_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_log_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    }
                  ]
                },"engagements": {
                  Row: {
                    "created_at": string,"created_by": string | null,"ended_on": string | null,"id": string,"kind": Database["public"]['Enums']["engagement_kind"],"note": string,"organization": string,"participant_id": string,"role": string,"started_on": string | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"ended_on"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["engagement_kind"],"note"?: string,"organization"?: string,"participant_id": string,"role"?: string,"started_on"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"ended_on"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["engagement_kind"],"note"?: string,"organization"?: string,"participant_id"?: string,"role"?: string,"started_on"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "engagements_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    }
                  ]
                },"mentors": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"name": string,"user_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"name": string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"module_day_speakers": {
                  Row: {
                    "affiliation": string,"created_at": string,"created_by": string | null,"display_name": string,"id": string,"kind": string,"module_day_id": string,"participant_id": string | null,"topic": string
                  }
                  Insert: {
                    "affiliation"?: string,"created_at"?: string,"created_by"?: string | null,"display_name": string,"id"?: string,"kind"?: string,"module_day_id": string,"participant_id"?: string | null,"topic"?: string
                  }
                  Update: {
                    "affiliation"?: string,"created_at"?: string,"created_by"?: string | null,"display_name"?: string,"id"?: string,"kind"?: string,"module_day_id"?: string,"participant_id"?: string | null,"topic"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_day_speakers_module_day_id_fkey"
      columns: ["module_day_id"]
isOneToOne: false
      referencedRelation: "module_days"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_day_speakers_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    }
                  ]
                },"module_days": {
                  Row: {
                    "day": string,"ends_at": string,"id": string,"label": string | null,"module_id": string,"starts_at": string
                  }
                  Insert: {
                    "day": string,"ends_at": string,"id"?: string,"label"?: string | null,"module_id": string,"starts_at": string
                  }
                  Update: {
                    "day"?: string,"ends_at"?: string,"id"?: string,"label"?: string | null,"module_id"?: string,"starts_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_days_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    }
                  ]
                },"modules": {
                  Row: {
                    "cancellation_reason": string | null,"cancelled_at": string | null,"capacity": number | null,"cohort_id": string | null,"counts_for_streak": boolean,"created_at": string,"description": string,"id": string,"kind": Database["public"]['Enums']["module_kind"],"location": string | null,"open_registration": boolean,"slug": string,"status": Database["public"]['Enums']["module_status"],"ticket_required": boolean,"title": string,"updated_at": string
                  }
                  Insert: {
                    "cancellation_reason"?: string | null,"cancelled_at"?: string | null,"capacity"?: number | null,"cohort_id"?: string | null,"counts_for_streak"?: boolean,"created_at"?: string,"description"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["module_kind"],"location"?: string | null,"open_registration"?: boolean,"slug": string,"status"?: Database["public"]['Enums']["module_status"],"ticket_required"?: boolean,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "cancellation_reason"?: string | null,"cancelled_at"?: string | null,"capacity"?: number | null,"cohort_id"?: string | null,"counts_for_streak"?: boolean,"created_at"?: string,"description"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["module_kind"],"location"?: string | null,"open_registration"?: boolean,"slug"?: string,"status"?: Database["public"]['Enums']["module_status"],"ticket_required"?: boolean,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "modules_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    }
                  ]
                },"participant_notes": {
                  Row: {
                    "body": string,"participant_id": string,"updated_at": string
                  }
                  Insert: {
                    "body"?: string,"participant_id": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"participant_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "participant_notes_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: true
      referencedRelation: "participants"
      referencedColumns: ["id"]
    }
                  ]
                },"participants": {
                  Row: {
                    "active": boolean,"affiliation_status": Database["public"]['Enums']["affiliation_status"],"branch": string | null,"checkin_token": string,"cohort_id": string | null,"country": string | null,"created_at": string,"email": string | null,"first_name": string,"id": string,"last_name": string,"mentor_id": string | null,"notes": string,"phone": string | null,"preferred_language": string,"privacy_consent_at": string | null,"region_id": number | null,"short_code": string | null,"updated_at": string,"user_id": string | null,"display_name": string | null
                  }
                  Insert: {
                    "active"?: boolean,"affiliation_status"?: Database["public"]['Enums']["affiliation_status"],"branch"?: string | null,"checkin_token"?: string,"cohort_id"?: string | null,"country"?: string | null,"created_at"?: string,"email"?: string | null,"first_name": string,"id"?: string,"last_name"?: string,"mentor_id"?: string | null,"notes"?: string,"phone"?: string | null,"preferred_language"?: string,"privacy_consent_at"?: string | null,"region_id"?: number | null,"short_code"?: never,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"affiliation_status"?: Database["public"]['Enums']["affiliation_status"],"branch"?: string | null,"checkin_token"?: string,"cohort_id"?: string | null,"country"?: string | null,"created_at"?: string,"email"?: string | null,"first_name"?: string,"id"?: string,"last_name"?: string,"mentor_id"?: string | null,"notes"?: string,"phone"?: string | null,"preferred_language"?: string,"privacy_consent_at"?: string | null,"region_id"?: number | null,"short_code"?: never,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "participants_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "participants_mentor_id_fkey"
      columns: ["mentor_id"]
isOneToOne: false
      referencedRelation: "mentors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "participants_region_id_fkey"
      columns: ["region_id"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["id"]
    }
                  ]
                },"regions": {
                  Row: {
                    "country": string,"id": number,"name": string
                  }
                  Insert: {
                    "country": string,"id"?: number,"name": string
                  }
                  Update: {
                    "country"?: string,"id"?: number,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"registrations": {
                  Row: {
                    "created_at": string,"excuse_note": string | null,"id": string,"module_id": string,"participant_id": string,"source": Database["public"]['Enums']["registration_source"],"status": Database["public"]['Enums']["registration_status"],"status_changed_at": string
                  }
                  Insert: {
                    "created_at"?: string,"excuse_note"?: string | null,"id"?: string,"module_id": string,"participant_id": string,"source": Database["public"]['Enums']["registration_source"],"status"?: Database["public"]['Enums']["registration_status"],"status_changed_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"excuse_note"?: string | null,"id"?: string,"module_id"?: string,"participant_id"?: string,"source"?: Database["public"]['Enums']["registration_source"],"status"?: Database["public"]['Enums']["registration_status"],"status_changed_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "registrations_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "registrations_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "body_language": number | null,"content": number | null,"created_at": string,"facial_expression": number | null,"id": string,"impact": number | null,"improvements": string | null,"language": number | null,"overall": number | null,"presence": number | null,"reviewed_on": string | null,"reviewer_id": string | null,"reviewer_name": string | null,"strengths": string | null,"structure": number | null,"submission_id": string,"tip": string | null,"updated_at": string,"voice": number | null
                  }
                  Insert: {
                    "body_language"?: number | null,"content"?: number | null,"created_at"?: string,"facial_expression"?: number | null,"id"?: string,"impact"?: number | null,"improvements"?: string | null,"language"?: number | null,"overall"?: number | null,"presence"?: number | null,"reviewed_on"?: string | null,"reviewer_id"?: string | null,"reviewer_name"?: string | null,"strengths"?: string | null,"structure"?: number | null,"submission_id": string,"tip"?: string | null,"updated_at"?: string,"voice"?: number | null
                  }
                  Update: {
                    "body_language"?: number | null,"content"?: number | null,"created_at"?: string,"facial_expression"?: number | null,"id"?: string,"impact"?: number | null,"improvements"?: string | null,"language"?: number | null,"overall"?: number | null,"presence"?: number | null,"reviewed_on"?: string | null,"reviewer_id"?: string | null,"reviewer_name"?: string | null,"strengths"?: string | null,"structure"?: number | null,"submission_id"?: string,"tip"?: string | null,"updated_at"?: string,"voice"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"staff_members": {
                  Row: {
                    "created_at": string,"display_name": string,"role": Database["public"]['Enums']["staff_role"],"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"display_name": string,"role": Database["public"]['Enums']["staff_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"role"?: Database["public"]['Enums']["staff_role"],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"submission_participants": {
                  Row: {
                    "participant_id": string,"submission_id": string
                  }
                  Insert: {
                    "participant_id": string,"submission_id": string
                  }
                  Update: {
                    "participant_id"?: string,"submission_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "submission_participants_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submission_participants_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"submissions": {
                  Row: {
                    "assignment_id": string,"created_at": string,"file_name": string | null,"id": string,"label": string,"link": string | null,"note": string | null,"source": string,"submitted_on": string | null
                  }
                  Insert: {
                    "assignment_id": string,"created_at"?: string,"file_name"?: string | null,"id"?: string,"label": string,"link"?: string | null,"note"?: string | null,"source"?: string,"submitted_on"?: string | null
                  }
                  Update: {
                    "assignment_id"?: string,"created_at"?: string,"file_name"?: string | null,"id"?: string,"label"?: string,"link"?: string | null,"note"?: string | null,"source"?: string,"submitted_on"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "submissions_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_application":
{ Args: { "p_application_id": string,"p_note"?: string }; Returns: Json
                           },
"check_in_by_code":
{ Args: { "p_allow_off_window"?: boolean,"p_code": string,"p_method"?: Database["public"]['Enums']["checkin_method"],"p_module_day_id": string,"p_scanned_at"?: string }; Returns: Json
                           },
"check_in_manual":
{ Args: { "p_allow_off_window"?: boolean,"p_module_day_id": string,"p_participant_id": string }; Returns: Json
                           },
"checkin_core":
{ Args: { "p_allow_off_window": boolean,"p_day": Database["public"]['Tables']["module_days"]['Row'],"p_method": Database["public"]['Enums']["checkin_method"],"p_participant": Database["public"]['Tables']["participants"]['Row'],"p_scanned_at": string }; Returns: Json
                           },
"create_walk_in":
{ Args: { "p_affiliation"?: Database["public"]['Enums']["affiliation_status"],"p_email"?: string,"p_first_name": string,"p_last_name": string,"p_module_day_id": string,"p_privacy_consent"?: boolean }; Returns: Json
                           },
"current_staff_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["staff_role"]
                           },
"display_name":
{ Args: { "p": Database["public"]['Tables']["participants"]['Row'] }; Returns: string
                           },
"get_assignment_status":
{ Args: { "p_assignment_id": string }; Returns: {
              "display_name": string,"participant_id": string,"review_count": number,"status": string,"submitted_on": string
            }[]
                           },
"get_checkin_list":
{ Args: { "p_module_day_id": string }; Returns: {
              "affiliation_status": Database["public"]['Enums']["affiliation_status"],"attendance_id": string,"checked_in_at": string,"display_name": string,"participant_id": string,"registration_status": Database["public"]['Enums']["registration_status"],"short_code": string,"token_hash": string
            }[]
                           },
"get_day_counts":
{ Args: { "p_module_day_id": string }; Returns: Json
                           },
"get_day_stats":
{ Args: { "timeframe_end"?: string,"timeframe_start"?: string }; Returns: {
              "checked_in": number,"counts_for_streak": boolean,"day_id": string,"ends_at": string,"expected": number,"module_id": string,"module_title": string,"starts_at": string,"walk_ins": number
            }[]
                           },
"get_module_stats":
{ Args: { "timeframe_end"?: string,"timeframe_start"?: string }; Returns: {
              "attendance_rate": number,"attended_people": number,"cancelled_or_excused": number,"days_past": number,"days_total": number,"first_day": string,"module_id": string,"no_shows": number,"person_days_attended": number,"person_days_possible": number,"registered": number,"title": string
            }[]
                           },
"get_participant_analytics":
{ Args: { "timeframe_end"?: string,"timeframe_start"?: string }; Returns: {
              "attendance_rate": number,"current_streak": number,"last_attended_at": string,"last_attended_title": string,"longest_streak": number,"participant_id": string,"total_attended": number,"total_cancelled_or_excused": number,"total_no_shows": number,"total_registered": number,"trailing_misses": number
            }[]
                           },
"get_participant_directory":
{ Args: Record<PropertyKey, never>; Returns: {
              "active": boolean,"branch": string,"country": string,"display_name": string,"id": string,"mentor": string,"region": string
            }[]
                           },
"get_participant_homework_analytics":
{ Args: { "p_participant_id": string }; Returns: {
              "engagement_count": number,"grade_avg": number,"homework_rate": number,"hw_excused": number,"hw_expected": number,"hw_late": number,"hw_missing": number,"hw_on_time": number,"hw_open": number
            }[]
                           },
"has_checkin_access":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"has_full_access":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"has_orga_access":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"link_my_account":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_participant_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"normalize_checkin_code":
{ Args: { "value": string }; Returns: string
                           },
"normalize_email":
{ Args: { "value": string }; Returns: string
                           },
"register_cohort_for_module":
{ Args: { "p_module_id": string }; Returns: number
                           },
"register_public":
{ Args: { "p_email": string,"p_first_name": string,"p_language"?: string,"p_last_name": string,"p_module_slug": string,"p_phone"?: string }; Returns: Json
                           },
"undo_check_in":
{ Args: { "p_attendance_id": string }; Returns: Json
                           },
"upsert_participant":
{ Args: { "p_affiliation"?: Database["public"]['Enums']["affiliation_status"],"p_email": string,"p_first_name": string,"p_language"?: string,"p_last_name": string,"p_phone"?: string,"p_privacy_consent"?: boolean,"p_user_id"?: string }; Returns: string
                           },
"withdraw_by_token":
{ Args: { "p_excuse_note"?: string,"p_module_id": string,"p_token": string }; Returns: Json
                           }
          }
          Enums: {
            "affiliation_status": "member"|"academy_student"|"guest"|"alumni","application_status": "eingegangen"|"in_pruefung"|"angenommen"|"warteliste"|"abgelehnt"|"zurueckgezogen","checkin_method": "qr"|"short_code"|"manual"|"walk_in"|"offline_sync","engagement_kind": "kommunalpolitik"|"partei"|"jugendrat"|"verein"|"projekt"|"sonstiges","module_kind": "auftakt"|"seminar"|"workshop"|"winterschool"|"sonstiges","module_status": "draft"|"published"|"archived","registration_source": "cohort"|"public"|"staff"|"walk_in","registration_status": "pending"|"confirmed"|"waitlist"|"cancelled"|"excused"|"rejected","staff_role": "admin"|"vorstand"|"orga_team"|"checkin_helper"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "affiliation_status": ["member", "academy_student", "guest", "alumni"],"application_status": ["eingegangen", "in_pruefung", "angenommen", "warteliste", "abgelehnt", "zurueckgezogen"],"checkin_method": ["qr", "short_code", "manual", "walk_in", "offline_sync"],"engagement_kind": ["kommunalpolitik", "partei", "jugendrat", "verein", "projekt", "sonstiges"],"module_kind": ["auftakt", "seminar", "workshop", "winterschool", "sonstiges"],"module_status": ["draft", "published", "archived"],"registration_source": ["cohort", "public", "staff", "walk_in"],"registration_status": ["pending", "confirmed", "waitlist", "cancelled", "excused", "rejected"],"staff_role": ["admin", "vorstand", "orga_team", "checkin_helper"]
          }
        }
} as const

