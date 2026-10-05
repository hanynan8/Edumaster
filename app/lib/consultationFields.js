// PATH: app/lib/consultationFields.js
//
// الحقول الإجبارية في فورم "بيانات الطالب وطلب الاستشارة" — مشتركة بين الواجهة
// (ConsultationForm: علامة * وتمييز الحقول الناقصة) والسيرفر (validateConsultationPayload
// في app/api/data/route.js) عشان القايمة تفضل واحدة في الاتنين.
//
// كل الحقول إجبارية ما عدا قسم "المعلومات الإضافية" (howDidYouHear / الملاحظات /
// المرفق). واستثنينا كمان 3 حقول اختيارية بطبيعتها:
//   - whatsapp: مكتوب في الفورم "(إن وجد)"
//   - certificateGradeDate + languageCertificates: الطالب ممكن مايكونش معاه شهادة لغة

// مقسّمة حسب قسم الفورم (عشان نفتح القسم تلقائيًا لو فيه حقل ناقص)
export const CONSULTATION_SECTION_FIELDS = {
  personal: [
    "firstName", "lastName", "gender", "dob", "nationality", "countryOfResidence",
    "city", "maritalStatus", "passportNumber", "passportExpiry",
  ],
  contact: ["email", "phone", "preferredContact"],
  services: ["service"],
  schedule: ["preferredDate", "preferredTimeSlot"],
  academic: [
    "highestQualification", "major", "institutionName", "institutionCountry",
    "graduationYear", "finalGrade", "studyLanguage",
  ],
  language: ["spanishLevel", "englishLevel"],
  preferences: ["desiredCountry", "programType", "desiredField", "preferredIntake"],
  visa: ["previousSchengenApplication", "previousVisaRejection", "currentValidVisa"],
  financial: ["annualBudget", "fundingSource"],
  // الموافقة على سياسة الخصوصية (checkbox) — بتتحقق منها الواجهة والسيرفر منفصلة
  additional: ["privacyConsent"],
};

// القايمة المسطحة للحقول النصية الإجبارية (بترتيب ظهورها في الفورم)
export const CONSULTATION_REQUIRED_FIELDS = Object.values(CONSULTATION_SECTION_FIELDS)
  .flat()
  .filter((k) => k !== "privacyConsent");