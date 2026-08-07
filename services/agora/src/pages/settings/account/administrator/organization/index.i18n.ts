import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AdministratorOrganizationTranslations {
  administrator: string;
  createTab: string;
  manageTab: string;
  createTitle: string;
  createDescription: string;
  existingTitle: string;
  loadingOrganizationsMessage: string;
  noOrganizationsMessage: string;
  selectOrganizationLabel: string;
  editTitle: string;
  editDescription: string;
  saveSlugButton: string;
  slugWarningTitle: string;
  slugWarningDescription: string;
  confirmSlugChangeButton: string;
  languageLabel: string;
  defaultLanguageLabel: string;
  nameLabel: string;
  slugLabel: string;
  descriptionLabel: string;
  imagePathLabel: string;
  imagePathHint: string;
  websiteUrlLabel: string;
  websiteUrlHint: string;
  websiteUrlError: string;
  createButton: string;
  saveButton: string;
  deleteButton: string;
  confirmDeleteButton: string;
  cancelButton: string;
  deleteConfirmMessage: string;
  addMemberTitle: string;
  membershipDescription: string;
  usernameLabel: string;
  addUserButton: string;
  removeUserButton: string;
  memberListTitle: string;
  memberListDescription: string;
  fetchMembersButton: string;
  noMembersMessage: string;
  localizationMissingHint: string;
  defaultLanguageBadge: string;
  localizationReadyBadge: string;
  localizationMissingBadge: string;
  dangerZoneTitle: string;
  changeSlugDangerTitle: string;
  changeSlugDangerDescription: string;
  deleteDangerTitle: string;
  deleteDangerDescription: string;
}

const en: AdministratorOrganizationTranslations = {
  administrator: "Organizations",
  createTab: "Create",
  manageTab: "Manage",
  createTitle: "Create organization",
  createDescription:
    "Create the default organization profile first. Add translations from the Manage tab after creation.",
  existingTitle: "Manage existing organizations",
  loadingOrganizationsMessage: "Loading organizations...",
  noOrganizationsMessage: "No active organizations are registered.",
  selectOrganizationLabel: "Organization",
  editTitle: "Edit organization",
  editDescription:
    "Choose a display language, edit that localized profile, and optionally make it the default public profile.",
  saveSlugButton: "Save slug",
  slugWarningTitle: "Change public link?",
  slugWarningDescription:
    "Changing this slug can break links that were already visited or shared. Only continue if you are sure.",
  confirmSlugChangeButton: "Change slug",
  languageLabel: "Display language",
  defaultLanguageLabel: "Use this language as the default public profile",
  nameLabel: "Name",
  slugLabel: "URL slug",
  descriptionLabel: "Description",
  imagePathLabel: "Image path",
  imagePathHint:
    "Use an image filename such as avatar_default_0.png or a full https URL.",
  websiteUrlLabel: "Website URL",
  websiteUrlHint: "Use a full HTTPS URL, for example https://example.org.",
  websiteUrlError:
    "Website URL must use HTTPS and cannot contain embedded credentials.",
  createButton: "Create organization",
  saveButton: "Save changes",
  deleteButton: "Delete organization",
  confirmDeleteButton: "Confirm delete",
  cancelButton: "Cancel",
  deleteConfirmMessage: "This will delete this organization.",
  addMemberTitle: "Memberships",
  membershipDescription: "Add one username to the selected organization.",
  usernameLabel: "Username",
  addUserButton: "Add user",
  removeUserButton: "Remove user",
  memberListTitle: "Organization members",
  memberListDescription:
    "Fetch the current member list, then remove users directly from the list.",
  fetchMembersButton: "Fetch members",
  noMembersMessage: "No members found for this organization.",
  localizationMissingHint:
    "This language has no saved localization yet. The form is prefilled from the default profile so you can translate it quickly.",
  defaultLanguageBadge: "Default",
  localizationReadyBadge: "Saved",
  localizationMissingBadge: "Missing",
  dangerZoneTitle: "Danger zone",
  changeSlugDangerTitle: "Change organization URL slug",
  changeSlugDangerDescription:
    "Changing this slug can break public links that were already visited or shared.",
  deleteDangerTitle: "Delete this organization",
  deleteDangerDescription: "Delete this organization.",
};

