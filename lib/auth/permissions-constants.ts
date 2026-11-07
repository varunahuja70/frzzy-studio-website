export const ALL_PERMISSIONS = [
  // Dashboard
  'dashboard:view_analytics',
  'dashboard:view_kpis',
  'dashboard:view_live',

  // Leads
  'leads:view',
  'leads:view_contact', // Mask email & message if false
  'leads:create',
  'leads:edit',
  'leads:change_status',
  'leads:add_notes',
  'leads:assign',
  'leads:delete',
  'leads:bulk_actions',
  'leads:export',

  // Work Items / Tasks
  'work_items:view',
  'work_items:view_all',
  'work_items:view_assigned',
  'work_items:view_created',
  'work_items:create',
  'work_items:edit',
  'work_items:delete',
  'work_items:assign',
  'work_items:reassign',
  'work_items:change_status',
  'work_items:update_progress',
  'work_items:deliver',
  'work_items:edit_delivered',

  // Intake & Resources
  'intake:create',
  'intake:upload_files',
  'intake:add_links',
  'intake:create_personal',

  // Financial Layer (Strict isolation, non-delegable by non-super-admins)
  'financials:view_quote',
  'financials:view_delivered',
  'financials:edit',
  'financials:export',

  // Share Templates & Field Sharing
  'share_templates:manage',

  // Team Performance
  'performance:view_own',
  'performance:view_team',
  'performance:view_all',

  // Clients Directory
  'clients:view',
  'clients:manage',

  // Analytics
  'analytics:view',
  'analytics:export',

  // Audit & Security
  'audit:view',
  'users:manage',

  // Settings
  'settings:view',
  'settings:edit',
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number];

