import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AdministratorProjectTranslations {
  administrator: string;
  pageTitle: string;
  createTab: string;
  manageTab: string;
  basicsTitle: string;
  basicsDescription: string;
  projectTitleLabel: string;
  projectSlugLabel: string;
  projectDefaultLanguageLabel: string;
  ownerOrganizationsLabel: string;
  subtitleLabel: string;
  bodyLabel: string;
  bannerPathLabel: string;
  bannerIsFullPathLabel: string;
  contentLocalizationsTitle: string;
  contentLocalizationsDescription: string;
  localizationLanguageLabel: string;
  addLocalizationButton: string;
  updateLocalizationButton: string;
  editLocalizationButton: string;
  noLocalizationLanguagesMessage: string;
  machineTranslationPreviewTitle: string;
  machineTranslationPreviewDescription: string;
  useMachineTranslationButton: string;
  machineTranslationIncomplete: string;
  attributionsTitle: string;
  attributionRoleLabel: string;
  attributionSourceLabel: string;
  attributionsDescription: string;
  realOrganizationLabel: string;
  externalLanguageLabel: string;
  externalLanguageHint: string;
  externalNameLabel: string;
  externalDescriptionLabel: string;
  externalWebsiteLabel: string;
  externalImagePathLabel: string;
  externalImageIsFullPathLabel: string;
  additionalLanguagesTitle: string;
  addLanguageButton: string;
  addAttributionButton: string;
  updateAttributionButton: string;
  editAttributionButton: string;
  noAttributions: string;
  removeButton: string;
  projectOwnerRole: string;
  sponsorRole: string;
  partnerRole: string;
  realOrganizationSource: string;
  externalOrganizationSource: string;
  contactTitle: string;
  contactDescription: string;
  contactFirstNameLabel: string;
  contactLastNameLabel: string;
  contactRoleLabel: string;
  contactEmailLabel: string;
  contactWebsiteLabel: string;
  contactImagePathLabel: string;
  contactImageIsFullPathLabel: string;
  contactOrganizationLabel: string;
  websiteUrlHint: string;
  websiteUrlError: string;
  createButton: string;
  manageTitle: string;
  manageDescription: string;
  selectProjectLabel: string;
  projectLinkLabel: string;
  copyProjectLinkLabel: string;
  copyProjectLinkFailed: string;
  noProjectsMessage: string;
  projectLanguageSettingsLabel: string;
  projectLanguageSettingsDescription: string;
  projectLanguageEntitlementLoadingDescription: string;
  projectLanguageEntitlementRequiredDescription: string;
  autoLanguageLabel: string;
  dynamicTranslationEnabledLabel: string;
  dynamicTranslationDisabledLabel: string;
  saveLanguageSettingsButton: string;
  saveButton: string;
  saveProjectButton: string;
  saveSlugButton: string;
  slugWarningTitle: string;
  slugWarningDescription: string;
  confirmSlugChangeButton: string;
  deleteProjectButton: string;
  deleteProjectTitle: string;
  deleteProjectDescription: string;
  confirmDeleteProjectButton: string;
  cancelButton: string;
  requiredSuffix: string;
  optionalSuffix: string;
  dangerZoneTitle: string;
  changeSlugDangerTitle: string;
  changeSlugDangerDescription: string;
  deleteDangerTitle: string;
  deleteDangerDescription: string;
}

const en: AdministratorProjectTranslations = {
  administrator: "Administrator",
  pageTitle: "Create project",
  createTab: "Create",
  manageTab: "Manage",
  basicsTitle: "Project basics",
  basicsDescription:
    "Required fields define the public project identity. Optional fields can be edited or localized later.",
  projectTitleLabel: "Project title",
  projectSlugLabel: "Project slug",
  projectDefaultLanguageLabel: "Default language",
  ownerOrganizationsLabel: "Owner organizations",
  subtitleLabel: "Subtitle",
  bodyLabel: "Body",
  bannerPathLabel: "Project banner path",
  bannerIsFullPathLabel: "Project banner path is a full URL",
  contentLocalizationsTitle: "Localized project content",
  contentLocalizationsDescription:
    "Add manual title, body, and optional banner overrides for the additional project languages configured above.",
  localizationLanguageLabel: "Language",
  addLocalizationButton: "Add localized content",
  updateLocalizationButton: "Update localized content",
  editLocalizationButton: "Edit",
  noLocalizationLanguagesMessage:
    "Choose additional project languages before adding localized content.",
  machineTranslationPreviewTitle: "Machine translation available",
  machineTranslationPreviewDescription:
    "Use this as a manual draft if it is good enough or needs small edits. Saving the project will approve it as manual content.",
  useMachineTranslationButton: "Use as manual draft",
  machineTranslationIncomplete: "Incomplete translation",
  attributionsTitle: "Public organization attributions",
  attributionRoleLabel: "Role",
  attributionSourceLabel: "Source",
  attributionsDescription:
    "These public attributions are added to the project draft and saved only when you create the project. Selecting an owner organization adds a removable project-owner attribution draft, but removing that attribution keeps the organization as an owner.",
  realOrganizationLabel: "Existing organization",
  externalLanguageLabel: "External organization language",
  externalLanguageHint:
    "Choose the language used for this organization name and description.",
  externalNameLabel: "External organization name",
  externalDescriptionLabel: "External organization description",
  externalWebsiteLabel: "External organization website",
  externalImagePathLabel: "External organization image path",
  externalImageIsFullPathLabel: "External image path is a full URL",
  additionalLanguagesTitle: "Additional languages",
  addLanguageButton: "Add language",
  addAttributionButton: "Add attribution to draft",
  updateAttributionButton: "Update attribution",
  editAttributionButton: "Edit",
  noAttributions:
    "No draft public attributions yet. Selecting an owner organization will add a removable project-owner attribution draft.",
  removeButton: "Remove",
  projectOwnerRole: "Project owner",
  sponsorRole: "Sponsor",
  partnerRole: "Partner",
  realOrganizationSource: "Existing Agora organization",
  externalOrganizationSource: "External organization",
  contactTitle: "Participant contact",
  contactDescription:
    "Optional. If you add contact details, a contact name and either an email address or HTTPS contact page are required.",
  contactFirstNameLabel: "Contact first name",
  contactLastNameLabel: "Contact last name",
  contactRoleLabel: "Contact role label",
  contactEmailLabel: "Contact email",
  contactWebsiteLabel: "Contact page URL",
  contactImagePathLabel: "Contact image path",
  contactImageIsFullPathLabel: "Contact image path is a full URL",
  contactOrganizationLabel: "Contact organization affiliation",
  websiteUrlHint: "Use a full HTTPS URL, for example https://example.org.",
  websiteUrlError:
    "Website URL must use HTTPS and cannot contain embedded credentials.",
  createButton: "Create project",
  manageTitle: "Manage projects",
  manageDescription:
    "Edit project slug and project-level language settings. Each section saves separately.",
  selectProjectLabel: "Project",
  projectLinkLabel: "Project link",
  copyProjectLinkLabel: "Copy project link",
  copyProjectLinkFailed: "Failed to copy project link",
  noProjectsMessage: "No projects to manage yet. Create a project first.",
  projectLanguageSettingsLabel: "Project languages",
  projectLanguageSettingsDescription:
    "Configure dynamic translation and additional target languages.",
  projectLanguageEntitlementLoadingDescription:
    "Checking owner organization dynamic translation access...",
  projectLanguageEntitlementRequiredDescription:
    "Select at least one owner organization with dynamic translation entitlement to configure project languages.",
  autoLanguageLabel: "Auto",
  dynamicTranslationEnabledLabel: "Dynamic translation on",
  dynamicTranslationDisabledLabel: "Dynamic translation off",
  saveLanguageSettingsButton: "Save language settings",
  saveButton: "Save changes",
  saveProjectButton: "Save project",
  saveSlugButton: "Save slug",
  slugWarningTitle: "Change public link?",
  slugWarningDescription:
    "Changing this slug can break links that were already visited or shared. Only continue if you are sure.",
  confirmSlugChangeButton: "Change slug",
  deleteProjectButton: "Delete project",
  deleteProjectTitle: "Delete project?",
  deleteProjectDescription: "This will delete this project.",
  confirmDeleteProjectButton: "Confirm delete",
  cancelButton: "Cancel",
  requiredSuffix: "required",
  optionalSuffix: "optional",
  dangerZoneTitle: "Danger zone",
  changeSlugDangerTitle: "Change project slug",
  changeSlugDangerDescription:
    "Changing this slug can break public links that were already visited or shared.",
  deleteDangerTitle: "Delete this project",
  deleteDangerDescription: "Delete this project.",
};

