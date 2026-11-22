import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ClosedAnalysisInputTranslations {
  closing: string;
  live: string;
  switchMode: string;
  showing: string;
  pending: string;
  refreshing: string;
  failed: string;
  refreshFailed: string;
  saveFailed: string;
}

export const closedAnalysisInputTranslations = {
  en: {
    closing: "Closing inputs",
    live: "Live inputs",
    switchMode: "Use {mode}",
    showing: "Showing: {served}",
    pending: "Updating {requested}. Still showing {served}.",
    refreshing: "Updating. Showing the last completed result: {served}.",
    failed: "Could not update {requested}. Still showing {served}.",
    refreshFailed:
      "Update failed. Showing the last completed result: {served}.",
    saveFailed: "Could not change inputs.",
  },
  fr: {
    closing: "Données à la clôture",
    live: "Données actuelles",
    switchMode: "Utiliser : {mode}",
    showing: "Affichage : {served}",
    pending: "Mise à jour : {requested}. Affichage actuel : {served}.",
    refreshing: "Mise à jour en cours. Dernier résultat disponible : {served}.",
    failed:
      "Échec de la mise à jour : {requested}. Affichage actuel : {served}.",
    refreshFailed:
      "Échec de la mise à jour. Dernier résultat disponible : {served}.",
    saveFailed: "Impossible de changer les données utilisées.",
  },
  es: {
    closing: "Datos al cierre",
    live: "Datos actuales",
    switchMode: "Usar: {mode}",
    showing: "Mostrando: {served}",
    pending: "Actualizando: {requested}. Se sigue mostrando: {served}.",
    refreshing:
      "Actualización en curso. Último resultado completado: {served}.",
    failed: "No se pudo actualizar: {requested}. Se sigue mostrando: {served}.",
    refreshFailed:
      "La actualización falló. Último resultado completado: {served}.",
    saveFailed: "No se pudieron cambiar los datos utilizados.",
  },
  ar: {
    closing: "مدخلات الإغلاق",
    live: "المدخلات الحالية",
    switchMode: "استخدام: {mode}",
    showing: "المعروض: {served}",
    pending: "جارٍ تحديث {requested}. المعروض حاليًا: {served}.",
    refreshing: "جارٍ التحديث. آخر نتيجة مكتملة معروضة: {served}.",
    failed: "تعذّر تحديث {requested}. المعروض حاليًا: {served}.",
    refreshFailed: "تعذّر التحديث. آخر نتيجة مكتملة معروضة: {served}.",
    saveFailed: "تعذّر تغيير المدخلات.",
  },
  fa: {
    closing: "داده‌های زمان بسته‌شدن",
    live: "داده‌های زنده",
    switchMode: "استفاده از {mode}",
    showing: "در حال نمایش: {served}",
    pending:
      "{requested} در حال به‌روزرسانی است. همچنان {served} نمایش داده می‌شود.",
    refreshing:
      "در حال به‌روزرسانی. آخرین نتیجهٔ کامل نمایش داده می‌شود: {served}.",
    failed:
      "به‌روزرسانی {requested} ممکن نشد. همچنان {served} نمایش داده می‌شود.",
    refreshFailed:
      "به‌روزرسانی ناموفق بود. آخرین نتیجهٔ کامل نمایش داده می‌شود: {served}.",
    saveFailed: "تغییر داده‌های مورد استفاده ممکن نشد.",
  },
  he: {
    closing: "נתוני הסגירה",
    live: "הנתונים העדכניים",
    switchMode: "שימוש ב{mode}",
    showing: "בתצוגה: {served}",
    pending: "בעדכון: {requested}. בינתיים מוצגים {served}.",
    refreshing: "העדכון מתבצע. מוצגת התוצאה האחרונה שחישובה הושלם: {served}.",
    failed: "העדכון נכשל: {requested}. עדיין מוצגים {served}.",
    refreshFailed: "העדכון נכשל. מוצגת התוצאה האחרונה שחישובה הושלם: {served}.",
    saveFailed: "לא ניתן היה לשנות את הנתונים לחישוב.",
  },
  ja: {
    closing: "終了時のデータ",
    live: "最新のデータ",
    switchMode: "{mode}を使う",
    showing: "表示中：{served}",
    pending: "{requested}を更新中です。現在は{served}を表示しています。",
    refreshing:
      "更新中です。最後に集計が完了した結果を表示しています：{served}。",
    failed:
      "{requested}を更新できませんでした。引き続き{served}を表示しています。",
    refreshFailed:
      "更新できませんでした。最後に集計が完了した結果を表示しています：{served}。",
    saveFailed: "集計に使うデータを変更できませんでした。",
  },
  ky: {
    closing: "Жабылгандагы маалыматтар",
    live: "Учурдагы маалыматтар",
    switchMode: "Колдонуу: {mode}",
    showing: "Көрсөтүлүүдө: {served}",
    pending: "Жаңыртылууда: {requested}. Азырынча {served} көрсөтүлүүдө.",
    refreshing:
      "Жаңыртылууда. Акыркы толук эсептелген жыйынтык көрсөтүлүүдө: {served}.",
    failed:
      "Жаңыртуу ишке ашкан жок: {requested}. Азырынча {served} көрсөтүлүүдө.",
    refreshFailed:
      "Жаңыртуу ишке ашкан жок. Акыркы толук эсептелген жыйынтык көрсөтүлүүдө: {served}.",
    saveFailed:
      "Эсептөөгө колдонулуучу маалыматтарды өзгөртүү мүмкүн болгон жок.",
  },
  ru: {
    closing: "Данные на момент закрытия",
    live: "Текущие данные",
    switchMode: "Использовать: {mode}",
    showing: "Показаны: {served}",
    pending: "Обновляются: {requested}. Пока показаны: {served}.",
    refreshing:
      "Идёт обновление. Показан последний готовый результат: {served}.",
    failed: "Не удалось обновить: {requested}. По-прежнему показаны: {served}.",
    refreshFailed:
      "Не удалось обновить. Показан последний готовый результат: {served}.",
    saveFailed: "Не удалось изменить данные для расчёта.",
  },
  "zh-Hans": {
    closing: "结束时的数据",
    live: "实时数据",
    switchMode: "使用{mode}",
    showing: "当前显示：{served}",
    pending: "正在更新{requested}，目前仍显示{served}。",
    refreshing: "正在更新。当前显示上次计算完成的结果：{served}。",
    failed: "无法更新{requested}，仍显示{served}。",
    refreshFailed: "更新失败。当前显示上次计算完成的结果：{served}。",
    saveFailed: "无法更改用于计算的数据。",
  },
  "zh-Hant": {
    closing: "結束時的資料",
    live: "即時資料",
    switchMode: "使用{mode}",
    showing: "目前顯示：{served}",
    pending: "正在更新{requested}，目前仍顯示{served}。",
    refreshing: "正在更新。目前顯示上次計算完成的結果：{served}。",
    failed: "無法更新{requested}，仍顯示{served}。",
    refreshFailed: "更新失敗。目前顯示上次計算完成的結果：{served}。",
    saveFailed: "無法變更用於計算的資料。",
  },
} satisfies Record<
  SupportedDisplayLanguageCodes,
  ClosedAnalysisInputTranslations
>;
