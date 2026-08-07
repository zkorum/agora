import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AdministratorProjectApiTranslations {
  createdProject: string;
  failedToCreateProject: string;
  failedToFetchProjects: string;
  updatedProject: string;
  failedToUpdateProject: string;
  updatedProjectLanguageSettings: string;
  failedToUpdateProjectLanguageSettings: string;
  updatedProjectSlug: string;
  failedToUpdateProjectSlug: string;
  deletedProject: string;
  failedToDeleteProject: string;
  projectNotFound: string;
  unknownOrganizationSlug: string;
  organizationNotListed: string;
  projectSlugAlreadyExists: string;
  projectConflict: string;
  dynamicTranslationEntitlementRequired: string;
  missingManualProjectContentLocalization: string;
}

const en: AdministratorProjectApiTranslations = {
  createdProject: "Created project",
  failedToCreateProject: "Failed to create project",
  failedToFetchProjects: "Failed to fetch projects",
  updatedProject: "Updated project",
  failedToUpdateProject: "Failed to update project",
  updatedProjectLanguageSettings: "Updated project language settings",
  failedToUpdateProjectLanguageSettings:
    "Failed to update project language settings",
  updatedProjectSlug: "Updated project slug",
  failedToUpdateProjectSlug: "Failed to update project slug",
  deletedProject: "Deleted project",
  failedToDeleteProject: "Failed to delete project",
  projectNotFound: "Project not found",
  unknownOrganizationSlug: "Unknown organization slug: {organizationSlugs}",
  organizationNotListed: "Organization must be listed: {organizationSlugs}",
  projectSlugAlreadyExists: "A project with this slug already exists",
  projectConflict: "Project data conflicts with an existing record",
  dynamicTranslationEntitlementRequired:
    "At least one project owner organization must have the dynamic translation entitlement",
  missingManualProjectContentLocalization:
    "Manual project content is required for every active target language when dynamic translation is off",
};

const ar: AdministratorProjectApiTranslations = {
  createdProject: "تم إنشاء المشروع",
  failedToCreateProject: "فشل إنشاء المشروع",
  failedToFetchProjects: "فشل جلب المشاريع",
  updatedProject: "تم تحديث المشروع",
  failedToUpdateProject: "فشل تحديث المشروع",
  updatedProjectLanguageSettings: "تم تحديث إعدادات لغة المشروع",
  failedToUpdateProjectLanguageSettings: "فشل تحديث إعدادات لغة المشروع",
  updatedProjectSlug: "تم تحديث المعرّف المختصر للمشروع",
  failedToUpdateProjectSlug: "فشل تحديث المعرّف المختصر للمشروع",
  deletedProject: "تم حذف المشروع",
  failedToDeleteProject: "فشل حذف المشروع",
  projectNotFound: "لم يتم العثور على المشروع",
  unknownOrganizationSlug: "معرّف مختصر غير معروف للمؤسسة: {organizationSlugs}",
  organizationNotListed: "يجب أن تكون المؤسسة مدرجة: {organizationSlugs}",
  projectSlugAlreadyExists: "يوجد مشروع بهذا المعرّف المختصر بالفعل",
  projectConflict: "تتعارض بيانات المشروع مع سجل موجود",
  dynamicTranslationEntitlementRequired:
    "يجب أن تتمتع مؤسسة واحدة على الأقل من المؤسسات المالكة للمشروع بصلاحية الترجمة الديناميكية",
  missingManualProjectContentLocalization:
    "يجب توفير ترجمة يدوية لمحتوى المشروع لكل لغة مستهدفة نشطة عند إيقاف الترجمة الديناميكية",
};

const es: AdministratorProjectApiTranslations = {
  createdProject: "Proyecto creado",
  failedToCreateProject: "No se pudo crear el proyecto",
  failedToFetchProjects: "No se pudieron obtener los proyectos",
  updatedProject: "Proyecto actualizado",
  failedToUpdateProject: "No se pudo actualizar el proyecto",
  updatedProjectLanguageSettings:
    "Configuración de idioma del proyecto actualizada",
  failedToUpdateProjectLanguageSettings:
    "No se pudo actualizar la configuración de idioma del proyecto",
  updatedProjectSlug: "Slug del proyecto actualizado",
  failedToUpdateProjectSlug: "No se pudo actualizar el slug del proyecto",
  deletedProject: "Proyecto eliminado",
  failedToDeleteProject: "No se pudo eliminar el proyecto",
  projectNotFound: "Proyecto no encontrado",
  unknownOrganizationSlug:
    "Slug de organización desconocido: {organizationSlugs}",
  organizationNotListed:
    "La organización debe estar listada: {organizationSlugs}",
  projectSlugAlreadyExists: "Ya existe un proyecto con este slug",
  projectConflict:
    "Los datos del proyecto entran en conflicto con un registro existente",
  dynamicTranslationEntitlementRequired:
    "Al menos una organización propietaria del proyecto debe tener habilitada la traducción dinámica",
  missingManualProjectContentLocalization:
    "Cuando la traducción dinámica está desactivada, se requiere contenido del proyecto traducido manualmente para cada idioma de destino activo",
};

