import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Modular Afaan Oromoo translations
import omCommon from './locales/om/common.json';
import omNav from './locales/om/nav.json';
import omDashboard from './locales/om/dashboard.json';
import omPayments from './locales/om/payments.json';
import omPenalties from './locales/om/penalties.json';
import omMembers from './locales/om/members.json';
import omAdmin from './locales/om/admin.json';
import omAuditor from './locales/om/auditor.json';
import omPublic from './locales/om/public.json';
import omNotifications from './locales/om/notifications.json';

// Modular English translations
import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enDashboard from './locales/en/dashboard.json';
import enPayments from './locales/en/payments.json';
import enPenalties from './locales/en/penalties.json';
import enMembers from './locales/en/members.json';
import enAdmin from './locales/en/admin.json';
import enAuditor from './locales/en/auditor.json';
import enPublic from './locales/en/public.json';
import enNotifications from './locales/en/notifications.json';

// Direct legacy / flat string mappings for 100% backward compatibility
const omLegacyMap: Record<string, string> = {
  'Back to Home': "Fuula Jalqabaatti Deebi'i",
  'Member Records': 'Galmee Miseensotaa',
  'Penalties & Fines': 'Adabbiiwwan fi Kaffaltii',
  'Audit & History': 'Oditii fi Seenaa',
  'Team Management': 'Bulchiinsa Koree',
  'Public Content': 'Qabiyyee Ummataa',
  'Payments & Contributions': 'Kaffaltiiwwan fi Gumaacha',
  'My Profile': 'Profaayilii Koo',
  'Dashboard': 'Daashboordii',
  'Home': 'Mana',
  'About': "Waa'ee Keenya",
  'Payment': 'Kaffaltii',
  'Payments': 'Kaffaltiiwwan',
  'Contact': 'Qunnamtii',
  'Members': 'Miseensota',
  'Reports': 'Gabaasawwan',
  'Settings': 'Qindaa\'ina',
  'Notifications': 'Beeksisawwan',
  'Save': "Olkaa'i",
  'Cancel': 'Dhiisi',
  'Submit': 'Galchi',
  'Logout': "Ba'i",
};

const enLegacyMap: Record<string, string> = {
  'Back to Home': 'Back to Home',
  'Member Records': 'Member Records',
  'Penalties & Fines': 'Penalties & Fines',
  'Audit & History': 'Audit & History',
  'Team Management': 'Team Management',
  'Public Content': 'Public Content',
  'Payments & Contributions': 'Payments & Contributions',
  'My Profile': 'My Profile',
  'Dashboard': 'Dashboard',
  'Home': 'Home',
  'About': 'About',
  'Payment': 'Payment',
  'Payments': 'Payments',
  'Contact': 'Contact',
  'Members': 'Members',
  'Reports': 'Reports',
  'Settings': 'Settings',
  'Notifications': 'Notifications',
  'Save': 'Save',
  'Cancel': 'Cancel',
  'Submit': 'Submit',
  'Logout': 'Logout',
};

const omCombined = {
  ...omCommon,
  ...omNav,
  ...omDashboard,
  ...omPayments,
  ...omPenalties,
  ...omMembers,
  ...omAdmin,
  ...omAuditor,
  ...omPublic,
  ...omNotifications,
  ...omLegacyMap,
};

const enCombined = {
  ...enCommon,
  ...enNav,
  ...enDashboard,
  ...enPayments,
  ...enPenalties,
  ...enMembers,
  ...enAdmin,
  ...enAuditor,
  ...enPublic,
  ...enNotifications,
  ...enLegacyMap,
};

const resources = {
  om: {
    translation: omCombined,
  },
  en: {
    translation: enCombined,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('language') || 'om',
  fallbackLng: 'om',
  interpolation: { escapeValue: false },
});

export default i18n;
