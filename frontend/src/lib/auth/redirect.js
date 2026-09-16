const AUTH_CALLBACK_PATH = "/auth/callback";
const PASSWORD_UPDATE_PATH = "/staff/update-password";

const safeNextPath = (candidate, fallback = "/staff") => {
  if (typeof candidate !== "string" || !candidate.startsWith("/")) {
    return fallback;
  }

  if (candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }

  try {
    const url = new URL(candidate, "https://rinegetan.invalid");
    return url.origin === "https://rinegetan.invalid"
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
};

const isPublicAuthPath = (pathname) =>
  pathname === "/staff/login" ||
  pathname === "/staff/forgot-password" ||
  pathname === PASSWORD_UPDATE_PATH ||
  pathname === AUTH_CALLBACK_PATH;

const isProtectedStaffPath = (pathname) =>
  pathname === "/staff" || pathname.startsWith("/staff/");

module.exports = {
  AUTH_CALLBACK_PATH,
  PASSWORD_UPDATE_PATH,
  isProtectedStaffPath,
  isPublicAuthPath,
  safeNextPath,
};