const ar: AdministratorOrganizationTranslations = {
  administrator: "المنظمات",
  createTab: "إنشاء",
  manageTab: "إدارة",
  createTitle: "إنشاء منظمة",
  createDescription:
    "أنشئ أولًا الملف التعريفي الافتراضي للمنظمة. أضف الترجمات من علامة التبويب «إدارة» بعد الإنشاء.",
  existingTitle: "إدارة المنظمات الحالية",
  loadingOrganizationsMessage: "جارٍ تحميل المنظمات...",
  noOrganizationsMessage: "لا توجد منظمات نشطة مسجلة.",
  selectOrganizationLabel: "المنظمة",
  editTitle: "تعديل المنظمة",
  editDescription:
    "اختر لغة عرض، وعدّل الملف التعريفي المترجم إلى تلك اللغة، واجعله اختياريًا الملف التعريفي العام الافتراضي.",
  saveSlugButton: "حفظ المعرّف المختصر",
  slugWarningTitle: "هل تريد تغيير الرابط العام؟",
  slugWarningDescription:
    "قد يؤدي تغيير هذا المعرّف المختصر إلى تعطيل الروابط التي تمت زيارتها أو مشاركتها بالفعل. لا تتابع إلا إذا كنت متأكدًا.",
  confirmSlugChangeButton: "تغيير المعرّف المختصر",
  languageLabel: "لغة العرض",
  defaultLanguageLabel: "استخدام هذه اللغة للملف التعريفي العام الافتراضي",
  nameLabel: "الاسم",
  slugLabel: "المعرّف المختصر لعنوان URL",
  descriptionLabel: "الوصف",
  imagePathLabel: "مسار الصورة",
  imagePathHint:
    "استخدم اسم ملف صورة مثل avatar_default_0.png أو عنوان URL كاملًا يستخدم HTTPS.",
  websiteUrlLabel: "عنوان URL للموقع الإلكتروني",
  websiteUrlHint:
    "استخدم عنوان URL كاملًا يستخدم HTTPS، مثل https://example.org.",
  websiteUrlError:
    "يجب أن يستخدم عنوان URL للموقع الإلكتروني HTTPS وألا يحتوي على بيانات اعتماد مضمنة.",
  createButton: "إنشاء منظمة",
  saveButton: "حفظ التغييرات",
  deleteButton: "حذف المنظمة",
  confirmDeleteButton: "تأكيد الحذف",
  cancelButton: "إلغاء",
  deleteConfirmMessage: "سيؤدي هذا إلى حذف هذه المنظمة.",
  addMemberTitle: "العضويات",
  membershipDescription: "أضف اسم مستخدم واحدًا إلى المنظمة المحددة.",
  usernameLabel: "اسم المستخدم",
  addUserButton: "إضافة مستخدم",
  removeUserButton: "إزالة المستخدم",
  memberListTitle: "أعضاء المنظمة",
  memberListDescription:
    "استرد قائمة الأعضاء الحالية، ثم أزل المستخدمين مباشرةً من القائمة.",
  fetchMembersButton: "استرداد الأعضاء",
  noMembersMessage: "لم يتم العثور على أعضاء لهذه المنظمة.",
  localizationMissingHint:
    "لا توجد ترجمة محفوظة لهذه اللغة حتى الآن. تمت تعبئة النموذج مسبقًا من الملف التعريفي الافتراضي حتى تتمكن من ترجمته بسرعة.",
  defaultLanguageBadge: "افتراضي",
  localizationReadyBadge: "محفوظ",
  localizationMissingBadge: "غير موجود",
  dangerZoneTitle: "منطقة الخطر",
  changeSlugDangerTitle: "تغيير المعرّف المختصر لعنوان URL للمنظمة",
  changeSlugDangerDescription:
    "قد يؤدي تغيير هذا المعرّف المختصر إلى تعطيل الروابط العامة التي تمت زيارتها أو مشاركتها بالفعل.",
  deleteDangerTitle: "حذف هذه المنظمة",
  deleteDangerDescription: "احذف هذه المنظمة.",
};