const ar: AdministratorProjectTranslations = {
  administrator: "المسؤول",
  pageTitle: "إنشاء مشروع",
  createTab: "إنشاء",
  manageTab: "إدارة",
  basicsTitle: "أساسيات المشروع",
  basicsDescription:
    "تحدد الحقول المطلوبة الهوية العامة للمشروع. ويمكن تعديل الحقول الاختيارية أو توطينها لاحقًا.",
  projectTitleLabel: "عنوان المشروع",
  projectSlugLabel: "المعرّف النصي للمشروع",
  projectDefaultLanguageLabel: "اللغة الافتراضية",
  ownerOrganizationsLabel: "المنظمات المالكة",
  subtitleLabel: "العنوان الفرعي",
  bodyLabel: "المحتوى",
  bannerPathLabel: "مسار لافتة المشروع",
  bannerIsFullPathLabel: "مسار لافتة المشروع هو عنوان URL كامل",
  contentLocalizationsTitle: "محتوى المشروع الموطّن",
  contentLocalizationsDescription:
    "أضف تجاوزات يدوية للعنوان والمحتوى واللافتة الاختيارية للغات المشروع الإضافية التي تم إعدادها أعلاه.",
  localizationLanguageLabel: "اللغة",
  addLocalizationButton: "إضافة محتوى موطّن",
  updateLocalizationButton: "تحديث المحتوى الموطّن",
  editLocalizationButton: "تعديل",
  noLocalizationLanguagesMessage:
    "اختر لغات إضافية للمشروع قبل إضافة محتوى موطّن.",
  machineTranslationPreviewTitle: "تتوفر ترجمة آلية",
  machineTranslationPreviewDescription:
    "استخدم هذه الترجمة كمسودة يدوية إذا كانت جيدة بما يكفي أو تحتاج إلى تعديلات بسيطة. سيؤدي حفظ المشروع إلى اعتمادها كمحتوى يدوي.",
  useMachineTranslationButton: "استخدام كمسودة يدوية",
  machineTranslationIncomplete: "ترجمة غير مكتملة",
  attributionsTitle: "بيانات النسب العامة للمنظمات",
  attributionRoleLabel: "الدور",
  attributionSourceLabel: "المصدر",
  attributionsDescription:
    "تُضاف بيانات النسب العامة هذه إلى مسودة المشروع ولا تُحفظ إلا عند إنشاء المشروع. يؤدي اختيار منظمة مالكة إلى إضافة مسودة قابلة للإزالة لنسب مالك المشروع، لكن إزالة هذا النسب تُبقي المنظمة مالكة للمشروع.",
  realOrganizationLabel: "منظمة موجودة",
  externalLanguageLabel: "لغة المنظمة الخارجية",
  externalLanguageHint: "اختر اللغة المستخدمة لاسم هذه المنظمة ووصفها.",
  externalNameLabel: "اسم المنظمة الخارجية",
  externalDescriptionLabel: "وصف المنظمة الخارجية",
  externalWebsiteLabel: "الموقع الإلكتروني للمنظمة الخارجية",
  externalImagePathLabel: "مسار صورة المنظمة الخارجية",
  externalImageIsFullPathLabel: "مسار الصورة الخارجية هو عنوان URL كامل",
  additionalLanguagesTitle: "اللغات الإضافية",
  addLanguageButton: "إضافة لغة",
  addAttributionButton: "إضافة النسب إلى المسودة",
  updateAttributionButton: "تحديث النسب",
  editAttributionButton: "تعديل",
  noAttributions:
    "لا توجد بيانات نسب عامة في المسودة حتى الآن. سيؤدي اختيار منظمة مالكة إلى إضافة مسودة قابلة للإزالة لنسب مالك المشروع.",
  removeButton: "إزالة",
  projectOwnerRole: "مالك المشروع",
  sponsorRole: "الراعي",
  partnerRole: "الشريك",
  realOrganizationSource: "منظمة موجودة في Agora",
  externalOrganizationSource: "منظمة خارجية",
  contactTitle: "جهة اتصال المشاركين",
  contactDescription:
    "اختياري. إذا أضفت تفاصيل اتصال، فيلزم إدخال اسم جهة الاتصال وإما عنوان بريد إلكتروني أو صفحة اتصال تستخدم HTTPS.",
  contactFirstNameLabel: "الاسم الأول لجهة الاتصال",
  contactLastNameLabel: "اسم العائلة لجهة الاتصال",
  contactRoleLabel: "مسمى دور جهة الاتصال",
  contactEmailLabel: "البريد الإلكتروني لجهة الاتصال",
  contactWebsiteLabel: "عنوان URL لصفحة الاتصال",
  contactImagePathLabel: "مسار صورة جهة الاتصال",
  contactImageIsFullPathLabel: "مسار صورة جهة الاتصال هو عنوان URL كامل",
  contactOrganizationLabel: "انتساب جهة الاتصال إلى المنظمة",
  websiteUrlHint:
    "استخدم عنوان URL كاملاً يستخدم HTTPS، على سبيل المثال https://example.org.",
  websiteUrlError:
    "يجب أن يستخدم عنوان URL للموقع الإلكتروني HTTPS وألا يحتوي على بيانات اعتماد مضمنة.",
  createButton: "إنشاء مشروع",
  manageTitle: "إدارة المشاريع",
  manageDescription:
    "عدّل المعرّف النصي للمشروع وإعدادات اللغة على مستوى المشروع. يُحفظ كل قسم على حدة.",
  selectProjectLabel: "المشروع",
  projectLinkLabel: "رابط المشروع",
  copyProjectLinkLabel: "نسخ رابط المشروع",
  copyProjectLinkFailed: "تعذر نسخ رابط المشروع",
  noProjectsMessage: "لا توجد مشاريع لإدارتها بعد. أنشئ مشروعًا أولاً.",
  projectLanguageSettingsLabel: "لغات المشروع",
  projectLanguageSettingsDescription:
    "اضبط الترجمة الديناميكية واللغات المستهدفة الإضافية.",
  projectLanguageEntitlementLoadingDescription:
    "جارٍ التحقق من صلاحية وصول المنظمة المالكة إلى الترجمة الديناميكية...",
  projectLanguageEntitlementRequiredDescription:
    "اختر منظمة مالكة واحدة على الأقل لديها صلاحية الترجمة الديناميكية لإعداد لغات المشروع.",
  autoLanguageLabel: "تلقائي",
  dynamicTranslationEnabledLabel: "الترجمة الديناميكية مفعّلة",
  dynamicTranslationDisabledLabel: "الترجمة الديناميكية متوقفة",
  saveLanguageSettingsButton: "حفظ إعدادات اللغة",
  saveButton: "حفظ التغييرات",
  saveProjectButton: "حفظ المشروع",
  saveSlugButton: "حفظ المعرّف النصي",
  slugWarningTitle: "هل تريد تغيير الرابط العام؟",
  slugWarningDescription:
    "قد يؤدي تغيير هذا المعرّف النصي إلى تعطيل الروابط التي تمت زيارتها أو مشاركتها بالفعل. لا تتابع إلا إذا كنت متأكدًا.",
  confirmSlugChangeButton: "تغيير المعرّف النصي",
  deleteProjectButton: "حذف المشروع",
  deleteProjectTitle: "هل تريد حذف المشروع؟",
  deleteProjectDescription: "سيؤدي هذا إلى حذف هذا المشروع.",
  confirmDeleteProjectButton: "تأكيد الحذف",
  cancelButton: "إلغاء",
  requiredSuffix: "مطلوب",
  optionalSuffix: "اختياري",
  dangerZoneTitle: "منطقة الخطر",
  changeSlugDangerTitle: "تغيير المعرّف النصي للمشروع",
  changeSlugDangerDescription:
    "قد يؤدي تغيير هذا المعرّف النصي إلى تعطيل الروابط العامة التي تمت زيارتها أو مشاركتها بالفعل.",
  deleteDangerTitle: "حذف هذا المشروع",
  deleteDangerDescription: "احذف هذا المشروع.",
};

const es: AdministratorProjectTranslations = {
  administrator: "Administrador",
  pageTitle: "Crear proyecto",
  createTab: "Crear",
  manageTab: "Gestionar",
  basicsTitle: "Datos básicos del proyecto",
  basicsDescription:
    "Los campos obligatorios definen la identidad pública del proyecto. Los campos opcionales se pueden editar o localizar más adelante.",
  projectTitleLabel: "Título del proyecto",
  projectSlugLabel: "Slug del proyecto",
  projectDefaultLanguageLabel: "Idioma predeterminado",
  ownerOrganizationsLabel: "Organizaciones propietarias",
  subtitleLabel: "Subtítulo",
  bodyLabel: "Contenido",
  bannerPathLabel: "Ruta del banner del proyecto",
  bannerIsFullPathLabel: "La ruta del banner del proyecto es una URL completa",
  contentLocalizationsTitle: "Contenido localizado del proyecto",
  contentLocalizationsDescription:
    "Añada versiones manuales del título, el contenido y, opcionalmente, el banner para los idiomas adicionales del proyecto configurados arriba.",
  localizationLanguageLabel: "Idioma",
  addLocalizationButton: "Añadir contenido localizado",
  updateLocalizationButton: "Actualizar contenido localizado",
  editLocalizationButton: "Editar",
  noLocalizationLanguagesMessage:
    "Elija idiomas adicionales para el proyecto antes de añadir contenido localizado.",
  machineTranslationPreviewTitle: "Traducción automática disponible",
  machineTranslationPreviewDescription:
    "Úsela como borrador manual si tiene suficiente calidad o solo necesita pequeños ajustes. Al guardar el proyecto, se aprobará como contenido manual.",
  useMachineTranslationButton: "Usar como borrador manual",
  machineTranslationIncomplete: "Traducción incompleta",
  attributionsTitle: "Atribuciones públicas de organizaciones",
  attributionRoleLabel: "Rol",
  attributionSourceLabel: "Fuente",
  attributionsDescription:
    "Estas atribuciones públicas se añaden al borrador del proyecto y solo se guardan al crear el proyecto. Al seleccionar una organización propietaria, se añade un borrador eliminable de atribución como propietaria del proyecto, pero eliminar esa atribución no impide que la organización siga siendo propietaria.",
  realOrganizationLabel: "Organización existente",
  externalLanguageLabel: "Idioma de la organización externa",
  externalLanguageHint:
    "Elija el idioma utilizado para el nombre y la descripción de esta organización.",
  externalNameLabel: "Nombre de la organización externa",
  externalDescriptionLabel: "Descripción de la organización externa",
  externalWebsiteLabel: "Sitio web de la organización externa",
  externalImagePathLabel: "Ruta de la imagen de la organización externa",
  externalImageIsFullPathLabel:
    "La ruta de la imagen externa es una URL completa",
  additionalLanguagesTitle: "Idiomas adicionales",
  addLanguageButton: "Añadir idioma",
  addAttributionButton: "Añadir atribución al borrador",
  updateAttributionButton: "Actualizar atribución",
  editAttributionButton: "Editar",
  noAttributions:
    "Aún no hay atribuciones públicas en el borrador. Al seleccionar una organización propietaria, se añadirá un borrador eliminable de atribución como propietaria del proyecto.",
  removeButton: "Eliminar",
  projectOwnerRole: "Propietario del proyecto",
  sponsorRole: "Patrocinador",
  partnerRole: "Socio",
  realOrganizationSource: "Organización existente en Agora",
  externalOrganizationSource: "Organización externa",
  contactTitle: "Contacto para participantes",
  contactDescription:
    "Opcional. Si añade datos de contacto, se requiere un nombre de contacto y una dirección de correo electrónico o una página de contacto HTTPS.",
  contactFirstNameLabel: "Nombre del contacto",
  contactLastNameLabel: "Apellidos del contacto",
  contactRoleLabel: "Nombre del rol del contacto",
  contactEmailLabel: "Correo electrónico del contacto",
  contactWebsiteLabel: "URL de la página de contacto",
  contactImagePathLabel: "Ruta de la imagen del contacto",
  contactImageIsFullPathLabel:
    "La ruta de la imagen del contacto es una URL completa",
  contactOrganizationLabel: "Afiliación organizativa del contacto",
  websiteUrlHint:
    "Use una URL HTTPS completa, por ejemplo, https://example.org.",
  websiteUrlError:
    "La URL del sitio web debe usar HTTPS y no puede contener credenciales incorporadas.",
  createButton: "Crear proyecto",
  manageTitle: "Gestionar proyectos",
  manageDescription:
    "Edite el slug del proyecto y la configuración de idioma a nivel del proyecto. Cada sección se guarda por separado.",
  selectProjectLabel: "Proyecto",
  projectLinkLabel: "Enlace del proyecto",
  copyProjectLinkLabel: "Copiar enlace del proyecto",
  copyProjectLinkFailed: "No se pudo copiar el enlace del proyecto",
  noProjectsMessage:
    "Todavía no hay proyectos que gestionar. Primero cree un proyecto.",
  projectLanguageSettingsLabel: "Idiomas del proyecto",
  projectLanguageSettingsDescription:
    "Configure la traducción dinámica y los idiomas de destino adicionales.",
  projectLanguageEntitlementLoadingDescription:
    "Comprobando el acceso de la organización propietaria a la traducción dinámica...",
  projectLanguageEntitlementRequiredDescription:
    "Seleccione al menos una organización propietaria con derecho a traducción dinámica para configurar los idiomas del proyecto.",
  autoLanguageLabel: "Automático",
  dynamicTranslationEnabledLabel: "Traducción dinámica activada",
  dynamicTranslationDisabledLabel: "Traducción dinámica desactivada",
  saveLanguageSettingsButton: "Guardar configuración de idioma",
  saveButton: "Guardar cambios",
  saveProjectButton: "Guardar proyecto",
  saveSlugButton: "Guardar slug",
  slugWarningTitle: "¿Cambiar el enlace público?",
  slugWarningDescription:
    "Cambiar este slug puede romper enlaces que ya se hayan visitado o compartido. Continúe solo si está seguro.",
  confirmSlugChangeButton: "Cambiar slug",
  deleteProjectButton: "Eliminar proyecto",
  deleteProjectTitle: "¿Eliminar proyecto?",
  deleteProjectDescription: "Esto eliminará este proyecto.",
  confirmDeleteProjectButton: "Confirmar eliminación",
  cancelButton: "Cancelar",
  requiredSuffix: "obligatorio",
  optionalSuffix: "opcional",
  dangerZoneTitle: "Zona de peligro",
  changeSlugDangerTitle: "Cambiar el slug del proyecto",
  changeSlugDangerDescription:
    "Cambiar este slug puede romper enlaces públicos que ya se hayan visitado o compartido.",
  deleteDangerTitle: "Eliminar este proyecto",
  deleteDangerDescription: "Elimine este proyecto.",
};

