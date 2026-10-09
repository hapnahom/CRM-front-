export enum Permissions {
  // Allowance type permissions
  CreateAllowanceType = 'create-allowance-type',
  UpdateAllowanceType = 'update-allowance-type',
  DeleteAllowanceType = 'delete-allowance-type',

  // Benefit type permissions
  CreateBenefitType = 'create-benefit-type',
  UpdateBenefitType = 'update-benefit-type',
  DeleteBenefitType = 'delete-benefit-type',

  // Compensation and Benefit Permissions
  CreateAllowanceEntitlement = 'create-allowance-entitlement',
  UpdateAllowanceEntitlement = 'update-allowance-entitlement',
  DeleteAllowanceEntitlement = 'delete-allowance-entitlement',

  CreateBenefitEntitlement = 'create-benefit-entitlement',
  UpdateBenefitEntitlement = 'update-benefit-entitlement',
  DeleteBenefitEntitlement = 'delete-benefit-entitlement',

  // PayPeriod permissions
  CreatePayPeriod = 'create-pay-period',
  UpdatePayPeriod = 'update-pay-period',
  DeletePayPeriod = 'delete-pay-period',

  // Could not be found Permissions that needs to be changed

  approveAndRejectPlan = 'approve-and-reject-plan',
  editAndDeletePlan = 'edit-and-delete-plan',

  ViewAllEmployeePlan = 'view-all-employee-plan',
  ViewAllPlan = 'view-all-plan',
  ViewAllStatusPlan = 'view-all-status-plan',
  ViewReprimandAndAppreciation = 'view-reprimand-and-appreciation',
  ViewReprimandAndAppreciationDetails = 'view-reprimand-and-appreciation-details',
  EditAppreciationAndReprimand = 'edit-appreciation-and-reprimand',
  DeleteAppreciationAndReprimand = 'delete-appreciation-and-reprimand',
  CreateAppreciation = 'create-appreciation',
  CreateCustomFields = 'create-custom-fields',
  UpdateCustomFields = 'update-custom-fields',
  DeleteCustomFields = 'delete-custom-fields',
  CreateCommentOnPlanAndReport = 'create-comment-on-Plan-and-report',
  UpdateCommentOnPlanAndReport = 'update-comment-on-Plan-and-report',
  DeleteCommentOnPlanAndReport = 'delete-comment-on-Plan-and-report',
  CreateFormCategory = 'create-form-category',
  UpdatePlanningPeriod = 'update-planning-period',
  DeletePlanningPeriod = 'delete-planning-period',
  AssignPlanningPeriod = 'assign-planning-period',
  UpdateAssignedPlanningPeriod = 'update-assigned-planning-period',
  DeleteAssignedPlanningPeriod = 'delete-assigned-planning-period',
  CreateReprimandType = 'create-reprimand-type',
  DeleteReprimandType = 'delete-reprimand-type',
  CreateAppreciationType = 'create-appreciation-type',
  UpdateAppreciationType = 'update-appreciation-type',
  DeleteAppreciationType = 'delete-appreciation-type',
  CreateOkrRule = 'create-okr-rule',

  // OKR Criteria Management
  CreateVpScoringConfigurations = 'create-vp-scoring-configurations',
  UpdateVpScoringConfigurations = 'update-vp-scoring-configurations',
  DeleteVpScoringConfigurations = 'delete-vp-scoring-configurations',

  // OKR Target Assignment
  AssignVpTargets = 'assign-vp-targets',
  UpdateVpTargetsAssignation = 'update-vp-target-assignation',
  DeleteVpTargetsAssignation = 'delete-vp-target-assignation',

  // OKR Edit Access
  GrantAllOKRAccess = 'grant-all-okr-access',

  // Time and Attendance break type settings
  CreateBreakType = 'create-break-type',
  UpdateBreakType = 'update-break-type',
  DeleteBreakType = 'delete-break-type',

  // Time and Attendance time zone settings
  UpdateTimeZone = 'update-time-zone',

  // payroll permission
  PayrollExport = 'payroll-export',
  SendPayslipEmail = 'send-payslip-email',
  GeneratePayroll = 'generate-payroll',
  DeletePayroll = 'delete-payroll',

  // sidebar Permissions

  DownloadOrganizationStructure = 'download-organization-structure',
  ViewOrganizationStructureUsertree = 'view-organization-structure-user-tree',
  ViewOrganizationStructureDepartmentTree = 'view-organization-structure-department-tree',
  ViewOrganizationStructureSetting = 'view-organization-structure-setting',
  ViewManageEmployees = 'view-manage-employees',
  ViewChangeBranchRequestSideBar = 'view-change-branch-request-side-bar',

  UpdateLeaveRequest = 'update-leave-request',
  DeleteLeaveRequest = 'delete-leave-request',
  ViewAttendanceDetails = 'view-attendance-details',
  CreateApprovalWorkFlow = 'create-approval-work-flow',
  CreateApprover = 'create-approver',
  UpdateApprover = 'update-approver',
  DeleteApprover = 'delete-approver',
  CreatePosition = 'create-position',
  UpdatePosition = 'update-position',
  DeletePosition = 'delete-position',
  ApproveCandidate = 'approve-candidate',
  DeclineCandidate = 'decline-candidate',

  // Course Permissions
  UpdateCourse = 'update-course',
  DeleteCourse = 'delete-course',
  CreateCourse = 'create-course',

  // Course Category Permissions
  CreateCourseCategory = 'create-course-category',
  UpdateCourseCategory = 'update-course-category',
  DeleteCourseCategory = 'delete-course-category',

  // TNA Permissions
  CreateTna = 'create-tna',
  UpdateTna = 'update-tna',
  DeleteTna = 'delete-tna',

  // TNA Category Permissions
  CreateTnaCategory = 'create-tna-category',
  UpdateTnaCategory = 'update-tna-category',
  DeleteTnaCategory = 'delete-tna-category',

  // Commitment Rule Permissions
  CreateCommitmentRule = 'create-commitment-rule',
  UpdateCommitmentRule = 'update-commitment-rule',
  DeleteCommitmentRule = 'delete-commitment-rule',

  // Lesson Permissions
  CreateLesson = 'create-lesson',
  UpdateLesson = 'update-lesson',
  DeleteLesson = 'delete-lesson',

  // Course Material Permissions
  CreateCourseMaterial = 'create-course-material',
  UpdateCourseMaterial = 'update-course-material',
  DeleteCourseMaterial = 'delete-course-material',

  // Department Permissions
  CreateDepartment = 'create-department',
  UpdateDepartment = 'update-department',
  DeleteDepartment = 'delete-department',
  MergeDepartment = 'merge-department',
  DissolveDepartment = 'dissolve-department',

  // Branch Permissions
  CreateBranch = 'create-branch',
  UpdateBranch = 'update-branch',
  DeleteBranch = 'delete-branch',

  // Working Schedule Permissions
  CreateWorkingSchedule = 'create-working-schedule',
  UpdateWorkingSchedule = 'update-working-schedule',
  DeleteWorkingSchedule = 'delete-working-schedule',

  // Calendar Permissions
  CreateCalendar = 'create-calendar',
  UpdateCalendar = 'update-calendar',
  DeleteCalendar = 'delete-calendar',

  // Organization Permissions
  AssignWorkingScheduleToOrg = 'assign-working-schedule-organization',
  AssignCalendarToOrg = 'assign-calendar-organization',
  ViewOrgStructureSidebar = 'view-organization-structure-sidebar',

  // Employee Document Permissions
  DownloadEmployeeDocument = 'download-employee-document',
  UploadEmployeeDocuments = 'upload-employee-documents',
  DeleteEmployeeDocument = 'delete-employee-document',

  // Employment and Related Information Permissions
  UpdateEmploymentInformation = 'update-employment-information',
  EndEmployment = 'end-employment',
  DeleteEmployee = 'delete-employee',
  UpdateEmployeeStatus = 'update-employee-status',
  ViewEmployeeDetail = 'view-employee-detail',

  AddOffloadingTasks = 'add-offloading-tasks',
  AddOffloadingTemplateTasks = 'add-offloading-template-tasks',

  CreateEmploymentType = 'create-employment-type',
  DeleteEmploymentType = 'delete-employment-type',
  UpdateEmploymentType = 'update-employment-type',

  RegisterNewEmployee = 'register-new-employee',
  UpdateEmployeeDetails = 'update-employee-details',
  UpdateEmployeeJobInformation = 'update-employee-job-information',

  // Role Permissions
  UpdateRole = 'edit-roles',
  CreateRole = 'create-roles',
  DeleteRole = 'delete-roles',
  AssignRolesToUser = 'assign-roles-to-user',
  RevokeRolesFromUser = 'revoke-roles-from-user',
  ViewUserRoles = 'view-user-roles',
  CreateGroupPermission = 'create-group-permission',
  UpdateGroupPermission = 'update-group-permission',
  DeleteGroupPermission = 'delete-group-permission',
  UpdateRoleForUser = 'update-role-for-user',

  // Leave and Attendance Permissions
  CreateAttendanceRuleType = 'create-attendance-rule-type',
  UpdateAttendanceRuleType = 'update-attendance-rule-type',
  DeleteAttendanceRuleType = 'delete-attendance-rule-type',
  CreateCarryOverRule = 'create-carry-over-rule',
  UpdateCarryOverRule = 'update-carry-over-rule',
  DeleteCarryOverRule = 'delete-carry-over-rule',
  CreateLeaveType = 'create-leave-type',
  UpdateLeaveType = 'update-leave-type',
  DeleteLeaveType = 'delete-leave-type',
  DownloadEmployeeLeaveInformation = 'download-employee-leave-information',
  UploadLeaveJustification = 'upload-leave-justification',
  ApproveLeaveJustification = 'approve-leave-justification',
  DeclineLeaveJustification = 'decline-leave-justification',
  CreateAttendanceRule = 'create-attendance-rule',
  UpdateAttendanceRule = 'update-attendance-rule',
  DeleteAttendanceRule = 'delete-attendance-rule',
  CreateLeaveAccrualPeriod = 'create-leave-accrual-period',
  UpdateLeaveAccrualPeriod = 'update-leave-accrual-period',
  DeleteLeaveAccrualPeriod = 'delete-leave-accrual-period',
  ApproveEmployeeLeaveRequest = 'approve-employee-leave-request',
  DeclineEmployeeLeaveRequest = 'decline-employee-leave-request',
  ViewLeaveAvailability = 'view-leave-availability',
  GenerateLeaveReports = 'generate-leave-reports',
  ImportEmployeeAttendanceInformation = 'import-employee-attendance-information',
  ExportEmployeeAttendanceInformation = 'export-employee-attendance-information',
  ApproveEmployeeAttendanceInformation = 'approve-employee-attendance-information',
  CreateLeaveAccrual = 'create-leave-accrual',
  UpdateLeaveAccrual = 'update-leave-accrual',
  DeleteLeaveAccrual = 'delete-leave-accrual',
  CreateClosedDate = 'create-closed-date',
  DeleteClosedDate = 'delete-closed-date',
  UpdateClosedDate = 'update-closed-date',
  SetExpirationRule = 'set-expiration-rule',
  CreateApproverRoleInRuleSettings = 'create-approver-role-rule-settings',
  UpdateApproverRoleInRuleSettings = 'update-approver-role-rule-settings',
  DeleteApproverRoleInRuleSettings = 'delete-approver-role-rule-settings',
  CheckInRemotely = 'check-in-remotely',
  CheckOutRemotely = 'check-out-remotely',
  ViewCurrentLeaveStatus = 'view-current-leave-status',
  ViewLeaveHistory = 'view-leave-history',
  SubmitLeaveRequest = 'submit-leave-request',
  GenerateAttendanceReports = 'generate-attendance-reports',

  // OKR Permissions
  ViewTeamOkr = 'view-team-okr',
  ViewCompanyOkr = 'view-company-okr',
  UpdateObjectives = 'update-objectives',
  UpdateKeyResults = 'update-key-results',
  DeleteOkrRule = 'delete-okr-rule',
  UpdateOkrRule = 'update-okr-rule',
  ViewOkrReports = 'view-okr-reports',
  DeleteKeyResults = 'delete-key-results',
  DeleteObjectives = 'delete-objectives',

  // Talent Pool Permissions
  CreateTalentPool = 'create-talent-pool',
  UpdateTalentPool = 'update-talent-pool',
  DeleteTalentPool = 'delete-talent-pool',
  CreateTalentPoolCategory = 'create-talent-pool-category',
  DeleteTalentPoolCategory = 'delete-talent-pool-category',
  UpdateTalentPoolCategory = 'update-talent-pool-category',

  // Candidate Permissions
  CreateCandidate = 'create-candidate',
  UpdateCandidate = 'update-candidate',
  DeleteCandidate = 'delete-candidate',
  TransferCandidate = 'transfer-candidate',
  ReviewApplicationStage = 'review-application-stage',
  RecordCandidateReport = 'record-candidate-report',

  // Recruitment and Onboarding
  CreateJobDescription = 'create-job-description',
  UpdateJobDescription = 'update-job-description',
  DeleteJobDescription = 'delete-job-description',
  CreateApplicationStage = 'create-application-stage',
  UpdateApplicationStage = 'update-application-stage',
  DeleteApplicationStage = 'delete-application-stage',

  // Reprimand Permissions
  CreateReprimand = 'create-reprimand',
  UpdateReprimandType = 'update-reprimand-type',

  // Performance Review Permissions
  CreatePerformanceReview = 'create-performance-review',
  UpdatePerformanceReview = 'update-performance-review',
  DeletePerformanceReview = 'delete-performance-review',

  // Form Category Permissions
  DeleteFormCategory = 'delete-form-category',
  UpdateFormCategory = 'update-form-category',

  // Template Questions Permissions
  CreateTemplateQuestions = 'create-template-questions',
  UpdateTemplateQuestions = 'update-template-questions',
  DeleteTemplateQuestions = 'delete-template-questions',

  // Allowed Area Permissions
  CreateAllowedArea = 'create-allowed-area',
  UpdateAllowedArea = 'update-allowed-area',
  DeleteAllowedArea = 'delete-allowed-area',

  // Miscellaneous Permissions
  SetMaximumCarryOverLimit = 'set-maximum-carry-over-limit',

  //Conversation

  createConversationSet = 'create-conversation-set',
  DeleteConversationSet = 'delete-conversation-set',
  EditConversationSet = 'edit-conversation-set',

  CreateConversationType = 'create-conversation-type',

  //Recognition
  //Recognition
  CreateRecognition = 'create-recognition',
  DeleteRecognition = 'delete-recognition',
  EditRecognition = 'edit-recognition',

  AddRecognitionCriteria = 'create-recognition-criteria',
  DeleteRecognitionCriteria = 'delete-recognition-criteria',
  EditRecognitionCriteria = 'edit-recognition-criteria',
  // //oneToOne
  // CreateOneToOne = 'create-one-to-one',
  // DeleteOneToOne = 'delete-one-to-one',
  // EditOneToOne = 'edit-one-to-one',

  // feedback
  CreateFeedback = 'create-feedback',
  DeleteFeedack = 'delete-feedback',
  EditFeedack = 'edit-feedback',
  ViewAllEmployeeFeedback = 'view-all-employees-feedback',

  // //recognition
  // CreateRecognitionType = 'create-recognition-type',
  // DeleteRecognitionType = 'delete-recognition-type',
  // EditRecognitionType = 'edit-recognition-type',

  //profile
  ChangePassword = 'change-password',
  ChangeProfileImage = 'change-profile-image',
  ChangeManagerProfile = 'change-manager-profile',

  //planning
  ViewDailyPlan = 'view-daily-plan',
  ViewWeeklyPlan = 'view-weekly-plan',
  ViewMonthlyPlan = 'view-monthly-plan',

  //basic Salary
  CreateBasicSalary = 'create-basic-salary',
  UpdateBasicSalary = 'update-basic-salary',
}
