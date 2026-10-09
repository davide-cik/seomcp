/** Link alla documentazione, in un solo punto per poterli aggiornare facilmente. */
const REPO = 'https://github.com/davide-cik/seomcp/blob/main';

export const DOCS = {
  home: 'https://seomcp.contentisking.guru',
  credentials: 'https://seomcp.contentisking.guru/credenziali/',
  google: `${REPO}/docs/google-setup.md`,
  bing: `${REPO}/docs/bing-setup.md`,
  pagespeed: `${REPO}/docs/pagespeed-setup.md`,
};

/** Come si avvia seomcp dalla configurazione dell'assistente. Diventerà @contentisking/seomcp con il pacchetto npm. */
export const PACKAGE_SPEC = 'github:davide-cik/seomcp';

const GCP = 'https://console.cloud.google.com';

/** API di Google Cloud usate da seomcp. */
export const GOOGLE_APIS = [
  'searchconsole.googleapis.com',
  'analyticsdata.googleapis.com',
  'analyticsadmin.googleapis.com',
  'chromeuxreport.googleapis.com',
  'pagespeedonline.googleapis.com',
];

/** Pagine delle console di Google e Bing usate dalla configurazione guidata e dal sito. */
export const CONSOLE = {
  createProject: `${GCP}/projectcreate`,
  enableApis: `${GCP}/flows/enableapi?apiid=${GOOGLE_APIS.join(',')}`,
  createServiceAccount: `${GCP}/projectselector/iam-admin/serviceaccounts/create`,
  serviceAccounts: `${GCP}/iam-admin/serviceaccounts`,
  credentials: `${GCP}/apis/credentials`,
  oauthBranding: `${GCP}/auth/branding`,
  oauthAudience: `${GCP}/auth/audience`,
  oauthClients: `${GCP}/auth/clients`,
  searchConsoleUsers: 'https://search.google.com/search-console/users',
  analyticsAdmin: 'https://analytics.google.com/analytics/web/#/?pagename=admin',
  googlePermissions: 'https://myaccount.google.com/linkedapps',
  bingWebmaster: 'https://www.bing.com/webmasters/',
};