const fa: AdministratorProjectTranslations = {
  administrator: "مدیر",
  pageTitle: "ایجاد پروژه",
  createTab: "ایجاد",
  manageTab: "مدیریت",
  basicsTitle: "اطلاعات پایه پروژه",
  basicsDescription:
    "فیلدهای الزامی هویت عمومی پروژه را مشخص می‌کنند. فیلدهای اختیاری را می‌توان بعداً ویرایش یا بومی‌سازی کرد.",
  projectTitleLabel: "عنوان پروژه",
  projectSlugLabel: "نامک پروژه",
  projectDefaultLanguageLabel: "زبان پیش‌فرض",
  ownerOrganizationsLabel: "سازمان‌های مالک",
  subtitleLabel: "عنوان فرعی",
  bodyLabel: "متن",
  bannerPathLabel: "مسیر بنر پروژه",
  bannerIsFullPathLabel: "مسیر بنر پروژه یک URL کامل است",
  contentLocalizationsTitle: "محتوای بومی‌سازی‌شده پروژه",
  contentLocalizationsDescription:
    "برای زبان‌های اضافی پروژه که در بالا پیکربندی شده‌اند، عنوان و متن دستی و در صورت تمایل بنر جایگزین اضافه کنید.",
  localizationLanguageLabel: "زبان",
  addLocalizationButton: "افزودن محتوای بومی‌سازی‌شده",
  updateLocalizationButton: "به‌روزرسانی محتوای بومی‌سازی‌شده",
  editLocalizationButton: "ویرایش",
  noLocalizationLanguagesMessage:
    "پیش از افزودن محتوای بومی‌سازی‌شده، زبان‌های اضافی پروژه را انتخاب کنید.",
  machineTranslationPreviewTitle: "ترجمه ماشینی در دسترس است",
  machineTranslationPreviewDescription:
    "اگر کیفیت آن مناسب است یا فقط به ویرایش‌های جزئی نیاز دارد، از آن به‌عنوان پیش‌نویس دستی استفاده کنید. با ذخیره پروژه، این ترجمه به‌عنوان محتوای دستی تأیید می‌شود.",
  useMachineTranslationButton: "استفاده به‌عنوان پیش‌نویس دستی",
  machineTranslationIncomplete: "ترجمه ناقص",
  attributionsTitle: "انتساب‌های عمومی سازمان‌ها",
  attributionRoleLabel: "نقش",
  attributionSourceLabel: "منبع",
  attributionsDescription:
    "این انتساب‌های عمومی به پیش‌نویس پروژه افزوده می‌شوند و فقط هنگام ایجاد پروژه ذخیره خواهند شد. انتخاب یک سازمان مالک، پیش‌نویس انتساب قابل‌حذفِ مالک پروژه را اضافه می‌کند، اما حذف آن انتساب، سازمان را همچنان به‌عنوان مالک نگه می‌دارد.",
  realOrganizationLabel: "سازمان موجود",
  externalLanguageLabel: "زبان سازمان خارجی",
  externalLanguageHint:
    "زبانی را انتخاب کنید که نام و توضیحات این سازمان با آن نوشته شده است.",
  externalNameLabel: "نام سازمان خارجی",
  externalDescriptionLabel: "توضیحات سازمان خارجی",
  externalWebsiteLabel: "وب‌سایت سازمان خارجی",
  externalImagePathLabel: "مسیر تصویر سازمان خارجی",
  externalImageIsFullPathLabel: "مسیر تصویر خارجی یک URL کامل است",
  additionalLanguagesTitle: "زبان‌های اضافی",
  addLanguageButton: "افزودن زبان",
  addAttributionButton: "افزودن انتساب به پیش‌نویس",
  updateAttributionButton: "به‌روزرسانی انتساب",
  editAttributionButton: "ویرایش",
  noAttributions:
    "هنوز هیچ انتساب عمومی در پیش‌نویس وجود ندارد. انتخاب یک سازمان مالک، پیش‌نویس انتساب قابل‌حذفِ مالک پروژه را اضافه می‌کند.",
  removeButton: "حذف",
  projectOwnerRole: "مالک پروژه",
  sponsorRole: "حامی مالی",
  partnerRole: "شریک",
  realOrganizationSource: "سازمان موجود در Agora",
  externalOrganizationSource: "سازمان خارجی",
  contactTitle: "اطلاعات تماس شرکت‌کنندگان",
  contactDescription:
    "اختیاری. اگر اطلاعات تماس را اضافه کنید، نام شخص تماس و یکی از این دو مورد الزامی است: نشانی ایمیل یا صفحه تماس HTTPS.",
  contactFirstNameLabel: "نام شخص تماس",
  contactLastNameLabel: "نام خانوادگی شخص تماس",
  contactRoleLabel: "عنوان نقش شخص تماس",
  contactEmailLabel: "ایمیل شخص تماس",
  contactWebsiteLabel: "URL صفحه تماس",
  contactImagePathLabel: "مسیر تصویر شخص تماس",
  contactImageIsFullPathLabel: "مسیر تصویر شخص تماس یک URL کامل است",
  contactOrganizationLabel: "وابستگی سازمانی شخص تماس",
  websiteUrlHint:
    "از یک URL کامل HTTPS استفاده کنید، برای مثال https://example.org.",
  websiteUrlError:
    "URL وب‌سایت باید از HTTPS استفاده کند و نمی‌تواند حاوی اطلاعات ورود تعبیه‌شده باشد.",
  createButton: "ایجاد پروژه",
  manageTitle: "مدیریت پروژه‌ها",
  manageDescription:
    "نامک پروژه و تنظیمات زبان در سطح پروژه را ویرایش کنید. هر بخش جداگانه ذخیره می‌شود.",
  selectProjectLabel: "پروژه",
  projectLinkLabel: "پیوند پروژه",
  copyProjectLinkLabel: "کپی پیوند پروژه",
  copyProjectLinkFailed: "کپی پیوند پروژه ناموفق بود",
  noProjectsMessage:
    "هنوز پروژه‌ای برای مدیریت وجود ندارد. ابتدا یک پروژه ایجاد کنید.",
  projectLanguageSettingsLabel: "زبان‌های پروژه",
  projectLanguageSettingsDescription:
    "ترجمه پویا و زبان‌های مقصد اضافی را پیکربندی کنید.",
  projectLanguageEntitlementLoadingDescription:
    "در حال بررسی دسترسی سازمان مالک به ترجمه پویا...",
  projectLanguageEntitlementRequiredDescription:
    "برای پیکربندی زبان‌های پروژه، دست‌کم یک سازمان مالک دارای مجوز ترجمه پویا انتخاب کنید.",
  autoLanguageLabel: "خودکار",
  dynamicTranslationEnabledLabel: "ترجمه پویا روشن است",
  dynamicTranslationDisabledLabel: "ترجمه پویا خاموش است",
  saveLanguageSettingsButton: "ذخیره تنظیمات زبان",
  saveButton: "ذخیره تغییرات",
  saveProjectButton: "ذخیره پروژه",
  saveSlugButton: "ذخیره نامک",
  slugWarningTitle: "پیوند عمومی تغییر کند؟",
  slugWarningDescription:
    "تغییر این نامک ممکن است پیوندهایی را که قبلاً بازدید یا هم‌رسانی شده‌اند از کار بیندازد. فقط در صورت اطمینان ادامه دهید.",
  confirmSlugChangeButton: "تغییر نامک",
  deleteProjectButton: "حذف پروژه",
  deleteProjectTitle: "پروژه حذف شود؟",
  deleteProjectDescription: "این کار پروژه را حذف می‌کند.",
  confirmDeleteProjectButton: "تأیید حذف",
  cancelButton: "لغو",
  requiredSuffix: "الزامی",
  optionalSuffix: "اختیاری",
  dangerZoneTitle: "محدوده خطر",
  changeSlugDangerTitle: "تغییر نامک پروژه",
  changeSlugDangerDescription:
    "تغییر این نامک ممکن است پیوندهای عمومی را که قبلاً بازدید یا هم‌رسانی شده‌اند از کار بیندازد.",
  deleteDangerTitle: "حذف این پروژه",
  deleteDangerDescription: "این پروژه را حذف کنید.",
};

