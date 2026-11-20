/**
 * Bridge Wonder V27 — optional GitHub-owned UI transport.
 *
 * Applies only to the private Staff Administration Apps Script project, never Public Registration.
 * All functions here delegate to existing Code.gs / Payroll.gs authorization.
 * IMPORTANT: this IS a Google Apps Script HTTP API. It must NOT be deployed if all APIs are disallowed.
 *
 * Google ContentService's redirect/CORS and current public web app accessibility
 * must be tested on real browser/accounts before activating this mode.
 */
const BW27_METHODS_ = Object.freeze({
  staffLoginStart: staffLoginStart,
  staffLoginVerify: staffLoginVerify,
  staff23PasswordLogin: staff23PasswordLogin,
  staff23PasswordStartEnrollment: staff23PasswordStartEnrollment,
  staff23PasswordCompleteEnrollment: staff23PasswordCompleteEnrollment,
  staff30IssueTemporaryPassword: staff30IssueTemporaryPassword,
  staff30ChangeOwnPassword: staff30ChangeOwnPassword,
  staffCurrentUser: staffCurrentUser,
  staffLogout: staffLogout,
  staffDashboard: staffDashboard,
  staffListInquiries: staffListInquiries,
  staffUpdateInquiry: staffUpdateInquiry,
  staffListRegistrations: staffListRegistrations,
  staffListClasses: staffListClasses,
  staff22GetCourseSettings: staff22GetCourseSettings,
  staff22SaveCourseSettings: staff22SaveCourseSettings,
  staffSaveClass: staffSaveClass,
  staffListRoster: staffListRoster,
  staffListAttendance: staffListAttendance,
  staffSaveAttendance: staffSaveAttendance,
  staffListUsers: staffListUsers,
  staffSaveUser: staffSaveUser,
  staff24SavePermissions: staff24SavePermissions,
  staff24ResetPermissions: staff24ResetPermissions,
  staffListAudit: staffListAudit,
  staffBackupNow: staffBackupNow,
  staffListOperations: staffListOperations,
  staffSaveOperation: staffSaveOperation,
  staffListTuition: staffListTuition,
  staffAppendTuition: staffAppendTuition,
  staffListDailyChecks: staffListDailyChecks,
  staffSaveDailyCheck: staffSaveDailyCheck,
  staffListHandoffs: staffListHandoffs,
  staffSaveHandoff: staffSaveHandoff,
  staffListStaffCompliance: staffListStaffCompliance,
  staffSaveStaffCompliance: staffSaveStaffCompliance,
  staffDocTypes: staffDocTypes,
  staffDocHistory: staffDocHistory,
  staffDocSources: staffDocSources,
  staffDocPreview: staffDocPreview,
  staffDocGenerate: staffDocGenerate,
  staffDocDownload: staffDocDownload,
  staffDocSend: staffDocSend,
  staff20Capacity: staff20Capacity,
  staff20SetCapacity: staff20SetCapacity,
  staff20Waitlist: staff20Waitlist,
  staff20SaveWaitlist: staff20SaveWaitlist,
  staff20Makeups: staff20Makeups,
  staff20SaveMakeup: staff20SaveMakeup,
  staff20Themes: staff20Themes,
  staff20SaveTheme: staff20SaveTheme,
  staff20ActionCenter: staff20ActionCenter,
  payrollCommand: payrollCommand
});
const BW27_MAX_BODY_ = 350000;
function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents;
    if (typeof body !== 'string' || body.length > BW27_MAX_BODY_) throw Error('요청 크기가 허용 범위를 벗어났습니다.');
    const request = JSON.parse(body);
    if (!request || typeof request !== 'object' || Array.isArray(request) || request.protocol !== 'BW_STAFF_V27') throw Error('요청 형식이 올바르지 않습니다.');
    if (request.method === 'bridgeHealth') return bw27Json_({ok:true,value:{version:'27.0.0',transport:'google-apps-script'}});
    if (typeof request.method !== 'string' || !Object.prototype.hasOwnProperty.call(BW27_METHODS_,request.method))
      throw Error('허용되지 않은 업무 요청입니다.');
    if (!Array.isArray(request.args) || request.args.length > 8) throw Error('전달된 인수가 올바르지 않습니다.');
    const result = BW27_METHODS_[request.method].apply(null,request.args);
    return bw27Json_({ok:true,value:result === undefined ? null : result});
  } catch (err) {
    const message = String(err && err.message || '요청 처리 중 오류가 발생했습니다.').slice(0,250);
    return bw27Json_({ok:false,message:message});
  }
}
function bw27Json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