const fa: AdministratorProjectApiTranslations = {
  createdProject: "پروژه ایجاد شد",
  failedToCreateProject: "ایجاد پروژه ناموفق بود",
  failedToFetchProjects: "دریافت پروژه‌ها ناموفق بود",
  updatedProject: "پروژه به‌روزرسانی شد",
  failedToUpdateProject: "به‌روزرسانی پروژه ناموفق بود",
  updatedProjectLanguageSettings: "تنظیمات زبان پروژه به‌روزرسانی شد",
  failedToUpdateProjectLanguageSettings:
    "به‌روزرسانی تنظیمات زبان پروژه ناموفق بود",
  updatedProjectSlug: "اسلاگ پروژه به‌روزرسانی شد",
  failedToUpdateProjectSlug: "به‌روزرسانی اسلاگ پروژه ناموفق بود",
  deletedProject: "پروژه حذف شد",
  failedToDeleteProject: "حذف پروژه ناموفق بود",
  projectNotFound: "پروژه یافت نشد",
  unknownOrganizationSlug: "اسلاگ سازمان ناشناخته است: {organizationSlugs}",
  organizationNotListed: "سازمان باید در فهرست باشد: {organizationSlugs}",
  projectSlugAlreadyExists: "پروژه‌ای با این اسلاگ از قبل وجود دارد",
  projectConflict: "داده‌های پروژه با یک رکورد موجود تداخل دارد",
  dynamicTranslationEntitlementRequired:
    "حداقل یکی از سازمان‌های مالک پروژه باید مجوز ترجمه پویا را داشته باشد",
  missingManualProjectContentLocalization:
    "وقتی ترجمه پویا غیرفعال است، محتوای ترجمه‌شده دستی پروژه برای هر زبان مقصد فعال الزامی است",
};

const fr: AdministratorProjectApiTranslations = {
  createdProject: "Projet créé",
  failedToCreateProject: "Échec de la création du projet",
  failedToFetchProjects: "Échec de la récupération des projets",
  updatedProject: "Projet mis à jour",
  failedToUpdateProject: "Échec de la mise à jour du projet",
  updatedProjectLanguageSettings:
    "Paramètres linguistiques du projet mis à jour",
  failedToUpdateProjectLanguageSettings:
    "Échec de la mise à jour des paramètres linguistiques du projet",
  updatedProjectSlug: "Slug du projet mis à jour",
  failedToUpdateProjectSlug: "Échec de la mise à jour du slug du projet",
  deletedProject: "Projet supprimé",
  failedToDeleteProject: "Échec de la suppression du projet",
  projectNotFound: "Projet introuvable",
  unknownOrganizationSlug: "Slug d’organisation inconnu : {organizationSlugs}",
  organizationNotListed:
    "L’organisation doit être répertoriée : {organizationSlugs}",
  projectSlugAlreadyExists: "Un projet avec ce slug existe déjà",
  projectConflict:
    "Les données du projet sont en conflit avec un enregistrement existant",
  dynamicTranslationEntitlementRequired:
    "Au moins une organisation propriétaire du projet doit disposer du droit à la traduction dynamique",
  missingManualProjectContentLocalization:
    "Lorsque la traduction dynamique est désactivée, le contenu du projet doit être traduit manuellement dans chaque langue cible active",
};