const fr: AdministratorProjectTranslations = {
  administrator: "Administrateur",
  pageTitle: "Créer un projet",
  createTab: "Créer",
  manageTab: "Gérer",
  basicsTitle: "Informations de base du projet",
  basicsDescription:
    "Les champs obligatoires définissent l’identité publique du projet. Les champs facultatifs peuvent être modifiés ou localisés ultérieurement.",
  projectTitleLabel: "Titre du projet",
  projectSlugLabel: "Slug du projet",
  projectDefaultLanguageLabel: "Langue par défaut",
  ownerOrganizationsLabel: "Organisations propriétaires",
  subtitleLabel: "Sous-titre",
  bodyLabel: "Corps du texte",
  bannerPathLabel: "Chemin de la bannière du projet",
  bannerIsFullPathLabel:
    "Le chemin de la bannière du projet est une URL complète",
  contentLocalizationsTitle: "Contenu localisé du projet",
  contentLocalizationsDescription:
    "Ajoutez manuellement un titre, un corps de texte et, si nécessaire, une bannière de remplacement pour les langues supplémentaires du projet configurées ci-dessus.",
  localizationLanguageLabel: "Langue",
  addLocalizationButton: "Ajouter du contenu localisé",
  updateLocalizationButton: "Mettre à jour le contenu localisé",
  editLocalizationButton: "Modifier",
  noLocalizationLanguagesMessage:
    "Choisissez des langues supplémentaires pour le projet avant d’ajouter du contenu localisé.",
  machineTranslationPreviewTitle: "Traduction automatique disponible",
  machineTranslationPreviewDescription:
    "Utilisez-la comme brouillon manuel si sa qualité est suffisante ou si elle ne nécessite que de légères modifications. L’enregistrement du projet l’approuvera en tant que contenu manuel.",
  useMachineTranslationButton: "Utiliser comme brouillon manuel",
  machineTranslationIncomplete: "Traduction incomplète",
  attributionsTitle: "Attributions publiques des organisations",
  attributionRoleLabel: "Rôle",
  attributionSourceLabel: "Source",
  attributionsDescription:
    "Ces attributions publiques sont ajoutées au brouillon du projet et ne sont enregistrées que lors de la création du projet. La sélection d’une organisation propriétaire ajoute un brouillon d’attribution de propriétaire du projet pouvant être supprimé, mais la suppression de cette attribution conserve l’organisation comme propriétaire.",
  realOrganizationLabel: "Organisation existante",
  externalLanguageLabel: "Langue de l’organisation externe",
  externalLanguageHint:
    "Choisissez la langue utilisée pour le nom et la description de cette organisation.",
  externalNameLabel: "Nom de l’organisation externe",
  externalDescriptionLabel: "Description de l’organisation externe",
  externalWebsiteLabel: "Site web de l’organisation externe",
  externalImagePathLabel: "Chemin de l’image de l’organisation externe",
  externalImageIsFullPathLabel:
    "Le chemin de l’image externe est une URL complète",
  additionalLanguagesTitle: "Langues supplémentaires",
  addLanguageButton: "Ajouter une langue",
  addAttributionButton: "Ajouter l’attribution au brouillon",
  updateAttributionButton: "Mettre à jour l’attribution",
  editAttributionButton: "Modifier",
  noAttributions:
    "Le brouillon ne contient encore aucune attribution publique. La sélection d’une organisation propriétaire ajoutera un brouillon d’attribution de propriétaire du projet pouvant être supprimé.",
  removeButton: "Supprimer",
  projectOwnerRole: "Propriétaire du projet",
  sponsorRole: "Sponsor",
  partnerRole: "Partenaire",
  realOrganizationSource: "Organisation Agora existante",
  externalOrganizationSource: "Organisation externe",
  contactTitle: "Contact pour les participants",
  contactDescription:
    "Facultatif. Si vous ajoutez des coordonnées, le nom du contact ainsi qu’une adresse e-mail ou une page de contact HTTPS sont obligatoires.",
  contactFirstNameLabel: "Prénom du contact",
  contactLastNameLabel: "Nom du contact",
  contactRoleLabel: "Libellé du rôle du contact",
  contactEmailLabel: "E-mail du contact",
  contactWebsiteLabel: "URL de la page de contact",
  contactImagePathLabel: "Chemin de l’image du contact",
  contactImageIsFullPathLabel:
    "Le chemin de l’image du contact est une URL complète",
  contactOrganizationLabel: "Affiliation du contact à l’organisation",
  websiteUrlHint:
    "Utilisez une URL HTTPS complète, par exemple https://example.org.",
  websiteUrlError:
    "L’URL du site web doit utiliser HTTPS et ne peut pas contenir d’identifiants intégrés.",
  createButton: "Créer un projet",
  manageTitle: "Gérer les projets",
  manageDescription:
    "Modifiez le slug du projet et les paramètres linguistiques au niveau du projet. Chaque section est enregistrée séparément.",
  selectProjectLabel: "Projet",
  projectLinkLabel: "Lien du projet",
  copyProjectLinkLabel: "Copier le lien du projet",
  copyProjectLinkFailed: "Échec de la copie du lien du projet",
  noProjectsMessage:
    "Aucun projet à gérer pour le moment. Créez d’abord un projet.",
  projectLanguageSettingsLabel: "Langues du projet",
  projectLanguageSettingsDescription:
    "Configurez la traduction dynamique et les langues cibles supplémentaires.",
  projectLanguageEntitlementLoadingDescription:
    "Vérification de l’accès de l’organisation propriétaire à la traduction dynamique...",
  projectLanguageEntitlementRequiredDescription:
    "Sélectionnez au moins une organisation propriétaire disposant du droit à la traduction dynamique pour configurer les langues du projet.",
  autoLanguageLabel: "Auto",
  dynamicTranslationEnabledLabel: "Traduction dynamique activée",
  dynamicTranslationDisabledLabel: "Traduction dynamique désactivée",
  saveLanguageSettingsButton: "Enregistrer les paramètres linguistiques",
  saveButton: "Enregistrer les modifications",
  saveProjectButton: "Enregistrer le projet",
  saveSlugButton: "Enregistrer le slug",
  slugWarningTitle: "Modifier le lien public ?",
  slugWarningDescription:
    "La modification de ce slug peut rompre les liens déjà consultés ou partagés. Ne continuez que si vous en êtes sûr.",
  confirmSlugChangeButton: "Modifier le slug",
  deleteProjectButton: "Supprimer le projet",
  deleteProjectTitle: "Supprimer le projet ?",
  deleteProjectDescription: "Cette action supprimera ce projet.",
  confirmDeleteProjectButton: "Confirmer la suppression",
  cancelButton: "Annuler",
  requiredSuffix: "obligatoire",
  optionalSuffix: "facultatif",
  dangerZoneTitle: "Zone de danger",
  changeSlugDangerTitle: "Modifier le slug du projet",
  changeSlugDangerDescription:
    "La modification de ce slug peut rompre les liens publics déjà consultés ou partagés.",
  deleteDangerTitle: "Supprimer ce projet",
  deleteDangerDescription: "Supprimez ce projet.",
};