const es: AdministratorOrganizationTranslations = {
  administrator: "Organizaciones",
  createTab: "Crear",
  manageTab: "Gestionar",
  createTitle: "Crear organización",
  createDescription:
    "Primero crea el perfil predeterminado de la organización. Después de crearlo, añade traducciones desde la pestaña Gestionar.",
  existingTitle: "Gestionar organizaciones existentes",
  loadingOrganizationsMessage: "Cargando organizaciones...",
  noOrganizationsMessage: "No hay ninguna organización activa registrada.",
  selectOrganizationLabel: "Organización",
  editTitle: "Editar organización",
  editDescription:
    "Elige un idioma de visualización, edita el perfil localizado correspondiente y, si quieres, establécelo como perfil público predeterminado.",
  saveSlugButton: "Guardar slug",
  slugWarningTitle: "¿Cambiar el enlace público?",
  slugWarningDescription:
    "Cambiar este slug puede inutilizar enlaces que ya se hayan visitado o compartido. Continúa solo si estás seguro.",
  confirmSlugChangeButton: "Cambiar slug",
  languageLabel: "Idioma de visualización",
  defaultLanguageLabel:
    "Usar este idioma para el perfil público predeterminado",
  nameLabel: "Nombre",
  slugLabel: "Slug de URL",
  descriptionLabel: "Descripción",
  imagePathLabel: "Ruta de la imagen",
  imagePathHint:
    "Usa un nombre de archivo de imagen como avatar_default_0.png o una URL HTTPS completa.",
  websiteUrlLabel: "URL del sitio web",
  websiteUrlHint:
    "Usa una URL HTTPS completa, por ejemplo https://example.org.",
  websiteUrlError:
    "La URL del sitio web debe usar HTTPS y no puede contener credenciales incrustadas.",
  createButton: "Crear organización",
  saveButton: "Guardar cambios",
  deleteButton: "Eliminar organización",
  confirmDeleteButton: "Confirmar eliminación",
  cancelButton: "Cancelar",
  deleteConfirmMessage: "Esto eliminará esta organización.",
  addMemberTitle: "Membresías",
  membershipDescription:
    "Añade un nombre de usuario a la organización seleccionada.",
  usernameLabel: "Nombre de usuario",
  addUserButton: "Añadir usuario",
  removeUserButton: "Quitar usuario",
  memberListTitle: "Miembros de la organización",
  memberListDescription:
    "Obtén la lista actual de miembros y después quita usuarios directamente de ella.",
  fetchMembersButton: "Obtener miembros",
  noMembersMessage: "No se encontraron miembros en esta organización.",
  localizationMissingHint:
    "Todavía no hay ninguna localización guardada para este idioma. El formulario se ha rellenado previamente con el perfil predeterminado para que puedas traducirlo rápidamente.",
  defaultLanguageBadge: "Predeterminado",
  localizationReadyBadge: "Guardado",
  localizationMissingBadge: "Falta",
  dangerZoneTitle: "Zona de peligro",
  changeSlugDangerTitle: "Cambiar el slug de URL de la organización",
  changeSlugDangerDescription:
    "Cambiar este slug puede inutilizar enlaces públicos que ya se hayan visitado o compartido.",
  deleteDangerTitle: "Eliminar esta organización",
  deleteDangerDescription: "Elimina esta organización.",
};

const fa: AdministratorOrganizationTranslations = {
  administrator: "سازمان‌ها",
  createTab: "ایجاد",
  manageTab: "مدیریت",
  createTitle: "ایجاد سازمان",
  createDescription:
    "ابتدا نمایه پیش‌فرض سازمان را ایجاد کنید. پس از ایجاد، ترجمه‌ها را از زبانه «مدیریت» اضافه کنید.",
  existingTitle: "مدیریت سازمان‌های موجود",
  loadingOrganizationsMessage: "در حال بارگذاری سازمان‌ها...",
  noOrganizationsMessage: "هیچ سازمان فعالی ثبت نشده است.",
  selectOrganizationLabel: "سازمان",
  editTitle: "ویرایش سازمان",
  editDescription:
    "یک زبان نمایش انتخاب کنید، نمایه بومی‌سازی‌شده آن را ویرایش کنید و در صورت تمایل آن را به‌عنوان نمایه عمومی پیش‌فرض قرار دهید.",
  saveSlugButton: "ذخیره نامک",
  slugWarningTitle: "پیوند عمومی تغییر کند؟",
  slugWarningDescription:
    "تغییر این نامک ممکن است پیوندهایی را که قبلاً بازدید یا هم‌رسانی شده‌اند از کار بیندازد. فقط در صورت اطمینان ادامه دهید.",
  confirmSlugChangeButton: "تغییر نامک",
  languageLabel: "زبان نمایش",
  defaultLanguageLabel: "استفاده از این زبان برای نمایه عمومی پیش‌فرض",
  nameLabel: "نام",
  slugLabel: "نامک URL",
  descriptionLabel: "توضیحات",
  imagePathLabel: "مسیر تصویر",
  imagePathHint:
    "از نام فایل تصویری مانند avatar_default_0.png یا یک نشانی کامل HTTPS استفاده کنید.",
  websiteUrlLabel: "نشانی وب‌سایت",
  websiteUrlHint:
    "از یک نشانی کامل HTTPS استفاده کنید، برای مثال https://example.org.",
  websiteUrlError:
    "نشانی وب‌سایت باید از HTTPS استفاده کند و نمی‌تواند شامل اطلاعات ورود تعبیه‌شده باشد.",
  createButton: "ایجاد سازمان",
  saveButton: "ذخیره تغییرات",
  deleteButton: "حذف سازمان",
  confirmDeleteButton: "تأیید حذف",
  cancelButton: "لغو",
  deleteConfirmMessage: "این کار این سازمان را حذف می‌کند.",
  addMemberTitle: "عضویت‌ها",
  membershipDescription: "یک نام کاربری به سازمان انتخاب‌شده اضافه کنید.",
  usernameLabel: "نام کاربری",
  addUserButton: "افزودن کاربر",
  removeUserButton: "حذف کاربر",
  memberListTitle: "اعضای سازمان",
  memberListDescription:
    "فهرست اعضای فعلی را دریافت کنید، سپس کاربران را مستقیماً از فهرست حذف کنید.",
  fetchMembersButton: "دریافت اعضا",
  noMembersMessage: "هیچ عضوی برای این سازمان یافت نشد.",
  localizationMissingHint:
    "هنوز بومی‌سازی ذخیره‌شده‌ای برای این زبان وجود ندارد. فرم از نمایه پیش‌فرض از پیش پر شده است تا بتوانید آن را سریع ترجمه کنید.",
  defaultLanguageBadge: "پیش‌فرض",
  localizationReadyBadge: "ذخیره‌شده",
  localizationMissingBadge: "موجود نیست",
  dangerZoneTitle: "منطقه خطر",
  changeSlugDangerTitle: "تغییر نامک URL سازمان",
  changeSlugDangerDescription:
    "تغییر این نامک ممکن است پیوندهای عمومی را که قبلاً بازدید یا هم‌رسانی شده‌اند از کار بیندازد.",
  deleteDangerTitle: "حذف این سازمان",
  deleteDangerDescription: "این سازمان را حذف کنید.",
};