export const PERMISSION_METADATA: Record<PermissionKey, { label: string; group: string; description: string }> = {
  // Dashboard
  'dashboard:view_analytics': {
    label: 'View Analytics Trends',
    group: 'Dashboard',
    description: 'View timeline traffic charts, impressions, and engagement graphs',
  },
  'dashboard:view_kpis': {
    label: 'View High-Level KPIs',
    group: 'Dashboard',
    description: 'Inspect overall conversion rates, visits, and customer count',
  },
  'dashboard:view_live': {
    label: 'Live Active Visitor Monitor',
    group: 'Dashboard',
    description: 'Real-time heartbeat view of visitors currently on the website',
  },

  // Leads
  'leads:view': {
    label: 'View Inquiries / Leads',
    group: 'Leads & CRM',
    description: 'Browse client project briefs and submission cards',
  },
  'leads:view_contact': {
    label: 'View Full Contact Info',
    group: 'Leads & CRM',
    description: 'Access unmasked email addresses and direct communication channels',
  },
  'leads:create': {
    label: 'Create Leads Manually',
    group: 'Leads & CRM',
    description: 'Manually add customer project inquiries into the studio pipeline',
  },
  'leads:edit': {
    label: 'Edit Inquiries',
    group: 'Leads & CRM',
    description: 'Modify project category, budget scope, or client details',
  },
  'leads:change_status': {
    label: 'Change Lead Status',
    group: 'Leads & CRM',
    description: 'Transition status (New, Contacted, In Progress, Won, Lost, Spam)',
  },
  'leads:add_notes': {
    label: 'Add Collaboration Notes',
    group: 'Leads & CRM',
    description: 'Append internal timeline notes to client inquiries',
  },
  'leads:assign': {
    label: 'Assign Leads to Specialists',
    group: 'Leads & CRM',
    description: 'Delegate customer submissions to studio team members',
  },
  'leads:delete': {
    label: 'Delete Leads',
    group: 'Leads & CRM',
    description: 'Purge client records and associated encrypted notes from vault',
  },
  'leads:bulk_actions': {
    label: 'Bulk Batch Actions',
    group: 'Leads & CRM',
    description: 'Perform mass status changes or assignments on multiple records',
  },
  'leads:export': {
    label: 'Export Leads (Excel / CSV)',
    group: 'Leads & CRM',
    description: 'Download lead workbooks and schedule automated daily digests',
  },

  // Work Items
  'work_items:view': {
    label: 'View Work Items',
    group: 'Work & Tasks',
    description: 'Access work items and tasks pipeline',
  },
  'work_items:view_all': {
    label: 'View All Work Items',
    group: 'Work & Tasks',
    description: 'View every work item across the entire studio (subject to personal privacy)',
  },
  'work_items:view_assigned': {
    label: 'View Assigned To Me',
    group: 'Work & Tasks',
    description: 'Access tasks assigned specifically to the user in My Tasks',
  },
  'work_items:view_created': {
    label: 'View Created By Me',
    group: 'Work & Tasks',
    description: 'Inspect jobs and work items initiated by the user',
  },
  'work_items:create': {
    label: 'Create Work Items',
    group: 'Work & Tasks',
    description: 'Create new standalone work items or convert from leads',
  },
  'work_items:edit': {
    label: 'Edit Work Items',
    group: 'Work & Tasks',
    description: 'Modify title, description, tags, and parameters of active work items',
  },
  'work_items:delete': {
    label: 'Delete Work Items',
    group: 'Work & Tasks',
    description: 'Soft-delete work items to trash or restore them',
  },
  'work_items:assign': {
    label: 'Assign Work to Team',
    group: 'Work & Tasks',
    description: 'Assign work items to team members and configure shared fields checklist',
  },
  'work_items:reassign': {
    label: 'Reassign Work Items',
    group: 'Work & Tasks',
    description: 'Change assignee and preserve full assignment audit history',
  },
  'work_items:change_status': {
    label: 'Change Task Status',
    group: 'Work & Tasks',
    description: 'Transition status within allowed role-based state machine',
  },
  'work_items:update_progress': {
    label: 'Update Progress & Subtasks',
    group: 'Work & Tasks',
    description: 'Adjust 0-100% completion bar and tick off checklist items',
  },
  'work_items:deliver': {
    label: 'Deliver Work to Client',
    group: 'Work & Tasks',
    description: 'Execute delivery flow, requiring final price and payment status',
  },
  'work_items:edit_delivered': {
    label: 'Edit Delivered Records',
    group: 'Work & Tasks',
    description: 'Unlock and modify delivered items (audit logged with before/after)',
  },

  // Intake & Resources
  'intake:create': {
    label: 'Intake Work (Non-Web)',
    group: 'Intake & Media',
    description: 'Manually register work from WhatsApp, Instagram, Referrals, etc.',
  },
  'intake:upload_files': {
    label: 'Upload Client Resources',
    group: 'Intake & Media',
    description: 'Upload files and deliverables with security validation',
  },
  'intake:add_links': {
    label: 'Attach External Links',
    group: 'Intake & Media',
    description: 'Attach Google Drive, Dropbox, WeTransfer, OneDrive links safely',
  },
  'intake:create_personal': {
    label: 'Create Personal/Own Work',
    group: 'Intake & Media',
    description: 'Create private work items hidden from general team visibility',
  },

  // Financial Layer
  'financials:view_quote': {
    label: 'View Quoted Budgets',
    group: 'Financial Layer',
    description: 'Inspect initial client budget expectations and quote numbers',
  },
  'financials:view_delivered': {
    label: 'View Delivered Prices & Payments',
    group: 'Financial Layer',
    description: 'Inspect final price, payments received, and outstanding balances',
  },
  'financials:edit': {
    label: 'Edit Financial Records',
    group: 'Financial Layer',
    description: 'Modify prices, taxes, discounts, and payment statuses (reauth protected)',
  },
  'financials:export': {
    label: 'Export Financial Ledger',
    group: 'Financial Layer',
    description: 'Download financial columns and accounting ledger workbooks',
  },

  // Share Templates
  'share_templates:manage': {
    label: 'Manage Share Templates',
    group: 'Work & Tasks',
    description: 'Create and edit reusable field-sharing templates for assignments',
  },

  // Performance
  'performance:view_own': {
    label: 'View Own Performance',
    group: 'Team Intelligence',
    description: 'Inspect personal completed tasks count and on-time metrics',
  },
  'performance:view_team': {
    label: 'View Team Workload',
    group: 'Team Intelligence',
    description: 'View team member open task counts and capacity in assign dialog',
  },
  'performance:view_all': {
    label: 'View Performance Leaderboard',
    group: 'Team Intelligence',
    description: 'Access full studio performance leaderboards and velocity analytics',
  },

  // Clients Directory
  'clients:view': {
    label: 'View Clients Directory',
    group: 'Leads & CRM',
    description: 'Inspect client profiles, past work history, and contact cards',
  },
  'clients:manage': {
    label: 'Manage Clients Directory',
    group: 'Leads & CRM',
    description: 'Create, update, and manage company records and billing addresses',
  },

  // Analytics
  'analytics:view': {
    label: 'View Deep Analytics',
    group: 'Analytics & Intel',
    description: 'Access device breakdown, OS, traffic sources, and geo distribution',
  },
  'analytics:export': {
    label: 'Export Analytics Reports',
    group: 'Analytics & Intel',
    description: 'Generate raw traffic logs and engagement reports',
  },

  // Security & Audit
  'audit:view': {
    label: 'View Immutable Audit Logs',
    group: 'Security & Vault',
    description: 'Inspect administrative event timeline, auth records, and export logs',
  },
  'users:manage': {
    label: 'Manage Team & Permissions (Super Admin)',
    group: 'Security & Vault',
    description: 'Create users, grant custom permissions, reset credentials, and define roles',
  },

  // Settings
  'settings:view': {
    label: 'View Studio Configuration',
    group: 'Studio Settings',
    description: 'Inspect global webhook endpoints, rate limits, and security policies',
  },
  'settings:edit': {
    label: 'Modify Studio Configuration',
    group: 'Studio Settings',
    description: 'Update vault security flags, notification webhooks, and lockout thresholds',
  },
};

