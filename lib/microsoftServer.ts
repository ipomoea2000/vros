import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const TOKEN_URL = (tenant:string) => `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

export function msAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function encryptionKey() {
  const raw = process.env.MICROSOFT_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("MICROSOFT_TOKEN_ENCRYPTION_KEY is not configured.");
  return crypto.createHash("sha256").update(raw).digest();
}
export function encryptMicrosoftToken(value:string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv,tag,encrypted]).toString("base64url");
}
export function decryptMicrosoftToken(value:string) {
  const all = Buffer.from(value,"base64url");
  const iv = all.subarray(0,12), tag = all.subarray(12,28), encrypted = all.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted),decipher.final()]).toString("utf8");
}
export async function msCurrentUser(authHeader:string|null) {
  const token = authHeader?.replace("Bearer ","");
  if (!token) throw new Error("Not authenticated.");
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {global:{headers:{Authorization:`Bearer ${token}`}}}
  );
  const {data,error}=await client.auth.getUser(token);
  if(error||!data.user)throw new Error("Invalid AROS session.");
  return data.user;
}
export function microsoftConfigured() {
  return Boolean(
    process.env.MICROSOFT_CLIENT_ID &&
    process.env.MICROSOFT_CLIENT_SECRET &&
    process.env.MICROSOFT_TOKEN_ENCRYPTION_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_APP_URL
  );
}
export async function graphAccessToken(userId:string) {
  const admin=msAdminClient();
  const {data,error}=await admin.from("microsoft_connections").select("*").eq("user_id",userId).single();
  if(error||!data)throw new Error("Microsoft 365 is not connected.");
  const tenant=process.env.MICROSOFT_TENANT_ID || "organizations";
  const refreshToken=decryptMicrosoftToken(data.encrypted_refresh_token);
  const body=new URLSearchParams({
    client_id:process.env.MICROSOFT_CLIENT_ID!,
    client_secret:process.env.MICROSOFT_CLIENT_SECRET!,
    refresh_token:refreshToken,
    grant_type:"refresh_token",
    scope:"openid profile email offline_access User.Read Mail.ReadWrite"
  });
  const response=await fetch(TOKEN_URL(tenant),{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body
  });
  const result=await response.json();
  if(!response.ok)throw new Error(result.error_description||"Could not refresh Microsoft Graph token.");
  if(result.refresh_token){
    await admin.from("microsoft_connections").update({
      encrypted_refresh_token:encryptMicrosoftToken(result.refresh_token),
      updated_at:new Date().toISOString()
    }).eq("user_id",userId);
  }
  return String(result.access_token);
}
