
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
                    "age": number | null,"birth_year": number | null,"city": string | null,"cohort_id": string,"consent_at": string,"country": string | null,"created_at": string,"details": NonNullable<Json>,"email": string,"first_name": string,"gender": string | null,"id": string,"imported_from": string | null,"language": string,"languages": (string)[],"last_name": string,"motivation": string,"participant_id": string | null,"phone": string | null,"review_note": string,"reviewed_at": string | null,"reviewed_by": string | null,"source": string | null,"status": Database["public"]['Enums']["application_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "age"?: number | null,"birth_year"?: number | null,"city"?: string | null,"cohort_id": string,"consent_at": string,"country"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"email": string,"first_name": string,"gender"?: string | null,"id"?: string,"imported_from"?: string | null,"language"?: string,"languages"?: (string)[],"last_name": string,"motivation"?: string,"participant_id"?: string | null,"phone"?: string | null,"review_note"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source"?: string | null,"status"?: Database["public"]['Enums']["application_status"]
                  }
                  Update: {
                    "age"?: number | null,"birth_year"?: number | null,"city"?: string | null,"cohort_id"?: string,"consent_at"?: string,"country"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"email"?: string,"first_name"?: string,"gender"?: string | null,"id"?: string,"imported_from"?: string | null,"language"?: string,"languages"?: (string)[],"last_name"?: string,"motivation"?: string,"participant_id"?: string | null,"phone"?: string | null,"review_note"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source"?: string | null,"status"?: Database["public"]['Enums']["application_status"]
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
                },"approvals": {
                  Row: {
                    "action": string,"decided_at": string | null,"decided_by": string | null,"decision_note": string | null,"executed_at": string | null,"id": string,"payload": NonNullable<Json>,"requested_at": string,"requested_by": string,"result": Json | null,"status": string,"summary": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"executed_at"?: string | null,"id"?: string,"payload"?: NonNullable<Json>,"requested_at"?: string,"requested_by"?: string,"result"?: Json | null,"status"?: string,"summary": string
                  }
                  Update: {
                    "action"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"executed_at"?: string | null,"id"?: string,"payload"?: NonNullable<Json>,"requested_at"?: string,"requested_by"?: string,"result"?: Json | null,"status"?: string,"summary"?: string
                  }
                  Relationships: [
                    
                  ]
                },"assignment_excusals": {
                  Row: {
                    "assignment_id": string,"created_at": string,"created_by": string | null,"id": string,"note": string,"participant_id": string
                  }
                  ComputedFields: never
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
                  ComputedFields: never
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
                  ComputedFields: never
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
                },"audience_questions": {
                  Row: {
                    "created_at": string,"device": string,"id": string,"ip_hash": string | null,"name": string | null,"round_id": string,"status": string,"text": string,"votes": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"device": string,"id"?: string,"ip_hash"?: string | null,"name"?: string | null,"round_id": string,"status"?: string,"text": string,"votes"?: number
                  }
                  Update: {
                    "created_at"?: string,"device"?: string,"id"?: string,"ip_hash"?: string | null,"name"?: string | null,"round_id"?: string,"status"?: string,"text"?: string,"votes"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "audience_questions_round_id_fkey"
      columns: ["round_id"]
isOneToOne: false
      referencedRelation: "question_rounds"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"entity_id": string | null,"entity_type": string,"id": number,"metadata": NonNullable<Json>,"target_participant_id": string | null
                  }
                  ComputedFields: never
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
                },"checklist_templates": {
                  Row: {
                    "active": boolean,"anchor": string,"commission": string | null,"days_offset": number,"id": string,"position": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"anchor"?: string,"commission"?: string | null,"days_offset": number,"id"?: string,"position"?: number,"title": string
                  }
                  Update: {
                    "active"?: boolean,"anchor"?: string,"commission"?: string | null,"days_offset"?: number,"id"?: string,"position"?: number,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cohorts": {
                  Row: {
                    "created_at": string,"id": string,"is_current": boolean,"name": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_current"?: boolean,"name": string,"year": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_current"?: boolean,"name"?: string,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"contact_log": {
                  Row: {
                    "channel": string,"created_at": string,"created_by": string | null,"id": string,"module_id": string | null,"note": string,"outcome": string | null,"participant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"module_id"?: string | null,"note"?: string,"outcome"?: string | null,"participant_id": string
                  }
                  Update: {
                    "channel"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"module_id"?: string | null,"note"?: string,"outcome"?: string | null,"participant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contact_log_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_log_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    }
                  ]
                },"contributions": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"outlet": string | null,"participant_id": string,"published_on": string | null,"title": string,"url": string | null,"website_slug": string | null
                  }
                  ComputedFields: never
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
                },"document_versions": {
                  Row: {
                    "document_id": string,"file_name": string,"id": string,"mime_type": string | null,"note": string,"size_bytes": number | null,"storage_path": string,"uploaded_at": string,"uploaded_by": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "document_id": string,"file_name": string,"id"?: string,"mime_type"?: string | null,"note"?: string,"size_bytes"?: number | null,"storage_path": string,"uploaded_at"?: string,"uploaded_by"?: string | null,"version": number
                  }
                  Update: {
                    "document_id"?: string,"file_name"?: string,"id"?: string,"mime_type"?: string | null,"note"?: string,"size_bytes"?: number | null,"storage_path"?: string,"uploaded_at"?: string,"uploaded_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "document_versions_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "commission": string | null,"created_at": string,"created_by": string | null,"current_version": number,"description": string,"id": string,"kind": string,"link": string | null,"module_id": string | null,"status": string,"tags": (string)[],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "commission"?: string | null,"created_at"?: string,"created_by"?: string | null,"current_version"?: number,"description"?: string,"id"?: string,"kind"?: string,"link"?: string | null,"module_id"?: string | null,"status"?: string,"tags"?: (string)[],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "commission"?: string | null,"created_at"?: string,"created_by"?: string | null,"current_version"?: number,"description"?: string,"id"?: string,"kind"?: string,"link"?: string | null,"module_id"?: string | null,"status"?: string,"tags"?: (string)[],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    }
                  ]
                },"duty_assignments": {
                  Row: {
                    "created_at": string,"ends_at": string | null,"id": string,"is_lead": boolean,"module_day_id": string,"person_name": string,"phone": string | null,"starts_at": string | null,"task": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_at"?: string | null,"id"?: string,"is_lead"?: boolean,"module_day_id": string,"person_name": string,"phone"?: string | null,"starts_at"?: string | null,"task": string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string | null,"id"?: string,"is_lead"?: boolean,"module_day_id"?: string,"person_name"?: string,"phone"?: string | null,"starts_at"?: string | null,"task"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "duty_assignments_module_day_id_fkey"
      columns: ["module_day_id"]
isOneToOne: false
      referencedRelation: "module_days"
      referencedColumns: ["id"]
    }
                  ]
                },"email_log": {
                  Row: {
                    "created_at": string,"error": string | null,"id": number,"kind": string,"module_id": string | null,"participant_id": string | null,"recipient": string,"status": string,"triggered_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"error"?: string | null,"id"?: never,"kind": string,"module_id"?: string | null,"participant_id"?: string | null,"recipient": string,"status": string,"triggered_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"error"?: string | null,"id"?: never,"kind"?: string,"module_id"?: string | null,"participant_id"?: string | null,"recipient"?: string,"status"?: string,"triggered_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_log_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
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
                  ComputedFields: never
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
                },"feedback_questions": {
                  Row: {
                    "id": string,"kind": string,"position": number,"prompt": string,"survey_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"kind": string,"position": number,"prompt": string,"survey_id": string
                  }
                  Update: {
                    "id"?: string,"kind"?: string,"position"?: number,"prompt"?: string,"survey_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "feedback_questions_survey_id_fkey"
      columns: ["survey_id"]
isOneToOne: false
      referencedRelation: "feedback_surveys"
      referencedColumns: ["id"]
    }
                  ]
                },"feedback_responses": {
                  Row: {
                    "answers": NonNullable<Json>,"id": string,"participant_id": string,"submitted_at": string,"survey_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: NonNullable<Json>,"id"?: string,"participant_id": string,"submitted_at"?: string,"survey_id": string
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"id"?: string,"participant_id"?: string,"submitted_at"?: string,"survey_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "feedback_responses_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "feedback_responses_survey_id_fkey"
      columns: ["survey_id"]
isOneToOne: false
      referencedRelation: "feedback_surveys"
      referencedColumns: ["id"]
    }
                  ]
                },"feedback_surveys": {
                  Row: {
                    "closes_at": string,"created_at": string,"id": string,"module_id": string,"opens_at": string,"sent_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "closes_at": string,"created_at"?: string,"id"?: string,"module_id": string,"opens_at": string,"sent_at"?: string | null
                  }
                  Update: {
                    "closes_at"?: string,"created_at"?: string,"id"?: string,"module_id"?: string,"opens_at"?: string,"sent_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "feedback_surveys_module_id_fkey"
      columns: ["module_id"]
isOneToOne: true
      referencedRelation: "modules"
      referencedColumns: ["id"]
    }
                  ]
                },"group_members": {
                  Row: {
                    "group_id": string,"module_id": string,"participant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"module_id": string,"participant_id": string
                  }
                  Update: {
                    "group_id"?: string,"module_id"?: string,"participant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "module_groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    }
                  ]
                },"hotels": {
                  Row: {
                    "address": string | null,"cancellation_deadline": string | null,"contact": string | null,"created_at": string,"id": string,"module_id": string,"name": string,"notes": string,"price_per_night": number | null,"quota_rooms": number | null,"rooms_visible": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"cancellation_deadline"?: string | null,"contact"?: string | null,"created_at"?: string,"id"?: string,"module_id": string,"name": string,"notes"?: string,"price_per_night"?: number | null,"quota_rooms"?: number | null,"rooms_visible"?: boolean
                  }
                  Update: {
                    "address"?: string | null,"cancellation_deadline"?: string | null,"contact"?: string | null,"created_at"?: string,"id"?: string,"module_id"?: string,"name"?: string,"notes"?: string,"price_per_night"?: number | null,"quota_rooms"?: number | null,"rooms_visible"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "hotels_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    }
                  ]
                },"info_mail_claims": {
                  Row: {
                    "claimed_at": string,"module_id": string,"participant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "claimed_at"?: string,"module_id": string,"participant_id": string
                  }
                  Update: {
                    "claimed_at"?: string,"module_id"?: string,"participant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "info_mail_claims_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "info_mail_claims_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    }
                  ]
                },"meeting_decisions": {
                  Row: {
                    "created_at": string,"id": string,"meeting_id": string,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"meeting_id": string,"text": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"meeting_id"?: string,"text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meeting_decisions_meeting_id_fkey"
      columns: ["meeting_id"]
isOneToOne: false
      referencedRelation: "meetings"
      referencedColumns: ["id"]
    }
                  ]
                },"meetings": {
                  Row: {
                    "attendees": string,"commission": string | null,"created_at": string,"created_by": string | null,"held_on": string,"id": string,"protocol": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attendees"?: string,"commission"?: string | null,"created_at"?: string,"created_by"?: string | null,"held_on": string,"id"?: string,"protocol"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "attendees"?: string,"commission"?: string | null,"created_at"?: string,"created_by"?: string | null,"held_on"?: string,"id"?: string,"protocol"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"memberships": {
                  Row: {
                    "cohort_id": string | null,"commission": string | null,"created_at": string,"id": string,"module_id": string | null,"participant_id": string,"role": Database["public"]['Enums']["membership_role"],"valid_from": string,"valid_until": string | null,"membership_badge": string | null
                  }
                  ComputedFields: "membership_badge"
                  Insert: {
                    "cohort_id"?: string | null,"commission"?: string | null,"created_at"?: string,"id"?: string,"module_id"?: string | null,"participant_id": string,"role": Database["public"]['Enums']["membership_role"],"valid_from"?: string,"valid_until"?: string | null
                  }
                  Update: {
                    "cohort_id"?: string | null,"commission"?: string | null,"created_at"?: string,"id"?: string,"module_id"?: string | null,"participant_id"?: string,"role"?: Database["public"]['Enums']["membership_role"],"valid_from"?: string,"valid_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memberships_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memberships_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    }
                  ]
                },"mentors": {
                  Row: {
                    "access_token": string,"created_at": string,"email": string | null,"id": string,"name": string,"phone": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "access_token"?: string,"created_at"?: string,"email"?: string | null,"id"?: string,"name": string,"phone"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "access_token"?: string,"created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string,"phone"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"message_templates": {
                  Row: {
                    "body_de": string,"body_tr": string,"created_at": string,"created_by": string | null,"id": string,"name": string,"subject_de": string,"subject_tr": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body_de"?: string,"body_tr"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"subject_de"?: string,"subject_tr"?: string,"updated_at"?: string
                  }
                  Update: {
                    "body_de"?: string,"body_tr"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"subject_de"?: string,"subject_tr"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"module_day_speakers": {
                  Row: {
                    "affiliation": string,"created_at": string,"created_by": string | null,"display_name": string,"id": string,"kind": string,"module_day_id": string,"participant_id": string | null,"topic": string
                  }
                  ComputedFields: never
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
                    "day": string,"ends_at": string,"id": string,"label": string | null,"module_id": string,"regieplan_document_id": string | null,"starts_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"ends_at": string,"id"?: string,"label"?: string | null,"module_id": string,"regieplan_document_id"?: string | null,"starts_at": string
                  }
                  Update: {
                    "day"?: string,"ends_at"?: string,"id"?: string,"label"?: string | null,"module_id"?: string,"regieplan_document_id"?: string | null,"starts_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_days_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_days_regieplan_document_id_fkey"
      columns: ["regieplan_document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    }
                  ]
                },"module_groups": {
                  Row: {
                    "id": string,"leader": string | null,"module_id": string,"name": string,"position": number,"room": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"leader"?: string | null,"module_id": string,"name": string,"position"?: number,"room"?: string | null
                  }
                  Update: {
                    "id"?: string,"leader"?: string | null,"module_id"?: string,"name"?: string,"position"?: number,"room"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_groups_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    }
                  ]
                },"module_speakers": {
                  Row: {
                    "access_token": string,"arrival_at": string | null,"arrival_info": string,"bio_received": boolean,"created_at": string,"departure_at": string | null,"fee": number | null,"host_name": string | null,"hotel_info": string,"id": string,"module_id": string,"notes": string,"photo_path": string | null,"program_item_id": string | null,"role": string,"slides_path": string | null,"slides_received": boolean,"speaker_id": string,"status": Database["public"]['Enums']["speaker_status"],"status_at": string,"tech_needs": string,"topic": string,"travel_costs": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "access_token"?: string,"arrival_at"?: string | null,"arrival_info"?: string,"bio_received"?: boolean,"created_at"?: string,"departure_at"?: string | null,"fee"?: number | null,"host_name"?: string | null,"hotel_info"?: string,"id"?: string,"module_id": string,"notes"?: string,"photo_path"?: string | null,"program_item_id"?: string | null,"role"?: string,"slides_path"?: string | null,"slides_received"?: boolean,"speaker_id": string,"status"?: Database["public"]['Enums']["speaker_status"],"status_at"?: string,"tech_needs"?: string,"topic"?: string,"travel_costs"?: number | null
                  }
                  Update: {
                    "access_token"?: string,"arrival_at"?: string | null,"arrival_info"?: string,"bio_received"?: boolean,"created_at"?: string,"departure_at"?: string | null,"fee"?: number | null,"host_name"?: string | null,"hotel_info"?: string,"id"?: string,"module_id"?: string,"notes"?: string,"photo_path"?: string | null,"program_item_id"?: string | null,"role"?: string,"slides_path"?: string | null,"slides_received"?: boolean,"speaker_id"?: string,"status"?: Database["public"]['Enums']["speaker_status"],"status_at"?: string,"tech_needs"?: string,"topic"?: string,"travel_costs"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_speakers_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_speakers_program_item_id_fkey"
      columns: ["program_item_id"]
isOneToOne: false
      referencedRelation: "program_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_speakers_speaker_id_fkey"
      columns: ["speaker_id"]
isOneToOne: false
      referencedRelation: "speakers"
      referencedColumns: ["id"]
    }
                  ]
                },"modules": {
                  Row: {
                    "cancellation_reason": string | null,"cancelled_at": string | null,"capacity": number | null,"cohort_id": string | null,"counts_for_streak": boolean,"created_at": string,"description": string,"id": string,"kind": Database["public"]['Enums']["module_kind"],"location": string | null,"open_registration": boolean,"slug": string,"status": Database["public"]['Enums']["module_status"],"stay_form_open": boolean,"subtitle": string,"ticket_required": boolean,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancellation_reason"?: string | null,"cancelled_at"?: string | null,"capacity"?: number | null,"cohort_id"?: string | null,"counts_for_streak"?: boolean,"created_at"?: string,"description"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["module_kind"],"location"?: string | null,"open_registration"?: boolean,"slug": string,"status"?: Database["public"]['Enums']["module_status"],"stay_form_open"?: boolean,"subtitle"?: string,"ticket_required"?: boolean,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "cancellation_reason"?: string | null,"cancelled_at"?: string | null,"capacity"?: number | null,"cohort_id"?: string | null,"counts_for_streak"?: boolean,"created_at"?: string,"description"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["module_kind"],"location"?: string | null,"open_registration"?: boolean,"slug"?: string,"status"?: Database["public"]['Enums']["module_status"],"stay_form_open"?: boolean,"subtitle"?: string,"ticket_required"?: boolean,"title"?: string,"updated_at"?: string
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
                  ComputedFields: never
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
                    "active": boolean,"affiliation_status": Database["public"]['Enums']["affiliation_status"],"branch": string | null,"checkin_token": string,"cohort_id": string | null,"country": string | null,"created_at": string,"email": string | null,"first_name": string,"gender": string | null,"id": string,"last_name": string,"link_token": string,"mentor_id": string | null,"phone": string | null,"photo_consent_at": string | null,"photo_path": string | null,"preferred_language": string,"privacy_consent_at": string | null,"region_id": number | null,"share_contact": boolean,"short_code": string | null,"updated_at": string,"user_id": string | null,"display_name": string | null
                  }
                  ComputedFields: "display_name"
                  Insert: {
                    "active"?: boolean,"affiliation_status"?: Database["public"]['Enums']["affiliation_status"],"branch"?: string | null,"checkin_token"?: string,"cohort_id"?: string | null,"country"?: string | null,"created_at"?: string,"email"?: string | null,"first_name": string,"gender"?: string | null,"id"?: string,"last_name"?: string,"link_token"?: string,"mentor_id"?: string | null,"phone"?: string | null,"photo_consent_at"?: string | null,"photo_path"?: string | null,"preferred_language"?: string,"privacy_consent_at"?: string | null,"region_id"?: number | null,"share_contact"?: boolean,"short_code"?: never,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"affiliation_status"?: Database["public"]['Enums']["affiliation_status"],"branch"?: string | null,"checkin_token"?: string,"cohort_id"?: string | null,"country"?: string | null,"created_at"?: string,"email"?: string | null,"first_name"?: string,"gender"?: string | null,"id"?: string,"last_name"?: string,"link_token"?: string,"mentor_id"?: string | null,"phone"?: string | null,"photo_consent_at"?: string | null,"photo_path"?: string | null,"preferred_language"?: string,"privacy_consent_at"?: string | null,"region_id"?: number | null,"share_contact"?: boolean,"short_code"?: never,"updated_at"?: string,"user_id"?: string | null
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
                },"program_items": {
                  Row: {
                    "created_at": string,"ends_at": string | null,"id": string,"module_day_id": string,"note": string,"responsible": string | null,"room": string | null,"starts_at": string,"status": Database["public"]['Enums']["program_item_status"],"title": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_at"?: string | null,"id"?: string,"module_day_id": string,"note"?: string,"responsible"?: string | null,"room"?: string | null,"starts_at": string,"status"?: Database["public"]['Enums']["program_item_status"],"title": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string | null,"id"?: string,"module_day_id"?: string,"note"?: string,"responsible"?: string | null,"room"?: string | null,"starts_at"?: string,"status"?: Database["public"]['Enums']["program_item_status"],"title"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "program_items_module_day_id_fkey"
      columns: ["module_day_id"]
isOneToOne: false
      referencedRelation: "module_days"
      referencedColumns: ["id"]
    }
                  ]
                },"question_rate": {
                  Row: {
                    "art": string,"at": string,"ip_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "art": string,"at"?: string,"ip_hash": string
                  }
                  Update: {
                    "art"?: string,"at"?: string,"ip_hash"?: string
                  }
                  Relationships: [
                    
                  ]
                },"question_rounds": {
                  Row: {
                    "code": string,"created_at": string,"created_by": string | null,"id": string,"moderated": boolean,"module_id": string | null,"open": boolean,"program_item_id": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"moderated"?: boolean,"module_id"?: string | null,"open"?: boolean,"program_item_id"?: string | null,"title": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"moderated"?: boolean,"module_id"?: string | null,"open"?: boolean,"program_item_id"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "question_rounds_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "question_rounds_program_item_id_fkey"
      columns: ["program_item_id"]
isOneToOne: false
      referencedRelation: "program_items"
      referencedColumns: ["id"]
    }
                  ]
                },"question_votes": {
                  Row: {
                    "device": string,"ip_hash": string | null,"question_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "device": string,"ip_hash"?: string | null,"question_id": string
                  }
                  Update: {
                    "device"?: string,"ip_hash"?: string | null,"question_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "question_votes_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "audience_questions"
      referencedColumns: ["id"]
    }
                  ]
                },"regions": {
                  Row: {
                    "country": string,"id": number,"name": string
                  }
                  ComputedFields: never
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
                    "created_at": string,"excuse_note": string | null,"id": string,"module_id": string,"participant_id": string,"rsvp": string | null,"rsvp_at": string | null,"rsvp_source": string | null,"source": Database["public"]['Enums']["registration_source"],"status": Database["public"]['Enums']["registration_status"],"status_changed_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"excuse_note"?: string | null,"id"?: string,"module_id": string,"participant_id": string,"rsvp"?: string | null,"rsvp_at"?: string | null,"rsvp_source"?: string | null,"source": Database["public"]['Enums']["registration_source"],"status"?: Database["public"]['Enums']["registration_status"],"status_changed_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"excuse_note"?: string | null,"id"?: string,"module_id"?: string,"participant_id"?: string,"rsvp"?: string | null,"rsvp_at"?: string | null,"rsvp_source"?: string | null,"source"?: Database["public"]['Enums']["registration_source"],"status"?: Database["public"]['Enums']["registration_status"],"status_changed_at"?: string
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
                  ComputedFields: never
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
                },"room_assignments": {
                  Row: {
                    "hotel_id": string,"participant_id": string,"room_id": string,"source": string
                  }
                  ComputedFields: never
                  Insert: {
                    "hotel_id": string,"participant_id": string,"room_id": string,"source"?: string
                  }
                  Update: {
                    "hotel_id"?: string,"participant_id"?: string,"room_id"?: string,"source"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_assignments_hotel_id_fkey"
      columns: ["hotel_id"]
isOneToOne: false
      referencedRelation: "hotels"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_assignments_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_assignments_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"room_wish_overrides": {
                  Row: {
                    "created_at": string,"created_by": string | null,"module_id": string,"participant_id": string,"token": string,"wished_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"module_id": string,"participant_id": string,"token": string,"wished_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"module_id"?: string,"participant_id"?: string,"token"?: string,"wished_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_wish_overrides_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_wish_overrides_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_wish_overrides_wished_id_fkey"
      columns: ["wished_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    }
                  ]
                },"rooms": {
                  Row: {
                    "capacity": number,"hotel_id": string,"id": string,"label": string,"section": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "capacity": number,"hotel_id": string,"id"?: string,"label": string,"section"?: string | null
                  }
                  Update: {
                    "capacity"?: number,"hotel_id"?: string,"id"?: string,"label"?: string,"section"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "rooms_hotel_id_fkey"
      columns: ["hotel_id"]
isOneToOne: false
      referencedRelation: "hotels"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"speakers": {
                  Row: {
                    "affiliation": string,"bio": string,"created_at": string,"email": string | null,"id": string,"languages": (string)[],"name": string,"notes": string,"phone": string | null,"topics": (string)[],"updated_at": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "affiliation"?: string,"bio"?: string,"created_at"?: string,"email"?: string | null,"id"?: string,"languages"?: (string)[],"name": string,"notes"?: string,"phone"?: string | null,"topics"?: (string)[],"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "affiliation"?: string,"bio"?: string,"created_at"?: string,"email"?: string | null,"id"?: string,"languages"?: (string)[],"name"?: string,"notes"?: string,"phone"?: string | null,"topics"?: (string)[],"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"staff_members": {
                  Row: {
                    "created_at": string,"display_name": string,"label": string | null,"module_id": string | null,"role": Database["public"]['Enums']["staff_role"],"user_id": string,"valid_from": string | null,"valid_until": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"label"?: string | null,"module_id"?: string | null,"role": Database["public"]['Enums']["staff_role"],"user_id": string,"valid_from"?: string | null,"valid_until"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"label"?: string | null,"module_id"?: string | null,"role"?: Database["public"]['Enums']["staff_role"],"user_id"?: string,"valid_from"?: string | null,"valid_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_members_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    }
                  ]
                },"stay_requests": {
                  Row: {
                    "arrival_at": string | null,"arrival_by": string | null,"departure_at": string | null,"nights": (string)[],"notes": string,"registration_id": string,"room_wish": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "arrival_at"?: string | null,"arrival_by"?: string | null,"departure_at"?: string | null,"nights"?: (string)[],"notes"?: string,"registration_id": string,"room_wish"?: string,"updated_at"?: string
                  }
                  Update: {
                    "arrival_at"?: string | null,"arrival_by"?: string | null,"departure_at"?: string | null,"nights"?: (string)[],"notes"?: string,"registration_id"?: string,"room_wish"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stay_requests_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: true
      referencedRelation: "registrations"
      referencedColumns: ["id"]
    }
                  ]
                },"submission_participants": {
                  Row: {
                    "participant_id": string,"submission_id": string
                  }
                  ComputedFields: never
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
                    "assignment_id": string,"created_at": string,"file_name": string | null,"id": string,"label": string,"link": string | null,"note": string | null,"size_bytes": number | null,"source": string,"storage_path": string | null,"submitted_at": string | null,"submitted_on": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "assignment_id": string,"created_at"?: string,"file_name"?: string | null,"id"?: string,"label": string,"link"?: string | null,"note"?: string | null,"size_bytes"?: number | null,"source"?: string,"storage_path"?: string | null,"submitted_at"?: string | null,"submitted_on"?: string | null
                  }
                  Update: {
                    "assignment_id"?: string,"created_at"?: string,"file_name"?: string | null,"id"?: string,"label"?: string,"link"?: string | null,"note"?: string | null,"size_bytes"?: number | null,"source"?: string,"storage_path"?: string | null,"submitted_at"?: string | null,"submitted_on"?: string | null
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
                },"tasks": {
                  Row: {
                    "assignee_name": string | null,"assignee_user": string | null,"commission": string | null,"created_at": string,"created_by": string | null,"done_at": string | null,"done_by": string | null,"due_date": string | null,"id": string,"meeting_id": string | null,"module_id": string | null,"notes": string,"template_id": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_name"?: string | null,"assignee_user"?: string | null,"commission"?: string | null,"created_at"?: string,"created_by"?: string | null,"done_at"?: string | null,"done_by"?: string | null,"due_date"?: string | null,"id"?: string,"meeting_id"?: string | null,"module_id"?: string | null,"notes"?: string,"template_id"?: string | null,"title": string
                  }
                  Update: {
                    "assignee_name"?: string | null,"assignee_user"?: string | null,"commission"?: string | null,"created_at"?: string,"created_by"?: string | null,"done_at"?: string | null,"done_by"?: string | null,"due_date"?: string | null,"id"?: string,"meeting_id"?: string | null,"module_id"?: string | null,"notes"?: string,"template_id"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_meeting_id_fkey"
      columns: ["meeting_id"]
isOneToOne: false
      referencedRelation: "meetings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "checklist_templates"
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
"add_document_version":
{ Args: { "p_document_id": string,"p_file_name": string,"p_mime": string,"p_note"?: string,"p_storage_path": string }; Returns: number
                           },
"apply_probe_rooms":
{ Args: { "p_capacity": number,"p_module_id": string,"p_zimmer": Json }; Returns: Json
                           },
"apply_room_plan":
{ Args: { "p_hotel_id": string,"p_plan": Json }; Returns: number
                           },
"ask_question":
{ Args: { "p_code": string,"p_device": string,"p_ip": string,"p_name": string,"p_text": string }; Returns: string
                           },
"broadcast_recipients":
{ Args: { "p_filter": Json }; Returns: {
              "email": string,"first_name": string,"participant_id": string,"preferred_language": string
            }[]
                           },
"check_in_by_code":
{ Args: { "p_allow_off_window"?: boolean,"p_code": string,"p_method"?: Database["public"]['Enums']["checkin_method"],"p_module_day_id": string,"p_scanned_at"?: string }; Returns: Json
                           },
"check_in_manual":
{ Args: { "p_allow_off_window"?: boolean,"p_module_day_id": string,"p_participant_id": string }; Returns: Json
                           },
"checkin_core":
{ Args: { "p_allow_off_window": boolean,"p_day": Omit<Database["public"]['Tables']["module_days"]['Row'], Database["public"]['Tables']["module_days"]['ComputedFields']>,"p_method": Database["public"]['Enums']["checkin_method"],"p_participant": Omit<Database["public"]['Tables']["participants"]['Row'], Database["public"]['Tables']["participants"]['ComputedFields']>,"p_scanned_at": string }; Returns: Json
                           },
"claim_approval":
{ Args: { "p_action": string,"p_id": string }; Returns: Json
                           },
"claim_info_mail":
{ Args: { "p_module_id": string,"p_participant_id": string }; Returns: boolean
                           },
"create_approval":
{ Args: { "p_action": string,"p_payload": Json }; Returns: string
                           },
"create_feedback_survey":
{ Args: { "p_closes_at": string,"p_module_id": string,"p_opens_at": string }; Returns: string
                           },
"create_module_checklist":
{ Args: { "p_module_id": string }; Returns: number
                           },
"create_walk_in":
{ Args: { "p_affiliation"?: Database["public"]['Enums']["affiliation_status"],"p_allow_off_window"?: boolean,"p_email"?: string,"p_first_name": string,"p_force_new"?: boolean,"p_last_name": string,"p_module_day_id": string,"p_privacy_consent"?: boolean }; Returns: Json
                           },
"current_staff_module":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"current_staff_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["staff_role"]
                           },
"decide_approval":
{ Args: { "p_approve": boolean,"p_id": string,"p_note"?: string }; Returns: string
                           },
"display_name":
{ Args: { "p": Omit<Database["public"]['Tables']["participants"]['Row'], Database["public"]['Tables']["participants"]['ComputedFields']> }; Returns: string
                           },
"end_user_sessions":
{ Args: { "p_user_id": string }; Returns: number
                           },
"execute_team_approval":
{ Args: { "p_id": string,"p_new_user"?: string }; Returns: string
                           },
"get_assignment_status":
{ Args: { "p_assignment_id": string }; Returns: {
              "display_name": string,"participant_id": string,"review_count": number,"status": string,"submitted_on": string
            }[]
                           },
"get_call_list":
{ Args: { "p_module_id": string }; Returns: {
              "contacts": number,"last_at": string,"last_by": string,"last_channel": string,"last_note": string,"last_outcome": string,"mentor_name": string,"name": string,"nights": (string)[],"participant_id": string,"phone": string,"region": string,"registration_status": Database["public"]['Enums']["registration_status"],"rsvp": string,"stay_answered": boolean
            }[]
                           },
"get_checkin_list":
{ Args: { "p_module_day_id": string }; Returns: {
              "affiliation_status": Database["public"]['Enums']["affiliation_status"],"attendance_id": string,"checked_in_at": string,"display_name": string,"participant_id": string,"registration_status": Database["public"]['Enums']["registration_status"],"short_code": string,"token_hash": string
            }[]
                           },
"get_contacts":
{ Args: { "p_module_id"?: string,"p_participant_id"?: string }; Returns: {
              "by_name": string,"channel": string,"created_at": string,"id": string,"mine": boolean,"module_id": string,"module_title": string,"note": string,"outcome": string,"participant_id": string
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
"get_feedback_results":
{ Args: { "p_survey_id": string }; Returns: {
              "answers": number,"average": number,"distribution": (number)[],"kind": string,"nr": number,"prompt": string,"question_id": string,"texts": (string)[]
            }[]
                           },
"get_group_attendance":
{ Args: { "p_module_day_id": string }; Returns: {
              "branch": string,"checked_in": boolean,"country": string,"group_id": string,"group_name": string,"leader": string,"name": string,"participant_id": string,"room": string
            }[]
                           },
"get_group_status":
{ Args: { "p_module_day_id": string }; Returns: {
              "checked_in_at": string,"mentor_id": string,"mentor_name": string,"mentor_phone": string,"name": string,"participant_id": string,"phone": string,"registration_status": Database["public"]['Enums']["registration_status"]
            }[]
                           },
"get_group_status_by_token":
{ Args: { "p_module_day_id": string,"p_token": string }; Returns: {
              "checked_in_at": string,"mentor_name": string,"name": string,"participant_id": string,"phone": string,"registration_status": Database["public"]['Enums']["registration_status"]
            }[]
                           },
"get_grouping_candidates":
{ Args: { "p_module_id": string }; Returns: {
              "branch": string,"country": string,"gender": string,"group_id": string,"name": string,"participant_id": string
            }[]
                           },
"get_guest_sheet":
{ Args: { "p_token": string }; Returns: Json
                           },
"get_info_status":
{ Args: { "p_module_id": string }; Returns: {
              "email": string,"info_status": string,"last_attempt_at": string,"last_error": string,"name": string,"participant_id": string,"rsvp": string
            }[]
                           },
"get_member_directory":
{ Args: Record<PropertyKey, never>; Returns: {
              "badges": (string)[],"branch": string,"email": string,"has_photo": boolean,"name": string,"participant_id": string,"phone": string,"region": string
            }[]
                           },
"get_module_stats":
{ Args: { "timeframe_end"?: string,"timeframe_start"?: string }; Returns: {
              "attendance_rate": number,"attended_people": number,"cancelled_or_excused": number,"days_past": number,"days_total": number,"first_day": string,"module_id": string,"no_shows": number,"person_days_attended": number,"person_days_possible": number,"registered": number,"title": string
            }[]
                           },
"get_my_rooms":
{ Args: Record<PropertyKey, never>; Returns: {
              "hotel_address": string,"hotel_name": string,"module_id": string,"room_label": string
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
"get_people":
{ Args: { "p_module_id"?: string,"p_participant_id"?: string }; Returns: {
              "active": boolean,"affiliation_status": Database["public"]['Enums']["affiliation_status"],"branch": string,"email": string,"gender": string,"last_at": string,"last_by": string,"last_channel": string,"last_note": string,"last_outcome": string,"mentor_name": string,"module_contacts": number,"modules": Json,"name": string,"nights": (string)[],"participant_id": string,"phone": string,"region": string,"registration_status": Database["public"]['Enums']["registration_status"],"rsvp": string,"stay_answered": boolean
            }[]
                           },
"get_person_rooms":
{ Args: { "p_participant_id": string }; Returns: {
              "mates": (string)[],"module_id": string,"module_start": string,"module_title": string,"room_label": string
            }[]
                           },
"get_question_round":
{ Args: { "p_code": string,"p_device": string }; Returns: Json
                           },
"get_room_history":
{ Args: { "p_module_id": string }; Returns: {
              "mate_id": string,"mate_name": string,"module_start": string,"module_title": string,"participant_id": string
            }[]
                           },
"get_room_planning":
{ Args: { "p_module_id": string }; Returns: {
              "answered": boolean,"gender": string,"name": string,"nights": (string)[],"participant_id": string,"region": string,"registration_status": Database["public"]['Enums']["registration_status"],"room_id": string,"room_label": string,"room_wish": string,"source": string
            }[]
                           },
"get_stay_overview":
{ Args: { "p_module_id": string }; Returns: {
              "answered": boolean,"arrival_at": string,"arrival_by": string,"departure_at": string,"gender": string,"name": string,"nights": (string)[],"notes": string,"participant_id": string,"registration_status": Database["public"]['Enums']["registration_status"],"room_id": string,"room_label": string,"room_wish": string
            }[]
                           },
"get_team_members":
{ Args: Record<PropertyKey, never>; Returns: {
              "display_name": string,"role": Database["public"]['Enums']["staff_role"],"user_id": string
            }[]
                           },
"get_ticket_status":
{ Args: { "p_module_id": string,"p_since"?: string }; Returns: {
              "email": string,"last_attempt_at": string,"last_error": string,"name": string,"participant_id": string,"registration_status": Database["public"]['Enums']["registration_status"],"ticket_status": string
            }[]
                           },
"has_checkin_access":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           } |
{ Args: { "p_module_id": string }; Returns: boolean
                           },
"has_full_access":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"has_orga_access":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           } |
{ Args: { "p_module_id": string }; Returns: boolean
                           },
"link_my_account":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"login_allowed":
{ Args: { "p_email": string }; Returns: string
                           },
"membership_badge":
{ Args: { "m": Omit<Database["public"]['Tables']["memberships"]['Row'], Database["public"]['Tables']["memberships"]['ComputedFields']> }; Returns: string
                           },
"mfa_required":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"module_access_window":
{ Args: { "p_module_id": string }; Returns: Json
                           },
"module_has_free_seat":
{ Args: { "p_module_id": string }; Returns: boolean
                           },
"my_participant_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"name_key":
{ Args: { "p": string }; Returns: string
                           },
"new_round_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"normalize_checkin_code":
{ Args: { "value": string }; Returns: string
                           },
"normalize_email":
{ Args: { "value": string }; Returns: string
                           },
"question_rate_exceeded":
{ Args: { "p_art": string,"p_ip": string,"p_max": number }; Returns: boolean
                           },
"record_approval_result":
{ Args: { "p_id": string,"p_result": Json }; Returns: undefined
                           },
"register_cohort_for_module":
{ Args: { "p_module_id": string }; Returns: number
                           },
"register_public":
{ Args: { "p_email": string,"p_first_name": string,"p_language"?: string,"p_last_name": string,"p_module_slug": string,"p_phone"?: string }; Returns: Json
                           },
"rejoin_by_token":
{ Args: { "p_module_id": string,"p_token": string }; Returns: Json
                           },
"rejoin_mine":
{ Args: { "p_module_id": string }; Returns: Json
                           },
"rejoin_registration":
{ Args: { "p_module_id": string,"p_participant_id": string,"p_via": string }; Returns: Json
                           },
"release_info_mail":
{ Args: { "p_module_id": string,"p_participant_id": string }; Returns: undefined
                           },
"save_my_stay":
{ Args: { "p_arrival_at": string,"p_arrival_by": string,"p_departure_at": string,"p_module_id": string,"p_nights": (string)[],"p_notes": string,"p_room_wish": string }; Returns: string
                           },
"set_day_document":
{ Args: { "p_day_id": string,"p_document_id": string }; Returns: undefined
                           },
"set_rsvp":
{ Args: { "p_module_id": string,"p_participant_id": string,"p_rsvp": string }; Returns: undefined
                           },
"staff_role_name":
{ Args: { "r": Database["public"]['Enums']["staff_role"] }; Returns: string
                           },
"staff_role_rank":
{ Args: { "r": Database["public"]['Enums']["staff_role"] }; Returns: number
                           },
"submit_feedback":
{ Args: { "p_answers": Json,"p_survey_id": string,"p_token": string }; Returns: string
                           },
"submit_own_assignment":
{ Args: { "p_assignment_id": string,"p_file_name"?: string,"p_link"?: string,"p_size_bytes"?: number,"p_storage_path"?: string }; Returns: Json
                           },
"undo_check_in":
{ Args: { "p_attendance_id": string }; Returns: Json
                           },
"update_my_profile":
{ Args: { "p_language": string,"p_phone": string,"p_photo_consent": boolean,"p_photo_path"?: string,"p_share_contact": boolean }; Returns: string
                           },
"upsert_participant":
{ Args: { "p_affiliation"?: Database["public"]['Enums']["affiliation_status"],"p_email": string,"p_first_name": string,"p_language"?: string,"p_last_name": string,"p_phone"?: string,"p_privacy_consent"?: boolean,"p_user_id"?: string }; Returns: string
                           },
"vote_question":
{ Args: { "p_device": string,"p_ip": string,"p_question": string }; Returns: string
                           },
"withdraw_by_token":
{ Args: { "p_excuse_note"?: string,"p_module_id": string,"p_token": string }; Returns: Json
                           },
"withdraw_mine":
{ Args: { "p_excuse_note"?: string,"p_module_id": string }; Returns: Json
                           },
"withdraw_registration":
{ Args: { "p_excuse_note": string,"p_module_id": string,"p_participant_id": string,"p_via": string }; Returns: Json
                           }
          }
          Enums: {
            "affiliation_status": "member"|"academy_student"|"guest"|"alumni","application_status": "eingegangen"|"in_pruefung"|"angenommen"|"warteliste"|"abgelehnt"|"zurueckgezogen","checkin_method": "qr"|"short_code"|"manual"|"walk_in"|"offline_sync","engagement_kind": "kommunalpolitik"|"partei"|"jugendrat"|"verein"|"projekt"|"sonstiges","membership_role": "teilnehmende"|"sorumlu"|"team"|"helfer"|"referent"|"alumni","module_kind": "auftakt"|"seminar"|"workshop"|"winterschool"|"sonstiges","module_status": "draft"|"published"|"archived","program_item_status": "geplant"|"laeuft"|"erledigt"|"verschoben"|"entfaellt","registration_source": "cohort"|"public"|"staff"|"walk_in","registration_status": "pending"|"confirmed"|"waitlist"|"cancelled"|"excused"|"rejected","speaker_status": "idee"|"angefragt"|"zugesagt"|"abgesagt"|"bestaetigt","staff_role": "admin"|"vorstand"|"orga_team"|"checkin_helper"
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
            "affiliation_status": ["member", "academy_student", "guest", "alumni"],"application_status": ["eingegangen", "in_pruefung", "angenommen", "warteliste", "abgelehnt", "zurueckgezogen"],"checkin_method": ["qr", "short_code", "manual", "walk_in", "offline_sync"],"engagement_kind": ["kommunalpolitik", "partei", "jugendrat", "verein", "projekt", "sonstiges"],"membership_role": ["teilnehmende", "sorumlu", "team", "helfer", "referent", "alumni"],"module_kind": ["auftakt", "seminar", "workshop", "winterschool", "sonstiges"],"module_status": ["draft", "published", "archived"],"program_item_status": ["geplant", "laeuft", "erledigt", "verschoben", "entfaellt"],"registration_source": ["cohort", "public", "staff", "walk_in"],"registration_status": ["pending", "confirmed", "waitlist", "cancelled", "excused", "rejected"],"speaker_status": ["idee", "angefragt", "zugesagt", "abgesagt", "bestaetigt"],"staff_role": ["admin", "vorstand", "orga_team", "checkin_helper"]
          }
        }
} as const