const fr: AdministratorOrganizationTranslations = {
  administrator: "Organisations",
  createTab: "Créer",
  manageTab: "Gérer",
  createTitle: "Créer une organisation",
  createDescription:
    "Créez d’abord le profil par défaut de l’organisation. Après sa création, ajoutez des traductions depuis l’onglet Gérer.",
  existingTitle: "Gérer les organisations existantes",
  loadingOrganizationsMessage: "Chargement des organisations...",
  noOrganizationsMessage: "Aucune organisation active n’est enregistrée.",
  selectOrganizationLabel: "Organisation",
  editTitle: "Modifier l’organisation",
  editDescription:
    "Choisissez une langue d’affichage, modifiez le profil localisé correspondant et, si vous le souhaitez, définissez-le comme profil public par défaut.",
  saveSlugButton: "Enregistrer le slug",
  slugWarningTitle: "Modifier le lien public ?",
  slugWarningDescription:
    "La modification de ce slug peut rompre des liens déjà consultés ou partagés. Ne continuez que si vous êtes sûr.",
  confirmSlugChangeButton: "Modifier le slug",
  languageLabel: "Langue d’affichage",
  defaultLanguageLabel:
    "Utiliser cette langue pour le profil public par défaut",
  nameLabel: "Nom",
  slugLabel: "Slug d’URL",
  descriptionLabel: "Description",
  imagePathLabel: "Chemin de l’image",
  imagePathHint:
    "Utilisez un nom de fichier image tel que avatar_default_0.png ou une URL HTTPS complète.",
  websiteUrlLabel: "URL du site web",
  websiteUrlHint:
    "Utilisez une URL HTTPS complète, par exemple https://example.org.",
  websiteUrlError:
    "L’URL du site web doit utiliser HTTPS et ne peut pas contenir d’identifiants intégrés.",
  createButton: "Créer une organisation",
  saveButton: "Enregistrer les modifications",
  deleteButton: "Supprimer l’organisation",
  confirmDeleteButton: "Confirmer la suppression",
  cancelButton: "Annuler",
  deleteConfirmMessage: "Cette action supprimera cette organisation.",
  addMemberTitle: "Adhésions",
  membershipDescription:
    "Ajoutez un nom d’utilisateur à l’organisation sélectionnée.",
  usernameLabel: "Nom d’utilisateur",
  addUserButton: "Ajouter un utilisateur",
  removeUserButton: "Retirer l’utilisateur",
  memberListTitle: "Membres de l’organisation",
  memberListDescription:
    "Récupérez la liste actuelle des membres, puis retirez des utilisateurs directement depuis cette liste.",
  fetchMembersButton: "Récupérer les membres",
  noMembersMessage: "Aucun membre trouvé pour cette organisation.",
  localizationMissingHint:
    "Aucune localisation n’est encore enregistrée pour cette langue. Le formulaire est prérempli à partir du profil par défaut afin que vous puissiez le traduire rapidement.",
  defaultLanguageBadge: "Par défaut",
  localizationReadyBadge: "Enregistré",
  localizationMissingBadge: "Manquant",
  dangerZoneTitle: "Zone dangereuse",
  changeSlugDangerTitle: "Modifier le slug d’URL de l’organisation",
  changeSlugDangerDescription:
    "La modification de ce slug peut rompre des liens publics déjà consultés ou partagés.",
  deleteDangerTitle: "Supprimer cette organisation",
  deleteDangerDescription: "Supprimez cette organisation.",
};

