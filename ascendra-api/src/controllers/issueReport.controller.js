import {
  createIssueReport,
  listIssueReports,
  getIssueReport,
  updateIssueReport,
} from "../services/issueReport.service.js";

export const createIssueReportController = async (req, res, next) => {
  try {
    await createIssueReport({
      email: req.body.email,
      subject: req.body.subject,
      message: req.body.message,
    });
    res
      .status(201)
      .json({
        message: "Your report has been submitted to the ASCENDRA admin team.",
      });
  } catch (error) {
    next(error);
  }
};
export const listIssueReportsController = async (req, res, next) => {
  try {
    const result = await listIssueReports(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
export const getIssueReportController = async (req, res, next) => {
  try {
    const result = await getIssueReport(req.params.reportId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
export const updateIssueReportController = async (req, res, next) => {
  try {
    const report = await updateIssueReport({
      reportId: req.params.reportId,
      adminId: req.user.userId,
      status: req.body.status,
      expectedRevision: req.body.expectedRevision,
      note: req.body.note,
    });
    res.status(200).json({ report });
  } catch (error) {
    next(error);
  }
};