export interface LeadScopeConfig {
  statuses?: Array<'new' | 'contacted' | 'in_progress' | 'won' | 'lost' | 'spam'>;
  assignedToMe?: boolean;
  sources?: string[];
  maxAgeDays?: number;
}

export interface WorkItemScopeConfig {
  canAssignToRoles?: string[]; // Empty/undefined = anyone; or list of role IDs e.g. ['sales_executive', 'viewer']
  viewScope?: 'all' | 'assigned_only' | 'created_only';
  includePersonal?: boolean; // Can view personal items created by self/others
}

export interface ResolvedPermissions {
  adminId: string;
  email: string;
  name: string | null;
  roleId: string;
  roleName: string;
  isSuperAdmin: boolean;
  permissions: Set<PermissionKey>;
  leadScope: LeadScopeConfig;
  workItemScope?: WorkItemScopeConfig;
  status: string;
  expiresAt: number | null;
  mustChangePassword: boolean;
  mustSetup2Fa: boolean;
}

export const BUILT_IN_ROLES = [
  {
    id: 'superadmin',
    name: 'Super Admin',
    description: 'Owner/Executive: Unrestricted control over all studio assets, users, roles, work items, and vault secrets.',
    isBuiltIn: true,
    permissions: [...ALL_PERMISSIONS],
    defaultLeadScope: {} as LeadScopeConfig,
  },
  {
    id: 'manager',
    name: 'Studio Manager',
    description: 'Operational lead: Oversees full leads pipeline, team assignments, work items, deliveries, exports, and analytics.',
    isBuiltIn: true,
    permissions: [
      'dashboard:view_analytics',
      'dashboard:view_kpis',
      'dashboard:view_live',
      'leads:view',
      'leads:view_contact',
      'leads:create',
      'leads:edit',
      'leads:change_status',
      'leads:add_notes',
      'leads:assign',
      'leads:bulk_actions',
      'leads:export',
      // Work items
      'work_items:view',
      'work_items:view_all',
      'work_items:create',
      'work_items:edit',
      'work_items:assign',
      'work_items:reassign',
      'work_items:change_status',
      'work_items:update_progress',
      'work_items:deliver',
      // Intake
      'intake:create',
      'intake:upload_files',
      'intake:add_links',
      'intake:create_personal',
      // Financials (Read quotes and deliveries, but not edit master rates)
      'financials:view_quote',
      'financials:view_delivered',
      // Share templates & clients
      'share_templates:manage',
      'clients:view',
      'clients:manage',
      'performance:view_own',
      'performance:view_team',
      'analytics:view',
      'audit:view',
      'settings:view',
    ] as PermissionKey[],
    defaultLeadScope: {} as LeadScopeConfig,
  },
  {
    id: 'sales_executive',
    name: 'Sales Executive',
    description: 'Frontline sales: Manages assigned prospective leads, creates customer work items, views quotes. No delivery or export rights.',
    isBuiltIn: true,
    permissions: [
      'dashboard:view_kpis',
      'leads:view',
      'leads:view_contact',
      'leads:change_status',
      'leads:add_notes',
      'work_items:view',
      'work_items:view_created',
      'work_items:view_assigned',
      'work_items:create',
      'intake:create',
      'intake:add_links',
      'financials:view_quote',
      'performance:view_own',
    ] as PermissionKey[],
    defaultLeadScope: {
      assignedToMe: true,
      statuses: ['new', 'contacted', 'in_progress'],
    } as LeadScopeConfig,
  },
  {
    id: 'viewer',
    name: 'Viewer / Specialist Assignee',
    description: 'Production specialist: Works on assigned jobs in My Tasks with only shared fields visible. Zero financial access.',
    isBuiltIn: true,
    permissions: [
      'dashboard:view_kpis',
      'leads:view',
      'work_items:view',
      'work_items:view_assigned',
      'work_items:change_status',
      'work_items:update_progress',
      'performance:view_own',
    ] as PermissionKey[],
    defaultLeadScope: {
      maxAgeDays: 90,
    } as LeadScopeConfig,
  },
];

