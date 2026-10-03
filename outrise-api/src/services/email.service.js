import AppError from "../errors/AppError.js";
import BadRequestError from "../errors/BadRequestError.js";

const DEFAULT_FROM = "Outrise Support <support@outrisefitness.com>";

export function getSupportEmailConfig() {
  if (!process.env.RESEND_API_KEY?.trim()) {
    throw new AppError("Email sending is not configured on the server.", 503);
  }
  return {
    from: process.env.EMAIL_FROM?.trim() || DEFAULT_FROM,
    templateId: process.env.RESEND_SUPPORT_TEMPLATE?.trim() || "support-update",
  };
}

function escapeText(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function supportEmailVariables({ recipientName, subject, message }) {
  // Resend's triple-brace template variables insert HTML. Only the line breaks
  // below are markup; names, headings and admin responses remain escaped text.
  const variables = {
    RECIPIENT_NAME: escapeText(recipientName || "there"),
    SUBJECT: escapeText(subject),
    MESSAGE: escapeText(message).replace(/\r\n|\r|\n/g, "<br>"),
  };
  if (Object.values(variables).some((value) => value.length > 2000)) {
    throw new BadRequestError("The reply is too long after email formatting. Shorten it before sending.");
  }
  return variables;
}

export async function sendSupportEmail(reply) {
  getSupportEmailConfig();
  let response, result;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": reply.idempotencyKey,
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        from: reply.from,
        to: [reply.to],
        subject: reply.subject,
        template: { id: reply.templateId, variables: supportEmailVariables(reply) },
      }),
    });
    result = await response.json();
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new AppError("The email's send status could not be confirmed. Retry this same reply from its email history.", 502);
  }
  if (!response.ok) {
    const message = response.status === 429
      ? "Resend's email limit was reached. Wait a moment and retry this reply."
      : response.status >= 500 || result.name === "concurrent_idempotent_requests"
        ? "The email's send status could not be confirmed. Retry this same reply from its email history."
        : "Resend could not send the email. Check the API key, verified domain, published support-update template and its variables, then retry this reply.";
    // Do not expose provider responses, credentials or request contents.
    throw new AppError(message, 502);
  }
  if (typeof result.id !== "string" || !result.id) {
    throw new AppError("The email's send status could not be confirmed. Retry this same reply from its email history.", 502);
  }
  return result.id;
}

export function getPasswordResetEmailConfig() {
  if (!process.env.RESEND_API_KEY?.trim()) {
    throw new AppError("Email sending is not configured on the server.", 503);
  }
  return {
    from: process.env.EMAIL_FROM?.trim() || DEFAULT_FROM,
    templateId: process.env.RESEND_PASSWORD_RESET_TEMPLATE?.trim() || "password-reset",
  };
}

export function getEmailVerificationEmailConfig() {
  if (!process.env.RESEND_API_KEY?.trim()) {
    throw new AppError("Email sending is not configured on the server.", 503);
  }
  return {
    from: process.env.EMAIL_FROM?.trim() || DEFAULT_FROM,
    templateId: process.env.RESEND_EMAIL_VERIFICATION_TEMPLATE?.trim() || "email-verification",
  };
}

function authEmailFailure(reason, httpStatus = null, providerCode = null) {
  const error = new AppError("Account email could not be sent.", 502);
  // Only fixed diagnostic labels are attached; provider messages can include
  // personal data and must never be logged or returned to the client.
  error.deliveryFailure = { reason, httpStatus, providerCode };
  return error;
}

function classifyAuthEmailFailure(response, result) {
  const knownCodes = new Set([
    "validation_error", "missing_api_key", "invalid_api_key", "restricted_api_key",
    "invalid_permission", "suspended_api_key", "not_found", "invalid_parameter",
    "missing_required_field", "missing_required_parameter", "rate_limit_exceeded",
    "daily_quota_exceeded", "monthly_quota_exceeded", "application_error",
    "service_unavailable", "invalid_idempotency_key", "invalid_idempotent_request",
    "concurrent_idempotent_requests",
  ]);
  const providerCode = knownCodes.has(result?.name) ? result.name : null;
  const message = typeof result?.message === "string" ? result.message : "";
  let reason;
  if (/template/i.test(message) && /not found|does not exist|not exist|could not find/i.test(message)) {
    reason = "TEMPLATE_NOT_FOUND";
  } else if (/template/i.test(message) && /publish|draft/i.test(message)) {
    reason = "TEMPLATE_NOT_PUBLISHED";
  } else if (/variable/i.test(message)) {
    reason = "TEMPLATE_VARIABLES_INVALID";
  } else if (response.status === 401 || /api_key|permission/.test(providerCode || "")) {
    reason = "API_KEY_OR_PERMISSION";
  } else if (response.status === 403) {
    reason = "SENDER_DOMAIN_OR_PERMISSION";
  } else if (response.status === 429) {
    reason = "RATE_LIMIT_OR_QUOTA";
  } else if (response.status >= 500) {
    reason = "RESEND_UNAVAILABLE";
  } else {
    reason = "EMAIL_REQUEST_REJECTED";
  }
  return authEmailFailure(reason, response.status, providerCode);
}

async function sendAuthEmail(payload, idempotencyKey, config = getPasswordResetEmailConfig()) {
  let response, result;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ from: config.from, ...payload }),
    });
    result = await response.json();
  } catch (error) {
    const reason = error.name === "TimeoutError" || error.name === "AbortError"
      ? "NETWORK_TIMEOUT"
      : response ? "INVALID_PROVIDER_RESPONSE" : "NETWORK_FAILURE";
    throw authEmailFailure(reason, response?.status);
  }
  if (!response.ok) throw classifyAuthEmailFailure(response, result);
  if (typeof result?.id !== "string" || !result.id) {
    throw authEmailFailure("MISSING_EMAIL_ID", response.status);
  }
  return result.id;
}

export async function sendPasswordResetEmail({ to, recipientName, code, expiresInMinutes, resetId }) {
  const config = getPasswordResetEmailConfig();
  return sendAuthEmail({
    to: [to],
    subject: "Reset your Outrise password",
    template: {
      id: config.templateId,
      variables: {
        RECIPIENT_NAME: escapeText(recipientName || "there").slice(0, 2000),
        RESET_CODE: code,
        EXPIRES_IN_MINUTES: String(expiresInMinutes),
      },
    },
  }, `password-reset/${resetId}`);
}

export async function sendPasswordChangedEmail({ to, resetId }) {
  return sendAuthEmail({
    to: [to],
    subject: "Your Outrise password was changed",
    text: "Your Outrise password was just reset. Sign in using your new password. If you did not make this change, use Forgot password to secure your account and Report an issue on the sign-in screen to contact the admin team.",
  }, `password-changed/${resetId}`);
}

export async function sendEmailVerificationEmail({ to, recipientName, code, expiresInMinutes, verificationId }) {
  const config = getEmailVerificationEmailConfig();
  return sendAuthEmail({
    to: [to],
    subject: "Verify your Outrise email",
    template: {
      id: config.templateId,
      variables: {
        RECIPIENT_NAME: escapeText(recipientName || "there").slice(0, 2000),
        VERIFICATION_CODE: String(code),
        EXPIRES_IN_MINUTES: String(expiresInMinutes),
      },
    },
  }, `email-verification/${verificationId}`, config);
}
