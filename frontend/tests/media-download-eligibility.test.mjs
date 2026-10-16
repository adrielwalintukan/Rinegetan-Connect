import test from "node:test";
import assert from "node:assert/strict";
import {
  isMediaAssetDownloadEligible,
  isMediaAlbumDownloadEligible,
} from "../src/lib/media/eligibility.mjs";

test("eligibility: permits valid published asset with consent and public download enabled", () => {
  const asset = {
    status: "published",
    consent_status: "approved",
    hidden_at: null,
    public_download_enabled: true,
    subject_age_group: "general",
  };
  assert.equal(isMediaAssetDownloadEligible(asset), true);
});

test("eligibility: blocks asset if public_download_enabled is false", () => {
  const asset = {
    status: "published",
    consent_status: "approved",
    hidden_at: null,
    public_download_enabled: false,
    subject_age_group: "general",
  };
  assert.equal(isMediaAssetDownloadEligible(asset), false);
});

test("eligibility: blocks asset if hidden_at is set", () => {
  const asset = {
    status: "published",
    consent_status: "approved",
    hidden_at: new Date().toISOString(),
    public_download_enabled: true,
    subject_age_group: "general",
  };
  assert.equal(isMediaAssetDownloadEligible(asset), false);
});

test("eligibility: blocks child photo without approved consent even if published", () => {
  const asset = {
    status: "published",
    consent_status: "pending",
    hidden_at: null,
    public_download_enabled: true,
    subject_age_group: "child",
  };
  assert.equal(isMediaAssetDownloadEligible(asset), false);
});

test("eligibility: permits child photo with approved consent", () => {
  const asset = {
    status: "published",
    consent_status: "approved",
    hidden_at: null,
    public_download_enabled: true,
    subject_age_group: "child",
  };
  assert.equal(isMediaAssetDownloadEligible(asset), true);
});

test("album eligibility: permits published album with public download enabled", () => {
  const album = {
    status: "published",
    public_download_enabled: true,
  };
  assert.equal(isMediaAlbumDownloadEligible(album), true);
});

test("album eligibility: rejects album with public_download_enabled false", () => {
  const album = {
    status: "published",
    public_download_enabled: false,
  };
  assert.equal(isMediaAlbumDownloadEligible(album), false);
});
