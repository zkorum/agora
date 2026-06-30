import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AdministratorOrganizationApiTranslations {
  failedToFetchOrganizations: string;
  failedToFetchOrganizationMembers: string;
  addedUserOrganizationMapping: string;
  failedToAddUserOrganizationMapping: string;
  removedUserOrganizationMapping: string;
  failedToRemoveUserOrganizationMapping: string;
  deletedOrganization: string;
  failedToDeleteOrganization: string;
  createdUserOrganization: string;
  failedToCreateUserOrganization: string;
  updatedOrganization: string;
  failedToUpdateOrganization: string;
  updatedOrganizationSlug: string;
  failedToUpdateOrganizationSlug: string;
  organizationSlugAlreadyExists: string;
  organizationNotFound: string;
  failedToGetUserOrganizations: string;
}

const en: AdministratorOrganizationApiTranslations = {
  failedToFetchOrganizations: "Failed to fetch organizations",
  failedToFetchOrganizationMembers: "Failed to fetch organization members",
  addedUserOrganizationMapping: "Added user organization mapping",
  failedToAddUserOrganizationMapping: "Failed to add user organization mapping",
  removedUserOrganizationMapping: "Removed user organization mapping",
  failedToRemoveUserOrganizationMapping:
    "Failed to remove user organization mapping",
  deletedOrganization: "Deleted organization",
  failedToDeleteOrganization: "Failed to delete organization",
  createdUserOrganization: "Created organization",
  failedToCreateUserOrganization: "Failed to create organization",
  updatedOrganization: "Updated organization",
  failedToUpdateOrganization: "Failed to update organization",
  updatedOrganizationSlug: "Updated organization slug",
  failedToUpdateOrganizationSlug: "Failed to update organization slug",
  organizationSlugAlreadyExists:
    "An organization with this slug already exists",
  organizationNotFound: "Organization not found",
  failedToGetUserOrganizations: "Failed to get user's organizations",
};

export const administratorOrganizationApiTranslations: Record<
  SupportedDisplayLanguageCodes,
  AdministratorOrganizationApiTranslations
