const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const RECIPIENT = "sbellisf@gmail.com";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
      return {
            statusCode: 200,
                  headers: {
                          "Access-Control-Allow-Origin": "*",
                                  "Access-Control-Allow-Headers": "Content-Type",
                                          "Access-Control-Allow-Methods": "POST, OPTIONS",
                                                },
                                                      body: "",
                                                          };
                                                            }

                                                              if (event.httpMethod !== "POST") {
                                                                  return { statusCode: 405, body: "Method Not Allowed" };
                                                                    }

                                                                      const headers = {
                                                                          "Access-Control-Allow-Origin": "*",
                                                                              "Access-Control-Allow-Headers": "Content-Type",
                                                                                  "Content-Type": "application/json",
                                                                                    };

                                                                                      try {
                                                                                          const { brief, sessionSummary } = JSON.parse(event.body);

                                                                                              const sections = Object.entries(brief)
                                                                                                    .map(([phase, content]) => `<div style="margin-bottom:24px"><h2 style="font-family:Georgia,serif;color:#1a1a1a;font-size:18px;border-bottom:1px solid #e5e5e5;padding-bottom:8px">${phase}</h2><div style="font-family:Arial,sans-serif;color:#333;font-size:15px;line-height:1.7;white-space:pre-wrap">${content}</div></div>`)
                                                                                                          .join("");
                                                                                                          
                                                                                                              const timestamp = new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
                                                                                                              
                                                                                                                  await resend.emails.send({
                                                                                                                        from: "Bloom <onboarding@resend.dev>",
                                                                                                                              to: RECIPIENT,
                                                                                                                                    subject: `New Brand Brief — Bloom Session ${timestamp}`,
                                                                                                                                          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9f9f7"><div style="max-width:680px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)"><div style="background:#1a1a1a;padding:40px 48px"><p style="font-family:Georgia,serif;color:#c8b89a;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px">Bloom Strategy</p><h1 style="font-family:Georgia,serif;color:#fff;font-size:28px;font-weight:normal;margin:0">Brand Strategy Brief</h1><p style="font-family:Arial,sans-serif;color:#888;font-size:13px;margin:12px 0 0">Session completed ${timestamp}</p></div><div style="padding:40px 48px">${sections}</div></div></body></html>`,
                                                                                                                                              });
                                                                                                                                              
                                                                                                                                                  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
                                                                                                                                                    } catch (err) {
                                                                                                                                                        console.error("send-brief error:", err);
                                                                                                                                                            return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
                                                                                                                                                              }
                                                                                                                                                              };
