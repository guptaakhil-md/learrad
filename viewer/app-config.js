/** @type {AppTypes.Config} */

// Learrad viewer configuration. Used by the GitHub Actions build (deployed under
// /learrad/viewer/) and by the local test copy in tools/ohif.
//
// Studies are plain .dcm files plus one "DICOM JSON" index per study. Open one with:
//   <viewer>/viewer/dicomjson?url=<absolute URL of the study's JSON index>
const learradBase = '/learrad/viewer';

// Single click on a series thumbnail loads it into the active viewport.
// OHIF 3.13 only has a customization hook for double-click (single click is a
// hard-coded no-op in its study panel), so a single click is forwarded as a
// double-click. Drag and drop is untouched: a drag does not produce a click.
// Capture phase is needed because OHIF stops the click from bubbling.
document.addEventListener(
  'click',
  function (event) {
    if (event.detail !== 1 || !event.isTrusted || !event.target.closest) {
      return;
    }
    const thumbnail = event.target.closest('[data-cy="study-browser-thumbnail"]');
    if (!thumbnail) {
      return;
    }
    setTimeout(function () {
      thumbnail.dispatchEvent(
        new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window })
      );
    }, 0);
  },
  true
);

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
