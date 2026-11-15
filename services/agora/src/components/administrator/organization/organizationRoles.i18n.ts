import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

interface OrganizationRoleTranslations {
  admin: string;
  manager: string;
  moderator: string;
  roleLabel: string;
  editRole: string;
}

export const organizationRoleTranslations: Record<
  SupportedDisplayLanguageCodes,
  OrganizationRoleTranslations
> = {
  en: {
    admin: "Admin",
    manager: "Manager",
    moderator: "Moderator",
    roleLabel: "Organization role",
    editRole: "Change role",
  },
  fr: {
    admin: "Administrateur",
    manager: "Gestionnaire",
    moderator: "Modérateur",
    roleLabel: "Rôle dans l’organisation",
    editRole: "Modifier le rôle",
  },
  es: {
    admin: "Administrador",
    manager: "Gestor",
    moderator: "Moderador",
    roleLabel: "Rol en la organización",
    editRole: "Cambiar rol",
  },
  ar: {
    admin: "مسؤول",
    manager: "مدير",
    moderator: "مشرف",
    roleLabel: "الدور في المؤسسة",
    editRole: "تغيير الدور",
  },
  fa: {
    admin: "مدیر ارشد",
    manager: "مدیر",
    moderator: "ناظر",
    roleLabel: "نقش در سازمان",
    editRole: "تغییر نقش",
  },
  he: {
    admin: "מנהל מערכת",
    manager: "מנהל",
    moderator: "מפקח",
    roleLabel: "תפקיד בארגון",
    editRole: "שינוי תפקיד",
  },
  ja: {
    admin: "管理者",
    manager: "マネージャー",
    moderator: "モデレーター",
    roleLabel: "組織内の役割",
    editRole: "役割を変更",
  },
  ky: {
    admin: "Администратор",
    manager: "Башкаруучу",
    moderator: "Модератор",
    roleLabel: "Уюмдагы роль",
    editRole: "Ролду өзгөртүү",
  },
  ru: {
    admin: "Администратор",
    manager: "Управляющий",
    moderator: "Модератор",
    roleLabel: "Роль в организации",
    editRole: "Изменить роль",
  },
  "zh-Hans": {
    admin: "管理员",
    manager: "管理者",
    moderator: "版主",
    roleLabel: "组织角色",
    editRole: "更改角色",
  },
  "zh-Hant": {
    admin: "管理員",
    manager: "管理者",
    moderator: "版主",
    roleLabel: "組織角色",
    editRole: "變更角色",
  },
};
