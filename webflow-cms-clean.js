#!/usr/bin/env node
import fs from "fs/promises";

const TOKEN = process.env.WEBFLOW_TOKEN;
const BASE = "https://api.webflow.com/v2";
const PRODUCTS_ID = "689acd5bd83e0332eb8565e3";
const TARGET_ITEM_IDS = [
  "68c83742305d00aaad2b314c",
  "68be62e601e93b8abbe8fc93",
  "68be618073f2ca5b489c602b",
];

if (!TOKEN) {
  console.error("WEBFLOW_TOKEN is required");
  process.exit(1);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function api(method, path) {
  const url = `${BASE}${path}`;
  let attempt = 0;
  for (;;) {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
    });
    if (res.ok) return { status: res.status, body: await res.text() };
    if (res.status === 429 || res.status >= 500) {
      attempt += 1;
      await sleep(Math.min(2000 * attempt, 8000));
      continue;
    }
    return { status: res.status, body: await res.text() };
  }
}

async function deleteItem(collectionId, itemId) {
  return api("DELETE", `/collections/${collectionId}/items/${itemId}`);
}

async function verifyGone(collectionId, itemId) {
  const res = await api("GET", `/collections/${collectionId}/items/${itemId}`);
  return res.status === 404;
}

async function run() {
  const results = [];
  for (const id of TARGET_ITEM_IDS) {
    const del = await deleteItem(PRODUCTS_ID, id);
    const ok = del.status === 204 || del.status === 200;
    let verified = false;
    if (ok) verified = await verifyGone(PRODUCTS_ID, id);
    console.log(
      `${id}\tdelete=${ok ? "ok" : `fail(${del.status})`}\tverified=${
        verified ? "gone" : "check"
      }`
    );
    results.push({
      id,
      deleteStatus: del.status,
      verifiedGone: verified,
      response: del.body,
    });
  }
  await fs.writeFile(
    "products-delete-report.json",
    JSON.stringify(results, null, 2),
    "utf8"
  );
  console.log("Saved → products-delete-report.json");
}

run().catch((e) => {
  console.error(e.stack || e.message || String(e));
  process.exit(1);
});