const he: AdministratorOrganizationTranslations = {
  administrator: "ארגונים",
  createTab: "יצירה",
  manageTab: "ניהול",
  createTitle: "יצירת ארגון",
  createDescription:
    "תחילה יש ליצור את פרופיל ברירת המחדל של הארגון. לאחר היצירה ניתן להוסיף תרגומים מהכרטיסייה ״ניהול״.",
  existingTitle: "ניהול ארגונים קיימים",
  loadingOrganizationsMessage: "הארגונים נטענים...",
  noOrganizationsMessage: "לא רשומים ארגונים פעילים.",
  selectOrganizationLabel: "ארגון",
  editTitle: "עריכת ארגון",
  editDescription:
    "יש לבחור שפת תצוגה, לערוך את הפרופיל המותאם לשפה זו, ואם רוצים להגדיר אותו כפרופיל הציבורי המוגדר כברירת מחדל.",
  saveSlugButton: "שמירת מזהה ה-URL",
  slugWarningTitle: "לשנות את הקישור הציבורי?",
  slugWarningDescription:
    "שינוי מזהה ה-URL הזה עלול לשבור קישורים שכבר נפתחו או שותפו. יש להמשיך רק אם השינוי ודאי.",
  confirmSlugChangeButton: "שינוי מזהה ה-URL",
  languageLabel: "שפת תצוגה",
  defaultLanguageLabel: "שימוש בשפה זו לפרופיל הציבורי המוגדר כברירת מחדל",
  nameLabel: "שם",
  slugLabel: "מזהה URL",
  descriptionLabel: "תיאור",
  imagePathLabel: "נתיב תמונה",
  imagePathHint:
    "יש להשתמש בשם קובץ תמונה כמו avatar_default_0.png או בכתובת HTTPS מלאה.",
  websiteUrlLabel: "כתובת האתר",
  websiteUrlHint: "יש להשתמש בכתובת HTTPS מלאה, לדוגמה https://example.org.",
  websiteUrlError:
    "כתובת האתר חייבת להשתמש ב-HTTPS ואינה יכולה להכיל פרטי התחברות מוטמעים.",
  createButton: "יצירת ארגון",
  saveButton: "שמירת השינויים",
  deleteButton: "מחיקת הארגון",
  confirmDeleteButton: "אישור המחיקה",
  cancelButton: "ביטול",
  deleteConfirmMessage: "פעולה זו תמחק את הארגון.",
  addMemberTitle: "חברויות",
  membershipDescription: "יש להוסיף שם משתמש אחד לארגון שנבחר.",
  usernameLabel: "שם משתמש",
  addUserButton: "הוספת משתמש",
  removeUserButton: "הסרת משתמש",
  memberListTitle: "חברי הארגון",
  memberListDescription:
    "יש לאחזר את רשימת החברים הנוכחית ולאחר מכן להסיר משתמשים ישירות מהרשימה.",
  fetchMembersButton: "אחזור חברים",
  noMembersMessage: "לא נמצאו חברים בארגון זה.",
  localizationMissingHint:
    "עדיין לא נשמרה התאמה לשפה זו. הטופס מולא מראש מנתוני פרופיל ברירת המחדל כדי לאפשר תרגום מהיר.",
  defaultLanguageBadge: "ברירת מחדל",
  localizationReadyBadge: "נשמר",
  localizationMissingBadge: "חסר",
  dangerZoneTitle: "אזור מסוכן",
  changeSlugDangerTitle: "שינוי מזהה ה-URL של הארגון",
  changeSlugDangerDescription:
    "שינוי מזהה ה-URL הזה עלול לשבור קישורים ציבוריים שכבר נפתחו או שותפו.",
  deleteDangerTitle: "מחיקת הארגון הזה",
  deleteDangerDescription: "יש למחוק את הארגון הזה.",
};

const ja: AdministratorOrganizationTranslations = {
  administrator: "組織",
  createTab: "作成",
  manageTab: "管理",
  createTitle: "組織を作成",
  createDescription:
    "最初に組織のデフォルトプロフィールを作成してください。作成後、［管理］タブから翻訳を追加できます。",
  existingTitle: "既存の組織を管理",
  loadingOrganizationsMessage: "組織を読み込んでいます...",
  noOrganizationsMessage: "登録されている有効な組織はありません。",
  selectOrganizationLabel: "組織",
  editTitle: "組織を編集",
  editDescription:
    "表示言語を選択して、その言語のローカライズ済みプロフィールを編集し、必要に応じてデフォルトの公開プロフィールに設定します。",
  saveSlugButton: "スラッグを保存",
  slugWarningTitle: "公開リンクを変更しますか？",
  slugWarningDescription:
    "このスラッグを変更すると、すでにアクセスまたは共有されたリンクが機能しなくなる可能性があります。確実な場合にのみ続行してください。",
  confirmSlugChangeButton: "スラッグを変更",
  languageLabel: "表示言語",
  defaultLanguageLabel: "この言語をデフォルトの公開プロフィールに使用する",
  nameLabel: "名前",
  slugLabel: "URLスラッグ",
  descriptionLabel: "説明",
  imagePathLabel: "画像パス",
  imagePathHint:
    "avatar_default_0.png などの画像ファイル名、または完全な HTTPS URL を使用してください。",
  websiteUrlLabel: "ウェブサイトURL",
  websiteUrlHint:
    "完全な HTTPS URL を使用してください（例：https://example.org）。",
  websiteUrlError:
    "ウェブサイトURLには HTTPS を使用し、認証情報を埋め込まないでください。",
  createButton: "組織を作成",
  saveButton: "変更を保存",
  deleteButton: "組織を削除",
  confirmDeleteButton: "削除を確定",
  cancelButton: "キャンセル",
  deleteConfirmMessage: "この組織が削除されます。",
  addMemberTitle: "メンバーシップ",
  membershipDescription: "選択した組織にユーザー名を1件追加します。",
  usernameLabel: "ユーザー名",
  addUserButton: "ユーザーを追加",
  removeUserButton: "ユーザーを削除",
  memberListTitle: "組織のメンバー",
  memberListDescription:
    "現在のメンバー一覧を取得し、その一覧からユーザーを直接削除します。",
  fetchMembersButton: "メンバーを取得",
  noMembersMessage: "この組織のメンバーは見つかりませんでした。",
  localizationMissingHint:
    "この言語のローカライズはまだ保存されていません。すぐに翻訳できるよう、フォームにはデフォルトプロフィールの内容があらかじめ入力されています。",
  defaultLanguageBadge: "デフォルト",
  localizationReadyBadge: "保存済み",
  localizationMissingBadge: "未設定",
  dangerZoneTitle: "危険な操作",
  changeSlugDangerTitle: "組織のURLスラッグを変更",
  changeSlugDangerDescription:
    "このスラッグを変更すると、すでにアクセスまたは共有された公開リンクが機能しなくなる可能性があります。",
  deleteDangerTitle: "この組織を削除",
  deleteDangerDescription: "この組織を削除します。",
};

