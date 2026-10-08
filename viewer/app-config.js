/** @type {AppTypes.Config} */

// Learrad viewer configuration. Used by the GitHub Actions build (deployed under
// /learrad/viewer/) and by the local test copy in tools/ohif.
//
// Studies are plain .dcm files plus one "DICOM JSON" index per study. Open one with:
//   <viewer>/viewer/dicomjson?url=<absolute URL of the study's JSON index>
const learradBase = '/learrad/viewer';

window.config = {
  name: 'learrad',
  routerBasename: window.location.pathname.startsWith(learradBase) ? learradBase : null,
  extensions: [],
  modes: [],
  customizationService: {},
  showStudyList: false,
  maxNumberOfWebWorkers: 3,
  showWarningMessageForCrossOrigin: false,
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  strictZSpacingForVolumeViewport: true,
  investigationalUseDialog: { option: 'never' },
  maxNumRequests: {
    interaction: 100,
    thumbnail: 5,
    prefetch: 25,
  },
  showErrorDetails: 'always',
  defaultDataSourceName: 'dicomjson',
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomjson',
      sourceName: 'dicomjson',
      configuration: {
        friendlyName: 'Learrad case repos (DICOM JSON)',
        name: 'json',
      },
    },
  ],
};