> = {
  en,
  es: {
    ...en,
    failedToFetchOrganizations: "No se pudieron obtener las organizaciones",
    failedToFetchOrganizationMembers: "Failed to fetch organization members",
    addedUserOrganizationMapping: "Asignación usuario-organización agregada",
    failedToAddUserOrganizationMapping:
      "No se pudo agregar la asignación usuario-organización",
    removedUserOrganizationMapping: "Asignación usuario-organización eliminada",
    failedToRemoveUserOrganizationMapping:
      "No se pudo eliminar la asignación usuario-organización",
    deletedOrganization: "Organización eliminada",
    failedToDeleteOrganization: "No se pudo eliminar la organización",
    createdUserOrganization: "Organización creada",
    failedToCreateUserOrganization: "No se pudo crear la organización",
    updatedOrganization: "Organización actualizada",
    failedToUpdateOrganization: "No se pudo actualizar la organización",
    failedToGetUserOrganizations:
      "No se pudieron obtener las organizaciones del usuario",
  },
  fr: {
    ...en,
    failedToFetchOrganizations: "Échec de la récupération des organisations",
    failedToFetchOrganizationMembers: "Failed to fetch organization members",
    addedUserOrganizationMapping:
      "Association utilisateur-organisation ajoutée",
    failedToAddUserOrganizationMapping:
      "Échec de l’ajout de l’association utilisateur-organisation",
    removedUserOrganizationMapping:
      "Association utilisateur-organisation supprimée",
    failedToRemoveUserOrganizationMapping:
      "Échec de la suppression de l’association utilisateur-organisation",
    deletedOrganization: "Organisation supprimée",
    failedToDeleteOrganization: "Échec de la suppression de l’organisation",
    createdUserOrganization: "Organisation créée",
    failedToCreateUserOrganization: "Échec de la création de l’organisation",
    updatedOrganization: "Organisation mise à jour",
    failedToUpdateOrganization: "Échec de la mise à jour de l’organisation",
    failedToGetUserOrganizations:
      "Échec de la récupération des organisations de l’utilisateur",
  },
  "zh-Hant": {
    ...en,
    failedToFetchOrganizations: "取得組織失敗",
    failedToFetchOrganizationMembers: "Failed to fetch organization members",
    addedUserOrganizationMapping: "已新增使用者組織對應",
    failedToAddUserOrganizationMapping: "新增使用者組織對應失敗",
    removedUserOrganizationMapping: "已移除使用者組織對應",
    failedToRemoveUserOrganizationMapping: "移除使用者組織對應失敗",
    deletedOrganization: "組織已刪除",
    failedToDeleteOrganization: "刪除組織失敗",
    createdUserOrganization: "組織已建立",
    failedToCreateUserOrganization: "建立組織失敗",
    updatedOrganization: "組織已更新",
    failedToUpdateOrganization: "更新組織失敗",
    failedToGetUserOrganizations: "取得使用者組織失敗",
  },
  "zh-Hans": {
    ...en,
    failedToFetchOrganizations: "获取组织失败",
    failedToFetchOrganizationMembers: "Failed to fetch organization members",
    addedUserOrganizationMapping: "已添加用户组织映射",
    failedToAddUserOrganizationMapping: "添加用户组织映射失败",
    removedUserOrganizationMapping: "已移除用户组织映射",
    failedToRemoveUserOrganizationMapping: "移除用户组织映射失败",
    deletedOrganization: "组织已删除",
    failedToDeleteOrganization: "删除组织失败",
    createdUserOrganization: "组织已创建",
    failedToCreateUserOrganization: "创建组织失败",
    updatedOrganization: "组织已更新",
    failedToUpdateOrganization: "更新组织失败",
    failedToGetUserOrganizations: "获取用户组织失败",
  },
  ja: {
    ...en,
    failedToFetchOrganizations: "組織を取得できませんでした",
    failedToFetchOrganizationMembers: "Failed to fetch organization members",
    addedUserOrganizationMapping: "ユーザーと組織の関連付けを追加しました",
    failedToAddUserOrganizationMapping:
      "ユーザーと組織の関連付けを追加できませんでした",
    removedUserOrganizationMapping: "ユーザーと組織の関連付けを削除しました",
    failedToRemoveUserOrganizationMapping:
      "ユーザーと組織の関連付けを削除できませんでした",
    deletedOrganization: "組織を削除しました",
    failedToDeleteOrganization: "組織を削除できませんでした",
    createdUserOrganization: "組織を作成しました",
    failedToCreateUserOrganization: "組織を作成できませんでした",
    updatedOrganization: "組織を更新しました",
    failedToUpdateOrganization: "組織を更新できませんでした",
    failedToGetUserOrganizations: "ユーザーの組織を取得できませんでした",
  },
  ar: {
    ...en,
    failedToFetchOrganizations: "فشل جلب المؤسسات",
    failedToFetchOrganizationMembers: "Failed to fetch organization members",
    addedUserOrganizationMapping: "تمت إضافة ربط المستخدم بالمؤسسة",
    failedToAddUserOrganizationMapping: "فشل إضافة ربط المستخدم بالمؤسسة",
    removedUserOrganizationMapping: "تمت إزالة ربط المستخدم بالمؤسسة",
    failedToRemoveUserOrganizationMapping: "فشل إزالة ربط المستخدم بالمؤسسة",
    deletedOrganization: "تم حذف المؤسسة",
    failedToDeleteOrganization: "فشل حذف المؤسسة",
    createdUserOrganization: "تم إنشاء المؤسسة",
    failedToCreateUserOrganization: "فشل إنشاء المؤسسة",
    updatedOrganization: "تم تحديث المؤسسة",
    failedToUpdateOrganization: "فشل تحديث المؤسسة",
    failedToGetUserOrganizations: "فشل جلب مؤسسات المستخدم",
  },
  fa: {
    ...en,
    failedToFetchOrganizations: "دریافت سازمان‌ها ناموفق بود",
    failedToFetchOrganizationMembers: "Failed to fetch organization members",
    addedUserOrganizationMapping: "نگاشت کاربر به سازمان افزوده شد",
    failedToAddUserOrganizationMapping:
      "افزودن نگاشت کاربر به سازمان ناموفق بود",
    removedUserOrganizationMapping: "نگاشت کاربر به سازمان حذف شد",
    failedToRemoveUserOrganizationMapping:
      "حذف نگاشت کاربر به سازمان ناموفق بود",
    deletedOrganization: "سازمان حذف شد",
    failedToDeleteOrganization: "حذف سازمان ناموفق بود",
    createdUserOrganization: "سازمان ایجاد شد",
    failedToCreateUserOrganization: "ایجاد سازمان ناموفق بود",
    updatedOrganization: "سازمان به‌روزرسانی شد",
    failedToUpdateOrganization: "به‌روزرسانی سازمان ناموفق بود",
    failedToGetUserOrganizations: "دریافت سازمان‌های کاربر ناموفق بود",
  },
  he: {
    ...en,
    failedToFetchOrganizations: "טעינת הארגונים נכשלה",
    failedToFetchOrganizationMembers: "Failed to fetch organization members",
    addedUserOrganizationMapping: "שיוך המשתמש לארגון נוסף",
    failedToAddUserOrganizationMapping: "הוספת שיוך המשתמש לארגון נכשלה",
    removedUserOrganizationMapping: "שיוך המשתמש לארגון הוסר",
    failedToRemoveUserOrganizationMapping: "הסרת שיוך המשתמש לארגון נכשלה",
    deletedOrganization: "הארגון נמחק",
    failedToDeleteOrganization: "מחיקת הארגון נכשלה",
    createdUserOrganization: "הארגון נוצר",
    failedToCreateUserOrganization: "יצירת הארגון נכשלה",
    updatedOrganization: "הארגון עודכן",
    failedToUpdateOrganization: "עדכון הארגון נכשל",
    failedToGetUserOrganizations: "טעינת הארגונים של המשתמש נכשלה",
  },
  ky: {
    ...en,
    failedToFetchOrganizations: "Уюмдарды алуу ишке ашкан жок",
    failedToFetchOrganizationMembers: "Failed to fetch organization members",
    addedUserOrganizationMapping: "Колдонуучу-уюм байланышы кошулду",
    failedToAddUserOrganizationMapping:
      "Колдонуучу-уюм байланышын кошуу ишке ашкан жок",
    removedUserOrganizationMapping: "Колдонуучу-уюм байланышы өчүрүлдү",
    failedToRemoveUserOrganizationMapping:
      "Колдонуучу-уюм байланышын өчүрүү ишке ашкан жок",
    deletedOrganization: "Уюм өчүрүлдү",
    failedToDeleteOrganization: "Уюмду өчүрүү ишке ашкан жок",
    createdUserOrganization: "Уюм түзүлдү",
    failedToCreateUserOrganization: "Уюм түзүү ишке ашкан жок",
    updatedOrganization: "Уюм жаңыртылды",
    failedToUpdateOrganization: "Уюмду жаңыртуу ишке ашкан жок",
    failedToGetUserOrganizations: "Колдонуучунун уюмдарын алуу ишке ашкан жок",
  },
  ru: {
    ...en,
    failedToFetchOrganizations: "Не удалось получить организации",
    failedToFetchOrganizationMembers: "Failed to fetch organization members",
    addedUserOrganizationMapping: "Связь пользователя с организацией добавлена",
    failedToAddUserOrganizationMapping:
      "Не удалось добавить связь пользователя с организацией",
    removedUserOrganizationMapping: "Связь пользователя с организацией удалена",
    failedToRemoveUserOrganizationMapping:
      "Не удалось удалить связь пользователя с организацией",
    deletedOrganization: "Организация удалена",
    failedToDeleteOrganization: "Не удалось удалить организацию",
    createdUserOrganization: "Организация создана",
    failedToCreateUserOrganization: "Не удалось создать организацию",
    updatedOrganization: "Организация обновлена",
    failedToUpdateOrganization: "Не удалось обновить организацию",
    failedToGetUserOrganizations:
      "Не удалось получить организации пользователя",
  },
};
