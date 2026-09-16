"use strict";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validationError = () => {
  const error = new Error("validation_error");
  error.code = "validation_error";
  return error;
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireText = (value, minimum, maximum) => {
  if (typeof value !== "string") {
    throw validationError();
  }

  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    throw validationError();
  }

  return normalized;
};

const parseInviteEditorPayload = (value) => {
  if (!isRecord(value)) {
    throw validationError();
  }

  const email = requireText(value.email, 3, 254);
  const displayName = requireText(value.displayName, 1, 120);
  if (!EMAIL_PATTERN.test(email)) {
    throw validationError();
  }

  return { email, displayName };
};

const parseDeactivatePayload = (value) => {
  if (!isRecord(value)) {
    throw validationError();
  }

  const userId = requireText(value.userId, 36, 36);
  const reason = requireText(value.reason, 1, 240);
  if (!UUID_PATTERN.test(userId)) {
    throw validationError();
  }

  return { userId, reason };
};

module.exports = {
  parseDeactivatePayload,
  parseInviteEditorPayload,
};