const he: AdministratorProjectApiTranslations = {
  createdProject: "הפרויקט נוצר",
  failedToCreateProject: "יצירת הפרויקט נכשלה",
  failedToFetchProjects: "טעינת הפרויקטים נכשלה",
  updatedProject: "הפרויקט עודכן",
  failedToUpdateProject: "עדכון הפרויקט נכשל",
  updatedProjectLanguageSettings: "הגדרות השפה של הפרויקט עודכנו",
  failedToUpdateProjectLanguageSettings: "עדכון הגדרות השפה של הפרויקט נכשל",
  updatedProjectSlug: "המזהה המקוצר של הפרויקט עודכן",
  failedToUpdateProjectSlug: "עדכון המזהה המקוצר של הפרויקט נכשל",
  deletedProject: "הפרויקט נמחק",
  failedToDeleteProject: "מחיקת הפרויקט נכשלה",
  projectNotFound: "הפרויקט לא נמצא",
  unknownOrganizationSlug: "מזהה מקוצר לא מוכר של ארגון: {organizationSlugs}",
  organizationNotListed: "הארגון חייב להופיע ברשימה: {organizationSlugs}",
  projectSlugAlreadyExists: "כבר קיים פרויקט עם המזהה המקוצר הזה",
  projectConflict: "נתוני הפרויקט מתנגשים עם רשומה קיימת",
  dynamicTranslationEntitlementRequired:
    "לפחות אחד מהארגונים שבבעלותם הפרויקט חייב להיות זכאי לתרגום דינמי",
  missingManualProjectContentLocalization:
    "כאשר התרגום הדינמי מושבת, נדרש תוכן פרויקט מתורגם ידנית לכל שפת יעד פעילה",
};

const ja: AdministratorProjectApiTranslations = {
  createdProject: "プロジェクトを作成しました",
  failedToCreateProject: "プロジェクトを作成できませんでした",
  failedToFetchProjects: "プロジェクトを取得できませんでした",
  updatedProject: "プロジェクトを更新しました",
  failedToUpdateProject: "プロジェクトを更新できませんでした",
  updatedProjectLanguageSettings: "プロジェクトの言語設定を更新しました",
  failedToUpdateProjectLanguageSettings:
    "プロジェクトの言語設定を更新できませんでした",
  updatedProjectSlug: "プロジェクトのスラッグを更新しました",
  failedToUpdateProjectSlug: "プロジェクトのスラッグを更新できませんでした",
  deletedProject: "プロジェクトを削除しました",
  failedToDeleteProject: "プロジェクトを削除できませんでした",
  projectNotFound: "プロジェクトが見つかりません",
  unknownOrganizationSlug: "不明な組織スラッグ: {organizationSlugs}",
  organizationNotListed:
    "組織が一覧に掲載されている必要があります: {organizationSlugs}",
  projectSlugAlreadyExists: "このスラッグのプロジェクトはすでに存在します",
  projectConflict: "プロジェクトデータが既存のレコードと競合しています",
  dynamicTranslationEntitlementRequired:
    "プロジェクトを所有する組織のうち、少なくとも1つに動的翻訳の利用権限が必要です",
  missingManualProjectContentLocalization:
    "動的翻訳が無効の場合、有効なすべての対象言語について、プロジェクトコンテンツの手動翻訳が必要です",
};

const ky: AdministratorProjectApiTranslations = {
  createdProject: "Долбоор түзүлдү",
  failedToCreateProject: "Долбоорду түзүү ишке ашкан жок",
  failedToFetchProjects: "Долбоорлорду алуу ишке ашкан жок",
  updatedProject: "Долбоор жаңыртылды",
  failedToUpdateProject: "Долбоорду жаңыртуу ишке ашкан жок",
  updatedProjectLanguageSettings: "Долбоордун тил жөндөөлөрү жаңыртылды",
  failedToUpdateProjectLanguageSettings:
    "Долбоордун тил жөндөөлөрүн жаңыртуу ишке ашкан жок",
  updatedProjectSlug: "Долбоордун слагы жаңыртылды",
  failedToUpdateProjectSlug: "Долбоордун слагын жаңыртуу ишке ашкан жок",
  deletedProject: "Долбоор өчүрүлдү",
  failedToDeleteProject: "Долбоорду өчүрүү ишке ашкан жок",
  projectNotFound: "Долбоор табылган жок",
  unknownOrganizationSlug: "Уюмдун белгисиз слагы: {organizationSlugs}",
  organizationNotListed: "Уюм тизмеде болушу керек: {organizationSlugs}",
  projectSlugAlreadyExists: "Мындай слагы бар долбоор мурунтан эле бар",
  projectConflict: "Долбоордун дайындары учурдагы жазууга карама-каршы келет",
  dynamicTranslationEntitlementRequired:
    "Долбоорго ээлик кылган уюмдардын жок дегенде биринде динамикалык котормого укук болушу керек",
  missingManualProjectContentLocalization:
    "Динамикалык котормо өчүрүлгөндө, ар бир активдүү максаттуу тил үчүн долбоордун мазмунун кол менен локалдаштыруу талап кылынат",
};

