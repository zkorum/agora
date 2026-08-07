import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface FooterBarTranslations {
  home: string;
  explore: string;
  dings: string;
  footerNavigation: string;
  navigateTo: string;
}

export const footerBarTranslations: Record<
  SupportedDisplayLanguageCodes,
  FooterBarTranslations
> = {
  en: {
    home: "Home",
    explore: "Explore",
    dings: "Dings",
    footerNavigation: "Footer navigation",
    navigateTo: "Navigate to {destination}",
  },
  ar: {
    home: "الرئيسية",
    explore: "استكشاف",
    dings: "التنبيهات",
    footerNavigation: "التنقل في تذييل الصفحة",
    navigateTo: "الانتقال إلى {destination}",
  },
  es: {
    home: "Inicio",
    explore: "Explorar",
    dings: "Dings",
    footerNavigation: "Navegación del pie de página",
    navigateTo: "Ir a {destination}",
  },
  fa: {
    home: "خانه",
    explore: "کاوش",
    dings: "Dings",
    footerNavigation: "پیمایش پاورقی",
    navigateTo: "رفتن به {destination}",
  },
  fr: {
    home: "Accueil",
    explore: "Explorer",
    dings: "Dings",
    footerNavigation: "Navigation du pied de page",
    navigateTo: "Accéder à {destination}",
  },
  "zh-Hans": {
    home: "首页",
    explore: "探索",
    dings: "Dings",
    footerNavigation: "页脚导航",
    navigateTo: "前往{destination}",
  },
  "zh-Hant": {
    home: "首頁",
    explore: "探索",
    dings: "Dings",
    footerNavigation: "頁尾導覽",
    navigateTo: "前往{destination}",
  },
  he: {
    home: "דף הבית",
    explore: "גילוי",
    dings: "Dings",
    footerNavigation: "ניווט בתחתית הדף",
    navigateTo: "מעבר אל {destination}",
  },
  ja: {
    home: "ホーム",
    explore: "探索",
    dings: "Dings",
    footerNavigation: "フッターナビゲーション",
    navigateTo: "{destination}に移動",
  },
  ky: {
    home: "Башкы бет",
    explore: "Изилдөө",
    dings: "Dings",
    footerNavigation: "Төмөнкү навигация",
    navigateTo: "{destination} бөлүмүнө өтүү",
  },
  ru: {
    home: "Главная",
    explore: "Обзор",
    dings: "Dings",
    footerNavigation: "Навигация в нижней части страницы",
    navigateTo: "Перейти к разделу «{destination}»",
  },
};