const he: AdministratorProjectTranslations = {
  administrator: "מנהל מערכת",
  pageTitle: "יצירת פרויקט",
  createTab: "יצירה",
  manageTab: "ניהול",
  basicsTitle: "פרטי הפרויקט הבסיסיים",
  basicsDescription:
    "שדות החובה מגדירים את הזהות הציבורית של הפרויקט. ניתן לערוך או להתאים לשפות אחרות את שדות הרשות מאוחר יותר.",
  projectTitleLabel: "כותרת הפרויקט",
  projectSlugLabel: "מזהה הפרויקט",
  projectDefaultLanguageLabel: "שפת ברירת המחדל",
  ownerOrganizationsLabel: "ארגונים בעלים",
  subtitleLabel: "כותרת משנה",
  bodyLabel: "תוכן",
  bannerPathLabel: "נתיב הכרזה של הפרויקט",
  bannerIsFullPathLabel: "נתיב הכרזה של הפרויקט הוא כתובת URL מלאה",
  contentLocalizationsTitle: "תוכן פרויקט מותאם לשפה",
  contentLocalizationsDescription:
    "הוסיפו גרסאות ידניות של הכותרת והתוכן, ולפי הצורך גם כרזה חלופית, עבור שפות הפרויקט הנוספות שהוגדרו למעלה.",
  localizationLanguageLabel: "שפה",
  addLocalizationButton: "הוספת תוכן מותאם לשפה",
  updateLocalizationButton: "עדכון תוכן מותאם לשפה",
  editLocalizationButton: "עריכה",
  noLocalizationLanguagesMessage:
    "בחרו שפות נוספות לפרויקט לפני הוספת תוכן מותאם לשפה.",
  machineTranslationPreviewTitle: "תרגום מכונה זמין",
  machineTranslationPreviewDescription:
    "השתמשו בו כטיוטה ידנית אם הוא טוב מספיק או זקוק לתיקונים קלים. שמירת הפרויקט תאשר אותו כתוכן ידני.",
  useMachineTranslationButton: "שימוש כטיוטה ידנית",
  machineTranslationIncomplete: "תרגום חלקי",
  attributionsTitle: "ייחוסים ציבוריים לארגונים",
  attributionRoleLabel: "תפקיד",
  attributionSourceLabel: "מקור",
  attributionsDescription:
    "ייחוסים ציבוריים אלה נוספים לטיוטת הפרויקט ונשמרים רק בעת יצירת הפרויקט. בחירת ארגון בעלים מוסיפה טיוטת ייחוס ניתנת להסרה של בעל הפרויקט, אך הסרת הייחוס משאירה את הארגון כבעלים.",
  realOrganizationLabel: "ארגון קיים",
  externalLanguageLabel: "שפת הארגון החיצוני",
  externalLanguageHint: "בחרו את השפה שבה כתובים השם והתיאור של ארגון זה.",
  externalNameLabel: "שם הארגון החיצוני",
  externalDescriptionLabel: "תיאור הארגון החיצוני",
  externalWebsiteLabel: "אתר הארגון החיצוני",
  externalImagePathLabel: "נתיב התמונה של הארגון החיצוני",
  externalImageIsFullPathLabel: "נתיב התמונה החיצונית הוא כתובת URL מלאה",
  additionalLanguagesTitle: "שפות נוספות",
  addLanguageButton: "הוספת שפה",
  addAttributionButton: "הוספת ייחוס לטיוטה",
  updateAttributionButton: "עדכון הייחוס",
  editAttributionButton: "עריכה",
  noAttributions:
    "עדיין אין ייחוסים ציבוריים בטיוטה. בחירת ארגון בעלים תוסיף טיוטת ייחוס ניתנת להסרה של בעל הפרויקט.",
  removeButton: "הסרה",
  projectOwnerRole: "בעל הפרויקט",
  sponsorRole: "נותן חסות",
  partnerRole: "שותף",
  realOrganizationSource: "ארגון Agora קיים",
  externalOrganizationSource: "ארגון חיצוני",
  contactTitle: "איש קשר למשתתפים",
  contactDescription:
    "אופציונלי. אם תוסיפו פרטי קשר, יידרשו שם איש קשר וכתובת דוא״ל או דף קשר המשתמש ב-HTTPS.",
  contactFirstNameLabel: "השם הפרטי של איש הקשר",
  contactLastNameLabel: "שם המשפחה של איש הקשר",
  contactRoleLabel: "תיאור התפקיד של איש הקשר",
  contactEmailLabel: "הדוא״ל של איש הקשר",
  contactWebsiteLabel: "כתובת ה-URL של דף הקשר",
  contactImagePathLabel: "נתיב התמונה של איש הקשר",
  contactImageIsFullPathLabel: "נתיב התמונה של איש הקשר הוא כתובת URL מלאה",
  contactOrganizationLabel: "השיוך הארגוני של איש הקשר",
  websiteUrlHint:
    "השתמשו בכתובת URL מלאה עם HTTPS, לדוגמה https://example.org.",
  websiteUrlError:
    "כתובת ה-URL של האתר חייבת להשתמש ב-HTTPS ואינה יכולה לכלול פרטי התחברות מוטמעים.",
  createButton: "יצירת פרויקט",
  manageTitle: "ניהול פרויקטים",
  manageDescription:
    "ערכו את מזהה הפרויקט ואת הגדרות השפה ברמת הפרויקט. כל מקטע נשמר בנפרד.",
  selectProjectLabel: "פרויקט",
  projectLinkLabel: "קישור לפרויקט",
  copyProjectLinkLabel: "העתקת הקישור לפרויקט",
  copyProjectLinkFailed: "העתקת הקישור לפרויקט נכשלה",
  noProjectsMessage: "עדיין אין פרויקטים לניהול. צרו תחילה פרויקט.",
  projectLanguageSettingsLabel: "שפות הפרויקט",
  projectLanguageSettingsDescription: "הגדירו תרגום דינמי ושפות יעד נוספות.",
  projectLanguageEntitlementLoadingDescription:
    "מתבצעת בדיקה של גישת הארגון הבעלים לתרגום דינמי...",
  projectLanguageEntitlementRequiredDescription:
    "בחרו לפחות ארגון בעלים אחד הזכאי לתרגום דינמי כדי להגדיר את שפות הפרויקט.",
  autoLanguageLabel: "אוטומטי",
  dynamicTranslationEnabledLabel: "תרגום דינמי מופעל",
  dynamicTranslationDisabledLabel: "תרגום דינמי מושבת",
  saveLanguageSettingsButton: "שמירת הגדרות השפה",
  saveButton: "שמירת השינויים",
  saveProjectButton: "שמירת הפרויקט",
  saveSlugButton: "שמירת המזהה",
  slugWarningTitle: "לשנות את הקישור הציבורי?",
  slugWarningDescription:
    "שינוי המזהה הזה עלול לשבור קישורים שכבר נפתחו או שותפו. המשיכו רק אם אתם בטוחים.",
  confirmSlugChangeButton: "שינוי המזהה",
  deleteProjectButton: "מחיקת הפרויקט",
  deleteProjectTitle: "למחוק את הפרויקט?",
  deleteProjectDescription: "פעולה זו תמחק את הפרויקט.",
  confirmDeleteProjectButton: "אישור המחיקה",
  cancelButton: "ביטול",
  requiredSuffix: "חובה",
  optionalSuffix: "רשות",
  dangerZoneTitle: "אזור מסוכן",
  changeSlugDangerTitle: "שינוי מזהה הפרויקט",
  changeSlugDangerDescription:
    "שינוי המזהה הזה עלול לשבור קישורים ציבוריים שכבר נפתחו או שותפו.",
  deleteDangerTitle: "מחיקת הפרויקט הזה",
  deleteDangerDescription: "מחקו את הפרויקט הזה.",
};

const ja: AdministratorProjectTranslations = {
  administrator: "管理者",
  pageTitle: "プロジェクトを作成",
  createTab: "作成",
  manageTab: "管理",
  basicsTitle: "プロジェクトの基本情報",
  basicsDescription:
    "必須フィールドでプロジェクトの公開情報を定義します。任意フィールドは後から編集またはローカライズできます。",
  projectTitleLabel: "プロジェクト名",
  projectSlugLabel: "プロジェクトのスラッグ",
  projectDefaultLanguageLabel: "デフォルト言語",
  ownerOrganizationsLabel: "所有組織",
  subtitleLabel: "サブタイトル",
  bodyLabel: "本文",
  bannerPathLabel: "プロジェクトバナーのパス",
  bannerIsFullPathLabel: "プロジェクトバナーのパスは完全なURLです",
  contentLocalizationsTitle: "ローカライズされたプロジェクトコンテンツ",
  contentLocalizationsDescription:
    "上で設定したプロジェクトの追加言語向けに、タイトル、本文、および任意のバナーの手動差し替えを追加します。",
  localizationLanguageLabel: "言語",
  addLocalizationButton: "ローカライズ済みコンテンツを追加",
  updateLocalizationButton: "ローカライズ済みコンテンツを更新",
  editLocalizationButton: "編集",
  noLocalizationLanguagesMessage:
    "ローカライズ済みコンテンツを追加する前に、プロジェクトの追加言語を選択してください。",
  machineTranslationPreviewTitle: "機械翻訳を利用できます",
  machineTranslationPreviewDescription:
    "十分な品質である場合や微調整のみ必要な場合は、手動編集用の下書きとして使用してください。プロジェクトを保存すると、手動コンテンツとして承認されます。",
  useMachineTranslationButton: "手動編集用の下書きとして使用",
  machineTranslationIncomplete: "翻訳が不完全です",
  attributionsTitle: "組織の公開帰属情報",
  attributionRoleLabel: "役割",
  attributionSourceLabel: "出典",
  attributionsDescription:
    "これらの公開帰属情報はプロジェクトの下書きに追加され、プロジェクトを作成したときにのみ保存されます。所有組織を選択すると、削除可能なプロジェクト所有者の帰属情報の下書きが追加されますが、その帰属情報を削除しても組織は所有者のままです。",
  realOrganizationLabel: "既存の組織",
  externalLanguageLabel: "外部組織の言語",
  externalLanguageHint: "この組織の名前と説明に使用する言語を選択します。",
  externalNameLabel: "外部組織名",
  externalDescriptionLabel: "外部組織の説明",
  externalWebsiteLabel: "外部組織のウェブサイト",
  externalImagePathLabel: "外部組織の画像パス",
  externalImageIsFullPathLabel: "外部画像のパスは完全なURLです",
  additionalLanguagesTitle: "追加言語",
  addLanguageButton: "言語を追加",
  addAttributionButton: "帰属情報を下書きに追加",
  updateAttributionButton: "帰属情報を更新",
  editAttributionButton: "編集",
  noAttributions:
    "下書きにはまだ公開帰属情報がありません。所有組織を選択すると、削除可能なプロジェクト所有者の帰属情報の下書きが追加されます。",
  removeButton: "削除",
  projectOwnerRole: "プロジェクト所有者",
  sponsorRole: "スポンサー",
  partnerRole: "パートナー",
  realOrganizationSource: "既存のAgora組織",
  externalOrganizationSource: "外部組織",
  contactTitle: "参加者向け連絡先",
  contactDescription:
    "任意です。連絡先の詳細を追加する場合は、連絡先名と、メールアドレスまたはHTTPSの連絡先ページのいずれかが必要です。",
  contactFirstNameLabel: "連絡先の名",
  contactLastNameLabel: "連絡先の姓",
  contactRoleLabel: "連絡先の役割ラベル",
  contactEmailLabel: "連絡先メールアドレス",
  contactWebsiteLabel: "連絡先ページのURL",
  contactImagePathLabel: "連絡先画像のパス",
  contactImageIsFullPathLabel: "連絡先画像のパスは完全なURLです",
  contactOrganizationLabel: "連絡先の所属組織",
  websiteUrlHint:
    "完全なHTTPS URLを使用してください（例：https://example.org）。",
  websiteUrlError:
    "ウェブサイトのURLにはHTTPSを使用し、埋め込まれた認証情報を含めることはできません。",
  createButton: "プロジェクトを作成",
  manageTitle: "プロジェクトを管理",
  manageDescription:
    "プロジェクトのスラッグとプロジェクト単位の言語設定を編集します。各セクションは個別に保存されます。",
  selectProjectLabel: "プロジェクト",
  projectLinkLabel: "プロジェクトリンク",
  copyProjectLinkLabel: "プロジェクトリンクをコピー",
  copyProjectLinkFailed: "プロジェクトリンクをコピーできませんでした",
  noProjectsMessage:
    "管理できるプロジェクトはまだありません。最初にプロジェクトを作成してください。",
  projectLanguageSettingsLabel: "プロジェクトの言語",
  projectLanguageSettingsDescription: "動的翻訳と追加の対象言語を設定します。",
  projectLanguageEntitlementLoadingDescription:
    "所有組織の動的翻訳へのアクセス権を確認しています...",
  projectLanguageEntitlementRequiredDescription:
    "プロジェクトの言語を設定するには、動的翻訳の利用資格を持つ所有組織を1つ以上選択してください。",
  autoLanguageLabel: "自動",
  dynamicTranslationEnabledLabel: "動的翻訳：オン",
  dynamicTranslationDisabledLabel: "動的翻訳：オフ",
  saveLanguageSettingsButton: "言語設定を保存",
  saveButton: "変更を保存",
  saveProjectButton: "プロジェクトを保存",
  saveSlugButton: "スラッグを保存",
  slugWarningTitle: "公開リンクを変更しますか？",
  slugWarningDescription:
    "このスラッグを変更すると、すでにアクセスまたは共有されたリンクが機能しなくなる可能性があります。確信がある場合のみ続行してください。",
  confirmSlugChangeButton: "スラッグを変更",
  deleteProjectButton: "プロジェクトを削除",
  deleteProjectTitle: "プロジェクトを削除しますか？",
  deleteProjectDescription: "このプロジェクトが削除されます。",
  confirmDeleteProjectButton: "削除を確定",
  cancelButton: "キャンセル",
  requiredSuffix: "必須",
  optionalSuffix: "任意",
  dangerZoneTitle: "危険な操作",
  changeSlugDangerTitle: "プロジェクトのスラッグを変更",
  changeSlugDangerDescription:
    "このスラッグを変更すると、すでにアクセスまたは共有された公開リンクが機能しなくなる可能性があります。",
  deleteDangerTitle: "このプロジェクトを削除",
  deleteDangerDescription: "このプロジェクトを削除します。",
};