const ky: AdministratorOrganizationTranslations = {
  administrator: "Уюмдар",
  createTab: "Түзүү",
  manageTab: "Башкаруу",
  createTitle: "Уюм түзүү",
  createDescription:
    "Алгач уюмдун демейки профилин түзүңүз. Түзүлгөндөн кийин «Башкаруу» өтмөгүнөн котормолорду кошуңуз.",
  existingTitle: "Учурдагы уюмдарды башкаруу",
  loadingOrganizationsMessage: "Уюмдар жүктөлүүдө...",
  noOrganizationsMessage: "Активдүү уюмдар катталган эмес.",
  selectOrganizationLabel: "Уюм",
  editTitle: "Уюмду түзөтүү",
  editDescription:
    "Көрсөтүү тилин тандап, ошол тилдеги профилди түзөтүңүз жана кааласаңыз, аны жалпыга ачык демейки профиль кылыңыз.",
  saveSlugButton: "Слагды сактоо",
  slugWarningTitle: "Жалпыга ачык шилтемени өзгөртөсүзбү?",
  slugWarningDescription:
    "Бул слагды өзгөртүү мурда ачылган же бөлүшүлгөн шилтемелерди иштен чыгарышы мүмкүн. Ишенсеңиз гана улантыңыз.",
  confirmSlugChangeButton: "Слагды өзгөртүү",
  languageLabel: "Көрсөтүү тили",
  defaultLanguageLabel:
    "Бул тилди жалпыга ачык демейки профиль катары колдонуу",
  nameLabel: "Аталышы",
  slugLabel: "URL слагы",
  descriptionLabel: "Сүрөттөмө",
  imagePathLabel: "Сүрөттүн жолу",
  imagePathHint:
    "avatar_default_0.png сыяктуу сүрөт файлынын атын же толук HTTPS URL дарегин колдонуңуз.",
  websiteUrlLabel: "Вебсайттын URL дареги",
  websiteUrlHint:
    "Толук HTTPS URL дарегин колдонуңуз, мисалы: https://example.org.",
  websiteUrlError:
    "Вебсайттын URL дареги HTTPS колдонушу керек жана камтылган кирүү дайындарын камтыбашы керек.",
  createButton: "Уюм түзүү",
  saveButton: "Өзгөртүүлөрдү сактоо",
  deleteButton: "Уюмду өчүрүү",
  confirmDeleteButton: "Өчүрүүнү ырастоо",
  cancelButton: "Жокко чыгаруу",
  deleteConfirmMessage: "Бул аракет бул уюмду өчүрөт.",
  addMemberTitle: "Мүчөлүктөр",
  membershipDescription: "Тандалган уюмга бир колдонуучунун атын кошуңуз.",
  usernameLabel: "Колдонуучунун аты",
  addUserButton: "Колдонуучуну кошуу",
  removeUserButton: "Колдонуучуну алып салуу",
  memberListTitle: "Уюмдун мүчөлөрү",
  memberListDescription:
    "Учурдагы мүчөлөрдүн тизмесин алып, андан соң колдонуучуларды тизмеден түз алып салыңыз.",
  fetchMembersButton: "Мүчөлөрдү алуу",
  noMembersMessage: "Бул уюмда мүчөлөр табылган жок.",
  localizationMissingHint:
    "Бул тил үчүн сакталган локалдаштыруу азырынча жок. Тез которушуңуз үчүн форма демейки профилдеги маалыматтар менен алдын ала толтурулду.",
  defaultLanguageBadge: "Демейки",
  localizationReadyBadge: "Сакталган",
  localizationMissingBadge: "Жок",
  dangerZoneTitle: "Кооптуу аймак",
  changeSlugDangerTitle: "Уюмдун URL слагын өзгөртүү",
  changeSlugDangerDescription:
    "Бул слагды өзгөртүү мурда ачылган же бөлүшүлгөн жалпыга ачык шилтемелерди иштен чыгарышы мүмкүн.",
  deleteDangerTitle: "Бул уюмду өчүрүү",
  deleteDangerDescription: "Бул уюмду өчүрүү.",
};

