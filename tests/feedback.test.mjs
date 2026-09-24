import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);

function load(file, overrides = {}) {
  const code = ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;

  const exports = {};

  new Function("require", "exports", code)(
    (id) =>
      id === "server-only"
        ? {}
        : overrides[id] ?? require(id),
    exports
  );

  return exports;
}

const validation = load("../lib/feedback-validation.ts");

const email = load("../lib/server/feedback-email.ts", {
  "../feedback-validation": validation,
});

const { createFeedbackHandler } = load(
  "../lib/server/feedback-handler.ts",
  {
    "../feedback-validation": validation,
    "./feedback-email": email,
  }
);

const { createFeedbackLimiter } = load(
  "../lib/server/feedback-rate-limit.ts"
);

const report = {
  type: "technical_problem",
  description: "The search button does not respond.",
  timestamp: "2026-09-20T12:00:00.000Z",
  language: "en",
};

const request = (body = report, headers = {}) =>
  new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body:
      typeof body === "string"
        ? body
        : JSON.stringify(body),
  });

function handler(
  send = async () => "message-id",
  limit = () => ({
    allowed: true,
    retryAfter: 0,
  })
) {
  return createFeedbackHandler({
    send,
    limit,
  });
}

test(
  "feedback validates required fields, bounds, metadata and optional email",
  () => {
    const invalidPatches = [
      { type: "" },
      { type: "invalid" },
      { description: "" },
      { description: "short" },
      { description: "a".repeat(1001) },
      { email: "bad" },
      {
        email:
          "ok@example.com\r\nBcc: another@example.com",
      },
      { timestamp: "yesterday" },
      { viewportWidth: -1 },
      { pageUrl: "javascript:alert(1)" },
      {
        pageUrl:
          "https://user:password@example.com",
      },
      { conversation: ["private"] },
      { pageTitle: "x\r\nheader" },
    ];

    for (const patch of invalidPatches) {
      assert.equal(
        validation.feedbackSchema.safeParse({
          ...report,
          ...patch,
        }).success,
        false,
        JSON.stringify(patch)
      );
    }

    const validEmails = [
      undefined,
      "",
      "user@example.com",
    ];

    for (const emailAddress of validEmails) {
      assert.equal(
        validation.feedbackSchema.safeParse({
          ...report,
          email: emailAddress,
        }).success,
        true
      );
    }

    assert.equal(
      validation.feedbackSchema.parse({
        ...report,
        description:
          "  valid description  ",
      }).description,
      "valid description"
    );
  }
);

test(
  "API sends only validated reports, stable idempotency keys and safe success",
  async () => {
    const calls = [];

    const post = handler(
      async (...args) => {
        calls.push(args);
        return "id";
      }
    );

    const headers = {
      "idempotency-key":
        "d5620233-c52d-4a39-a9f2-72f7724d99e5",
    };

    assert.deepEqual(
      await (
        await post(
          request(report, headers)
        )
      ).json(),
      {
        success: true,
      }
    );

    await post(
      request(report, headers)
    );

    assert.equal(
      calls[0][1],
      calls[1][1]
    );

    await post(
      request(
        {
          ...report,
          description:
            "A different report description.",
        },
        headers
      )
    );

    assert.notEqual(
      calls[0][1],
      calls[2][1]
    );

    assert.deepEqual(
      calls[0][0],
      report
    );
  }
);

test(
  "API rejects malformed, oversized, cross-site and wrong-content requests before sending",
  async () => {
    let calls = 0;

    const post = handler(
      async () => {
        calls++;
        return "id";
      }
    );

    const cases = [
      [request("{"), 400],
      [
        request({
          ...report,
          description: "",
        }),
        400,
      ],
      [
        request(
          "x".repeat(17000)
        ),
        413,
      ],
      [
        request(report, {
          origin:
            "https://attacker.example",
        }),
        403,
      ],
      [
        request(report, {
          "sec-fetch-site":
            "cross-site",
        }),
        403,
      ],
      [
        request(report, {
          "content-type":
            "text/plain",
        }),
        415,
      ],
      [
        request(report, {
          "idempotency-key": "bad",
        }),
        400,
      ],
    ];

    for (const [req, status] of cases) {
      assert.equal(
        (await post(req)).status,
        status
      );
    }

    assert.equal(
      calls,
      0
    );
  }
);

test(
  "honeypot is ignored and rate limit returns Retry-After without sending",
  async () => {
    let calls = 0;

    const post = handler(
      async () => {
        calls++;
        return "id";
      },
      () => ({
        allowed: false,
        retryAfter: 600,
      })
    );

    assert.deepEqual(
      await (
        await post(
          request({
            ...report,
            honeypot: "bot",
          })
        )
      ).json(),
      {
        success: true,
      }
    );

    const result =
      await post(request());

    assert.equal(
      result.status,
      429
    );

    assert.equal(
      result.headers.get(
        "retry-after"
      ),
      "600"
    );

    assert.equal(
      calls,
      0
    );
  }
);