const zhHans: AdministratorProjectTranslations = {
  administrator: "管理员",
  pageTitle: "创建项目",
  createTab: "创建",
  manageTab: "管理",
  basicsTitle: "项目基本信息",
  basicsDescription:
    "必填字段用于定义项目的公开身份。可选字段可以稍后编辑或本地化。",
  projectTitleLabel: "项目标题",
  projectSlugLabel: "项目标识符",
  projectDefaultLanguageLabel: "默认语言",
  ownerOrganizationsLabel: "所有者组织",
  subtitleLabel: "副标题",
  bodyLabel: "正文",
  bannerPathLabel: "项目横幅路径",
  bannerIsFullPathLabel: "项目横幅路径是完整的 URL",
  contentLocalizationsTitle: "本地化项目内容",
  contentLocalizationsDescription:
    "为上方配置的其他项目语言添加手动编写的标题、正文，以及可选的替代横幅。",
  localizationLanguageLabel: "语言",
  addLocalizationButton: "添加本地化内容",
  updateLocalizationButton: "更新本地化内容",
  editLocalizationButton: "编辑",
  noLocalizationLanguagesMessage:
    "请先选择其他项目语言，然后再添加本地化内容。",
  machineTranslationPreviewTitle: "有可用的机器翻译",
  machineTranslationPreviewDescription:
    "如果翻译质量足够好或只需少量修改，可将其用作手动草稿。保存项目后，它将被批准为手动内容。",
  useMachineTranslationButton: "用作手动草稿",
  machineTranslationIncomplete: "翻译不完整",
  attributionsTitle: "公开组织署名信息",
  attributionRoleLabel: "角色",
  attributionSourceLabel: "来源",
  attributionsDescription:
    "这些公开署名信息会添加到项目草稿中，并且仅在创建项目时保存。选择所有者组织会添加一条可移除的项目所有者署名草稿，但移除该署名并不会取消该组织的所有者身份。",
  realOrganizationLabel: "现有组织",
  externalLanguageLabel: "外部组织语言",
  externalLanguageHint: "请选择此组织名称和描述所使用的语言。",
  externalNameLabel: "外部组织名称",
  externalDescriptionLabel: "外部组织描述",
  externalWebsiteLabel: "外部组织网站",
  externalImagePathLabel: "外部组织图片路径",
  externalImageIsFullPathLabel: "外部图片路径是完整的 URL",
  additionalLanguagesTitle: "其他语言",
  addLanguageButton: "添加语言",
  addAttributionButton: "将署名信息添加到草稿",
  updateAttributionButton: "更新署名信息",
  editAttributionButton: "编辑",
  noAttributions:
    "草稿中还没有公开署名信息。选择所有者组织会添加一条可移除的项目所有者署名草稿。",
  removeButton: "移除",
  projectOwnerRole: "项目所有者",
  sponsorRole: "赞助方",
  partnerRole: "合作伙伴",
  realOrganizationSource: "现有 Agora 组织",
  externalOrganizationSource: "外部组织",
  contactTitle: "参与者联系人",
  contactDescription:
    "可选。如果添加联系信息，则必须提供联系人姓名，以及电子邮件地址或 HTTPS 联系页面中的一项。",
  contactFirstNameLabel: "联系人名字",
  contactLastNameLabel: "联系人姓氏",
  contactRoleLabel: "联系人角色标签",
  contactEmailLabel: "联系人电子邮件",
  contactWebsiteLabel: "联系页面 URL",
  contactImagePathLabel: "联系人图片路径",
  contactImageIsFullPathLabel: "联系人图片路径是完整的 URL",
  contactOrganizationLabel: "联系人所属组织",
  websiteUrlHint: "请使用完整的 HTTPS URL，例如 https://example.org。",
  websiteUrlError: "网站 URL 必须使用 HTTPS，且不能包含嵌入式凭据。",
  createButton: "创建项目",
  manageTitle: "管理项目",
  manageDescription: "编辑项目标识符和项目级语言设置。每个部分单独保存。",
  selectProjectLabel: "项目",
  projectLinkLabel: "项目链接",
  copyProjectLinkLabel: "复制项目链接",
  copyProjectLinkFailed: "无法复制项目链接",
  noProjectsMessage: "目前没有可管理的项目。请先创建项目。",
  projectLanguageSettingsLabel: "项目语言",
  projectLanguageSettingsDescription: "配置动态翻译和其他目标语言。",
  projectLanguageEntitlementLoadingDescription:
    "正在检查所有者组织的动态翻译访问权限...",
  projectLanguageEntitlementRequiredDescription:
    "请选择至少一个具有动态翻译权限的所有者组织，以配置项目语言。",
  autoLanguageLabel: "自动",
  dynamicTranslationEnabledLabel: "动态翻译已开启",
  dynamicTranslationDisabledLabel: "动态翻译已关闭",
  saveLanguageSettingsButton: "保存语言设置",
  saveButton: "保存更改",
  saveProjectButton: "保存项目",
  saveSlugButton: "保存标识符",
  slugWarningTitle: "更改公开链接？",
  slugWarningDescription:
    "更改此标识符可能会导致已访问或已分享的链接失效。请仅在确定无误时继续。",
  confirmSlugChangeButton: "更改标识符",
  deleteProjectButton: "删除项目",
  deleteProjectTitle: "删除项目？",
  deleteProjectDescription: "这将删除此项目。",
  confirmDeleteProjectButton: "确认删除",
  cancelButton: "取消",
  requiredSuffix: "必填",
  optionalSuffix: "可选",
  dangerZoneTitle: "危险区域",
  changeSlugDangerTitle: "更改项目标识符",
  changeSlugDangerDescription:
    "更改此标识符可能会导致已访问或已分享的公开链接失效。",
  deleteDangerTitle: "删除此项目",
  deleteDangerDescription: "删除此项目。",
};