const ru: AdministratorOrganizationTranslations = {
  administrator: "Организации",
  createTab: "Создать",
  manageTab: "Управление",
  createTitle: "Создать организацию",
  createDescription:
    "Сначала создайте профиль организации по умолчанию. После создания добавьте переводы на вкладке «Управление».",
  existingTitle: "Управление существующими организациями",
  loadingOrganizationsMessage: "Загрузка организаций...",
  noOrganizationsMessage: "Активные организации не зарегистрированы.",
  selectOrganizationLabel: "Организация",
  editTitle: "Редактировать организацию",
  editDescription:
    "Выберите язык отображения, отредактируйте локализованный профиль и при необходимости сделайте его общедоступным профилем по умолчанию.",
  saveSlugButton: "Сохранить слаг",
  slugWarningTitle: "Изменить общедоступную ссылку?",
  slugWarningDescription:
    "Изменение этого слага может нарушить работу ссылок, по которым уже переходили или которыми делились. Продолжайте, только если вы уверены.",
  confirmSlugChangeButton: "Изменить слаг",
  languageLabel: "Язык отображения",
  defaultLanguageLabel:
    "Использовать этот язык для общедоступного профиля по умолчанию",
  nameLabel: "Название",
  slugLabel: "URL-слаг",
  descriptionLabel: "Описание",
  imagePathLabel: "Путь к изображению",
  imagePathHint:
    "Укажите имя файла изображения, например avatar_default_0.png, или полный URL-адрес HTTPS.",
  websiteUrlLabel: "URL-адрес сайта",
  websiteUrlHint:
    "Используйте полный URL-адрес HTTPS, например https://example.org.",
  websiteUrlError:
    "URL-адрес сайта должен использовать HTTPS и не может содержать встроенные учетные данные.",
  createButton: "Создать организацию",
  saveButton: "Сохранить изменения",
  deleteButton: "Удалить организацию",
  confirmDeleteButton: "Подтвердить удаление",
  cancelButton: "Отмена",
  deleteConfirmMessage: "Организация будет удалена.",
  addMemberTitle: "Членство",
  membershipDescription:
    "Добавьте одно имя пользователя в выбранную организацию.",
  usernameLabel: "Имя пользователя",
  addUserButton: "Добавить пользователя",
  removeUserButton: "Удалить пользователя",
  memberListTitle: "Участники организации",
  memberListDescription:
    "Получите текущий список участников, а затем удаляйте пользователей непосредственно из списка.",
  fetchMembersButton: "Получить список участников",
  noMembersMessage: "В этой организации нет участников.",
  localizationMissingHint:
    "Для этого языка еще не сохранена локализация. Форма предварительно заполнена данными профиля по умолчанию, чтобы вы могли быстро их перевести.",
  defaultLanguageBadge: "По умолчанию",
  localizationReadyBadge: "Сохранено",
  localizationMissingBadge: "Отсутствует",
  dangerZoneTitle: "Опасная зона",
  changeSlugDangerTitle: "Изменить URL-слаг организации",
  changeSlugDangerDescription:
    "Изменение этого слага может нарушить работу общедоступных ссылок, по которым уже переходили или которыми делились.",
  deleteDangerTitle: "Удалить эту организацию",
  deleteDangerDescription: "Удалить эту организацию.",
};

