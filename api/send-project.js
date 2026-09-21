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
      Number(body.price || 0);


    const requirements =
      body.requirements ||
      "No requirements provided.";


    const projectId =
      body.projectId ||
      "No project ID";


    const attachments =
      Array.isArray(body.attachments)
        ? body.attachments
        : [];


    // --------------------------------------------
    // LIMIT ATTACHMENTS
    // --------------------------------------------

    if (attachments.length > 5) {

      return res.status(400).json({
        ok: false,
        error:
          "Maximum of 5 design attachments allowed."
      });

    }


    // --------------------------------------------
    // HTML EMAIL
    // --------------------------------------------

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
          Requirements
        </h3>

        <p>
          ${escapeHtml(requirements)
            .replace(/\n/g, "<br>")}
        </p>

        <hr>

        <p>
          <strong>
            Client Design:
          </strong>
          ${attachments.length}
          attachment(s) included.
        </p>

        <p>
          Open the Admin Editor to review the project,
          client designs and payment transaction.
        </p>

        <p>
          <a
            href="${getEditorUrl(projectId)}"
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


    // --------------------------------------------
    // RESEND
    // --------------------------------------------

    const response =
      await fetch(
        "https://api.resend.com/emails",
        {
          method:
            "POST",

          headers:
            {
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

              html:
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

        ok:
          false,

        error:
          data

      });

    }


    return res.status(200).json({

      ok:
        true,

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

      ok:
        false,

      error:
        error.message ||
        "Unable to send project email."

    });

  }

}


// ==================================================
// HTML ESCAPE
// ==================================================

function escapeHtml(value) {

  return String(value)
    .replace(
      /[&<>'"]/g,
      character => ({

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


// ==================================================
// ADMIN EDITOR URL
// ==================================================

function getEditorUrl(projectId) {

  const baseUrl =
    process.env.SITE_URL ||
    "https://web-craft-studio-swart.vercel.app";

  return (
    `${baseUrl}/admin/editor.html?id=` +
    encodeURIComponent(projectId)
  );

}