test(
  "missing configuration and provider failures never claim success or leak details",
  async () => {
    const failures = [
      [
        new email.FeedbackConfigurationError(
          "secret-config"
        ),
        503,
      ],
      [
        new Error(
          "provider-secret"
        ),
        502,
      ],
      [
        new TypeError(
          "network-secret"
        ),
        502,
      ],
      [
        new email.FeedbackDeliveryError(
          "provider_timeout"
        ),
        502,
      ],
    ];

    for (const [
      error,
      status,
    ] of failures) {
      const result =
        await handler(
          async () => {
            throw error;
          }
        )(request());

      assert.equal(
        result.status,
        status
      );

      const text =
        await result.text();

      assert.doesNotMatch(
        text,
        /secret|success|provider_timeout/
      );
    }
  }
);

test(
  "rate limiter allows five attempts and expires after ten minutes",
  () => {
    const limit =
      createFeedbackLimiter();

    for (
      let i = 0;
      i < 5;
      i++
    ) {
      assert.equal(
        limit(
          "client",
          1000
        ).allowed,
        true
      );
    }

    assert.equal(
      limit(
        "client",
        1001
      ).allowed,
      false
    );

    assert.equal(
      limit(
        "another",
        1001
      ).allowed,
      true
    );

    assert.equal(
      limit(
        "client",
        601000
      ).allowed,
      true
    );
  }
);

test(
  "email escapes markup, strips URL secrets and leaves nonexistent IDs out",
  () => {
    const result =
      email.feedbackEmail({
        ...report,
        description:
          '<img src=x onerror="alert(1)"> & text',
        pageUrl:
          "https://example.com/path?token=private#secret",
      });

    assert.match(
      result.html,
      /&lt;img/
    );

    assert.doesNotMatch(
      result.html,
      /<img/
    );

    assert.match(
      result.text,
      /<img/
    );

    assert.doesNotMatch(
      result.text,
      /token=|#secret|Conversation ID|Session ID/
    );

    assert.equal(
      result.subject,
      "[ForJu Compass] Technisches Problem"
    );
  }
);

test(
  "configuration requires a key and valid sender and receiver addresses",
  () => {
    const invalidConfigurations =
      [
        {},
        {
          RESEND_API_KEY:
            "test",
        },
        {
          RESEND_API_KEY:
            "test",
          FEEDBACK_FROM_EMAIL:
            "invalid",
          FEEDBACK_TO_EMAIL:
            "recipient@example.com",
        },
        {
          RESEND_API_KEY:
            "test",
          FEEDBACK_FROM_EMAIL:
            "sender@example.com",
          FEEDBACK_TO_EMAIL:
            "invalid",
        },
      ];

    for (
      const env of invalidConfigurations
    ) {
      assert.throws(
        () =>
          email.feedbackEmailConfig(
            env
          ),
        email.FeedbackConfigurationError
      );
    }

    const config =
      email.feedbackEmailConfig({
        RESEND_API_KEY:
          "test-key",
        FEEDBACK_FROM_EMAIL:
          "sender@example.com",
        FEEDBACK_TO_EMAIL:
          "recipient@example.com",
      });

    assert.equal(
      config.key,
      "test-key"
    );

    assert.equal(
      config.from,
      "sender@example.com"
    );

    assert.equal(
      config.to,
      "recipient@example.com"
    );
  }
);

test(
  "SDK receives configured sender and receiver, optional Reply-To and idempotency; rejection is surfaced",
  async () => {
    const names = [
      "RESEND_API_KEY",
      "FEEDBACK_FROM_EMAIL",
      "FEEDBACK_TO_EMAIL",
    ];

    const original =
      Object.fromEntries(
        names.map(
          (name) => [
            name,
            process.env[name],
          ]
        )
      );

    Object.assign(
      process.env,
      {
        RESEND_API_KEY:
          "test-key",
        FEEDBACK_FROM_EMAIL:
          "sender@example.com",
        FEEDBACK_TO_EMAIL:
          "recipient@example.com",
      }
    );

    const calls = [];
    let failure = false;

    class Resend {
      emails = {
        send:
          async (...args) => {
            calls.push(args);

            if (failure) {
              return {
                error: {
                  message:
                    "provider-error",
                },
              };
            }

            return {
              data: {
                id: "id",
              },
            };
          },
      };
    }

    const emailModule =
      load(
        "../lib/server/feedback-email.ts",
        {
          resend: {
            Resend,
          },
          "../feedback-validation":
            validation,
        }
      );

    try {
      assert.equal(
        await emailModule.sendFeedbackEmail(
          {
            ...report,
            email:
              "reply@example.com",
          },
          "stable"
        ),
        "id"
      );

      assert.equal(
        calls[0][0].from,
        "sender@example.com"
      );

      assert.deepEqual(
        calls[0][0].to,
        [
          "recipient@example.com",
        ]
      );

      assert.equal(
        calls[0][0].replyTo,
        "reply@example.com"
      );

      assert.equal(
        calls[0][1]
          .idempotencyKey,
        "stable"
      );

      await emailModule.sendFeedbackEmail(
        report,
        "next"
      );

      assert.equal(
        "replyTo" in
          calls[1][0],
        false
      );

      failure = true;

      await assert.rejects(
        emailModule.sendFeedbackEmail(
          report,
          "failed"
        ),
        emailModule.FeedbackDeliveryError
      );
    } finally {
      for (const name of names) {
        if (
          original[name] ===
          undefined
        ) {
          delete process.env[
            name
          ];
        } else {
          process.env[name] =
            original[name];
        }
      }
    }
  }
);