const zhHant: AdministratorProjectTranslations = {
  administrator: "管理員",
  pageTitle: "建立專案",
  createTab: "建立",
  manageTab: "管理",
  basicsTitle: "專案基本資訊",
  basicsDescription:
    "必填欄位用於定義專案的公開身分。選填欄位可以稍後編輯或本地化。",
  projectTitleLabel: "專案標題",
  projectSlugLabel: "專案識別字串",
  projectDefaultLanguageLabel: "預設語言",
  ownerOrganizationsLabel: "擁有者組織",
  subtitleLabel: "副標題",
  bodyLabel: "內文",
  bannerPathLabel: "專案橫幅路徑",
  bannerIsFullPathLabel: "專案橫幅路徑是完整的 URL",
  contentLocalizationsTitle: "本地化專案內容",
  contentLocalizationsDescription:
    "為上方設定的其他專案語言新增手動撰寫的標題、內文，以及選用的替代橫幅。",
  localizationLanguageLabel: "語言",
  addLocalizationButton: "新增本地化內容",
  updateLocalizationButton: "更新本地化內容",
  editLocalizationButton: "編輯",
  noLocalizationLanguagesMessage: "請先選擇其他專案語言，再新增本地化內容。",
  machineTranslationPreviewTitle: "有可用的機器翻譯",
  machineTranslationPreviewDescription:
    "如果翻譯品質足夠好或只需稍作修改，可將其用作手動草稿。儲存專案後，它將被核准為手動內容。",
  useMachineTranslationButton: "用作手動草稿",
  machineTranslationIncomplete: "翻譯不完整",
  attributionsTitle: "公開組織署名資訊",
  attributionRoleLabel: "角色",
  attributionSourceLabel: "來源",
  attributionsDescription:
    "這些公開署名資訊會新增至專案草稿，且僅在建立專案時儲存。選擇擁有者組織會新增一筆可移除的專案擁有者署名草稿，但移除該署名不會取消該組織的擁有者身分。",
  realOrganizationLabel: "現有組織",
  externalLanguageLabel: "外部組織語言",
  externalLanguageHint: "請選擇此組織名稱和說明所使用的語言。",
  externalNameLabel: "外部組織名稱",
  externalDescriptionLabel: "外部組織說明",
  externalWebsiteLabel: "外部組織網站",
  externalImagePathLabel: "外部組織圖片路徑",
  externalImageIsFullPathLabel: "外部圖片路徑是完整的 URL",
  additionalLanguagesTitle: "其他語言",
  addLanguageButton: "新增語言",
  addAttributionButton: "將署名資訊新增至草稿",
  updateAttributionButton: "更新署名資訊",
  editAttributionButton: "編輯",
  noAttributions:
    "草稿中尚無公開署名資訊。選擇擁有者組織會新增一筆可移除的專案擁有者署名草稿。",
  removeButton: "移除",
  projectOwnerRole: "專案擁有者",
  sponsorRole: "贊助者",
  partnerRole: "合作夥伴",
  realOrganizationSource: "現有 Agora 組織",
  externalOrganizationSource: "外部組織",
  contactTitle: "參與者聯絡人",
  contactDescription:
    "選填。如果新增聯絡資訊，則必須提供聯絡人姓名，以及電子郵件地址或 HTTPS 聯絡頁面其中一項。",
  contactFirstNameLabel: "聯絡人名字",
  contactLastNameLabel: "聯絡人姓氏",
  contactRoleLabel: "聯絡人角色標籤",
  contactEmailLabel: "聯絡人電子郵件",
  contactWebsiteLabel: "聯絡頁面 URL",
  contactImagePathLabel: "聯絡人圖片路徑",
  contactImageIsFullPathLabel: "聯絡人圖片路徑是完整的 URL",
  contactOrganizationLabel: "聯絡人所屬組織",
  websiteUrlHint: "請使用完整的 HTTPS URL，例如 https://example.org。",
  websiteUrlError: "網站 URL 必須使用 HTTPS，且不能包含內嵌的憑證。",
  createButton: "建立專案",
  manageTitle: "管理專案",
  manageDescription:
    "編輯專案識別字串和專案層級的語言設定。每個區段會分別儲存。",
  selectProjectLabel: "專案",
  projectLinkLabel: "專案連結",
  copyProjectLinkLabel: "複製專案連結",
  copyProjectLinkFailed: "無法複製專案連結",
  noProjectsMessage: "目前沒有可管理的專案。請先建立專案。",
  projectLanguageSettingsLabel: "專案語言",
  projectLanguageSettingsDescription: "設定動態翻譯和其他目標語言。",
  projectLanguageEntitlementLoadingDescription:
    "正在檢查擁有者組織的動態翻譯存取權...",
  projectLanguageEntitlementRequiredDescription:
    "請選擇至少一個具備動態翻譯權限的擁有者組織，以設定專案語言。",
  autoLanguageLabel: "自動",
  dynamicTranslationEnabledLabel: "動態翻譯已開啟",
  dynamicTranslationDisabledLabel: "動態翻譯已關閉",
  saveLanguageSettingsButton: "儲存語言設定",
  saveButton: "儲存變更",
  saveProjectButton: "儲存專案",
  saveSlugButton: "儲存識別字串",
  slugWarningTitle: "變更公開連結？",
  slugWarningDescription:
    "變更此識別字串可能會使已造訪或分享的連結失效。請僅在確定無誤時繼續。",
  confirmSlugChangeButton: "變更識別字串",
  deleteProjectButton: "刪除專案",
  deleteProjectTitle: "刪除專案？",
  deleteProjectDescription: "這將刪除此專案。",
  confirmDeleteProjectButton: "確認刪除",
  cancelButton: "取消",
  requiredSuffix: "必填",
  optionalSuffix: "選填",
  dangerZoneTitle: "危險區域",
  changeSlugDangerTitle: "變更專案識別字串",
  changeSlugDangerDescription:
    "變更此識別字串可能會使已造訪或分享的公開連結失效。",
  deleteDangerTitle: "刪除此專案",
  deleteDangerDescription: "刪除此專案。",
};

const ky: AdministratorProjectTranslations = {
  administrator: "Администратор",
  pageTitle: "Долбоор түзүү",
  createTab: "Түзүү",
  manageTab: "Башкаруу",
  basicsTitle: "Долбоордун негизги маалыматы",
  basicsDescription:
    "Милдеттүү талаалар долбоордун жалпыга ачык өзгөчөлүктөрүн аныктайт. Милдеттүү эмес талааларды кийин түзөтүп же локалдаштырууга болот.",
  projectTitleLabel: "Долбоордун аталышы",
  projectSlugLabel: "Долбоордун слагы",
  projectDefaultLanguageLabel: "Демейки тил",
  ownerOrganizationsLabel: "Ээлик кылуучу уюмдар",
  subtitleLabel: "Кошумча аталыш",
  bodyLabel: "Негизги текст",
  bannerPathLabel: "Долбоордун баннеринин жолу",
  bannerIsFullPathLabel: "Долбоордун баннеринин жолу толук URL дареги",
  contentLocalizationsTitle: "Долбоордун локалдаштырылган мазмуну",
  contentLocalizationsDescription:
    "Жогоруда жөндөлгөн долбоордун кошумча тилдери үчүн аталыштын жана негизги тексттин кол менен даярдалган варианттарын, ошондой эле кааласаңыз баннердин алмаштыруучу вариантын кошуңуз.",
  localizationLanguageLabel: "Тил",
  addLocalizationButton: "Локалдаштырылган мазмун кошуу",
  updateLocalizationButton: "Локалдаштырылган мазмунду жаңыртуу",
  editLocalizationButton: "Түзөтүү",
  noLocalizationLanguagesMessage:
    "Локалдаштырылган мазмунду кошуудан мурун долбоордун кошумча тилдерин тандаңыз.",
  machineTranslationPreviewTitle: "Машиналык котормо жеткиликтүү",
  machineTranslationPreviewDescription:
    "Эгер сапаты жетиштүү болсо же бир аз гана түзөтүү талап кылынса, муну кол менен даярдалуучу варианттын караламасы катары колдонуңуз. Долбоорду сактаганда ал кол менен даярдалган мазмун катары бекитилет.",
  useMachineTranslationButton: "Кол менен даярдалуучу каралама катары колдонуу",
  machineTranslationIncomplete: "Толук эмес котормо",
  attributionsTitle: "Уюмдар тууралуу жалпыга ачык маалыматтар",
  attributionRoleLabel: "Роль",
  attributionSourceLabel: "Булак",
  attributionsDescription:
    "Бул жалпыга ачык маалыматтар долбоордун караламасына кошулат жана долбоорду түзгөндө гана сакталат. Ээлик кылуучу уюмду тандоо долбоордун ээси тууралуу өчүрүүгө боло турган маалымат караламасын кошот, бирок ал маалыматты өчүрүү уюмду долбоордун ээси бойдон калтырат.",
  realOrganizationLabel: "Учурдагы уюм",
  externalLanguageLabel: "Тышкы уюмдун тили",
  externalLanguageHint:
    "Бул уюмдун аталышы жана сүрөттөмөсү жазылган тилди тандаңыз.",
  externalNameLabel: "Тышкы уюмдун аталышы",
  externalDescriptionLabel: "Тышкы уюмдун сүрөттөмөсү",
  externalWebsiteLabel: "Тышкы уюмдун веб-сайты",
  externalImagePathLabel: "Тышкы уюмдун сүрөтүнүн жолу",
  externalImageIsFullPathLabel: "Тышкы сүрөттүн жолу толук URL дареги",
  additionalLanguagesTitle: "Кошумча тилдер",
  addLanguageButton: "Тил кошуу",
  addAttributionButton: "Маалыматты караламага кошуу",
  updateAttributionButton: "Маалыматты жаңыртуу",
  editAttributionButton: "Түзөтүү",
  noAttributions:
    "Караламада жалпыга ачык маалыматтар азырынча жок. Ээлик кылуучу уюмду тандоо долбоордун ээси тууралуу өчүрүүгө боло турган маалымат караламасын кошот.",
  removeButton: "Өчүрүү",
  projectOwnerRole: "Долбоордун ээси",
  sponsorRole: "Демөөрчү",
  partnerRole: "Өнөктөш",
  realOrganizationSource: "Agoraдагы учурдагы уюм",
  externalOrganizationSource: "Тышкы уюм",
  contactTitle: "Катышуучулар үчүн байланыш",
  contactDescription:
    "Милдеттүү эмес. Байланыш маалыматын кошсоңуз, байланыш адамынын аты жана электрондук почта дареги же HTTPS байланыш барагы талап кылынат.",
  contactFirstNameLabel: "Байланыш адамынын аты",
  contactLastNameLabel: "Байланыш адамынын фамилиясы",
  contactRoleLabel: "Байланыш адамынын ролу",
  contactEmailLabel: "Байланыш үчүн электрондук почта",
  contactWebsiteLabel: "Байланыш барагынын URL дареги",
  contactImagePathLabel: "Байланыш сүрөтүнүн жолу",
  contactImageIsFullPathLabel: "Байланыш сүрөтүнүн жолу толук URL дареги",
  contactOrganizationLabel: "Байланыш адамынын уюмга тиешелүүлүгү",
  websiteUrlHint:
    "Толук HTTPS URL дарегин колдонуңуз, мисалы https://example.org.",
  websiteUrlError:
    "Веб-сайттын URL дареги HTTPS протоколун колдонушу керек жана камтылган кирүү маалыматын камтыбашы керек.",
  createButton: "Долбоор түзүү",
  manageTitle: "Долбоорлорду башкаруу",
  manageDescription:
    "Долбоордун слагын жана долбоор деңгээлиндеги тил жөндөөлөрүн түзөтүңүз. Ар бир бөлүм өзүнчө сакталат.",
  selectProjectLabel: "Долбоор",
  projectLinkLabel: "Долбоордун шилтемеси",
  copyProjectLinkLabel: "Долбоордун шилтемесин көчүрүү",
  copyProjectLinkFailed: "Долбоордун шилтемесин көчүрүү ишке ашкан жок",
  noProjectsMessage:
    "Башкаруу үчүн азырынча долбоорлор жок. Адегенде долбоор түзүңүз.",
  projectLanguageSettingsLabel: "Долбоордун тилдери",
  projectLanguageSettingsDescription:
    "Динамикалык котормону жана кошумча максаттуу тилдерди жөндөңүз.",
  projectLanguageEntitlementLoadingDescription:
    "Ээлик кылуучу уюмдун динамикалык котормого кирүү укугу текшерилүүдө...",
  projectLanguageEntitlementRequiredDescription:
    "Долбоордун тилдерин жөндөө үчүн динамикалык котормого укугу бар кеминде бир ээлик кылуучу уюмду тандаңыз.",
  autoLanguageLabel: "Авто",
  dynamicTranslationEnabledLabel: "Динамикалык котормо күйгүзүлгөн",
  dynamicTranslationDisabledLabel: "Динамикалык котормо өчүрүлгөн",
  saveLanguageSettingsButton: "Тил жөндөөлөрүн сактоо",
  saveButton: "Өзгөртүүлөрдү сактоо",
  saveProjectButton: "Долбоорду сактоо",
  saveSlugButton: "Слагды сактоо",
  slugWarningTitle: "Жалпыга ачык шилтемени өзгөртөсүзбү?",
  slugWarningDescription:
    "Бул слагды өзгөртүү буга чейин ачылган же бөлүшүлгөн шилтемелерди иштен чыгарышы мүмкүн. Ишенсеңиз гана улантыңыз.",
  confirmSlugChangeButton: "Слагды өзгөртүү",
  deleteProjectButton: "Долбоорду өчүрүү",
  deleteProjectTitle: "Долбоор өчүрүлсүнбү?",
  deleteProjectDescription: "Бул долбоор өчүрүлөт.",
  confirmDeleteProjectButton: "Өчүрүүнү ырастоо",
  cancelButton: "Жокко чыгаруу",
  requiredSuffix: "милдеттүү",
  optionalSuffix: "милдеттүү эмес",
  dangerZoneTitle: "Кооптуу аймак",
  changeSlugDangerTitle: "Долбоордун слагын өзгөртүү",
  changeSlugDangerDescription:
    "Бул слагды өзгөртүү буга чейин ачылган же бөлүшүлгөн жалпыга ачык шилтемелерди иштен чыгарышы мүмкүн.",
  deleteDangerTitle: "Бул долбоорду өчүрүү",
  deleteDangerDescription: "Бул долбоорду өчүрүңүз.",
};