const ru: AdministratorProjectApiTranslations = {
  createdProject: "Проект создан",
  failedToCreateProject: "Не удалось создать проект",
  failedToFetchProjects: "Не удалось получить проекты",
  updatedProject: "Проект обновлен",
  failedToUpdateProject: "Не удалось обновить проект",
  updatedProjectLanguageSettings: "Языковые настройки проекта обновлены",
  failedToUpdateProjectLanguageSettings:
    "Не удалось обновить языковые настройки проекта",
  updatedProjectSlug: "Слаг проекта обновлен",
  failedToUpdateProjectSlug: "Не удалось обновить слаг проекта",
  deletedProject: "Проект удален",
  failedToDeleteProject: "Не удалось удалить проект",
  projectNotFound: "Проект не найден",
  unknownOrganizationSlug: "Неизвестный слаг организации: {organizationSlugs}",
  organizationNotListed:
    "Организация должна быть указана в списке: {organizationSlugs}",
  projectSlugAlreadyExists: "Проект с таким слагом уже существует",
  projectConflict: "Данные проекта конфликтуют с существующей записью",
  dynamicTranslationEntitlementRequired:
    "По крайней мере одна организация-владелец проекта должна иметь право на динамический перевод",
  missingManualProjectContentLocalization:
    "Когда динамический перевод отключен, для каждого активного целевого языка требуется локализация содержимого проекта вручную",
};

const zhHans: AdministratorProjectApiTranslations = {
  createdProject: "项目已创建",
  failedToCreateProject: "创建项目失败",
  failedToFetchProjects: "获取项目失败",
  updatedProject: "项目已更新",
  failedToUpdateProject: "更新项目失败",
  updatedProjectLanguageSettings: "项目语言设置已更新",
  failedToUpdateProjectLanguageSettings: "更新项目语言设置失败",
  updatedProjectSlug: "项目网址别名已更新",
  failedToUpdateProjectSlug: "更新项目网址别名失败",
  deletedProject: "项目已删除",
  failedToDeleteProject: "删除项目失败",
  projectNotFound: "未找到项目",
  unknownOrganizationSlug: "未知的组织网址别名：{organizationSlugs}",
  organizationNotListed: "组织必须已列出：{organizationSlugs}",
  projectSlugAlreadyExists: "已存在使用此网址别名的项目",
  projectConflict: "项目数据与现有记录冲突",
  dynamicTranslationEntitlementRequired:
    "至少一个项目所有者组织必须拥有动态翻译权限",
  missingManualProjectContentLocalization:
    "关闭动态翻译时，必须为每种启用的目标语言提供手动翻译的项目内容",
};

const zhHant: AdministratorProjectApiTranslations = {
  createdProject: "專案已建立",
  failedToCreateProject: "建立專案失敗",
  failedToFetchProjects: "取得專案失敗",
  updatedProject: "專案已更新",
  failedToUpdateProject: "更新專案失敗",
  updatedProjectLanguageSettings: "專案語言設定已更新",
  failedToUpdateProjectLanguageSettings: "更新專案語言設定失敗",
  updatedProjectSlug: "專案網址代稱已更新",
  failedToUpdateProjectSlug: "更新專案網址代稱失敗",
  deletedProject: "專案已刪除",
  failedToDeleteProject: "刪除專案失敗",
  projectNotFound: "找不到專案",
  unknownOrganizationSlug: "未知的組織網址代稱：{organizationSlugs}",
  organizationNotListed: "組織必須已列出：{organizationSlugs}",
  projectSlugAlreadyExists: "已有專案使用此網址代稱",
  projectConflict: "專案資料與現有記錄衝突",
  dynamicTranslationEntitlementRequired:
    "至少一個專案擁有者組織必須具備動態翻譯權限",
  missingManualProjectContentLocalization:
    "關閉動態翻譯時，必須為每種啟用的目標語言提供手動翻譯的專案內容",
};

export const administratorProjectApiTranslations: Record<
  SupportedDisplayLanguageCodes,
  AdministratorProjectApiTranslations
> = {
  en,
  ar,
  es,
  fa,
  fr,
  he,
  ja,
  ky,
  ru,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
};
