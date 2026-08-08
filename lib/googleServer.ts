import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export function adminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function encryptionKey() {
  const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is not configured.");
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptToken(value:string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv,tag,encrypted]).toString("base64url");
}

export function decryptToken(value:string) {
  const all = Buffer.from(value,"base64url");
  const iv = all.subarray(0,12);
  const tag = all.subarray(12,28);
  const encrypted = all.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted),decipher.final()]).toString("utf8");
}

export async function currentUserFromBearer(authHeader:string|null) {
  const token = authHeader?.replace("Bearer ","");
  if (!token) throw new Error("Not authenticated.");
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global:{ headers:{ Authorization:`Bearer ${token}` } } }
  );
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid session.");
  return { user:data.user, token };
}

export async function googleAccessToken(userId:string) {
  const admin = adminClient();
  const { data, error } = await admin.from("google_connections").select("*").eq("user_id",userId).single();
  if (error || !data) throw new Error("Google Workspace is not connected.");
  const refreshToken = decryptToken(data.encrypted_refresh_token);
  const body = new URLSearchParams({
    client_id:process.env.GOOGLE_CLIENT_ID!,
    client_secret:process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token:refreshToken,
    grant_type:"refresh_token",
  });
  const response = await fetch(GOOGLE_TOKEN_URL,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error_description || "Could not refresh Google access token.");
  return String(result.access_token);
}

export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_APP_URL
  );
}
