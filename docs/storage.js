// The only place that knows where a user's work is kept.
//
// Phase 1–2: the browser's localStorage. Phase 3: swap the three functions below for
// Firestore calls; every caller already treats them as asynchronous.
//
// One record per case ("attempt"):
//   { schema, caseId, report, confidence, callClinician,
//     status: 'draft' | 'submitted', updatedAt, submittedAt }
var LearradStore = (function () {
  var SCHEMA = 1;
  var PREFIX = 'learrad:v' + SCHEMA + ':attempt:';

  function read(caseId) {
    try {
      var raw = localStorage.getItem(PREFIX + caseId);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function write(caseId, fields, status) {
    var existing = read(caseId) || {};
    var now = new Date().toISOString();
    var record = {
      schema: SCHEMA,
      caseId: caseId,
      report: fields.report,
      confidence: fields.confidence,
      callClinician: !!fields.callClinician,
      status: status,
      updatedAt: now,
      submittedAt: status === 'submitted' ? now : existing.submittedAt || null,
    };
    localStorage.setItem(PREFIX + caseId, JSON.stringify(record));
    return record;
  }

  return {
    // Resolves to the saved attempt for a case, or null.
    getAttempt: function (caseId) {
      return Promise.resolve(read(caseId));
    },

    // Saves work in progress. A submitted attempt is never turned back into a draft.
    saveDraft: function (caseId, fields) {
      var existing = read(caseId);
      if (existing && existing.status === 'submitted') {
        return Promise.resolve(existing);
      }
      try {
        return Promise.resolve(write(caseId, fields, 'draft'));
      } catch (error) {
        return Promise.reject(error);
      }
    },

    // Locks the report in as the user's answer for this case.
    submit: function (caseId, fields) {
      try {
        return Promise.resolve(write(caseId, fields, 'submitted'));
      } catch (error) {
        return Promise.reject(error);
      }
    },
  };
})();
