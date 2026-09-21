export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });

  }


  const apiKey =
    process.env.RESEND_API_KEY;

  const adminEmail =
    process.env.ADMIN_EMAIL;


  if (!apiKey) {

    return res.status(500).json({
      ok: false,
      error:
        "RESEND_API_KEY is not configured in Vercel."
    });

  }


  if (!adminEmail) {

    return res.status(500).json({
      ok: false,
      error:
        "ADMIN_EMAIL is not configured in Vercel."
    });

  }


  try {

    const body =
      req.body || {};


    const clientName =
      body.clientName ||
      "Unknown Client";


    const clientEmail =
      body.clientEmail ||
      "No email provided";


    const projectName =
      body.projectName ||
      "Untitled Project";


    const packageName =
      body.package ||
      "Unknown Package";


    const price =
      Number(
        body.price || 0
      );


    const requirements =
      body.requirements ||
      "No requirements provided.";


    const projectId =
      body.projectId ||
      "No project ID";


    const structure =
      Array.isArray(
        body.structure
      )
        ? body.structure
        : [];


    const flatStructure =
      Array.isArray(
        body.flatStructure
      )
        ? body.flatStructure
        : [];


    const attachments =
      Array.isArray(
        body.attachments
      )
        ? body.attachments
        : [];


    if (
      attachments.length > 5
    ) {

      return res.status(400).json({
        ok: false,
        error:
          "Maximum of 5 design attachments allowed."
      });

    }


    const structureHtml =
      buildStructureHtml(
        structure
      );


    const editorUrl =
      getEditorUrl(
        projectId
      );


    const html = `

      <div
        style="
          font-family:Arial,sans-serif;
          line-height:1.6;
          color:#222;
        "
      >

        <h2>
          New WebCraft Studio Project
        </h2>

        <p>
          A client has submitted a new website project.
        </p>

        <hr>

        <p>
          <strong>Project Name:</strong>
          ${escapeHtml(projectName)}
        </p>

        <p>
          <strong>Client Name:</strong>
          ${escapeHtml(clientName)}
        </p>

        <p>
          <strong>Client Email:</strong>
          ${escapeHtml(clientEmail)}
        </p>

        <p>
          <strong>Package:</strong>
          ${escapeHtml(packageName)}
        </p>

        <p>
          <strong>Price:</strong>
          ₱${price.toLocaleString("en-PH")}
        </p>

        <p>
          <strong>Project ID:</strong>
          ${escapeHtml(projectId)}
        </p>

        <hr>

        <h3>
          Overall Requirements
        </h3>

        <p>
          ${escapeHtml(
            requirements
          ).replace(
            /\n/g,
            "<br>"
          )}
        </p>

        <hr>

        <h3>
          Requested Folder & File Structure
        </h3>

        ${
          structureHtml ||
          "<p>No structure provided.</p>"
        }

        <hr>

        <h3>
          Client Design
        </h3>

        <p>
          ${
            attachments.length
          }
          design attachment(s) included.
        </p>

        <hr>

        <p>
          Open the Admin Editor to review
          the project, requested structure,
          designs and payment transaction.
        </p>

        <p>

          <a
            href="${editorUrl}"
            style="
              display:inline-block;
              padding:12px 18px;
              background:#111;
              color:#fff;
              text-decoration:none;
              border-radius:8px;
            "
          >
            Open Admin Editor →
          </a>

        </p>

      </div>

    `;


    const response =
      await fetch(
        "https://api.resend.com/emails",
        {

          method:
            "POST",

          headers: {

            "Authorization":
              `Bearer ${apiKey}`,

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              from:
                process.env.RESEND_FROM_EMAIL ||
                "WebCraft Studio <onboarding@resend.dev>",

              to:
                [adminEmail],

              reply_to:
                clientEmail,

              subject:
                `New Project — ${projectName} — WebCraft Studio`,

              html,

              attachments:
                attachments.map(
                  attachment => ({

                    filename:
                      attachment.filename,

                    content:
                      attachment.content

                  })
                )

            })

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      console.error(
        "RESEND ERROR:",
        data
      );


      return res.status(
        response.status
      ).json({

        ok: false,

        error:
          data

      });

    }


    return res.status(200).json({

      ok: true,

      message:
        "Project email sent successfully.",

      id:
        data.id

    });


  } catch (error) {

    console.error(
      "SEND PROJECT ERROR:",
      error
    );


    return res.status(500).json({

      ok: false,

      error:
        error.message ||
        "Unable to send project email."

    });

  }

}


/* =========================
   STRUCTURE → HTML
========================= */

function buildStructureHtml(
  structure
) {

  if (
    !Array.isArray(structure) ||
    !structure.length
  ) {

    return "";

  }


  return `
    <ul>
      ${
        structure
          .map(
            item =>
              structureItemHtml(
                item
              )
          )
          .join("")
      }
    </ul>
  `;

}


function structureItemHtml(
  item
) {

  const icon =
    item.type === "folder"
      ? "📁"
      : "📄";


  let html = `

    <li>

      <strong>
        ${icon}
        ${escapeHtml(
          item.name || ""
        )}
      </strong>

      ${
        item.path
          ? `
            <div
              style="
                color:#666;
                font-size:13px;
              "
            >
              Path:
              ${escapeHtml(
                item.path
              )}
            </div>
          `
          : ""
      }

      ${
        item.description
          ? `
            <div
              style="
                margin-top:4px;
              "
            >
              ${escapeHtml(
                item.description
              ).replace(
                /\n/g,
                "<br>"
              )}
            </div>
          `
          : ""
      }

  `;


  if (
    item.type === "folder" &&
    Array.isArray(item.children) &&
    item.children.length
  ) {

    html += `

      <ul>
        ${
          item.children
            .map(
              child =>
                structureItemHtml(
                  child
                )
            )
            .join("")
        }
      </ul>

    `;

  }


  html += "</li>";

  return html;

}


/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(
  value
) {

  return String(
    value
  ).replace(
    /[&<>'"]/g,
    character =>
      ({

        "&":
          "&amp;",

        "<":
          "&lt;",

        ">":
          "&gt;",

        "'":
          "&#39;",

        '"':
          "&quot;"

      }[character])
  );

}


/* =========================
   ADMIN EDITOR URL
========================= */

function getEditorUrl(
  projectId
) {

  const baseUrl =
    process.env.SITE_URL ||
    "https://web-craft-studio-swart.vercel.app";


  return `${baseUrl}/admin/editor.html?id=${encodeURIComponent(
    projectId
  )}`;

}