const zhHans: AdministratorOrganizationTranslations = {
  administrator: "组织",
  createTab: "创建",
  manageTab: "管理",
  createTitle: "创建组织",
  createDescription:
    "请先创建组织的默认资料。创建后，可在“管理”选项卡中添加翻译。",
  existingTitle: "管理现有组织",
  loadingOrganizationsMessage: "正在加载组织...",
  noOrganizationsMessage: "尚未注册任何活跃组织。",
  selectOrganizationLabel: "组织",
  editTitle: "编辑组织",
  editDescription:
    "选择显示语言，编辑该语言的本地化资料，并可选择将其设为默认公开资料。",
  saveSlugButton: "保存 URL 标识符",
  slugWarningTitle: "要更改公开链接吗？",
  slugWarningDescription:
    "更改此 URL 标识符可能会导致已访问或已分享的链接失效。请确认无误后再继续。",
  confirmSlugChangeButton: "更改 URL 标识符",
  languageLabel: "显示语言",
  defaultLanguageLabel: "将此语言用于默认公开资料",
  nameLabel: "名称",
  slugLabel: "URL 标识符",
  descriptionLabel: "描述",
  imagePathLabel: "图片路径",
  imagePathHint:
    "请使用图片文件名（如 avatar_default_0.png）或完整的 HTTPS URL。",
  websiteUrlLabel: "网站 URL",
  websiteUrlHint: "请使用完整的 HTTPS URL，例如 https://example.org。",
  websiteUrlError: "网站 URL 必须使用 HTTPS，且不能包含嵌入的凭据。",
  createButton: "创建组织",
  saveButton: "保存更改",
  deleteButton: "删除组织",
  confirmDeleteButton: "确认删除",
  cancelButton: "取消",
  deleteConfirmMessage: "此操作将删除该组织。",
  addMemberTitle: "成员关系",
  membershipDescription: "向所选组织添加一个用户名。",
  usernameLabel: "用户名",
  addUserButton: "添加用户",
  removeUserButton: "移除用户",
  memberListTitle: "组织成员",
  memberListDescription: "获取当前成员列表，然后直接从列表中移除用户。",
  fetchMembersButton: "获取成员",
  noMembersMessage: "未找到该组织的成员。",
  localizationMissingHint:
    "此语言尚无已保存的本地化内容。表单已根据默认资料预先填充，方便你快速翻译。",
  defaultLanguageBadge: "默认",
  localizationReadyBadge: "已保存",
  localizationMissingBadge: "缺失",
  dangerZoneTitle: "危险区域",
  changeSlugDangerTitle: "更改组织的 URL 标识符",
  changeSlugDangerDescription:
    "更改此 URL 标识符可能会导致已访问或已分享的公开链接失效。",
  deleteDangerTitle: "删除此组织",
  deleteDangerDescription: "删除此组织。",
};

const zhHant: AdministratorOrganizationTranslations = {
  administrator: "組織",
  createTab: "建立",
  manageTab: "管理",
  createTitle: "建立組織",
  createDescription:
    "請先建立組織的預設資料。建立後，可從「管理」分頁新增翻譯。",
  existingTitle: "管理現有組織",
  loadingOrganizationsMessage: "正在載入組織...",
  noOrganizationsMessage: "尚未註冊任何有效的組織。",
  selectOrganizationLabel: "組織",
  editTitle: "編輯組織",
  editDescription:
    "選擇顯示語言、編輯該語言的本地化資料，並可選擇將其設為預設公開資料。",
  saveSlugButton: "儲存 URL 識別字",
  slugWarningTitle: "要變更公開連結嗎？",
  slugWarningDescription:
    "變更此 URL 識別字可能會使已造訪或分享的連結失效。請確認無誤後再繼續。",
  confirmSlugChangeButton: "變更 URL 識別字",
  languageLabel: "顯示語言",
  defaultLanguageLabel: "將此語言用於預設公開資料",
  nameLabel: "名稱",
  slugLabel: "URL 識別字",
  descriptionLabel: "說明",
  imagePathLabel: "圖片路徑",
  imagePathHint:
    "請使用圖片檔名（例如 avatar_default_0.png）或完整的 HTTPS URL。",
  websiteUrlLabel: "網站 URL",
  websiteUrlHint: "請使用完整的 HTTPS URL，例如 https://example.org。",
  websiteUrlError: "網站 URL 必須使用 HTTPS，且不可包含內嵌的憑證。",
  createButton: "建立組織",
  saveButton: "儲存變更",
  deleteButton: "刪除組織",
  confirmDeleteButton: "確認刪除",
  cancelButton: "取消",
  deleteConfirmMessage: "此操作將刪除這個組織。",
  addMemberTitle: "成員資格",
  membershipDescription: "將一個使用者名稱新增至所選組織。",
  usernameLabel: "使用者名稱",
  addUserButton: "新增使用者",
  removeUserButton: "移除使用者",
  memberListTitle: "組織成員",
  memberListDescription: "擷取目前的成員清單，然後直接從清單中移除使用者。",
  fetchMembersButton: "擷取成員",
  noMembersMessage: "找不到這個組織的成員。",
  localizationMissingHint:
    "此語言尚無已儲存的本地化內容。表單已根據預設資料預先填入，方便你快速翻譯。",
  defaultLanguageBadge: "預設",
  localizationReadyBadge: "已儲存",
  localizationMissingBadge: "缺少",
  dangerZoneTitle: "危險區域",
  changeSlugDangerTitle: "變更組織的 URL 識別字",
  changeSlugDangerDescription:
    "變更此 URL 識別字可能會使已造訪或分享的公開連結失效。",
  deleteDangerTitle: "刪除這個組織",
  deleteDangerDescription: "刪除這個組織。",
};

export const administratorOrganizationTranslations: Record<
  SupportedDisplayLanguageCodes,
  AdministratorOrganizationTranslations
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
