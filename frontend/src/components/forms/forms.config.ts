/**
 * Repository-owned form catalog and ClickUp routing.
 * Keep destination IDs here so deployments do not depend on Supabase seed data.
 */
export type RepositoryFormDefinition = {
  id: string;
  label: string;
  department: string;
  template: string;
  clickUpListId: string;
};

export const REPOSITORY_FORMS: RepositoryFormDefinition[] = [
  {
    id: "rfp",
    label: "Request for Payment",
    department: "Finance",
    template: "./RfpSheet",
    clickUpListId: "901420772915",
  },
  {
    id: "po",
    label: "Purchase Order",
    department: "Finance",
    template: "./PoSheet",
    clickUpListId: "901420772915",
  },
  {
    id: "pcv",
    label: "Petty Cash Voucher",
    department: "Finance",
    template: "./PcvSheet",
    clickUpListId: "901420772915",
  },
];

export const REPOSITORY_FORM_MAPPINGS = REPOSITORY_FORMS.map((form) => ({
  id: `${form.department.toLowerCase()}-${form.id}`,
  department: form.department,
  formType: form.id,
  formLabel: form.label,
  listId: form.clickUpListId,
  approvers: [],
}));