const ru: AdministratorProjectTranslations = {
  administrator: "Администратор",
  pageTitle: "Создать проект",
  createTab: "Создать",
  manageTab: "Управление",
  basicsTitle: "Основные сведения о проекте",
  basicsDescription:
    "Обязательные поля определяют публичный облик проекта. Необязательные поля можно изменить или локализовать позднее.",
  projectTitleLabel: "Название проекта",
  projectSlugLabel: "Слаг проекта",
  projectDefaultLanguageLabel: "Язык по умолчанию",
  ownerOrganizationsLabel: "Организации-владельцы",
  subtitleLabel: "Подзаголовок",
  bodyLabel: "Основной текст",
  bannerPathLabel: "Путь к баннеру проекта",
  bannerIsFullPathLabel: "Путь к баннеру проекта является полным URL-адресом",
  contentLocalizationsTitle: "Локализованное содержимое проекта",
  contentLocalizationsDescription:
    "Добавьте подготовленные вручную варианты названия и основного текста, а также при необходимости баннера для дополнительных языков проекта, настроенных выше.",
  localizationLanguageLabel: "Язык",
  addLocalizationButton: "Добавить локализованное содержимое",
  updateLocalizationButton: "Обновить локализованное содержимое",
  editLocalizationButton: "Изменить",
  noLocalizationLanguagesMessage:
    "Выберите дополнительные языки проекта, прежде чем добавлять локализованное содержимое.",
  machineTranslationPreviewTitle: "Доступен машинный перевод",
  machineTranslationPreviewDescription:
    "Используйте его как черновик для ручной подготовки, если качество достаточно хорошее или требуются лишь небольшие правки. При сохранении проекта он будет утвержден как содержимое, подготовленное вручную.",
  useMachineTranslationButton:
    "Использовать как черновик для ручной подготовки",
  machineTranslationIncomplete: "Неполный перевод",
  attributionsTitle: "Публичные сведения об организациях",
  attributionRoleLabel: "Роль",
  attributionSourceLabel: "Источник",
  attributionsDescription:
    "Эти публичные сведения добавляются в черновик проекта и сохраняются только при создании проекта. При выборе организации-владельца добавляется удаляемый черновик сведений о владельце проекта, но удаление этих сведений не исключает организацию из числа владельцев.",
  realOrganizationLabel: "Существующая организация",
  externalLanguageLabel: "Язык внешней организации",
  externalLanguageHint:
    "Выберите язык, на котором указаны название и описание этой организации.",
  externalNameLabel: "Название внешней организации",
  externalDescriptionLabel: "Описание внешней организации",
  externalWebsiteLabel: "Веб-сайт внешней организации",
  externalImagePathLabel: "Путь к изображению внешней организации",
  externalImageIsFullPathLabel:
    "Путь к внешнему изображению является полным URL-адресом",
  additionalLanguagesTitle: "Дополнительные языки",
  addLanguageButton: "Добавить язык",
  addAttributionButton: "Добавить сведения в черновик",
  updateAttributionButton: "Обновить сведения",
  editAttributionButton: "Изменить",
  noAttributions:
    "В черновике пока нет публичных сведений. При выборе организации-владельца добавится удаляемый черновик сведений о владельце проекта.",
  removeButton: "Удалить",
  projectOwnerRole: "Владелец проекта",
  sponsorRole: "Спонсор",
  partnerRole: "Партнер",
  realOrganizationSource: "Существующая организация Agora",
  externalOrganizationSource: "Внешняя организация",
  contactTitle: "Контактное лицо для участников",
  contactDescription:
    "Необязательно. Если вы добавите контактные данные, потребуется имя контактного лица и адрес электронной почты или страница для связи по протоколу HTTPS.",
  contactFirstNameLabel: "Имя контактного лица",
  contactLastNameLabel: "Фамилия контактного лица",
  contactRoleLabel: "Роль контактного лица",
  contactEmailLabel: "Электронная почта контактного лица",
  contactWebsiteLabel: "URL-адрес страницы для связи",
  contactImagePathLabel: "Путь к изображению контактного лица",
  contactImageIsFullPathLabel:
    "Путь к изображению контактного лица является полным URL-адресом",
  contactOrganizationLabel: "Организация контактного лица",
  websiteUrlHint:
    "Используйте полный URL-адрес с HTTPS, например https://example.org.",
  websiteUrlError:
    "URL-адрес веб-сайта должен использовать HTTPS и не может содержать встроенные учетные данные.",
  createButton: "Создать проект",
  manageTitle: "Управление проектами",
  manageDescription:
    "Изменяйте слаг проекта и языковые настройки уровня проекта. Каждый раздел сохраняется отдельно.",
  selectProjectLabel: "Проект",
  projectLinkLabel: "Ссылка на проект",
  copyProjectLinkLabel: "Копировать ссылку на проект",
  copyProjectLinkFailed: "Не удалось скопировать ссылку на проект",
  noProjectsMessage:
    "Пока нет проектов для управления. Сначала создайте проект.",
  projectLanguageSettingsLabel: "Языки проекта",
  projectLanguageSettingsDescription:
    "Настройте динамический перевод и дополнительные целевые языки.",
  projectLanguageEntitlementLoadingDescription:
    "Проверяется доступ организации-владельца к динамическому переводу...",
  projectLanguageEntitlementRequiredDescription:
    "Чтобы настроить языки проекта, выберите хотя бы одну организацию-владельца с правом на динамический перевод.",
  autoLanguageLabel: "Автоматически",
  dynamicTranslationEnabledLabel: "Динамический перевод включен",
  dynamicTranslationDisabledLabel: "Динамический перевод выключен",
  saveLanguageSettingsButton: "Сохранить языковые настройки",
  saveButton: "Сохранить изменения",
  saveProjectButton: "Сохранить проект",
  saveSlugButton: "Сохранить слаг",
  slugWarningTitle: "Изменить публичную ссылку?",
  slugWarningDescription:
    "Изменение этого слага может нарушить работу ссылок, которые уже открывали или которыми делились. Продолжайте, только если уверены.",
  confirmSlugChangeButton: "Изменить слаг",
  deleteProjectButton: "Удалить проект",
  deleteProjectTitle: "Удалить проект?",
  deleteProjectDescription: "Этот проект будет удален.",
  confirmDeleteProjectButton: "Подтвердить удаление",
  cancelButton: "Отмена",
  requiredSuffix: "обязательно",
  optionalSuffix: "необязательно",
  dangerZoneTitle: "Опасная зона",
  changeSlugDangerTitle: "Изменить слаг проекта",
  changeSlugDangerDescription:
    "Изменение этого слага может нарушить работу публичных ссылок, которые уже открывали или которыми делились.",
  deleteDangerTitle: "Удалить этот проект",
  deleteDangerDescription: "Удалите этот проект.",
};

export const administratorProjectTranslations: Record<
  SupportedDisplayLanguageCodes,
  AdministratorProjectTranslations
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