/**
 * Standard Fields that can be ticked in the Share Fields Checklist.
 * Unticked fields must NEVER reach the assignee.
 */
export const SHAREABLE_FIELDS = [
  { id: 'clientName', label: 'Client Name', category: 'Contact' },
  { id: 'clientEmail', label: 'Client Email', category: 'Contact' },
  { id: 'clientPhone', label: 'Client Phone', category: 'Contact' },
  { id: 'clientCompany', label: 'Company / Organization', category: 'Contact' },
  { id: 'description', label: 'Project Brief / Message', category: 'Scope' },
  { id: 'category', label: 'Service Category', category: 'Scope' },
  { id: 'source', label: 'Inquiry Source', category: 'Metadata' },
  { id: 'dueDate', label: 'Target Due Date', category: 'Timeline' },
  { id: 'priority', label: 'Task Priority', category: 'Timeline' },
  { id: 'tags', label: 'Project Tags', category: 'Metadata' },
  { id: 'links', label: 'Client Resource Links (Drive/Dropbox)', category: 'Resources' },
  { id: 'attachments', label: 'Uploaded Files & Assets', category: 'Resources' },
  { id: 'subtasks', label: 'Checklist & Subtasks', category: 'Scope' },
] as const;

export type ShareableFieldKey = (typeof SHAREABLE_FIELDS)[number]['id'];

/**
 * Default Share Templates for one-click assignment setup.
 */
export const DEFAULT_SHARE_TEMPLATES = [
  {
    id: 'designer_brief',
    name: 'Designer Brief',
    description: 'Shares project brief, category, due date, links, and attachments without direct client phone/email.',
    fields: ['clientName', 'description', 'category', 'dueDate', 'priority', 'tags', 'links', 'attachments', 'subtasks'] as ShareableFieldKey[],
  },
  {
    id: 'editor_brief',
    name: 'Video Editor Brief',
    description: 'Shares editing brief, cloud storage links (Drive/Dropbox/WeTransfer), and delivery timeline.',
    fields: ['clientName', 'description', 'category', 'dueDate', 'priority', 'links', 'attachments'] as ShareableFieldKey[],
  },
  {
    id: 'developer_scope',
    name: 'Developer Scope',
    description: 'Shares technical brief, design links, subtasks, and deadline.',
    fields: ['clientName', 'description', 'category', 'dueDate', 'priority', 'tags', 'links', 'subtasks'] as ShareableFieldKey[],
  },
  {
    id: 'full_client_brief',
    name: 'Full Client Brief (Non-Financial)',
    description: 'Shares all client communication details while strictly isolating prices and payments.',
    fields: SHAREABLE_FIELDS.map((f) => f.id) as ShareableFieldKey[],
  },
];
